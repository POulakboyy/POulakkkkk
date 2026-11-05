/**
 * Transport-agnostic sync client: drives the relay protocol for one replica and one space.
 * The app owns the socket — it calls `connected()` / `receive()` / `disconnected()` and gives
 * `send` — so the same state machine runs over WebSocket, a test double or any other pipe.
 *
 *   offline ──connected()──▶ connecting ──welcome──▶ syncing ──outbox drained──▶ live
 *      ▲                                                                          │
 *      └──────────────────────────── disconnected() ◀──────────────────────────────┘
 *   any ──unauthorized──▶ error (fatal: do not reconnect with the same token)
 *
 * Outbox: local ops are queued, coalesced per field (only the newest write of a field is
 * sent) and pushed in envelopes that never split ops of one timestamp. The client persists
 * no outbox: it persists `acked`, the highest own timestamp acknowledged by the relay, and on
 * every (re)connection rebuilds the outbox from the replica state (`opsSince`). Unacked
 * envelopes are therefore resent after a reconnection, with the same ids when unchanged.
 */
import { SyncError } from './errors.ts';
import { compareHlc } from './hlc.ts';
import type { Op } from './ops.ts';
import {
  PROTOCOL_LIMITS,
  compareCursor,
  envelopeToOps,
  opsToEnvelope,
  parseServerMessage,
  validateServerMessage,
  type ClientMessage,
  type Envelope,
  type ErrorCode,
  type ServerMessage,
} from './protocol.ts';
import type { Replica } from './replica.ts';

export type SyncStatus = 'offline' | 'connecting' | 'syncing' | 'live' | 'error';

/** Cleartext metadata an encryption layer binds the payload to (with the space id). */
export interface EnvelopeHeader {
  readonly id: string;
  readonly hlc: string;
  readonly node: string;
}

export type SyncIssueCode =
  ErrorCode | 'decode_failed' | 'decrypt_failed' | 'payload_too_large' | 'send_failed';

export interface SyncIssue {
  readonly code: SyncIssueCode;
  readonly message: string;
  /** The client cannot recover without intervention (new token, new key). */
  readonly fatal: boolean;
  /** Suggested delay before retrying, when relevant. */
  readonly retryAfterMs?: number;
  readonly envelopeId?: string;
}

/** What to persist between sessions (small: two strings). */
export interface SyncClientState {
  /** Relay cursor up to which remote envelopes are applied. */
  readonly cursor: string | null;
  /** Highest own HLC timestamp acknowledged by the relay. */
  readonly acked: string | null;
}

export interface SyncClientOptions {
  replica: Replica;
  space: string;
  token: string | (() => string);
  send: (message: ClientMessage) => void;
  onStatus?: (status: SyncStatus) => void;
  onIssue?: (issue: SyncIssue) => void;
  onPersist?: (state: SyncClientState) => void;
  /** Encrypts an outgoing payload (e.g. `crypto.encryptPayload` bound to the space key). */
  encrypt?: (payload: string, header: EnvelopeHeader) => string | Promise<string>;
  decrypt?: (payload: string, header: EnvelopeHeader) => string | Promise<string>;
  /** Restored state from a previous session. */
  state?: SyncClientState;
  /**
   * Undecryptable or malformed incoming envelope: `'halt'` (default) stops applying and keeps
   * the cursor so nothing is lost (fix the key, reconnect); `'skip'` reports it and moves on.
   */
  onBadEnvelope?: 'halt' | 'skip';
  /** Schedules a callback (used to retry after `rate_limited`). Omit: retry on next flush. */
  setTimer?: (callback: () => void, ms: number) => void;
  maxOpsPerEnvelope?: number;
  /** Cleartext payload budget per envelope, UTF-8 bytes (leave room for encryption). */
  maxPayloadBytes?: number;
  maxEnvelopesPerPush?: number;
  /** Unacknowledged envelopes allowed at once. */
  maxInFlight?: number;
  random?: () => number;
}

export interface SyncClient {
  readonly status: SyncStatus;
  /** The transport is open: sends `hello`. */
  connected(): void;
  /** A frame from the relay (text or already-parsed). Resolves once it is processed. */
  receive(frame: string | ServerMessage): Promise<void>;
  /** The transport closed. In-flight envelopes will be resent after the next `welcome`. */
  disconnected(): void;
  /** Pushes queued local ops now (normally automatic after each local change). */
  flush(): Promise<void>;
  state(): SyncClientState;
  /** Own ops not yet acknowledged (queued or in flight). */
  pending(): number;
  /** Delay to wait before the next reconnection attempt (exponential backoff, full jitter). */
  retryDelay(): number;
  /** Resolves when every received frame and scheduled flush has been processed. */
  idle(): Promise<void>;
  dispose(): void;
}

export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
  random?: () => number;
}

/** "Full jitter" exponential backoff: uniform in [0, min(max, base · 2^attempt)]. */
export function backoff(attempt: number, options: BackoffOptions = {}): number {
  const base = options.baseMs ?? 500;
  const max = options.maxMs ?? 30_000;
  const random = options.random ?? Math.random;
  const ceiling = Math.min(max, base * 2 ** Math.min(Math.max(0, attempt), 30));
  return Math.floor(random() * ceiling);
}

interface InFlight {
  readonly envelope: Envelope;
  readonly opCount: number;
  acked: boolean;
}

const DEFAULTS = {
  maxOpsPerEnvelope: 256,
  maxPayloadBytes: 96 * 1024,
  maxEnvelopesPerPush: 100,
  maxInFlight: 500,
};

export function createSyncClient(options: SyncClientOptions): SyncClient {
  const { replica, send } = options;
  const node = replica.node;
  const limits = {
    maxOps: options.maxOpsPerEnvelope ?? DEFAULTS.maxOpsPerEnvelope,
    maxBytes: options.maxPayloadBytes ?? DEFAULTS.maxPayloadBytes,
    perPush: Math.min(
      options.maxEnvelopesPerPush ?? DEFAULTS.maxEnvelopesPerPush,
      PROTOCOL_LIMITS.maxEnvelopesPerPush,
    ),
    inFlight: options.maxInFlight ?? DEFAULTS.maxInFlight,
  };
  const badEnvelope = options.onBadEnvelope ?? 'halt';

  let status: SyncStatus = 'offline';
  let cursor = options.state?.cursor ?? null;
  let acked = options.state?.acked ?? null;
  let session = 0; // incremented on every connection; stale async work checks it
  let handshake = false;
  let halted = false;
  let fatal = false;
  let paused = false;
  let attempts = 0;
  let rateAttempts = 0;
  let resendDue = false;
  let flushScheduled = false;
  let chain: Promise<void> = Promise.resolve();
  const queue = new Map<string, Op>();
  let inFlight: InFlight[] = [];

  const setStatus = (next: SyncStatus): void => {
    if (status === next) return;
    status = next;
    options.onStatus?.(next);
  };
  const issue = (value: SyncIssue): void => options.onIssue?.(value);
  const persist = (): void => options.onPersist?.({ cursor, acked });
  const enqueue = (work: () => Promise<void> | void): Promise<void> => {
    const run = chain.then(work);
    chain = run.catch(() => undefined);
    return run;
  };

  const queueOp = (op: Op): void => {
    if (op.type === 'delete') {
      for (const [key, queued] of queue) {
        if (queued.collection === op.collection && queued.id === op.id) queue.delete(key);
      }
    }
    queue.set(registerKey(op), op);
  };

  const unsubscribe = replica.subscribe((change) => {
    if (change.source !== 'local') return;
    for (const op of change.ops) queueOp(op);
    scheduleFlush();
  });

  const scheduleFlush = (): void => {
    if (flushScheduled || !handshake) return;
    flushScheduled = true;
    void enqueue(async () => {
      flushScheduled = false;
      await pushPending();
    }).catch(reportUnexpected);
  };

  const reportUnexpected = (error: unknown): void => {
    issue({ code: 'internal', message: errorMessage(error), fatal: false });
  };

  const trySend = (message: ClientMessage): boolean => {
    try {
      send(message);
      return true;
    } catch (error) {
      issue({ code: 'send_failed', message: errorMessage(error), fatal: false });
      return false;
    }
  };

  /** Moves queued ops into envelopes, within the in-flight budget, and pushes them. */
  const pushPending = async (): Promise<void> => {
    if (!handshake || paused) return;
    const current = session;
    if (resendDue) {
      resendDue = false;
      const unacked = inFlight.filter((entry) => !entry.acked).map((entry) => entry.envelope);
      for (const chunk of chunks(unacked, limits.perPush)) trySend({ t: 'push', envelopes: chunk });
    }
    const fresh: Envelope[] = [];
    for (const batch of batches([...queue.values()], limits.maxOps, limits.maxBytes)) {
      if (inFlight.length >= limits.inFlight) break;
      const plain = opsToEnvelope(batch, node);
      const payload = options.encrypt
        ? await options.encrypt(plain.payload, { id: plain.id, hlc: plain.hlc, node })
        : plain.payload;
      if (current !== session) return;
      for (const op of batch) if (queue.get(registerKey(op)) === op) queue.delete(registerKey(op));
      if (utf8Length(payload) > PROTOCOL_LIMITS.maxPayloadBytes) {
        issue({
          code: 'payload_too_large',
          message: `envelope of ${batch.length} op(s) exceeds the relay payload limit`,
          fatal: false,
          envelopeId: plain.id,
        });
        continue;
      }
      const envelope = { ...plain, payload };
      inFlight.push({ envelope, opCount: batch.length, acked: false });
      fresh.push(envelope);
    }
    for (const chunk of chunks(fresh, limits.perPush)) trySend({ t: 'push', envelopes: chunk });
    updateLiveness();
  };

  const updateLiveness = (): void => {
    if (status === 'syncing' && queue.size === 0 && inFlight.length === 0) setStatus('live');
  };

  const onWelcome = (welcomeCursor: string): void => {
    handshake = true;
    attempts = 0;
    rateAttempts = 0;
    cursor = welcomeCursor;
    inFlight = [];
    queue.clear();
    const since = acked === null ? {} : { [node]: acked };
    for (const op of replica.opsSince(since, { origin: node })) queueOp(op);
    setStatus('syncing');
  };

  const onAck = (ids: readonly string[], ackCursor: string): void => {
    const set = new Set(ids);
    for (const entry of inFlight) if (set.has(entry.envelope.id)) entry.acked = true;
    let changed = false;
    while (inFlight[0]?.acked) {
      const entry = inFlight.shift() as InFlight;
      if (acked === null || compareHlc(entry.envelope.hlc, acked) > 0) acked = entry.envelope.hlc;
      changed = true;
    }
    if (cursor === null || compareCursor(ackCursor, cursor) > 0) {
      cursor = ackCursor;
      changed = true;
    }
    rateAttempts = 0;
    if (changed) persist();
  };

  /** Applies a page of remote envelopes in order; returns false when halted. */
  const onOps = async (
    envelopes: readonly (Envelope & { seq: number })[],
    pageCursor: string,
  ): Promise<boolean> => {
    const current = session;
    for (const envelope of envelopes) {
      let ops: Op[];
      try {
        const header = { id: envelope.id, hlc: envelope.hlc, node: envelope.node };
        const payload = options.decrypt
          ? await options.decrypt(envelope.payload, header)
          : envelope.payload;
        ops = envelopeToOps({ ...envelope, payload });
      } catch (error) {
        if (current !== session) return false;
        const code =
          options.decrypt && !(error instanceof SyncError) ? 'decrypt_failed' : 'decode_failed';
        issue({ code, message: errorMessage(error), fatal: false, envelopeId: envelope.id });
        if (badEnvelope === 'halt') {
          halted = true;
          setStatus('error');
          return false;
        }
        continue;
      }
      if (current !== session) return false;
      replica.apply(ops);
    }
    cursor = pageCursor;
    persist();
    return true;
  };

  const onServerError = (code: ErrorCode, message: string): void => {
    switch (code) {
      case 'unauthorized':
        halted = true;
        fatal = true;
        issue({ code, message, fatal: true });
        setStatus('error');
        return;
      case 'bad_cursor':
        cursor = null;
        persist();
        issue({ code, message, fatal: false });
        return;
      case 'rate_limited': {
        const retryAfterMs = backoff(rateAttempts++, { random: options.random ?? Math.random });
        resendDue = true;
        issue({ code, message, fatal: false, retryAfterMs });
        options.setTimer?.(() => scheduleFlush(), retryAfterMs);
        return;
      }
      case 'quota_exceeded':
        paused = true;
        issue({ code, message, fatal: false });
        return;
      default:
        issue({ code, message, fatal: false, retryAfterMs: backoff(attempts) });
    }
  };

  const handle = async (message: ServerMessage): Promise<void> => {
    if (halted && message.t !== 'error') return;
    switch (message.t) {
      case 'welcome':
        onWelcome(message.cursor);
        persist();
        await pushPending();
        return;
      case 'ack':
        onAck(message.ids, message.cursor);
        await pushPending();
        return;
      case 'ops':
        await onOps(message.envelopes, message.cursor);
        return;
      case 'error':
        onServerError(message.code, message.message);
        return;
    }
  };

  const client: SyncClient = {
    get status() {
      return status;
    },

    connected() {
      session++;
      handshake = false;
      halted = false;
      fatal = false;
      paused = false;
      attempts++;
      const token = typeof options.token === 'function' ? options.token() : options.token;
      setStatus('connecting');
      trySend({ t: 'hello', space: options.space, node, since: cursor, token });
    },

    receive(frame) {
      let message: ServerMessage;
      try {
        message =
          typeof frame === 'string' ? parseServerMessage(frame) : validateServerMessage(frame);
      } catch (error) {
        issue({ code: 'decode_failed', message: errorMessage(error), fatal: false });
        return Promise.resolve();
      }
      const current = session;
      return enqueue(() => (current === session ? handle(message) : undefined));
    },

    disconnected() {
      session++;
      handshake = false;
      inFlight = [];
      resendDue = false;
      flushScheduled = false;
      // An auth failure stays visible until the app reconnects (with a new token).
      if (!fatal) setStatus('offline');
    },

    flush() {
      return enqueue(pushPending);
    },

    state() {
      return { cursor, acked };
    },

    pending() {
      return (
        queue.size + inFlight.reduce((sum, entry) => sum + (entry.acked ? 0 : entry.opCount), 0)
      );
    },

    retryDelay() {
      return backoff(attempts, { random: options.random ?? Math.random });
    },

    async idle() {
      let observed: Promise<void>;
      do {
        observed = chain;
        await observed;
      } while (observed !== chain);
    },

    dispose() {
      unsubscribe();
      session++;
      handshake = false;
      inFlight = [];
      queue.clear();
    },
  };
  return client;
}

/** Key of the register an op writes: later ops on the same key supersede queued ones. */
function registerKey(op: Op): string {
  return op.type === 'delete'
    ? `d\u0000${op.collection}\u0000${op.id}`
    : `s\u0000${op.collection}\u0000${op.id}\u0000${op.field}`;
}

/**
 * Splits ops (sorted by HLC here) into batches of at most `maxOps` ops / `maxBytes`
 * estimated bytes, never separating ops that share a timestamp (one local change). A single
 * oversized change still forms one batch.
 */
export function batches(ops: readonly Op[], maxOps: number, maxBytes: number): Op[][] {
  const sorted = [...ops].sort((a, b) => compareHlc(a.hlc, b.hlc));
  const out: Op[][] = [];
  let batch: Op[] = [];
  let bytes = 0;
  for (let i = 0; i < sorted.length;) {
    const hlc = (sorted[i] as Op).hlc;
    let end = i;
    let groupBytes = 0;
    while (end < sorted.length && (sorted[end] as Op).hlc === hlc) {
      groupBytes += utf8Length(JSON.stringify(sorted[end]));
      end++;
    }
    const group = sorted.slice(i, end);
    if (
      batch.length > 0 &&
      (batch.length + group.length > maxOps || bytes + groupBytes > maxBytes)
    ) {
      out.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(...group);
    bytes += groupBytes;
    i = end;
  }
  if (batch.length > 0) out.push(batch);
  return out;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** UTF-8 byte length without platform encoders. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
