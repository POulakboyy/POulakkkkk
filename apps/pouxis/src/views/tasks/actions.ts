/**
 * Store mutations of the tasks view. Spark-style: act immediately, then offer « Annuler » in a
 * toast instead of asking for confirmation. Undo restores exact snapshots of every task touched.
 */
import { tasks as engine, type Task, type Timestamp } from '@pouxis/core';
import type { MessageKey, MessageVars } from '../../i18n/index.ts';
import { store, type NewRecord, type RecordPatch } from '../../store/index.ts';
import { toast } from '../../ui/index.ts';

export type Translate = (key: MessageKey, vars?: MessageVars) => string;

/** Optional task keys, cleared explicitly when a snapshot without them is restored. */
const OPTIONAL_KEYS = [
  'notes',
  'projectId',
  'parentId',
  'estimateMin',
  'deadline',
  'floatingDay',
  'scheduled',
  'pinned',
  'energy',
  'important',
  'recurrence',
  'geo',
  'fields',
  'completedAt',
  'icon',
  'color',
] as const satisfies readonly (keyof Task)[];

/** Patch that turns any later version of a task back into `snapshot`. */
export function restorePatch(snapshot: Task): RecordPatch<'tasks'> {
  const cleared = Object.fromEntries(OPTIONAL_KEYS.map((k) => [k, undefined]));
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = snapshot;
  return { ...cleared, ...rest };
}

/** Puts snapshots back: updates tasks that still exist, re-creates deleted ones. */
export function restore(snapshots: readonly Task[]): void {
  for (const snap of snapshots) {
    if (store.get('tasks', snap.id)) store.update('tasks', snap.id, restorePatch(snap));
    else {
      const { createdAt: _c, updatedAt: _u, ...record } = snap;
      store.create('tasks', record as NewRecord<'tasks'>);
    }
  }
}

function undoToast(t: Translate, title: string, snapshots: readonly Task[], description?: string) {
  toast({
    title,
    ...(description !== undefined && { description }),
    action: { label: t('common.undo'), onClick: () => restore(snapshots) },
  });
}

/** Applies a patch and offers undo. */
export function patchTask(task: Task, patch: RecordPatch<'tasks'>, t: Translate, title: string) {
  store.update('tasks', task.id, patch);
  undoToast(t, title, [task]);
}

export function completeTask(task: Task, t: Translate, now: Timestamp = Date.now()): void {
  const move = engine.moveCardPatch(task, 'done', 'status', { now });
  if (!move.ok) return;
  store.update('tasks', task.id, move.patch);
  const unlocked = engine.unlockedBy(task.id, store.all('tasks'));
  const description =
    unlocked.length > 0 ? t('tasks.dependencies.unlocks', { count: unlocked.length }) : undefined;
  undoToast(t, t('tasks.toast.completed'), [task], description);
}

export function reopenTask(task: Task, t: Translate): void {
  store.update('tasks', task.id, { status: 'todo', completedAt: undefined });
  undoToast(t, t('tasks.toast.reopened'), [task]);
}

export function toggleDone(task: Task, t: Translate): void {
  if (task.status === 'done') reopenTask(task, t);
  else completeTask(task, t);
}

/** Deletes a task and its subtasks (they would otherwise be orphaned), with undo. */
export function deleteTask(task: Task, t: Translate): void {
  const all = store.all('tasks');
  const descendants = collectDescendants(task.id, all);
  const snapshots = [task, ...descendants];
  for (const snap of snapshots) store.remove('tasks', snap.id);
  undoToast(t, t('tasks.toast.deleted'), snapshots);
}

function collectDescendants(rootId: string, all: readonly Task[]): Task[] {
  const out: Task[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const child of all) {
      if (child.parentId === id && !out.includes(child)) {
        out.push(child);
        queue.push(child.id);
      }
    }
  }
  return out;
}

/** Plans a task on a day (floating, no time); later days feed task decay (2.3). */
export function planPatch(task: Task, day: Timestamp): RecordPatch<'tasks'> {
  const base = engine.postponePatch(task, day);
  return task.status === 'inbox' ? { ...base, status: 'todo' } : base;
}

export function planTask(task: Task, day: Timestamp, t: Translate, when: string): void {
  patchTask(task, planPatch(task, day), t, t('tasks.toast.scheduled', { when }));
}
