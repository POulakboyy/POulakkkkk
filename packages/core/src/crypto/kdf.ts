/**
 * Key derivation.
 *
 * - Passphrases → PBKDF2-HMAC-SHA256 (RFC 8018 §5.2, NIST SP 800-132) with 600 000 iterations,
 *   the OWASP Password Storage Cheat Sheet recommendation for PBKDF2-HMAC-SHA256, and a random
 *   128-bit salt (SP 800-132 §5.1 requires at least 128 random bits). PBKDF2 is the only
 *   password KDF WebCrypto offers; the planned upgrade to Argon2id (RFC 9106) through a native
 *   Tauri command or a WASM build is described in docs/security/SECURITY_ARCHITECTURE.md —
 *   headers carry the KDF name and parameters so the migration needs no format break.
 * - High-entropy secrets (recovery keys, share-link secrets) → HKDF-SHA256 (RFC 5869):
 *   stretching adds nothing to 256 uniformly random bits.
 *
 * Passphrases are normalized to Unicode NFKC before UTF-8 encoding (NIST SP 800-63B-4
 * §3.1.1.2), so the same passphrase typed on macOS (often NFD) and Windows (NFC) derives the
 * same key.
 */
import { type Bytes, toBytes, utf8Encode, zeroize } from './bytes.ts';
import { AES_KEY_BITS } from './aead.ts';
import { CryptoError } from './errors.ts';
import { randomBytes, subtle } from './runtime.ts';

/** OWASP Password Storage Cheat Sheet: PBKDF2-HMAC-SHA256, 600 000 iterations. */
export const PBKDF2_DEFAULT_ITERATIONS = 600_000;
/**
 * Floor accepted when deriving: no v1 header was ever written below the OWASP figure, so a
 * lower count can only come from a tampered or forged header.
 */
export const PBKDF2_MIN_ITERATIONS = PBKDF2_DEFAULT_ITERATIONS;
/** Ceiling accepted when deriving: stops a forged header from freezing the client (DoS). */
export const PBKDF2_MAX_ITERATIONS = 10_000_000;
/** Salt length in bytes (128 bits, NIST SP 800-132 §5.1). */
export const SALT_BYTES = 16;
/** Longest passphrase accepted, in code points (generous; blocks pathological inputs). */
export const MAX_PASSPHRASE_LENGTH = 1024;

export function generateSalt(): Bytes {
  return randomBytes(SALT_BYTES);
}

/** NFKC normalization + basic validation. Never log or persist the result. */
export function normalizePassphrase(passphrase: string): string {
  if (typeof passphrase !== 'string') {
    throw new CryptoError('invalid-argument', 'Passphrase must be a string');
  }
  const normalized = passphrase.normalize('NFKC');
  const length = [...normalized].length;
  if (length === 0) throw new CryptoError('invalid-argument', 'Passphrase must not be empty');
  if (length > MAX_PASSPHRASE_LENGTH) {
    throw new CryptoError('invalid-argument', 'Passphrase is too long');
  }
  return normalized;
}

/** Length in Unicode code points after NFKC normalization (what policies should count). */
export function passphraseLength(passphrase: string): number {
  return [...passphrase.normalize('NFKC')].length;
}

export function assertIterations(iterations: number): void {
  if (
    !Number.isSafeInteger(iterations) ||
    iterations < PBKDF2_MIN_ITERATIONS ||
    iterations > PBKDF2_MAX_ITERATIONS
  ) {
    throw new CryptoError(
      'invalid-argument',
      `PBKDF2 iterations must be an integer in [${PBKDF2_MIN_ITERATIONS}, ${PBKDF2_MAX_ITERATIONS}]`,
    );
  }
}

function assertSalt(salt: Uint8Array): void {
  if (!(salt instanceof Uint8Array) || salt.length < SALT_BYTES) {
    throw new CryptoError('invalid-argument', `Salt must be at least ${SALT_BYTES} bytes`);
  }
}

async function importPassphrase(passphrase: string): Promise<CryptoKey> {
  const secret = utf8Encode(normalizePassphrase(passphrase));
  try {
    return await subtle().importKey('raw', secret, 'PBKDF2', false, ['deriveKey', 'deriveBits']);
  } finally {
    zeroize(secret);
  }
}

/**
 * Derives a key-encryption key (KEK) from a passphrase. The KEK can only wrap and unwrap keys
 * (AES-256-GCM key wrapping), never encrypt data directly, and is never extractable.
 */
export async function deriveKek(
  passphrase: string,
  salt: Uint8Array,
  options: { iterations?: number } = {},
): Promise<CryptoKey> {
  const iterations = options.iterations ?? PBKDF2_DEFAULT_ITERATIONS;
  assertIterations(iterations);
  assertSalt(salt);
  const base = await importPassphrase(passphrase);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toBytes(salt), iterations },
    base,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

/** Raw PBKDF2-HMAC-SHA256 output (256 bits). The caller must zeroize the result. */
export async function pbkdf2Bits(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Bytes> {
  assertIterations(iterations);
  assertSalt(salt);
  const base = await importPassphrase(passphrase);
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toBytes(salt), iterations },
    base,
    256,
  );
  return new Uint8Array(bits);
}

async function importHkdf(ikm: Uint8Array): Promise<CryptoKey> {
  const material = toBytes(ikm);
  try {
    return await subtle().importKey('raw', material, 'HKDF', false, ['deriveKey', 'deriveBits']);
  } finally {
    zeroize(material);
  }
}

/** HKDF-SHA256 (RFC 5869) → 256 raw bits. The caller must zeroize the result. */
export async function hkdfBits(ikm: Uint8Array, salt: Uint8Array, info: string): Promise<Bytes> {
  const base = await importHkdf(ikm);
  const bits = await subtle().deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: toBytes(salt), info: utf8Encode(info) },
    base,
    256,
  );
  return new Uint8Array(bits);
}

/** HKDF-SHA256 (RFC 5869) → non-extractable AES-256-GCM key with the given usages. */
export async function hkdfAesKey(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: string,
  usages: readonly KeyUsage[],
): Promise<CryptoKey> {
  const base = await importHkdf(ikm);
  return subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: toBytes(salt), info: utf8Encode(info) },
    base,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    false,
    [...usages],
  );
}
