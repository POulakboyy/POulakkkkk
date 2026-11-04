import type { sync } from '@pouxis/core';
import type { PersistedState, Persistence } from './persistence.ts';

const DB_VERSION = 1;
const SNAPSHOT = 'snapshot';
const OPLOG = 'oplog';
const META = 'meta';
const SNAPSHOT_KEY = 'replica';

export const DEFAULT_DB_NAME = 'pouxis';

export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    // Some privacy modes throw on mere access.
    return false;
  }
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}

function openDb(name: string): Promise<IDBDatabase> {
  const req = indexedDB.open(name, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(SNAPSHOT)) db.createObjectStore(SNAPSHOT);
    if (!db.objectStoreNames.contains(OPLOG)) db.createObjectStore(OPLOG, { autoIncrement: true });
    if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
  };
  return request(req).then((db) => {
    // Another tab upgrading the schema: step aside instead of blocking it.
    db.onversionchange = () => db.close();
    return db;
  });
}

/**
 * IndexedDB backend: `snapshot` (one replica snapshot), `oplog` (auto-increment op batches),
 * `meta` (structured-clone values, which keeps `CryptoKey` handles non-extractable).
 * Compaction reads the stored snapshot and log, merges them and rewrites them in a single
 * read-write transaction, so ops appended concurrently by another tab are never dropped.
 */
export function createIndexedDbPersistence(name: string = DEFAULT_DB_NAME): Persistence {
  let dbPromise: Promise<IDBDatabase> | undefined;
  const db = (): Promise<IDBDatabase> => (dbPromise ??= openDb(name));

  return {
    kind: 'indexeddb',
    async load() {
      const tx = (await db()).transaction([SNAPSHOT, OPLOG], 'readonly');
      const [snapshot, batches] = await Promise.all([
        request(tx.objectStore(SNAPSHOT).get(SNAPSHOT_KEY) as IDBRequest<sync.ReplicaSnapshot>),
        request(tx.objectStore(OPLOG).getAll() as IDBRequest<sync.Op[][]>),
      ]);
      const state: PersistedState = { batches };
      if (snapshot) state.snapshot = snapshot;
      return state;
    },
    async append(ops) {
      if (ops.length === 0) return;
      const tx = (await db()).transaction(OPLOG, 'readwrite');
      tx.objectStore(OPLOG).add(ops);
      await done(tx);
    },
    async compact(merge) {
      const tx = (await db()).transaction([SNAPSHOT, OPLOG], 'readwrite');
      const snapshots = tx.objectStore(SNAPSHOT);
      const log = tx.objectStore(OPLOG);
      let failure: unknown;
      const finished = done(tx).catch((error: unknown) => {
        throw failure ?? error;
      });
      const snapReq = snapshots.get(SNAPSHOT_KEY) as IDBRequest<sync.ReplicaSnapshot | undefined>;
      const keysReq = log.getAllKeys();
      const logReq = log.getAll() as IDBRequest<sync.Op[][]>;
      // Requests of one transaction complete in order: when the last one succeeds, all have.
      logReq.onsuccess = () => {
        const stored: PersistedState = { batches: logReq.result };
        if (snapReq.result) stored.snapshot = snapReq.result;
        let merged: sync.ReplicaSnapshot;
        try {
          merged = merge(stored);
        } catch (error) {
          failure = error;
          tx.abort();
          return;
        }
        snapshots.put(merged, SNAPSHOT_KEY);
        const last = keysReq.result[keysReq.result.length - 1];
        if (last !== undefined) log.delete(IDBKeyRange.upperBound(last));
      };
      await finished;
    },
    async getMeta<T>(key: string) {
      const tx = (await db()).transaction(META, 'readonly');
      return (await request(tx.objectStore(META).get(key))) as T | undefined;
    },
    async setMeta(key, value) {
      const tx = (await db()).transaction(META, 'readwrite');
      tx.objectStore(META).put(value, key);
      await done(tx);
    },
    async deleteMeta(key) {
      const tx = (await db()).transaction(META, 'readwrite');
      tx.objectStore(META).delete(key);
      await done(tx);
    },
    async clear() {
      const tx = (await db()).transaction([SNAPSHOT, OPLOG, META], 'readwrite');
      for (const store of [SNAPSHOT, OPLOG, META]) tx.objectStore(store).clear();
      await done(tx);
    },
    close() {
      void dbPromise?.then((d) => d.close());
      dbPromise = undefined;
    },
  };
}
