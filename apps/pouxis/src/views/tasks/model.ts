/**
 * Pure view-model of the tasks view: list grouping, filters, search and quick-add mapping.
 * No React, no store: everything here is deterministic and unit-tested.
 */
import {
  addDays,
  nlp,
  startOfDay,
  tasks as engine,
  type Locale,
  type Task,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import type { NewRecord } from '../../store/index.ts';

/** Values double as the `view` route parameter: `#/tasks?view=kanban`. */
export type TaskViewMode = 'list' | 'kanban' | 'matrix' | 'deps';
export const VIEW_MODES: readonly TaskViewMode[] = ['list', 'kanban', 'matrix', 'deps'];

export function parseViewMode(value: string | null): TaskViewMode {
  return VIEW_MODES.find((m) => m === value) ?? 'list';
}

export type ListGroupId =
  'inbox' | 'today' | 'toReschedule' | 'upcoming' | 'noDate' | 'waiting' | 'done';

export const LIST_GROUPS: readonly ListGroupId[] = [
  'inbox',
  'today',
  'toReschedule',
  'upcoming',
  'noDate',
  'waiting',
  'done',
];

export interface ListGroup {
  id: ListGroupId;
  tasks: Task[];
}

/** Toggle filters shown as pills; they combine with AND. */
export type FilterPill = 'today' | 'priority' | 'create' | 'organize' | 'blocked' | 'quick';
export const FILTER_PILLS: readonly FilterPill[] = [
  'today',
  'priority',
  'create',
  'organize',
  'blocked',
  'quick',
];

export interface TaskFilters {
  query: string;
  pills: readonly FilterPill[];
  tags: readonly string[];
}

export const EMPTY_FILTERS: TaskFilters = { query: '', pills: [], tags: [] };

/** Tasks shorter than this count as quick wins for the « quick » pill. */
export const QUICK_TASK_MIN = 15;

export function isFiltering(f: TaskFilters): boolean {
  return f.query.trim() !== '' || f.pills.length > 0 || f.tags.length > 0;
}

/** Top-level tasks: subtasks live inside their parent's detail sheet. */
export function isTopLevel(task: Task, byId: ReadonlyMap<string, Task>): boolean {
  return task.parentId === undefined || !byId.has(task.parentId);
}

/** Day the task is planned on (floating day or slot start), if any. */
export function plannedAt(task: Task): Timestamp | undefined {
  return task.floatingDay ?? task.scheduled?.start;
}

/** True when the task is planned or due on the day starting at `dayStart`. */
export function isOnDay(task: Task, dayStart: Timestamp, timeZone: TimeZone): boolean {
  const dayEnd = addDays(dayStart, 1, timeZone);
  const within = (ts: Timestamp | undefined) => ts !== undefined && ts >= dayStart && ts < dayEnd;
  return within(plannedAt(task)) || within(task.deadline);
}

/** The planned day or deadline is already behind us: the task needs a new moment. */
export function needsReschedule(task: Task, todayStart: Timestamp): boolean {
  if (!engine.isOpen(task)) return false;
  const planned = plannedAt(task);
  const plannedPast = planned !== undefined && planned < todayStart;
  const deadlinePast = task.deadline !== undefined && task.deadline < todayStart;
  return plannedPast || deadlinePast;
}

export function matchesQuery(task: Task, query: string): boolean {
  const q = engine.foldText(query.trim());
  if (!q) return true;
  const haystack = engine.foldText([task.title, task.notes ?? '', ...task.tags].join(' '));
  return q.split(/\s+/).every((word) => haystack.includes(word.replace(/^#/, '')));
}

export function matchesFilters(
  task: Task,
  f: TaskFilters,
  ctx: { byId: ReadonlyMap<string, Task>; todayStart: Timestamp; timeZone: TimeZone },
): boolean {
  if (!matchesQuery(task, f.query)) return false;
  const tags = new Set(task.tags.map(engine.foldTag));
  if (!f.tags.every((tag) => tags.has(engine.foldTag(tag)))) return false;
  return f.pills.every((pill) => matchesPill(task, pill, ctx));
}

function matchesPill(
  task: Task,
  pill: FilterPill,
  ctx: { byId: ReadonlyMap<string, Task>; todayStart: Timestamp; timeZone: TimeZone },
): boolean {
  switch (pill) {
    case 'today':
      return isOnDay(task, ctx.todayStart, ctx.timeZone);
    case 'priority':
      return task.priority === 3;
    case 'create':
    case 'organize':
      return task.mode === pill;
    case 'blocked':
      return engine.isOpen(task) && !engine.isActionable(task, ctx.byId);
    case 'quick':
      return task.estimateMin !== undefined && task.estimateMin <= QUICK_TASK_MIN;
  }
}

/** Most used tags among open tasks, most frequent first, for the tag pills. */
export function topTags(tasks: readonly Task[], limit = 6): string[] {
  const counts = new Map<string, { tag: string; n: number }>();
  for (const task of tasks) {
    if (!engine.isOpen(task)) continue;
    for (const tag of task.tags) {
      const key = engine.foldTag(tag);
      const entry = counts.get(key) ?? { tag, n: 0 };
      entry.n++;
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag))
    .slice(0, limit)
    .map((e) => e.tag);
}

function groupOf(
  task: Task,
  byId: ReadonlyMap<string, Task>,
  todayStart: Timestamp,
  timeZone: TimeZone,
): ListGroupId {
  if (task.status === 'done') return 'done';
  if (task.status === 'inbox') return 'inbox';
  if (!engine.isActionable(task, byId)) return 'waiting';
  if (isOnDay(task, todayStart, timeZone)) return 'today';
  if (needsReschedule(task, todayStart)) return 'toReschedule';
  if (plannedAt(task) !== undefined || task.deadline !== undefined) return 'upcoming';
  return 'noDate';
}

/** Earliest relevant instant of a task, for ordering inside a group. */
function sortKey(task: Task): number {
  const candidates = [task.scheduled?.start, task.floatingDay, task.deadline].filter(
    (v): v is number => v !== undefined,
  );
  return candidates.length > 0 ? Math.min(...candidates) : Number.POSITIVE_INFINITY;
}

function compareInGroup(group: ListGroupId, a: Task, b: Task): number {
  if (group === 'done') return (b.completedAt ?? 0) - (a.completedAt ?? 0);
  if (group === 'inbox') return b.createdAt - a.createdAt;
  const byDate = sortKey(a) - sortKey(b);
  if (Number.isFinite(byDate) && byDate !== 0) return byDate;
  if (sortKey(a) !== sortKey(b)) return Number.isFinite(sortKey(a)) ? -1 : 1;
  return b.priority - a.priority || a.createdAt - b.createdAt;
}

/**
 * Spark-like smart list: top-level, non-archived tasks sorted into decision groups.
 * Empty groups are omitted; group order follows `LIST_GROUPS`.
 */
export function groupTasks(
  all: readonly Task[],
  visible: readonly Task[],
  now: Timestamp,
  timeZone: TimeZone,
): ListGroup[] {
  const byId = engine.indexById(all);
  const todayStart = startOfDay(now, timeZone);
  const buckets = new Map<ListGroupId, Task[]>(LIST_GROUPS.map((g) => [g, []]));
  for (const task of visible) {
    if (task.status === 'archived' || !isTopLevel(task, byId)) continue;
    buckets.get(groupOf(task, byId, todayStart, timeZone))?.push(task);
  }
  return LIST_GROUPS.flatMap((id) => {
    const tasks = buckets.get(id) ?? [];
    tasks.sort((a, b) => compareInGroup(id, a, b));
    return tasks.length > 0 ? [{ id, tasks }] : [];
  });
}

/** Builds a new task from a capture line (« Appeler Léa demain 15h #perso »). */
export function taskFromCapture(
  text: string,
  ctx: { now: Timestamp; timeZone: TimeZone; locale: Locale },
): NewRecord<'tasks'> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const r = nlp.parse(trimmed, ctx);
  const title = r.title.trim() || trimmed;
  const estimateMin = r.estimateMin ?? r.durationMin;
  const record: NewRecord<'tasks'> = {
    title,
    status: 'inbox',
    priority: r.priority ?? 0,
    tags: r.tags,
    dependsOn: [],
    mode: r.mode ?? nlp.inferMode(title) ?? 'organize',
    postponedCount: 0,
    timeLogs: [],
  };
  if (estimateMin !== undefined) record.estimateMin = estimateMin;
  if (r.deadline !== undefined) record.deadline = r.deadline;
  if (r.recurrence) record.recurrence = r.recurrence;
  if (r.start !== undefined) {
    if (r.allDay) record.floatingDay = r.start;
    else
      record.scheduled = { start: r.start, end: r.end ?? r.start + (estimateMin ?? 30) * 60_000 };
  }
  // Anything with a date or a priority has already been triaged.
  const triaged = r.start !== undefined || r.deadline !== undefined || record.priority > 0;
  if (triaged) record.status = 'todo';
  return record;
}

/** Day a « schedule » swipe moves a task to: today, or tomorrow if it is already planned today. */
export function nextPlanDay(task: Task, now: Timestamp, timeZone: TimeZone): Timestamp {
  const today = startOfDay(now, timeZone);
  const tomorrow = addDays(today, 1, timeZone);
  const planned = plannedAt(task);
  const onToday = planned !== undefined && planned >= today && planned < tomorrow;
  return onToday ? tomorrow : today;
}
