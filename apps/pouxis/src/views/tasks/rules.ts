/**
 * Pure decision helpers of the tasks view: WIP limit checks (2.15), dependency candidates with
 * cycle prevention (2.1), Eisenhower placement reasons (2.4) and date-input conversions.
 */
import {
  addDays,
  dayKey,
  fromZoned,
  startOfDay,
  tasks as engine,
  type Task,
  type TimeZone,
  type Timestamp,
  type UserPrefs,
} from '@pouxis/core';
import { plannedAt } from './model.ts';

/* ---------------------------------------------------------------------------------------- */
/* WIP limit                                                                                  */
/* ---------------------------------------------------------------------------------------- */

export interface WipConflict {
  day: Timestamp;
  count: number;
  limit: number;
  /** High-priority tasks already planned that day (swap candidates). */
  others: Task[];
  reason: engine.WipReason;
}

/**
 * Whether saving `candidate` (a new task, or an existing one with its pending patch applied)
 * would plan one high-priority task too many on its day. `null` when the save is fine.
 */
export function wipConflict(
  all: readonly Task[],
  candidate: Pick<Task, 'priority' | 'status' | 'floatingDay' | 'scheduled'> & { id?: string },
  prefs: Pick<UserPrefs, 'wipLimit' | 'timeZone'>,
): WipConflict | null {
  if (candidate.priority !== 3 || !engine.isOpen(candidate as Task)) return null;
  const planned = plannedAt(candidate as Task);
  if (planned === undefined) return null;
  const others = all.filter((t) => t.id !== candidate.id);
  const check = engine.canAddPriorityTask(others, planned, prefs, prefs.timeZone);
  if (check.allowed || !check.reason) return null;
  const byId = engine.indexById(others);
  return {
    day: startOfDay(planned, prefs.timeZone),
    count: check.status.count,
    limit: check.status.limit,
    others: check.status.taskIds.flatMap((id) => byId.get(id) ?? []),
    reason: check.reason,
  };
}

/* ---------------------------------------------------------------------------------------- */
/* Dependencies                                                                               */
/* ---------------------------------------------------------------------------------------- */

export interface DependencyOption {
  task: Task;
  /** Adding it would close a loop: shown, but refused with an explanation. */
  cycle: boolean;
}

/** Tasks `task` could wait on: open, top-level or not, not itself, not already linked. */
export function dependencyOptions(task: Task, all: readonly Task[]): DependencyOption[] {
  const linked = new Set(task.dependsOn);
  return all
    .filter((t) => t.id !== task.id && !linked.has(t.id) && engine.isOpen(t))
    .map((t) => ({ task: t, cycle: engine.wouldCreateCycle(all, task.id, t.id) }))
    .sort((a, b) => Number(a.cycle) - Number(b.cycle) || a.task.title.localeCompare(b.task.title));
}

export type AddDependencyResult =
  | { ok: true; dependsOn: string[] }
  | { ok: false; reason: 'cycle' | 'self' | 'duplicate' | 'missing' };

/** Validates a new link `task` → `blockerId` and returns the new `dependsOn`. */
export function addDependency(
  task: Task,
  blockerId: string,
  all: readonly Task[],
): AddDependencyResult {
  if (blockerId === task.id) return { ok: false, reason: 'self' };
  if (task.dependsOn.includes(blockerId)) return { ok: false, reason: 'duplicate' };
  if (!all.some((t) => t.id === blockerId)) return { ok: false, reason: 'missing' };
  if (engine.wouldCreateCycle(all, task.id, blockerId)) return { ok: false, reason: 'cycle' };
  return { ok: true, dependsOn: [...task.dependsOn, blockerId] };
}

/** Tasks that take part in at least one dependency link, in dependency order. */
export function linkedTasks(all: readonly Task[]): Task[] {
  const live = all.filter((t) => t.status !== 'archived');
  const byId = engine.indexById(live);
  const involved = new Set<string>();
  for (const t of live) {
    const deps = t.dependsOn.filter((id) => byId.has(id));
    if (deps.length === 0) continue;
    involved.add(t.id);
    for (const id of deps) involved.add(id);
  }
  return engine.topoOrder(live).filter((t) => involved.has(t.id));
}

/* ---------------------------------------------------------------------------------------- */
/* Eisenhower                                                                                 */
/* ---------------------------------------------------------------------------------------- */

export type QuadrantReason =
  | { kind: 'deadline'; at: Timestamp }
  | { kind: 'priority' }
  | { kind: 'tag'; tag: string }
  | { kind: 'manual' };

/** Why the matrix put `task` where it is, most decisive signal first. */
export function quadrantReasons(task: Task, now: Timestamp): QuadrantReason[] {
  const out: QuadrantReason[] = [];
  if (task.important !== undefined) out.push({ kind: 'manual' });
  const window = engine.DEFAULT_URGENT_WITHIN_MIN * 60_000;
  if (task.deadline !== undefined && task.deadline - now <= window) {
    out.push({ kind: 'deadline', at: task.deadline });
  }
  if (task.important === undefined && task.priority === 3) out.push({ kind: 'priority' });
  const signal = new Set(
    [...engine.DEFAULT_URGENT_TAGS, ...engine.DEFAULT_IMPORTANT_TAGS].map(engine.foldTag),
  );
  const tag = task.tags.find((t) => signal.has(engine.foldTag(t)));
  if (tag !== undefined) out.push({ kind: 'tag', tag });
  return out;
}

/* ---------------------------------------------------------------------------------------- */
/* Date inputs                                                                                */
/* ---------------------------------------------------------------------------------------- */

/** `YYYY-MM-DD` value of an `<input type="date">` for a timestamp, in the user's zone. */
export function toDateInput(ts: Timestamp | undefined, timeZone: TimeZone): string {
  return ts === undefined ? '' : dayKey(ts, timeZone);
}

/** Start of the day typed in an `<input type="date">`, or `undefined` when empty/invalid. */
export function fromDateInput(value: string, timeZone: TimeZone): Timestamp | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return fromZoned({ year, month, day }, timeZone);
}

/** A deadline typed as a day means « by the end of that day »: 23:59 local. */
export function deadlineFromDateInput(value: string, timeZone: TimeZone): Timestamp | undefined {
  const day = fromDateInput(value, timeZone);
  return day === undefined ? undefined : addDays(day, 1, timeZone) - 60_000;
}
