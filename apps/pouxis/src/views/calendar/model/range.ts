/** Visible ranges of the calendar: which local days a mode shows and how navigation steps. */
import {
  addDays,
  fromZoned,
  startOfDay,
  startOfWeek,
  zonedParts,
  type Interval,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';

export type CalendarMode = 'day' | 'week' | 'month' | 'spiral';

export const CALENDAR_MODES: readonly CalendarMode[] = ['day', 'week', 'month', 'spiral'];

/** Start instants of the local days shown by `mode` around `anchor`. */
export function visibleDays(
  anchor: Timestamp,
  mode: CalendarMode,
  timeZone: TimeZone,
): Timestamp[] {
  switch (mode) {
    case 'day':
      return [startOfDay(anchor, timeZone)];
    case 'week':
    case 'spiral':
      return daysFrom(startOfWeek(anchor, timeZone), 7, timeZone);
    case 'month': {
      const p = zonedParts(anchor, timeZone);
      const first = fromZoned({ year: p.year, month: p.month, day: 1 }, timeZone);
      return daysFrom(startOfWeek(first, timeZone), 42, timeZone);
    }
  }
}

export function daysFrom(start: Timestamp, count: number, timeZone: TimeZone): Timestamp[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i, timeZone));
}

/** Half-open interval covering `days` (local midnight of the first to the day after the last). */
export function spanOf(days: readonly Timestamp[], timeZone: TimeZone): Interval {
  const first = days[0] ?? 0;
  const last = days[days.length - 1] ?? first;
  return { start: first, end: addDays(last, 1, timeZone) };
}

/** Moves the anchor one page forward (`dir = 1`) or back (`-1`), keeping the local day. */
export function stepAnchor(
  anchor: Timestamp,
  mode: CalendarMode,
  dir: 1 | -1,
  timeZone: TimeZone,
): Timestamp {
  if (mode === 'day') return addDays(anchor, dir, timeZone);
  if (mode === 'week' || mode === 'spiral') return addDays(anchor, 7 * dir, timeZone);
  const p = zonedParts(anchor, timeZone);
  const target = { year: p.year, month: p.month + dir, day: 1 };
  const firstOfTarget = fromZoned(target, timeZone);
  const t = zonedParts(firstOfTarget, timeZone);
  const lastDay = new Date(Date.UTC(t.year, t.month, 0)).getUTCDate();
  return fromZoned({ year: t.year, month: t.month, day: Math.min(p.day, lastDay) }, timeZone);
}

/** ISO 8601 week number of the local day containing `ts`. */
export function isoWeek(ts: Timestamp, timeZone: TimeZone): number {
  const p = zonedParts(ts, timeZone);
  const date = Date.UTC(p.year, p.month - 1, p.day);
  const isoDay = p.weekday === 0 ? 7 : p.weekday;
  const thursday = date + (4 - isoDay) * 86_400_000;
  const yearStart = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
  return Math.floor((thursday - yearStart) / 86_400_000 / 7) + 1;
}

/** Same calendar month as `anchor` (to dim the leading/trailing days of the month grid). */
export function inMonth(day: Timestamp, anchor: Timestamp, timeZone: TimeZone): boolean {
  const a = zonedParts(anchor, timeZone);
  const d = zonedParts(day, timeZone);
  return a.year === d.year && a.month === d.month;
}
