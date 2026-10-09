import type { CollectionName, Collections, UserPrefs } from '@pouxis/core';

/** Fields the store fills in on creation. */
export type NewRecord<K extends CollectionName> = Omit<
  Collections[K],
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
};

export type RecordPatch<K extends CollectionName> = Partial<
  Omit<Collections[K], 'id' | 'createdAt'>
>;

export type SyncStatus = 'offline' | 'connecting' | 'synced' | 'syncing' | 'error';

/**
 * The app's single source of truth. Views talk to this interface only, so the
 * implementation (in-memory, CRDT + IndexedDB, native SQLite) can change underneath.
 * Reads are synchronous and referentially stable until the collection changes.
 */
export interface Store {
  all<K extends CollectionName>(name: K): readonly Collections[K][];
  get<K extends CollectionName>(name: K, id: string): Collections[K] | undefined;
  create<K extends CollectionName>(name: K, data: NewRecord<K>): Collections[K];
  update<K extends CollectionName>(name: K, id: string, patch: RecordPatch<K>): void;
  remove<K extends CollectionName>(name: K, id: string): void;
  prefs(): UserPrefs;
  setPrefs(patch: Partial<UserPrefs>): void;
  syncStatus(): SyncStatus;
  /** Called after any change (records, prefs or sync status). */
  subscribe(listener: () => void): () => void;
}
