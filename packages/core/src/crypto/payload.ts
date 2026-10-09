/**
 * End-to-end encryption of sync envelope payloads.
 *
 * The relay (apps/sync-server) stores and forwards opaque `Envelope { id, hlc, node, payload }`
 * values. With these helpers `payload` is always a `pxv1.…` ciphertext produced on the client
 * with the space key, so the relay never sees record contents. The cleartext envelope fields
 * the relay needs for routing and ordering (`id`, `hlc`, `node`) plus the space id are bound
 * as associated data: a relay that rewrites a clock to win a last-writer-wins merge, moves a
 * payload to another envelope or replays it into another space makes decryption fail.
 *
 * Before encryption the serialized payload is framed and padded with Padmé (Nikitin et al.,
 * "Reducing Metadata Leakage from Encrypted Files and Communication with PURBs", PoPETs 2019):
 * the ciphertext length then reveals O(log log n) bits about the plaintext length instead of
 * the exact size, for at most ≈12 % overhead.
 *
 * Frame (inside the ciphertext): 0x01 ‖ uint32 big-endian JSON length ‖ UTF-8 JSON ‖ zeros.
 */
import type { Id } from '../model.ts';
import { ENVELOPE_PREFIX, open, seal } from './aead.ts';
import { type Bytes, utf8Decode, utf8Encode, zeroize } from './bytes.ts';
import { type JsonValue, canonicalJson } from './canonical-json.ts';
import { CryptoError } from './errors.ts';

const FRAME_VERSION = 0x01;
const FRAME_HEADER_BYTES = 5;
const MAX_FRAME_LENGTH = 0xffff_ffff;

/** Cleartext metadata of a sync envelope, authenticated (not encrypted) with the payload. */
export interface PayloadContext {
  /** Space (workspace / sync room) the envelope belongs to. */
  spaceId: Id;
  /** Envelope id. */
  id: Id;
  /** Hybrid logical clock of the envelope, in whatever JSON form the sync module uses. */
  hlc: JsonValue;
  /** Originating replica / device id. */
  node: string;
}

export interface EncryptPayloadOptions {
  /** Pad with Padmé before encryption (default `true`). */
  pad?: boolean;
}

/** Serializes `payload` as JSON, pads it and encrypts it under `key` bound to `context`. */
export async function encryptPayload(
  key: CryptoKey,
  payload: unknown,
  context: PayloadContext,
  options: EncryptPayloadOptions = {},
): Promise<string> {
  const json = JSON.stringify(payload);
  if (json === undefined) {
    throw new CryptoError('invalid-argument', 'Payload is not JSON-serializable');
  }
  const body = utf8Encode(json);
  const minimal = FRAME_HEADER_BYTES + body.length;
  if (minimal > MAX_FRAME_LENGTH) throw new CryptoError('invalid-argument', 'Payload is too large');
  const frame = new Uint8Array(options.pad === false ? minimal : padme(minimal));
  const view = new DataView(frame.buffer);
  view.setUint8(0, FRAME_VERSION);
  view.setUint32(1, body.length, false);
  frame.set(body, FRAME_HEADER_BYTES);
  try {
    return await seal(ENVELOPE_PREFIX, key, frame, payloadAad(context));
  } finally {
    zeroize(body, frame);
  }
}

/**
 * Decrypts and parses a payload sealed by `encryptPayload`. Throws `decrypt-failed` when the
 * key or any context field differs, or when the ciphertext was modified.
 */
export async function decryptPayload<T = unknown>(
  key: CryptoKey,
  sealed: string,
  context: PayloadContext,
): Promise<T> {
  const frame = await open(ENVELOPE_PREFIX, key, sealed, payloadAad(context));
  try {
    return JSON.parse(utf8Decode(unframe(frame))) as T;
  } catch (cause) {
    if (cause instanceof CryptoError) throw cause;
    throw new CryptoError('malformed', 'Decrypted payload is not valid JSON', { cause });
  } finally {
    zeroize(frame);
  }
}

/** Associated data of a sync payload (exported for interoperability tests). */
export function payloadAad(context: PayloadContext): Bytes {
  if (typeof context.spaceId !== 'string' || context.spaceId.length === 0) {
    throw new CryptoError('invalid-argument', 'payload context: spaceId is required');
  }
  if (typeof context.id !== 'string' || context.id.length === 0) {
    throw new CryptoError('invalid-argument', 'payload context: id is required');
  }
  if (typeof context.node !== 'string' || context.node.length === 0) {
    throw new CryptoError('invalid-argument', 'payload context: node is required');
  }
  return utf8Encode(
    canonicalJson(['pouxis.sync-payload/v1', context.spaceId, context.id, context.hlc, context.node]),
  );
}

/**
 * Padmé padded length for an input of `length` bytes: keeps the top ⌊log₂ E⌋ + 1 bits of the
 * length (E = ⌊log₂ length⌋) and rounds the rest up.
 */
export function padme(length: number): number {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new CryptoError('invalid-argument', 'Length must be a non-negative integer');
  }
  if (length < 2) return length;
  const e = Math.floor(Math.log2(length));
  const s = Math.floor(Math.log2(e)) + 1;
  const lastBits = e - s;
  const step = 2 ** lastBits;
  return Math.ceil(length / step) * step;
}

function unframe(frame: Uint8Array): Uint8Array {
  if (frame.length < FRAME_HEADER_BYTES || frame[0] !== FRAME_VERSION) {
    throw new CryptoError('malformed', 'Unknown payload frame');
  }
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const length = view.getUint32(1, false);
  if (length > frame.length - FRAME_HEADER_BYTES) {
    throw new CryptoError('malformed', 'Payload frame length is out of range');
  }
  return frame.subarray(FRAME_HEADER_BYTES, FRAME_HEADER_BYTES + length);
}
