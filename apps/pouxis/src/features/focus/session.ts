/**
 * Pomodoro session state machine (2.6), pure: every transition takes `now` and returns the
 * focus stretches to record in the task's `timeLogs`. Breaks start on their own after a focus
 * block; the next focus block waits for the user, so a session never runs away unattended.
 */
import { MINUTE, tasks as taskEngine } from '@pouxis/core';
import type { Id, Minutes, Task, TimeLog, Timestamp } from '@pouxis/core';
import type { PomodoroBlock, PomodoroOptions } from '@pouxis/core/tasks';

export interface FocusSession {
  taskId: Id;
  blocks: readonly PomodoroBlock[];
  /** Index of the current block. */
  index: number;
  /** Time spent in the current block before the running stretch. */
  elapsedMs: number;
  /** Start of the running stretch; absent while paused. */
  runningSince?: Timestamp;
}

export type FocusSignal = 'focus-done' | 'break-done' | 'session-done';

export interface Step {
  /** `null` once the session is over. */
  session: FocusSession | null;
  /** Focus stretches to append to the task (`tasks.logTimePatch`). */
  logs: TimeLog[];
  signals: FocusSignal[];
}

/** Stretches shorter than this are not worth a time log (an accidental start). */
export const MIN_LOG_MS = 30_000;

/**
 * Starts a running session on `task`: the plan covers what is left of its estimate, or one
 * standard focus block when there is no estimate (or it is already used up).
 */
export function startSession(
  task: Task,
  now: Timestamp,
  options: Partial<PomodoroOptions> = {},
): FocusSession {
  const focus = options.focus ?? taskEngine.DEFAULT_POMODORO.focus;
  const left = (task.estimateMin ?? 0) - taskEngine.focusMinutes(task);
  const plan = taskEngine.pomodoroPlan(left >= 1 ? left : focus, options);
  return { taskId: task.id, blocks: plan.blocks, index: 0, elapsedMs: 0, runningSince: now };
}

export function currentBlock(s: FocusSession): PomodoroBlock {
  return s.blocks[s.index] ?? { kind: 'focus', minutes: 0 };
}

export const isRunning = (s: FocusSession): boolean => s.runningSince !== undefined;
export const isBreak = (s: FocusSession): boolean => currentBlock(s).kind !== 'focus';

export function blockMs(s: FocusSession): number {
  return currentBlock(s).minutes * MINUTE;
}

export function elapsedMs(s: FocusSession, now: Timestamp): number {
  const running = s.runningSince === undefined ? 0 : Math.max(0, now - s.runningSince);
  return Math.min(blockMs(s), s.elapsedMs + running);
}

export function remainingMs(s: FocusSession, now: Timestamp): number {
  return Math.max(0, blockMs(s) - elapsedMs(s, now));
}

/** Share of the current block elapsed, 0..1. */
export function blockProgress(s: FocusSession, now: Timestamp): number {
  const total = blockMs(s);
  return total > 0 ? elapsedMs(s, now) / total : 1;
}

/** 1-based number of the current (or last) focus block, and how many there are. */
export function focusCount(s: FocusSession): { current: number; total: number } {
  let current = 0;
  let total = 0;
  s.blocks.forEach((b, i) => {
    if (b.kind !== 'focus') return;
    total++;
    if (i <= s.index) current++;
  });
  return { current: Math.max(1, current), total: Math.max(1, total) };
}

/** The block after the current one, if any. */
export function nextBlock(s: FocusSession): PomodoroBlock | undefined {
  return s.blocks[s.index + 1];
}

function focusLog(s: FocusSession, end: Timestamp): TimeLog[] {
  if (isBreak(s) || s.runningSince === undefined) return [];
  return end - s.runningSince >= MIN_LOG_MS ? [{ start: s.runningSince, end, kind: 'focus' }] : [];
}

export function pause(s: FocusSession, now: Timestamp): Step {
  if (!isRunning(s)) return { session: s, logs: [], signals: [] };
  const { runningSince: _, ...rest } = s;
  return {
    session: { ...rest, elapsedMs: elapsedMs(s, now) },
    logs: focusLog(s, now),
    signals: [],
  };
}

export function resume(s: FocusSession, now: Timestamp): FocusSession {
  return isRunning(s) ? s : { ...s, runningSince: now };
}

/** Ends the session now, recording the running focus stretch. */
export function stop(s: FocusSession, now: Timestamp): Step {
  return { session: null, logs: focusLog(s, now), signals: [] };
}

/**
 * Moves through every block that has ended by `now` (the app may have slept through
 * several). Each finished focus block is logged up to its exact end.
 */
export function advance(s: FocusSession, now: Timestamp): Step {
  const logs: TimeLog[] = [];
  const signals: FocusSignal[] = [];
  let cur: FocusSession = s;
  while (cur.runningSince !== undefined && elapsedMs(cur, now) >= blockMs(cur)) {
    const end = cur.runningSince + (blockMs(cur) - cur.elapsedMs);
    logs.push(...focusLog(cur, end));
    const wasBreak = isBreak(cur);
    signals.push(wasBreak ? 'break-done' : 'focus-done');
    const index = cur.index + 1;
    if (index >= cur.blocks.length) {
      signals.push('session-done');
      return { session: null, logs, signals };
    }
    const next: FocusSession = { taskId: cur.taskId, blocks: cur.blocks, index, elapsedMs: 0 };
    // Breaks follow focus at once; the next focus block waits for the user.
    cur = wasBreak ? next : { ...next, runningSince: end };
  }
  return { session: cur, logs, signals };
}

/** Skips the current break and starts the next focus block now. */
export function skipBreak(s: FocusSession, now: Timestamp): FocusSession {
  if (!isBreak(s) || s.index + 1 >= s.blocks.length) return s;
  return { taskId: s.taskId, blocks: s.blocks, index: s.index + 1, elapsedMs: 0, runningSince: now };
}

/** Adds `minutes` to the current focus block ("Encore 5 min"). */
export function extend(s: FocusSession, minutes: Minutes): FocusSession {
  if (isBreak(s) || !(minutes > 0)) return s;
  const blocks = s.blocks.map((b, i) => (i === s.index ? { ...b, minutes: b.minutes + minutes } : b));
  return { ...s, blocks };
}
