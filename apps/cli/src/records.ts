/** Finding records by id prefix, short display ids, and removing a record cleanly. */
import type { CalendarEvent, Id, Task } from '@pouxis/core';
import { CliError, UsageError } from './errors.ts';
import type { Messages } from './i18n/index.ts';
import type { DataFile } from './store/schema.ts';

export type Ref = { kind: 'tasks'; record: Task } | { kind: 'events'; record: CalendarEvent };

/** Shortest display length that is enough in practice; grows only when prefixes collide. */
export const MIN_SHORT_ID = 6;

/** Tasks and events whose id starts with `prefix` (case-insensitive). */
export function findByPrefix(data: DataFile, prefix: string): Ref[] {
  const needle = prefix.trim().toLowerCase();
  if (needle === '') return [];
  const refs: Ref[] = [];
  for (const record of data.collections.tasks) {
    if (record.id.toLowerCase().startsWith(needle)) refs.push({ kind: 'tasks', record });
  }
  for (const record of data.collections.events) {
    if (record.id.toLowerCase().startsWith(needle)) refs.push({ kind: 'events', record });
  }
  // An exact id always wins, even if it is also the prefix of a longer one.
  const exact = refs.filter((r) => r.record.id.toLowerCase() === needle);
  return exact.length === 1 ? exact : refs;
}

/** The single record `prefix` designates; throws a helpful error otherwise. */
export function resolveRef(data: DataFile, prefix: string, m: Messages, command: string): Ref {
  if (prefix.trim() === '')
    throw new UsageError(m.errors.missingId, { hint: m.errors.idHint, command });
  const refs = findByPrefix(data, prefix);
  if (refs.length === 1) return refs[0] as Ref;
  if (refs.length === 0) throw new CliError(m.errors.notFound(prefix), { hint: m.errors.idHint });
  const short = shortIds(refs.map((r) => r.record.id));
  const list = refs
    .slice(0, 10)
    .map((r) => `  ${short.get(r.record.id) ?? r.record.id}  ${r.record.title}`)
    .join('\n');
  throw new CliError(`${m.errors.ambiguous(prefix, refs.length)}\n${list}`, {
    hint: m.errors.ambiguousHint,
  });
}

/**
 * Display ids: the shortest prefix (at least `min` characters) that still identifies each id
 * among `ids`. Sorting makes collisions adjacent, so each id only compares with neighbours.
 */
export function shortIds(ids: readonly Id[], min = MIN_SHORT_ID): Map<Id, string> {
  const sorted = [...new Set(ids)].sort();
  const result = new Map<Id, string>();
  sorted.forEach((id, i) => {
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    const shared = Math.max(prev ? commonPrefix(id, prev) : 0, next ? commonPrefix(id, next) : 0);
    result.set(id, id.slice(0, Math.max(min, shared + 1)));
  });
  return result;
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Every task and event id, the universe short ids are computed over. */
export function allRefIds(data: DataFile): Id[] {
  return [...data.collections.tasks.map((t) => t.id), ...data.collections.events.map((e) => e.id)];
}

/**
 * Removes a task or event and every reference to it (dependencies, subtasks, note links,
 * event time blocks, graph nodes), stamping touched records with `now`.
 */
export function removeRecord(data: DataFile, id: Id, now: number): void {
  const c = data.collections;
  c.tasks = c.tasks.filter((t) => t.id !== id);
  c.events = c.events.filter((e) => e.id !== id);
  for (const task of c.tasks) {
    let touched = false;
    if (task.dependsOn.includes(id)) {
      task.dependsOn = task.dependsOn.filter((d) => d !== id);
      touched = true;
    }
    if (task.parentId === id) {
      delete task.parentId;
      touched = true;
    }
    if (touched) task.updatedAt = now;
  }
  for (const event of c.events) {
    if (event.taskId === id) {
      delete event.taskId;
      event.updatedAt = now;
    }
  }
  for (const note of c.notes) {
    if (note.links.includes(id)) {
      note.links = note.links.filter((l) => l !== id);
      note.updatedAt = now;
    }
  }
  for (const graph of c.graphs) {
    let touched = false;
    for (const node of graph.nodes) {
      if (node.refId === id) {
        delete node.refId;
        touched = true;
      }
    }
    if (touched) graph.updatedAt = now;
  }
}
