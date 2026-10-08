/**
 * Tamper-evident audit trail (feature 6.5): an append-only, hash-chained log.
 *
 *     hashₙ = SHA-256( "pouxis/audit/v1\n" ‖ JCS({ v, seq: n, prev: hashₙ₋₁, entry }) )
 *
 * Every record commits to its predecessor, so editing, deleting, inserting or reordering a
 * record breaks every following link. Removing records from the *end* of a chain leaves a
 * valid shorter chain: detect it with a checkpoint (`{ seq, hash }` of a known head) kept
 * somewhere the attacker cannot rewrite — signed with ECDSA P-256 (FIPS 186-5) by the
 * writer, published to the relay, or exported to the organization's SIEM.
 *
 * A chain has a single writer (one device, or the server for team workspaces): concurrent
 * appends from several replicas would fork it. See docs/security/THREAT_MODEL.md.
 */
import type { Id, Timestamp } from '../model.ts';
import { fromBase64Url, toBase64Url, toHex, utf8Encode } from './bytes.ts';
import { type JsonValue, canonicalJson } from './canonical-json.ts';
import { CryptoError } from './errors.ts';
import { sha256, subtle } from './runtime.ts';

/** `prev` of the first record. */
export const AUDIT_GENESIS = '0'.repeat(64);

const RECORD_DOMAIN = 'pouxis/audit/v1\n';
const CHECKPOINT_DOMAIN = 'pouxis/audit-checkpoint/v1\n';
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ECDSA_SHA256 = { name: 'ECDSA', hash: 'SHA-256' } as const;

/** What happened. Keep personal data out of `details` (data minimization, GDPR art. 5(1)(c)). */
export interface AuditEntry {
  /** When it happened, epoch ms. */
  at: Timestamp;
  /** Who did it: user id, device id or `system`. */
  actor: string;
  /** Dotted verb, e.g. `task.update`, `share.create`, `vault.unlock-failed`. */
  action: string;
  /** Record acted upon, when there is one. */
  target?: { collection: string; id: Id };
  /** Extra structured context (JSON only). */
  details?: JsonValue;
}

export interface AuditRecord {
  v: 1;
  seq: number;
  /** Hash of the previous record (`AUDIT_GENESIS` for seq 0), lowercase hex. */
  prev: string;
  entry: AuditEntry;
  /** SHA-256 of this record, lowercase hex. */
  hash: string;
}

/** Head of a chain: enough to append to it or to anchor a later verification. */
export interface AuditHead {
  seq: number;
  hash: string;
}

/** A signed statement "the chain had this head at that time". */
export interface AuditCheckpoint extends AuditHead {
  v: 1;
  at: Timestamp;
  /** base64url ECDSA P-256 / SHA-256 signature (IEEE P1363 r ‖ s). */
  sig: string;
}

export type AuditFailure =
  /** A record does not have the expected shape. */
  | 'malformed'
  /** A record's content does not match its hash (edited). */
  | 'hash-mismatch'
  /** A record does not point at its predecessor (removed, inserted or reordered). */
  | 'broken-link'
  /** Sequence numbers are not consecutive. */
  | 'sequence-gap'
  /** The chain is shorter than the checkpoint (tail truncated). */
  | 'truncated'
  /** The record at the checkpoint's position differs from the checkpoint (rewritten history). */
  | 'checkpoint-mismatch'
  /** The checkpoint signature is invalid. */
  | 'bad-checkpoint-signature';

export type AuditVerification =
  | { ok: true; head: AuditHead | null; length: number }
  | { ok: false; reason: AuditFailure; index: number };

/**
 * Appends an entry after `prev` (the last record or head; `null` starts a new chain) and
 * returns the new record. Persist it before acknowledging the audited action.
 */
export async function appendAudit(prev: AuditHead | null, entry: AuditEntry): Promise<AuditRecord> {
  if (prev !== null) assertHead(prev);
  assertEntry(entry);
  const seq = prev === null ? 0 : prev.seq + 1;
  const prevHash = prev === null ? AUDIT_GENESIS : prev.hash;
  const clean = cloneEntry(entry);
  const hash = await hashRecord(seq, prevHash, clean);
  return { v: 1, seq, prev: prevHash, entry: clean, hash };
}

export interface VerifyAuditOptions {
  /** Trusted head preceding `records[0]`, to verify a suffix of a longer chain. */
  from?: AuditHead;
  /** Head the chain must contain (detects tail truncation and rewrites). */
  checkpoint?: AuditCheckpoint;
  /** Public key checking `checkpoint.sig`; without it the checkpoint is trusted as given. */
  checkpointKey?: CryptoKey;
}

/**
 * Verifies an ordered list of records: shape, hashes, links and sequence numbers, starting
 * from the genesis (or `from`), then the optional checkpoint. Reports the first failure.
 */
export async function verifyAuditChain(
  records: readonly unknown[],
  options: VerifyAuditOptions = {},
): Promise<AuditVerification> {
  const { checkpoint, checkpointKey } = options;
  if (checkpoint && checkpointKey && !(await verifyCheckpoint(checkpoint, checkpointKey))) {
    return { ok: false, reason: 'bad-checkpoint-signature', index: -1 };
  }
  if (options.from) assertHead(options.from);
  let expectedSeq = options.from ? options.from.seq + 1 : 0;
  let expectedPrev = options.from ? options.from.hash : AUDIT_GENESIS;
  let head: AuditHead | null = options.from ? { ...options.from } : null;

  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (!isRecord(record)) return { ok: false, reason: 'malformed', index };
    if (record.seq !== expectedSeq) return { ok: false, reason: 'sequence-gap', index };
    if (record.prev !== expectedPrev) return { ok: false, reason: 'broken-link', index };
    const hash = await hashRecord(record.seq, record.prev, record.entry);
    if (hash !== record.hash) return { ok: false, reason: 'hash-mismatch', index };
    if (checkpoint && record.seq === checkpoint.seq && record.hash !== checkpoint.hash) {
      return { ok: false, reason: 'checkpoint-mismatch', index };
    }
    head = { seq: record.seq, hash: record.hash };
    expectedSeq = record.seq + 1;
    expectedPrev = record.hash;
  }

  if (checkpoint) {
    const firstSeq = options.from ? options.from.seq + 1 : 0;
    if (head === null || head.seq < checkpoint.seq) {
      return { ok: false, reason: 'truncated', index: records.length };
    }
    if (checkpoint.seq < firstSeq - 1) {
      // The checkpoint predates the verified range: it cannot vouch for these records.
      return { ok: false, reason: 'checkpoint-mismatch', index: -1 };
    }
    if (options.from && checkpoint.seq === options.from.seq && checkpoint.hash !== options.from.hash) {
      return { ok: false, reason: 'checkpoint-mismatch', index: -1 };
    }
  }
  return { ok: true, head, length: records.length };
}

/* ------------------------------------------------------------------------------------------ */
/* Checkpoints                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/**
 * ECDSA P-256 key pair for checkpoints. The private key is non-extractable by default: store
 * the `CryptoKey` itself (IndexedDB structured clone, or the OS keychain through the native
 * shell) rather than exporting it. Publish the public key (`exportCheckpointPublicKey`).
 */
export async function generateCheckpointKeyPair(
  options: { extractable?: boolean } = {},
): Promise<CryptoKeyPair> {
  return subtle().generateKey(ECDSA, options.extractable ?? false, ['sign', 'verify']);
}

/** Public key as a JWK, for distribution to verifiers. */
export async function exportCheckpointPublicKey(publicKey: CryptoKey): Promise<JsonWebKey> {
  return subtle().exportKey('jwk', publicKey);
}

export async function importCheckpointPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || jwk.d !== undefined) {
    throw new CryptoError('invalid-argument', 'Expected a public P-256 JWK');
  }
  return subtle().importKey('jwk', jwk, ECDSA, true, ['verify']);
}

export async function signCheckpoint(
  head: AuditHead,
  privateKey: CryptoKey,
  at: Timestamp = Date.now(),
): Promise<AuditCheckpoint> {
  assertHead(head);
  if (!Number.isSafeInteger(at)) throw new CryptoError('invalid-argument', 'Invalid timestamp');
  const sig = await subtle().sign(ECDSA_SHA256, privateKey, checkpointBytes(head.seq, head.hash, at));
  return { v: 1, seq: head.seq, hash: head.hash, at, sig: toBase64Url(new Uint8Array(sig)) };
}

export async function verifyCheckpoint(
  checkpoint: AuditCheckpoint,
  publicKey: CryptoKey,
): Promise<boolean> {
  try {
    if (checkpoint.v !== 1 || !Number.isSafeInteger(checkpoint.at)) return false;
    assertHead(checkpoint);
    const sig = fromBase64Url(checkpoint.sig);
    return await subtle().verify(
      ECDSA_SHA256,
      publicKey,
      sig,
      checkpointBytes(checkpoint.seq, checkpoint.hash, checkpoint.at),
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Internals                                                                                   */
/* ------------------------------------------------------------------------------------------ */

async function hashRecord(seq: number, prev: string, entry: AuditEntry): Promise<string> {
  const body = canonicalJson({ v: 1, seq, prev, entry });
  return toHex(await sha256(utf8Encode(RECORD_DOMAIN + body)));
}

function checkpointBytes(seq: number, hash: string, at: Timestamp): Uint8Array<ArrayBuffer> {
  return utf8Encode(CHECKPOINT_DOMAIN + canonicalJson({ v: 1, seq, hash, at }));
}

function assertHead(head: AuditHead): void {
  if (!Number.isSafeInteger(head.seq) || head.seq < 0 || !HASH_PATTERN.test(head.hash)) {
    throw new CryptoError('invalid-argument', 'Invalid audit head');
  }
}

function assertEntry(entry: AuditEntry): void {
  if (!Number.isSafeInteger(entry.at)) throw invalidEntry('at');
  if (typeof entry.actor !== 'string' || entry.actor.length === 0) throw invalidEntry('actor');
  if (typeof entry.action !== 'string' || entry.action.length === 0) throw invalidEntry('action');
  if (entry.target !== undefined) {
    const { collection, id } = entry.target;
    if (typeof collection !== 'string' || typeof id !== 'string') throw invalidEntry('target');
  }
  // Throws on anything that is not canonical JSON.
  canonicalJson(entry);
}

/** Deep, JSON-only copy so later mutation of the caller's object cannot desync the hash. */
function cloneEntry(entry: AuditEntry): AuditEntry {
  return JSON.parse(canonicalJson(entry)) as AuditEntry;
}

function isRecord(value: unknown): value is AuditRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<AuditRecord>;
  if (
    r.v !== 1 ||
    typeof r.seq !== 'number' ||
    !Number.isSafeInteger(r.seq) ||
    typeof r.prev !== 'string' ||
    !HASH_PATTERN.test(r.prev) ||
    typeof r.hash !== 'string' ||
    !HASH_PATTERN.test(r.hash) ||
    typeof r.entry !== 'object' ||
    r.entry === null
  ) {
    return false;
  }
  try {
    assertEntry(r.entry);
    return true;
  } catch {
    return false;
  }
}

function invalidEntry(field: string): CryptoError {
  return new CryptoError('invalid-argument', `Invalid audit entry: ${field}`);
}
