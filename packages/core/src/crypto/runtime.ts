/**
 * Access to the platform WebCrypto implementation (`globalThis.crypto`), available in browsers
 * (secure contexts only), Tauri webviews and Node ≥ 20. Fails closed: there is no fallback to a
 * non-cryptographic random source or to a JavaScript cipher implementation.
 */
import type { Bytes } from './bytes.ts';
import { CryptoError } from './errors.ts';

function webCrypto(): Crypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c || typeof c.getRandomValues !== 'function' || !c.subtle) {
    throw new CryptoError(
      'unavailable',
      'WebCrypto is unavailable: a secure context (https, tauri://, localhost) is required',
    );
  }
  return c;
}

export function subtle(): SubtleCrypto {
  return webCrypto().subtle;
}

/** `getRandomValues` throws a QuotaExceededError above 65 536 bytes (W3C Web Cryptography API). */
const MAX_RANDOM_CHUNK = 65_536;

/** Cryptographically secure random bytes from the platform CSPRNG. */
export function randomBytes(length: number): Bytes {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new CryptoError('invalid-argument', 'Random length must be a non-negative integer');
  }
  const c = webCrypto();
  const out = new Uint8Array(length);
  for (let offset = 0; offset < length; offset += MAX_RANDOM_CHUNK) {
    c.getRandomValues(out.subarray(offset, Math.min(length, offset + MAX_RANDOM_CHUNK)));
  }
  return out;
}

export async function sha256(data: Uint8Array): Promise<Bytes> {
  return new Uint8Array(await subtle().digest('SHA-256', new Uint8Array(data)));
}
