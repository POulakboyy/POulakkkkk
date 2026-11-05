/**
 * Load test of the sync relay: `node bench/load.ts [options]`.
 *
 * Starts the server in-process on a random port, connects N WebSocket clients spread over S
 * spaces, and has every client push R batches of B envelopes, waiting for each ack (closed
 * loop). Measures push→ack and push→fan-out latencies, throughput and memory, then checks
 * that nothing was lost: every client received every envelope of its peers exactly once, and
 * a fresh client replaying each space from `since: null` gets the full, gap-free log.
 *
 *   --clients <n>      concurrent clients (default 200)
 *   --spaces <n>       spaces they are spread over (default 20; ≤ 64 clients per space)
 *   --rounds <n>       pushes per client (default 50)
 *   --batch <n>        envelopes per push (default 5)
 *   --payload <bytes>  payload size per envelope (default 512)
 *   --storage <kind>   memory (default) or file (fsync=interval, temporary directory)
 *   --json <file>      write the report as JSON
 *
 * Client and server share one process (and CPU): figures are a lower bound for the relay.
 * Rate limits are raised so the test measures the relay, not the per-connection limiter.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { loadConfig, type ServerConfig } from '../src/config.ts';
import { silentLogger } from '../src/logger.ts';
import { PROTOCOL_PATH, type Envelope, type ServerMessage } from '../src/protocol.ts';
import { startServer } from '../src/server.ts';
import { FileStorage } from '../src/storage/file.ts';
import { MemoryStorage } from '../src/storage/memory.ts';
import type { Storage } from '../src/storage/types.ts';
import { signToken } from '../src/token.ts';

const SECRET = 'load-test-secret-0123456789-abcdefghijkl';

interface Options {
  clients: number;
  spaces: number;
  rounds: number;
  batch: number;
  payload: number;
  storage: 'memory' | 'file';
  json?: string;
}

function parseOptions(argv: readonly string[]): Options {
  const options: Options = {
    clients: 200,
    spaces: 20,
    rounds: 50,
    batch: 5,
    payload: 512,
    storage: 'memory',
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`${flag} needs a value`);
    const int = (): number => {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1) throw new Error(`${flag} must be a positive integer`);
      return n;
    };
    if (flag === '--clients') options.clients = int();
    else if (flag === '--spaces') options.spaces = int();
    else if (flag === '--rounds') options.rounds = int();
    else if (flag === '--batch') options.batch = int();
    else if (flag === '--payload') options.payload = int();
    else if (flag === '--json') options.json = value;
    else if (flag === '--storage' && (value === 'memory' || value === 'file')) {
      options.storage = value;
    } else throw new Error(`unknown option ${flag} ${value}`);
  }
  if (Math.ceil(options.clients / options.spaces) > 64) {
    throw new Error('at most 64 clients per space (POUXIS_MAX_CONNECTIONS_PER_SPACE)');
  }
  return options;
}

function serverConfig(): ServerConfig {
  return loadConfig({
    POUXIS_SYNC_SECRET: SECRET,
    PORT: '0',
    HOST: '127.0.0.1',
    POUXIS_STORAGE: 'memory',
    POUXIS_LOG_LEVEL: 'error',
    POUXIS_RATE_MESSAGES_PER_SEC: '100000',
    POUXIS_RATE_MESSAGES_BURST: '100000',
    POUXIS_RATE_BYTES_PER_SEC: String(1024 ** 3),
    POUXIS_RATE_BYTES_BURST: String(1024 ** 3),
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Client                                                                                      */
/* ------------------------------------------------------------------------------------------ */

class LoadClient {
  readonly node: string;
  readonly space: string;
  readonly ws: WebSocket;
  /** Envelope ids received from peers, with their arrival count. */
  readonly received = new Map<string, number>();
  readonly ackLatencies: number[] = [];
  readonly fanoutLatencies: number[] = [];
  private readonly sentAt = new Map<string, number>();
  private waiter: ((message: ServerMessage) => void) | null = null;
  errors: string[] = [];

  private constructor(ws: WebSocket, space: string, node: string, sentAt: Map<string, number>) {
    this.ws = ws;
    this.space = space;
    this.node = node;
    this.sentAt = sentAt;
    ws.on('message', (data) => this.onMessage(JSON.parse(String(data)) as ServerMessage));
  }

  static async join(url: string, space: string, node: string, sentAt: Map<string, number>) {
    const ws = new WebSocket(url, { perMessageDeflate: false });
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
    const client = new LoadClient(ws, space, node, sentAt);
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const welcome = client.next();
    client.ws.send(
      JSON.stringify({
        t: 'hello',
        space,
        node,
        since: null,
        token: signToken({ space, exp }, SECRET),
      }),
    );
    const message = await welcome;
    if (message.t !== 'welcome') throw new Error(`expected welcome, got ${message.t}`);
    return client;
  }

  private next(): Promise<ServerMessage> {
    return new Promise((resolve) => {
      this.waiter = resolve;
    });
  }

  private onMessage(message: ServerMessage): void {
    if (message.t === 'ops') {
      const now = performance.now();
      for (const envelope of message.envelopes) {
        this.received.set(envelope.id, (this.received.get(envelope.id) ?? 0) + 1);
        const sent = this.sentAt.get(envelope.id);
        if (sent !== undefined) this.fanoutLatencies.push(now - sent);
      }
      return;
    }
    if (message.t === 'error') this.errors.push(`${message.code}: ${message.message}`);
    const waiter = this.waiter;
    this.waiter = null;
    waiter?.(message);
  }

  /** Pushes one batch and resolves with the ack latency. */
  async push(envelopes: Envelope[]): Promise<void> {
    const ack = this.next();
    const t0 = performance.now();
    for (const envelope of envelopes) this.sentAt.set(envelope.id, t0);
    this.ws.send(JSON.stringify({ t: 'push', envelopes }));
    const message = await ack;
    if (message.t !== 'ack') throw new Error(`expected ack, got ${JSON.stringify(message)}`);
    if (message.ids.length !== envelopes.length) throw new Error('partial ack');
    this.ackLatencies.push(performance.now() - t0);
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.ws.once('close', () => resolve());
      this.ws.close(1000);
    });
  }
}

/** Replays a whole space with a fresh connection; returns the stored envelopes in order. */
async function replay(url: string, space: string, expected: number) {
  const seqs: number[] = [];
  const ids: string[] = [];
  const ws = new WebSocket(url, { perMessageDeflate: false });
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  const done = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`replay of ${space} timed out`)), 30_000);
    ws.on('message', (data) => {
      const message = JSON.parse(String(data)) as ServerMessage;
      if (message.t !== 'ops') return;
      for (const envelope of message.envelopes) {
        seqs.push(envelope.seq);
        ids.push(envelope.id);
      }
      if (ids.length >= expected) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = signToken({ space, exp }, SECRET);
  ws.send(JSON.stringify({ t: 'hello', space, node: 'replayer', since: null, token }));
  await done;
  ws.close(1000);
  return { seqs, ids };
}

/* ------------------------------------------------------------------------------------------ */
/* Measurements                                                                                */
/* ------------------------------------------------------------------------------------------ */

function percentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))] ?? 0;
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    p50: r(at(0.5)),
    p95: r(at(0.95)),
    p99: r(at(0.99)),
    max: r(sorted[sorted.length - 1] ?? 0),
  };
}

const mib = (bytes: number): number => Math.round((bytes / 2 ** 20) * 10) / 10;

function sampleMemory(peak: { rss: number; heap: number }): NodeJS.Timeout {
  const timer = setInterval(() => {
    const m = process.memoryUsage();
    peak.rss = Math.max(peak.rss, m.rss);
    peak.heap = Math.max(peak.heap, m.heapUsed);
  }, 50);
  timer.unref();
  return timer;
}

async function waitFor(check: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return true;
}

/* ------------------------------------------------------------------------------------------ */
/* Run                                                                                         */
/* ------------------------------------------------------------------------------------------ */

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const dataDir =
    options.storage === 'file' ? await mkdtemp(path.join(os.tmpdir(), 'pouxis-load-')) : null;
  const storage: Storage = dataDir
    ? new FileStorage({ dataDir, fsync: 'interval', fsyncIntervalMs: 100, logger: silentLogger })
    : new MemoryStorage();
  const server = await startServer(serverConfig(), { storage, logger: silentLogger });
  const url = `ws://127.0.0.1:${server.port}${PROTOCOL_PATH}`;
  const baseline = process.memoryUsage();
  const peak = { rss: baseline.rss, heap: baseline.heapUsed };
  const sampler = sampleMemory(peak);
  const payload = 'x'.repeat(options.payload);

  try {
    const sentAt = new Map<string, number>();
    const tConnect = performance.now();
    const clients = await Promise.all(
      Array.from({ length: options.clients }, (_, i) =>
        LoadClient.join(url, `space-${i % options.spaces}`, `node-${i}`, sentAt),
      ),
    );
    const connectMs = performance.now() - tConnect;

    const tPush = performance.now();
    let counter = 0;
    await Promise.all(
      clients.map(async (client) => {
        for (let r = 0; r < options.rounds; r++) {
          const envelopes = Array.from({ length: options.batch }, () => {
            counter++;
            const id = `${client.node}.${r}.${counter}`;
            return {
              id,
              hlc: `${Date.now()}-${counter}-${client.node}`,
              node: client.node,
              payload,
            };
          });
          await client.push(envelopes);
        }
      }),
    );
    const pushMs = performance.now() - tPush;

    // Fan-out completes asynchronously after the last ack.
    const perClient = options.rounds * options.batch;
    const peersOf = (c: LoadClient) => clients.filter((o) => o.space === c.space && o !== c);
    const expectedOf = new Map(clients.map((c) => [c, peersOf(c).length * perClient]));
    const delivered = await waitFor(
      () => clients.every((c) => c.received.size >= (expectedOf.get(c) ?? 0)),
      60_000,
    );
    const fanoutMs = performance.now() - tPush;

    // Zero-loss checks.
    const problems: string[] = [];
    if (!delivered) problems.push('fan-out incomplete after 60 s');
    for (const client of clients) {
      const expected = expectedOf.get(client) ?? 0;
      if (client.received.size !== expected) {
        problems.push(`${client.node}: received ${client.received.size}/${expected}`);
      }
      for (const [id, count] of client.received) {
        if (count !== 1) problems.push(`${client.node}: ${id} delivered ${count} times`);
        if (id.startsWith(`${client.node}.`)) problems.push(`${client.node}: echo of own ${id}`);
      }
      problems.push(...client.errors.map((e) => `${client.node}: ${e}`));
    }
    const spaces = [...new Set(clients.map((c) => c.space))];
    for (const space of spaces) {
      const members = clients.filter((c) => c.space === space).length;
      const expected = members * perClient;
      const { seqs, ids } = await replay(url, space, expected);
      if (ids.length !== expected) problems.push(`${space}: replay ${ids.length}/${expected}`);
      if (new Set(ids).size !== ids.length) problems.push(`${space}: duplicate ids in log`);
      if (seqs.some((s, i) => s !== i + 1)) problems.push(`${space}: seq gaps or disorder`);
    }

    const total = options.clients * perClient;
    const ack = percentiles(clients.flatMap((c) => c.ackLatencies));
    const fanout = percentiles(clients.flatMap((c) => c.fanoutLatencies));
    const report = {
      date: new Date().toISOString(),
      machine: {
        node: process.version,
        cpu: os.cpus()[0]?.model.trim() ?? 'unknown',
        cores: os.cpus().length,
        memoryGiB: Math.round(os.totalmem() / 2 ** 30),
      },
      options: { ...options, json: undefined },
      connectMs: Math.round(connectMs),
      pushMs: Math.round(pushMs),
      fanoutCompleteMs: Math.round(fanoutMs),
      envelopesStored: total,
      envelopesDelivered: clients.reduce((n, c) => n + c.received.size, 0),
      storedPerSecond: Math.round(total / (pushMs / 1000)),
      pushesPerSecond: Math.round((options.clients * options.rounds) / (pushMs / 1000)),
      ackLatencyMs: ack,
      fanoutLatencyMs: fanout,
      memoryMiB: {
        rssBefore: mib(baseline.rss),
        rssPeak: mib(peak.rss),
        heapBefore: mib(baseline.heapUsed),
        heapPeak: mib(peak.heap),
      },
      lost: problems.length,
      problems: problems.slice(0, 20),
    };
    console.log(JSON.stringify(report, null, 2));
    if (options.json) await writeFile(options.json, `${JSON.stringify(report, null, 2)}\n`);
    await Promise.all(clients.map((c) => c.close()));
    if (problems.length > 0) process.exitCode = 1;
  } finally {
    clearInterval(sampler);
    await server.close();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  }
}

await main();
