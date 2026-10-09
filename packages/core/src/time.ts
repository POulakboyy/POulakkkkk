/**
 * Time-zone aware date maths on top of `Intl`, with no dependency.
 *
 * Everything takes an explicit IANA zone: the engine never reads the host's local zone,
 * so a task planned in Paris lands at the same wall-clock time on every device.
 */
import type { Interval, Minutes, TimeZone, Timestamp } from './model.ts';

export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export interface ZonedParts {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
  /** 0–23 */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

export type ZonedInput = Pick<ZonedParts, 'year' | 'month' | 'day'> &
  Partial<Pick<ZonedParts, 'hour' | 'minute' | 'second'>>;

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<TimeZone, Intl.DateTimeFormat>();

function formatter(timeZone: TimeZone): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock components of `ts` as seen in `timeZone`. */
export function zonedParts(ts: Timestamp, timeZone: TimeZone): ZonedParts {
  const out: ZonedParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0, weekday: 0 };
  for (const part of formatter(timeZone).formatToParts(ts)) {
    switch (part.type) {
      case 'year':
        out.year = Number(part.value);
        break;
      case 'month':
        out.month = Number(part.value);
        break;
      case 'day':
        out.day = Number(part.value);
        break;
      case 'hour':
        out.hour = Number(part.value);
        break;
      case 'minute':
        out.minute = Number(part.value);
        break;
      case 'second':
        out.second = Number(part.value);
        break;
      case 'weekday':
        out.weekday = WEEKDAYS[part.value] ?? 0;
        break;
    }
  }
  return out;
}

/** Offset of `timeZone` from UTC at instant `ts`, in milliseconds (Paris in winter: +3 600 000). */
export function tzOffset(ts: Timestamp, timeZone: TimeZone): number {
  const p = zonedParts(ts, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ts / SECOND) * SECOND;
}

/**
 * Instant of a wall-clock time in `timeZone`. Out-of-range components roll over
 * (`day: 32` is the 1st of next month). A time skipped by a DST jump resolves forward.
 */
export function fromZoned(input: ZonedInput, timeZone: TimeZone): Timestamp {
  const guess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour ?? 0,
    input.minute ?? 0,
    input.second ?? 0,
  );
  const first = guess - tzOffset(guess, timeZone);
  const second = guess - tzOffset(first, timeZone);
  return first === second ? first : Math.max(first, second);
}

export function startOfDay(ts: Timestamp, timeZone: TimeZone): Timestamp {
  const p = zonedParts(ts, timeZone);
  return fromZoned({ year: p.year, month: p.month, day: p.day }, timeZone);
}

export function endOfDay(ts: Timestamp, timeZone: TimeZone): Timestamp {
  return addDays(startOfDay(ts, timeZone), 1, timeZone);
}

/** Adds calendar days while keeping the wall-clock time (DST-safe). */
export function addDays(ts: Timestamp, days: number, timeZone: TimeZone): Timestamp {
  const p = zonedParts(ts, timeZone);
  return fromZoned(
    {
      year: p.year,
      month: p.month,
      day: p.day + days,
      hour: p.hour,
      minute: p.minute,
      second: p.second,
    },
    timeZone,
  );
}

/** Start of the week containing `ts`; `weekStartsOn` 1 = Monday (ISO, default). */
export function startOfWeek(ts: Timestamp, timeZone: TimeZone, weekStartsOn = 1): Timestamp {
  const p = zonedParts(ts, timeZone);
  const delta = (p.weekday - weekStartsOn + 7) % 7;
  return fromZoned({ year: p.year, month: p.month, day: p.day - delta }, timeZone);
}

/** `YYYY-MM-DD` of `ts` in `timeZone` — a stable key for grouping by day. */
export function dayKey(ts: Timestamp, timeZone: TimeZone): string {
  const p = zonedParts(ts, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes elapsed since local midnight. */
export function minutesOfDay(ts: Timestamp, timeZone: TimeZone): Minutes {
  const p = zonedParts(ts, timeZone);
  return p.hour * 60 + p.minute;
}

/** Instant at `minutes` after local midnight of the day containing `dayTs`. */
export function atMinutes(dayTs: Timestamp, minutes: Minutes, timeZone: TimeZone): Timestamp {
  const p = zonedParts(dayTs, timeZone);
  return fromZoned(
    { year: p.year, month: p.month, day: p.day, hour: 0, minute: minutes },
    timeZone,
  );
}

export function weekday(ts: Timestamp, timeZone: TimeZone): number {
  return zonedParts(ts, timeZone).weekday;
}

export function isSameDay(a: Timestamp, b: Timestamp, timeZone: TimeZone): boolean {
  return dayKey(a, timeZone) === dayKey(b, timeZone);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/* ------------------------------------------------------------------------------------------ */
/* Intervals                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export function duration(i: Interval): number {
  return i.end - i.start;
}

/** Half-open overlap: `[a.start, a.end)` and `[b.start, b.end)` share at least one instant. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function contains(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

/** Sorts and merges overlapping or touching intervals. */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ start: i.start, end: i.end });
  }
  return out;
}

/** Free gaps of `range` once `busy` intervals are removed. */
export function freeSlots(range: Interval, busy: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  let cursor = range.start;
  for (const b of mergeIntervals(busy)) {
    if (b.end <= range.start || b.start >= range.end) continue;
    if (b.start > cursor) out.push({ start: cursor, end: Math.min(b.start, range.end) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= range.end) break;
  }
  if (cursor < range.end) out.push({ start: cursor, end: range.end });
  return out;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
