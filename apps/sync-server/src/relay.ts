/**
 * Relay core, independent of the transport: sessions (one per connection), spaces (one
 * per open log) and the ordering/fanout rules.
 *
 * Ordering guarantees:
 * - appends to a space are serialized; each one is committed (head update + fanout to live
 *   sessions) in a single synchronous block, so every live session sees envelopes in log
 *   order, exactly once;
 * - a new session first streams the backlog from its cursor, page by page, waiting for each
 *   page to be flushed to the socket (backpressure), then switches to live delivery in the
 *   same synchronous block where it observes it has caught up with the space head;
 * - a session never receives envelopes it pushed itself, nor live envelopes pushed by
 *   another connection of the same node.
 */
import type { ServerConfig } from './config.ts';
import { tag, type Logger } from './logger.ts';
import type { Metrics } from './metrics.ts';
import {
  encodeCursor,
  encodeServerMessage,
  parseClientMessage,
  parseCursor,
  type ClientMessage,
  type Envelope,
  type ErrorCode,
  type HelloMessage,
  type PushMessage,
  type ServerMessage,
  type StoredEnvelope,
} from './protocol.ts';
import { TokenBucket } from './rate-limit.ts';
import {
  QuotaExceededError,
  type AppendOutcome,
  type SpaceLog,
  type Storage,
} from './storage/types.ts';
import { authorize, type AuthorizeFailure } from './token.ts';

/** The subset of a `ws` WebSocket the relay needs (lets tests use a fake). */
export interface Peer {
  readonly bufferedAmount: number;
  send(data: string, cb?: (err?: Error) => void): void;
  close(code?: number, reason?: string): void;
  terminate(): void;
  pause?(): void;
  resume?(): void;
}

export const CloseCode = {
  normal: 1000,
  goingAway: 1001,
  policyViolation: 1008,
  messageTooBig: 1009,
  internalError: 1011,
  tryAgainLater: 1013,
} as const;

export type RelayConfig = Pick<
  ServerConfig,
  | 'secrets'
  | 'limits'
  | 'maxConnectionsPerSpace'
  | 'maxSpaceBytes'
  | 'rateLimit'
  | 'helloTimeoutMs'
  | 'spaceIdleMs'
  | 'backlogPageSize'
  | 'backlogPageBytes'
  | 'maxBufferedBytes'
>;

export interface RelayDeps {
  config: RelayConfig;
  storage: Storage;
  logger: Logger;
  metrics: Metrics;
  /** Wall clock in ms (token expiry). */
  now?: () => number;
}

/** Queued messages per connection before the socket stops being read. */
const PAUSE_AT = 16;
const RESUME_AT = 4;

const AUTH_MESSAGES: Readonly<Record<AuthorizeFailure, string>> = {
  malformed: 'invalid token',
  bad_signature: 'invalid token',
  bad_claims: 'invalid token',
  expired: 'token expired',
  wrong_space: 'token not valid for this space',
  wrong_node: 'token not valid for this node',
};

export class Relay {
  readonly config: RelayConfig;
  readonly storage: Storage;
  readonly logger: Logger;
  readonly metrics: Metrics;
  readonly now: () => number;
  readonly sessions = new Set<Session>();
  private readonly spaces = new Map<string, Space>();
  private readonly evicting = new Map<string, Promise<void>>();
  private nextSessionId = 1;
  private draining_ = false;

  constructor(deps: RelayDeps) {
    this.config = deps.config;
    this.storage = deps.storage;
    this.logger = deps.logger;
    this.metrics = deps.metrics;
    this.now = deps.now ?? Date.now;
    this.metrics.gauge('pouxis_sync_connections_active', () => this.sessions.size);
    this.metrics.gauge('pouxis_sync_spaces_active', () => this.spaces.size);
  }

  get draining(): boolean {
    return this.draining_;
  }

  get spaceCount(): number {
    return this.spaces.size;
  }

  /** Registers a new connection. The caller wires transport events to the session. */
  connect(peer: Peer): Session {
    const session = new Session(this, peer, this.nextSessionId++);
    this.sessions.add(session);
    this.metrics.inc('pouxis_sync_connections_total');
    return session;
  }

  /** Opens (or joins) a space and takes a reference on it. */
  async acquireSpace(id: string): Promise<Space> {
    for (;;) {
      const existing = this.spaces.get(id);
      if (existing) {
        existing.refs++;
        existing.cancelIdle();
        try {
          await existing.ready;
        } catch (error) {
          existing.refs--;
          throw error;
        }
        return existing;
      }
      const evicting = this.evicting.get(id);
      if (evicting) {
        await evicting;
        continue;
      }
      const space = new Space(id, this.storage.open(id), this);
      this.spaces.set(id, space);
      space.ready.catch(() => {
        if (this.spaces.get(id) === space) this.spaces.delete(id);
      });
    }
  }

  /** Drops a reference taken by {@link acquireSpace}; idle spaces are closed later. */
  releaseSpace(space: Space): void {
    space.refs--;
    if (space.refs > 0 || this.draining_) return;
    space.scheduleIdle(this.config.spaceIdleMs, () => this.evict(space));
  }

  private evict(space: Space): void {
    if (space.refs > 0 || this.spaces.get(space.id) !== space) return;
    this.spaces.delete(space.id);
    const done = space
      .close()
      .catch((error: unknown) => {
        this.metrics.inc('pouxis_sync_storage_errors_total');
        this.logger.error('space.close_failed', { space: tag(space.id), err: error });
      })
      .finally(() => {
        if (this.evicting.get(space.id) === done) this.evicting.delete(space.id);
      });
    this.evicting.set(space.id, done);
  }

  /**
   * Graceful shutdown: stop reading, let in-flight messages finish, close every connection
   * with 1001, then flush and close storage. Never takes much longer than `timeoutMs`.
   */
  async shutdown(timeoutMs: number): Promise<void> {
    this.draining_ = true;
    const deadline = Date.now() + timeoutMs;
    const remaining = (): number => Math.max(0, deadline - Date.now());

    await withTimeout(Promise.all([...this.sessions].map((s) => s.idle())), remaining());
    for (const session of this.sessions) session.close(CloseCode.goingAway, 'server shutting down');
    await this.waitForSessions(remaining());
    for (const session of this.sessions) session.terminate();

    const spaces = [...this.spaces.values()];
    this.spaces.clear();
    for (const space of spaces) space.cancelIdle();
    await Promise.allSettled(spaces.map((space) => space.close()));
    await Promise.allSettled([...this.evicting.values()]);
    await this.storage.close();
  }

  private async waitForSessions(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.sessions.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /** @internal */
  forget(session: Session): void {
    this.sessions.delete(session);
  }
}

export class Space {
  readonly id: string;
  readonly ready: Promise<void>;
  /** Sessions that completed hello on this space. */
  readonly sessions = new Set<Session>();
  /** References held by sessions (including those still completing hello). */
  refs = 0;
  /** Last seq committed and fanned out (never ahead of the durable log). */
  head = 0;
  private log_: SpaceLog | null = null;
  private readonly relay: Relay;
  private queue: Promise<unknown> = Promise.resolve();
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(id: string, opening: Promise<SpaceLog>, relay: Relay) {
    this.id = id;
    this.relay = relay;
    this.ready = opening.then((log) => {
      this.log_ = log;
      this.head = log.head;
    });
  }

  get log(): SpaceLog {
    if (!this.log_) throw new Error('space log is not open');
    return this.log_;
  }

  /** Appends envelopes pushed by `from`, then fans them out. Serialized per space. */
  append(from: Session, envelopes: readonly Envelope[]): Promise<AppendOutcome> {
    const maxBytes = this.relay.config.maxSpaceBytes;
    const run = this.queue.then(async () => {
      const outcome = await this.log.append(envelopes, { maxBytes });
      this.commit(from, outcome);
      return outcome;
    });
    this.queue = run.catch(() => {});
    return run;
  }

  /** Synchronous: head update and fanout must not interleave with backlog catch-up. */
  private commit(from: Session, outcome: AppendOutcome): void {
    const first = outcome.stored[0];
    const last = outcome.stored[outcome.stored.length - 1];
    if (!first || !last) return;
    this.head = last.seq;
    from.onOwnAppend(first.seq, last.seq);
    for (const session of this.sessions) {
      if (session !== from) session.deliver(outcome.stored, from.node);
    }
  }

  scheduleIdle(delayMs: number, evict: () => void): void {
    this.cancelIdle();
    this.idleTimer = setTimeout(evict, delayMs);
    this.idleTimer.unref();
  }

  cancelIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  async close(): Promise<void> {
    this.cancelIdle();
    await this.ready.catch(() => {});
    await this.queue;
    await this.log_?.close();
  }
}

type SessionState = 'hello' | 'backlog' | 'live' | 'closed';

export class Session {
  readonly id: number;
  private readonly relay: Relay;
  private readonly peer: Peer;
  private logger: Logger;
  private state_: SessionState = 'hello';
  private node_ = '';
  /** Highest seq this connection is up to date with (see protocol cursor semantics). */
  private cursor_ = 0;
  private space: Space | null = null;
  /** Seq ranges pushed by this connection while catching up (skipped in the backlog). */
  private ownRanges: Array<[number, number]> = [];
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;
  private paused = false;
  private closing = false;
  private strikes = 0;
  private readonly messageBucket: TokenBucket;
  private readonly byteBucket: TokenBucket;
  private helloTimer: NodeJS.Timeout | null;
  private readonly openedAt = Date.now();

  constructor(relay: Relay, peer: Peer, id: number) {
    this.relay = relay;
    this.peer = peer;
    this.id = id;
    this.logger = relay.logger.child({ conn: id });
    const { rateLimit } = relay.config;
    this.messageBucket = new TokenBucket(rateLimit.messageBurst, rateLimit.messagesPerSecond);
    this.byteBucket = new TokenBucket(rateLimit.byteBurst, rateLimit.bytesPerSecond);
    this.helloTimer = setTimeout(() => {
      if (this.state_ !== 'hello' || this.closing) return;
      this.relay.metrics.inc('pouxis_sync_protocol_errors_total');
      this.fail('protocol', 'hello timeout', CloseCode.policyViolation);
    }, relay.config.helloTimeoutMs);
    this.helloTimer.unref();
  }

  get state(): SessionState {
    return this.state_;
  }

  get node(): string {
    return this.node_;
  }

  get cursor(): number {
    return this.cursor_;
  }

  /* ---------------------------------------------------------------------------------- */
  /* Transport events                                                                    */
  /* ---------------------------------------------------------------------------------- */

  /** A text frame was received (`bytes` = its UTF-8 size). */
  onText(text: string, bytes: number): void {
    if (this.closing || this.state_ === 'closed' || this.relay.draining) return;
    const { metrics } = this.relay;
    metrics.inc('pouxis_sync_bytes_received_total', bytes);

    if (this.messageBucket.available() >= 1 && this.byteBucket.available() >= bytes) {
      this.messageBucket.tryRemove(1);
      this.byteBucket.tryRemove(bytes);
      this.strikes = 0;
    } else {
      metrics.inc('pouxis_sync_rate_limited_total');
      this.strikes++;
      if (this.strikes >= this.relay.config.rateLimit.maxStrikes) {
        this.logger.warn('session.rate_limit_close');
        this.fail('rate_limited', 'rate limit exceeded repeatedly', CloseCode.policyViolation);
      } else {
        this.send({ t: 'error', code: 'rate_limited', message: 'rate limit exceeded, frame dropped' });
      }
      return;
    }

    const parsed = parseClientMessage(text, this.relay.config.limits);
    if (!parsed.ok) {
      metrics.inc('pouxis_sync_protocol_errors_total');
      this.logger.debug('session.bad_message', { reason: parsed.error });
      this.fail('bad_message', parsed.error, CloseCode.policyViolation);
      return;
    }
    this.enqueue(parsed.message);
  }

  /** Binary frames are not part of the protocol. */
  onBinary(bytes: number): void {
    if (this.closing || this.state_ === 'closed') return;
    this.relay.metrics.inc('pouxis_sync_bytes_received_total', bytes);
    this.relay.metrics.inc('pouxis_sync_protocol_errors_total');
    this.fail('bad_message', 'binary frames are not supported', CloseCode.policyViolation);
  }

  /** The transport is closed (always called exactly once). */
  onClosed(code?: number): void {
    if (this.state_ === 'closed') return;
    this.state_ = 'closed';
    this.closing = true;
    this.clearHelloTimer();
    this.detach();
    this.relay.forget(this);
    this.logger.info('session.closed', { code, durationMs: Date.now() - this.openedAt });
  }

  /** Resolves once queued messages are processed. */
  idle(): Promise<void> {
    return this.queue;
  }

  close(code: number, reason: string): void {
    if (this.state_ === 'closed') return;
    this.closing = true;
    this.detach();
    this.peer.close(code, reason);
  }

  terminate(): void {
    if (this.state_ === 'closed') return;
    this.closing = true;
    this.detach();
    this.peer.terminate();
  }

  /* ---------------------------------------------------------------------------------- */
  /* Message handling                                                                    */
  /* ---------------------------------------------------------------------------------- */

  private enqueue(message: ClientMessage): void {
    this.pending++;
    if (this.pending >= PAUSE_AT && !this.paused) {
      this.paused = true;
      this.peer.pause?.();
    }
    this.queue = this.queue
      .then(() => this.handle(message))
      .catch((error: unknown) => this.onUnexpected(error))
      .finally(() => {
        this.pending--;
        if (this.paused && this.pending <= RESUME_AT) {
          this.paused = false;
          if (!this.closing) this.peer.resume?.();
        }
      });
  }

  private async handle(message: ClientMessage): Promise<void> {
    if (this.closing) return;
    this.relay.metrics.inc('pouxis_sync_messages_received_total', 1, {
      key: 'type',
      value: message.t,
    });
    if (message.t === 'hello') await this.handleHello(message);
    else await this.handlePush(message);
  }

  private async handleHello(message: HelloMessage): Promise<void> {
    const { relay } = this;
    if (this.state_ !== 'hello') {
      relay.metrics.inc('pouxis_sync_protocol_errors_total');
      this.fail('protocol', 'hello already received', CloseCode.policyViolation);
      return;
    }
    this.clearHelloTimer();

    const auth = authorize(
      message.token,
      message.space,
      message.node,
      relay.config.secrets,
      Math.floor(relay.now() / 1000),
    );
    if (!auth.ok) {
      relay.metrics.inc('pouxis_sync_auth_failures_total');
      this.logger.info('session.auth_failed', { reason: auth.reason });
      this.fail('unauthorized', AUTH_MESSAGES[auth.reason], CloseCode.policyViolation);
      return;
    }
    const since = parseCursor(message.since);
    if (since === undefined) {
      this.fail('bad_message', 'since: invalid cursor', CloseCode.policyViolation);
      return;
    }

    let space: Space;
    try {
      space = await relay.acquireSpace(message.space);
    } catch (error) {
      relay.metrics.inc('pouxis_sync_storage_errors_total');
      this.logger.error('space.open_failed', { space: tag(message.space), err: error });
      this.fail('unavailable', 'storage unavailable, retry later', CloseCode.tryAgainLater);
      return;
    }
    if (this.closing) {
      relay.releaseSpace(space);
      return;
    }
    this.space = space;
    this.logger = this.logger.child({ space: tag(message.space), node: tag(message.node) });

    if (space.sessions.size >= relay.config.maxConnectionsPerSpace) {
      this.logger.warn('session.space_full');
      this.fail('space_full', 'too many connections on this space', CloseCode.tryAgainLater);
      return;
    }
    if (since > space.head) {
      this.logger.warn('session.cursor_ahead', { since, head: space.head });
      this.fail(
        'bad_cursor',
        'cursor is ahead of the server log; resync with since=null',
        CloseCode.policyViolation,
      );
      return;
    }

    this.node_ = message.node;
    this.cursor_ = since;
    this.state_ = 'backlog';
    space.sessions.add(this);
    this.logger.info('session.hello', { since, head: space.head });
    this.send({ t: 'welcome', cursor: encodeCursor(since) });
    void this.runBacklog(space).catch((error: unknown) => this.onUnexpected(error));
  }

  private async handlePush(message: PushMessage): Promise<void> {
    const space = this.space;
    if (this.state_ === 'hello' || !space) {
      this.relay.metrics.inc('pouxis_sync_protocol_errors_total');
      this.fail('protocol', 'hello required before push', CloseCode.policyViolation);
      return;
    }
    const { metrics } = this.relay;
    let outcome: AppendOutcome;
    try {
      outcome = await space.append(this, message.envelopes);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        metrics.inc('pouxis_sync_quota_exceeded_total');
        this.logger.warn('session.quota_exceeded');
        this.send({ t: 'error', code: 'quota_exceeded', message: 'space storage quota exceeded' });
        return;
      }
      metrics.inc('pouxis_sync_storage_errors_total');
      this.logger.error('space.append_failed', { err: error });
      this.fail('unavailable', 'storage unavailable, retry later', CloseCode.tryAgainLater);
      return;
    }
    metrics.inc('pouxis_sync_envelopes_stored_total', outcome.stored.length);
    metrics.inc('pouxis_sync_envelopes_duplicate_total', outcome.duplicates.length);
    this.logger.debug('session.push', {
      count: message.envelopes.length,
      stored: outcome.stored.length,
      duplicates: outcome.duplicates.length,
    });
    if (this.closing) return;
    const ids = [...new Set(message.envelopes.map((envelope) => envelope.id))];
    this.send({ t: 'ack', ids, cursor: encodeCursor(this.cursor_) });
  }

  /** Streams the log from the cursor, one flushed page at a time, then goes live. */
  private async runBacklog(space: Space): Promise<void> {
    const { backlogPageSize, backlogPageBytes } = this.relay.config;
    while (this.state_ === 'backlog' && !this.closing) {
      // Synchronous check-and-switch: no commit can interleave between the two.
      if (this.cursor_ >= space.head) {
        this.state_ = 'live';
        this.ownRanges = [];
        this.logger.debug('session.live', { cursor: this.cursor_ });
        return;
      }
      const page = await space.log.read(this.cursor_, backlogPageSize, backlogPageBytes);
      if (this.state_ !== 'backlog' || this.closing) return;
      const last = page[page.length - 1];
      if (!last) throw new Error('log returned no record below the space head');
      const visible =
        this.ownRanges.length === 0 ? page : page.filter((entry) => !this.isOwn(entry.seq));
      this.cursor_ = last.seq;
      this.ownRanges = this.ownRanges.filter(([, to]) => to > last.seq);
      if (visible.length > 0) {
        this.relay.metrics.inc('pouxis_sync_envelopes_delivered_total', visible.length);
        await this.sendAndFlush({ t: 'ops', envelopes: visible, cursor: encodeCursor(last.seq) });
      }
    }
  }

  /** Called by the space when envelopes pushed by this session are committed. */
  onOwnAppend(first: number, last: number): void {
    if (this.state_ === 'live') {
      // Live: everything before `first` was already delivered, so the cursor can jump.
      this.cursor_ = Math.max(this.cursor_, last);
    } else if (this.state_ === 'backlog') {
      this.ownRanges.push([first, last]);
    }
  }

  /** Called by the space when another session's envelopes are committed. */
  deliver(entries: readonly StoredEnvelope[], fromNode: string): void {
    if (this.state_ !== 'live' || this.closing) return;
    const last = entries[entries.length - 1];
    if (!last || last.seq <= this.cursor_) return;
    const cursor = this.cursor_;
    this.cursor_ = last.seq;
    if (fromNode === this.node_) return;
    const fresh = (entries[0]?.seq ?? 0) > cursor ? entries : entries.filter((e) => e.seq > cursor);
    const data = encodeServerMessage({ t: 'ops', envelopes: [...fresh], cursor: encodeCursor(last.seq) });
    if (this.peer.bufferedAmount + data.length > this.relay.config.maxBufferedBytes) {
      this.relay.metrics.inc('pouxis_sync_slow_consumers_total');
      this.logger.warn('session.slow_consumer', { buffered: this.peer.bufferedAmount });
      this.fail('slow_consumer', 'connection too slow, resume from your last cursor', CloseCode.tryAgainLater);
      return;
    }
    this.relay.metrics.inc('pouxis_sync_envelopes_delivered_total', fresh.length);
    this.sendRaw(data);
  }

  /* ---------------------------------------------------------------------------------- */
  /* Helpers                                                                             */
  /* ---------------------------------------------------------------------------------- */

  private isOwn(seq: number): boolean {
    for (const [from, to] of this.ownRanges) if (seq >= from && seq <= to) return true;
    return false;
  }

  private send(message: ServerMessage): void {
    this.sendRaw(encodeServerMessage(message));
  }

  private sendRaw(data: string, cb?: (err?: Error) => void): void {
    if (this.state_ === 'closed') {
      cb?.(new Error('connection closed'));
      return;
    }
    this.relay.metrics.inc('pouxis_sync_bytes_sent_total', Buffer.byteLength(data, 'utf8'));
    this.peer.send(data, cb);
  }

  /** Sends and resolves once the frame was handed to the OS (or the socket failed). */
  private sendAndFlush(message: ServerMessage): Promise<void> {
    return new Promise((resolve) => this.sendRaw(encodeServerMessage(message), () => resolve()));
  }

  /** Sends an error then closes the connection. Idempotent. */
  private fail(code: ErrorCode, message: string, closeCode: number): void {
    if (this.closing) return;
    this.send({ t: 'error', code, message });
    this.close(closeCode, code);
  }

  private onUnexpected(error: unknown): void {
    if (this.closing) return;
    this.relay.metrics.inc('pouxis_sync_storage_errors_total');
    this.logger.error('session.unexpected_error', { err: error });
    this.fail('internal', 'internal error', CloseCode.internalError);
  }

  private clearHelloTimer(): void {
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.helloTimer = null;
  }

  /** Leaves the space (stops deliveries) and releases its reference. Idempotent. */
  private detach(): void {
    this.clearHelloTimer();
    const space = this.space;
    if (!space) return;
    this.space = null;
    space.sessions.delete(this);
    this.relay.releaseSpace(space);
  }
}

async function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    promise.catch(() => {}),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  if (timer) clearTimeout(timer);
}
