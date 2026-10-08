/**
 * Structured JSON logger: one JSON object per line on stdout.
 *
 * Privacy rules enforced here (defence in depth, callers must follow them too):
 * - payloads, tokens and secrets are never logged: such keys are redacted;
 * - space and node ids are logged as short one-way tags ({@link tag}), never verbatim;
 * - client IP addresses are not logged.
 */
import { createHash } from 'node:crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

const LEVELS: Readonly<Record<LogLevel, number>> = { debug: 10, info: 20, warn: 30, error: 40 };
const REDACTED_KEYS = /^(?:payload|payloads|token|secret|secrets|authorization|envelopes?)$/i;

export interface LoggerOptions {
  level?: LogLevel;
  /** Receives one serialized line (without trailing newline). Defaults to stdout. */
  sink?: (line: string) => void;
  base?: LogFields;
  now?: () => Date;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const threshold = LEVELS[options.level ?? 'info'];
  const sink = options.sink ?? ((line: string) => void process.stdout.write(line + '\n'));
  const now = options.now ?? (() => new Date());

  const make = (base: LogFields): Logger => {
    const write = (level: LogLevel, msg: string, fields?: LogFields): void => {
      if (LEVELS[level] < threshold) return;
      const record: LogFields = { ts: now().toISOString(), level, msg };
      for (const [key, value] of Object.entries(base)) record[key] = sanitize(key, value);
      if (fields) for (const [key, value] of Object.entries(fields)) record[key] = sanitize(key, value);
      let line: string;
      try {
        line = JSON.stringify(record);
      } catch {
        line = JSON.stringify({ ts: record['ts'], level, msg, note: 'unserializable fields' });
      }
      sink(line);
    };
    return {
      debug: (msg, fields) => write('debug', msg, fields),
      info: (msg, fields) => write('info', msg, fields),
      warn: (msg, fields) => write('warn', msg, fields),
      error: (msg, fields) => write('error', msg, fields),
      child: (fields) => make({ ...base, ...fields }),
    };
  };
  return make(options.base ?? {});
}

function sanitize(key: string, value: unknown): unknown {
  if (REDACTED_KEYS.test(key)) return '[redacted]';
  if (value instanceof Error) return serializeError(value);
  return value;
}

export function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    const out: LogFields = { name: error.name, message: error.message };
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') out['code'] = code;
    if (error.stack) out['stack'] = error.stack.split('\n').slice(0, 8).join('\n');
    return out;
  }
  return { message: String(error) };
}

/**
 * Short, stable, one-way tag of an identifier for log correlation without disclosing it.
 */
export function tag(value: string): string {
  return createHash('sha256').update('pouxis-log-tag:').update(value).digest('hex').slice(0, 12);
}

/** Logger that discards everything (tests). */
export const silentLogger: Logger = createLogger({ level: 'error', sink: () => {} });
