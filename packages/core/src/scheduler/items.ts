/** Internal predicates and extractors over tasks and events. */
import type { CalendarEvent, Id, Interval, Minutes, Task, TaskStatus, Timestamp } from '../model.ts';
import { MINUTE, mergeIntervals } from '../time.ts';
import { compareIds, isValidInterval } from './calendar.ts';

const OPEN: ReadonlySet<TaskStatus> = new Set(['inbox', 'todo', 'doing']);
const ACTIONABLE: ReadonlySet<TaskStatus> = new Set(['todo', 'doing']);

export function isTask(item: Task | CalendarEvent): item is Task {
  return 'status' in item;
}

/** Not done nor archived. */
export function isOpen(task: Task): boolean {
  return OPEN.has(task.status);
}

/** Ready to be worked on: `todo` or `doing`. */
export function isActionable(task: Task): boolean {
  return ACTIONABLE.has(task.status);
}

/** Done or archived with a completion date. */
export function isCompleted(task: { status?: TaskStatus; completedAt?: Timestamp }): boolean {
  return task.status === 'done' || (task.status === 'archived' && task.completedAt !== undefined);
}

/** Dependencies missing from `byId` (deleted tasks) do not block. */
export function dependenciesDone(task: Task, byId: ReadonlyMap<Id, Task>): boolean {
  return task.dependsOn.every((id) => {
    const dep = byId.get(id);
    return dep === undefined || isCompleted(dep);
  });
}

/** Tasks with at least one open subtask: their subtasks carry the work and get routed instead. */
export function openParents(tasks: readonly Task[]): Set<Id> {
  const out = new Set<Id>();
  for (const t of tasks) if (t.parentId !== undefined && isOpen(t)) out.add(t.parentId);
  return out;
}

/** Tasks already time-blocked by a calendar event. */
export function linkedTaskIds(events: readonly CalendarEvent[]): Set<Id> {
  const out = new Set<Id>();
  for (const e of events) if (e.taskId !== undefined) out.add(e.taskId);
  return out;
}

/** Slot of an open task that still occupies the calendar. */
export function occupiedSlot(task: Task): Interval | undefined {
  return task.scheduled && isOpen(task) && isValidInterval(task.scheduled)
    ? task.scheduled
    : undefined;
}

export function eventIntervals(events: readonly CalendarEvent[]): Interval[] {
  const out: Interval[] = [];
  for (const e of events) if (isValidInterval(e)) out.push({ start: e.start, end: e.end });
  return out;
}

/**
 * Focused work already on the calendar, merged: `focus` events, slots of open scheduled
 * tasks, and slots of completed tasks that started before `now`.
 */
export function focusIntervals(
  events: readonly CalendarEvent[],
  slots: readonly Interval[],
  tasks: readonly Task[],
  now: Timestamp,
): Interval[] {
  const out: Interval[] = [...slots];
  for (const e of events) if (e.kind === 'focus' && isValidInterval(e)) out.push(e);
  for (const t of tasks) {
    const s = t.scheduled;
    if (s && isCompleted(t) && s.start < now && isValidInterval(s)) out.push(s);
  }
  return mergeIntervals(out);
}

/** Earliest deadline first, then higher priority, then older, then id (total order). */
export function compareTasks(a: Task, b: Task): number {
  const da = a.deadline ?? Number.POSITIVE_INFINITY;
  const db = b.deadline ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da < db ? -1 : 1;
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return compareIds(a.id, b.id);
}

export function loggedFocusMin(task: Task): Minutes {
  let total = 0;
  for (const log of task.timeLogs) {
    if (log.kind === 'focus' && log.end > log.start) total += log.end - log.start;
  }
  return total / MINUTE;
}
