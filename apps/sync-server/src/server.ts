/**
 * HTTP + WebSocket server: `GET /healthz`, `GET /metrics` and the sync endpoint
 * (`/v1/sync`) on the same port. Transport concerns live here (upgrade checks, frame size,
 * heartbeat, graceful shutdown); protocol logic lives in `relay.ts`.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import type { ServerConfig } from './config.ts';
import { createLogger, type Logger } from './logger.ts';
import { Metrics } from './metrics.ts';
import { PROTOCOL_PATH } from './protocol.ts';
import { Relay, type Session } from './relay.ts';
import { FileStorage } from './storage/file.ts';
import { MemoryStorage } from './storage/memory.ts';
import type { Storage } from './storage/types.ts';

export interface SyncServer {
  readonly port: number;
  readonly address: AddressInfo;
  readonly relay: Relay;
  readonly metrics: Metrics;
  /** Graceful shutdown (idempotent): drain, close connections, flush storage. */
  close(): Promise<void>;
}

export interface StartOptions {
  storage?: Storage;
  logger?: Logger;
  metrics?: Metrics;
}

/** Storage selected by the configuration. */
export function createStorage(config: ServerConfig, logger: Logger): Storage {
  if (config.storage === 'memory') return new MemoryStorage();
  return new FileStorage({
    dataDir: config.dataDir,
    fsync: config.fsync,
    fsyncIntervalMs: config.fsyncIntervalMs,
    logger,
  });
}

const SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
} as const;

export async function startServer(
  config: ServerConfig,
  options: StartOptions = {},
): Promise<SyncServer> {
  const logger = options.logger ?? createLogger({ level: config.logLevel });
  const metrics = options.metrics ?? new Metrics();
  const storage = options.storage ?? createStorage(config, logger);
  const relay = new Relay({ config, storage, logger, metrics });

  const httpServer = http.createServer({ maxHeaderSize: 16 * 1024 }, (req, res) =>
    handleHttp(req, res, config, relay, metrics),
  );
  httpServer.headersTimeout = 10_000;
  httpServer.requestTimeout = 30_000;

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: config.maxFrameBytes,
    // Payloads are ciphertext (incompressible) and compression enables memory bombs.
    perMessageDeflate: false,
    clientTracking: false,
  });

  const alive = new Map<WebSocket, { alive: boolean; session: Session }>();
  const perAddress = new AddressCounter(config.maxConnectionsPerIp);

  httpServer.on('upgrade', (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
    socket.on('error', () => socket.destroy());
    const reject = (status: number, reason: string): void => {
      metrics.inc('pouxis_sync_connections_rejected_total', 1, { key: 'reason', value: reason });
      rejectUpgrade(socket, status);
    };
    if (requestPath(req.url) !== PROTOCOL_PATH) return reject(404, 'path');
    if (relay.draining) return reject(503, 'draining');
    if (relay.sessions.size >= config.maxConnections) return reject(503, 'capacity');
    if (!originAllowed(req.headers.origin, config.allowedOrigins)) return reject(403, 'origin');
    const address = clientAddress(req, config.trustProxy);
    if (!perAddress.allows(address)) return reject(429, 'address');
    wss.handleUpgrade(req, socket, head, (ws) => attach(ws, address));
  });

  const attach = (ws: WebSocket, address: string): void => {
    perAddress.add(address);
    const session = relay.connect(ws);
    const state = { alive: true, session };
    alive.set(ws, state);
    ws.on('pong', () => {
      state.alive = true;
    });
    ws.on('message', (data: RawData, isBinary: boolean) => {
      state.alive = true;
      const buffer = toBuffer(data);
      if (isBinary) session.onBinary(buffer.length);
      else session.onText(buffer.toString('utf8'), buffer.length);
    });
    ws.on('error', (error: Error & { code?: string }) => {
      if (error.code === 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH') {
        metrics.inc('pouxis_sync_frames_too_large_total');
      } else {
        metrics.inc('pouxis_sync_protocol_errors_total');
      }
      logger.debug('ws.error', { conn: session.id, code: error.code });
    });
    ws.on('close', (code: number) => {
      perAddress.remove(address);
      alive.delete(ws);
      session.onClosed(code);
    });
  };

  const heartbeat = setInterval(() => {
    for (const [ws, state] of alive) {
      if (!state.alive) {
        metrics.inc('pouxis_sync_heartbeat_timeouts_total');
        logger.debug('ws.heartbeat_timeout', { conn: state.session.id });
        ws.terminate();
        continue;
      }
      state.alive = false;
      try {
        ws.ping();
      } catch {
        ws.terminate();
      }
    }
  }, config.heartbeatMs);
  heartbeat.unref();

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(config.port, config.host, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });
  const address = httpServer.address() as AddressInfo;
  logger.info('server.listening', {
    host: address.address,
    port: address.port,
    storage: config.storage,
    fsync: config.storage === 'file' ? config.fsync : undefined,
  });

  let closing: Promise<void> | null = null;
  const close = (): Promise<void> => {
    closing ??= (async () => {
      logger.info('server.draining');
      const stopped = new Promise<void>((resolve) => httpServer.close(() => resolve()));
      httpServer.closeIdleConnections();
      await relay.shutdown(config.shutdownTimeoutMs);
      clearInterval(heartbeat);
      for (const ws of alive.keys()) ws.terminate();
      wss.close();
      httpServer.closeAllConnections();
      await stopped;
      logger.info('server.stopped');
    })();
    return closing;
  };

  return { port: address.port, address, relay, metrics, close };
}

function handleHttp(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: ServerConfig,
  relay: Relay,
  metrics: Metrics,
): void {
  const pathname = requestPath(req.url);
  const send = (status: number, type: string, body: string): void => {
    res.writeHead(status, {
      ...SECURITY_HEADERS,
      'content-type': type,
      'content-length': Buffer.byteLength(body),
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  const json = (status: number, body: unknown): void =>
    send(status, 'application/json; charset=utf-8', JSON.stringify(body));

  if (pathname === '/healthz' || pathname === '/metrics') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('allow', 'GET, HEAD');
      return json(405, { error: 'method_not_allowed' });
    }
    if (pathname === '/healthz') {
      return relay.draining ? json(503, { status: 'draining' }) : json(200, { status: 'ok' });
    }
    if (
      config.metricsToken !== null &&
      !bearerMatches(req.headers.authorization, config.metricsToken)
    ) {
      res.setHeader('www-authenticate', 'Bearer');
      return json(401, { error: 'unauthorized' });
    }
    return send(200, 'text/plain; version=0.0.4; charset=utf-8', metrics.render());
  }
  if (pathname === PROTOCOL_PATH) return json(426, { error: 'upgrade_required' });
  json(404, { error: 'not_found' });
}

/** Path of a request target without query string; `null` if unparsable. */
function requestPath(url: string | undefined): string | null {
  if (url === undefined) return null;
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return null;
  }
}

/**
 * Browsers always send `Origin` on WebSocket handshakes, native clients usually do not.
 * When an allow-list is configured, a present but unlisted origin is refused (protection
 * against cross-site WebSocket use from web pages); absent origins are allowed, since
 * authentication relies on the hello token, never on ambient credentials.
 */
export function originAllowed(
  origin: string | undefined,
  allowed: readonly string[] | null,
): boolean {
  if (allowed === null || origin === undefined) return true;
  return allowed.includes(origin);
}

/**
 * Constant-time bearer check. Both sides are hashed first so the comparison has a fixed
 * length and its timing reveals neither the token nor its length.
 */
export function bearerMatches(header: string | undefined, expected: string): boolean {
  if (header === undefined || !header.startsWith('Bearer ')) return false;
  const given = createHash('sha256').update(header.slice('Bearer '.length), 'utf8').digest();
  const wanted = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(given, wanted);
}

/**
 * Address the per-address connection cap applies to. Behind a trusted reverse proxy, the
 * last `X-Forwarded-For` entry is the one that proxy appended (earlier entries are
 * client-controlled). Never logged (privacy rule of `logger.ts`).
 */
export function clientAddress(req: http.IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const header = req.headers['x-forwarded-for'];
    const raw = Array.isArray(header) ? header[header.length - 1] : header;
    const last = raw?.split(',').pop()?.trim();
    if (last) return last;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/** Live connection count per client address, bounded by `limit` (0 = unlimited). */
export class AddressCounter {
  private readonly counts = new Map<string, number>();
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  /** True when `address` may open one more connection. */
  allows(address: string): boolean {
    return this.limit === 0 || (this.counts.get(address) ?? 0) < this.limit;
  }

  add(address: string): void {
    if (this.limit === 0) return;
    this.counts.set(address, (this.counts.get(address) ?? 0) + 1);
  }

  remove(address: string): void {
    if (this.limit === 0) return;
    const next = (this.counts.get(address) ?? 0) - 1;
    if (next > 0) this.counts.set(address, next);
    else this.counts.delete(address);
  }

  /** Addresses currently tracked (tests, metrics). */
  get size(): number {
    return this.counts.size;
  }
}

function rejectUpgrade(socket: Duplex, status: number): void {
  const text = http.STATUS_CODES[status] ?? 'Error';
  if (socket.writable) {
    socket.write(
      `HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\nCache-Control: no-store\r\n\r\n`,
    );
  }
  socket.destroy();
}

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}
