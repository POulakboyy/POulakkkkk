import { describe, expect, it } from 'vitest';
import { fromHex, toHex, utf8Encode } from './bytes.ts';
import {
  MAX_PASSPHRASE_LENGTH,
  PBKDF2_DEFAULT_ITERATIONS,
  PBKDF2_MAX_ITERATIONS,
  PBKDF2_MIN_ITERATIONS,
  SALT_BYTES,
  deriveKek,
  generateSalt,
  hkdfBits,
  normalizePassphrase,
  passphraseLength,
  pbkdf2Bits,
} from './kdf.ts';
import { subtle } from './runtime.ts';

const PBKDF2_TIMEOUT = 30_000;

async function failureCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

describe('parameters', () => {
  it('follows the OWASP PBKDF2-HMAC-SHA256 recommendation', () => {
    expect(PBKDF2_DEFAULT_ITERATIONS).toBe(600_000);
    expect(PBKDF2_MIN_ITERATIONS).toBe(600_000);
    expect(PBKDF2_MAX_ITERATIONS).toBeGreaterThan(PBKDF2_DEFAULT_ITERATIONS);
    expect(SALT_BYTES).toBe(16);
  });

  it('generates distinct 128-bit salts', () => {
    const a = generateSalt();
    expect(a.length).toBe(16);
    expect(toHex(a)).not.toBe(toHex(generateSalt()));
  });
});

describe('passphrase normalization', () => {
  it('maps NFD and NFC spellings to the same string', () => {
    const nfc = 'café crème';
    const nfd = nfc.normalize('NFD');
    expect(nfd).not.toBe(nfc);
    expect(normalizePassphrase(nfd)).toBe(normalizePassphrase(nfc));
  });

  it('counts code points, not UTF-16 units', () => {
    expect(passphraseLength('🔐🔐')).toBe(2);
  });

  it('rejects empty and oversized passphrases', () => {
    expect(() => normalizePassphrase('')).toThrow(/empty/);
    expect(() => normalizePassphrase('x'.repeat(MAX_PASSPHRASE_LENGTH + 1))).toThrow(/too long/);
    expect(() => normalizePassphrase(42 as unknown as string)).toThrow(/string/);
  });
});

describe('PBKDF2', () => {
  it(
    'equals raw PBKDF2-HMAC-SHA256 over the NFKC UTF-8 passphrase',
    async () => {
      const salt = fromHex('000102030405060708090a0b0c0d0e0f');
      const ours = await pbkdf2Bits('café', salt, PBKDF2_DEFAULT_ITERATIONS);
      const base = await subtle().importKey('raw', utf8Encode('café'), 'PBKDF2', false, [
        'deriveBits',
      ]);
      const reference = await subtle().deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_DEFAULT_ITERATIONS },
        base,
        256,
      );
      expect(toHex(ours)).toBe(toHex(new Uint8Array(reference)));
    },
    PBKDF2_TIMEOUT,
  );

  it(
    'derives a non-extractable wrap-only KEK',
    async () => {
      const kek = await deriveKek('correct horse battery staple', generateSalt());
      expect(kek.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
      expect(kek.extractable).toBe(false);
      expect([...kek.usages].sort()).toEqual(['unwrapKey', 'wrapKey']);
    },
    PBKDF2_TIMEOUT,
  );

  it('refuses weak or abusive parameters before doing any work', async () => {
    const salt = generateSalt();
    expect(await failureCode(deriveKek('pass', salt, { iterations: 100_000 }))).toBe(
      'invalid-argument',
    );
    expect(await failureCode(deriveKek('pass', salt, { iterations: 1e9 }))).toBe(
      'invalid-argument',
    );
    expect(await failureCode(deriveKek('pass', salt, { iterations: 600_000.5 }))).toBe(
      'invalid-argument',
    );
    expect(await failureCode(deriveKek('pass', new Uint8Array(8)))).toBe('invalid-argument');
    expect(await failureCode(deriveKek('', salt))).toBe('invalid-argument');
  });
});

describe('HKDF', () => {
  it('matches RFC 5869 test case 3 (empty salt and info)', async () => {
    const ikm = new Uint8Array(22).fill(0x0b);
    const okm = await hkdfBits(ikm, new Uint8Array(0), '');
    // First 32 bytes of the 42-byte OKM given by RFC 5869 §A.3.
    expect(toHex(okm)).toBe('8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d');
  });

  it('separates domains through info', async () => {
    const ikm = generateSalt();
    const a = await hkdfBits(ikm, new Uint8Array(0), 'a');
    const b = await hkdfBits(ikm, new Uint8Array(0), 'b');
    expect(toHex(a)).not.toBe(toHex(b));
  });
});
