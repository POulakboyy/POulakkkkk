/**
 * Lab features persist through the shared `journal` collection, namespaced by `lab:*` tags so
 * they stay recognisable (and filterable) by other views:
 *
 * - `lab:intention` + `lab:day:<YYYY-MM-DD>` (+ `lab:task:<id>`) — daily intention (`dump`);
 * - `lab:shutdown` + `lab:day:<key>` — day shutdown resume note (`dump`), friction (`friction`);
 * - `lab:energy` + `lab:energy:<level>` — energy check-in (`dump`);
 * - `lab:task:<id>` on a `win` — win added from a completed task.
 *
 * `win` and `friction` entries feed `insights.weeklyReview` like any other.
 */
import { dayKey, type Id, type JournalEntry, type TimeZone, type Timestamp } from '@pouxis/core';

export const LAB_PREFIX = 'lab:';

export function labTag(...parts: string[]): string {
  return LAB_PREFIX + parts.join(':');
}

export function dayTag(ts: Timestamp, timeZone: TimeZone): string {
  return labTag('day', dayKey(ts, timeZone));
}

export function taskTag(taskId: Id): string {
  return labTag('task', taskId);
}

/** True for entries written by a lab feature (to keep them out of the brain-dump inbox). */
export function isLabEntry(entry: JournalEntry): boolean {
  return entry.tags.some((tag) => tag.startsWith(LAB_PREFIX));
}

export function hasTag(entry: JournalEntry, tag: string): boolean {
  return entry.tags.includes(tag);
}

/** The id carried by a `lab:task:<id>` tag, if any. */
export function linkedTaskId(entry: JournalEntry): Id | undefined {
  const prefix = taskTag('');
  return entry.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) || undefined;
}

/** Entries carrying every given tag, newest first. */
export function withTags(entries: readonly JournalEntry[], ...tags: string[]): JournalEntry[] {
  return entries
    .filter((entry) => tags.every((tag) => entry.tags.includes(tag)))
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1));
}
