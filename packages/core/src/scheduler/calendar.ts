/**
 * Internal calendar helpers of the scheduler: local days, working-hour windows, interval
 * arithmetic. Everything is resolved in an explicit IANA zone.
 */
import type { Interval, Minutes, TimeZone, Timestamp, WorkingHours } from '../model.ts';
import { DAY, HOUR, MINUTE, tzOffset, zonedParts } from '../time.ts';

const MINUTES_PER_DAY = 24 * 60;

export interface LocalDate {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31, may overflow (rolled over by `Date.UTC`). */
  day: number;
}

/** A local calendar day and its working-hour window. */
export interface LocalDay {
  /** `YYYY-MM-DD`. */
  key: string;
  date: LocalDate;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** Local midnight. */
  start: Timestamp;
  /** Next local midnight. */
  end: Timestamp;
}

/**
 * Instant of a wall-clock time (`minutes` after local midnight of `date`) in `timeZone`.
 *
 * Follows the "compatible" disambiguation: a time repeated by a fall-back transition resolves
 * to its first occurrence, a time skipped by a spring-forward jump resolves forward by the
 * length of the gap. Works for any zone with at most one transition within ±1 day.
 */
export function wallClock(date: LocalDate, minutes: Minutes, timeZone: TimeZone): Timestamp {
  const guess = Date.UTC(date.year, date.month - 1, date.day, 0, minutes);
  const before = tzOffset(guess - DAY, timeZone);
  const after = tzOffset(guess + DAY, timeZone);
  const early = guess - before;
  const late = guess - after;
  const earlyValid = tzOffset(early, timeZone) === before;
  const lateValid = tzOffset(late, timeZone) === after;
  if (earlyValid && lateValid) return Math.min(early, late);
  if (lateValid) return late;
  // Valid with the pre-transition offset, or skipped: the pre-transition offset moves forward.
  return early;
}

export function localDate(ts: Timestamp, timeZone: TimeZone): LocalDate {
  const p = zonedParts(ts, timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

/** The local day `offset` days after `date` (calendar arithmetic, zone independent). */
export function shiftDate(date: LocalDate, offset: number): LocalDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + offset));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function localDay(date: LocalDate, timeZone: TimeZone): LocalDay {
  const norm = shiftDate(date, 0);
  const utc = new Date(Date.UTC(norm.year, norm.month - 1, norm.day));
  return {
    key: utc.toISOString().slice(0, 10),
    date: norm,
    weekday: utc.getUTCDay(),
    start: wallClock(norm, 0, timeZone),
    end: wallClock(shiftDate(norm, 1), 0, timeZone),
  };
}

/** Every local day that overlaps `range`, in chronological order. */
export function localDays(range: Interval, timeZone: TimeZone): LocalDay[] {
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) return [];
  const out: LocalDay[] = [];
  const first = localDate(range.start, timeZone);
  for (let i = 0; ; i++) {
    const day = localDay(shiftDate(first, i), timeZone);
    if (day.start >= range.end && i > 0) break;
    if (day.end > range.start) out.push(day);
  }
  return out;
}

/** True when the working hours describe at least one working minute per working day. */
export function hasWorkingHours(hours: WorkingHours): boolean {
  return hours.days.length > 0 && clampMinutes(hours.start) !== clampMinutes(hours.end);
}

/**
 * Working-hour window of a local day. `end <= start` describes an overnight shift that ends
 * on the next day. Returns `undefined` on days off unless `anyWeekday` is set.
 */
export function workingWindow(
  day: LocalDay,
  hours: WorkingHours,
  timeZone: TimeZone,
  anyWeekday = false,
): Interval | undefined {
  if (!anyWeekday && !hours.days.includes(day.weekday)) return undefined;
  const startMin = clampMinutes(hours.start);
  const endMin = clampMinutes(hours.end);
  if (startMin === endMin) return undefined;
  const endDate = endMin > startMin ? day.date : shiftDate(day.date, 1);
  return {
    start: wallClock(day.date, startMin, timeZone),
    end: wallClock(endDate, endMin, timeZone),
  };
}

function clampMinutes(m: Minutes): Minutes {
  return Number.isFinite(m) ? Math.min(MINUTES_PER_DAY, Math.max(0, m)) : 0;
}

/**
 * Local hour (0–23) lookup tuned for one interval: when the zone offset is constant over it
 * (every day but DST days) the hour is computed arithmetically instead of through `Intl`.
 */
export function hourLookup(span: Interval, timeZone: TimeZone): (ts: Timestamp) => number {
  const offset = tzOffset(span.start, timeZone);
  if (offset !== tzOffset(Math.max(span.start, span.end - 1), timeZone)) {
    return (ts) => zonedParts(ts, timeZone).hour;
  }
  return (ts) => Math.floor(mod(ts + offset, DAY) / HOUR);
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/* ------------------------------------------------------------------------------------------ */
/* Intervals                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export function alignUp(ts: Timestamp, stepMs: number): Timestamp {
  return Math.ceil(ts / stepMs) * stepMs;
}

export function floorToMinute(ms: number): number {
  return Math.floor(ms / MINUTE) * MINUTE;
}

export function toMinutes(ms: number): Minutes {
  return ms / MINUTE;
}

export function intersect(a: Interval, b: Interval): Interval | undefined {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return start < end ? { start, end } : undefined;
}

/** Removes `cut` from a sorted list of disjoint intervals. */
export function subtract(slots: readonly Interval[], cut: Interval): Interval[] {
  const out: Interval[] = [];
  for (const s of slots) {
    if (cut.end <= s.start || cut.start >= s.end) {
      out.push(s);
      continue;
    }
    if (cut.start > s.start) out.push({ start: s.start, end: cut.start });
    if (cut.end < s.end) out.push({ start: cut.end, end: s.end });
  }
  return out;
}

/** Total length of the overlap between `span` and a list of disjoint intervals. */
export function overlapMs(span: Interval, disjoint: readonly Interval[]): number {
  let total = 0;
  for (const i of disjoint) {
    const o = intersect(span, i);
    if (o) total += o.end - o.start;
  }
  return total;
}

export function isValidInterval(i: Interval): boolean {
  return Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start;
}

export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
