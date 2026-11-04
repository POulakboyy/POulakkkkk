import { describe, expect, it } from 'vitest';
import type { Note, Task } from '@pouxis/core';
import { emptyData } from '../store/schema.ts';
import { BundleError, applyBundle, buildBundle, noteFileName, parseBundle } from './bundle.ts';

const task = (id: string, updatedAt: number, title = id): Task => ({
  id,
  createdAt: 1,
  updatedAt,
  title,
  status: 'todo',
  priority: 0,
  tags: [],
  dependsOn: [],
  mode: 'organize',
  postponedCount: 0,
  timeLogs: [],
});
const note = (id: string, title: string, extra: Partial<Note> = {}): Note => ({
  id,
  createdAt: 0,
  updatedAt: 0,
  title,
  body: 'Corps **markdown**',
  tags: ['idée'],
  links: [],
  ...extra,
});

function roundTrip(files: { name: string; content: string }[]) {
  const map = new Map(files.map((f) => [f.name, f.content]));
  return parseBundle((name) => map.get(name));
}

describe('export bundle', () => {
  it('lists every file in a versioned manifest and writes notes as Markdown', () => {
    const data = emptyData();
    data.collections.notes.push(
      note('n1aaaaaaaa', 'Été à Paris'),
      note('n2', 'Secret', { vaultId: 'v' }),
    );
    const files = buildBundle(data, Date.UTC(2026, 9, 8), 'test', 'Export');
    const manifest = JSON.parse(files[0]!.content);
    expect(files[0]!.name).toBe('manifest.json');
    expect(manifest).toMatchObject({
      format: 'pouxis-export',
      schemaVersion: 1,
      counts: { notes: 2, tasks: 0 },
    });
    expect(manifest.files).toEqual(files.map((f) => f.name));
    const md = files.filter((f) => f.name.startsWith('notes/'));
    expect(md.map((f) => f.name)).toEqual(['notes/ete-a-paris-n1aaaaaa.md']); // vault note skipped
    expect(md[0]!.content).toContain('title: "Été à Paris"\n');
    expect(md[0]!.content.endsWith('Corps **markdown**\n')).toBe(true);
  });

  it('makes note file names unique', () => {
    const used = new Set<string>();
    expect(noteFileName(note('same1234', '!!!'), used)).toBe('note-same1234.md');
    expect(noteFileName(note('same1234', '???'), used)).toBe('note-same1234-2.md');
  });

  it('keeps hostile imported ids out of note paths and front matter', () => {
    const hostile = note('/../../x\nid: forged', 'Titre');
    expect(noteFileName(hostile, new Set())).toBe('titre-xidforge.md');
    const data = emptyData();
    data.collections.notes.push(hostile);
    const md = buildBundle(data, 0, 'test', 'Export').find((f) => f.name.endsWith('.md'));
    expect(md?.name).toBe('notes/titre-xidforge.md');
    expect(md?.content).toContain('id: "/../../x\\nid: forged"\n');
  });

  it('round-trips through parseBundle', () => {
    const data = emptyData({ timeZone: 'Asia/Tokyo' });
    data.collections.tasks.push(task('a', 1));
    const bundle = roundTrip(buildBundle(data, 0, 'test', 'Export'));
    expect(bundle.collections.tasks).toEqual(data.collections.tasks);
    expect(bundle.prefs?.timeZone).toBe('Asia/Tokyo');
  });

  it('refuses foreign, newer or invalid exports', () => {
    const problem = (files: Record<string, string>) => {
      try {
        parseBundle((n) => files[n]);
      } catch (error) {
        return (error as BundleError).problem;
      }
      return undefined;
    };
    expect(problem({})).toEqual({ kind: 'not-export' });
    expect(problem({ 'manifest.json': '{"format":"zip"}' })?.kind).toBe('bad-manifest');
    expect(problem({ 'manifest.json': '{"format":"pouxis-export","schemaVersion":99}' })).toEqual({
      kind: 'too-new',
      version: 99,
    });
    const manifest = '{"format":"pouxis-export","schemaVersion":1}';
    expect(problem({ 'manifest.json': manifest, 'tasks.json': '{' })?.kind).toBe('bad-file');
    expect(problem({ 'manifest.json': manifest, 'tasks.json': '[{"id":"x"}]' })).toEqual({
      kind: 'bad-records',
      file: 'tasks.json',
      count: 1,
    });
  });
});

describe('applyBundle', () => {
  const incoming = () => {
    const data = emptyData({ timeZone: 'Asia/Tokyo' });
    data.collections.tasks.push(task('a', 5, 'newer'), task('b', 1, 'older'), task('c', 1));
    return roundTrip(buildBundle(data, 0, 'test', 'Export'));
  };

  it('merges: adds unknown records, keeps the newest copy of known ones', () => {
    const local = emptyData();
    local.collections.tasks.push(task('a', 2, 'local a'), task('b', 3, 'local b'), task('z', 1));
    const stats = applyBundle(local, incoming(), 'merge');
    expect(stats.tasks).toEqual({ added: 1, updated: 1, unchanged: 1, removed: 0 });
    expect(local.collections.tasks.map((t) => t.title)).toEqual(['newer', 'local b', 'z', 'c']);
    expect(local.prefs.timeZone).toBe('Europe/Paris');
  });

  it('replaces everything, preferences included', () => {
    const local = emptyData();
    local.collections.tasks.push(task('a', 5, 'newer'), task('z', 1));
    const stats = applyBundle(local, incoming(), 'replace');
    expect(stats.tasks).toEqual({ added: 2, updated: 0, unchanged: 1, removed: 1 });
    expect(local.collections.tasks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(local.prefs.timeZone).toBe('Asia/Tokyo');
  });
});
