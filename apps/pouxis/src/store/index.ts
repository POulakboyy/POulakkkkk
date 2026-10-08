import { useSyncExternalStore } from 'react';
import type { CollectionName, Collections, UserPrefs } from '@pouxis/core';
import { createMemoryStore } from './memory.ts';
import { seedDemo } from './seed.ts';
import type { Store, SyncStatus } from './types.ts';

export type { NewRecord, RecordPatch, Store, SyncStatus } from './types.ts';

/** The app-wide store instance. Mutate through it: `store.create('tasks', {...})`. */
export const store: Store = createMemoryStore(seedDemo);

export function useCollection<K extends CollectionName>(name: K): readonly Collections[K][] {
  return useSyncExternalStore(store.subscribe, () => store.all(name));
}

export function useRecord<K extends CollectionName>(
  name: K,
  id: string | undefined,
): Collections[K] | undefined {
  return useSyncExternalStore(store.subscribe, () => (id ? store.get(name, id) : undefined));
}

export function usePrefs(): UserPrefs {
  return useSyncExternalStore(store.subscribe, store.prefs);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(store.subscribe, store.syncStatus);
}
