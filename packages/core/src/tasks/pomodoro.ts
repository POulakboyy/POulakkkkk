/**
 * Per-task Pomodoro (2.6): plan focus sessions from an estimate, record each session in the
 * task's `timeLogs`, and compare logged focus time with estimates afterwards.
 */
import type { Interval, Minutes, Task, TimeLog } from '../model.ts';
import { MINUTE } from '../time.ts';
import { isCompleted } from './common.ts';
import type { TaskPatch } from './common.ts';

export interface PomodoroOptions {
  focus: Minutes;
  shortBreak: Minutes;
  longBreak: Minutes;
  /** A long break replaces the short one after every `longEvery` focus sessions. */
  longEvery: number;
}

export const DEFAULT_POMODORO: Readonly<PomodoroOptions> = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longEvery: 4,
};

export interface PomodoroBlock {
  kind: 'focus' | 'shortBreak' | 'longBreak';
  minutes: Minutes;
}

export interface PomodoroPlan {
  /** Alternating focus sessions and breaks; no break after the last session. */
  blocks: PomodoroBlock[];
  /** Number of focus sessions. */
  sessions: number;
  focusMin: Minutes;
  breakMin: Minutes;
  totalMin: Minutes;
}

/**
 * Splits an estimate (rounded up to whole minutes) into focus sessions; the last session
 * holds the remainder, so 60 min gives 25 + 25 + 10 with breaks in between.
 * @throws RangeError when an option is not a valid duration.
 */
export function pomodoroPlan(
  estimateMin: Minutes,
  options: Partial<PomodoroOptions> = {},
): PomodoroPlan {
  const opts = { ...DEFAULT_POMODORO, ...options };
  validateOptions(opts);
  const total = Number.isFinite(estimateMin) ? Math.max(0, Math.ceil(estimateMin)) : 0;
  const blocks: PomodoroBlock[] = [];
  let remaining = total;
  let session = 0;
  while (remaining > 0) {
    const minutes = Math.min(opts.focus, remaining);
    blocks.push({ kind: 'focus', minutes });
    remaining -= minutes;
    session++;
    if (remaining > 0) blocks.push(breakAfter(session, opts));
  }
  const breakMin = blocks.reduce((sum, b) => (b.kind === 'focus' ? sum : sum + b.minutes), 0);
  return { blocks, sessions: session, focusMin: total, breakMin, totalMin: total + breakMin };
}

function breakAfter(session: number, opts: PomodoroOptions): PomodoroBlock {
  return session % opts.longEvery === 0
    ? { kind: 'longBreak', minutes: opts.longBreak }
    : { kind: 'shortBreak', minutes: opts.shortBreak };
}

function validateOptions(opts: PomodoroOptions): void {
  if (!(Number.isFinite(opts.focus) && opts.focus > 0)) {
    throw new RangeError('pomodoro: focus must be a positive number of minutes');
  }
  for (const key of ['shortBreak', 'longBreak'] as const) {
    if (!(Number.isFinite(opts[key]) && opts[key] >= 0)) {
      throw new RangeError(`pomodoro: ${key} must be a non-negative number of minutes`);
    }
  }
  if (!(Number.isInteger(opts.longEvery) && opts.longEvery >= 1)) {
    throw new RangeError('pomodoro: longEvery must be a positive integer');
  }
}

/**
 * Appends a time log, keeping logs sorted by start. Logging the exact same entry twice is a
 * no-op, so a retried save does not double-count time.
 * @throws RangeError when the log does not cover a positive, finite span.
 */
export function logTimePatch(task: Task, log: TimeLog): TaskPatch {
  if (!(Number.isFinite(log.start) && Number.isFinite(log.end) && log.end > log.start)) {
    throw new RangeError('logTimePatch: a time log must end after it starts');
  }
  const duplicate = task.timeLogs.some(
    (l) => l.start === log.start && l.end === log.end && l.kind === log.kind,
  );
  if (duplicate) return { timeLogs: [...task.timeLogs] };
  const timeLogs = [...task.timeLogs, { start: log.start, end: log.end, kind: log.kind }];
  timeLogs.sort((a, b) => a.start - b.start);
  return { timeLogs };
}

/** Minutes of focus logged on the task, optionally clipped to `range`. */
export function focusMinutes(task: Task, range?: Interval): Minutes {
  let total = 0;
  for (const log of task.timeLogs) {
    if (log.kind !== 'focus') continue;
    const start = range ? Math.max(log.start, range.start) : log.start;
    const end = range ? Math.min(log.end, range.end) : log.end;
    if (end > start) total += end - start;
  }
  return total / MINUTE;
}

export interface EstimateAccuracy {
  /** Completed tasks having both an estimate and logged focus time. */
  samples: number;
  totalEstimateMin: Minutes;
  totalActualMin: Minutes;
  /** Median of actual / estimate; above 1 means tasks usually take longer than planned. */
  medianRatio: number | null;
  /** Share (0–1) of samples whose actual time is within the tolerance of the estimate. */
  withinTolerance: number | null;
  tendency: 'underestimates' | 'overestimates' | 'accurate' | null;
}

/**
 * Post-mortem of estimates against logged focus time on completed tasks.
 * `tolerance` is the relative gap still considered accurate (default 0.2 = ±20 %).
 */
export function estimateAccuracy(tasks: readonly Task[], tolerance = 0.2): EstimateAccuracy {
  let totalEstimateMin = 0;
  let totalActualMin = 0;
  const ratios: number[] = [];
  for (const task of tasks) {
    const estimate = task.estimateMin;
    if (!isCompleted(task) || estimate === undefined || !(estimate > 0)) continue;
    const actual = focusMinutes(task);
    if (actual <= 0) continue;
    totalEstimateMin += estimate;
    totalActualMin += actual;
    ratios.push(actual / estimate);
  }
  if (ratios.length === 0) {
    return {
      samples: 0,
      totalEstimateMin,
      totalActualMin,
      medianRatio: null,
      withinTolerance: null,
      tendency: null,
    };
  }
  const medianRatio = median(ratios);
  const within = ratios.filter((r) => Math.abs(r - 1) <= tolerance).length / ratios.length;
  return {
    samples: ratios.length,
    totalEstimateMin,
    totalActualMin,
    medianRatio,
    withinTolerance: within,
    tendency: tendencyOf(medianRatio, tolerance),
  };
}

function tendencyOf(ratio: number, tolerance: number): EstimateAccuracy['tendency'] {
  if (ratio > 1 + tolerance) return 'underestimates';
  if (ratio < 1 - tolerance) return 'overestimates';
  return 'accurate';
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? 0;
  return sorted.length % 2 === 1 ? upper : ((sorted[mid - 1] ?? upper) + upper) / 2;
}
