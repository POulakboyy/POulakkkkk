/**
 * @pouxis/core/crypto — security primitives of POuxis, built on WebCrypto only.
 *
 * - E2EE vaults (3.5): `createVault`, `unlockVault`, `changeVaultPassphrase`, `encrypt`, …
 * - Sync payload encryption: `encryptPayload` / `decryptPayload` (the relay sees ciphertext).
 * - Share links (3.10): `createShareLink`, `signShareToken`, `verifyShareToken`, …
 * - Audit trail (6.5): `appendAudit`, `verifyAuditChain`, signed checkpoints.
 *
 * Design and threat model: docs/security/SECURITY_ARCHITECTURE.md, docs/security/THREAT_MODEL.md.
 */
export { CryptoError, isCryptoError } from './errors.ts';
export type { CryptoErrorCode } from './errors.ts';

export {
  concatBytes,
  fromBase64Url,
  fromHex,
  timingSafeEqual,
  toBase64Url,
  toHex,
  utf8Decode,
  utf8Encode,
  zeroize,
} from './bytes.ts';
export type { BinaryLike, Bytes } from './bytes.ts';
export { randomBytes, sha256 } from './runtime.ts';
export { canonicalJson } from './canonical-json.ts';
export type { JsonValue } from './canonical-json.ts';

export {
  AES_KEY_BITS,
  ENVELOPE_PREFIX,
  GCM_IV_BYTES,
  GCM_TAG_BYTES,
  WRAPPED_KEY_PREFIX,
  decrypt,
  decryptText,
  encrypt,
  generateVaultKey,
  isEnvelope,
  recordAad,
} from './aead.ts';
export type { RecordContext } from './aead.ts';

export {
  MAX_PASSPHRASE_LENGTH,
  PBKDF2_DEFAULT_ITERATIONS,
  PBKDF2_MAX_ITERATIONS,
  PBKDF2_MIN_ITERATIONS,
  SALT_BYTES,
  deriveKek,
  generateSalt,
  normalizePassphrase,
  passphraseLength,
} from './kdf.ts';

export {
  RECOVERY_KEY_BYTES,
  formatRecoveryKey,
  generateRecoveryKey,
  parseRecoveryKey,
} from './recovery.ts';
export type { RecoveryKey } from './recovery.ts';

export {
  MIN_VAULT_PASSPHRASE_LENGTH,
  VAULT_HEADER_VERSION,
  assertVaultPassphrasePolicy,
  changeVaultPassphrase,
  createVault,
  parseVaultHeader,
  removeRecoveryKey,
  rotateRecoveryKey,
  unlockVault,
  unwrapVaultKey,
  upgradeVaultKdf,
  vaultNeedsUpgrade,
  wrapVaultKey,
} from './vault.ts';
export type {
  CreateVaultOptions,
  CreatedVault,
  PassphraseKdf,
  PassphraseSlot,
  RecoveryKdf,
  RecoverySlot,
  VaultCredential,
  VaultHeader,
} from './vault.ts';

export { decryptPayload, encryptPayload, padme, payloadAad } from './payload.ts';
export type { EncryptPayloadOptions, PayloadContext } from './payload.ts';

export {
  MIN_SHARE_PASSWORD_LENGTH,
  SHARE_MAX_LIFETIME_MS,
  SHARE_SIGNING_KEY_BYTES,
  SHARE_TOKEN_PREFIX,
  assertSharePasswordPolicy,
  createShareLink,
  decodeShareToken,
  decryptSharedContent,
  encryptSharedContent,
  generateShareSigningKey,
  importShareSigningKey,
  parseShareUrl,
  signShareToken,
  unlockShare,
  verifySharePassword,
  verifyShareToken,
} from './share.ts';
export type {
  CreateShareLinkOptions,
  ShareKeyring,
  ShareLink,
  SharePasswordRecord,
  SharePermission,
  ShareSigner,
  ShareSigningKey,
  ShareTokenClaims,
  ShareTokenFailure,
  ShareTokenVerification,
  VerifyShareTokenOptions,
} from './share.ts';

export {
  AUDIT_GENESIS,
  appendAudit,
  exportCheckpointPublicKey,
  generateCheckpointKeyPair,
  importCheckpointPublicKey,
  signCheckpoint,
  verifyAuditChain,
  verifyCheckpoint,
} from './audit.ts';
export type {
  AuditCheckpoint,
  AuditEntry,
  AuditFailure,
  AuditHead,
  AuditRecord,
  AuditVerification,
  VerifyAuditOptions,
} from './audit.ts';
