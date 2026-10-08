/**
 * Small helpers shared by the insights sub-modules. Not part of the public API.
 */
import type { Interval, Task, Timestamp } from '../model.ts';
import { DAY, MINUTE } from '../time.ts';

export const WEEK = 7 * DAY;

/** `[i.start, i.end)` clipped to `range`, or `null` when nothing is left. */
export function clip(i: Interval, range: Interval): Interval | null {
  const start = Math.max(i.start, range.start);
  const end = Math.min(i.end, range.end);
  return end > start ? { start, end } : null;
}

/** Valid focus logs of a task (breaks and zero/negative-length logs are dropped). */
export function focusLogs(task: Task): Interval[] {
  const out: Interval[] = [];
  for (const log of task.timeLogs) {
    if (log.kind !== 'focus') continue;
    if (!Number.isFinite(log.start) || !Number.isFinite(log.end) || log.end <= log.start) continue;
    out.push({ start: log.start, end: log.end });
  }
  return out;
}

/** Total focus minutes logged on a task, optionally restricted to `range`. */
export function focusMinutes(task: Task, range?: Interval): number {
  let ms = 0;
  for (const log of focusLogs(task)) {
    const part = range ? clip(log, range) : log;
    if (part) ms += part.end - part.start;
  }
  return ms / MINUTE;
}

/**
 * A task counts as completed when it is `done`, or `archived` with a completion time
 * (an archived task without `completedAt` was dropped, not finished).
 */
export function isCompleted(task: Task): boolean {
  return task.status === 'done' || (task.status === 'archived' && task.completedAt !== undefined);
}

/** Completion instant of a completed task, when known. */
export function completedAt(task: Task): Timestamp | undefined {
  return isCompleted(task) ? task.completedAt : undefined;
}

/** A task archived without ever being completed: deliberately dropped. */
export function isDropped(task: Task): boolean {
  return task.status === 'archived' && task.completedAt === undefined;
}

export function sum(values: readonly number[]): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

/** Median of a non-empty list (mean of the two middle values for even lengths). */
export function median(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('median() of an empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const hi = sorted[mid] as number;
  return sorted.length % 2 === 1 ? hi : ((sorted[mid - 1] as number) + hi) / 2;
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function assertFiniteTimestamp(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be a finite timestamp`);
}

/* ------------------------------------------------------------------------------------------ */
/* Calendar day keys (`YYYY-MM-DD`) as integer day numbers — pure calendar maths, no zone.    */
/* ------------------------------------------------------------------------------------------ */

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a valid `YYYY-MM-DD` key, `null` otherwise. */
export function dayNumber(key: string): number | null {
  const m = DAY_KEY.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return Math.round(ms / DAY);
}

/** Inverse of {@link dayNumber}. */
export function dayKeyOf(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10);
}

/** Weekday (0 = Sunday … 6 = Saturday) of a day number. 1970-01-01 was a Thursday. */
export function weekdayOf(n: number): number {
  return (((n + 4) % 7) + 7) % 7;
}
