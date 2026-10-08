/**
 * Server configuration, read from environment variables with documented defaults.
 * `loadConfig` throws a {@link ConfigError} listing every invalid variable.
 */
import path from 'node:path';
import { DEFAULT_LIMITS, type ProtocolLimits } from './protocol.ts';
import type { LogLevel } from './logger.ts';

export type FsyncPolicy = 'always' | 'interval' | 'never';
export type StorageKind = 'file' | 'memory';

export interface RateLimitConfig {
  /** Sustained frames per second per connection. */
  messagesPerSecond: number;
  /** Frame burst per connection. */
  messageBurst: number;
  /** Sustained inbound bytes per second per connection. */
  bytesPerSecond: number;
  /** Inbound byte burst per connection (must be >= maxFrameBytes). */
  byteBurst: number;
  /** Consecutive rate-limited frames before the connection is closed. */
  maxStrikes: number;
}

export interface ServerConfig {
  host: string;
  port: number;
  /** True when NODE_ENV=development. */
  development: boolean;
  storage: StorageKind;
  dataDir: string;
  fsync: FsyncPolicy;
  fsyncIntervalMs: number;
  /** Accepted token secrets; the first one is the current signing secret. */
  secrets: string[];
  /** Allowed `Origin` values for browser clients; `null` accepts any origin. */
  allowedOrigins: string[] | null;
  limits: ProtocolLimits;
  maxFrameBytes: number;
  maxConnections: number;
  maxConnectionsPerSpace: number;
  /** Per-space storage quota in bytes; 0 disables it. */
  maxSpaceBytes: number;
  rateLimit: RateLimitConfig;
  heartbeatMs: number;
  helloTimeoutMs: number;
  shutdownTimeoutMs: number;
  /** Delay before an unused space log is closed and evicted from memory. */
  spaceIdleMs: number;
  backlogPageSize: number;
  backlogPageBytes: number;
  /** A connection whose send buffer exceeds this is closed as a slow consumer. */
  maxBufferedBytes: number;
  /** Bearer token required by `GET /metrics`; `null` leaves it open. */
  metricsToken: string | null;
  logLevel: LogLevel;
}

/** Well-known secret used only when NODE_ENV=development and no secret is configured. */
export const DEV_SECRET = 'pouxis-insecure-development-secret-never-use-in-production';
export const MIN_SECRET_LENGTH = 32;

export class ConfigError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`invalid configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

type Env = Readonly<Record<string, string | undefined>>;

/** Resolves token secrets from `POUXIS_SYNC_SECRET` (+ `POUXIS_SYNC_SECRET_PREVIOUS`). */
export function resolveSecrets(env: Env): { secrets: string[]; insecure: boolean } {
  const development = env['NODE_ENV'] === 'development';
  const current = env['POUXIS_SYNC_SECRET']?.trim() ?? '';
  const previous = env['POUXIS_SYNC_SECRET_PREVIOUS']?.trim() ?? '';
  if (current === '') {
    if (development) return { secrets: [DEV_SECRET], insecure: true };
    throw new ConfigError([
      'POUXIS_SYNC_SECRET is required (set NODE_ENV=development to use an insecure dev secret)',
    ]);
  }
  const problems: string[] = [];
  if (current.length < MIN_SECRET_LENGTH && !development) {
    problems.push(`POUXIS_SYNC_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  if (previous !== '' && previous.length < MIN_SECRET_LENGTH && !development) {
    problems.push(`POUXIS_SYNC_SECRET_PREVIOUS must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  if (problems.length > 0) throw new ConfigError(problems);
  return { secrets: previous === '' ? [current] : [current, previous], insecure: false };
}

export function loadConfig(env: Env = process.env): ServerConfig {
  const problems: string[] = [];
  const development = env['NODE_ENV'] === 'development';

  const int = (name: string, fallback: number, min: number, max: number): number => {
    const raw = env[name]?.trim();
    if (raw === undefined || raw === '') return fallback;
    if (!/^[0-9]+$/.test(raw)) {
      problems.push(`${name} must be an integer`);
      return fallback;
    }
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      problems.push(`${name} must be between ${min} and ${max}`);
      return fallback;
    }
    return value;
  };

  const oneOf = <T extends string>(name: string, fallback: T, allowed: readonly T[]): T => {
    const raw = env[name]?.trim();
    if (raw === undefined || raw === '') return fallback;
    if ((allowed as readonly string[]).includes(raw)) return raw as T;
    problems.push(`${name} must be one of: ${allowed.join(', ')}`);
    return fallback;
  };

  let secrets: string[] = [];
  try {
    secrets = resolveSecrets(env).secrets;
  } catch (error) {
    if (error instanceof ConfigError) problems.push(...error.problems);
    else throw error;
  }

  const maxFrameBytes = int('POUXIS_MAX_FRAME_BYTES', 1024 * 1024, 1024, 64 * 1024 * 1024);
  const limits: ProtocolLimits = {
    ...DEFAULT_LIMITS,
    maxPayloadBytes: int(
      'POUXIS_MAX_PAYLOAD_BYTES',
      DEFAULT_LIMITS.maxPayloadBytes,
      1,
      64 * 1024 * 1024,
    ),
    maxEnvelopesPerPush: int(
      'POUXIS_MAX_ENVELOPES_PER_PUSH',
      DEFAULT_LIMITS.maxEnvelopesPerPush,
      1,
      100_000,
    ),
  };
  if (limits.maxPayloadBytes >= maxFrameBytes) {
    problems.push('POUXIS_MAX_PAYLOAD_BYTES must be smaller than POUXIS_MAX_FRAME_BYTES');
  }

  const rateLimit: RateLimitConfig = {
    messagesPerSecond: int('POUXIS_RATE_MESSAGES_PER_SEC', 20, 1, 1_000_000),
    messageBurst: int('POUXIS_RATE_MESSAGES_BURST', 60, 1, 1_000_000),
    bytesPerSecond: int('POUXIS_RATE_BYTES_PER_SEC', 1024 * 1024, 1, 1024 * 1024 * 1024),
    byteBurst: int('POUXIS_RATE_BYTES_BURST', 4 * maxFrameBytes, 1, 1024 * 1024 * 1024),
    maxStrikes: int('POUXIS_RATE_MAX_STRIKES', 10, 1, 1_000_000),
  };
  if (rateLimit.byteBurst < maxFrameBytes) {
    problems.push('POUXIS_RATE_BYTES_BURST must be >= POUXIS_MAX_FRAME_BYTES');
  }

  const backlogPageBytes = int('POUXIS_BACKLOG_PAGE_BYTES', 512 * 1024, 1024, 64 * 1024 * 1024);
  const maxBufferedBytes = int(
    'POUXIS_MAX_BUFFERED_BYTES',
    8 * 1024 * 1024,
    64 * 1024,
    1024 * 1024 * 1024,
  );
  if (maxBufferedBytes < 2 * maxFrameBytes) {
    problems.push('POUXIS_MAX_BUFFERED_BYTES must be >= 2 * POUXIS_MAX_FRAME_BYTES');
  }

  const originsRaw = env['POUXIS_ALLOWED_ORIGINS']?.trim() ?? '';
  const origins = originsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowedOrigins = origins.length === 0 || origins.includes('*') ? null : origins;

  const metricsToken = env['POUXIS_METRICS_TOKEN']?.trim() || null;

  const config: ServerConfig = {
    host: env['HOST']?.trim() || '127.0.0.1',
    port: int('PORT', 8787, 0, 65535),
    development,
    storage: oneOf<StorageKind>('POUXIS_STORAGE', 'file', ['file', 'memory']),
    dataDir: path.resolve(env['POUXIS_DATA_DIR']?.trim() || 'data'),
    fsync: oneOf<FsyncPolicy>('POUXIS_FSYNC', 'always', ['always', 'interval', 'never']),
    fsyncIntervalMs: int('POUXIS_FSYNC_INTERVAL_MS', 1000, 10, 60_000),
    secrets,
    allowedOrigins,
    limits,
    maxFrameBytes,
    maxConnections: int('POUXIS_MAX_CONNECTIONS', 10_000, 1, 10_000_000),
    maxConnectionsPerSpace: int('POUXIS_MAX_CONNECTIONS_PER_SPACE', 64, 1, 1_000_000),
    maxSpaceBytes: int('POUXIS_MAX_SPACE_BYTES', 1024 * 1024 * 1024, 0, Number.MAX_SAFE_INTEGER),
    rateLimit,
    heartbeatMs: int('POUXIS_HEARTBEAT_MS', 30_000, 10, 3_600_000),
    helloTimeoutMs: int('POUXIS_HELLO_TIMEOUT_MS', 10_000, 10, 600_000),
    shutdownTimeoutMs: int('POUXIS_SHUTDOWN_TIMEOUT_MS', 10_000, 0, 600_000),
    spaceIdleMs: int('POUXIS_SPACE_IDLE_MS', 30_000, 0, 86_400_000),
    backlogPageSize: int('POUXIS_BACKLOG_PAGE_SIZE', 500, 1, 100_000),
    backlogPageBytes,
    maxBufferedBytes,
    metricsToken,
    logLevel: oneOf<LogLevel>('POUXIS_LOG_LEVEL', 'info', ['debug', 'info', 'warn', 'error']),
  };

  if (problems.length > 0) throw new ConfigError(problems);
  return config;
}
