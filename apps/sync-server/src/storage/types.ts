/**
 * Storage contract: one append-only log per space, ordered by a dense, 1-based `seq`.
 */
import type { Envelope, StoredEnvelope } from '../protocol.ts';

export interface AppendOptions {
  /** Refuse the append (QuotaExceededError) if the log would exceed this size. 0 = no limit. */
  maxBytes?: number;
}

export interface AppendOutcome {
  /** Newly stored envelopes, in log order, with their assigned seq. */
  stored: StoredEnvelope[];
  /** Ids that were already in the log (or repeated in the batch): not stored again. */
  duplicates: string[];
  /** Seq of the last envelope in the log after this append (0 when empty). */
  head: number;
}

export interface SpaceLog {
  /** Seq of the last durable envelope (0 when empty). */
  readonly head: number;
  /** Approximate stored size in bytes (used for quotas). */
  readonly bytes: number;
  /**
   * Appends the envelopes whose id is not already present, atomically: either all new
   * envelopes are stored (durably, according to the fsync policy) or none is.
   * Concurrent calls are serialized.
   */
  append(envelopes: readonly Envelope[], options?: AppendOptions): Promise<AppendOutcome>;
  /**
   * Reads envelopes with `seq > afterSeq`, at most `limit` of them and, beyond the first
   * one, at most about `maxBytes` of serialized data.
   */
  read(afterSeq: number, limit: number, maxBytes: number): Promise<StoredEnvelope[]>;
  /** Flushes and releases resources. The log must not be used afterwards. */
  close(): Promise<void>;
}

export interface Storage {
  /** Opens (creating if needed) the log of a space. A space must not be opened twice. */
  open(space: string): Promise<SpaceLog>;
  /** Closes every open log. */
  close(): Promise<void>;
}

export class QuotaExceededError extends Error {
  readonly code = 'quota_exceeded';
  constructor() {
    super('space storage quota exceeded');
    this.name = 'QuotaExceededError';
  }
}

export class StorageCorruptError extends Error {
  readonly code = 'storage_corrupt';
  constructor(message: string) {
    super(message);
    this.name = 'StorageCorruptError';
  }
}

/** Serialized form of one log record (one JSONL line, newline excluded). */
export function serializeRecord(entry: StoredEnvelope): string {
  return JSON.stringify({
    seq: entry.seq,
    id: entry.id,
    hlc: entry.hlc,
    node: entry.node,
    payload: entry.payload,
  });
}

/** Parses one log record; returns null if it is not a well-formed record. */
export function parseRecord(line: string): StoredEnvelope | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { seq, id, hlc, node, payload } = value as Record<string, unknown>;
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 1) return null;
  if (typeof id !== 'string' || typeof hlc !== 'string' || typeof node !== 'string') return null;
  if (typeof payload !== 'string') return null;
  return { id, hlc, node, payload, seq };
}

/** Bytes one record occupies in a JSONL log (including the newline). */
export function recordBytes(entry: StoredEnvelope): number {
  return Buffer.byteLength(serializeRecord(entry), 'utf8') + 1;
}
