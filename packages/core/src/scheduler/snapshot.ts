/**
 * Plan snapshots (1.9): freeze the calendar as planned, then compare it with what actually
 * happened to show moves, slips and how accurate the estimates were.
 */
import type { CalendarEvent, Id, Task, Timestamp } from '../model.ts';
import { MINUTE } from '../time.ts';
import { compareIds, isValidInterval } from './calendar.ts';
import { isCompleted, isTask, loggedFocusMin } from './items.ts';
import type {
  PlanSnapshot,
  PlanningAccuracy,
  Slip,
  SnapshotDiff,
  SnapshotEntry,
  SnapshotMove,
} from './types.ts';

/** Events and scheduled tasks, as plain data sorted by start then id. */
export function snapshot(
  items: readonly (Task | CalendarEvent)[],
  takenAt: Timestamp,
): PlanSnapshot {
  const entries: SnapshotEntry[] = [];
  for (const item of items) {
    const entry = isTask(item) ? taskEntry(item) : eventEntry(item);
    if (entry) entries.push(entry);
  }
  entries.sort((a, b) => a.start - b.start || compareIds(a.id, b.id));
  return { takenAt, entries };
}

export function compareSnapshots(planned: PlanSnapshot, actual: PlanSnapshot): SnapshotDiff {
  const before = new Map(planned.entries.map((e) => [e.id, e]));
  const after = new Map(actual.entries.map((e) => [e.id, e]));
  const diff: SnapshotDiff = {
    added: [...after.keys()].filter((id) => !before.has(id)).sort(compareIds),
    removed: [...before.keys()].filter((id) => !after.has(id)).sort(compareIds),
    moved: [],
    completedOnTime: [],
    slipped: [],
    accuracy: accuracy(planned.entries, after),
  };
  for (const plan of planned.entries) {
    const now = after.get(plan.id);
    if (now) {
      const move = moveOf(plan, now);
      if (move) diff.moved.push(move);
    }
    if (plan.kind === 'task') classifyTask(plan, now, actual.takenAt, diff);
  }
  return diff;
}

/* ------------------------------------------------------------------------------------------ */

function taskEntry(task: Task): SnapshotEntry | undefined {
  const slot = task.scheduled;
  if (!slot || !isValidInterval(slot)) return undefined;
  const entry: SnapshotEntry = {
    id: task.id,
    kind: 'task',
    title: task.title,
    start: slot.start,
    end: slot.end,
    status: task.status,
  };
  if (task.estimateMin !== undefined) entry.estimateMin = task.estimateMin;
  const logged = loggedFocusMin(task);
  if (logged > 0) entry.loggedMin = logged;
  if (task.completedAt !== undefined) entry.completedAt = task.completedAt;
  return entry;
}

function eventEntry(event: CalendarEvent): SnapshotEntry | undefined {
  if (!isValidInterval(event)) return undefined;
  return {
    id: event.id,
    kind: 'event',
    title: event.title,
    start: event.start,
    end: event.end,
    fixed: event.fixed,
  };
}

function moveOf(plan: SnapshotEntry, now: SnapshotEntry): SnapshotMove | undefined {
  const deltaStartMin = (now.start - plan.start) / MINUTE;
  const deltaDurationMin = (now.end - now.start - (plan.end - plan.start)) / MINUTE;
  if (deltaStartMin === 0 && deltaDurationMin === 0) return undefined;
  return { id: plan.id, kind: plan.kind, deltaStartMin, deltaDurationMin };
}

/**
 * On time: completed by the end of the planned slot (a completion without a date counts as
 * on time). Otherwise, once the planned slot is over, the task slipped.
 */
function classifyTask(
  plan: SnapshotEntry,
  now: SnapshotEntry | undefined,
  takenAt: Timestamp,
  diff: SnapshotDiff,
) {
  if (now && isCompleted(now)) {
    if (now.completedAt === undefined || now.completedAt <= plan.end) {
      diff.completedOnTime.push(plan.id);
      return;
    }
    const slip: Slip = {
      id: plan.id,
      reason: 'completed-late',
      delayMin: (now.completedAt - plan.end) / MINUTE,
    };
    diff.slipped.push(slip);
    return;
  }
  if (plan.end > takenAt) return;
  const dropped = !now || now.status === 'archived';
  diff.slipped.push({ id: plan.id, reason: dropped ? 'dropped' : 'not-done' });
}

/** Planned estimates against focus time logged on tasks completed in the actual snapshot. */
function accuracy(
  planned: readonly SnapshotEntry[],
  after: ReadonlyMap<Id, SnapshotEntry>,
): PlanningAccuracy {
  let estimatedMin = 0;
  let loggedMin = 0;
  let sampleSize = 0;
  for (const plan of planned) {
    const now = after.get(plan.id);
    const estimate = plan.estimateMin;
    if (plan.kind !== 'task' || !now || !isCompleted(now)) continue;
    if (estimate === undefined || !(estimate > 0) || !(now.loggedMin && now.loggedMin > 0))
      continue;
    estimatedMin += estimate;
    loggedMin += now.loggedMin;
    sampleSize++;
  }
  const out: PlanningAccuracy = { estimatedMin, loggedMin, sampleSize };
  if (sampleSize > 0) out.ratio = estimatedMin / loggedMin;
  return out;
}
