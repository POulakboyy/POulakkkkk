/**
 * Test helpers for lab features: record factories and an in-memory fake of `src/store`, so the
 * tests do not depend on the real store's internals or demo seed.
 */
import { useSyncExternalStore } from 'react';
import {
  DEFAULT_PREFS,
  type CollectionName,
  type Collections,
  type JournalEntry,
  type Task,
  type UserPrefs,
} from '@pouxis/core';

/** Thursday 5 November 2026, 17:00 in Paris (16:00 UTC). */
export const NOW = Date.UTC(2026, 10, 5, 16, 0);
export const TZ = 'Europe/Paris';
export const PREFS: UserPrefs = { ...DEFAULT_PREFS, timeZone: TZ, locale: 'fr' };

let seq = 0;

export function makeTask(patch: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    createdAt: NOW - 86_400_000,
    updatedAt: NOW - 86_400_000,
    title: `Task ${seq}`,
    status: 'todo',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'organize',
    postponedCount: 0,
    timeLogs: [],
    ...patch,
  };
}

export function makeEntry(patch: Partial<JournalEntry> = {}): JournalEntry {
  seq += 1;
  return {
    id: `j${seq}`,
    createdAt: NOW,
    updatedAt: NOW,
    kind: 'dump',
    text: '',
    tags: [],
    ...patch,
  };
}

type Tables = { [K in CollectionName]: Collections[K][] };

/** Minimal synchronous store with the same public surface as `src/store`. */
export function createFakeStore() {
  let tables: Tables = { tasks: [], events: [], notes: [], journal: [], graphs: [] };
  let prefs = PREFS;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  let id = 0;

  const store = {
    all: <K extends CollectionName>(name: K): readonly Collections[K][] => tables[name],
    get: <K extends CollectionName>(name: K, key: string) =>
      (tables[name] as Collections[K][]).find((r) => r.id === key),
    create<K extends CollectionName>(
      name: K,
      data: Omit<Collections[K], 'id' | 'createdAt' | 'updatedAt'>,
    ) {
      id += 1;
      const now = Date.now();
      const rec = { ...data, id: `new${id}`, createdAt: now, updatedAt: now } as Collections[K];
      tables = { ...tables, [name]: [...tables[name], rec] };
      emit();
      return rec;
    },
    update<K extends CollectionName>(name: K, key: string, patch: Partial<Collections[K]>) {
      const list = tables[name] as Collections[K][];
      tables = {
        ...tables,
        [name]: list.map((r) => (r.id === key ? { ...r, ...patch, updatedAt: Date.now() } : r)),
      };
      emit();
    },
    remove<K extends CollectionName>(name: K, key: string) {
      tables = {
        ...tables,
        [name]: (tables[name] as Collections[K][]).filter((r) => r.id !== key),
      };
      emit();
    },
    prefs: () => prefs,
    setPrefs(patch: Partial<UserPrefs>) {
      prefs = { ...prefs, ...patch };
      emit();
    },
    syncStatus: () => 'offline' as const,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Test-only: replace a whole collection. */
    seed<K extends CollectionName>(name: K, rows: Collections[K][]) {
      tables = { ...tables, [name]: rows };
      emit();
    },
    reset() {
      tables = { tasks: [], events: [], notes: [], journal: [], graphs: [] };
      prefs = PREFS;
      emit();
    },
  };
  return store;
}

export type FakeStore = ReturnType<typeof createFakeStore>;

/** Module shape for `vi.mock('…/store/index.ts', () => fakeStoreModule(store))`. */
export function fakeStoreModule(store: FakeStore) {
  return {
    store,
    useCollection: <K extends CollectionName>(name: K) =>
      useSyncExternalStore(store.subscribe, () => store.all(name)),
    useRecord: <K extends CollectionName>(name: K, key: string | undefined) =>
      useSyncExternalStore(store.subscribe, () => (key ? store.get(name, key) : undefined)),
    usePrefs: () => useSyncExternalStore(store.subscribe, store.prefs),
    useSyncStatus: () => 'offline' as const,
  };
}

/** Shared instance for component tests (module-cached, so mocks and tests see the same one). */
export const fakeStore = createFakeStore();
