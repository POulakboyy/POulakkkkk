import { beforeAll, describe, expect, it } from 'vitest';
import {
  ENVELOPE_PREFIX,
  WRAPPED_KEY_PREFIX,
  decrypt,
  decryptText,
  encrypt,
  generateVaultKey,
  isEnvelope,
  open,
  recordAad,
} from './aead.ts';
import { fromBase64Url, toBase64Url, utf8Decode, utf8Encode } from './bytes.ts';
import { subtle } from './runtime.ts';

const ENVELOPE_PATTERN = /^pxv1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/;
const context = { vaultId: 'vault-1', collection: 'notes', recordId: 'note-1' };

let key: CryptoKey;
let otherKey: CryptoKey;

beforeAll(async () => {
  key = await generateVaultKey();
  otherKey = await generateVaultKey();
});

/** Flips one bit of the base64url segment at `index` of an envelope. */
function flipBit(envelope: string, index: number, byte = 0): string {
  const parts = envelope.split('.');
  const bytes = fromBase64Url(parts[index] ?? '');
  bytes[byte] = (bytes[byte] ?? 0) ^ 0x01;
  parts[index] = toBase64Url(bytes);
  return parts.join('.');
}

async function failureCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

describe('generateVaultKey', () => {
  it('creates non-extractable AES-256-GCM keys by default', async () => {
    expect(key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
    expect(key.extractable).toBe(false);
    expect([...key.usages].sort()).toEqual(['decrypt', 'encrypt']);
    expect((await generateVaultKey({ extractable: true })).extractable).toBe(true);
  });
});

describe('encrypt / decrypt', () => {
  it('round-trips text and bytes inside a pxv1 envelope', async () => {
    const aad = recordAad(context);
    const envelope = await encrypt(key, 'Idée confidentielle 🔐', aad);
    expect(envelope).toMatch(ENVELOPE_PATTERN);
    expect(isEnvelope(envelope)).toBe(true);
    expect(await decryptText(key, envelope, aad)).toBe('Idée confidentielle 🔐');

    const bytes = new Uint8Array([0, 1, 2, 255]);
    expect(await decrypt(key, await encrypt(key, bytes, 'aad'), 'aad')).toEqual(bytes);
  });

  it('encrypts the empty message', async () => {
    const envelope = await encrypt(key, '', 'aad');
    expect(await decryptText(key, envelope, 'aad')).toBe('');
  });

  it('uses a fresh random IV for every message', async () => {
    const ivs = new Set<string>();
    for (let i = 0; i < 64; i++) ivs.add((await encrypt(key, 'same', 'aad')).split('.')[1] ?? '');
    expect(ivs.size).toBe(64);
  });

  it('produces ciphertext ‖ 128-bit tag, without the plaintext', async () => {
    const plaintext = utf8Encode('needle-in-plaintext');
    const envelope = await encrypt(key, plaintext, 'aad');
    const body = fromBase64Url(envelope.split('.')[2] ?? '');
    expect(body.length).toBe(plaintext.length + 16);
    expect(envelope).not.toContain(toBase64Url(plaintext).slice(0, 8));
  });

  it('fails with a uniform error on a wrong key, wrong AAD or tampered data', async () => {
    const aad = recordAad(context);
    const envelope = await encrypt(key, 'secret', aad);
    const attempts = [
      decrypt(otherKey, envelope, aad),
      decrypt(key, envelope, recordAad({ ...context, recordId: 'note-2' })),
      decrypt(key, envelope, recordAad({ ...context, collection: 'tasks' })),
      decrypt(key, envelope, recordAad({ ...context, vaultId: 'vault-2' })),
      decrypt(key, envelope, recordAad({ ...context, field: 'body' })),
      decrypt(key, flipBit(envelope, 1), aad),
      decrypt(key, flipBit(envelope, 2), aad),
      decrypt(
        key,
        flipBit(envelope, 2, fromBase64Url(envelope.split('.')[2] ?? '').length - 1),
        aad,
      ),
    ];
    for (const attempt of attempts) expect(await failureCode(attempt)).toBe('decrypt-failed');
  });

  it('authenticates the envelope prefix (no cross-format reinterpretation)', async () => {
    const envelope = await encrypt(key, 'secret', 'aad');
    const asWrappedKey = envelope.replace(`${ENVELOPE_PREFIX}.`, `${WRAPPED_KEY_PREFIX}.`);
    expect(await failureCode(open(WRAPPED_KEY_PREFIX, key, asWrappedKey, 'aad'))).toBe(
      'decrypt-failed',
    );
  });

  it('distinguishes malformed envelopes from unknown versions', async () => {
    const envelope = await encrypt(key, 'secret', 'aad');
    expect(await failureCode(decrypt(key, envelope.replace('pxv1', 'pxv9'), 'aad'))).toBe(
      'unsupported-version',
    );
    for (const bad of ['', 'pxv1', 'pxv1.AAAA.AAAA', `${envelope}.extra`, 'hello.world.x']) {
      expect(await failureCode(decrypt(key, bad, 'aad'))).toBe('malformed');
      expect(isEnvelope(bad)).toBe(false);
    }
    const truncated = `pxv1.${envelope.split('.')[1]}.${toBase64Url(new Uint8Array(15))}`;
    expect(await failureCode(decrypt(key, truncated, 'aad'))).toBe('malformed');
  });

  it('rejects keys of the wrong type or usage', async () => {
    const hmac = await subtle().generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    expect(await failureCode(encrypt(hmac, 'x', 'aad'))).toBe('invalid-argument');
    const aes128 = await subtle().generateKey({ name: 'AES-GCM', length: 128 }, false, [
      'encrypt',
      'decrypt',
    ]);
    expect(await failureCode(encrypt(aes128, 'x', 'aad'))).toBe('invalid-argument');
    const decryptOnly = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'decrypt',
    ]);
    expect(await failureCode(encrypt(decryptOnly, 'x', 'aad'))).toBe('invalid-argument');
  });
});

describe('recordAad', () => {
  it('is unambiguous across field boundaries', () => {
    const a = recordAad({ vaultId: 'v', collection: 'a', recordId: 'bc' });
    const b = recordAad({ vaultId: 'v', collection: 'ab', recordId: 'c' });
    expect(utf8Decode(a)).not.toBe(utf8Decode(b));
    expect(utf8Decode(a)).toBe('["pouxis.record/v1","v","a","bc",null]');
  });

  it('requires every location field', () => {
    expect(() => recordAad({ ...context, recordId: '' })).toThrow(
      expect.objectContaining({ code: 'invalid-argument' }),
    );
  });
});
