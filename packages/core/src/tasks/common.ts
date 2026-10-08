import type { Id, Task } from '../model.ts';

/**
 * A partial update for a task, ready for `store.update('tasks', id, patch)`.
 * A key present with the value `undefined` means "clear this optional field".
 */
export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;

/** Lookup table of tasks by id. */
export type TaskLookup = ReadonlyMap<Id, Task>;

/** Why a drag-and-drop move (kanban card, Eisenhower quadrant) cannot be expressed as a patch. */
export type MoveRefusal = 'unknown-column' | 'deadline-too-close' | 'hierarchy-cycle';

export type MoveResult = { ok: true; patch: TaskPatch } | { ok: false; reason: MoveRefusal };

/** A task still to be worked on: not done and not archived. */
export function isOpen(task: Task): boolean {
  return task.status !== 'done' && task.status !== 'archived';
}

/** A task that was finished (it may since have been archived). */
export function isCompleted(task: Task): boolean {
  return task.status === 'done' || task.completedAt !== undefined;
}

/** Indexes tasks by id; on duplicate ids the first occurrence wins. */
export function indexById(tasks: readonly Task[]): Map<Id, Task> {
  const byId = new Map<Id, Task>();
  for (const task of tasks) if (!byId.has(task.id)) byId.set(task.id, task);
  return byId;
}

/** Lower-cases and strips diacritics so `Clé`, `cle` and `CLE` compare equal. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .trim();
}

/** Canonical form of a tag for matching: folded, without a leading `#`. */
export function foldTag(tag: string): string {
  return foldText(tag).replace(/^#+/, '');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
