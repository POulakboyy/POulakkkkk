/**
 * Replication operations. Every state change of a replica is one of these; ops are
 * self-describing (no causal context needed) so they can be applied in any order, any number
 * of times.
 */
import { SyncError } from './errors.ts';
import { isValidHlc } from './hlc.ts';
import { freezeJson, type Json } from './json.ts';

/** Sets (or, without `value`, unsets) one top-level field of a record. */
export interface SetOp {
  readonly type: 'set';
  readonly collection: string;
  readonly id: string;
  readonly field: string;
  readonly hlc: string;
  /** Absent: the field is unset (the model omits absent optional fields). */
  readonly value?: Json;
}

/** Deletes a record. Deletion is final for that id (see README, "Tombstones"). */
export interface DeleteOp {
  readonly type: 'delete';
  readonly collection: string;
  readonly id: string;
  readonly hlc: string;
}

export type Op = SetOp | DeleteOp;

const MAX_NAME_LENGTH = 256;
/** Field names that would collide with object internals when a record is materialized. */
const RESERVED_FIELDS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

function isName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_NAME_LENGTH;
}

export function isValidField(field: unknown): field is string {
  return isName(field) && !RESERVED_FIELDS.has(field);
}

/**
 * Validates an untrusted op (decoded from the wire or a snapshot) and returns a frozen,
 * normalized copy. Throws `SyncError('invalid')`.
 */
export function validateOp(value: unknown): Op {
  if (typeof value !== 'object' || value === null) throw invalid('op must be an object');
  const v = value as Record<string, unknown>;
  const { type, collection, id, hlc } = v;
  if (!isName(collection)) throw invalid('op.collection: invalid');
  if (!isName(id)) throw invalid('op.id: invalid');
  if (!isValidHlc(hlc)) throw invalid('op.hlc: invalid');
  if (type === 'delete') return Object.freeze({ type, collection, id, hlc });
  if (type !== 'set') throw invalid('op.type: unknown');
  const field = v['field'];
  if (!isValidField(field)) throw invalid('op.field: invalid');
  if (v['value'] === undefined) return Object.freeze({ type, collection, id, field, hlc });
  let json: Json;
  try {
    json = freezeJson(v['value'], 'op.value');
  } catch (cause) {
    throw new SyncError('invalid', 'op.value: not JSON', { cause });
  }
  return Object.freeze({ type, collection, id, field, hlc, value: json });
}

function invalid(message: string): SyncError {
  return new SyncError('invalid', message);
}
