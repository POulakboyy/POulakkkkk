import type { CollectionName, Collections, UserPrefs } from '@pouxis/core';

/** Fields the store fills in on creation. */
export type NewRecord<K extends CollectionName> = Omit<
  Collections[K],
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  /** Backdates the record (imports, demo content); defaults to now. */
  createdAt?: number;
};

export type RecordPatch<K extends CollectionName> = Partial<
  Omit<Collections[K], 'id' | 'createdAt'>
>;

export type SyncStatus = 'offline' | 'connecting' | 'synced' | 'syncing' | 'error';

/** Where and as whom this device syncs. The passphrase is never part of it. */
export interface SyncConfig {
  /** Relay address (`https://…` or `wss://…`; plain `http`/`ws` only for localhost). */
  url: string;
  /** Space id shared by every device of the user (a random UUID). */
  space: string;
  /** Bearer token accepted by the relay for this space. */
  token: string;
}

export interface SyncInfo {
  status: SyncStatus;
  /** A relay, space and token are known. */
  configured: boolean;
  /** Configured, but the encryption passphrase has not been entered on this device. */
  locked: boolean;
  /** Payloads are always end-to-end encrypted; the relay only stores ciphertext. */
  encrypted: true;
  url?: string;
  space?: string;
  /** Last time every local change was acknowledged by the relay (epoch ms). */
  lastSyncedAt?: number;
  /** Local changes not yet acknowledged by the relay. */
  pending: number;
  /** Last problem reported by the relay or the client (`unauthorized`, `decrypt`…). */
  issue?: { code: string; message: string };
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  /** Label given to `batch()` for the step undo would revert, if any. */
  undoLabel?: string;
  redoLabel?: string;
}

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
  /** Moves a record to the trash (undoable); trashed records are purged after 30 days. */
  remove<K extends CollectionName>(name: K, id: string): void;
  /** Records in the trash, oldest first. */
  trashed<K extends CollectionName>(name: K): readonly Collections[K][];
  /** Takes a record out of the trash (no-op when it is not trashed). */
  restore<K extends CollectionName>(name: K, id: string): void;
  prefs(): UserPrefs;
  setPrefs(patch: Partial<UserPrefs>): void;
  syncStatus(): SyncStatus;
  /**
   * Called after any change (records, prefs, history or sync status). Notifications are
   * batched: many changes in one task produce one call, on the next microtask.
   */
  subscribe(listener: () => void): () => void;

  /** Resolves once local data is loaded from disk (immediately without IndexedDB). */
  readonly ready: Promise<void>;
  isReady(): boolean;
  /** Runs `fn` and records all its changes as a single undo step. */
  batch<T>(fn: () => T, label?: string): T;
  /** Reverts the last local change; returns false when there is nothing to undo. */
  undo(): boolean;
  redo(): boolean;
  history(): HistoryState;

  syncInfo(): SyncInfo;
  /**
   * Enables sync: validates the relay address, derives the encryption key from `passphrase`
   * (at least 15 characters), stores the config and connects. Every device of the space
   * must use the same space id and passphrase. Returns the space id (generated if omitted).
   */
  configureSync(
    config: Omit<SyncConfig, 'space'> & { space?: string; passphrase: string },
  ): Promise<string>;
  /** Enters the passphrase on a configured but locked device. */
  unlockSync(passphrase: string): Promise<void>;
  /** Stops syncing and forgets the relay, token and key on this device (data stays). */
  disableSync(): Promise<void>;
  /** Reconnects now (after a network change or a fixed token). */
  syncNow(): void;
  /** Erases every local record, preference and sync secret of this device. */
  wipe(): Promise<void>;
  dispose(): void;
}
