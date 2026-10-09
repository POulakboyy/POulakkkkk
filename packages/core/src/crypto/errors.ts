/**
 * Error type shared by every crypto primitive.
 *
 * Messages are deliberately generic for authentication failures (`decrypt-failed`,
 * `unlock-failed`): callers must not be able to tell a wrong key from a wrong context or a
 * tampered ciphertext, and UIs should not echo low-level details to end users.
 */
export type CryptoErrorCode =
  /** WebCrypto is missing (non-secure browser context or very old runtime). */
  | 'unavailable'
  /** A caller-supplied argument violates the API contract (bad length, policy, type…). */
  | 'invalid-argument'
  /** A serialized envelope, token, header or key cannot be parsed. */
  | 'malformed'
  /** A serialized object uses a format version this build does not understand. */
  | 'unsupported-version'
  /** AEAD authentication failed: wrong key, wrong associated data or tampered data. */
  | 'decrypt-failed'
  /** A vault could not be unlocked: wrong passphrase or recovery key, or a tampered header. */
  | 'unlock-failed'
  /** A printable recovery key has a bad format or checksum (typo). */
  | 'invalid-recovery-key'
  /** The share link is password-protected and no password was supplied. */
  | 'password-required';

export class CryptoError extends Error {
  readonly code: CryptoErrorCode;

  constructor(code: CryptoErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CryptoError';
    this.code = code;
  }
}

/** Narrowing helper for `catch` blocks. */
export function isCryptoError(error: unknown, code?: CryptoErrorCode): error is CryptoError {
  return error instanceof CryptoError && (code === undefined || error.code === code);
}
