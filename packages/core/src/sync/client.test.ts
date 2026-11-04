import { describe, expect, it } from 'vitest';
import {
  backoff,
  batches,
  createSyncClient,
  type SyncClient,
  type SyncClientOptions,
} from './client.ts';
import type { Op } from './ops.ts';
import {
  encodeClientMessage,
  type ClientMessage,
  type Envelope,
  type ServerMessage,
  type StoredEnvelope,
} from './protocol.ts';
import { createReplica, type Replica } from './replica.ts';
import { manualClock, prng } from './test-utils.ts';

const SERVER_PROTOCOL = new URL('../../../../apps/sync-server/src/protocol.ts', import.meta.url)
  .href;
const server = (await import(/* @vite-ignore */ SERVER_PROTOCOL)) as {
  parseClientMessage(
    raw: string,
  ): { ok: true; message: ClientMessage } | { ok: false; error: string };
};

interface Session {
  client: SyncClient;
  node?: string;
  cursor: number;
  live: boolean;
}

/**
 * In-memory relay with the semantics of apps/sync-server: per-space append-only log,
 * idempotent on envelope id, backlog then live fan-out, no echo to the pushing node.
 */
class FakeRelay {
  readonly log: StoredEnvelope[] = [];
  readonly frames: string[] = [];
  private readonly sessions = new Set<Session>();
  /** Next pushes to answer with this error instead of storing them. */
  rejectNext: { code: 'rate_limited' | 'unauthorized' | 'quota_exceeded'; count: number } | null =
    null;
  rejectHello: 'unauthorized' | null = null;
  dropAcks = false;

  connect(client: SyncClient): Session {
    const session: Session = { client, cursor: 0, live: false };
    this.sessions.add(session);
    return session;
  }

  disconnect(session: Session): void {
    this.sessions.delete(session);
    session.client.disconnected();
  }

  frame(session: Session, raw: string): void {
    this.frames.push(raw);
    const parsed = server.parseClientMessage(raw);
    if (!parsed.ok) throw new Error(`relay rejected frame: ${parsed.error}`);
    const message = parsed.message;
    if (message.t === 'hello') {
      if (this.rejectHello)
        return this.send(session, { t: 'error', code: this.rejectHello, message: 'no' });
      const since = message.since === null ? 0 : Number(message.since);
      if (since > this.log.length)
        return this.send(session, { t: 'error', code: 'bad_cursor', message: 'ahead' });
      session.node = message.node;
      session.cursor = since;
      this.send(session, { t: 'welcome', cursor: String(since) });
      const backlog = this.log.slice(since);
      for (let i = 0; i < backlog.length; i += 2) {
        const page = backlog.slice(i, i + 2);
        session.cursor = (page[page.length - 1] as StoredEnvelope).seq;
        this.send(session, { t: 'ops', envelopes: page, cursor: String(session.cursor) });
      }
      session.live = true;
      return;
    }
    if (this.rejectNext && this.rejectNext.count > 0) {
      this.rejectNext.count--;
      return this.send(session, { t: 'error', code: this.rejectNext.code, message: 'rejected' });
    }
    const stored: StoredEnvelope[] = [];
    for (const envelope of message.envelopes) {
      if (this.log.some((entry) => entry.id === envelope.id)) continue;
      const entry = { ...envelope, seq: this.log.length + 1 };
      this.log.push(entry);
      stored.push(entry);
    }
    if (stored.length > 0) session.cursor = (stored[stored.length - 1] as StoredEnvelope).seq;
    if (!this.dropAcks)
      this.send(session, {
        t: 'ack',
        ids: message.envelopes.map((e) => e.id),
        cursor: String(session.cursor),
      });
    if (stored.length === 0) return;
    for (const other of this.sessions) {
      if (other === session || !other.live) continue;
      other.cursor = (stored[stored.length - 1] as StoredEnvelope).seq;
      if (other.node === session.node) continue;
      this.send(other, { t: 'ops', envelopes: stored, cursor: String(other.cursor) });
    }
  }

  private send(session: Session, message: ServerMessage): void {
    void session.client.receive(JSON.stringify(message));
  }
}

function device(relay: FakeRelay, node: string, extra: Partial<SyncClientOptions> = {}) {
  const clock = manualClock();
  const replica = createReplica({ nodeId: node, now: clock.now });
  const statuses: string[] = [];
  const issues: string[] = [];
  let session: Session | undefined;
  const client = createSyncClient({
    replica,
    space: 'space-1',
    token: 'token-1',
    send: (message) => relay.frame(session as Session, encodeClientMessage(message)),
    onStatus: (status) => statuses.push(status),
    onIssue: (issue) => issues.push(issue.code),
    random: prng(1),
    ...extra,
  });
  return {
    replica,
    client,
    clock,
    statuses,
    issues,
    connect() {
      session = relay.connect(client);
      client.connected();
      return client.idle();
    },
    disconnect() {
      if (session) relay.disconnect(session);
      session = undefined;
    },
  };
}

async function settle(...devices: { client: SyncClient }[]): Promise<void> {
  for (let i = 0; i < 4; i++) for (const d of devices) await d.client.idle();
}

const title = (replica: Replica, id: string) => replica.get('tasks', id)?.['title'];

describe('sync client', () => {
  it('handshakes, pushes local changes live and converges two devices', async () => {
    const relay = new FakeRelay();
    const a = device(relay, 'a');
    const b = device(relay, 'b');
    await a.connect();
    await b.connect();
    expect(a.statuses).toEqual(['connecting', 'syncing', 'live']);
    a.replica.change('tasks', 't1', { title: 'from a' });
    b.replica.change('tasks', 't2', { title: 'from b' });
    await settle(a, b);
    expect(title(b.replica, 't1')).toBe('from a');
    expect(title(a.replica, 't2')).toBe('from b');
    expect(a.client.pending()).toBe(0);
    expect(a.client.state()).toEqual({
      cursor: '2',
      acked: a.replica.opsSince({}, { origin: 'a' })[0]?.hlc,
    });
  });

  it('queues offline edits, coalesces them per field and syncs the backlog on connect', async () => {
    const relay = new FakeRelay();
    const a = device(relay, 'a');
    for (let i = 0; i < 5; i++) {
      a.clock.advance(1);
      a.replica.change('tasks', 't', { title: `v${i}` });
    }
    a.replica.change('tasks', 'gone', { title: 'x' });
    a.replica.change('tasks', 'gone', 'delete');
    expect(a.client.status).toBe('offline');
    await a.connect();
    expect(relay.log).toHaveLength(1);
    expect(relay.log[0]?.payload).not.toContain('v0');
    const b = device(relay, 'b');
    await b.connect();
    await settle(b);
    expect(title(b.replica, 't')).toBe('v4');
    expect(b.replica.isDeleted('tasks', 'gone')).toBe(true);
    expect(b.client.state().cursor).toBe('1');
  });

  it('resends unacknowledged envelopes after a reconnection with the same id', async () => {
    const relay = new FakeRelay();
    const a = device(relay, 'a');
    await a.connect();
    relay.dropAcks = true; // the push is stored but the ack is lost with the connection
    a.replica.change('tasks', 't', { title: 'once' });
    await settle(a);
    expect(relay.log).toHaveLength(1);
    expect(a.client.state().acked).toBeNull();
    expect(a.client.pending()).toBe(1);
    relay.dropAcks = false;
    a.disconnect();
    await a.connect();
    await settle(a);
    expect(relay.log).toHaveLength(1); // deduplicated by id
    expect(a.client.state().acked).toBe(relay.log[0]?.hlc);
  });

  it('resumes from persisted state without resending or re-downloading', async () => {
    const relay = new FakeRelay();
    const a = device(relay, 'a');
    const b = device(relay, 'b');
    await a.connect();
    a.replica.change('tasks', 't', { title: 'one' });
    await settle(a);
    await b.connect();
    await settle(b);
    const saved = { state: b.client.state(), snapshot: b.replica.snapshot() };
    b.disconnect();
    b.client.dispose();
    a.replica.change('tasks', 't', { title: 'two' });
    await settle(a);
    const framesBefore = relay.frames.length;
    const restored = createReplica({ nodeId: 'b' });
    restored.load(saved.snapshot);
    const applied: number[] = [];
    restored.subscribe((change) => applied.push(change.ops.length));
    let session: Session | undefined;
    const client = createSyncClient({
      replica: restored,
      space: 'space-1',
      token: 't',
      state: saved.state,
      send: (m) => relay.frame(session as Session, encodeClientMessage(m)),
    });
    session = relay.connect(client);
    client.connected();
    await settle({ client });
    expect(title(restored, 't')).toBe('two');
    expect(applied).toEqual([1]); // only the new envelope
    expect(relay.frames.length - framesBefore).toBe(1); // hello only, nothing to push
  });

  it('encrypts payloads end to end through the relay', async () => {
    const relay = new FakeRelay();
    const seal = async (payload: string, header: { id: string }) =>
      `enc:${header.id}:${[...payload].reverse().join('')}`;
    const open = async (payload: string, header: { id: string }) => {
      const prefix = `enc:${header.id}:`;
      if (!payload.startsWith(prefix)) throw new Error('bad tag');
      return [...payload.slice(prefix.length)].reverse().join('');
    };
    const a = device(relay, 'a', { encrypt: seal, decrypt: open });
    const b = device(relay, 'b', { encrypt: seal, decrypt: open });
    await a.connect();
    await b.connect();
    a.replica.change('notes', 'n', { title: 'secret plan' });
    await settle(a, b);
    expect(relay.log[0]?.payload).not.toContain('secret');
    expect(b.replica.get('notes', 'n')).toEqual({ title: 'secret plan' });
  });

  it('halts on an undecodable envelope and keeps the cursor (or skips it when asked)', async () => {
    for (const policy of ['halt', 'skip'] as const) {
      const relay = new FakeRelay();
      relay.log.push({ id: 'junk', hlc: '000000001-00000-x', node: 'x', payload: '{oops', seq: 1 });
      const a = device(relay, 'a');
      a.replica.change('tasks', 't', { title: 'x' });
      await a.connect();
      const good = a.replica.opsSince();
      const b = device(relay, 'b', { onBadEnvelope: policy });
      await b.connect();
      await settle(a, b);
      expect(b.issues).toContain('decode_failed');
      if (policy === 'halt') {
        expect(b.client.status).toBe('error');
        expect(b.client.state().cursor).toBe('0');
        expect(title(b.replica, 't')).toBeUndefined();
      } else {
        expect(b.client.status).toBe('live');
        expect(title(b.replica, 't')).toBe('x');
        expect(good).toHaveLength(1);
      }
    }
  });

  it('treats unauthorized as fatal and bad_cursor as a reset', async () => {
    const relay = new FakeRelay();
    relay.rejectHello = 'unauthorized';
    const a = device(relay, 'a');
    await a.connect();
    a.disconnect();
    expect(a.client.status).toBe('error');
    expect(a.issues).toEqual(['unauthorized']);
    relay.rejectHello = null;

    const b = device(relay, 'b', { state: { cursor: '99', acked: null } });
    await b.connect();
    expect(b.issues).toEqual(['bad_cursor']);
    expect(b.client.state().cursor).toBeNull();
    b.disconnect();
    await b.connect();
    expect(b.client.status).toBe('live');
  });

  it('retries after rate limiting', async () => {
    const relay = new FakeRelay();
    const timers: Array<{ ms: number; run: () => void }> = [];
    const a = device(relay, 'a', { setTimer: (run, ms) => timers.push({ run, ms }) });
    await a.connect();
    relay.rejectNext = { code: 'rate_limited', count: 1 };
    a.replica.change('tasks', 't', { title: 'x' });
    await settle(a);
    expect(relay.log).toHaveLength(0);
    expect(a.client.pending()).toBe(1);
    expect(timers).toHaveLength(1);
    timers[0]?.run();
    await settle(a);
    expect(relay.log).toHaveLength(1);
    expect(a.client.pending()).toBe(0);
  });

  it('pauses pushes when the space quota is exceeded', async () => {
    const relay = new FakeRelay();
    const a = device(relay, 'a');
    await a.connect();
    relay.rejectNext = { code: 'quota_exceeded', count: 1 };
    a.replica.change('tasks', 't', { title: 'x' });
    await settle(a);
    a.replica.change('tasks', 'u', { title: 'y' });
    await settle(a);
    expect(relay.log).toHaveLength(0);
    expect(a.issues).toEqual(['quota_exceeded']);
    a.disconnect();
    await a.connect();
    await settle(a);
    expect(relay.log.length).toBeGreaterThan(0);
    expect(a.client.pending()).toBe(0);
  });

  it('splits large outboxes into bounded envelopes and pushes', async () => {
    const relay = new FakeRelay();
    const a = device(relay, 'a', { maxOpsPerEnvelope: 10, maxEnvelopesPerPush: 3 });
    for (let i = 0; i < 50; i++)
      a.replica.change('tasks', `t${i}`, { title: `n${i}`, done: false });
    await a.connect();
    await settle(a);
    expect(relay.log).toHaveLength(10);
    const pushes = relay.frames
      .filter((f) => f.includes('"push"'))
      .map((f) => (JSON.parse(f) as { envelopes: Envelope[] }).envelopes.length);
    expect(Math.max(...pushes)).toBeLessThanOrEqual(3);
    const b = device(relay, 'b');
    await b.connect();
    await settle(b);
    expect(b.replica.all('tasks').size).toBe(50);
  });
});

describe('batches', () => {
  it('never splits ops sharing a timestamp', () => {
    const replica = createReplica({ nodeId: 'n' });
    const ops: Op[] = [];
    for (let i = 0; i < 20; i++) ops.push(...replica.change('c', `r${i}`, { a: 1, b: 2, c: 3 }));
    const out = batches(ops, 4, 1e9);
    for (const batch of out) {
      expect(batch.length).toBeLessThanOrEqual(4);
      const hlcs = new Set(batch.map((op) => op.hlc));
      for (const other of out)
        if (other !== batch) for (const op of other) expect(hlcs.has(op.hlc)).toBe(false);
    }
    expect(out.flat()).toHaveLength(60);
    expect(
      batches(replica.change('c', 'big', { a: 1, b: 2, c: 3, d: 4, e: 5 }), 2, 1e9),
    ).toHaveLength(1);
  });
});

describe('backoff', () => {
  it('grows exponentially with full jitter and a cap', () => {
    expect(backoff(0, { random: () => 0.999 })).toBeLessThan(500);
    expect(backoff(3, { random: () => 0.999 })).toBe(3996);
    expect(backoff(50, { random: () => 0.999 })).toBe(29970);
    expect(backoff(5, { random: () => 0 })).toBe(0);
  });
});
