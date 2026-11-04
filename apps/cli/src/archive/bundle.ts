/**
 * The portable export layout shared by `export` and `import`:
 *
 *   manifest.json          format tag, schema version, counts, file list
 *   prefs.json             UserPrefs
 *   <collection>.json      one JSON array per collection (tasks, events, notes…)
 *   notes/<slug>.md        every readable note as Markdown with front matter
 *   README.md              what the files are
 *
 * The JSON files are authoritative; Markdown copies are for humans and other tools, and are
 * ignored on import.
 */
import { COLLECTIONS, dayKey } from '@pouxis/core';
import type { CollectionName, Note, TimeZone, UserPrefs } from '@pouxis/core';
import {
  SCHEMA_VERSION,
  emptyCollections,
  isObject,
  normalizePrefs,
  recordProblem,
  fillDefaults,
} from '../store/schema.ts';
import type { CollectionsData, DataFile } from '../store/schema.ts';

export const EXPORT_FORMAT = 'pouxis-export';
export const MANIFEST = 'manifest.json';
export const PREFS_FILE = 'prefs.json';

export interface Manifest {
  format: typeof EXPORT_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  generator: string;
  timeZone: TimeZone;
  counts: Record<CollectionName, number>;
  files: string[];
}

export interface BundleFile {
  name: string;
  content: string;
}

export function collectionFile(name: CollectionName): string {
  return `${name}.json`;
}

/** Every file of an export of `data`, manifest first. */
export function buildBundle(
  data: DataFile,
  now: number,
  generator: string,
  readmeTitle: string,
): BundleFile[] {
  const files: BundleFile[] = [];
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  files.push({ name: PREFS_FILE, content: json(data.prefs) });
  for (const name of COLLECTIONS)
    files.push({ name: collectionFile(name), content: json(data.collections[name]) });
  const used = new Set<string>();
  for (const note of data.collections.notes) {
    if (note.vaultId !== undefined) continue; // ciphertext: only meaningful inside POuxis
    files.push({ name: `notes/${noteFileName(note, used)}`, content: noteMarkdown(note) });
  }
  files.push({ name: 'README.md', content: readme(readmeTitle, data.prefs.timeZone, now) });

  const counts = Object.fromEntries(
    COLLECTIONS.map((n) => [n, data.collections[n].length]),
  ) as Record<CollectionName, number>;
  const manifest: Manifest = {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(now).toISOString(),
    generator,
    timeZone: data.prefs.timeZone,
    counts,
    files: [MANIFEST, ...files.map((f) => f.name)],
  };
  return [{ name: MANIFEST, content: json(manifest) }, ...files];
}

/** `pouxis-export-2026-10-08` in the user's zone. */
export function defaultExportName(now: number, timeZone: TimeZone): string {
  return `pouxis-export-${dayKey(now, timeZone)}`;
}

/** File-system-safe ASCII slug of a title, suffixed with the id start to stay unique. */
export function noteFileName(note: Note, used: Set<string>): string {
  const slug =
    note.title
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'note';
  // Imported ids are arbitrary strings: keep only safe characters so no path can escape notes/.
  const idPart =
    note.id
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8) || 'id';
  let name = `${slug}-${idPart}.md`;
  for (let n = 2; used.has(name); n++) name = `${slug}-${idPart}-${n}.md`;
  used.add(name);
  return name;
}

export function noteMarkdown(note: Note): string {
  const front = [
    '---',
    `id: ${JSON.stringify(note.id)}`,
    `title: ${JSON.stringify(note.title)}`,
    `created: ${new Date(note.createdAt).toISOString()}`,
    `updated: ${new Date(note.updatedAt).toISOString()}`,
    ...(note.tags.length > 0
      ? [`tags: [${note.tags.map((t) => JSON.stringify(t)).join(', ')}]`]
      : []),
    '---',
    '',
  ];
  const body = note.body.endsWith('\n') ? note.body : `${note.body}\n`;
  return `${front.join('\n')}${body}`;
}

function readme(title: string, timeZone: TimeZone, now: number): string {
  return [
    `# ${title}`,
    '',
    `${new Date(now).toISOString()} · ${timeZone}`,
    '',
    '- `manifest.json` — format, schema version, counts',
    '- `prefs.json` — preferences',
    ...COLLECTIONS.map((n) => `- \`${collectionFile(n)}\` — ${n}`),
    '- `notes/*.md` — notes (Markdown)',
    '',
    'Timestamps are epoch milliseconds (UTC). Re-import with `pouxis import <this archive>`.',
    '',
  ].join('\n');
}

/* --- reading ---------------------------------------------------------------------------- */

export type BundleProblem =
  | { kind: 'not-export' }
  | { kind: 'bad-manifest'; detail: string }
  | { kind: 'too-new'; version: number }
  | { kind: 'bad-file'; file: string; detail: string }
  | { kind: 'bad-records'; file: string; count: number };

export class BundleError extends Error {
  override name = 'BundleError';
  readonly problem: BundleProblem;
  constructor(problem: BundleProblem) {
    super(problem.kind);
    this.problem = problem;
  }
}

export interface Bundle {
  manifest: Manifest;
  prefs: UserPrefs | undefined;
  collections: CollectionsData;
}

/** Parses an export given a way to read its files by name (`undefined` when absent). */
export function parseBundle(read: (name: string) => string | undefined): Bundle {
  const manifestText = read(MANIFEST);
  if (manifestText === undefined) throw new BundleError({ kind: 'not-export' });
  const manifest = parseJson(MANIFEST, manifestText);
  if (!isObject(manifest) || manifest.format !== EXPORT_FORMAT) {
    throw new BundleError({ kind: 'bad-manifest', detail: `format ≠ ${EXPORT_FORMAT}` });
  }
  const version = manifest.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new BundleError({ kind: 'bad-manifest', detail: 'schemaVersion' });
  }
  if (version > SCHEMA_VERSION) throw new BundleError({ kind: 'too-new', version });

  const prefsText = read(PREFS_FILE);
  const prefs =
    prefsText === undefined ? undefined : normalizePrefs(parseJson(PREFS_FILE, prefsText));
  const collections = emptyCollections();
  for (const name of COLLECTIONS) {
    const file = collectionFile(name);
    const text = read(file);
    if (text === undefined) continue;
    const list = parseJson(file, text);
    if (!Array.isArray(list))
      throw new BundleError({ kind: 'bad-file', file, detail: 'not a JSON array' });
    const bad = list.filter((r) => recordProblem(name, r) !== undefined).length;
    if (bad > 0) throw new BundleError({ kind: 'bad-records', file, count: bad });
    for (const record of list) fillDefaults(name, record as Record<string, unknown>);
    (collections as Record<CollectionName, unknown[]>)[name] = list;
  }
  return { manifest: manifest as unknown as Manifest, prefs, collections };
}

function parseJson(file: string, text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new BundleError({ kind: 'bad-file', file, detail: (error as Error).message });
  }
}

/* --- merging ---------------------------------------------------------------------------- */

export interface CollectionStats {
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
}

export type ImportStats = Record<CollectionName, CollectionStats>;

/**
 * Applies `bundle` to `data` in place. `merge`: unknown ids are added, known ones replaced
 * only when the imported copy is newer (`updatedAt`). `replace`: the bundle becomes the data.
 */
export function applyBundle(
  data: DataFile,
  bundle: Bundle,
  mode: 'merge' | 'replace',
): ImportStats {
  const stats = {} as ImportStats;
  for (const name of COLLECTIONS) {
    stats[name] = mergeCollection(data, bundle, name, mode);
  }
  if (mode === 'replace' && bundle.prefs) data.prefs = bundle.prefs;
  return stats;
}

function mergeCollection<C extends CollectionName>(
  data: DataFile,
  bundle: Bundle,
  name: C,
  mode: 'merge' | 'replace',
): CollectionStats {
  const local = data.collections[name] as CollectionsData[C];
  const incoming = bundle.collections[name] as CollectionsData[C];
  const byId = new Map(local.map((r, i) => [r.id, i]));
  const stats: CollectionStats = { added: 0, updated: 0, unchanged: 0, removed: 0 };
  if (mode === 'replace') {
    const incomingIds = new Set(incoming.map((r) => r.id));
    stats.removed = local.filter((r) => !incomingIds.has(r.id)).length;
    for (const record of incoming) {
      const i = byId.get(record.id);
      if (i === undefined) stats.added++;
      else if (JSON.stringify(local[i]) === JSON.stringify(record)) stats.unchanged++;
      else stats.updated++;
    }
    (data.collections as Record<CollectionName, unknown[]>)[name] = [...incoming];
    return stats;
  }
  const merged = [...local];
  for (const record of incoming) {
    const i = byId.get(record.id);
    if (i === undefined) {
      byId.set(record.id, merged.length);
      merged.push(record);
      stats.added++;
    } else if (record.updatedAt > (merged[i] as (typeof merged)[number]).updatedAt) {
      merged[i] = record;
      stats.updated++;
    } else {
      stats.unchanged++;
    }
  }
  (data.collections as Record<CollectionName, unknown[]>)[name] = merged;
  return stats;
}
