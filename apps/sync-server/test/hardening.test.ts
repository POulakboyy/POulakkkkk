/**
 * Security hardening from the 2026-11 review (docs/security/REVIEW-2026-11.md): node binding
 * of pushed envelopes, per-address connection cap, constant-time metrics bearer, loopback
 * detection for the open-metrics warning.
 */
import type http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { isLoopback, loadConfig } from '../src/config.ts';
import { AddressCounter, bearerMatches, clientAddress } from '../src/server.ts';
import { TestClient, envelope, startTestServer, type RunningServer } from './helpers.ts';

const SECRET = 'x'.repeat(32);
let running: RunningServer | null = null;
const clients: TestClient[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await running?.server.close();
  running = null;
});

async function start(overrides: Parameters<typeof startTestServer>[0] = {}) {
  running = await startTestServer(overrides);
  return running;
}

async function join(space: string, node: string): Promise<TestClient> {
  if (!running) throw new Error('server not started');
  const client = await TestClient.join(running.url, space, node);
  clients.push(client);
  return client;
}

describe('envelope node binding', () => {
  it('refuses envelopes attributed to another node and stores nothing', async () => {
    const { server } = await start();
    const victim = await join('space-1', 'node-b');
    const forger = await join('space-1', 'node-a');
    forger.push([envelope('node-a'), envelope('node-b')]);
    expect(await forger.expect('error')).toMatchObject({ code: 'bad_message' });
    expect((await forger.closed).code).toBe(1008);
    await victim.quiet();
    expect(server.metrics.get('pouxis_sync_envelopes_stored_total')).toBe(0);
  });

  it('still accepts envelopes of the authenticated node', async () => {
    await start();
    const client = await join('space-1', 'node-a');
    client.push([envelope('node-a')]);
    await client.expect('ack');
  });
});

describe('per-address connection cap', () => {
  it('rejects the upgrade beyond the cap and frees the slot on close', async () => {
    const { url, server } = await start({ maxConnectionsPerIp: 2 });
    const first = await TestClient.connect(url);
    clients.push(first, await TestClient.connect(url));
    await expect(TestClient.connect(url)).rejects.toThrow(/429/);
    expect(
      server.metrics.get('pouxis_sync_connections_rejected_total', {
        key: 'reason',
        value: 'address',
      }),
    ).toBe(1);
    await first.close();
    await waitFor(async () => {
      try {
        clients.push(await TestClient.connect(url));
        return true;
      } catch {
        return false;
      }
    });
  });

  it('counts per address and ignores everything when disabled', () => {
    const counter = new AddressCounter(1);
    expect(counter.allows('a')).toBe(true);
    counter.add('a');
    expect(counter.allows('a')).toBe(false);
    expect(counter.allows('b')).toBe(true);
    counter.remove('a');
    expect(counter.allows('a')).toBe(true);
    expect(counter.size).toBe(0);

    const off = new AddressCounter(0);
    off.add('a');
    off.add('a');
    expect(off.allows('a')).toBe(true);
    expect(off.size).toBe(0);
  });

  it('only trusts X-Forwarded-For behind a configured proxy, using its last entry', () => {
    const req = (forwarded?: string | string[]) =>
      ({
        headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
        socket: { remoteAddress: '10.0.0.1' },
      }) as unknown as http.IncomingMessage;
    expect(clientAddress(req('1.1.1.1'), false)).toBe('10.0.0.1');
    expect(clientAddress(req('6.6.6.6, 2.2.2.2'), true)).toBe('2.2.2.2');
    expect(clientAddress(req(['6.6.6.6', '3.3.3.3']), true)).toBe('3.3.3.3');
    expect(clientAddress(req(' , '), true)).toBe('10.0.0.1');
    expect(clientAddress(req(), true)).toBe('10.0.0.1');
  });

  it('is configured from the environment, off by default', () => {
    const defaults = loadConfig({ POUXIS_SYNC_SECRET: SECRET });
    expect(defaults).toMatchObject({ maxConnectionsPerIp: 0, trustProxy: false });
    const set = loadConfig({
      POUXIS_SYNC_SECRET: SECRET,
      POUXIS_MAX_CONNECTIONS_PER_IP: '32',
      POUXIS_TRUST_PROXY: 'true',
    });
    expect(set).toMatchObject({ maxConnectionsPerIp: 32, trustProxy: true });
    expect(() => loadConfig({ POUXIS_SYNC_SECRET: SECRET, POUXIS_TRUST_PROXY: 'yes' })).toThrow(
      /POUXIS_TRUST_PROXY/,
    );
  });
});

describe('metrics bearer', () => {
  it('matches only the exact token, whatever the length', () => {
    expect(bearerMatches('Bearer metrics-token', 'metrics-token')).toBe(true);
    expect(bearerMatches('Bearer metrics-toke', 'metrics-token')).toBe(false);
    expect(bearerMatches('Bearer metrics-token-longer', 'metrics-token')).toBe(false);
    expect(bearerMatches('bearer metrics-token', 'metrics-token')).toBe(false);
    expect(bearerMatches(undefined, 'metrics-token')).toBe(false);
  });
});

describe('isLoopback', () => {
  it('recognises loopback listen addresses only', () => {
    for (const host of ['127.0.0.1', '127.1.2.3', 'localhost', '::1']) {
      expect(isLoopback(host)).toBe(true);
    }
    for (const host of ['0.0.0.0', '::', '192.168.1.2', '127.0.0.1.example.org']) {
      expect(isLoopback(host)).toBe(false);
    }
  });
});

async function waitFor(check: () => Promise<boolean>, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
