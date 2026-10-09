/**
 * On-disk shape of the CLI's local data file (`$POUXIS_HOME/data.json`): the model's
 * `Collections` plus `UserPrefs`, wrapped with a format tag, a schema version and a revision
 * counter used for optimistic concurrency.
 */
import { COLLECTIONS, DEFAULT_PREFS } from '@pouxis/core';
import type { CollectionName, Collections, UserPrefs } from '@pouxis/core';

export const DATA_FORMAT = 'pouxis-data';
/** Bump when the record layout changes; add a step to `migrate()` at the same time. */
export const SCHEMA_VERSION = 1;

export type CollectionsData = { [K in CollectionName]: Collections[K][] };

export interface DataFile {
  format: typeof DATA_FORMAT;
  schemaVersion: number;
  /** Incremented by every write; a writer whose base revision is stale is rejected. */
  revision: number;
  /** Epoch ms of the last write. */
  savedAt: number;
  prefs: UserPrefs;
  collections: CollectionsData;
}

export type SchemaProblem =
  | { kind: 'too-new'; version: number }
  | { kind: 'invalid'; detail: string };

export class SchemaError extends Error {
  override name = 'SchemaError';
  readonly problem: SchemaProblem;

  constructor(problem: SchemaProblem) {
    super(problem.kind === 'too-new' ? `schema ${problem.version} is too new` : problem.detail);
    this.problem = problem;
  }
}

export function emptyCollections(): CollectionsData {
  return { tasks: [], events: [], notes: [], journal: [], graphs: [] };
}

/** A fresh data file. `defaults` seeds preferences, e.g. the host's time zone on first run. */
export function emptyData(defaults: Partial<UserPrefs> = {}): DataFile {
  return {
    format: DATA_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    savedAt: 0,
    prefs: normalizePrefs(defaults),
    collections: emptyCollections(),
  };
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Preferences with every missing or ill-typed field replaced by its default. */
export function normalizePrefs(raw: unknown): UserPrefs {
  const p = isObject(raw) ? raw : {};
  const wh = isObject(p.workingHours) ? p.workingHours : {};
  const int = (v: unknown, fallback: number, min = 0): number =>
    typeof v === 'number' && Number.isInteger(v) && v >= min ? v : fallback;
  const days =
    Array.isArray(wh.days) && wh.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      ? [...new Set(wh.days as number[])].sort((a, b) => a - b)
      : [...DEFAULT_PREFS.workingHours.days];
  const start = int(wh.start, DEFAULT_PREFS.workingHours.start);
  const end = int(wh.end, DEFAULT_PREFS.workingHours.end);
  const validHours = start < end && end <= 24 * 60;
  return {
    timeZone: typeof p.timeZone === 'string' && isValidTimeZone(p.timeZone) ? p.timeZone : DEFAULT_PREFS.timeZone,
    locale: p.locale === 'en' || p.locale === 'fr' ? p.locale : DEFAULT_PREFS.locale,
    workingHours: validHours ? { start, end, days } : { ...DEFAULT_PREFS.workingHours, days },
    bufferMin: int(p.bufferMin, DEFAULT_PREFS.bufferMin),
    makerBlockMin: int(p.makerBlockMin, DEFAULT_PREFS.makerBlockMin),
    wipLimit: int(p.wipLimit, DEFAULT_PREFS.wipLimit, 1),
    decayThreshold: int(p.decayThreshold, DEFAULT_PREFS.decayThreshold),
  };
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and normalises a parsed data file. Unknown top-level keys and unknown collections
 * are preserved so a newer client's additions survive a round-trip through the CLI.
 */
export function normalizeData(raw: unknown): DataFile {
  if (!isObject(raw)) throw new SchemaError({ kind: 'invalid', detail: 'not a JSON object' });
  if (raw.format !== DATA_FORMAT) {
    throw new SchemaError({ kind: 'invalid', detail: `unexpected format ${JSON.stringify(raw.format)}` });
  }
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SchemaError({ kind: 'invalid', detail: 'missing schemaVersion' });
  }
  if (version > SCHEMA_VERSION) throw new SchemaError({ kind: 'too-new', version });
  const migrated = migrate(raw, version);

  const rawCollections = isObject(migrated.collections) ? migrated.collections : {};
  const collections = { ...rawCollections } as Record<string, unknown>;
  for (const name of COLLECTIONS) {
    const list = rawCollections[name];
    if (list === undefined) {
      collections[name] = [];
      continue;
    }
    if (!Array.isArray(list)) {
      throw new SchemaError({ kind: 'invalid', detail: `collections.${name} is not an array` });
    }
    list.forEach((record, i) => {
      const problem = recordProblem(name, record);
      if (problem) throw new SchemaError({ kind: 'invalid', detail: `collections.${name}[${i}]: ${problem}` });
      fillDefaults(name, record as Record<string, unknown>);
    });
  }

  return {
    ...migrated,
    format: DATA_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    revision: typeof migrated.revision === 'number' && migrated.revision >= 0 ? migrated.revision : 0,
    savedAt: typeof migrated.savedAt === 'number' ? migrated.savedAt : 0,
    prefs: normalizePrefs(migrated.prefs),
    collections: collections as unknown as CollectionsData,
  };
}

/** Upgrades older layouts step by step. Version 1 is the first one: nothing to do yet. */
function migrate(raw: Record<string, unknown>, _from: number): Record<string, unknown> {
  return raw;
}

const TASK_STATUSES = new Set(['inbox', 'todo', 'doing', 'done', 'archived']);

/**
 * The structural minimum a record needs for the CLI to handle it safely; returns a short
 * English description of the first problem, or `undefined`.
 */
export function recordProblem(collection: CollectionName, value: unknown): string | undefined {
  if (!isObject(value)) return 'not an object';
  if (typeof value.id !== 'string' || value.id === '') return 'missing id';
  if (typeof value.createdAt !== 'number') return 'missing createdAt';
  if (typeof value.updatedAt !== 'number') return 'missing updatedAt';
  switch (collection) {
    case 'tasks':
      if (typeof value.title !== 'string') return 'missing title';
      if (typeof value.status !== 'string' || !TASK_STATUSES.has(value.status)) return 'invalid status';
      return undefined;
    case 'events':
      if (typeof value.title !== 'string') return 'missing title';
      if (typeof value.start !== 'number' || typeof value.end !== 'number') return 'missing start/end';
      return undefined;
    case 'notes':
      if (typeof value.title !== 'string' || typeof value.body !== 'string') return 'missing title/body';
      return undefined;
    case 'journal':
      if (typeof value.text !== 'string') return 'missing text';
      return undefined;
    case 'graphs':
      if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return 'missing nodes/edges';
      return undefined;
  }
}

/** Fills array/number fields other code iterates over, so older or hand-edited files load. */
export function fillDefaults(collection: CollectionName, record: Record<string, unknown>): void {
  const arrays: Record<CollectionName, string[]> = {
    tasks: ['tags', 'dependsOn', 'timeLogs'],
    events: ['tags', 'attendees'],
    notes: ['tags', 'links'],
    journal: ['tags'],
    graphs: [],
  };
  for (const key of arrays[collection]) if (!Array.isArray(record[key])) record[key] = [];
  if (collection === 'tasks') {
    if (typeof record.priority !== 'number') record.priority = 0;
    if (typeof record.postponedCount !== 'number') record.postponedCount = 0;
    if (record.mode !== 'create' && record.mode !== 'organize') record.mode = 'organize';
  }
  if (collection === 'events') {
    if (typeof record.fixed !== 'boolean') record.fixed = true;
    if (typeof record.timeZone !== 'string') record.timeZone = DEFAULT_PREFS.timeZone;
    if (typeof record.kind !== 'string') record.kind = 'personal';
  }
}
