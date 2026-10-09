import { COLLECTIONS, createId, DEFAULT_PREFS } from '@pouxis/core';
import type { CollectionName, Collections, UserPrefs } from '@pouxis/core';
import type { NewRecord, RecordPatch, Store, SyncStatus } from './types.ts';

type Tables = { [K in CollectionName]: Map<string, Collections[K]> };

const STORAGE_KEY = 'pouxis:v0';

/**
 * Minimal in-memory store persisted to localStorage. Placeholder for the CRDT-backed,
 * local-first implementation; keeps the `Store` contract so views do not change.
 */
export function createMemoryStore(seed?: (store: Store) => void): Store {
  const tables = Object.fromEntries(COLLECTIONS.map((c) => [c, new Map()])) as unknown as Tables;
  const cache = new Map<CollectionName, readonly unknown[]>();
  const listeners = new Set<() => void>();
  let prefs: UserPrefs = { ...DEFAULT_PREFS, timeZone: localZone() };
  let loaded = false;

  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as { prefs?: UserPrefs; tables?: Record<string, unknown[]> };
      if (data.prefs) prefs = { ...prefs, ...data.prefs };
      for (const name of COLLECTIONS) {
        for (const rec of (data.tables?.[name] ?? []) as { id: string }[]) {
          (tables[name] as Map<string, unknown>).set(rec.id, rec);
        }
      }
      loaded = true;
    }
  } catch {
    // Corrupt or unavailable storage: start empty.
  }

  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  function persist(): void {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        const out: Record<string, unknown[]> = {};
        for (const name of COLLECTIONS) out[name] = [...tables[name].values()];
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ prefs, tables: out }));
      } catch {
        // Quota or private mode: data stays in memory for this session.
      }
    }, 150);
  }

  function changed(name?: CollectionName): void {
    if (name) cache.delete(name);
    persist();
    for (const l of [...listeners]) l();
  }

  const store: Store = {
    all(name) {
      let list = cache.get(name);
      if (!list) {
        list = Object.freeze([...tables[name].values()]);
        cache.set(name, list);
      }
      return list as readonly Collections[typeof name][];
    },
    get(name, id) {
      return tables[name].get(id);
    },
    create<K extends CollectionName>(name: K, data: NewRecord<K>): Collections[K] {
      const now = Date.now();
      const rec = {
        ...data,
        id: data.id ?? createId(),
        createdAt: now,
        updatedAt: now,
      } as Collections[K];
      (tables[name] as Map<string, Collections[K]>).set(rec.id, rec);
      changed(name);
      return rec;
    },
    update<K extends CollectionName>(name: K, id: string, patch: RecordPatch<K>): void {
      const table = tables[name] as Map<string, Collections[K]>;
      const prev = table.get(id);
      if (!prev) return;
      table.set(id, { ...prev, ...patch, id, updatedAt: Date.now() });
      changed(name);
    },
    remove(name, id) {
      if (tables[name].delete(id)) changed(name);
    },
    prefs: () => prefs,
    setPrefs(patch) {
      prefs = { ...prefs, ...patch };
      changed();
    },
    syncStatus: (): SyncStatus => 'offline',
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  if (!loaded && seed) seed(store);
  return store;
}

function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_PREFS.timeZone;
  } catch {
    return DEFAULT_PREFS.timeZone;
  }
}
