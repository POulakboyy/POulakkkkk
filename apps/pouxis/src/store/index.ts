import { useSyncExternalStore } from 'react';
import type { CollectionName, Collections, UserPrefs } from '@pouxis/core';
import { createLocalStore } from './local.ts';
import { seedDemo } from './seed.ts';
import type { HistoryState, Store, SyncInfo, SyncStatus } from './types.ts';

export type {
  HistoryState,
  NewRecord,
  RecordPatch,
  Store,
  SyncConfig,
  SyncInfo,
  SyncStatus,
} from './types.ts';
export { MIN_SYNC_PASSPHRASE_LENGTH } from './vault.ts';
export { relayUrl } from './relay.ts';

/** The app-wide store instance. Mutate through it: `store.create('tasks', {...})`. */
export const store: Store = createLocalStore({ seed: seedDemo });

// Dev server: a hot-replaced module must release its tab slot, channel and database handle.
import.meta.hot?.dispose(() => store.dispose());

/**
 * Relay suggested by the build (`VITE_SYNC_URL`, `VITE_SYNC_TOKEN`) to prefill the sync
 * settings. A token baked into a bundle is public: use it for development relays only.
 */
export function syncDefaults(): { url?: string; token?: string } {
  const env = import.meta.env as Record<string, string | undefined>;
  const out: { url?: string; token?: string } = {};
  if (env.VITE_SYNC_URL) out.url = env.VITE_SYNC_URL;
  if (env.VITE_SYNC_TOKEN) out.token = env.VITE_SYNC_TOKEN;
  return out;
}

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

export function useSyncInfo(): SyncInfo {
  return useSyncExternalStore(store.subscribe, store.syncInfo);
}

/** Undo/redo availability, for toolbar buttons and the ⌘Z / ⌘⇧Z shortcuts. */
export function useHistory(): HistoryState {
  return useSyncExternalStore(store.subscribe, store.history);
}

export function useStoreReady(): boolean {
  return useSyncExternalStore(store.subscribe, store.isReady);
}
