import { mkdtemp, readFile, rm, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../src/protocol.ts';
import { FileStorage } from '../src/storage/file.ts';
import { MemoryStorage } from '../src/storage/memory.ts';
import {
  QuotaExceededError,
  StorageCorruptError,
  recordBytes,
  serializeRecord,
  type Storage,
} from '../src/storage/types.ts';

function env(id: string, payload = `payload-${id}`): Envelope {
  return { id, hlc: `hlc-${id}`, node: 'node-a', payload };
}

let dir = '';
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'pouxis-sync-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const backends: Array<[string, () => Storage]> = [
  ['memory', () => new MemoryStorage()],
  ['file (always)', () => new FileStorage({ dataDir: dir, fsync: 'always' })],
  [
    'file (interval)',
    () => new FileStorage({ dataDir: dir, fsync: 'interval', fsyncIntervalMs: 10 }),
  ],
];

describe.each(backends)('%s storage', (_name, make) => {
  it('assigns dense seqs and is idempotent on envelope id', async () => {
    const storage = make();
    const log = await storage.open('space-1');
    const first = await log.append([env('a'), env('b'), env('a')]);
    expect(first.stored.map((e) => [e.id, e.seq])).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect(first.duplicates).toEqual(['a']);
    const second = await log.append([env('b'), env('c')]);
    expect(second.stored.map((e) => e.seq)).toEqual([3]);
    expect(second.duplicates).toEqual(['b']);
    expect(second.head).toBe(3);
    expect((await log.append([env('c')])).stored).toEqual([]);
    await storage.close();
  });

  it('reads pages by count and size', async () => {
    const storage = make();
    const log = await storage.open('space-1');
    await log.append(['a', 'b', 'c', 'd', 'e'].map((id) => env(id)));
    expect((await log.read(0, 2, 1 << 20)).map((e) => e.id)).toEqual(['a', 'b']);
    expect((await log.read(3, 10, 1 << 20)).map((e) => e.seq)).toEqual([4, 5]);
    expect(await log.read(5, 10, 1 << 20)).toEqual([]);
    // A byte budget below one record still returns one record (progress guaranteed).
    expect((await log.read(0, 10, 1)).map((e) => e.id)).toEqual(['a']);
    const one = recordBytes({ ...env('a'), seq: 1 });
    expect((await log.read(0, 10, one * 2)).length).toBe(2);
    await storage.close();
  });

  it('keeps data across close and re-open, and isolates spaces', async () => {
    const storage = make();
    let log = await storage.open('space-1');
    await log.append([env('a'), env('b')]);
    await expect(storage.open('space-1')).rejects.toThrow(/already open/);
    await log.close();
    log = await storage.open('space-1');
    expect(log.head).toBe(2);
    expect((await log.append([env('a')])).duplicates).toEqual(['a']);
    const other = await storage.open('space-2');
    expect(other.head).toBe(0);
    await storage.close();
  });

  it('enforces the quota atomically', async () => {
    const storage = make();
    const log = await storage.open('space-1');
    await log.append([env('a')]);
    const max = log.bytes + recordBytes({ ...env('b'), seq: 2 });
    await expect(log.append([env('b'), env('c')], { maxBytes: max })).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
    expect(log.head).toBe(1);
    expect((await log.append([env('b')], { maxBytes: max })).head).toBe(2);
    await storage.close();
  });

  it('serializes concurrent appends', async () => {
    const storage = make();
    const log = await storage.open('space-1');
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => log.append([env(`x${i}`), env(`y${i}`)])),
    );
    const seqs = results.flatMap((r) => r.stored.map((e) => e.seq)).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect((await log.read(0, 100, 1 << 20)).length).toBe(40);
    await storage.close();
  });
});

describe('FileStorage recovery', () => {
  const open = () => new FileStorage({ dataDir: dir, fsync: 'always' });

  async function seed(): Promise<string> {
    const storage = open();
    const log = await storage.open('space-1');
    await log.append([env('a'), env('b')]);
    await storage.close();
    return storage.pathFor('space-1');
  }

  it('stores one JSONL record per line under a hashed file name', async () => {
    const file = await seed();
    expect(path.basename(file)).toMatch(/^[0-9a-f]{64}\.jsonl$/);
    const lines = (await readFile(file, 'utf8')).split('\n');
    expect(lines).toEqual([
      serializeRecord({ ...env('a'), seq: 1 }),
      serializeRecord({ ...env('b'), seq: 2 }),
      '',
    ]);
  });

  it('truncates a torn last line and keeps appending after it', async () => {
    const file = await seed();
    const clean = await readFile(file, 'utf8');
    await appendFile(file, '{"seq":3,"id":"c","hlc":"h","no');
    const storage = open();
    const log = await storage.open('space-1');
    expect(log.head).toBe(2);
    expect(await readFile(file, 'utf8')).toBe(clean);
    expect((await log.append([env('c')])).stored[0]?.seq).toBe(3);
    expect((await log.read(2, 10, 1 << 20)).map((e) => e.id)).toEqual(['c']);
    await storage.close();
  });

  it('drops a complete record that lacks its trailing newline', async () => {
    const file = await seed();
    await appendFile(file, serializeRecord({ ...env('c'), seq: 3 }));
    const storage = open();
    expect((await storage.open('space-1')).head).toBe(2);
    await storage.close();
  });

  it('reports corruption in the middle of the log instead of dropping data', async () => {
    const file = await seed();
    const [first, second] = (await readFile(file, 'utf8')).split('\n');
    await writeFile(file, `${first}\ngarbage\n${second}\n`);
    await expect(open().open('space-1')).rejects.toBeInstanceOf(StorageCorruptError);
  });

  it('treats a seq gap or a duplicate id as invalid', async () => {
    const file = await seed();
    await appendFile(file, serializeRecord({ ...env('a'), seq: 3 }) + '\n');
    const storage = open();
    // Invalid last line: truncated like a torn write.
    expect((await storage.open('space-1')).head).toBe(2);
    await storage.close();
  });
});
