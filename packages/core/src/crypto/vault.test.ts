import { beforeAll, describe, expect, it } from 'vitest';
import { decryptText, encrypt, recordAad } from './aead.ts';
import { PBKDF2_DEFAULT_ITERATIONS } from './kdf.ts';
import {
  MIN_VAULT_PASSPHRASE_LENGTH,
  type CreatedVault,
  type VaultHeader,
  changeVaultPassphrase,
  createVault,
  parseVaultHeader,
  removeRecoveryKey,
  rotateRecoveryKey,
  unlockVault,
  upgradeVaultKdf,
  vaultNeedsUpgrade,
} from './vault.ts';

// Every unlock runs PBKDF2 with 600 000 iterations.
const SLOW = 60_000;
const PASSPHRASE = 'correct horse battery staple';
const NEW_PASSPHRASE = 'another long passphrase for tests';
const AAD = recordAad({ vaultId: 'vault-1', collection: 'notes', recordId: 'note-1' });

async function failureCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let vault: CreatedVault;
let sealed: string;

beforeAll(async () => {
  vault = await createVault({ vaultId: 'vault-1', passphrase: PASSPHRASE });
  sealed = await encrypt(vault.key, 'secret note', AAD);
}, SLOW);

describe('createVault', () => {
  it('returns a public header, a non-extractable key and a recovery key', () => {
    expect(vault.key.extractable).toBe(false);
    expect(vault.recoveryKey).toMatch(/^([0-9A-Z]{7}-){7}[0-9A-Z]{7}$/);
    expect(vault.header).toMatchObject({
      v: 1,
      vaultId: 'vault-1',
      cipher: 'AES-256-GCM',
      passphrase: { kdf: { alg: 'PBKDF2-HMAC-SHA256', iterations: PBKDF2_DEFAULT_ITERATIONS } },
      recovery: { kdf: { alg: 'HKDF-SHA256' } },
    });
    const serialized = JSON.stringify(vault.header);
    expect(serialized).not.toContain(PASSPHRASE);
    expect(serialized).not.toContain(vault.recoveryKey);
  });

  it('enforces the passphrase length policy', async () => {
    const short = 'x'.repeat(MIN_VAULT_PASSPHRASE_LENGTH - 1);
    expect(await failureCode(createVault({ vaultId: 'v', passphrase: short }))).toBe(
      'invalid-argument',
    );
  });

  it('refuses a KDF cost below the OWASP floor', async () => {
    expect(
      await failureCode(createVault({ vaultId: 'v', passphrase: PASSPHRASE, iterations: 1000 })),
    ).toBe('invalid-argument');
  });

  it(
    'can skip the recovery slot',
    async () => {
      const bare = await createVault({
        vaultId: 'vault-2',
        passphrase: PASSPHRASE,
        withRecoveryKey: false,
      });
      expect(bare.header.recovery).toBeUndefined();
      expect(bare.recoveryKey).toBeUndefined();
      expect(await failureCode(unlockVault(bare.header, { recoveryKey: 'x' }))).toBe(
        'unlock-failed',
      );
    },
    SLOW,
  );
});

describe('unlockVault', () => {
  it(
    'opens with the passphrase or the recovery key',
    async () => {
      const byPassphrase = await unlockVault(vault.header, { passphrase: PASSPHRASE });
      const byRecovery = await unlockVault(vault.header, {
        recoveryKey: (vault.recoveryKey ?? '').toLowerCase(),
      });
      expect(await decryptText(byPassphrase, sealed, AAD)).toBe('secret note');
      expect(await decryptText(byRecovery, sealed, AAD)).toBe('secret note');
      expect(byPassphrase.extractable).toBe(false);
    },
    SLOW,
  );

  it(
    'fails uniformly on a wrong passphrase',
    async () => {
      expect(await failureCode(unlockVault(vault.header, { passphrase: `${PASSPHRASE}!` }))).toBe(
        'unlock-failed',
      );
    },
    SLOW,
  );

  it(
    'detects a header whose slot parameters were swapped',
    async () => {
      const other = await createVault({ vaultId: 'vault-3', passphrase: PASSPHRASE });
      const forged = clone(vault.header);
      // A relay replaying another vault's wrapped key under this vault id must fail.
      forged.passphrase.wrappedKey = other.header.passphrase.wrappedKey;
      forged.passphrase.kdf.salt = other.header.passphrase.kdf.salt;
      expect(await failureCode(unlockVault(forged, { passphrase: PASSPHRASE }))).toBe(
        'unlock-failed',
      );
    },
    SLOW,
  );
});

describe('passphrase and recovery management', () => {
  it(
    'changes the passphrase without re-encrypting data',
    async () => {
      const header = await changeVaultPassphrase(
        vault.header,
        { passphrase: PASSPHRASE },
        NEW_PASSPHRASE,
      );
      expect(header.recovery).toEqual(vault.header.recovery);
      const key = await unlockVault(header, { passphrase: NEW_PASSPHRASE });
      expect(await decryptText(key, sealed, AAD)).toBe('secret note');
      expect(await failureCode(unlockVault(header, { passphrase: PASSPHRASE }))).toBe(
        'unlock-failed',
      );
    },
    SLOW,
  );

  it(
    'resets a forgotten passphrase with the recovery key',
    async () => {
      const header = await changeVaultPassphrase(
        vault.header,
        { recoveryKey: vault.recoveryKey ?? '' },
        NEW_PASSPHRASE,
      );
      const key = await unlockVault(header, { passphrase: NEW_PASSPHRASE });
      expect(await decryptText(key, sealed, AAD)).toBe('secret note');
    },
    SLOW,
  );

  it(
    'rotates and removes the recovery key',
    async () => {
      const rotated = await rotateRecoveryKey(vault.header, { passphrase: PASSPHRASE });
      expect(rotated.recoveryKey).not.toBe(vault.recoveryKey);
      expect(
        await failureCode(unlockVault(rotated.header, { recoveryKey: vault.recoveryKey ?? '' })),
      ).toBe('unlock-failed');
      const key = await unlockVault(rotated.header, { recoveryKey: rotated.recoveryKey });
      expect(await decryptText(key, sealed, AAD)).toBe('secret note');

      const removed = await removeRecoveryKey(rotated.header, { passphrase: PASSPHRASE });
      expect(removed.recovery).toBeUndefined();
    },
    SLOW,
  );

  it(
    'upgrades the KDF cost of an older header',
    async () => {
      expect(vaultNeedsUpgrade(vault.header)).toBe(false);
      const upgraded = await upgradeVaultKdf(vault.header, PASSPHRASE, {
        iterations: PBKDF2_DEFAULT_ITERATIONS + 1,
      });
      expect(upgraded.passphrase.kdf.iterations).toBe(PBKDF2_DEFAULT_ITERATIONS + 1);
      expect(upgraded.passphrase.kdf.salt).not.toBe(vault.header.passphrase.kdf.salt);
      const key = await unlockVault(upgraded, { passphrase: PASSPHRASE });
      expect(await decryptText(key, sealed, AAD)).toBe('secret note');
    },
    SLOW,
  );
});

describe('parseVaultHeader', () => {
  it('returns a clean copy without unknown fields', () => {
    const parsed = parseVaultHeader({ ...clone(vault.header), extra: 'dropped' });
    expect(parsed).toEqual(vault.header);
    expect('extra' in parsed).toBe(false);
  });

  it('rejects forged KDF parameters before any derivation', () => {
    const weak: VaultHeader = clone(vault.header);
    weak.passphrase.kdf.iterations = 1;
    expect(() => parseVaultHeader(weak)).toThrow(/iterations/);
    const abusive: VaultHeader = clone(vault.header);
    abusive.passphrase.kdf.iterations = 1e12;
    expect(() => parseVaultHeader(abusive)).toThrow(/iterations/);
  });

  it('distinguishes unknown versions from malformed input', () => {
    const future = { ...clone(vault.header), v: 2 };
    expect(() => parseVaultHeader(future)).toThrow(
      expect.objectContaining({ code: 'unsupported-version' }),
    );
    expect(() => parseVaultHeader(null)).toThrow(expect.objectContaining({ code: 'malformed' }));
    const badSalt = clone(vault.header);
    badSalt.passphrase.kdf.salt = 'AAAA';
    expect(() => parseVaultHeader(badSalt)).toThrow();
  });
});
