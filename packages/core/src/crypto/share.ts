/**
 * Granular share links (feature 3.10) — capability URLs that keep content end-to-end encrypted.
 *
 *     https://share.example/s/pxs1.<kid>.<claims>.<mac>#k=<link secret>
 *                             └──── server-verifiable token ────┘ └ never sent ┘
 *
 * - The **token** (path) is HMAC-SHA256-signed claims (resource, permission, expiry, link id,
 *   optional password parameters). The server verifies it before serving the encrypted blob
 *   or accepting a comment; it never learns anything that decrypts the content.
 * - The **link secret** (fragment) is 256 random bits. Browsers never send the fragment in
 *   HTTP requests (RFC 9110 §7.1, RFC 3986 §3.5), so only people holding the link can derive
 *   the content key: HKDF-SHA256(secret, salt, info = resource ‖ link id).
 * - **Password** (optional): PBKDF2-HMAC-SHA256 (600 000 iterations) → two independent HKDF
 *   outputs. `auth` is presented to the server as a proof, which compares its SHA-256 with the
 *   stored verifier in constant time (so a leaked verifier table cannot be replayed);
 *   `mix` is folded into the content-key derivation, so a leaked URL alone decrypts nothing
 *   and guessing the password requires the server's (rate-limited) cooperation.
 *
 * Tokens are HMAC'd with a key the verifier holds: the relay's share-signing key, or a key
 * the space owner registered with it. Clients without that key pass an async `signer`
 * callback that asks the server to sign; the server must check the caller may share
 * `resourceId` and apply its own lifetime policy before signing.
 */
import type { Id, Timestamp } from '../model.ts';
import { ENVELOPE_PREFIX, open, seal } from './aead.ts';
import {
  type BinaryLike,
  type Bytes,
  fromBase64Url,
  fromBase64UrlExact,
  timingSafeEqual,
  toBase64Url,
  utf8Decode,
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
  generateSalt,
  hkdfAesKey,
  hkdfBits,
  normalizePassphrase,
  passphraseLength,
  pbkdf2Bits,
} from './kdf.ts';
import { randomBytes, sha256, subtle } from './runtime.ts';

export type SharePermission = 'read' | 'comment';

/** Token format prefix. */
export const SHARE_TOKEN_PREFIX = 'pxs1';
/** Default and maximum link lifetime accepted by `createShareLink` (365 days). */
export const SHARE_MAX_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;
/**
 * Minimum share password length. The password is a second factor next to possession of the
 * link, so the multi-factor floor of NIST SP 800-63B-4 §3.1.1.2 (8 characters) applies.
 */
export const MIN_SHARE_PASSWORD_LENGTH = 8;
/** HMAC keys shorter than the hash output weaken HMAC (RFC 2104 §3). */
export const SHARE_SIGNING_KEY_BYTES = 32;

const LINK_SECRET_BYTES = 32;
const LINK_ID_BYTES = 16;
const MAC_BYTES = 32;
const MAX_TOKEN_LENGTH = 2048;
const MAX_RESOURCE_ID_LENGTH = 256;
const KID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const PERMISSION_RANK: Record<SharePermission, number> = { read: 1, comment: 2 };

/** Signed claims of a share token. Public: anyone holding the URL can read them. */
export interface ShareTokenClaims {
  v: 1;
  /** Link id (128 random bits, base64url): revocation handle and key-derivation input. */
  lid: string;
  /** Shared resource id. */
  rid: Id;
  perm: SharePermission;
  /** Issued at, epoch ms. */
  iat: Timestamp;
  /** Expires at, epoch ms (exclusive). */
  exp: Timestamp;
  /** Present when the link is password-protected: public PBKDF2 parameters. */
  pw?: { salt: string; iterations: number };
}

/** Server-side record of a password-protected link. Store it next to the blob, keyed by `lid`. */
export interface SharePasswordRecord {
  v: 1;
  /** base64url SHA-256 of the password proof. */
  hash: string;
}

export interface ShareSigningKey {
  /** Key id, so the server can rotate keys: `[A-Za-z0-9_-]{1,32}`. */
  kid: string;
  key: CryptoKey;
}

/** Either a signing key held locally, or a callback asking the server to sign. */
export type ShareSigner = ShareSigningKey | ((claims: ShareTokenClaims) => Promise<string>);

export interface CreateShareLinkOptions {
  /** Origin (and optional path) serving share links, e.g. `https://share.pouxis.app`. */
  baseUrl: string;
  resourceId: Id;
  permission: SharePermission;
  expiresAt: Timestamp;
  password?: string;
  signer: ShareSigner;
  now?: Timestamp;
  /** Upper bound on `expiresAt - now` (default `SHARE_MAX_LIFETIME_MS`). */
  maxLifetimeMs?: number;
  /** PBKDF2 iterations for the password (default and minimum: 600 000). */
  iterations?: number;
}

export interface ShareLink {
  /** Full capability URL, fragment included. Treat it as a secret. */
  url: string;
  token: string;
  claims: ShareTokenClaims;
  /** Key encrypting the shared snapshot and comments (`encryptSharedContent`). */
  contentKey: CryptoKey;
  /** Upload with the blob when the link has a password; never put it in the URL. */
  passwordRecord?: SharePasswordRecord;
}

/* ------------------------------------------------------------------------------------------ */
/* Link creation and opening (client side)                                                     */
/* ------------------------------------------------------------------------------------------ */

export async function createShareLink(options: CreateShareLinkOptions): Promise<ShareLink> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const now = options.now ?? Date.now();
  assertResourceId(options.resourceId);
  if (!(options.permission in PERMISSION_RANK)) {
    throw new CryptoError('invalid-argument', 'Unknown share permission');
  }
  const maxLifetime = options.maxLifetimeMs ?? SHARE_MAX_LIFETIME_MS;
  if (
    !Number.isSafeInteger(options.expiresAt) ||
    options.expiresAt <= now ||
    options.expiresAt - now > maxLifetime
  ) {
    throw new CryptoError('invalid-argument', 'expiresAt must be in the future, within the limit');
  }

  const claims: ShareTokenClaims = {
    v: 1,
    lid: toBase64Url(randomBytes(LINK_ID_BYTES)),
    rid: options.resourceId,
    perm: options.permission,
    iat: now,
    exp: options.expiresAt,
  };
  if (options.password !== undefined) {
    assertSharePasswordPolicy(options.password);
    const iterations = options.iterations ?? PBKDF2_DEFAULT_ITERATIONS;
    claims.pw = { salt: toBase64Url(generateSalt()), iterations };
  }

  const secret = randomBytes(LINK_SECRET_BYTES);
  let proof: Bytes | undefined;
  try {
    const keys = await deriveShareKeys(secret, claims, options.password);
    proof = keys.proof;
    const token = await issueToken(options.signer, claims);
    const link: ShareLink = {
      url: `${baseUrl}/s/${token}#k=${toBase64Url(secret)}`,
      token,
      claims,
      contentKey: keys.contentKey,
    };
    if (proof) link.passwordRecord = { v: 1, hash: toBase64Url(await sha256(proof)) };
    return link;
  } finally {
    zeroize(secret, proof);
  }
}

/** Splits a share URL into its token (for the server) and link secret (kept client-side). */
export function parseShareUrl(url: string): { token: string; secret: string } {
  if (typeof url !== 'string') throw new CryptoError('malformed', 'Share URL must be a string');
  const hashIndex = url.indexOf('#');
  if (hashIndex < 0) throw new CryptoError('malformed', 'Share URL has no key fragment');
  let secret: string | undefined;
  for (const param of url.slice(hashIndex + 1).split('&')) {
    if (param.startsWith('k=')) secret = param.slice(2);
  }
  if (secret === undefined) throw new CryptoError('malformed', 'Share URL has no key fragment');
  fromBase64UrlExact(secret, LINK_SECRET_BYTES, 'Link secret');
  const path = url.slice(0, hashIndex).split('?')[0] ?? '';
  const match = /\/s\/([A-Za-z0-9_.-]+)$/.exec(path);
  if (!match?.[1]) throw new CryptoError('malformed', 'Share URL has no token');
  return { token: match[1], secret };
}

/**
 * Reads the claims of a token WITHOUT verifying its MAC. Clients use it to learn the password
 * parameters; authorization decisions must only rely on `verifyShareToken`. Forged claims are
 * harmless here because the resource and link ids feed the content-key derivation.
 */
export function decodeShareToken(token: string): ShareTokenClaims {
  return parseClaims(splitToken(token).claims);
}

/**
 * Derives what a viewer needs from the link secret: the content key and, for a
 * password-protected link, the proof to present to the server. Throws `password-required`
 * when the link has a password and none was given.
 */
export async function unlockShare(params: {
  secret: string;
  claims: ShareTokenClaims;
  password?: string;
}): Promise<{ contentKey: CryptoKey; passwordProof?: string }> {
  const claims = parseClaims(canonicalJsonBytes(params.claims));
  const secret = fromBase64UrlExact(params.secret, LINK_SECRET_BYTES, 'Link secret');
  try {
    const keys = await deriveShareKeys(secret, claims, params.password);
    if (!keys.proof) return { contentKey: keys.contentKey };
    const proof = toBase64Url(keys.proof);
    zeroize(keys.proof);
    return { contentKey: keys.contentKey, passwordProof: proof };
  } finally {
    zeroize(secret);
  }
}

/** Encrypts the shared snapshot (`part` = `content`) or a viewer comment (`comment:<id>`). */
export async function encryptSharedContent(
  contentKey: CryptoKey,
  claims: ShareTokenClaims,
  plaintext: BinaryLike,
  part = 'content',
): Promise<string> {
  return seal(ENVELOPE_PREFIX, contentKey, plaintext, shareAad(claims, part));
}

export async function decryptSharedContent(
  contentKey: CryptoKey,
  claims: ShareTokenClaims,
  envelope: string,
  part = 'content',
): Promise<Bytes> {
  return open(ENVELOPE_PREFIX, contentKey, envelope, shareAad(claims, part));
}

/* ------------------------------------------------------------------------------------------ */
/* Tokens (server side)                                                                        */
/* ------------------------------------------------------------------------------------------ */

/** Random 256-bit HMAC-SHA256 key for signing share tokens. */
export async function generateShareSigningKey(
  options: { extractable?: boolean } = {},
): Promise<CryptoKey> {
  return subtle().generateKey({ name: 'HMAC', hash: 'SHA-256', length: 256 }, options.extractable ?? false, [
    'sign',
    'verify',
  ]);
}

/** Imports a raw secret (≥ 32 bytes, e.g. from a secrets manager) as a share-signing key. */
export async function importShareSigningKey(raw: Uint8Array): Promise<CryptoKey> {
  if (!(raw instanceof Uint8Array) || raw.length < SHARE_SIGNING_KEY_BYTES) {
    throw new CryptoError(
      'invalid-argument',
      `Share signing key must be at least ${SHARE_SIGNING_KEY_BYTES} bytes`,
    );
  }
  const material = new Uint8Array(raw);
  try {
    return await subtle().importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ]);
  } finally {
    zeroize(material);
  }
}

/** Signs claims into `pxs1.<kid>.<base64url canonical JSON>.<base64url HMAC-SHA256>`. */
export async function signShareToken(
  claims: ShareTokenClaims,
  signingKey: ShareSigningKey,
): Promise<string> {
  if (!KID_PATTERN.test(signingKey.kid)) {
    throw new CryptoError('invalid-argument', 'kid must match [A-Za-z0-9_-]{1,32}');
  }
  assertHmacKey(signingKey.key, 'sign');
  const payload = toBase64Url(canonicalJsonBytes(parseClaims(canonicalJsonBytes(claims))));
  const signed = `${SHARE_TOKEN_PREFIX}.${signingKey.kid}.${payload}`;
  const mac = await subtle().sign('HMAC', signingKey.key, utf8Encode(signed));
  return `${signed}.${toBase64Url(new Uint8Array(mac))}`;
}

export type ShareTokenFailure =
  | 'malformed'
  | 'unknown-key'
  | 'bad-signature'
  | 'expired'
  | 'not-yet-valid'
  | 'insufficient-permission'
  | 'wrong-resource'
  | 'revoked';

export type ShareTokenVerification =
  | { ok: true; kid: string; claims: ShareTokenClaims }
  | { ok: false; reason: ShareTokenFailure };

/** Signing keys by id: a map, or a lookup function (lets the server rotate keys). */
export type ShareKeyring =
  | ReadonlyMap<string, CryptoKey>
  | ((kid: string) => CryptoKey | undefined | Promise<CryptoKey | undefined>);

export interface VerifyShareTokenOptions {
  now?: Timestamp;
  /** Permission the request needs; `comment` links also grant `read`. */
  require?: SharePermission;
  /** Resource the request targets; must equal the token's. */
  resourceId?: Id;
  /** Tolerance for `iat` in the future (clock skew), default 60 s. Expiry is strict. */
  clockSkewMs?: number;
  /** Revocation check by link id. */
  isRevoked?: (linkId: string) => boolean | Promise<boolean>;
}

/**
 * Verifies a token's MAC (constant time, via `SubtleCrypto.verify`), then its validity window,
 * permission, resource and revocation. Returns a reason for server logs; respond to clients
 * with a uniform 404 to avoid confirming that a link exists.
 */
export async function verifyShareToken(
  token: string,
  keyring: ShareKeyring,
  options: VerifyShareTokenOptions = {},
): Promise<ShareTokenVerification> {
  let parts: TokenParts;
  try {
    parts = splitToken(token);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const key = typeof keyring === 'function' ? await keyring(parts.kid) : keyring.get(parts.kid);
  if (!key) return { ok: false, reason: 'unknown-key' };
  assertHmacKey(key, 'verify');
  const valid = await subtle().verify('HMAC', key, parts.mac, utf8Encode(parts.signed));
  if (!valid) return { ok: false, reason: 'bad-signature' };

  let claims: ShareTokenClaims;
  try {
    claims = parseClaims(parts.claims);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const now = options.now ?? Date.now();
  if (now >= claims.exp) return { ok: false, reason: 'expired' };
  if (claims.iat > now + (options.clockSkewMs ?? 60_000)) {
    return { ok: false, reason: 'not-yet-valid' };
  }
  if (options.require && PERMISSION_RANK[claims.perm] < PERMISSION_RANK[options.require]) {
    return { ok: false, reason: 'insufficient-permission' };
  }
  if (options.resourceId !== undefined && options.resourceId !== claims.rid) {
    return { ok: false, reason: 'wrong-resource' };
  }
  if (options.isRevoked && (await options.isRevoked(claims.lid))) {
    return { ok: false, reason: 'revoked' };
  }
  return { ok: true, kid: parts.kid, claims };
}

/**
 * Server-side password check: SHA-256 of the presented proof compared in constant time with
 * the stored record. Rate-limit calls per link id and per client (OWASP Authentication Cheat
 * Sheet) — the proof is cheap to check, guessing must stay expensive.
 */
export async function verifySharePassword(
  proof: string,
  record: SharePasswordRecord,
): Promise<boolean> {
  let presented: Bytes;
  let expected: Bytes;
  try {
    presented = fromBase64UrlExact(proof, 32, 'Password proof');
    expected = fromBase64UrlExact(record.hash, 32, 'Password verifier');
  } catch {
    return false;
  }
  const digest = await sha256(presented);
  zeroize(presented);
  return timingSafeEqual(digest, expected);
}

export function assertSharePasswordPolicy(password: string): void {
  normalizePassphrase(password);
  if (passphraseLength(password) < MIN_SHARE_PASSWORD_LENGTH) {
    throw new CryptoError(
      'invalid-argument',
      `Share password must be at least ${MIN_SHARE_PASSWORD_LENGTH} characters`,
    );
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Internals                                                                                   */
/* ------------------------------------------------------------------------------------------ */

interface TokenParts {
  kid: string;
  claims: Bytes;
  mac: Bytes;
  /** `pxs1.<kid>.<payload>`: the MAC input. */
  signed: string;
}

function splitToken(token: string): TokenParts {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) {
    throw new CryptoError('malformed', 'Invalid share token');
  }
  const parts = token.split('.');
  const [prefix, kid, payload, mac] = parts;
  if (
    parts.length !== 4 ||
    prefix !== SHARE_TOKEN_PREFIX ||
    kid === undefined ||
    payload === undefined ||
    mac === undefined ||
    !KID_PATTERN.test(kid)
  ) {
    throw new CryptoError('malformed', 'Invalid share token');
  }
  return {
    kid,
    claims: fromBase64Url(payload),
    mac: fromBase64UrlExact(mac, MAC_BYTES, 'Token MAC'),
    signed: `${prefix}.${kid}.${payload}`,
  };
}

/** Strict claims validation: exact field set, types and ranges. */
function parseClaims(bytes: Uint8Array): ShareTokenClaims {
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(bytes));
  } catch (cause) {
    throw new CryptoError('malformed', 'Invalid share token claims', { cause });
  }
  const bad = (what: string) => new CryptoError('malformed', `Invalid share token claims: ${what}`);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw bad('shape');
  const c = value as Record<string, unknown>;
  const allowed = new Set(['v', 'lid', 'rid', 'perm', 'iat', 'exp', 'pw']);
  if (Object.keys(c).some((key) => !allowed.has(key))) throw bad('unknown field');
  if (c.v !== 1) throw bad('version');
  if (typeof c.lid !== 'string') throw bad('lid');
  fromBase64UrlExact(c.lid, LINK_ID_BYTES, 'Link id');
  if (
    typeof c.rid !== 'string' ||
    c.rid.length === 0 ||
    c.rid.length > MAX_RESOURCE_ID_LENGTH
  ) {
    throw bad('rid');
  }
  if (c.perm !== 'read' && c.perm !== 'comment') throw bad('perm');
  if (typeof c.iat !== 'number' || !Number.isSafeInteger(c.iat)) throw bad('iat');
  if (typeof c.exp !== 'number' || !Number.isSafeInteger(c.exp) || c.exp <= c.iat) {
    throw bad('exp');
  }
  const claims: ShareTokenClaims = {
    v: 1,
    lid: c.lid,
    rid: c.rid,
    perm: c.perm,
    iat: c.iat,
    exp: c.exp,
  };
  if (c.pw !== undefined) {
    if (typeof c.pw !== 'object' || c.pw === null || Array.isArray(c.pw)) throw bad('pw');
    const pw = c.pw as Record<string, unknown>;
    if (Object.keys(pw).some((key) => key !== 'salt' && key !== 'iterations')) throw bad('pw');
    if (typeof pw.salt !== 'string') throw bad('pw.salt');
    fromBase64UrlExact(pw.salt, SALT_BYTES, 'Password salt');
    if (
      typeof pw.iterations !== 'number' ||
      !Number.isSafeInteger(pw.iterations) ||
      pw.iterations < PBKDF2_MIN_ITERATIONS ||
      pw.iterations > PBKDF2_MAX_ITERATIONS
    ) {
      throw bad('pw.iterations');
    }
    claims.pw = { salt: pw.salt, iterations: pw.iterations };
  }
  return claims;
}

async function issueToken(signer: ShareSigner, claims: ShareTokenClaims): Promise<string> {
  if (typeof signer !== 'function') return signShareToken(claims, signer);
  const token = await signer(claims);
  // The server may only have signed what we asked for (it may shorten the lifetime).
  const signed = decodeShareToken(token);
  if (
    signed.lid !== claims.lid ||
    signed.rid !== claims.rid ||
    signed.perm !== claims.perm ||
    signed.exp > claims.exp ||
    canonicalJson(signed.pw ?? null) !== canonicalJson(claims.pw ?? null)
  ) {
    throw new CryptoError('invalid-argument', 'Signer returned a token for different claims');
  }
  return token;
}

async function deriveShareKeys(
  secret: Uint8Array,
  claims: ShareTokenClaims,
  password: string | undefined,
): Promise<{ contentKey: CryptoKey; proof?: Bytes }> {
  const info = canonicalJson(['pouxis.share-content-key/v1', claims.rid, claims.lid]);
  if (!claims.pw) {
    return { contentKey: await hkdfAesKey(secret, new Uint8Array(0), info, ['encrypt', 'decrypt']) };
  }
  if (password === undefined) {
    throw new CryptoError('password-required', 'This share link is password-protected');
  }
  const stretched = await pbkdf2Bits(
    password,
    fromBase64UrlExact(claims.pw.salt, SALT_BYTES, 'Password salt'),
    claims.pw.iterations,
  );
  let mix: Bytes | undefined;
  try {
    const proof = await hkdfBits(stretched, new Uint8Array(0), 'pouxis/share-password-auth/v1');
    mix = await hkdfBits(stretched, new Uint8Array(0), 'pouxis/share-password-mix/v1');
    const contentKey = await hkdfAesKey(secret, mix, info, ['encrypt', 'decrypt']);
    return { contentKey, proof };
  } finally {
    zeroize(stretched, mix);
  }
}

function shareAad(claims: ShareTokenClaims, part: string): Bytes {
  return utf8Encode(canonicalJson(['pouxis.share-content/v1', claims.rid, claims.lid, part]));
}

function canonicalJsonBytes(value: unknown): Bytes {
  return utf8Encode(canonicalJson(value));
}

function assertHmacKey(key: CryptoKey, usage: KeyUsage): void {
  const algorithm = key.algorithm as Partial<HmacKeyAlgorithm>;
  if (algorithm.name !== 'HMAC' || algorithm.hash?.name !== 'SHA-256') {
    throw new CryptoError('invalid-argument', 'Expected an HMAC-SHA256 key');
  }
  if ((algorithm.length ?? 0) < SHARE_SIGNING_KEY_BYTES * 8) {
    throw new CryptoError('invalid-argument', 'HMAC key is too short');
  }
  if (!key.usages.includes(usage)) {
    throw new CryptoError('invalid-argument', `Key is not allowed to ${usage}`);
  }
}

function assertResourceId(resourceId: unknown): void {
  if (
    typeof resourceId !== 'string' ||
    resourceId.length === 0 ||
    resourceId.length > MAX_RESOURCE_ID_LENGTH
  ) {
    throw new CryptoError('invalid-argument', 'resourceId must be a non-empty string');
  }
}

/** HTTPS only (plain HTTP is accepted for loopback development hosts). */
function normalizeBaseUrl(baseUrl: string): string {
  const https = /^https:\/\/[A-Za-z0-9.-]+(:\d{1,5})?(\/[A-Za-z0-9._~%/-]*)?$/;
  const loopback = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?(\/[A-Za-z0-9._~%/-]*)?$/;
  if (typeof baseUrl !== 'string' || !(https.test(baseUrl) || loopback.test(baseUrl))) {
    throw new CryptoError(
      'invalid-argument',
      'baseUrl must be an https:// origin (http:// only for loopback), without query or fragment',
    );
  }
  return baseUrl.replace(/\/+$/, '');
}
