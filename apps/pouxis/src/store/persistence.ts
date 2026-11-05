import type { sync } from '@pouxis/core';

/** What a store finds on disk at start-up: the last snapshot plus the ops appended since. */
export interface PersistedState {
  snapshot?: sync.ReplicaSnapshot;
  /** Op batches appended after the snapshot, oldest first. */
  batches: sync.Op[][];
}

/**
 * Durable storage of a replica: a snapshot plus an append-only op log, and a small key/value
 * area for device metadata (device id, sync configuration, sync key handle, sync cursors).
 *
 * Every write is merge-safe: ops and snapshots are CRDT state, so replaying a batch twice or
 * loading a snapshot written by another tab never loses data.
 */
export interface Persistence {
  readonly kind: 'indexeddb' | 'memory';
  load(): Promise<PersistedState>;
  /** Synchronous load, when the backend can (memory). Lets a store be ready immediately. */
  loadSync?(): PersistedState;
  /** Synchronous metadata read, when the backend can (memory). */
  getMetaSync?<T>(key: string): T | undefined;
  append(ops: readonly sync.Op[]): Promise<void>;
  /**
   * Atomically replaces the snapshot and the op log with one snapshot. `merge` receives what is
   * currently stored (possibly written by another tab) and returns the snapshot to keep; it
   * must be synchronous so the backend can run it inside a single transaction.
   */
  compact(merge: (stored: PersistedState) => sync.ReplicaSnapshot): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  deleteMeta(key: string): Promise<void>;
  /** Erases everything this device stores. */
  clear(): Promise<void>;
  close(): void;
}

/** Contents of an in-memory "disk"; share one between stores to simulate a reload. */
export interface MemoryDisk {
  snapshot?: string;
  batches: string[];
  meta: Map<string, unknown>;
}

export function createMemoryDisk(): MemoryDisk {
  return { batches: [], meta: new Map() };
}

/**
 * Persistence that keeps everything in memory, used when IndexedDB is unavailable (tests,
 * private modes that block it). Values are serialized like a real backend would, so callers
 * cannot rely on sharing object references with what they stored (except opaque meta values
 * such as `CryptoKey` handles, kept as is).
 */
export function createMemoryPersistence(disk: MemoryDisk = createMemoryDisk()): Persistence {
  const read = (): PersistedState => {
    const state: PersistedState = {
      batches: disk.batches.map((raw) => JSON.parse(raw) as sync.Op[]),
    };
    if (disk.snapshot) state.snapshot = JSON.parse(disk.snapshot) as sync.ReplicaSnapshot;
    return state;
  };
  return {
    kind: 'memory',
    loadSync: read,
    load: async () => read(),
    async append(ops) {
      if (ops.length > 0) disk.batches.push(JSON.stringify(ops));
    },
    async compact(merge) {
      disk.snapshot = JSON.stringify(merge(read()));
      disk.batches = [];
    },
    getMetaSync: <T>(key: string) => disk.meta.get(key) as T | undefined,
    getMeta: async <T>(key: string) => disk.meta.get(key) as T | undefined,
    async setMeta(key, value) {
      disk.meta.set(key, value);
    },
    async deleteMeta(key) {
      disk.meta.delete(key);
    },
    async clear() {
      delete disk.snapshot;
      disk.batches = [];
      disk.meta.clear();
    },
    close() {},
  };
}
