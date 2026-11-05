/** Time progress bars (1.14): how much of the day, week, month… has elapsed. */
import type { Interval, Timestamp, TimeZone } from '../model.ts';
import { addDays, fromZoned, startOfDay, startOfWeek, zonedParts } from '../time.ts';
import type { Period, ProgressOptions } from './types.ts';

/** Share of `period` elapsed at `now`, in 0..1 (0 for an empty or invalid period). */
export function progress(
  now: Timestamp,
  period: Period,
  timeZone: TimeZone,
  options: ProgressOptions = {},
): number {
  const { start, end } = periodBounds(now, period, timeZone, options);
  if (!(end > start) || !Number.isFinite(now)) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** Local bounds of the period containing `now` (an explicit interval is returned as is). */
export function periodBounds(
  now: Timestamp,
  period: Period,
  timeZone: TimeZone,
  options: ProgressOptions = {},
): Interval {
  if (typeof period === 'object') return { start: period.start, end: period.end };
  const p = zonedParts(now, timeZone);
  switch (period) {
    case 'day': {
      const start = startOfDay(now, timeZone);
      return { start, end: addDays(start, 1, timeZone) };
    }
    case 'week': {
      const weekStartsOn = normalizeWeekday(options.weekStartsOn ?? 1);
      const start = startOfWeek(now, timeZone, weekStartsOn);
      return { start, end: addDays(start, 7, timeZone) };
    }
    case 'month':
      return monthSpan(p.year, p.month, 1, timeZone);
    case 'quarter':
      return monthSpan(p.year, p.month - ((p.month - 1) % 3), 3, timeZone);
    case 'year':
      return monthSpan(p.year, 1, 12, timeZone);
  }
}

function monthSpan(year: number, month: number, months: number, timeZone: TimeZone): Interval {
  return {
    start: fromZoned({ year, month, day: 1 }, timeZone),
    end: fromZoned({ year, month: month + months, day: 1 }, timeZone),
  };
}

function normalizeWeekday(d: number): number {
  return Number.isInteger(d) ? ((d % 7) + 7) % 7 : 1;
}
