/**
 * Compact JSON encoding of op batches (3.11). Collection names, record keys and HLC strings
 * are interned in tables, so a batch of edits to a few records repeats none of them:
 *
 *   [1, collections, keys, hlcs, ops]
 *   keys: [collectionIndex, id, ...]        (flattened pairs)
 *   op:   [keyIndex, hlcIndex]               delete
 *         [keyIndex, hlcIndex, field]        unset field
 *         [keyIndex, hlcIndex, field, value] set field
 */
import { SyncError } from './errors.ts';
import type { Json } from './json.ts';
import { validateOp, type Op } from './ops.ts';

export const BATCH_VERSION = 1;

type EncodedOp =
  | readonly [key: number, hlc: number]
  | readonly [key: number, hlc: number, field: string]
  | readonly [key: number, hlc: number, field: string, value: Json];

export function encodeBatch(ops: readonly Op[]): string {
  const collections = new Interner<string>();
  const keys = new Interner<string>();
  const keyPairs: (number | string)[] = [];
  const hlcs = new Interner<string>();
  const encoded: EncodedOp[] = [];
  for (const op of ops) {
    const c = collections.index(op.collection);
    const keyId = `${c}:${op.id}`;
    const known = keys.size();
    const k = keys.index(keyId);
    if (k === known) keyPairs.push(c, op.id);
    const h = hlcs.index(op.hlc);
    if (op.type === 'delete') encoded.push([k, h]);
    else if (op.value === undefined) encoded.push([k, h, op.field]);
    else encoded.push([k, h, op.field, op.value]);
  }
  return JSON.stringify([BATCH_VERSION, collections.values(), keyPairs, hlcs.values(), encoded]);
}

/** Decodes and validates a batch. Throws `SyncError('decode')` on any malformed input. */
export function decodeBatch(text: string): Op[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (cause) {
    throw new SyncError('decode', 'batch is not valid JSON', { cause });
  }
  if (!Array.isArray(raw) || raw.length !== 5 || raw[0] !== BATCH_VERSION) {
    throw decodeError('unsupported batch format');
  }
  const [, collections, keyPairs, hlcs, encoded] = raw as unknown[];
  if (!isStringArray(collections) || !isStringArray(hlcs) || !Array.isArray(keyPairs)) {
    throw decodeError('malformed batch tables');
  }
  if (keyPairs.length % 2 !== 0 || !Array.isArray(encoded)) throw decodeError('malformed batch');
  const keys: Array<[string, string]> = [];
  for (let i = 0; i < keyPairs.length; i += 2) {
    const collection = at(collections, keyPairs[i]);
    const id: unknown = keyPairs[i + 1];
    if (collection === undefined || typeof id !== 'string') throw decodeError('malformed key');
    keys.push([collection, id]);
  }
  return encoded.map((item: unknown) => {
    if (!Array.isArray(item) || item.length < 2 || item.length > 4) {
      throw decodeError('malformed op');
    }
    const key = at(keys, item[0]);
    const hlc = at(hlcs, item[1]);
    if (!key || hlc === undefined) throw decodeError('op references an unknown key or HLC');
    const [collection, id] = key;
    const op =
      item.length === 2
        ? { type: 'delete', collection, id, hlc }
        : item.length === 3
          ? { type: 'set', collection, id, hlc, field: item[2] }
          : { type: 'set', collection, id, hlc, field: item[2], value: item[3] };
    try {
      return validateOp(op);
    } catch (cause) {
      throw new SyncError('decode', 'invalid op in batch', { cause });
    }
  });
}

function decodeError(message: string): SyncError {
  return new SyncError('decode', message);
}

/** Table lookup that only accepts integer indexes (`"0"` must not resolve). */
function at<T>(table: readonly T[], index: unknown): T | undefined {
  return Number.isInteger(index) ? table[index as number] : undefined;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

class Interner<T> {
  private readonly map = new Map<T, number>();
  private readonly list: T[] = [];

  index(value: T): number {
    let i = this.map.get(value);
    if (i === undefined) {
      i = this.list.length;
      this.map.set(value, i);
      this.list.push(value);
    }
    return i;
  }

  size(): number {
    return this.list.length;
  }

  values(): T[] {
    return this.list;
  }
}
