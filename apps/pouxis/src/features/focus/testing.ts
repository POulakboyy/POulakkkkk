/**
 * Minimal in-memory `Store` for unit tests of the focus feature and the Today view: records,
 * prefs, batching. Sync, persistence and history are not modelled.
 */
import {
  DEFAULT_PREFS,
  type CalendarEvent,
  type CollectionName,
  type Collections,
  type Task,
  type UserPrefs,
} from '@pouxis/core';
import type { NewRecord, RecordPatch, Store } from '../../store/index.ts';

export interface FakeStore extends Store {
  /** Number of `batch` calls, to assert one undo step per gesture. */
  batches: number;
  /** Drops every record. */
  reset(): void;
}

export function createFakeStore(prefs: Partial<UserPrefs> = {}, now = () => 0): FakeStore {
  const data = new Map<CollectionName, Map<string, Collections[CollectionName]>>();
  const listeners = new Set<() => void>();
  let currentPrefs: UserPrefs = { ...DEFAULT_PREFS, ...prefs };
  let seq = 0;
  const table = <K extends CollectionName>(name: K) => {
    let t = data.get(name);
    if (!t) data.set(name, (t = new Map()));
    return t as Map<string, Collections[K]>;
  };
  const cache = new Map<CollectionName, readonly unknown[]>();
  const emit = () => {
    cache.clear();
    listeners.forEach((l) => l());
  };

  const fake = {
    batches: 0,
    all<K extends CollectionName>(name: K): readonly Collections[K][] {
      // Referentially stable until the next change, like the real store.
      let list = cache.get(name);
      if (!list) cache.set(name, (list = [...table(name).values()]));
      return list as readonly Collections[K][];
    },
    get: <K extends CollectionName>(name: K, id: string) => table(name).get(id),
    create<K extends CollectionName>(name: K, record: NewRecord<K>) {
      const ts = now();
      const full = {
        ...record,
        id: record.id ?? `${name}-${++seq}`,
        createdAt: ts,
        updatedAt: ts,
      } as unknown as Collections[K];
      table(name).set(full.id, full);
      emit();
      return full;
    },
    update<K extends CollectionName>(name: K, id: string, patch: RecordPatch<K>) {
      const prev = table(name).get(id);
      if (!prev) return;
      const next = { ...prev, ...patch, updatedAt: now() } as Collections[K];
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete (next as unknown as Record<string, unknown>)[k];
      }
      table(name).set(id, next);
      emit();
    },
    remove<K extends CollectionName>(name: K, id: string) {
      table(name).delete(id);
      emit();
    },
    prefs: () => currentPrefs,
    setPrefs(patch: Partial<UserPrefs>) {
      currentPrefs = { ...currentPrefs, ...patch };
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      data.clear();
      emit();
    },
    batch<T>(fn: () => T): T {
      fake.batches++;
      return fn();
    },
    get ready() {
      return Promise.resolve();
    },
    isReady: () => true,
    history: () => ({ canUndo: false, canRedo: false }),
    syncStatus: () => 'offline' as const,
    dispose() {
      listeners.clear();
    },
    undo: () => false,
    redo: () => false,
  };
  return fake as unknown as FakeStore;
}

type TaskInput = Partial<Task> & Pick<Task, 'title'>;

/** A task record with sensible defaults. */
export function taskFixture(input: TaskInput): NewRecord<'tasks'> {
  return {
    status: 'todo',
    priority: 2,
    tags: [],
    dependsOn: [],
    mode: 'organize',
    postponedCount: 0,
    timeLogs: [],
    ...input,
  };
}

type EventInput = Partial<CalendarEvent> & Pick<CalendarEvent, 'title' | 'start' | 'end'>;

/** A calendar event record with sensible defaults. */
export function eventFixture(input: EventInput): NewRecord<'events'> {
  return {
    timeZone: 'Europe/Paris',
    fixed: false,
    kind: 'meeting',
    attendees: [],
    tags: [],
    ...input,
  };
}

/**
 * Replacement for `src/store/index.ts` in component tests:
 * `vi.mock('../../store/index.ts', () => fakeStoreModule())`.
 */
export async function fakeStoreModule(prefs: Partial<UserPrefs> = { timeZone: 'Europe/Paris' }) {
  const { useSyncExternalStore } = await import('react');
  const store = createFakeStore(prefs, () => Date.now());
  return {
    store,
    useCollection: <K extends CollectionName>(name: K) =>
      useSyncExternalStore(store.subscribe, () => store.all(name)),
    useRecord: <K extends CollectionName>(name: K, id: string | undefined) =>
      useSyncExternalStore(store.subscribe, () => (id ? store.get(name, id) : undefined)),
    usePrefs: () => useSyncExternalStore(store.subscribe, store.prefs),
  };
}
