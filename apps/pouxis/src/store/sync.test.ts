import { afterEach, describe, expect, it } from 'vitest';
import type { NewRecord } from './types.ts';
import { createLocalStore } from './local.ts';
import type { LocalStore, LocalStoreOptions } from './local.ts';
import { createMemoryDisk, createMemoryPersistence } from './persistence.ts';
import type { MemoryDisk } from './persistence.ts';
import { relayUrl } from './relay.ts';
import { createFakeRelay, until } from './test-utils.ts';
import { deriveSyncKey, payloadCipher } from './vault.ts';

const PASSPHRASE = 'correct horse battery staple';
const TOKEN = 'relay-token';
const URL_ = 'https://relay.example.org';

const task = (title: string): NewRecord<'tasks'> => ({
  title,
  status: 'todo',
  priority: 1,
  mode: 'create',
  tags: [],
  dependsOn: [],
  timeLogs: [],
  postponedCount: 0,
});

const open: LocalStore[] = [];
function make(
  relay: ReturnType<typeof createFakeRelay>,
  disk: MemoryDisk = createMemoryDisk(),
  options: LocalStoreOptions = {},
): LocalStore {
  const store = createLocalStore({
    persistence: createMemoryPersistence(disk),
    channel: null,
    locks: null,
    legacyStorage: null,
    socket: relay.socket,
    ...options,
  });
  open.push(store);
  return store;
}

afterEach(() => {
  for (const s of open.splice(0)) s.dispose();
});

describe('relayUrl', () => {
  it('maps http(s) to ws(s) and appends the protocol path', () => {
    expect(relayUrl('https://relay.example.org')).toBe('wss://relay.example.org/v1/sync');
    expect(relayUrl('wss://relay.example.org/base/')).toBe('wss://relay.example.org/base/v1/sync');
    expect(relayUrl('http://localhost:8787')).toBe('ws://localhost:8787/v1/sync');
  });

  it('refuses clear-text relays off this machine, credentials and other schemes', () => {
    expect(() => relayUrl('http://relay.example.org')).toThrow(/secure/);
    expect(() => relayUrl('ws://192.168.1.4')).toThrow(/secure/);
    expect(() => relayUrl('https://user:pw@relay.example.org')).toThrow(/Credentials/);
    expect(() => relayUrl('ftp://relay.example.org')).toThrow();
    expect(() => relayUrl('not a url')).toThrow();
  });
});

describe('end-to-end encryption', () => {
  it('round-trips a payload and binds it to its space and header', async () => {
    const key = await deriveSyncKey(PASSPHRASE, 'space-1');
    const header = { id: 'env-1', hlc: '0loyw3v28-00000-node', node: 'node' };
    const cipher = payloadCipher(key, 'space-1');
    const sealed = await cipher.encrypt('{"secret":"plan"}', header);
    expect(sealed).not.toContain('plan');
    expect(await cipher.decrypt(sealed, header)).toBe('{"secret":"plan"}');
    await expect(cipher.decrypt(sealed, { ...header, id: 'env-2' })).rejects.toThrow();
    await expect(payloadCipher(key, 'space-2').decrypt(sealed, header)).rejects.toThrow();
    const other = await deriveSyncKey(`${PASSPHRASE}!`, 'space-1');
    await expect(payloadCipher(other, 'space-1').decrypt(sealed, header)).rejects.toThrow();
  });

  it('derives non-extractable keys and enforces the passphrase policy', async () => {
    const key = await deriveSyncKey(PASSPHRASE, 'space-1');
    expect(key.extractable).toBe(false);
    expect(key.usages.sort()).toEqual(['decrypt', 'encrypt']);
    await expect(deriveSyncKey('short', 'space-1')).rejects.toThrow();
  });
});

describe('relay sync', () => {
  it('syncs two devices through the relay, which only sees ciphertext', async () => {
    const relay = createFakeRelay(TOKEN);
    const a = make(relay);
    const b = make(relay);
    const space = await a.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE });
    expect(a.syncInfo()).toMatchObject({ configured: true, locked: false, space, encrypted: true });

    const t = a.create('tasks', task('Confidential roadmap'));
    await b.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE, space });
    await until(() => b.get('tasks', t.id) !== undefined);
    expect(b.get('tasks', t.id)?.title).toBe('Confidential roadmap');

    b.update('tasks', t.id, { status: 'done' });
    await until(() => a.get('tasks', t.id)?.status === 'done');
    await until(() => a.syncStatus() === 'synced' && b.syncStatus() === 'synced');
    expect(a.syncInfo().pending).toBe(0);
    expect(a.syncInfo().lastSyncedAt).toBeTypeOf('number');

    const log = relay.log(space);
    expect(log.length).toBeGreaterThan(0);
    for (const envelope of log) expect(envelope.payload).not.toContain('Confidential');
  });

  it('keeps offline changes and pushes them after a reconnection', async () => {
    const relay = createFakeRelay(TOKEN);
    const a = make(relay);
    const b = make(relay);
    const space = await a.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE });
    await b.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE, space });
    await until(() => a.syncStatus() === 'synced' && b.syncStatus() === 'synced');
    relay.dropAll();
    await until(() => a.syncStatus() !== 'synced');
    const t = a.create('tasks', task('Written offline'));
    a.syncNow();
    b.syncNow();
    await until(() => b.get('tasks', t.id) !== undefined);
  });

  it('resumes after a restart without the passphrase, and rejects a wrong one', async () => {
    const relay = createFakeRelay(TOKEN);
    const disk = createMemoryDisk();
    const a = make(relay, disk);
    const space = await a.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE });
    await until(() => a.syncStatus() === 'synced');
    await a.flush();
    a.dispose();

    const again = make(relay, disk);
    await until(() => again.syncStatus() === 'synced');
    expect(again.syncInfo().space).toBe(space);

    // A device whose key handle was lost is locked until the passphrase is entered again.
    again.dispose();
    disk.meta.delete('sync:key');
    const locked = make(relay, disk);
    await until(() => locked.syncInfo().locked);
    expect(locked.syncStatus()).toBe('offline');
    await expect(locked.unlockSync('a completely wrong passphrase')).rejects.toThrow(/Wrong/);
    await locked.unlockSync(PASSPHRASE);
    await until(() => locked.syncStatus() === 'synced');
  });

  it('reports a fatal error for a refused token, and never stores the passphrase', async () => {
    const relay = createFakeRelay(TOKEN);
    const disk = createMemoryDisk();
    const a = make(relay, disk);
    await a.configureSync({ url: URL_, token: 'wrong', passphrase: PASSPHRASE });
    await until(() => a.syncStatus() === 'error');
    expect(a.syncInfo().issue?.code).toBe('unauthorized');
    const stored = JSON.stringify([...disk.meta.entries()]);
    expect(stored).not.toContain(PASSPHRASE);

    await a.disableSync();
    expect(a.syncInfo()).toMatchObject({ configured: false, status: 'offline' });
    expect(disk.meta.has('sync:key')).toBe(false);
  });

  it('drops untouched demo content when joining a space, keeping the space edits', async () => {
    const relay = createFakeRelay(TOKEN);
    const seed: LocalStoreOptions['seed'] = (s) => {
      s.create('tasks', { ...task('Demo'), id: 'seed-1' });
      s.create('tasks', { ...task('Demo 2'), id: 'seed-2' });
    };
    const a = make(relay, createMemoryDisk(), { seed });
    a.update('tasks', 'seed-1', { title: 'Mine' });
    a.remove('tasks', 'seed-2');
    const space = await a.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE });
    await until(() => a.syncStatus() === 'synced');

    const b = make(relay, createMemoryDisk(), { seed });
    expect(b.get('tasks', 'seed-1')?.title).toBe('Demo');
    await b.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE, space });
    await until(() => b.get('tasks', 'seed-1')?.title === 'Mine');
    await until(() => a.syncStatus() === 'synced' && b.syncStatus() === 'synced');
    await Promise.all([a.syncIdle(), b.syncIdle()]);
    expect(a.get('tasks', 'seed-1')?.title).toBe('Mine');
    expect(a.get('tasks', 'seed-2')).toBeUndefined();
    expect(b.get('tasks', 'seed-2')).toBeUndefined();
  });

  it('keeps local work when a device that was used joins a space', async () => {
    const relay = createFakeRelay(TOKEN);
    const a = make(relay);
    const space = await a.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE });
    const b = make(relay, createMemoryDisk(), {
      seed: (s) => void s.create('tasks', { ...task('Demo'), id: 'seed-1' }),
    });
    const mine = b.create('tasks', task('Written before joining'));
    await b.configureSync({ url: URL_, token: TOKEN, passphrase: PASSPHRASE, space });
    expect(b.get('tasks', mine.id)).toBeDefined();
    await until(() => a.get('tasks', mine.id) !== undefined);
  });

  it('validates the configuration before storing anything', async () => {
    const relay = createFakeRelay(TOKEN);
    const disk = createMemoryDisk();
    const a = make(relay, disk);
    await expect(
      a.configureSync({ url: 'http://relay.example.org', token: TOKEN, passphrase: PASSPHRASE }),
    ).rejects.toThrow();
    await expect(
      a.configureSync({ url: URL_, token: ' ', passphrase: PASSPHRASE }),
    ).rejects.toThrow();
    await expect(
      a.configureSync({ url: URL_, token: TOKEN, passphrase: 'too short' }),
    ).rejects.toThrow();
    expect(disk.meta.has('sync:config')).toBe(false);
  });
});
