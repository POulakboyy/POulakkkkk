/**
 * Planning snapshots (1.9): a frozen copy of the week's plan, compared later with what the
 * calendar became. Snapshots are kept on this device (see `persist.ts`).
 */
import {
  dayKey,
  overlaps,
  scheduler,
  type CalendarEvent,
  type Interval,
  type Task,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';
import { asEvent, type EventInstance } from './expand.ts';
import { readStored, writeStored } from './persist.ts';

/**
 * Items of the plan inside `range`. A recurring occurrence is identified by its series and
 * local day, so moving the series within the day reads as "moved", not "removed + added".
 */
export function planItems(
  instances: readonly EventInstance[],
  tasks: readonly Task[],
  range: Interval,
  timeZone: TimeZone,
): (Task | CalendarEvent)[] {
  const events = instances
    .filter((i) => i.event.kind !== 'buffer' && overlaps(i, range))
    .map((i) =>
      i.recurring
        ? { ...asEvent(i), id: `${i.event.id}@${dayKey(i.start, timeZone)}` }
        : asEvent(i),
    );
  const planned = tasks.filter((t) => t.scheduled && overlaps(t.scheduled, range));
  return [...events, ...planned];
}

function storageKey(weekStart: Timestamp): string {
  return `snapshot.${weekStart}`;
}

function isSnapshot(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { takenAt?: unknown; entries?: unknown };
  return typeof v.takenAt === 'number' && Array.isArray(v.entries);
}

export function loadSnapshot(weekStart: Timestamp): scheduler.PlanSnapshot | null {
  return readStored<scheduler.PlanSnapshot | null>(storageKey(weekStart), null, isSnapshot);
}

export function saveSnapshot(weekStart: Timestamp, snapshot: scheduler.PlanSnapshot): void {
  writeStored(storageKey(weekStart), snapshot);
}

export interface SnapshotSummary {
  kept: number;
  moved: number;
  added: number;
  removed: number;
  completedOnTime: number;
  slipped: number;
  /** `estimated / logged` over completed tasks, when measurable. */
  accuracy?: number;
}

export function summarize(
  planned: scheduler.PlanSnapshot,
  diff: scheduler.SnapshotDiff,
): SnapshotSummary {
  const changed = new Set([...diff.removed, ...diff.moved.map((m) => m.id)]);
  const summary: SnapshotSummary = {
    kept: planned.entries.filter((e) => !changed.has(e.id)).length,
    moved: diff.moved.length,
    added: diff.added.length,
    removed: diff.removed.length,
    completedOnTime: diff.completedOnTime.length,
    slipped: diff.slipped.length,
  };
  if (diff.accuracy.ratio !== undefined) summary.accuracy = diff.accuracy.ratio;
  return summary;
}

/** Planned entries that moved or disappeared: drawn as outlines ("ghosts") in the grid. */
export function ghosts(
  planned: scheduler.PlanSnapshot,
  diff: scheduler.SnapshotDiff,
): scheduler.SnapshotEntry[] {
  const changed = new Set([...diff.removed, ...diff.moved.map((m) => m.id)]);
  return planned.entries.filter((e) => changed.has(e.id));
}
