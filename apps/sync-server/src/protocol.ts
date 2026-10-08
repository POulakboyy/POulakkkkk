/**
 * Wire protocol of the POuxis sync relay (JSON text frames over WebSocket at `/v1/sync`).
 *
 * The relay orders and fans out opaque envelopes. It never interprets `payload`, which is
 * usually ciphertext produced by `@pouxis/core/crypto`. This file is the single source of
 * truth for the server side of the contract and mirrors `packages/core/src/sync`.
 *
 * Cursor semantics: a cursor is `String(seq)` where `seq` is the position in the per-space
 * append-only log (`'0'` = before the first envelope). Every cursor the server sends to a
 * connection is safe to persist: it never exceeds what that connection has been sent (its
 * own pushes excepted), so resuming with `since = cursor` never skips an envelope.
 */

export const PROTOCOL_PATH = '/v1/sync';

export interface Envelope {
  /** Globally unique id of the operation; pushes are idempotent on it. */
  id: string;
  /** Hybrid logical clock of the operation (opaque to the server). */
  hlc: string;
  /** Id of the node (device) that produced the operation. */
  node: string;
  /** Opaque, usually end-to-end encrypted, operation body. */
  payload: string;
}

export type StoredEnvelope = Envelope & { seq: number };

export interface HelloMessage {
  t: 'hello';
  space: string;
  node: string;
  since: string | null;
  token: string;
}

export interface PushMessage {
  t: 'push';
  envelopes: Envelope[];
}

export type ClientMessage = HelloMessage | PushMessage;

export interface WelcomeMessage {
  t: 'welcome';
  cursor: string;
}

export interface AckMessage {
  t: 'ack';
  ids: string[];
  cursor: string;
}

export interface OpsMessage {
  t: 'ops';
  envelopes: StoredEnvelope[];
  cursor: string;
}

export interface ErrorMessage {
  t: 'error';
  code: ErrorCode;
  message: string;
}

export type ServerMessage = WelcomeMessage | AckMessage | OpsMessage | ErrorMessage;

/** Error codes sent in `{ t: 'error' }`. Clients may switch on them. */
export const ERROR_CODES = [
  /** Frame is not valid JSON or violates the schema. Connection is closed. */
  'bad_message',
  /** Message out of sequence (push before hello, second hello, hello timeout). Closed. */
  'protocol',
  /** Token missing, malformed, expired, or not valid for this space/node. Closed. */
  'unauthorized',
  /** Rate limit exceeded; the frame was dropped (not processed). Retry later. */
  'rate_limited',
  /** Too many connections on this space. Closed; retry with backoff. */
  'space_full',
  /** `since` is ahead of the server log (server restored from backup): resync with null. */
  'bad_cursor',
  /** The space storage quota is reached; the push was not stored. */
  'quota_exceeded',
  /** The connection does not read fast enough. Closed; reconnect and resume from cursor. */
  'slow_consumer',
  /** Storage temporarily unavailable. Closed; retry with backoff. */
  'unavailable',
  /** Unexpected server error. Closed. */
  'internal',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Size and count limits enforced on every client message. */
export interface ProtocolLimits {
  /** Max length of `space`, `node`, envelope `id` and envelope `node`. */
  maxIdLength: number;
  /** Max length of an envelope `hlc`. */
  maxHlcLength: number;
  /** Max length of `hello.token`. */
  maxTokenLength: number;
  /** Max UTF-8 byte length of one envelope `payload`. */
  maxPayloadBytes: number;
  /** Max number of envelopes in one push. */
  maxEnvelopesPerPush: number;
}

export const DEFAULT_LIMITS: Readonly<ProtocolLimits> = Object.freeze({
  maxIdLength: 128,
  maxHlcLength: 128,
  maxTokenLength: 4096,
  maxPayloadBytes: 256 * 1024,
  maxEnvelopesPerPush: 500,
});

/** Largest seq representable in a cursor (keeps arithmetic exact). */
export const MAX_SEQ = Number.MAX_SAFE_INTEGER;

/**
 * Identifiers (space, node, envelope id, hlc) are restricted to printable ASCII without
 * spaces: no control characters, no unicode confusables, safe to log and to hash.
 */
const IDENTIFIER_RE = /^[\x21-\x7e]+$/;
const CURSOR_RE = /^(?:0|[1-9][0-9]{0,15})$/;
const TOKEN_RE = /^[A-Za-z0-9_.-]+$/;

export type ParseResult = { ok: true; message: ClientMessage } | { ok: false; error: string };

export function isValidIdentifier(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    IDENTIFIER_RE.test(value)
  );
}

/** Formats a log position as a wire cursor. */
export function encodeCursor(seq: number): string {
  return String(seq);
}

/**
 * Parses a wire cursor. `null` means "from the beginning" (0). Returns `undefined` when the
 * cursor is malformed or out of range.
 */
export function parseCursor(cursor: string | null): number | undefined {
  if (cursor === null) return 0;
  if (!CURSOR_RE.test(cursor)) return undefined;
  const seq = Number(cursor);
  return Number.isSafeInteger(seq) && seq <= MAX_SEQ ? seq : undefined;
}

/** Parses and validates one text frame. Never throws. */
export function parseClientMessage(raw: string, limits: ProtocolLimits = DEFAULT_LIMITS): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'frame is not valid JSON' };
  }
  return validateClientMessage(value, limits);
}

/**
 * Strict runtime validation of a decoded client message: exact key sets (unknown keys are
 * rejected), types, lengths and counts. Only known fields are copied into the result, so
 * nothing unvalidated can ever be stored or relayed.
 */
export function validateClientMessage(
  value: unknown,
  limits: ProtocolLimits = DEFAULT_LIMITS,
): ParseResult {
  if (!isPlainObject(value)) return fail('message must be a JSON object');
  switch (value['t']) {
    case 'hello':
      return validateHello(value, limits);
    case 'push':
      return validatePush(value, limits);
    default:
      return fail('t: unknown message type');
  }
}

function validateHello(value: Record<string, unknown>, limits: ProtocolLimits): ParseResult {
  const keys = checkKeys(value, HELLO_KEYS);
  if (keys) return fail(keys);
  const { space, node, since, token } = value;
  if (!isValidIdentifier(space, limits.maxIdLength)) return fail('space: invalid identifier');
  if (!isValidIdentifier(node, limits.maxIdLength)) return fail('node: invalid identifier');
  if (since !== null && (typeof since !== 'string' || parseCursor(since) === undefined)) {
    return fail('since: must be null or a cursor string');
  }
  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > limits.maxTokenLength ||
    !TOKEN_RE.test(token)
  ) {
    return fail('token: invalid format');
  }
  return { ok: true, message: { t: 'hello', space, node, since, token } };
}

function validatePush(value: Record<string, unknown>, limits: ProtocolLimits): ParseResult {
  const keys = checkKeys(value, PUSH_KEYS);
  if (keys) return fail(keys);
  const raw = value['envelopes'];
  if (!Array.isArray(raw)) return fail('envelopes: must be an array');
  if (raw.length > limits.maxEnvelopesPerPush) {
    return fail(`envelopes: at most ${limits.maxEnvelopesPerPush} per push`);
  }
  const envelopes: Envelope[] = [];
  for (let i = 0; i < raw.length; i++) {
    const result = validateEnvelope(raw[i], limits);
    if (typeof result === 'string') return fail(`envelopes[${i}].${result}`);
    envelopes.push(result);
  }
  return { ok: true, message: { t: 'push', envelopes } };
}

function validateEnvelope(value: unknown, limits: ProtocolLimits): Envelope | string {
  if (!isPlainObject(value)) return 'envelope must be an object';
  const keys = checkKeys(value, ENVELOPE_KEYS);
  if (keys) return keys;
  const { id, hlc, node, payload } = value;
  if (!isValidIdentifier(id, limits.maxIdLength)) return 'id: invalid identifier';
  if (!isValidIdentifier(hlc, limits.maxHlcLength)) return 'hlc: invalid identifier';
  if (!isValidIdentifier(node, limits.maxIdLength)) return 'node: invalid identifier';
  if (typeof payload !== 'string') return 'payload: must be a string';
  // Cheap upper bound first (UTF-8 uses at most 3 bytes per UTF-16 code unit).
  if (payload.length * 3 > limits.maxPayloadBytes) {
    if (Buffer.byteLength(payload, 'utf8') > limits.maxPayloadBytes) {
      return `payload: exceeds ${limits.maxPayloadBytes} bytes`;
    }
  }
  return { id, hlc, node, payload };
}

const HELLO_KEYS: ReadonlySet<string> = new Set(['t', 'space', 'node', 'since', 'token']);
const PUSH_KEYS: ReadonlySet<string> = new Set(['t', 'envelopes']);
const ENVELOPE_KEYS: ReadonlySet<string> = new Set(['id', 'hlc', 'node', 'payload']);

/** Returns an error string when the object's own keys differ from `expected`. */
function checkKeys(value: Record<string, unknown>, expected: ReadonlySet<string>): string | null {
  const keys = Object.keys(value);
  for (const key of keys) {
    if (!expected.has(key)) return `unknown field "${key.slice(0, 32)}"`;
  }
  if (keys.length !== expected.size) {
    for (const key of expected) {
      if (!Object.hasOwn(value, key)) return `${key}: missing`;
    }
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(error: string): ParseResult {
  return { ok: false, error };
}

/** Serializes a server message. */
export function encodeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}
