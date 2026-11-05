/**
 * Daily intention as an implementation intention: "when <cue>, <where>, I start <action>".
 * Gollwitzer and Sheeran (2006) report a medium-to-large effect of such if-then plans on goal
 * attainment; a concrete slot follows the same logic (docs/research/SCIENTIFIC_BASIS.md § 2).
 */
import {
  scheduler,
  startOfDay,
  type CalendarEvent,
  type Interval,
  type JournalEntry,
  type Task,
  type Timestamp,
  type UserPrefs,
} from '@pouxis/core';
import { dayTag, labTag, linkedTaskId, withTags } from '../shared/journal.ts';
import { byImportance, isOpen, isPlannedOn } from '../shared/day.ts';

export const INTENTION_TAG = labTag('intention');

export interface IntentionDraft {
  action: string;
  when: string;
  where: string;
  taskId?: string;
}

/** Trims, collapses whitespace and drops trailing punctuation so fragments compose cleanly. */
export function cleanFragment(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s.,;:!?…]+$/u, '');
}

export function isComplete(draft: IntentionDraft): boolean {
  return cleanFragment(draft.action) !== '' && cleanFragment(draft.when) !== '';
}

/** Open tasks worth an intention today: planned today first, then the most important. */
export function intentionCandidates(
  tasks: readonly Task[],
  now: Timestamp,
  prefs: UserPrefs,
  limit = 4,
): Task[] {
  const open = tasks.filter((t) => isOpen(t) && !t.parentId);
  const today = open.filter((t) => isPlannedOn(t, now, prefs.timeZone)).sort(byImportance);
  const rest = open
    .filter((t) => !isPlannedOn(t, now, prefs.timeZone) && (t.important || t.priority >= 2))
    .sort(byImportance);
  return [...today, ...rest].slice(0, limit);
}

/** Today's latest intention entry, if any. */
export function todaysIntention(
  journal: readonly JournalEntry[],
  now: Timestamp,
  prefs: UserPrefs,
): JournalEntry | undefined {
  return withTags(journal, INTENTION_TAG, dayTag(now, prefs.timeZone))[0];
}

export function intentionTags(draft: IntentionDraft, now: Timestamp, prefs: UserPrefs): string[] {
  const tags = [INTENTION_TAG, dayTag(now, prefs.timeZone)];
  if (draft.taskId) tags.push(labTag('task', draft.taskId));
  return tags;
}

export { linkedTaskId };

/**
 * First free slot today for `task` (default 30 min), using the scheduler's floating-task
 * magnet: the task is treated as floating today, everything else keeps its place.
 */
export function suggestSlot(
  task: Task,
  tasks: readonly Task[],
  events: readonly CalendarEvent[],
  prefs: UserPrefs,
  now: Timestamp,
): Interval | undefined {
  if (task.scheduled && task.scheduled.start >= now && task.scheduled.end > now) {
    return task.scheduled;
  }
  const floating: Task = {
    ...task,
    status: task.status === 'inbox' ? 'todo' : task.status,
    floatingDay: startOfDay(now, prefs.timeZone),
    scheduled: undefined,
    pinned: undefined,
  };
  // Other floating tasks stay unplaced so this one gets the first truly free gap.
  const others = tasks
    .filter((t) => t.id !== task.id)
    .map((t) => (t.floatingDay === undefined ? t : { ...t, floatingDay: undefined }));
  const { suggestions } = scheduler.magnetize({
    day: now,
    tasks: [...others, floating],
    events,
    prefs,
    now,
  });
  const slot = suggestions.find((s) => s.taskId === task.id && s.chunk === undefined);
  return slot ? { start: slot.start, end: slot.end } : undefined;
}
