/**
 * Wire protocol between replicas and the POuxis sync relay (JSON text frames, WebSocket path
 * `/v1/sync`). Byte-compatible with `apps/sync-server/src/protocol.ts`, which is the server
 * side of the same contract.
 *
 * The relay keeps one append-only log per space and never reads `payload` (JSON op batch, or
 * ciphertext of one when end-to-end encryption is on). A cursor is `String(seq)` of the last
 * log entry delivered (`'0'`: before the first). Pushes are idempotent on envelope id.
 */
import { decodeBatch, encodeBatch } from './codec.ts';
import { SyncError } from './errors.ts';
import { hlcNode, isValidHlc } from './hlc.ts';
import type { Op } from './ops.ts';

export const PROTOCOL_PATH = '/v1/sync';

export interface Envelope {
  /** Globally unique id of the batch; pushes are idempotent on it. */
  id: string;
  /** Highest HLC timestamp of the batch. */
  hlc: string;
  /** Node (device) that produced the batch. */
  node: string;
  /** Opaque body: JSON op batch or its ciphertext. */
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

export const ERROR_CODES = [
  'bad_message',
  'protocol',
  'unauthorized',
  'rate_limited',
  'space_full',
  'bad_cursor',
  'quota_exceeded',
  'slow_consumer',
  'unavailable',
  'internal',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Server limits a client must respect (mirrors the relay defaults). */
export const PROTOCOL_LIMITS = Object.freeze({
  maxIdLength: 128,
  maxHlcLength: 128,
  maxPayloadBytes: 256 * 1024,
  maxEnvelopesPerPush: 500,
});

const CURSOR_RE = /^(?:0|[1-9][0-9]{0,15})$/;

export function isValidCursor(value: unknown): value is string {
  return typeof value === 'string' && CURSOR_RE.test(value) && Number.isSafeInteger(Number(value));
}

/** Compares two cursors numerically. */
export function compareCursor(a: string, b: string): number {
  return Number(a) - Number(b);
}

export function encodeClientMessage(message: ClientMessage): string {
  return JSON.stringify(message);
}

/** Parses and validates a server frame. Throws `SyncError('decode')`. */
export function parseServerMessage(raw: string): ServerMessage {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (cause) {
    throw new SyncError('decode', 'server frame is not valid JSON', { cause });
  }
  return validateServerMessage(value);
}

export function validateServerMessage(value: unknown): ServerMessage {
  if (!isObject(value)) throw decodeError('server message must be an object');
  switch (value['t']) {
    case 'welcome':
      return { t: 'welcome', cursor: cursorOf(value) };
    case 'ack': {
      const ids = value['ids'];
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
        throw decodeError('ack.ids: must be strings');
      }
      return { t: 'ack', ids: [...(ids as string[])], cursor: cursorOf(value) };
    }
    case 'ops': {
      const envelopes = value['envelopes'];
      if (!Array.isArray(envelopes)) throw decodeError('ops.envelopes: must be an array');
      return { t: 'ops', envelopes: envelopes.map(storedEnvelope), cursor: cursorOf(value) };
    }
    case 'error': {
      const code = value['code'];
      const message = typeof value['message'] === 'string' ? value['message'] : '';
      if ((ERROR_CODES as readonly unknown[]).includes(code)) {
        return { t: 'error', code: code as ErrorCode, message };
      }
      return { t: 'error', code: 'internal', message: `[${String(code)}] ${message}` };
    }
    default:
      throw decodeError('unknown server message type');
  }
}

function cursorOf(value: Record<string, unknown>): string {
  const cursor = value['cursor'];
  if (!isValidCursor(cursor)) throw decodeError('cursor: invalid');
  return cursor;
}

function storedEnvelope(value: unknown): StoredEnvelope {
  if (!isObject(value)) throw decodeError('envelope must be an object');
  const { id, hlc, node, payload, seq } = value;
  if (typeof id !== 'string' || typeof node !== 'string' || typeof payload !== 'string') {
    throw decodeError('envelope: invalid fields');
  }
  if (!isValidHlc(hlc)) throw decodeError('envelope.hlc: invalid');
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 1) {
    throw decodeError('envelope.seq: invalid');
  }
  return { id, hlc, node, payload, seq };
}

/**
 * Builds the cleartext envelope of a batch of ops issued by `node`. The id is derived from
 * the batch bounds — `node.minHlc.maxHlc.count` (clock parts only) — so a batch rebuilt from
 * the replica state after a reconnection gets the id of the batch already sent when it holds
 * the same ops, and the relay deduplicates it. This relies on batches never splitting ops of
 * the same timestamp (the sync client guarantees it), and reveals nothing about the content.
 */
export function opsToEnvelope(ops: readonly Op[], node: string): Envelope {
  if (ops.length === 0) throw new SyncError('invalid', 'an envelope needs at least one op');
  let min = (ops[0] as Op).hlc;
  let max = min;
  for (const op of ops) {
    if (hlcNode(op.hlc) !== node) throw new SyncError('invalid', 'op was not issued by node');
    if (op.hlc < min) min = op.hlc;
    if (op.hlc > max) max = op.hlc;
  }
  const id = `${node}.${clockPart(min)}.${clockPart(max)}.${ops.length.toString(36)}`;
  return { id, hlc: max, node, payload: encodeBatch(ops) };
}

/**
 * Decodes the cleartext payload of an envelope. Rejects ops that claim another origin than
 * the envelope's node or a later timestamp than the envelope's (forged or corrupted batch).
 */
export function envelopeToOps(envelope: Envelope): Op[] {
  const ops = decodeBatch(envelope.payload);
  for (const op of ops) {
    if (hlcNode(op.hlc) !== envelope.node) throw decodeError('op origin differs from envelope');
    if (op.hlc > envelope.hlc) throw decodeError('op is newer than its envelope');
  }
  return ops;
}

function clockPart(hlc: string): string {
  return hlc.slice(0, 15);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeError(message: string): SyncError {
  return new SyncError('decode', message);
}
