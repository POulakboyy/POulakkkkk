import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Task } from '@pouxis/core';
import { acquireLock, isStale } from './lock.ts';
import { SCHEMA_VERSION, normalizeData } from './schema.ts';
import { DataStore, StoreError } from './store.ts';

const home = () => mkdtempSync(join(tmpdir(), 'pouxis-store-'));

function task(id: string, updatedAt = 1): Task {
  return {
    id,
    createdAt: 1,
    updatedAt,
    title: `Task ${id}`,
    status: 'todo',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'organize',
    postponedCount: 0,
    timeLogs: [],
  };
}

describe('DataStore', () => {
  it('reads an absent store as empty data seeded with the initial prefs', async () => {
    const store = new DataStore({ home: home(), initialPrefs: { timeZone: 'America/Montreal' } });
    const data = await store.load();
    expect(data.revision).toBe(0);
    expect(data.prefs.timeZone).toBe('America/Montreal');
    expect(data.collections.tasks).toEqual([]);
  });

  it('persists a transaction, bumps the revision and keeps a backup', async () => {
    const dir = home();
    const store = new DataStore({ home: dir, now: () => 42 });
    await store.transact((d) => void d.collections.tasks.push(task('a')));
    await store.transact((d) => void d.collections.tasks.push(task('b')));
    const data = await store.load();
    expect(data.revision).toBe(2);
    expect(data.savedAt).toBe(42);
    expect(data.collections.tasks.map((t) => t.id)).toEqual(['a', 'b']);
    const backup = JSON.parse(readFileSync(store.backupFile, 'utf8'));
    expect(backup.collections.tasks).toHaveLength(1);
    // Only the data, its backup and nothing else: no temp or lock file left behind.
    expect(readdirSync(dir).sort()).toEqual(['data.json', 'data.json.bak']);
  });

  it('writes nothing when the mutation throws or changes nothing', async () => {
    const dir = home();
    const store = new DataStore({ home: dir });
    await expect(
      store.transact((d) => {
        d.collections.tasks.push(task('a'));
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await store.transact(() => 'read only');
    expect(readdirSync(dir)).toEqual([]);
  });

  it('serialises concurrent transactions without losing updates', async () => {
    const store = new DataStore({ home: home() });
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        store.transact((d) => void d.collections.tasks.push(task(`t${i}`))),
      ),
    );
    const data = await store.load();
    expect(data.collections.tasks).toHaveLength(25);
    expect(data.revision).toBe(25);
  });

  it('rejects a write when the file changed behind the lock (optimistic check)', async () => {
    const store = new DataStore({ home: home() });
    await store.transact((d) => void d.collections.tasks.push(task('a')));
    await expect(
      store.transact((d) => {
        const raw = JSON.parse(readFileSync(store.file, 'utf8'));
        raw.revision = 99; // another program bypassing the lock
        writeFileSync(store.file, JSON.stringify(raw));
        d.collections.tasks.push(task('b'));
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect((await store.load()).collections.tasks.map((t) => t.id)).toEqual(['a']);
  });

  it('reports corrupt and too-new files without touching them', async () => {
    const dir = home();
    const store = new DataStore({ home: dir });
    writeFileSync(store.file, '{ not json');
    await expect(store.load()).rejects.toBeInstanceOf(StoreError);
    await expect(store.transact(() => undefined)).rejects.toMatchObject({ code: 'corrupt' });
    expect(readFileSync(store.file, 'utf8')).toBe('{ not json');

    writeFileSync(
      store.file,
      JSON.stringify({ format: 'pouxis-data', schemaVersion: SCHEMA_VERSION + 1 }),
    );
    await expect(store.load()).rejects.toMatchObject({ code: 'too-new' });
  });

  it('times out on a lock held by a live process', async () => {
    const store = new DataStore({ home: home(), lock: { timeoutMs: 100 } });
    await store.transact(() => undefined);
    const release = await acquireLock(store.lockFile);
    try {
      await expect(store.transact(() => undefined)).rejects.toMatchObject({ code: 'locked' });
    } finally {
      await release();
    }
  });

  it('breaks a lock left by a dead process', async () => {
    const store = new DataStore({ home: home(), lock: { timeoutMs: 2000 } });
    await store.transact(() => undefined);
    const { hostname } = await import('node:os');
    writeFileSync(
      store.lockFile,
      JSON.stringify({ pid: 2 ** 22 + 7, hostname: hostname(), token: 'x', createdAt: Date.now() }),
    );
    await store.transact((d) => void d.collections.tasks.push(task('a')));
    expect((await store.load()).collections.tasks).toHaveLength(1);
  });
});

describe('schema', () => {
  it('fills defaults, keeps unknown keys and validates records', () => {
    const data = normalizeData({
      format: 'pouxis-data',
      schemaVersion: 1,
      extra: { kept: true },
      collections: { tasks: [{ id: 'a', createdAt: 1, updatedAt: 1, title: 'x', status: 'todo' }] },
    });
    expect(data.collections.tasks[0]).toMatchObject({
      tags: [],
      dependsOn: [],
      priority: 0,
      mode: 'organize',
    });
    expect((data as unknown as Record<string, unknown>).extra).toEqual({ kept: true });
    expect(() =>
      normalizeData({
        format: 'pouxis-data',
        schemaVersion: 1,
        collections: { tasks: [{ id: 'a' }] },
      }),
    ).toThrow(/tasks\[0\]/);
  });

  it('treats a lock as stale past its age limit', () => {
    expect(
      isStale({ pid: process.pid, hostname: 'elsewhere', token: 't', createdAt: 0 }, 10_000, 5_000),
    ).toBe(true);
  });
});
