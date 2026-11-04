import { crypto as pxCrypto } from '@pouxis/core';
import type { sync } from '@pouxis/core';

/** Minimum passphrase length for the sync key (the core vault policy). */
export const MIN_SYNC_PASSPHRASE_LENGTH = pxCrypto.MIN_VAULT_PASSPHRASE_LENGTH;

const SALT_DOMAIN = 'pouxis/sync-key/v1\u0000';

/**
 * Derives the end-to-end encryption key of a sync space from the user's passphrase.
 *
 * Every device of the space must reach the same key without exchanging anything but the
 * passphrase, so the PBKDF2 salt is derived from the space id (a random UUID, so salts are
 * unique per space). The key is AES-256-GCM, usable for encrypt/decrypt only, and
 * non-extractable: it can be kept in IndexedDB as an opaque handle, never as raw bytes.
 */
export async function deriveSyncKey(
  passphrase: string,
  space: string,
  options: { iterations?: number } = {},
): Promise<CryptoKey> {
  pxCrypto.assertVaultPassphrasePolicy(passphrase);
  const iterations = Math.max(
    options.iterations ?? pxCrypto.PBKDF2_DEFAULT_ITERATIONS,
    pxCrypto.PBKDF2_MIN_ITERATIONS,
  );
  const subtle = globalThis.crypto.subtle;
  const salt = (await pxCrypto.sha256(pxCrypto.utf8Encode(SALT_DOMAIN + space))).slice(0, 16);
  const secret = pxCrypto.utf8Encode(pxCrypto.normalizePassphrase(passphrase));
  try {
    const base = await subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey']);
    return await subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      base,
      { name: 'AES-GCM', length: pxCrypto.AES_KEY_BITS },
      false,
      ['encrypt', 'decrypt'],
    );
  } finally {
    pxCrypto.zeroize(secret);
  }
}

/** Payload encryption hooks for `sync.createSyncClient`, bound to one space and key. */
export function payloadCipher(
  key: CryptoKey,
  space: string,
): {
  encrypt: (payload: string, header: sync.EnvelopeHeader) => Promise<string>;
  decrypt: (sealed: string, header: sync.EnvelopeHeader) => Promise<string>;
} {
  const context = (h: sync.EnvelopeHeader) => ({ spaceId: space, id: h.id, hlc: h.hlc, node: h.node });
  return {
    encrypt: (payload, header) => pxCrypto.encryptPayload(key, payload, context(header)),
    async decrypt(sealed, header) {
      const payload = await pxCrypto.decryptPayload<unknown>(key, sealed, context(header));
      if (typeof payload !== 'string') throw new Error('Decrypted payload is not a batch');
      return payload;
    },
  };
}
