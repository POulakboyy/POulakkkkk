/**
 * Test helpers: configuration builder, server lifecycle and a real `ws` client that queues
 * server messages so tests can await them in order.
 */
import { WebSocket } from 'ws';
import { loadConfig, type ServerConfig } from '../src/config.ts';
import type { Logger } from '../src/logger.ts';
import { silentLogger } from '../src/logger.ts';
import {
  PROTOCOL_PATH,
  type Envelope,
  type ServerMessage,
  type StoredEnvelope,
} from '../src/protocol.ts';
import { startServer, type SyncServer } from '../src/server.ts';
import { MemoryStorage } from '../src/storage/memory.ts';
import type { Storage } from '../src/storage/types.ts';
import { signToken } from '../src/token.ts';

export const SECRET = 'test-secret-0123456789-abcdefghijklmnop';

/** Valid configuration for tests (memory storage, ephemeral port) with overrides. */
export function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  const base = loadConfig({
    POUXIS_SYNC_SECRET: SECRET,
    PORT: '0',
    HOST: '127.0.0.1',
    POUXIS_STORAGE: 'memory',
    POUXIS_LOG_LEVEL: 'error',
  });
  return { ...base, ...overrides };
}

export interface RunningServer {
  server: SyncServer;
  url: string;
  httpUrl: string;
  storage: Storage;
}

export async function startTestServer(
  overrides: Partial<ServerConfig> = {},
  options: { storage?: Storage; logger?: Logger } = {},
): Promise<RunningServer> {
  const storage = options.storage ?? new MemoryStorage();
  const server = await startServer(testConfig(overrides), {
    storage,
    logger: options.logger ?? silentLogger,
  });
  const httpUrl = `http://127.0.0.1:${server.port}`;
  return { server, storage, httpUrl, url: `ws://127.0.0.1:${server.port}${PROTOCOL_PATH}` };
}

export function token(
  space: string,
  options: { node?: string; ttl?: number; secret?: string } = {},
): string {
  const exp = Math.floor(Date.now() / 1000) + (options.ttl ?? 3600);
  const sign: { space: string; exp: number; node?: string } = { space, exp };
  if (options.node !== undefined) sign.node = options.node;
  return signToken(sign, options.secret ?? SECRET);
}

let counter = 0;

/** A fresh envelope with a unique id. */
export function envelope(node: string, payload = 'cipher'): Envelope {
  counter++;
  return { id: `${node}-op-${counter}`, hlc: `${Date.now()}-${counter}-${node}`, node, payload };
}

export interface CloseInfo {
  code: number;
  reason: string;
}

/** Real WebSocket client that buffers incoming server messages. */
export class TestClient {
  readonly ws: WebSocket;
  readonly closed: Promise<CloseInfo>;
  private readonly inbox: ServerMessage[] = [];
  private waiter: (() => void) | null = null;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on('message', (data) => {
      this.inbox.push(JSON.parse(String(data)) as ServerMessage);
      this.waiter?.();
    });
    this.closed = new Promise((resolve) => {
      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
        this.waiter?.();
      });
    });
  }

  static connect(url: string, options: { origin?: string } = {}): Promise<TestClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, options.origin ? { origin: options.origin } : {});
      const client = new TestClient(ws);
      ws.once('open', () => resolve(client));
      ws.once('error', reject);
    });
  }

  /** Connects and completes hello; resolves after the welcome message. */
  static async join(
    url: string,
    space: string,
    node: string,
    since: string | null = null,
  ): Promise<TestClient> {
    const client = await TestClient.connect(url);
    client.send({ t: 'hello', space, node, since, token: token(space) });
    const welcome = await client.next();
    if (welcome.t !== 'welcome')
      throw new Error(`expected welcome, got ${JSON.stringify(welcome)}`);
    return client;
  }

  send(message: unknown): void {
    this.ws.send(typeof message === 'string' ? message : JSON.stringify(message));
  }

  push(envelopes: Envelope[]): void {
    this.send({ t: 'push', envelopes });
  }

  /** Next server message, in arrival order. */
  async next(timeoutMs = 2000): Promise<ServerMessage> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const message = this.inbox.shift();
      if (message) return message;
      if (this.ws.readyState === WebSocket.CLOSED) throw new Error('connection closed');
      const left = deadline - Date.now();
      if (left <= 0) throw new Error('timed out waiting for a server message');
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, left);
        this.waiter = () => {
          clearTimeout(timer);
          this.waiter = null;
          resolve();
        };
      });
    }
  }

  /** Next message, asserting its type. */
  async expect<T extends ServerMessage['t']>(
    type: T,
    timeoutMs?: number,
  ): Promise<Extract<ServerMessage, { t: T }>> {
    const message = await this.next(timeoutMs);
    if (message.t !== type) {
      throw new Error(`expected ${type}, got ${JSON.stringify(message).slice(0, 300)}`);
    }
    return message as Extract<ServerMessage, { t: T }>;
  }

  /** Reads `ops` messages until `count` envelopes were received. */
  async collect(
    count: number,
    timeoutMs?: number,
  ): Promise<{ envelopes: StoredEnvelope[]; frames: number; cursor: string }> {
    const envelopes: StoredEnvelope[] = [];
    let frames = 0;
    let cursor = '';
    while (envelopes.length < count) {
      const ops = await this.expect('ops', timeoutMs);
      envelopes.push(...ops.envelopes);
      cursor = ops.cursor;
      frames++;
    }
    return { envelopes, frames, cursor };
  }

  /** Removes and returns every message received so far. */
  drain(): ServerMessage[] {
    return this.inbox.splice(0);
  }

  /** Asserts that no message arrives within `ms`. */
  async quiet(ms = 150): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    if (this.inbox.length > 0) {
      throw new Error(`unexpected message ${JSON.stringify(this.inbox[0]).slice(0, 300)}`);
    }
  }

  close(): Promise<CloseInfo> {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.close(1000);
    return this.closed;
  }
}
