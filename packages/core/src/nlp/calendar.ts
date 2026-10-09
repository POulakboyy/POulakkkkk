/**
 * Pure wall-calendar arithmetic (no time zone involved) plus the conversion to instants.
 *
 * Dates are resolved as calendar days first and only turned into a `Timestamp` at the very
 * end through `fromZoned`, which keeps every relative expression DST-safe.
 */
import type { Minutes, TimeZone, Timestamp } from '../model.ts';
import { daysInMonth, fromZoned, zonedParts } from '../time.ts';

/** A calendar date with no time zone attached. `m` is 1–12. */
export interface CalDate {
  y: number;
  m: number;
  d: number;
}

export function calOf(ts: Timestamp, timeZone: TimeZone): CalDate {
  const p = zonedParts(ts, timeZone);
  return { y: p.year, m: p.month, d: p.day };
}

function fromUtcMillis(t: number): CalDate {
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function addDaysCal(c: CalDate, days: number): CalDate {
  return fromUtcMillis(Date.UTC(c.y, c.m - 1, c.d + days));
}

/** Adds months, clamping the day to the target month's length (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsCal(c: CalDate, months: number): CalDate {
  const index = c.y * 12 + (c.m - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return { y, m, d: Math.min(c.d, daysInMonth(y, m)) };
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayCal(c: CalDate): number {
  return new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();
}

export function compareCal(a: CalDate, b: CalDate): number {
  return a.y - b.y || a.m - b.m || a.d - b.d;
}

export function isValidCal(y: number, m: number, d: number): boolean {
  return Number.isInteger(d) && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Monday of the ISO week containing `c`. */
export function mondayOf(c: CalDate): CalDate {
  return addDaysCal(c, -((weekdayCal(c) + 6) % 7));
}

/** First date on or after `from` (or strictly after when `strict`) falling on `weekday`. */
export function nextWeekday(from: CalDate, weekday: number, strict = false): CalDate {
  let delta = (weekday - weekdayCal(from) + 7) % 7;
  if (strict && delta === 0) delta = 7;
  return addDaysCal(from, delta);
}

export function lastDayOfMonth(c: CalDate): CalDate {
  return { y: c.y, m: c.m, d: daysInMonth(c.y, c.m) };
}

/** Next date (today included) whose day of month is `day`; skips months that are too short. */
export function nextDayOfMonth(today: CalDate, day: number): CalDate | null {
  if (day < 1 || day > 31) return null;
  for (let i = 0; i < 13; i++) {
    const first = addMonthsCal({ y: today.y, m: today.m, d: 1 }, i);
    if (i === 0 && day < today.d) continue;
    if (isValidCal(first.y, first.m, day)) return { y: first.y, m: first.m, d: day };
  }
  return null;
}

/** Next occurrence (today included) of a month/day without year; 29 Feb waits for a leap year. */
export function nextMonthDay(today: CalDate, month: number, day: number): CalDate | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const startYear = compareCal({ y: today.y, m: month, d: day }, today) < 0 ? today.y + 1 : today.y;
  for (let y = startYear; y < startYear + 8; y++) {
    if (isValidCal(y, month, day)) return { y, m: month, d: day };
  }
  return null;
}

/** Instant of `minutes` after local midnight of `c` (1440 = the following midnight). */
export function atTime(c: CalDate, minutes: Minutes, timeZone: TimeZone): Timestamp {
  return fromZoned({ year: c.y, month: c.m, day: c.d, hour: 0, minute: minutes }, timeZone);
}
