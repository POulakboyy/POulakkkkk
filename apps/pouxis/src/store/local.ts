import { COLLECTIONS, createId, DAY, DEFAULT_PREFS, sync } from '@pouxis/core';
import type { CollectionName, Collections, UserPrefs } from '@pouxis/core';
import { connectTabs, openBroadcastChannel } from './channel.ts';
import type { ChannelLike, TabSync } from './channel.ts';
import { createIndexedDbPersistence, isIndexedDbAvailable } from './idb.ts';
import { createMemoryPersistence } from './persistence.ts';
import type { PersistedState, Persistence } from './persistence.ts';
import type { SocketFactory } from './relay.ts';
import { acquireNodeSlot, defaultLocks } from './slots.ts';
import type { LockManagerLike } from './slots.ts';
import { SyncController, validateSyncInput } from './syncing.ts';
import type { HistoryState, NewRecord, RecordPatch, Store, SyncInfo, SyncStatus } from './types.ts';
import { sameJson, UndoStack } from './undo.ts';
import type { FieldChange, UndoEntry } from './undo.ts';

/** Hidden field marking a record as trashed (epoch ms). Never exposed to views. */
const TRASH = '_trashedAt';
export const TRASH_RETENTION_MS = 30 * DAY;
/** Preferences live in the replica too, so they follow the user across devices. */
const PREFS_COLLECTION = '_prefs';
const PREFS_ID = 'user';
const LEGACY_KEY = 'pouxis:v0';
const META_DEVICE = 'device';
const META_INITIALIZED = 'initialized';
/** True while the device holds nothing but untouched first-run content. */
const META_PRISTINE = 'seed:pristine';
const DEFAULT_COMPACT_AFTER = 400;

type AnyRecord = { id: string; createdAt: number; [field: string]: unknown };
type Fields = Record<string, unknown>;

export interface LocalStoreOptions {
  /** Defaults to IndexedDB when available, else memory (tests, blocked storage). */
  persistence?: Persistence;
  /** Cross-tab channel. Defaults to a BroadcastChannel when the data lives in IndexedDB. */
  channel?: ChannelLike | null;
  /** Web Locks used to pick a per-tab node id. Defaults to `navigator.locks`. */
  locks?: LockManagerLike | null;
  /** First-run content, written once per device (deterministic ids converge across devices). */
  seed?: (store: Store) => void;
  socket?: SocketFactory;
  now?: () => number;
  /** PBKDF2 iterations of the sync key (tests only; never below the core minimum). */
  iterations?: number;
  /** Data of the pre-replica placeholder store, imported once then removed. */
  legacyStorage?: Pick<Storage, 'getItem' | 'removeItem'> | null;
  /** Op batches appended before the log is folded into the snapshot. */
  compactAfter?: number;
}

/** The concrete store: the `Store` contract plus hooks for tests and diagnostics. */
export interface LocalStore extends Store {
  /** Resolves once every change so far is written to disk. */
  flush(): Promise<void>;
  /** Resolves when the relay connection has processed every received frame. */
  syncIdle(): Promise<void>;
  /** Replica node id of this tab (`<device>.<slot>`), once ready. */
  node(): string;
  persistenceKind(): Persistence['kind'];
}

const EMPTY_INFO: SyncInfo = Object.freeze({
  status: 'offline',
  configured: false,
  locked: false,
  encrypted: true,
  pending: 0,
});

/**
 * Local-first store on top of a `sync` replica: every change is a CRDT op, appended to an
 * on-disk log (IndexedDB) and folded into snapshots, broadcast to the other tabs and, when
 * configured, pushed end-to-end encrypted to a relay. Reads are synchronous and referentially
 * stable; listeners are notified once per microtask.
 */
export function createLocalStore(options: LocalStoreOptions = {}): LocalStore {
  const now = options.now ?? Date.now;
  const compactAfter = options.compactAfter ?? DEFAULT_COMPACT_AFTER;
  let persistence = options.persistence ?? pickPersistence();
  let channel = options.channel === undefined ? defaultChannel(persistence) : options.channel;

  let replica = sync.createReplica({ nodeId: `boot-${createId()}`, now });
  let unsubscribeReplica = replica.subscribe(onReplicaChange);
  let controller: SyncController | undefined;
  let tabs: TabSync | undefined;
  let releaseSlot: () => void = () => {};
  let ready = false;
  let disposed = false;

  const listeners = new Set<() => void>();
  let notifyQueued = false;
  const lists = new Map<string, readonly unknown[]>();
  const trashLists = new Map<string, readonly unknown[]>();
  const materialized = new WeakMap<object, AnyRecord>();
  const prefsCache = new WeakMap<object, UserPrefs>();
  const basePrefs: UserPrefs = Object.freeze({ ...DEFAULT_PREFS, timeZone: localZone() });

  const undoStack = new UndoStack();
  let historyCache: HistoryState | undefined;
  let batchDepth = 0;
  let batchChanges: FieldChange[] = [];
  let lastCreation = 0;
  /** See `META_PRISTINE`; `seeding` keeps the seed's own writes from clearing it. */
  let pristine = false;
  let seeding = false;

  /** Ops not to write back to disk or to other tabs (loading, compaction, tab traffic). */
  let quiet = false;
  let fromTab = false;
  let outbox: sync.Op[] = [];
  let writeQueued = false;
  let writes: Promise<void> = Promise.resolve();
  let appendedBatches = 0;

  function onReplicaChange(change: sync.ReplicaChange): void {
    for (const ref of change.records) {
      lists.delete(ref.collection);
      trashLists.delete(ref.collection);
    }
    if (!quiet) {
      if (!fromTab) tabs?.publish(change.ops);
      if (!fromTab || persistence.kind === 'memory') queueWrite(change.ops);
    }
    notify();
  }

  function notify(): void {
    historyCache = undefined;
    controller?.invalidate();
    if (notifyQueued) return;
    notifyQueued = true;
    queueMicrotask(() => {
      notifyQueued = false;
      for (const listener of [...listeners]) listener();
    });
  }

  /* ---------------------------------------------------------------------------------------- */
  /* Disk                                                                                       */
  /* ---------------------------------------------------------------------------------------- */

  function queueWrite(ops: readonly sync.Op[]): void {
    if (ops.length === 0) return;
    outbox.push(...ops);
    if (writeQueued) return;
    writeQueued = true;
    queueMicrotask(() => {
      writeQueued = false;
      const batch = outbox;
      outbox = [];
      const target = persistence;
      writes = writes
        .then(() => target.append(batch))
        .then(() => {
          appendedBatches++;
          if (appendedBatches >= compactAfter) return compact();
        })
        .catch(() => {
          // Disk full or revoked: data stays in memory (and in the other tabs) for now.
        });
    });
  }

  function compact(): Promise<void> {
    appendedBatches = 0;
    return persistence.compact((stored) => {
      mergeQuietly(stored);
      return replica.snapshot();
    });
  }

  function mergeQuietly(state: PersistedState): void {
    quiet = true;
    try {
      if (state.snapshot) replica.load(state.snapshot);
      for (const batch of state.batches) {
        try {
          replica.apply(batch);
        } catch {
          // A corrupt batch must not prevent the rest of the data from loading.
        }
      }
    } catch {
      // Unreadable snapshot: keep what the op log provides.
    } finally {
      quiet = false;
    }
  }

  /* ---------------------------------------------------------------------------------------- */
  /* Boot                                                                                       */
  /* ---------------------------------------------------------------------------------------- */

  /** Swaps in the real replica of this tab, keeping changes made while loading. */
  function install(node: string, state: PersistedState): void {
    const provisional = replica;
    unsubscribeReplica();
    replica = sync.createReplica({ nodeId: node, now });
    unsubscribeReplica = replica.subscribe(onReplicaChange);
    lists.clear();
    trashLists.clear();
    mergeQuietly(state);
    appendedBatches = state.batches.length;
    if (channel) tabs = connectTabs(replica, channel, tabHandlers);
    for (const collection of provisional.collections()) {
      for (const [id, value] of provisional.all(collection)) replica.change(collection, id, value);
    }
    purgeTrash();
    notify();
  }

  const tabHandlers = {
    receive(ops: sync.Op[]) {
      fromTab = true;
      try {
        replica.apply(ops);
      } finally {
        fromTab = false;
      }
    },
    wiped() {
      // Let this tab's pending disk writes land first: the wiping tab already cleared the disk.
      controller?.close();
      outbox = [];
      void writes.then(resetMemory);
    },
  };

  function purgeTrash(): void {
    const limit = now() - TRASH_RETENTION_MS;
    for (const collection of COLLECTIONS) {
      for (const [id, value] of replica.all(collection)) {
        const at = value[TRASH];
        if (typeof at === 'number' && at < limit) replica.change(collection, id, 'delete');
      }
    }
  }

  function firstRun(initialized: boolean, state: PersistedState, wasPristine: boolean): void {
    const empty = !state.snapshot && state.batches.length === 0;
    pristine = wasPristine;
    if (!initialized && empty && !importLegacy() && options.seed) {
      seeding = true;
      try {
        options.seed(store);
      } finally {
        seeding = false;
      }
      pristine = true;
      void persistence.setMeta(META_PRISTINE, true).catch(() => {});
    }
    undoStack.clear();
    void persistence.setMeta(META_INITIALIZED, true).catch(() => {});
  }

  function importLegacy(): boolean {
    const storage = options.legacyStorage === undefined ? legacyStorage() : options.legacyStorage;
    let raw: string | null | undefined;
    try {
      raw = storage?.getItem(LEGACY_KEY);
    } catch {
      return false;
    }
    if (!raw || !storage) return false;
    try {
      const data = JSON.parse(raw) as { prefs?: Fields; tables?: Record<string, unknown> };
      for (const name of COLLECTIONS) {
        const rows = data.tables?.[name];
        if (!Array.isArray(rows)) continue;
        for (const row of rows as AnyRecord[]) {
          if (typeof row?.id !== 'string') continue;
          const { id, ...fields } = row;
          replica.change(name, id, fields);
        }
      }
      if (data.prefs) replica.change(PREFS_COLLECTION, PREFS_ID, data.prefs);
      storage.removeItem(LEGACY_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function startSync(): void {
    controller = new SyncController({
      persistence,
      onChange: notify,
      ...(options.socket ? { socket: options.socket } : {}),
      ...(options.iterations === undefined ? {} : { iterations: options.iterations }),
    });
    void controller.start(replica).catch(() => {});
  }

  function finishBoot(): void {
    ready = true;
    startSync();
    notify();
  }

  function bootSync(memory: Persistence & Required<Pick<Persistence, 'loadSync'>>): void {
    let device = memory.getMetaSync?.<string>(META_DEVICE);
    if (!device) {
      device = createId();
      void memory.setMeta(META_DEVICE, device);
    }
    const state = memory.loadSync();
    install(`${device}.0`, state);
    firstRun(
      memory.getMetaSync?.<boolean>(META_INITIALIZED) === true,
      state,
      memory.getMetaSync?.<boolean>(META_PRISTINE) === true,
    );
    finishBoot();
  }

  async function bootAsync(): Promise<void> {
    try {
      const [state, saved, initialized, wasPristine] = await Promise.all([
        persistence.load(),
        persistence.getMeta<string>(META_DEVICE),
        persistence.getMeta<boolean>(META_INITIALIZED),
        persistence.getMeta<boolean>(META_PRISTINE),
      ]);
      const device = saved ?? createId();
      if (!saved) await persistence.setMeta(META_DEVICE, device);
      const locks = options.locks === undefined ? defaultLocks() : (options.locks ?? undefined);
      const slot = await acquireNodeSlot(device, locks);
      if (disposed) return slot.release();
      releaseSlot = slot.release;
      install(slot.node, state);
      firstRun(initialized === true, state, wasPristine === true);
      finishBoot();
    } catch {
      // IndexedDB refused (quota, private mode, corrupted database): run from memory.
      persistence.close();
      tabs?.close();
      tabs = undefined;
      channel = null;
      persistence = createMemoryPersistence();
      bootSync(persistence as Persistence & Required<Pick<Persistence, 'loadSync'>>);
    }
  }

  /** Forgets the in-memory data after this device was wiped (here or in another tab). */
  async function resetMemory(): Promise<void> {
    controller?.close();
    const node = replica.node;
    const device = createId();
    const fresh = { batches: [] };
    outbox = [];
    pristine = false;
    unsubscribeReplica();
    replica = sync.createReplica({ nodeId: `boot-${createId()}`, now });
    unsubscribeReplica = replica.subscribe(onReplicaChange);
    install(`${device}${node.slice(node.lastIndexOf('.'))}`, fresh);
    undoStack.clear();
    startSync();
  }

  /* ---------------------------------------------------------------------------------------- */
  /* Records                                                                                    */
  /* ---------------------------------------------------------------------------------------- */

  function materialize(id: string, value: sync.RecordValue): AnyRecord {
    let rec = materialized.get(value);
    if (!rec) {
      const { [TRASH]: _trashed, ...fields } = value;
      rec = Object.freeze({ ...fields, id }) as AnyRecord;
      materialized.set(value, rec);
    }
    return rec;
  }

  function list(collection: string, trashed: boolean): readonly unknown[] {
    const cache = trashed ? trashLists : lists;
    let out = cache.get(collection);
    if (!out) {
      const rows: AnyRecord[] = [];
      for (const [id, value] of replica.all(collection)) {
        if ((value[TRASH] !== undefined) === trashed) rows.push(materialize(id, value));
      }
      rows.sort(byCreation);
      out = Object.freeze(rows);
      cache.set(collection, out);
    }
    return out;
  }

  /** Writes the fields that actually change and records them for undo. */
  function write(
    collection: string,
    id: string,
    patch: Fields,
    coalescible: boolean,
  ): FieldChange | undefined {
    const current = replica.get(collection, id) ?? {};
    const before: Fields = {};
    const after: Fields = {};
    for (const [field, value] of Object.entries(patch)) {
      if (field === 'id' || sameJson(current[field], value)) continue;
      before[field] = current[field];
      after[field] = value;
    }
    if (Object.keys(after).length === 0) return undefined;
    replica.change(collection, id, after);
    const change = { collection, id, before, after };
    remember(change, coalescible);
    return change;
  }

  function remember(change: FieldChange, coalescible: boolean, label?: string): void {
    markTouched();
    if (batchDepth > 0) {
      batchChanges.push(change);
      return;
    }
    const entry: UndoEntry = { changes: [change], at: now(), coalescible };
    if (label !== undefined) entry.label = label;
    undoStack.push(entry);
    notify();
  }

  /** Re-applies one side of an entry, skipping fields someone else changed since. */
  function replay(entry: UndoEntry, direction: 'undo' | 'redo'): void {
    const changes = direction === 'undo' ? [...entry.changes].reverse() : entry.changes;
    for (const change of changes) {
      const target = direction === 'undo' ? change.before : change.after;
      const expected = direction === 'undo' ? change.after : change.before;
      if (replica.isDeleted(change.collection, change.id)) continue;
      const current = replica.get(change.collection, change.id) ?? {};
      const patch: Fields = {};
      for (const field of Object.keys(target)) {
        if (sameJson(current[field], expected[field])) patch[field] = target[field];
      }
      if (Object.keys(patch).length > 0) replica.change(change.collection, change.id, patch);
    }
    notify();
  }

  const store: LocalStore = {
    all<K extends CollectionName>(name: K) {
      return list(name, false) as readonly Collections[K][];
    },
    get<K extends CollectionName>(name: K, id: string) {
      const value = replica.get(name, id);
      if (!value || value[TRASH] !== undefined) return undefined;
      return materialize(id, value) as unknown as Collections[K];
    },
    create<K extends CollectionName>(name: K, data: NewRecord<K>): Collections[K] {
      const { id: given, createdAt, ...fields } = data as Fields & { id?: string };
      const id = given ?? createId();
      const at = typeof createdAt === 'number' ? createdAt : creationTime();
      replica.change(name, id, { ...fields, createdAt: at, updatedAt: at, [TRASH]: undefined });
      // Undoing a creation trashes the record: deletions are final in the replica.
      remember(
        { collection: name, id, before: { [TRASH]: now() }, after: { [TRASH]: undefined } },
        false,
      );
      const value = replica.get(name, id);
      if (!value) throw new Error(`Cannot create ${name}/${id}: the id was deleted`);
      return materialize(id, value) as unknown as Collections[K];
    },
    update<K extends CollectionName>(name: K, id: string, patch: RecordPatch<K>): void {
      if (!store.get(name, id)) return;
      write(name, id, { ...(patch as Fields), updatedAt: now() }, true);
    },
    remove(name, id) {
      if (store.get(name, id)) write(name, id, { [TRASH]: now() }, false);
    },
    trashed<K extends CollectionName>(name: K) {
      return list(name, true) as readonly Collections[K][];
    },
    restore(name, id) {
      if (replica.get(name, id)?.[TRASH] !== undefined)
        write(name, id, { [TRASH]: undefined }, false);
    },
    prefs() {
      const value = replica.get(PREFS_COLLECTION, PREFS_ID);
      if (!value) return basePrefs;
      let prefs = prefsCache.get(value);
      if (!prefs) {
        prefs = Object.freeze({ ...basePrefs, ...(value as Partial<UserPrefs>) });
        prefsCache.set(value, prefs);
      }
      return prefs;
    },
    setPrefs(patch) {
      replica.change(PREFS_COLLECTION, PREFS_ID, patch);
    },
    syncStatus: (): SyncStatus => controller?.status() ?? 'offline',
    syncInfo: () => controller?.info() ?? EMPTY_INFO,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ready: Promise.resolve(),
    isReady: () => ready,
    batch(fn, label) {
      batchDepth++;
      try {
        return fn();
      } finally {
        batchDepth--;
        if (batchDepth === 0 && batchChanges.length > 0) {
          const entry: UndoEntry = { changes: batchChanges, at: now(), coalescible: false };
          if (label !== undefined) entry.label = label;
          batchChanges = [];
          undoStack.push(entry);
          notify();
        }
      }
    },
    undo() {
      if (batchDepth > 0) return false;
      const entry = undoStack.takeUndo();
      if (!entry) return false;
      replay(entry, 'undo');
      return true;
    },
    redo() {
      if (batchDepth > 0) return false;
      const entry = undoStack.takeRedo();
      if (!entry) return false;
      replay(entry, 'redo');
      return true;
    },
    history() {
      if (!historyCache) {
        const state: HistoryState = { canUndo: undoStack.canUndo, canRedo: undoStack.canRedo };
        const undoLabel = undoStack.peekUndo()?.label;
        const redoLabel = undoStack.peekRedo()?.label;
        if (undoLabel !== undefined) state.undoLabel = undoLabel;
        if (redoLabel !== undefined) state.redoLabel = redoLabel;
        historyCache = Object.freeze(state);
      }
      return historyCache;
    },
    async configureSync(config) {
      await store.ready;
      const { space } = validateSyncInput(config);
      // A device joining a space with nothing but its demo content drops it first: its fresh
      // seed writes (same deterministic ids) would otherwise override the space's own edits.
      if (space && (await persistence.getMeta<boolean>(META_PRISTINE)) === true) {
        await store.wipe();
      }
      return requireController().configure(config);
    },
    async unlockSync(passphrase) {
      await store.ready;
      return requireController().unlock(passphrase);
    },
    async disableSync() {
      await store.ready;
      return requireController().disable();
    },
    syncNow() {
      controller?.syncNow();
    },
    async wipe() {
      await store.ready;
      controller?.close();
      // Stop answering other tabs with the data being erased.
      tabs?.detach();
      outbox = [];
      await writes;
      await persistence.clear();
      await persistence.setMeta(META_INITIALIZED, true);
      // Only now: the other tabs restart from the cleared disk (sync config included).
      tabs?.publishWipe();
      await resetMemory();
    },
    flush() {
      return new Promise<void>((resolve) => queueMicrotask(resolve)).then(() => writes);
    },
    syncIdle: () => controller?.idle() ?? Promise.resolve(),
    node: () => replica.node,
    persistenceKind: () => persistence.kind,
    dispose() {
      disposed = true;
      unsubscribeReplica();
      controller?.close();
      tabs?.close();
      releaseSlot();
      void writes.finally(() => persistence.close());
      listeners.clear();
    },
  };

  function markTouched(): void {
    if (seeding || !pristine) return;
    pristine = false;
    void persistence.setMeta(META_PRISTINE, false).catch(() => {});
  }

  /** Strictly increasing creation times keep same-millisecond creations in call order. */
  function creationTime(): number {
    lastCreation = Math.max(now(), lastCreation + 1);
    return lastCreation;
  }

  function requireController(): SyncController {
    if (!controller) throw new Error('Store is not ready');
    return controller;
  }

  if (persistence.loadSync) {
    bootSync(persistence as Persistence & Required<Pick<Persistence, 'loadSync'>>);
  } else {
    (store as { ready: Promise<void> }).ready = bootAsync();
  }
  return store;
}

function byCreation(a: AnyRecord, b: AnyRecord): number {
  return a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function pickPersistence(): Persistence {
  return isIndexedDbAvailable() ? createIndexedDbPersistence() : createMemoryPersistence();
}

function defaultChannel(persistence: Persistence): ChannelLike | null {
  return persistence.kind === 'indexeddb' ? openBroadcastChannel() : null;
}

function legacyStorage(): Pick<Storage, 'getItem' | 'removeItem'> | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_PREFS.timeZone;
  } catch {
    return DEFAULT_PREFS.timeZone;
  }
}
