/**
 * End-of-day shutdown. Writing a plan for unfinished goals reduces intrusive thoughts about them
 * (Masicampo and Baumeister, 2011) and a short "ready to resume" note eases the restart (Leroy
 * and Glomb, 2018). The ritual ends on the day's best win (peak-end rule, Kahneman et al., 1993).
 */
import {
  addDays,
  startOfDay,
  tasks as taskEngine,
  type Id,
  type JournalEntry,
  type Task,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import { byImportance, completedOn, isOpen, isPlannedOn } from '../shared/day.ts';
import { dayTag, labTag, withTags } from '../shared/journal.ts';

export const SHUTDOWN_TAG = labTag('shutdown');

export type OpenChoice = 'tomorrow' | 'later' | 'keep';

export interface DayReview {
  done: Task[];
  open: Task[];
}

export function reviewDay(tasks: readonly Task[], now: Timestamp, timeZone: TimeZone): DayReview {
  const done = tasks
    .filter((t) => completedOn(t, now, timeZone))
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
  const open = tasks.filter((t) => isOpen(t) && isPlannedOn(t, now, timeZone)).sort(byImportance);
  return { done, open };
}

/** Default choice: everything planned today moves to tomorrow unless the user says otherwise. */
export function defaultChoices(open: readonly Task[]): Record<Id, OpenChoice> {
  return Object.fromEntries(open.map((t) => [t.id, 'tomorrow' as const]));
}

export interface TaskChange {
  id: Id;
  patch: taskEngine.TaskPatch;
  /** Fields to restore on undo. */
  before: taskEngine.TaskPatch;
}

export function shutdownChanges(
  open: readonly Task[],
  choices: Readonly<Record<Id, OpenChoice>>,
  now: Timestamp,
  timeZone: TimeZone,
): TaskChange[] {
  const tomorrow = addDays(startOfDay(now, timeZone), 1, timeZone);
  const changes: TaskChange[] = [];
  for (const task of open) {
    const choice = choices[task.id] ?? 'keep';
    if (choice === 'keep') continue;
    const patch: taskEngine.TaskPatch =
      choice === 'tomorrow'
        ? taskEngine.postponePatch(task, tomorrow)
        : { floatingDay: undefined, scheduled: undefined, pinned: undefined };
    changes.push({ id: task.id, patch, before: snapshot(task, patch) });
  }
  return changes;
}

function snapshot(task: Task, patch: taskEngine.TaskPatch): taskEngine.TaskPatch {
  const before: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) before[key] = task[key as keyof Task];
  return before as taskEngine.TaskPatch;
}

/** The win to end on: most important, then the most focused, then the latest. */
export function highlight(done: readonly Task[]): Task | undefined {
  return [...done].sort(
    (a, b) =>
      Number(b.important ?? false) - Number(a.important ?? false) ||
      b.priority - a.priority ||
      taskEngine.focusMinutes(b) - taskEngine.focusMinutes(a) ||
      (b.completedAt ?? 0) - (a.completedAt ?? 0),
  )[0];
}

export function todaysShutdown(
  journal: readonly JournalEntry[],
  now: Timestamp,
  timeZone: TimeZone,
): JournalEntry | undefined {
  return withTags(journal, SHUTDOWN_TAG, dayTag(now, timeZone)).find((e) => e.kind === 'dump');
}

export function movedCount(changes: readonly TaskChange[]): number {
  return changes.filter((c) => c.patch.floatingDay !== undefined).length;
}

const MOVED_PREFIX = labTag('moved', '');

export function shutdownTags(now: Timestamp, timeZone: TimeZone, moved: number): string[] {
  return [SHUTDOWN_TAG, dayTag(now, timeZone), MOVED_PREFIX + String(moved)];
}

/** Number of tasks moved to tomorrow, as recorded on the shutdown entry. */
export function recordedMoved(entry: JournalEntry): number {
  const tag = entry.tags.find((t) => t.startsWith(MOVED_PREFIX));
  const value = tag ? Number(tag.slice(MOVED_PREFIX.length)) : 0;
  return Number.isFinite(value) ? value : 0;
}
