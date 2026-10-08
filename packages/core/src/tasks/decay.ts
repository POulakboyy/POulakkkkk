/**
 * Task decay (2.3): a task that keeps being postponed — or sits untouched for weeks — fades
 * (towards grey or red in the UI) so it gets either done, re-planned or dropped.
 *
 * The level combines two signals and keeps the stronger one:
 * - postponements: `postponedCount / (decayThreshold + 1)`, so with the default threshold of
 *   3 the task is stale once postponed more than 3 times;
 * - age: none during a grace period, then rising linearly until `ageStaleDays`. Age is ignored
 *   while the task is deliberately planned ahead (future deadline, slot or floating day).
 */
import type { Task, Timestamp, UserPrefs } from '../model.ts';
import { DAY } from '../time.ts';
import { clamp, isOpen } from './common.ts';
import type { TaskPatch } from './common.ts';

export type DecayState = 'fresh' | 'aging' | 'stale';

export interface Decay {
  /** 0 = fresh, 1 = fully decayed; meant to drive a colour interpolation. */
  level: number;
  state: DecayState;
}

export interface DecayOptions {
  /** Days a task may wait before age starts to count. Default 14. */
  ageGraceDays?: number;
  /** Age (days) at which age alone makes a task stale. Default 60. */
  ageStaleDays?: number;
}

/** Level from which a task is shown as aging. */
export const AGING_LEVEL = 0.5;

export function decay(
  task: Task,
  prefs: Pick<UserPrefs, 'decayThreshold'>,
  now: Timestamp,
  opts: DecayOptions = {},
): Decay {
  if (!isOpen(task)) return { level: 0, state: 'fresh' };
  const level = Math.max(postponeLevel(task, prefs.decayThreshold), ageLevel(task, now, opts));
  return { level, state: stateOf(level) };
}

function postponeLevel(task: Task, threshold: number): number {
  const t = Number.isFinite(threshold) ? Math.max(0, threshold) : 0;
  return clamp(Math.max(0, task.postponedCount) / (t + 1), 0, 1);
}

function ageLevel(task: Task, now: Timestamp, opts: DecayOptions): number {
  if (isPlannedAhead(task, now)) return 0;
  const grace = opts.ageGraceDays ?? 14;
  const stale = opts.ageStaleDays ?? 60;
  const ageDays = (now - task.createdAt) / DAY;
  if (stale <= grace) return ageDays >= stale ? 1 : 0;
  return clamp((ageDays - grace) / (stale - grace), 0, 1);
}

/**
 * A future deadline, slot or floating day means the wait is intentional. `floatingDay` is
 * a local midnight: counting it as current for 24 h is off by at most the 1 h of a DST
 * change, which is irrelevant for an aging heuristic.
 */
function isPlannedAhead(task: Task, now: Timestamp): boolean {
  return (
    (task.deadline !== undefined && task.deadline > now) ||
    (task.scheduled !== undefined && task.scheduled.end > now) ||
    (task.floatingDay !== undefined && task.floatingDay + DAY > now)
  );
}

function stateOf(level: number): DecayState {
  if (level >= 1) return 'stale';
  return level >= AGING_LEVEL ? 'aging' : 'fresh';
}

/**
 * Moves a task to the day starting at `toDay` (local midnight in the user's zone) as a
 * floating task. The previous slot is cleared so the router can place it again. Only a move
 * to a later day than the one planned counts as a postponement; planning an unplanned task
 * or pulling one forward does not feed decay.
 */
export function postponePatch(task: Task, toDay: Timestamp): TaskPatch {
  const patch: TaskPatch = { floatingDay: toDay };
  if (task.scheduled !== undefined) patch.scheduled = undefined;
  if (task.pinned !== undefined) patch.pinned = undefined;
  const plannedFor = task.floatingDay ?? task.scheduled?.start;
  if (plannedFor !== undefined && toDay > plannedFor) {
    patch.postponedCount = task.postponedCount + 1;
  }
  return patch;
}
