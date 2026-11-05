/**
 * Wins jar. Noticing small progress is what Amabile and Kramer (2011) tie to motivation at work,
 * and resurfacing an older win gives the weekly review a positive peak (Kahneman et al., 1993).
 * Wins are plain `win` journal entries, so `insights.weeklyReview` already counts them.
 */
import {
  startOfWeek,
  type Id,
  type JournalEntry,
  type Task,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import { completedOn } from '../shared/day.ts';
import { labTag, linkedTaskId, taskTag } from '../shared/journal.ts';

export const WIN_TAG = labTag('win');
/** Pebbles drawn in the jar before the rest collapses into "+n". */
export const JAR_CAPACITY = 18;

function newestFirst(a: JournalEntry, b: JournalEntry): number {
  return b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1);
}

export function winTags(taskId?: Id): string[] {
  return taskId ? [WIN_TAG, taskTag(taskId)] : [WIN_TAG];
}

/**
 * Wins since the start of the current week (Monday), newest first. No upper bound: `now` is a
 * minute-resolution clock, so an entry created a moment ago may be slightly in its future.
 */
export function winsThisWeek(
  journal: readonly JournalEntry[],
  now: Timestamp,
  timeZone: TimeZone,
): JournalEntry[] {
  const from = startOfWeek(now, timeZone);
  return journal.filter((e) => e.kind === 'win' && e.createdAt >= from).sort(newestFirst);
}

/** Tasks completed today that are not in the jar yet. */
export function unjarredCompletions(
  tasks: readonly Task[],
  journal: readonly JournalEntry[],
  now: Timestamp,
  timeZone: TimeZone,
): Task[] {
  const jarred = new Set(
    journal
      .filter((e) => e.kind === 'win')
      .map(linkedTaskId)
      .filter((id) => id !== undefined),
  );
  return tasks
    .filter((t) => completedOn(t, now, timeZone) && !jarred.has(t.id))
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

/** Wins from before this week, oldest first, as a stable pool for "memories". */
export function pastWins(
  journal: readonly JournalEntry[],
  now: Timestamp,
  timeZone: TimeZone,
): JournalEntry[] {
  const from = startOfWeek(now, timeZone);
  return journal
    .filter((e) => e.kind === 'win' && e.createdAt < from && e.text.trim() !== '')
    .sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}

/** The memory at position `turn` in the pool, cycling; `undefined` when there is none. */
export function memoryAt(pool: readonly JournalEntry[], turn: number): JournalEntry | undefined {
  if (pool.length === 0) return undefined;
  const index = ((Math.trunc(turn) % pool.length) + pool.length) % pool.length;
  return pool[index];
}

/** Category colour (1–8) for a pebble, stable for a given entry id. */
export function pebbleColor(id: Id): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return (hash % 8) + 1;
}
