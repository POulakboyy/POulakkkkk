/**
 * Authenticated encryption with AES-256-GCM (FIPS 197 + NIST SP 800-38D) behind a versioned,
 * self-describing text envelope:
 *
 *     pxv1.<base64url IV (12 bytes)>.<base64url ciphertext ‖ 128-bit tag>
 *
 * - The IV is 96 random bits from the platform CSPRNG for every message (SP 800-38D §8.2.2).
 *   §8.3 caps random-IV usage at 2^32 invocations per key; POuxis keys stay orders of
 *   magnitude below that (see docs/security/SECURITY_ARCHITECTURE.md).
 * - The envelope prefix is itself authenticated: the GCM associated data is
 *   `prefix ‖ 0x00 ‖ caller AAD`, so a `pxv1` ciphertext can never be reinterpreted under
 *   another format version or as a wrapped key (`pxk1`).
 * - Callers bind every ciphertext to where it lives (vault, collection, record, field) through
 *   the AAD, so ciphertexts cannot be swapped between records: use `recordAad`.
 */
import type { Id } from '../model.ts';
import {
  type BinaryLike,
  type Bytes,
  concatBytes,
  fromBase64Url,
  fromBase64UrlExact,
  toBase64Url,
  toBytes,
  utf8Decode,
  utf8Encode,
  zeroize,
} from './bytes.ts';
import { canonicalJson } from './canonical-json.ts';
import { CryptoError } from './errors.ts';
import { randomBytes, subtle } from './runtime.ts';

/** Current data envelope prefix: AES-256-GCM, 96-bit random IV, 128-bit tag. */
export const ENVELOPE_PREFIX = 'pxv1';
/** Prefix of a vault key wrapped by a key-encryption key (see `vault.ts`). */
export const WRAPPED_KEY_PREFIX = 'pxk1';

export const AES_KEY_BITS = 256;
export const GCM_IV_BYTES = 12;
export const GCM_TAG_BYTES = 16;

const AES_GCM = 'AES-GCM';

/**
 * Generates a fresh AES-256-GCM data key. Non-extractable by default: the raw key never leaves
 * the WebCrypto implementation. Pass `extractable: true` only when the key must be wrapped
 * (`wrapVaultKey`) — `createVault` handles that for you.
 */
export async function generateVaultKey(options: { extractable?: boolean } = {}): Promise<CryptoKey> {
  return subtle().generateKey({ name: AES_GCM, length: AES_KEY_BITS }, options.extractable ?? false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Encrypts `plaintext` and returns a `pxv1.…` envelope bound to `aad`. */
export async function encrypt(key: CryptoKey, plaintext: BinaryLike, aad: BinaryLike): Promise<string> {
  return seal(ENVELOPE_PREFIX, key, plaintext, aad);
}

/**
 * Decrypts a `pxv1.…` envelope. Throws `CryptoError('decrypt-failed')` — without saying why — when
 * the key, the AAD or any byte of the envelope is wrong.
 */
export async function decrypt(key: CryptoKey, envelope: string, aad: BinaryLike): Promise<Bytes> {
  return open(ENVELOPE_PREFIX, key, envelope, aad);
}

/** `decrypt` + strict UTF-8 decoding. */
export async function decryptText(key: CryptoKey, envelope: string, aad: BinaryLike): Promise<string> {
  const bytes = await decrypt(key, envelope, aad);
  try {
    return utf8Decode(bytes);
  } finally {
    zeroize(bytes);
  }
}

/** True when `value` looks like an envelope this build can open (cheap syntactic check). */
export function isEnvelope(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    parseEnvelope(ENVELOPE_PREFIX, value);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Associated data                                                                             */
/* ------------------------------------------------------------------------------------------ */

/** Where an encrypted value lives. Every field is bound into the AAD. */
export interface RecordContext {
  /** Vault (or space) whose key encrypts the value. */
  vaultId: Id;
  /** Collection name, e.g. `notes`. */
  collection: string;
  recordId: Id;
  /** Field inside the record when fields are encrypted individually, e.g. `body`. */
  field?: string;
}

/**
 * Unambiguous AAD for a record (canonical JSON array, so `("a","bc")` and `("ab","c")` never
 * collide). Decrypting with any other context fails, which defeats ciphertext swapping and
 * cut-and-paste between records, fields, collections or vaults.
 */
export function recordAad(context: RecordContext): Bytes {
  for (const [name, value] of [
    ['vaultId', context.vaultId],
    ['collection', context.collection],
    ['recordId', context.recordId],
  ] as const) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new CryptoError('invalid-argument', `recordAad: ${name} must be a non-empty string`);
    }
  }
  return utf8Encode(
    canonicalJson([
      'pouxis.record/v1',
      context.vaultId,
      context.collection,
      context.recordId,
      context.field ?? null,
    ]),
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Internals shared with vault.ts, share.ts and payload.ts                                     */
/* ------------------------------------------------------------------------------------------ */

export function assertAesGcmKey(key: CryptoKey, usage: KeyUsage): void {
  const algorithm = key.algorithm as Partial<AesKeyAlgorithm>;
  if (algorithm.name !== AES_GCM || algorithm.length !== AES_KEY_BITS) {
    throw new CryptoError('invalid-argument', 'Expected an AES-256-GCM key');
  }
  if (!key.usages.includes(usage)) {
    throw new CryptoError('invalid-argument', `Key is not allowed to ${usage}`);
  }
}

/** GCM associated data: authenticated envelope prefix, NUL separator, caller AAD. */
export function envelopeAad(prefix: string, aad: BinaryLike): Bytes {
  return concatBytes(utf8Encode(prefix), new Uint8Array([0]), toBytes(aad));
}

export interface ParsedEnvelope {
  iv: Bytes;
  body: Bytes;
}

export function parseEnvelope(prefix: string, envelope: string): ParsedEnvelope {
  if (typeof envelope !== 'string') throw new CryptoError('malformed', 'Envelope must be a string');
  const parts = envelope.split('.');
  const head = parts[0] ?? '';
  if (head !== prefix) {
    if (/^px[a-z]\d+$/.test(head)) {
      throw new CryptoError('unsupported-version', `Unsupported envelope version "${head}"`);
    }
    throw new CryptoError('malformed', 'Not a POuxis envelope');
  }
  if (parts.length !== 3) throw new CryptoError('malformed', 'Envelope must have three parts');
  const iv = fromBase64UrlExact(parts[1] ?? '', GCM_IV_BYTES, 'IV');
  const body = fromBase64Url(parts[2] ?? '');
  if (body.length < GCM_TAG_BYTES) throw new CryptoError('malformed', 'Ciphertext is truncated');
  return { iv, body };
}

export async function seal(
  prefix: string,
  key: CryptoKey,
  plaintext: BinaryLike,
  aad: BinaryLike,
): Promise<string> {
  assertAesGcmKey(key, 'encrypt');
  const iv = randomBytes(GCM_IV_BYTES);
  const data = toBytes(plaintext);
  try {
    const body = await subtle().encrypt(
      { name: AES_GCM, iv, additionalData: envelopeAad(prefix, aad), tagLength: GCM_TAG_BYTES * 8 },
      key,
      data,
    );
    return `${prefix}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(body))}`;
  } finally {
    zeroize(data);
  }
}

export async function open(
  prefix: string,
  key: CryptoKey,
  envelope: string,
  aad: BinaryLike,
): Promise<Bytes> {
  assertAesGcmKey(key, 'decrypt');
  const { iv, body } = parseEnvelope(prefix, envelope);
  try {
    const plaintext = await subtle().decrypt(
      { name: AES_GCM, iv, additionalData: envelopeAad(prefix, aad), tagLength: GCM_TAG_BYTES * 8 },
      key,
      body,
    );
    return new Uint8Array(plaintext);
  } catch (cause) {
    throw new CryptoError(
      'decrypt-failed',
      'Decryption failed: wrong key, wrong context or tampered data',
      { cause },
    );
  }
}
