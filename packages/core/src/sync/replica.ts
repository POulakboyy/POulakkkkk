/**
 * A replica: field-level last-writer-wins map of records, grouped by collection.
 *
 * Every field of every record is an LWW register ordered by HLC timestamp (exact ties, only
 * possible when two replicas share a node id, are broken by the canonical JSON order of the
 * values). A record deletion is a tombstone that wins over every field write, before or
 * after it (see README, "Tombstones"). Merging is a join of registers, hence `apply` is
 * idempotent, commutative and associative: replicas that received the same set of ops hold
 * the same state, whatever the order or duplication of deliveries.
 */
import { SyncError, isSyncError } from './errors.ts';
import {
  compareHlc,
  createHlc,
  hlcNode,
  hlcWall,
  isValidHlc,
  maxHlc,
  type HybridClock,
} from './hlc.ts';
import { compareJson, freezeJson, jsonEqual, type Json } from './json.ts';
import { isValidField, validateOp, type DeleteOp, type Op, type SetOp } from './ops.ts';
import { applyTextPatch, diffText, type TextPatch } from './text.ts';

export type RecordValue = { readonly [field: string]: Json };
/** Fields to write; a field set to `undefined` is unset. */
export type Patch = { readonly [field: string]: unknown };
/** Highest HLC timestamp seen from each node. */
export type VersionVector = { readonly [node: string]: string };

export interface RecordRef {
  readonly collection: string;
  readonly id: string;
}

export interface ReplicaChange {
  readonly source: 'local' | 'remote';
  /** Ops that changed the state, in application order. */
  readonly ops: readonly Op[];
  /** Records whose materialized value may have changed (deduplicated). */
  readonly records: readonly RecordRef[];
}

export type ReplicaListener = (change: ReplicaChange) => void;

export interface HistoryEntry {
  readonly hlc: string;
  readonly node: string;
  /** Wall-clock time of the write, epoch milliseconds (from the HLC). */
  readonly at: number;
  /** Absent when the write unset the field. */
  readonly value?: Json;
}

export interface ReplicaOptions {
  nodeId: string;
  /** Physical clock, epoch milliseconds. Defaults to `Date.now`. */
  now?: () => number;
  /** Tolerated clock lead of remote nodes (see `createHlc`). */
  maxDriftMs?: number;
  /**
   * Fields whose successive values are retained, per collection, e.g. `{ blocks: ['text'] }`.
   * History is local: it holds the writes this replica observed (see README).
   */
  history?: { readonly [collection: string]: readonly string[] };
  /** Entries kept per field history. Default 50. */
  historyLimit?: number;
}

export interface ApplyResult {
  /** Ops that changed the state. */
  readonly applied: readonly Op[];
  /** Ops held back because their clock is too far ahead (retried on later applies). */
  readonly deferred: number;
}

export interface CompactOptions {
  /**
   * Drop tombstones older than this HLC timestamp. Only safe when every replica has seen all
   * ops up to it (e.g. the minimum of all known version vectors). Later ops older than the
   * horizon that target an unknown record are discarded.
   */
  horizon?: string;
  /** Trim field histories to this many entries (default: the replica's `historyLimit`). */
  historyLimit?: number;
}

export interface CompactResult {
  readonly tombstonesRemoved: number;
  readonly historyEntriesRemoved: number;
}

/** Serializable replica state (JSON). */
export interface ReplicaSnapshot {
  readonly v: 1;
  readonly node: string;
  readonly clock: string;
  readonly horizon: string | null;
  readonly vv: VersionVector;
  /** `[collection, id, tombstone, [field, hlc, value?][]]` */
  readonly records: readonly SnapshotRecord[];
  /** `[collection, id, field, entries]`, entries oldest first (see `encodeHistory`). */
  readonly history: readonly SnapshotHistory[];
  readonly deferred: readonly Op[];
}

export type SnapshotRecord = readonly [
  collection: string,
  id: string,
  tombstone: string | null,
  fields: readonly SnapshotField[],
];
export type SnapshotField = readonly [field: string, hlc: string, value?: Json];
export type SnapshotHistory = readonly [
  collection: string,
  id: string,
  field: string,
  entries: readonly SnapshotHistoryEntry[],
];
/** `[hlc, 0]` unset · `[hlc, 1, value]` full value · `[hlc, 2, patch]` text patch from next. */
export type SnapshotHistoryEntry =
  | readonly [hlc: string, kind: 0]
  | readonly [hlc: string, kind: 1, value: Json]
  | readonly [hlc: string, kind: 2, patch: TextPatch];

export interface Replica {
  readonly node: string;
  /** Records a local change and returns the ops to replicate (empty when nothing changed). */
  change(collection: string, id: string, patch: Patch | 'delete'): Op[];
  /** Merges ops from any source. Idempotent, commutative, associative. */
  apply(ops: readonly Op[]): ApplyResult;
  get(collection: string, id: string): RecordValue | undefined;
  /** Live records of a collection, ordered by id. */
  all(collection: string): ReadonlyMap<string, RecordValue>;
  /** Collections that hold at least one live record. */
  collections(): string[];
  isDeleted(collection: string, id: string): boolean;
  versionVector(): VersionVector;
  /**
   * State delta not covered by `vv`: the winning register or tombstone of every field whose
   * timestamp is newer than what `vv` reports for its node, sorted by HLC. With `origin`, only
   * entries written by that node.
   */
  opsSince(vv?: VersionVector, options?: { origin?: string }): Op[];
  history(collection: string, id: string, field: string): HistoryEntry[];
  deferred(): readonly Op[];
  snapshot(): ReplicaSnapshot;
  /** Merges a snapshot (any node's) into this replica. */
  load(snapshot: ReplicaSnapshot): ApplyResult;
  compact(options?: CompactOptions): CompactResult;
  subscribe(listener: ReplicaListener): () => void;
  /** The last HLC timestamp issued by this replica's clock. */
  clock(): string;
}

interface Register {
  hlc: string;
  value?: Json;
}

interface RecordState {
  fields: Map<string, Register>;
  tombstone?: string;
  cache?: RecordValue;
}

const DEFAULT_HISTORY_LIMIT = 50;
const KEY_SEP = '\u0000';

export function createReplica(options: ReplicaOptions): Replica {
  const node = options.nodeId;
  const now = options.now ?? Date.now;
  const clock: { current: HybridClock } = {
    current: createHlc(node, now, maxDriftOption(options)),
  };
  const historyLimit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT;
  const tracked = new Map<string, ReadonlySet<string>>(
    Object.entries(options.history ?? {}).map(([c, fields]) => [c, new Set(fields)]),
  );

  const data = new Map<string, Map<string, RecordState>>();
  const vv = new Map<string, string>();
  const histories = new Map<string, HistoryEntry[]>();
  const listeners = new Set<ReplicaListener>();
  let deferredOps: Op[] = [];
  let horizon: string | undefined;

  const recordOf = (collection: string, id: string, create: boolean): RecordState | undefined => {
    let coll = data.get(collection);
    if (!coll) {
      if (!create) return undefined;
      coll = new Map();
      data.set(collection, coll);
    }
    let rec = coll.get(id);
    if (!rec && create) {
      rec = { fields: new Map() };
      coll.set(id, rec);
    }
    return rec;
  };

  const noteSeen = (hlc: string): void => {
    const origin = hlcNode(hlc);
    const prev = vv.get(origin);
    if (prev === undefined || hlc > prev) vv.set(origin, hlc);
  };

  const recordHistory = (op: SetOp): void => {
    if (!tracked.get(op.collection)?.has(op.field)) return;
    const key = historyKey(op.collection, op.id, op.field);
    const entries = histories.get(key) ?? [];
    const entry = historyEntry(op.hlc, op.value);
    insertHistory(entries, entry, historyLimit);
    histories.set(key, entries);
  };

  /** Applies one validated op; returns whether the state changed. */
  const applyOp = (op: Op): boolean => {
    noteSeen(op.hlc);
    const known = recordOf(op.collection, op.id, false);
    if (!known && horizon !== undefined && op.hlc < horizon) return false;
    const rec = known ?? (recordOf(op.collection, op.id, true) as RecordState);
    if (op.type === 'delete') {
      if (rec.tombstone !== undefined && rec.tombstone >= op.hlc) return false;
      rec.tombstone = op.hlc;
      rec.fields.clear();
      rec.cache = undefined;
      dropHistory(op.collection, op.id);
      return true;
    }
    if (rec.tombstone !== undefined) return false;
    const reg = rec.fields.get(op.field);
    recordHistory(op);
    if (reg && !wins(op, reg)) return false;
    rec.fields.set(
      op.field,
      op.value === undefined ? { hlc: op.hlc } : { hlc: op.hlc, value: op.value },
    );
    rec.cache = undefined;
    return true;
  };

  const dropHistory = (collection: string, id: string): void => {
    const fields = tracked.get(collection);
    if (!fields) return;
    for (const field of fields) histories.delete(historyKey(collection, id, field));
  };

  const emit = (source: ReplicaChange['source'], ops: readonly Op[]): void => {
    if (ops.length === 0 || listeners.size === 0) return;
    const seen = new Set<string>();
    const records: RecordRef[] = [];
    for (const op of ops) {
      const key = op.collection + KEY_SEP + op.id;
      if (seen.has(key)) continue;
      seen.add(key);
      records.push({ collection: op.collection, id: op.id });
    }
    const change: ReplicaChange = Object.freeze({ source, ops, records });
    for (const listener of [...listeners]) listener(change);
  };

  /** Applies remote ops: clock merge (deferring drifted ops), then state merge. */
  const merge = (ops: readonly Op[]): { applied: Op[]; deferred: number } => {
    const queue = deferredOps.length > 0 ? [...deferredOps, ...ops] : ops;
    deferredOps = [];
    const applied: Op[] = [];
    const deferredIds = new Set<string>();
    for (const raw of queue) {
      const op = validateOp(raw);
      try {
        clock.current.receive(op.hlc);
      } catch (error) {
        if (!isSyncError(error, 'clock-drift')) throw error;
        const key = opKey(op);
        if (!deferredIds.has(key)) {
          deferredIds.add(key);
          deferredOps.push(op);
        }
        continue;
      }
      if (applyOp(op)) applied.push(op);
    }
    return { applied, deferred: deferredOps.length };
  };

  const materialize = (rec: RecordState): RecordValue => {
    if (rec.cache) return rec.cache;
    const out: { [field: string]: Json } = {};
    for (const [field, reg] of [...rec.fields].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      if (reg.value !== undefined) out[field] = reg.value;
    }
    rec.cache = Object.freeze(out);
    return rec.cache;
  };

  const isLive = (rec: RecordState | undefined): rec is RecordState =>
    rec !== undefined && rec.tombstone === undefined && rec.fields.size > 0;

  const replica: Replica = {
    node,

    change(collection, id, patch) {
      if (!collection || !id) throw new SyncError('invalid', 'collection and id are required');
      const rec = recordOf(collection, id, false);
      if (patch === 'delete') {
        if (rec?.tombstone !== undefined) return [];
        const op: DeleteOp = Object.freeze({
          type: 'delete',
          collection,
          id,
          hlc: clock.current.tick(),
        });
        applyOp(op);
        emit('local', [op]);
        return [op];
      }
      if (rec?.tombstone !== undefined) return [];
      const writes: Array<[string, Json | undefined]> = [];
      for (const field of Object.keys(patch)) {
        if (!isValidField(field)) throw new SyncError('invalid', `invalid field name: ${field}`);
        const raw = patch[field];
        const value = raw === undefined ? undefined : freezeJson(raw, `${collection}.${field}`);
        const reg = rec?.fields.get(field);
        if (reg && jsonEqual(reg.value, value)) continue;
        if (!reg && value === undefined) continue;
        writes.push([field, value]);
      }
      if (writes.length === 0) return [];
      const hlc = clock.current.tick();
      const ops: SetOp[] = writes.map(([field, value]) =>
        Object.freeze(
          value === undefined
            ? { type: 'set' as const, collection, id, field, hlc }
            : { type: 'set' as const, collection, id, field, hlc, value },
        ),
      );
      for (const op of ops) applyOp(op);
      emit('local', ops);
      return ops;
    },

    apply(ops) {
      const result = merge(ops);
      emit('remote', result.applied);
      return result;
    },

    get(collection, id) {
      const rec = recordOf(collection, id, false);
      return isLive(rec) ? materialize(rec) : undefined;
    },

    all(collection) {
      const out = new Map<string, RecordValue>();
      const coll = data.get(collection);
      if (!coll) return out;
      for (const id of [...coll.keys()].sort()) {
        const rec = coll.get(id);
        if (isLive(rec)) out.set(id, materialize(rec));
      }
      return out;
    },

    collections() {
      return [...data.keys()]
        .filter((name) => [...(data.get(name)?.values() ?? [])].some(isLive))
        .sort();
    },

    isDeleted(collection, id) {
      return recordOf(collection, id, false)?.tombstone !== undefined;
    },

    versionVector() {
      return Object.freeze(Object.fromEntries([...vv].sort(([a], [b]) => (a < b ? -1 : 1))));
    },

    opsSince(since = {}, opts = {}) {
      const out: Op[] = [];
      const newer = (hlc: string): boolean => {
        const origin = hlcNode(hlc);
        if (opts.origin !== undefined && origin !== opts.origin) return false;
        const seen = Object.prototype.hasOwnProperty.call(since, origin)
          ? since[origin]
          : undefined;
        return seen === undefined || hlc > seen;
      };
      for (const [collection, coll] of data) {
        for (const [id, rec] of coll) {
          if (rec.tombstone !== undefined) {
            if (newer(rec.tombstone))
              out.push({ type: 'delete', collection, id, hlc: rec.tombstone });
            continue;
          }
          for (const [field, reg] of rec.fields) {
            if (!newer(reg.hlc)) continue;
            out.push(
              reg.value === undefined
                ? { type: 'set', collection, id, field, hlc: reg.hlc }
                : { type: 'set', collection, id, field, hlc: reg.hlc, value: reg.value },
            );
          }
        }
      }
      return out.sort((a, b) => compareHlc(a.hlc, b.hlc));
    },

    history(collection, id, field) {
      return [...(histories.get(historyKey(collection, id, field)) ?? [])];
    },

    deferred() {
      return [...deferredOps];
    },

    snapshot() {
      const records: SnapshotRecord[] = [];
      for (const [collection, coll] of data) {
        for (const [id, rec] of coll) {
          const fields: SnapshotField[] = [...rec.fields].map(([field, reg]) =>
            reg.value === undefined ? [field, reg.hlc] : [field, reg.hlc, reg.value],
          );
          records.push([collection, id, rec.tombstone ?? null, fields]);
        }
      }
      const history: SnapshotHistory[] = [];
      for (const [key, entries] of histories) {
        const [collection, id, field] = key.split(KEY_SEP) as [string, string, string];
        history.push([collection, id, field, encodeHistory(entries)]);
      }
      return {
        v: 1,
        node,
        clock: clock.current.peek(),
        horizon: horizon ?? null,
        vv: replica.versionVector(),
        records,
        history,
        deferred: [...deferredOps],
      };
    },

    load(snapshot) {
      const ops = snapshotOps(snapshot);
      if (snapshot.node === node) {
        try {
          clock.current.receive(snapshot.clock);
        } catch (error) {
          if (!isSyncError(error, 'clock-drift')) throw error;
          clock.current = createHlc(node, now, {
            ...maxDriftOption(options),
            last: snapshot.clock,
          });
        }
      }
      if (snapshot.horizon !== null) horizon = maxHlc(horizon, snapshot.horizon);
      const result = merge(ops);
      for (const hlc of Object.values(snapshot.vv)) noteSeen(hlc);
      for (const [collection, id, field, entries] of snapshot.history) {
        if (!tracked.get(collection)?.has(field) || !isLive(recordOf(collection, id, false)))
          continue;
        const key = historyKey(collection, id, field);
        const merged = histories.get(key) ?? [];
        for (const entry of decodeHistory(entries)) insertHistory(merged, entry, historyLimit);
        histories.set(key, merged);
      }
      emit('remote', result.applied);
      return result;
    },

    compact(opts = {}) {
      let tombstonesRemoved = 0;
      let historyEntriesRemoved = 0;
      if (opts.horizon !== undefined) {
        if (!isValidHlc(opts.horizon)) throw new SyncError('invalid', 'horizon: invalid HLC');
        horizon = maxHlc(horizon, opts.horizon);
        for (const coll of data.values()) {
          for (const [id, rec] of coll) {
            if (rec.tombstone !== undefined && rec.tombstone < opts.horizon) {
              coll.delete(id);
              tombstonesRemoved++;
            }
          }
        }
      }
      const limit = opts.historyLimit ?? historyLimit;
      for (const entries of histories.values()) {
        if (entries.length > limit) {
          historyEntriesRemoved += entries.length - limit;
          entries.splice(0, entries.length - limit);
        }
      }
      return { tombstonesRemoved, historyEntriesRemoved };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    clock() {
      return clock.current.peek();
    },
  };
  return replica;
}

function maxDriftOption(options: ReplicaOptions): { maxDriftMs?: number } {
  return options.maxDriftMs === undefined ? {} : { maxDriftMs: options.maxDriftMs };
}

/** LWW order: later HLC wins; an exact tie falls back to the canonical value order. */
function wins(op: SetOp, reg: Register): boolean {
  const byClock = compareHlc(op.hlc, reg.hlc);
  if (byClock !== 0) return byClock > 0;
  return compareJson(op.value, reg.value) > 0;
}

function opKey(op: Op): string {
  return op.type === 'delete'
    ? `d${KEY_SEP}${op.collection}${KEY_SEP}${op.id}${KEY_SEP}${op.hlc}`
    : `s${KEY_SEP}${op.collection}${KEY_SEP}${op.id}${KEY_SEP}${op.field}${KEY_SEP}${op.hlc}`;
}

function historyKey(collection: string, id: string, field: string): string {
  return collection + KEY_SEP + id + KEY_SEP + field;
}

function historyEntry(hlc: string, value: Json | undefined): HistoryEntry {
  const base = { hlc, node: hlcNode(hlc), at: hlcWall(hlc) };
  return Object.freeze(value === undefined ? base : { ...base, value });
}

/** Inserts in HLC order (deduplicated by HLC) and keeps the newest `limit` entries. */
function insertHistory(entries: HistoryEntry[], entry: HistoryEntry, limit: number): void {
  let i = entries.length;
  while (i > 0 && (entries[i - 1] as HistoryEntry).hlc > entry.hlc) i--;
  if (i > 0 && (entries[i - 1] as HistoryEntry).hlc === entry.hlc) return;
  entries.splice(i, 0, entry);
  if (entries.length > limit) entries.splice(0, entries.length - limit);
}

/**
 * History entries, oldest first. A string value followed by a newer string value is stored as
 * the text patch that turns the newer one back into it: successive versions of a text block
 * usually differ by a few characters.
 */
export function encodeHistory(entries: readonly HistoryEntry[]): SnapshotHistoryEntry[] {
  return entries.map((entry, i): SnapshotHistoryEntry => {
    if (entry.value === undefined) return [entry.hlc, 0];
    const next = entries[i + 1]?.value;
    if (typeof entry.value === 'string' && typeof next === 'string') {
      const patch = diffText(next, entry.value);
      if (JSON.stringify(patch).length < JSON.stringify(entry.value).length) {
        return [entry.hlc, 2, patch];
      }
    }
    return [entry.hlc, 1, entry.value];
  });
}

export function decodeHistory(entries: readonly SnapshotHistoryEntry[]): HistoryEntry[] {
  const out: HistoryEntry[] = new Array<HistoryEntry>(entries.length);
  let next: Json | undefined;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!Array.isArray(entry) || !isValidHlc(entry[0])) {
      throw new SyncError('invalid', 'snapshot history entry: malformed');
    }
    let value: Json | undefined;
    if (entry[1] === 1) value = freezeJson(entry[2]);
    else if (entry[1] === 2) {
      if (typeof next !== 'string') throw new SyncError('invalid', 'history patch without base');
      value = applyTextPatch(next, entry[2] as TextPatch);
    } else if (entry[1] !== 0) throw new SyncError('invalid', 'snapshot history kind: unknown');
    out[i] = historyEntry(entry[0], value);
    next = value;
  }
  return out;
}

function snapshotOps(snapshot: ReplicaSnapshot): Op[] {
  if (
    typeof snapshot !== 'object' ||
    snapshot === null ||
    snapshot.v !== 1 ||
    !Array.isArray(snapshot.records) ||
    !Array.isArray(snapshot.history) ||
    !Array.isArray(snapshot.deferred) ||
    typeof snapshot.vv !== 'object' ||
    snapshot.vv === null
  ) {
    throw new SyncError('invalid', 'unsupported replica snapshot');
  }
  for (const hlc of Object.values(snapshot.vv)) {
    if (!isValidHlc(hlc)) throw new SyncError('invalid', 'snapshot vv: invalid HLC');
  }
  if (snapshot.horizon !== null && !isValidHlc(snapshot.horizon)) {
    throw new SyncError('invalid', 'snapshot horizon: invalid HLC');
  }
  const ops: Op[] = [];
  for (const record of snapshot.records) {
    if (!Array.isArray(record) || !Array.isArray(record[3])) {
      throw new SyncError('invalid', 'snapshot record: malformed');
    }
    const [collection, id, tombstone, fields] = record;
    if (tombstone !== null) {
      ops.push(validateOp({ type: 'delete', collection, id, hlc: tombstone }));
      continue;
    }
    for (const entry of fields) {
      if (!Array.isArray(entry)) throw new SyncError('invalid', 'snapshot field: malformed');
      const [field, hlc] = entry;
      ops.push(
        validateOp(
          entry.length > 2
            ? { type: 'set', collection, id, field, hlc, value: entry[2] }
            : { type: 'set', collection, id, field, hlc },
        ),
      );
    }
  }
  for (const op of snapshot.deferred) ops.push(validateOp(op));
  return ops;
}
