import { afterEach, describe, expect, it, vi } from 'vitest';
import { DAY } from '@pouxis/core';
import type { NewRecord } from './types.ts';
import { createLocalStore, TRASH_RETENTION_MS } from './local.ts';
import type { LocalStore, LocalStoreOptions } from './local.ts';
import { createMemoryDisk, createMemoryPersistence } from './persistence.ts';
import type { MemoryDisk } from './persistence.ts';
import { createBus } from './test-utils.ts';

const task = (title: string, extra: Partial<NewRecord<'tasks'>> = {}): NewRecord<'tasks'> => ({
  title,
  status: 'todo',
  priority: 1,
  mode: 'create',
  tags: [],
  dependsOn: [],
  timeLogs: [],
  postponedCount: 0,
  ...extra,
});

const open: LocalStore[] = [];
function make(disk: MemoryDisk = createMemoryDisk(), options: LocalStoreOptions = {}): LocalStore {
  const store = createLocalStore({
    persistence: createMemoryPersistence(disk),
    channel: null,
    locks: null,
    legacyStorage: null,
    ...options,
  });
  open.push(store);
  return store;
}

afterEach(() => {
  for (const s of open.splice(0)) s.dispose();
});

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('records', () => {
  it('creates, reads, updates and trashes records', () => {
    const store = make();
    expect(store.isReady()).toBe(true);
    const created = store.create('tasks', task('Write'));
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBe(created.updatedAt);
    expect(store.get('tasks', created.id)).toEqual(created);

    store.update('tasks', created.id, { title: 'Write more', notes: 'draft' });
    expect(store.get('tasks', created.id)).toMatchObject({ title: 'Write more', notes: 'draft' });
    store.update('tasks', created.id, { notes: undefined });
    expect(store.get('tasks', created.id)).not.toHaveProperty('notes');

    store.remove('tasks', created.id);
    expect(store.get('tasks', created.id)).toBeUndefined();
    expect(store.all('tasks')).toHaveLength(0);
    expect(store.trashed('tasks').map((t) => t.id)).toEqual([created.id]);
    expect(store.trashed('tasks')[0]).not.toHaveProperty('_trashedAt');

    store.restore('tasks', created.id);
    expect(store.all('tasks').map((t) => t.id)).toEqual([created.id]);
  });

  it('keeps reads referentially stable until the collection changes', () => {
    const store = make();
    const a = store.create('tasks', task('A'));
    const list = store.all('tasks');
    const rec = store.get('tasks', a.id);
    expect(store.all('tasks')).toBe(list);
    expect(store.get('tasks', a.id)).toBe(rec);
    expect(Object.isFrozen(list)).toBe(true);

    store.create('notes', { title: 'N', body: '', tags: [], links: [] });
    expect(store.all('tasks')).toBe(list);

    const b = store.create('tasks', task('B'));
    const next = store.all('tasks');
    expect(next).not.toBe(list);
    expect(next[0]).toBe(rec);
    expect(next.map((t) => t.id)).toEqual([a.id, b.id]);
  });

  it('orders records by creation time, honouring a backdated createdAt', () => {
    const store = make();
    store.create('journal', { kind: 'win', text: 'new', tags: [] });
    store.create('journal', { kind: 'win', text: 'old', tags: [], createdAt: 1000 });
    expect(store.all('journal').map((j) => j.text)).toEqual(['old', 'new']);
  });

  it('ignores updates of unknown or trashed records', () => {
    const store = make();
    store.update('tasks', 'missing', { title: 'x' });
    expect(store.get('tasks', 'missing')).toBeUndefined();
    const t = store.create('tasks', task('T'));
    store.remove('tasks', t.id);
    store.update('tasks', t.id, { title: 'ghost' });
    store.restore('tasks', t.id);
    expect(store.get('tasks', t.id)?.title).toBe('T');
  });

  it('batches notifications: one call per microtask', async () => {
    const store = make();
    await tick();
    const listener = vi.fn();
    store.subscribe(listener);
    store.create('tasks', task('1'));
    store.create('tasks', task('2'));
    store.setPrefs({ wipLimit: 3 });
    expect(listener).not.toHaveBeenCalled();
    await tick();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('merges preferences over the defaults with stable identity', () => {
    const store = make();
    const before = store.prefs();
    expect(before.locale).toBe('fr');
    store.setPrefs({ wipLimit: 2 });
    const after = store.prefs();
    expect(after).not.toBe(before);
    expect(after.wipLimit).toBe(2);
    expect(store.prefs()).toBe(after);
  });
});

describe('persistence', () => {
  it('reloads records and preferences from disk, and seeds only on first run', async () => {
    const disk = createMemoryDisk();
    const seed = vi.fn((s: Parameters<NonNullable<LocalStoreOptions['seed']>>[0]) => {
      s.create('tasks', task('Seeded', { id: 'seed-1' }));
    });
    const first = make(disk, { seed });
    expect(first.history().canUndo).toBe(false);
    const t = first.create('tasks', task('Mine'));
    first.update('tasks', t.id, { priority: 3 });
    first.setPrefs({ locale: 'en' });
    await first.flush();
    first.dispose();

    const second = make(disk, { seed });
    expect(seed).toHaveBeenCalledTimes(1);
    expect(second.all('tasks').map((x) => x.title)).toEqual(['Seeded', 'Mine']);
    expect(second.get('tasks', t.id)?.priority).toBe(3);
    expect(second.prefs().locale).toBe('en');
    expect(second.node()).toBe(first.node());
  });

  it('folds the op log into a snapshot after enough batches', async () => {
    const disk = createMemoryDisk();
    const store = make(disk, { compactAfter: 3 });
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      ids.push(store.create('tasks', task(`T${i}`)).id);
      await store.flush();
    }
    expect(disk.snapshot).toBeDefined();
    expect(disk.batches.length).toBeLessThan(3);
    store.dispose();
    expect(
      make(disk)
        .all('tasks')
        .map((t) => t.id),
    ).toEqual(ids);
  });

  it('survives a corrupt batch on disk', async () => {
    const disk = createMemoryDisk();
    const store = make(disk);
    store.create('tasks', task('Kept'));
    await store.flush();
    store.dispose();
    disk.batches.push(JSON.stringify([{ type: 'set', collection: 'tasks' }]));
    expect(
      make(disk)
        .all('tasks')
        .map((t) => t.title),
    ).toEqual(['Kept']);
  });

  it('purges records trashed more than 30 days ago at start-up', async () => {
    const disk = createMemoryDisk();
    let clock = Date.UTC(2026, 0, 1);
    const store = make(disk, { now: () => clock });
    const old = store.create('tasks', task('Old'));
    const recent = store.create('tasks', task('Recent'));
    store.remove('tasks', old.id);
    clock += 10 * DAY;
    store.remove('tasks', recent.id);
    await store.flush();
    store.dispose();

    clock += TRASH_RETENTION_MS - 5 * DAY;
    const reopened = make(disk, { now: () => clock });
    expect(reopened.trashed('tasks').map((t) => t.id)).toEqual([recent.id]);
  });

  it('imports the data of the legacy localStorage store once', () => {
    const legacy = {
      prefs: { wipLimit: 4 },
      tables: { tasks: [{ id: 'legacy-1', ...task('Legacy'), createdAt: 1, updatedAt: 1 }] },
    };
    const storage = {
      value: JSON.stringify(legacy) as string | null,
      getItem() {
        return this.value;
      },
      removeItem() {
        this.value = null;
      },
    };
    const seed = vi.fn();
    const store = make(createMemoryDisk(), { legacyStorage: storage, seed });
    expect(store.get('tasks', 'legacy-1')?.title).toBe('Legacy');
    expect(store.prefs().wipLimit).toBe(4);
    expect(storage.value).toBeNull();
    expect(seed).not.toHaveBeenCalled();
  });

  it('wipes every record and secret of the device without reseeding', async () => {
    const disk = createMemoryDisk();
    const seed = vi.fn((s: Parameters<NonNullable<LocalStoreOptions['seed']>>[0]) => {
      s.create('tasks', task('Seeded'));
    });
    const store = make(disk, { seed });
    const node = store.node();
    disk.meta.set('sync:config', { url: 'wss://x', space: 's', token: 't' });
    await store.wipe();
    expect(store.all('tasks')).toHaveLength(0);
    expect(store.node()).not.toBe(node);
    expect(disk.meta.has('sync:config')).toBe(false);
    store.dispose();
    expect(make(disk, { seed }).all('tasks')).toHaveLength(0);
    expect(seed).toHaveBeenCalledTimes(1);
  });
});

describe('undo / redo', () => {
  it('undoes and redoes updates', () => {
    const store = make();
    const t = store.create('tasks', task('Draft'));
    store.update('tasks', t.id, { title: 'Final' });
    expect(store.history()).toMatchObject({ canUndo: true, canRedo: false });
    expect(store.undo()).toBe(true);
    expect(store.get('tasks', t.id)?.title).toBe('Draft');
    expect(store.history().canRedo).toBe(true);
    expect(store.redo()).toBe(true);
    expect(store.get('tasks', t.id)?.title).toBe('Final');
  });

  it('undoes a creation by hiding the record, and a removal by restoring it', () => {
    const store = make();
    const t = store.create('tasks', task('Temp'));
    store.undo();
    expect(store.get('tasks', t.id)).toBeUndefined();
    store.redo();
    expect(store.get('tasks', t.id)?.title).toBe('Temp');
    store.remove('tasks', t.id);
    store.undo();
    expect(store.get('tasks', t.id)?.title).toBe('Temp');
  });

  it('records a batch as one labelled step', () => {
    const store = make();
    const a = store.create('tasks', task('A'));
    const b = store.create('tasks', task('B'));
    store.batch(() => {
      store.update('tasks', a.id, { status: 'done' });
      store.update('tasks', b.id, { status: 'done' });
    }, 'complete-all');
    expect(store.history().undoLabel).toBe('complete-all');
    store.undo();
    expect(store.all('tasks').map((t) => t.status)).toEqual(['todo', 'todo']);
    expect(store.history().redoLabel).toBe('complete-all');
  });

  it('coalesces a typing burst on the same field into one step', () => {
    let clock = 1_000_000;
    const store = make(createMemoryDisk(), { now: () => clock });
    const t = store.create('tasks', task(''));
    for (const title of ['H', 'He', 'Hel', 'Hello']) {
      clock += 200;
      store.update('tasks', t.id, { title });
    }
    store.undo();
    expect(store.get('tasks', t.id)?.title).toBe('');
  });

  it('does not overwrite a field changed by another device since', async () => {
    const bus = createBus();
    const a = make(createMemoryDisk(), { channel: bus.channel() });
    const b = make(createMemoryDisk(), { channel: bus.channel() });
    const t = a.create('tasks', task('Mine', { priority: 1 }));
    a.update('tasks', t.id, { title: 'Mine v2', priority: 2 });
    await bus.settle();
    b.update('tasks', t.id, { title: 'Theirs' });
    await bus.settle();
    a.undo();
    expect(a.get('tasks', t.id)).toMatchObject({ title: 'Theirs', priority: 1 });
  });

  it('notifies listeners and exposes a stable history object', async () => {
    const store = make();
    await tick();
    const listener = vi.fn();
    store.subscribe(listener);
    const h = store.history();
    expect(store.history()).toBe(h);
    store.create('tasks', task('X'));
    expect(store.history()).not.toBe(h);
    expect(store.undo()).toBe(true);
    expect(store.undo()).toBe(false);
    await tick();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('cross-tab replication', () => {
  it('converges two tabs through the channel, including concurrent edits', async () => {
    const bus = createBus();
    const a = make(createMemoryDisk(), { channel: bus.channel() });
    const t = a.create('tasks', task('Shared'));
    const b = make(createMemoryDisk(), { channel: bus.channel() });
    await bus.settle();
    // B announced itself on open and received what it missed.
    expect(b.get('tasks', t.id)?.title).toBe('Shared');

    a.update('tasks', t.id, { title: 'From A' });
    b.update('tasks', t.id, { priority: 3 });
    b.create('notes', { title: 'From B', body: '', tags: [], links: [] });
    await bus.settle();
    expect(a.all('tasks')).toEqual(b.all('tasks'));
    expect(a.get('tasks', t.id)).toMatchObject({ title: 'From A', priority: 3 });
    expect(a.all('notes').map((n) => n.title)).toEqual(['From B']);
    expect(a.node()).not.toBe(b.node());
  });

  it('ignores malformed messages from other tabs', async () => {
    const bus = createBus();
    const a = make(createMemoryDisk(), { channel: bus.channel() });
    const rogue = bus.channel();
    rogue.postMessage({ t: 'ops', from: 'x', ops: [{ nope: true }] });
    rogue.postMessage('garbage');
    await bus.settle();
    expect(a.all('tasks')).toHaveLength(0);
  });

  it('propagates a wipe to the other tabs', async () => {
    const bus = createBus();
    const a = make(createMemoryDisk(), { channel: bus.channel() });
    const b = make(createMemoryDisk(), { channel: bus.channel() });
    a.create('tasks', task('Gone soon'));
    await bus.settle();
    expect(b.all('tasks')).toHaveLength(1);
    await a.wipe();
    await bus.settle();
    expect(b.all('tasks')).toHaveLength(0);
  });
});
