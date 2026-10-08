/**
 * End-to-end encrypted vaults (feature 3.5).
 *
 * Key hierarchy (see docs/security/SECURITY_ARCHITECTURE.md):
 *
 *     passphrase ──PBKDF2──▶ KEK₁ ─┐
 *                                  ├─ wrap (AES-256-GCM) ─▶ vault key (AES-256-GCM) ─▶ records
 *     recovery key ──HKDF──▶ KEK₂ ─┘
 *
 * The vault key is random and never derived from the passphrase, so changing the passphrase
 * only re-wraps 32 bytes — no data is re-encrypted. Each wrapped copy lives in a "slot" of the
 * `VaultHeader`, a public, syncable JSON document: it contains salts, KDF parameters and
 * wrapped keys only. The server stores it but can neither unwrap it nor substitute a key it
 * knows (unwrapping is authenticated, and slot parameters are bound as associated data).
 *
 * The unlocked vault key is a non-extractable `CryptoKey`: script running in the page can use
 * it while the vault is open but cannot read its bytes. Close a vault by dropping the reference.
 */
import type { Id } from '../model.ts';
import {
  AES_KEY_BITS,
  GCM_IV_BYTES,
  GCM_TAG_BYTES,
  WRAPPED_KEY_PREFIX,
  assertAesGcmKey,
  envelopeAad,
  generateVaultKey,
  parseEnvelope,
} from './aead.ts';
import {
  type BinaryLike,
  fromBase64UrlExact,
  toBase64Url,
  utf8Encode,
  zeroize,
} from './bytes.ts';
import { canonicalJson } from './canonical-json.ts';
import { CryptoError } from './errors.ts';
import {
  PBKDF2_DEFAULT_ITERATIONS,
  PBKDF2_MAX_ITERATIONS,
  PBKDF2_MIN_ITERATIONS,
  SALT_BYTES,
  deriveKek,
  generateSalt,
  hkdfAesKey,
  normalizePassphrase,
  passphraseLength,
} from './kdf.ts';
import { generateRecoveryKey, parseRecoveryKey } from './recovery.ts';
import { randomBytes, subtle } from './runtime.ts';

/**
 * Minimum vault passphrase length in code points. A vault passphrase is the single factor
 * protecting data an attacker can copy and brute-force offline; NIST SP 800-63B-4 §3.1.1.2
 * requires 15 characters for passwords used as a single factor.
 */
export const MIN_VAULT_PASSPHRASE_LENGTH = 15;

export const VAULT_HEADER_VERSION = 1;
const VAULT_CIPHER = 'AES-256-GCM';
const MAX_ID_LENGTH = 256;

export interface PassphraseKdf {
  alg: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  /** base64url, 16 bytes. */
  salt: string;
}

export interface RecoveryKdf {
  alg: 'HKDF-SHA256';
  /** base64url, 16 bytes. */
  salt: string;
}

export interface PassphraseSlot {
  kdf: PassphraseKdf;
  /** `pxk1.…` — the vault key wrapped by the passphrase KEK. */
  wrappedKey: string;
}

export interface RecoverySlot {
  kdf: RecoveryKdf;
  /** `pxk1.…` — the vault key wrapped by the recovery KEK. */
  wrappedKey: string;
}

/** Public, syncable description of a vault. Contains no secret. */
export interface VaultHeader {
  v: 1;
  vaultId: Id;
  cipher: 'AES-256-GCM';
  passphrase: PassphraseSlot;
  recovery?: RecoverySlot;
}

export type VaultCredential = { passphrase: string } | { recoveryKey: string };

export interface CreateVaultOptions {
  vaultId: Id;
  passphrase: string;
  /** Add a printable recovery key slot (default `true`; strongly recommended). */
  withRecoveryKey?: boolean;
  /** PBKDF2 iterations (default and minimum: 600 000). */
  iterations?: number;
}

export interface CreatedVault {
  header: VaultHeader;
  /** Non-extractable vault key, ready to encrypt and decrypt. */
  key: CryptoKey;
  /** Printable recovery key: show it once, never store it. Absent if disabled. */
  recoveryKey?: string;
}

/* ------------------------------------------------------------------------------------------ */
/* Public API                                                                                  */
/* ------------------------------------------------------------------------------------------ */

export async function createVault(options: CreateVaultOptions): Promise<CreatedVault> {
  assertId(options.vaultId, 'vaultId');
  assertVaultPassphrasePolicy(options.passphrase);
  const vaultId = options.vaultId;
  const vaultKey = await generateVaultKey({ extractable: true });

  const { slot: passphrase, kek } = await makePassphraseSlot(
    vaultId,
    vaultKey,
    options.passphrase,
    options.iterations ?? PBKDF2_DEFAULT_ITERATIONS,
  );
  const header: VaultHeader = { v: 1, vaultId, cipher: VAULT_CIPHER, passphrase };
  let recoveryKey: string | undefined;
  if (options.withRecoveryKey ?? true) {
    const made = await makeRecoverySlot(vaultId, vaultKey);
    header.recovery = made.slot;
    recoveryKey = made.text;
  }
  // Hand back a non-extractable handle: re-unwrap with the KEK already derived (no extra PBKDF2).
  const key = await unwrapVaultKey(passphrase.wrappedKey, kek, slotAad(vaultId, passphrase.kdf));
  return recoveryKey === undefined ? { header, key } : { header, key, recoveryKey };
}

/**
 * Unlocks a vault with its passphrase or its recovery key. Throws `unlock-failed` on a wrong
 * credential (or a tampered header) without saying which.
 */
export async function unlockVault(
  header: VaultHeader,
  credential: VaultCredential,
  options: { extractable?: boolean } = {},
): Promise<CryptoKey> {
  const valid = parseVaultHeader(header);
  let kek: CryptoKey;
  let slot: PassphraseSlot | RecoverySlot;
  if ('passphrase' in credential) {
    slot = valid.passphrase;
    kek = await deriveKek(credential.passphrase, decodeSalt(slot.kdf.salt), {
      iterations: valid.passphrase.kdf.iterations,
    });
  } else if ('recoveryKey' in credential) {
    if (!valid.recovery) throw new CryptoError('unlock-failed', 'This vault has no recovery key');
    slot = valid.recovery;
    const secret = await parseRecoveryKey(credential.recoveryKey);
    try {
      kek = await recoveryKek(valid.vaultId, secret, decodeSalt(slot.kdf.salt));
    } finally {
      zeroize(secret);
    }
  } else {
    throw new CryptoError('invalid-argument', 'Unknown vault credential');
  }
  try {
    return await unwrapVaultKey(slot.wrappedKey, kek, slotAad(valid.vaultId, slot.kdf), options);
  } catch (cause) {
    throw new CryptoError('unlock-failed', 'Unable to unlock the vault', { cause });
  }
}

/**
 * Replaces the passphrase slot. Works with the current passphrase or with the recovery key
 * (the "forgot my passphrase" path). Data is not re-encrypted; the recovery slot is kept.
 */
export async function changeVaultPassphrase(
  header: VaultHeader,
  credential: VaultCredential,
  newPassphrase: string,
  options: { iterations?: number } = {},
): Promise<VaultHeader> {
  assertVaultPassphrasePolicy(newPassphrase);
  return rewrapPassphrase(header, credential, newPassphrase, options.iterations);
}

/**
 * Re-wraps the vault key under the same passphrase with fresh salt and the current default
 * cost. Call it after a successful unlock when `vaultNeedsUpgrade` is true (the length policy is
 * not re-applied: the passphrase was valid when it was chosen).
 */
export async function upgradeVaultKdf(
  header: VaultHeader,
  passphrase: string,
  options: { iterations?: number } = {},
): Promise<VaultHeader> {
  return rewrapPassphrase(header, { passphrase }, passphrase, options.iterations);
}

/** True when the passphrase slot uses less than the current default KDF cost. */
export function vaultNeedsUpgrade(header: VaultHeader): boolean {
  return parseVaultHeader(header).passphrase.kdf.iterations < PBKDF2_DEFAULT_ITERATIONS;
}

/** Issues a new recovery key; the previous one stops working. */
export async function rotateRecoveryKey(
  header: VaultHeader,
  credential: VaultCredential,
): Promise<{ header: VaultHeader; recoveryKey: string }> {
  const valid = parseVaultHeader(header);
  const vaultKey = await unlockVault(valid, credential, { extractable: true });
  const made = await makeRecoverySlot(valid.vaultId, vaultKey);
  return { header: { ...valid, recovery: made.slot }, recoveryKey: made.text };
}

/** Removes the recovery slot after proving knowledge of a credential. */
export async function removeRecoveryKey(
  header: VaultHeader,
  credential: VaultCredential,
): Promise<VaultHeader> {
  const valid = parseVaultHeader(header);
  await unlockVault(valid, credential);
  return { v: 1, vaultId: valid.vaultId, cipher: valid.cipher, passphrase: valid.passphrase };
}

/** Policy check for a new vault passphrase (length counted in code points after NFKC). */
export function assertVaultPassphrasePolicy(passphrase: string): void {
  normalizePassphrase(passphrase);
  if (passphraseLength(passphrase) < MIN_VAULT_PASSPHRASE_LENGTH) {
    throw new CryptoError(
      'invalid-argument',
      `Vault passphrase must be at least ${MIN_VAULT_PASSPHRASE_LENGTH} characters`,
    );
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Key wrapping (low level)                                                                    */
/* ------------------------------------------------------------------------------------------ */

/**
 * Wraps an extractable AES-256-GCM key under a KEK with AES-256-GCM (authenticated wrapping,
 * random 96-bit IV) and returns a `pxk1.<iv>.<wrapped key ‖ tag>` string bound to `aad`.
 */
export async function wrapVaultKey(
  vaultKey: CryptoKey,
  kek: CryptoKey,
  aad: BinaryLike,
): Promise<string> {
  assertAesGcmKey(vaultKey, 'encrypt');
  assertAesGcmKey(kek, 'wrapKey');
  if (!vaultKey.extractable) {
    throw new CryptoError('invalid-argument', 'Only an extractable key can be wrapped');
  }
  const iv = randomBytes(GCM_IV_BYTES);
  const wrapped = await subtle().wrapKey('raw', vaultKey, kek, {
    name: 'AES-GCM',
    iv,
    additionalData: envelopeAad(WRAPPED_KEY_PREFIX, aad),
    tagLength: GCM_TAG_BYTES * 8,
  });
  return `${WRAPPED_KEY_PREFIX}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(wrapped))}`;
}

/** Inverse of `wrapVaultKey`; returns a non-extractable key unless asked otherwise. */
export async function unwrapVaultKey(
  wrappedKey: string,
  kek: CryptoKey,
  aad: BinaryLike,
  options: { extractable?: boolean } = {},
): Promise<CryptoKey> {
  assertAesGcmKey(kek, 'unwrapKey');
  const { iv, body } = parseEnvelope(WRAPPED_KEY_PREFIX, wrappedKey);
  try {
    return await subtle().unwrapKey(
      'raw',
      body,
      kek,
      {
        name: 'AES-GCM',
        iv,
        additionalData: envelopeAad(WRAPPED_KEY_PREFIX, aad),
        tagLength: GCM_TAG_BYTES * 8,
      },
      { name: 'AES-GCM', length: AES_KEY_BITS },
      options.extractable ?? false,
      ['encrypt', 'decrypt'],
    );
  } catch (cause) {
    throw new CryptoError('decrypt-failed', 'Unable to unwrap key', { cause });
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Header validation                                                                           */
/* ------------------------------------------------------------------------------------------ */

/**
 * Validates an untrusted (synced, imported) header and returns a clean copy. Unknown fields
 * are dropped; out-of-range KDF parameters are rejected so a forged header can neither weaken
 * the derivation nor make the client spin for minutes.
 */
export function parseVaultHeader(value: unknown): VaultHeader {
  const h = asObject(value, 'header');
  if (h.v !== VAULT_HEADER_VERSION) {
    if (typeof h.v === 'number') {
      throw new CryptoError('unsupported-version', `Unsupported vault header version ${h.v}`);
    }
    throw malformed('version');
  }
  if (typeof h.vaultId !== 'string' || h.vaultId.length === 0 || h.vaultId.length > MAX_ID_LENGTH) {
    throw malformed('vaultId');
  }
  if (h.cipher !== VAULT_CIPHER) throw malformed('cipher');

  const p = asObject(h.passphrase, 'passphrase slot');
  const pk = asObject(p.kdf, 'passphrase KDF');
  if (pk.alg !== 'PBKDF2-HMAC-SHA256') throw malformed('passphrase KDF algorithm');
  if (
    typeof pk.iterations !== 'number' ||
    !Number.isSafeInteger(pk.iterations) ||
    pk.iterations < PBKDF2_MIN_ITERATIONS ||
    pk.iterations > PBKDF2_MAX_ITERATIONS
  ) {
    throw malformed('passphrase KDF iterations');
  }
  const header: VaultHeader = {
    v: 1,
    vaultId: h.vaultId,
    cipher: VAULT_CIPHER,
    passphrase: {
      kdf: { alg: 'PBKDF2-HMAC-SHA256', iterations: pk.iterations, salt: saltField(pk.salt) },
      wrappedKey: wrappedKeyField(p.wrappedKey),
    },
  };
  if (h.recovery !== undefined) {
    const r = asObject(h.recovery, 'recovery slot');
    const rk = asObject(r.kdf, 'recovery KDF');
    if (rk.alg !== 'HKDF-SHA256') throw malformed('recovery KDF algorithm');
    header.recovery = {
      kdf: { alg: 'HKDF-SHA256', salt: saltField(rk.salt) },
      wrappedKey: wrappedKeyField(r.wrappedKey),
    };
  }
  return header;
}

/* ------------------------------------------------------------------------------------------ */
/* Internals                                                                                   */
/* ------------------------------------------------------------------------------------------ */

async function rewrapPassphrase(
  header: VaultHeader,
  credential: VaultCredential,
  newPassphrase: string,
  iterations: number | undefined,
): Promise<VaultHeader> {
  const valid = parseVaultHeader(header);
  const vaultKey = await unlockVault(valid, credential, { extractable: true });
  const { slot } = await makePassphraseSlot(
    valid.vaultId,
    vaultKey,
    newPassphrase,
    iterations ?? PBKDF2_DEFAULT_ITERATIONS,
  );
  return { ...valid, passphrase: slot };
}

async function makePassphraseSlot(
  vaultId: Id,
  vaultKey: CryptoKey,
  passphrase: string,
  iterations: number,
): Promise<{ slot: PassphraseSlot; kek: CryptoKey }> {
  const salt = generateSalt();
  const kek = await deriveKek(passphrase, salt, { iterations });
  const kdf: PassphraseKdf = { alg: 'PBKDF2-HMAC-SHA256', iterations, salt: toBase64Url(salt) };
  const wrappedKey = await wrapVaultKey(vaultKey, kek, slotAad(vaultId, kdf));
  return { slot: { kdf, wrappedKey }, kek };
}

async function makeRecoverySlot(
  vaultId: Id,
  vaultKey: CryptoKey,
): Promise<{ slot: RecoverySlot; text: string }> {
  const recovery = await generateRecoveryKey();
  try {
    const salt = generateSalt();
    const kek = await recoveryKek(vaultId, recovery.bytes, salt);
    const kdf: RecoveryKdf = { alg: 'HKDF-SHA256', salt: toBase64Url(salt) };
    const wrappedKey = await wrapVaultKey(vaultKey, kek, slotAad(vaultId, kdf));
    return { slot: { kdf, wrappedKey }, text: recovery.text };
  } finally {
    zeroize(recovery.bytes);
  }
}

function recoveryKek(vaultId: Id, secret: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  return hkdfAesKey(secret, salt, canonicalJson(['pouxis.vault-recovery-kek/v1', vaultId]), [
    'wrapKey',
    'unwrapKey',
  ]);
}

/** AAD of a wrapped key: binds it to its vault, cipher and slot parameters. */
function slotAad(vaultId: Id, kdf: PassphraseKdf | RecoveryKdf): Uint8Array {
  return utf8Encode(
    canonicalJson([
      'pouxis.vault-key/v1',
      vaultId,
      VAULT_CIPHER,
      kdf.alg,
      'iterations' in kdf ? kdf.iterations : null,
      kdf.salt,
    ]),
  );
}

function decodeSalt(salt: string): Uint8Array {
  return fromBase64UrlExact(salt, SALT_BYTES, 'Salt');
}

function saltField(value: unknown): string {
  if (typeof value !== 'string') throw malformed('salt');
  decodeSalt(value);
  return value;
}

function wrappedKeyField(value: unknown): string {
  if (typeof value !== 'string') throw malformed('wrapped key');
  const { body } = parseEnvelope(WRAPPED_KEY_PREFIX, value);
  if (body.length !== AES_KEY_BITS / 8 + GCM_TAG_BYTES) throw malformed('wrapped key length');
  return value;
}

function asObject(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw malformed(what);
  return value as Record<string, unknown>;
}

function assertId(value: unknown, name: string): void {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ID_LENGTH) {
    throw new CryptoError('invalid-argument', `${name} must be a non-empty string`);
  }
}

function malformed(what: string): CryptoError {
  return new CryptoError('malformed', `Invalid vault header: ${what}`);
}
