import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileStorage } from '../src/storage/file.ts';
import { TestClient, envelope, startTestServer, token, type RunningServer } from './helpers.ts';

let running: RunningServer | null = null;
const clients: TestClient[] = [];

async function start(...args: Parameters<typeof startTestServer>): Promise<RunningServer> {
  running = await startTestServer(...args);
  return running;
}

async function join(space: string, node: string, since: string | null = null) {
  if (!running) throw new Error('server not started');
  const client = await TestClient.join(running.url, space, node, since);
  clients.push(client);
  return client;
}

async function connect(options: { origin?: string } = {}) {
  if (!running) throw new Error('server not started');
  const client = await TestClient.connect(running.url, options);
  clients.push(client);
  return client;
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await running?.server.close();
  running = null;
});

describe('sync relay', () => {
  it('converges two nodes and acks with a resumable cursor', async () => {
    await start();
    const a = await join('space-1', 'node-a');
    const b = await join('space-1', 'node-b');

    const fromA = [envelope('node-a'), envelope('node-a')];
    a.push(fromA);
    const ackA = await a.expect('ack');
    expect(ackA.ids).toEqual(fromA.map((e) => e.id));
    const opsB = await b.expect('ops');
    expect(opsB.envelopes).toEqual(fromA.map((e, i) => ({ ...e, seq: i + 1 })));
    expect(opsB.cursor).toBe('2');

    const fromB = [envelope('node-b')];
    b.push(fromB);
    await b.expect('ack');
    const opsA = await a.expect('ops');
    expect(opsA.envelopes).toEqual([{ ...fromB[0], seq: 3 }]);
    expect(opsA.cursor).toBe('3');
    // Pushers never receive their own envelopes back.
    await a.quiet();
    await b.quiet();
  });

  it('is idempotent on envelope id', async () => {
    const { server } = await start();
    const a = await join('space-1', 'node-a');
    const b = await join('space-1', 'node-b');
    const op = envelope('node-a');
    a.push([op]);
    await a.expect('ack');
    await b.expect('ops');
    a.push([op, op]);
    const ack = await a.expect('ack');
    expect(ack.ids).toEqual([op.id]);
    await b.quiet();
    expect(server.metrics.get('pouxis_sync_envelopes_stored_total')).toBe(1);
    expect(server.metrics.get('pouxis_sync_envelopes_duplicate_total')).toBe(2);
  });

  it('pages the backlog from the cursor, then goes live', async () => {
    await start({ backlogPageSize: 3 });
    const a = await join('space-1', 'node-a');
    const ops = Array.from({ length: 8 }, () => envelope('node-a'));
    a.push(ops);
    await a.expect('ack');

    const late = await join('space-1', 'node-b');
    const all = await late.collect(8);
    expect(all.frames).toBe(3);
    expect(all.envelopes.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(all.cursor).toBe('8');

    const resumed = await join('space-1', 'node-c', '5');
    const tail = await resumed.collect(3);
    expect(tail.envelopes.map((e) => e.seq)).toEqual([6, 7, 8]);

    const live = envelope('node-a');
    a.push([live]);
    await a.expect('ack');
    expect((await late.expect('ops')).envelopes[0]?.id).toBe(live.id);
    expect((await resumed.expect('ops')).envelopes[0]?.seq).toBe(9);
  });

  it('isolates spaces', async () => {
    await start();
    const a = await join('space-1', 'node-a');
    const other = await join('space-2', 'node-b');
    a.push([envelope('node-a')]);
    await a.expect('ack');
    await other.quiet();
  });

  it('persists across restarts with file storage', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pouxis-sync-it-'));
    try {
      const storage = () => new FileStorage({ dataDir: dir, fsync: 'always' });
      await start({}, { storage: storage() });
      const a = await join('space-1', 'node-a');
      a.push([envelope('node-a'), envelope('node-a')]);
      await a.expect('ack');
      await a.close();
      await running?.server.close();

      await start({}, { storage: storage() });
      const b = await join('space-1', 'node-b');
      expect((await b.collect(2)).cursor).toBe('2');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects a cursor ahead of the log', async () => {
    await start();
    const client = await connect();
    client.send({ t: 'hello', space: 's', node: 'n', since: '10', token: token('s') });
    expect((await client.expect('error')).code).toBe('bad_cursor');
  });
});

describe('authentication', () => {
  it.each([
    ['a bad signature', () => token('space-1', { secret: 'x'.repeat(40) }), 'invalid token'],
    ['an expired token', () => token('space-1', { ttl: -10 }), 'token expired'],
    ['another space', () => token('space-2'), 'token not valid for this space'],
    ['another node', () => token('space-1', { node: 'node-z' }), 'token not valid for this node'],
  ])('refuses %s', async (_label, makeToken, message) => {
    const { server } = await start();
    const client = await connect();
    client.send({ t: 'hello', space: 'space-1', node: 'node-a', since: null, token: makeToken() });
    const error = await client.expect('error');
    expect(error).toEqual({ t: 'error', code: 'unauthorized', message });
    expect((await client.closed).code).toBe(1008);
    expect(server.metrics.get('pouxis_sync_auth_failures_total')).toBe(1);
  });

  it('requires hello before push and only one hello', async () => {
    await start();
    const early = await connect();
    early.push([envelope('n')]);
    expect((await early.expect('error')).code).toBe('protocol');

    const twice = await join('space-1', 'node-a');
    twice.send({
      t: 'hello',
      space: 'space-1',
      node: 'node-a',
      since: null,
      token: token('space-1'),
    });
    expect((await twice.expect('error')).code).toBe('protocol');
  });

  it('closes connections that never say hello', async () => {
    await start({ helloTimeoutMs: 50 });
    const client = await connect();
    expect((await client.expect('error')).message).toBe('hello timeout');
  });
});

describe('limits', () => {
  it('rejects oversize frames', async () => {
    const { server } = await start({
      maxFrameBytes: 4096,
      rateLimit: rate({ byteBurst: 1 << 20 }),
    });
    const client = await join('space-1', 'node-a');
    client.send('x'.repeat(5000));
    expect((await client.closed).code).toBe(1009);
    await waitFor(() => server.metrics.get('pouxis_sync_frames_too_large_total') === 1);
  });

  it('closes on invalid messages', async () => {
    await start();
    const client = await connect();
    client.send('{not json');
    expect(await client.expect('error')).toMatchObject({ code: 'bad_message' });
    expect((await client.closed).code).toBe(1008);
  });

  it('rate limits frames, then closes repeat offenders', async () => {
    const { server } = await start({ rateLimit: rate({ messageBurst: 3, maxStrikes: 3 }) });
    const client = await join('space-1', 'node-a');
    for (let i = 0; i < 6; i++) client.push([]);
    expect((await client.closed).code).toBe(1008);
    const received = await client.drain();
    // Burst of 3 = hello + 2 pushes; the next 3 frames are dropped, the 3rd strike closes.
    // Acks are processed asynchronously and may be cut by the close, so only errors count.
    const errors = received.filter((m) => m.t === 'error');
    expect(errors.map((m) => m.code)).toEqual(['rate_limited', 'rate_limited', 'rate_limited']);
    expect(server.metrics.get('pouxis_sync_rate_limited_total')).toBe(3);
  });

  it('caps connections per space', async () => {
    await start({ maxConnectionsPerSpace: 1 });
    await join('space-1', 'node-a');
    const extra = await connect();
    extra.send({
      t: 'hello',
      space: 'space-1',
      node: 'node-b',
      since: null,
      token: token('space-1'),
    });
    expect((await extra.expect('error')).code).toBe('space_full');
    await join('space-2', 'node-b');
  });

  it('refuses the push when the space quota is reached', async () => {
    await start({ maxSpaceBytes: 300 });
    const client = await join('space-1', 'node-a');
    client.push([envelope('node-a', 'x'.repeat(400))]);
    expect((await client.expect('error')).code).toBe('quota_exceeded');
    client.push([envelope('node-a', 'small')]);
    await client.expect('ack');
  });

  it('enforces the origin allow-list for browsers', async () => {
    await start({ allowedOrigins: ['https://app.pouxis.example'] });
    await expect(connect({ origin: 'https://evil.example' })).rejects.toThrow(/403/);
    await connect({ origin: 'https://app.pouxis.example' });
    await connect();
  });
});

describe('http endpoints', () => {
  it('serves health and metrics without identifiers', async () => {
    const { httpUrl } = await start();
    const a = await join('secret-space-name', 'secret-node-name');
    a.push([envelope('secret-node-name', 'secret-payload')]);
    await a.expect('ack');

    const health = await fetch(`${httpUrl}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok' });

    const metrics = await (await fetch(`${httpUrl}/metrics`)).text();
    expect(metrics).toContain('pouxis_sync_connections_active 1');
    expect(metrics).toContain('pouxis_sync_envelopes_stored_total 1');
    expect(metrics).not.toMatch(/secret-/);

    expect((await fetch(`${httpUrl}/nope`)).status).toBe(404);
    expect((await fetch(`${httpUrl}/v1/sync`)).status).toBe(426);
    expect((await fetch(`${httpUrl}/healthz`, { method: 'POST' })).status).toBe(405);
  });

  it('protects metrics with a bearer token when configured', async () => {
    const { httpUrl } = await start({ metricsToken: 'metrics-token' });
    expect((await fetch(`${httpUrl}/metrics`)).status).toBe(401);
    const ok = await fetch(`${httpUrl}/metrics`, {
      headers: { authorization: 'Bearer metrics-token' },
    });
    expect(ok.status).toBe(200);
  });

  it('drains gracefully: closes clients with 1001 and reports draining', async () => {
    const { server } = await start();
    const client = await join('space-1', 'node-a');
    client.push([envelope('node-a')]);
    await client.expect('ack');
    await server.close();
    expect((await client.closed).code).toBe(1001);
    running = null;
  });

  it('never logs payloads or tokens', async () => {
    const lines: string[] = [];
    const { createLogger } = await import('../src/logger.ts');
    await start({}, { logger: createLogger({ level: 'debug', sink: (line) => lines.push(line) }) });
    const client = await join('space-1', 'node-a');
    client.push([envelope('node-a', 'TOP-SECRET-PAYLOAD')]);
    await client.expect('ack');
    const bad = await connect();
    bad.send({ t: 'hello', space: 'space-1', node: 'n', since: null, token: 'AAAA.BBBB' });
    await bad.expect('error');
    await client.close();
    const text = lines.join('\n');
    expect(lines.length).toBeGreaterThan(3);
    expect(text).not.toContain('TOP-SECRET-PAYLOAD');
    expect(text).not.toContain(token('space-1').split('.')[1] ?? '###');
    expect(text).not.toContain('AAAA.BBBB');
    expect(text).not.toContain('space-1');
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow();
  });
});

function rate(overrides: Partial<RunningServer['server']['relay']['config']['rateLimit']>) {
  return {
    messagesPerSecond: 0.001,
    messageBurst: 1000,
    bytesPerSecond: 1 << 20,
    byteBurst: 4 << 20,
    maxStrikes: 10,
    ...overrides,
  };
}

async function waitFor(check: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
