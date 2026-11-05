/**
 * Byte-level helpers: strict encodings, constant-time comparison and zeroization.
 *
 * Everything here is synchronous, allocation-light and free of platform APIs except the
 * Encoding Standard (`TextEncoder` / `TextDecoder`), which every supported runtime provides.
 */
import { CryptoError } from './errors.ts';

/** A byte array backed by a plain `ArrayBuffer`, as WebCrypto requires. */
export type Bytes = Uint8Array<ArrayBuffer>;

/** Anything that can be encrypted or authenticated: UTF-8 text or raw bytes. */
export type BinaryLike = string | Uint8Array;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

export function utf8Encode(text: string): Bytes {
  return encoder.encode(text);
}

/** Strict UTF-8 decoding: invalid sequences throw instead of becoming U+FFFD. */
export function utf8Decode(bytes: Uint8Array): string {
  try {
    return decoder.decode(bytes);
  } catch (cause) {
    throw new CryptoError('malformed', 'Invalid UTF-8 data', { cause });
  }
}

/**
 * Copies the input into a fresh `ArrayBuffer`-backed array. Copying lets helpers zeroize their
 * working copy without touching caller-owned memory.
 */
export function toBytes(input: BinaryLike): Bytes {
  return typeof input === 'string' ? utf8Encode(input) : new Uint8Array(input);
}

export function concatBytes(...parts: readonly Uint8Array[]): Bytes {
  let length = 0;
  for (const part of parts) length += part.length;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Compares two byte arrays in time independent of their contents (best effort: JavaScript
 * engines give no hard guarantee, but the loop has no data-dependent branch or early exit).
 * Lengths are treated as public. Prefer `SubtleCrypto.verify` for MAC checks.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/**
 * Overwrites secret buffers with zeros. JavaScript cannot guarantee that no other copy exists
 * (GC moves, engine internals), so this narrows the exposure window rather than closing it.
 */
export function zeroize(...buffers: readonly (Uint8Array | undefined)[]): void {
  for (const buffer of buffers) buffer?.fill(0);
}

/* ------------------------------------------------------------------------------------------ */
/* Base64url (RFC 4648 §5), unpadded and canonical                                            */
/* ------------------------------------------------------------------------------------------ */

const B64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64URL_DECODE = buildDecodeTable(B64URL_ALPHABET);

function buildDecodeTable(alphabet: string): Int8Array {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i;
  return table;
}

export function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out +=
      B64URL_ALPHABET.charAt((n >>> 18) & 63) +
      B64URL_ALPHABET.charAt((n >>> 12) & 63) +
      B64URL_ALPHABET.charAt((n >>> 6) & 63) +
      B64URL_ALPHABET.charAt(n & 63);
  }
  const rest = bytes.length - i;
  if (rest > 0) {
    const n = ((bytes[i] ?? 0) << 16) | (rest === 2 ? (bytes[i + 1] ?? 0) << 8 : 0);
    out += B64URL_ALPHABET.charAt((n >>> 18) & 63) + B64URL_ALPHABET.charAt((n >>> 12) & 63);
    if (rest === 2) out += B64URL_ALPHABET.charAt((n >>> 6) & 63);
  }
  return out;
}

/**
 * Strict base64url decoding: rejects padding, whitespace, characters outside the URL-safe
 * alphabet and non-canonical encodings (non-zero trailing bits), so every byte string has
 * exactly one accepted textual form — tokens and envelopes are therefore not malleable.
 */
export function fromBase64Url(text: string): Bytes {
  if (text.length % 4 === 1) throw new CryptoError('malformed', 'Invalid base64url length');
  const out = new Uint8Array(Math.floor((text.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let offset = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const value = code < 128 ? (B64URL_DECODE[code] ?? -1) : -1;
    if (value < 0) throw new CryptoError('malformed', 'Invalid base64url character');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[offset++] = (buffer >>> bits) & 0xff;
      buffer &= (1 << bits) - 1;
    }
  }
  if (buffer !== 0) throw new CryptoError('malformed', 'Non-canonical base64url encoding');
  return out;
}

/** Decodes base64url and checks the exact decoded length. */
export function fromBase64UrlExact(text: string, length: number, what: string): Bytes {
  const bytes = fromBase64Url(text);
  if (bytes.length !== length) {
    throw new CryptoError('malformed', `${what} must be ${length} bytes`);
  }
  return bytes;
}

/* ------------------------------------------------------------------------------------------ */
/* Hex (lowercase)                                                                             */
/* ------------------------------------------------------------------------------------------ */

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

export function fromHex(text: string): Bytes {
  if (text.length % 2 !== 0 || !/^[0-9a-f]*$/.test(text)) {
    throw new CryptoError('malformed', 'Invalid lowercase hex string');
  }
  const out = new Uint8Array(text.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
  return out;
}
