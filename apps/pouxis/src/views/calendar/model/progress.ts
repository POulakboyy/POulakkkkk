/**
 * Time progress bars (1.14): how far `now` is through the current year, quarter and week,
 * measured in real elapsed time between local boundaries (DST-safe).
 */
import {
  fromZoned,
  startOfWeek,
  addDays,
  zonedParts,
  type TimeZone,
  type Timestamp,
} from '@pouxis/core';

export type ProgressPeriod = 'year' | 'quarter' | 'week';

export const PROGRESS_PERIODS: readonly ProgressPeriod[] = ['year', 'quarter', 'week'];

export interface PeriodProgress {
  period: ProgressPeriod;
  start: Timestamp;
  end: Timestamp;
  /** 0..1 */
  ratio: number;
}

/** Local boundaries of the period containing `now`. */
export function periodBounds(
  period: ProgressPeriod,
  now: Timestamp,
  timeZone: TimeZone,
): { start: Timestamp; end: Timestamp } {
  if (period === 'week') {
    const start = startOfWeek(now, timeZone);
    return { start, end: addDays(start, 7, timeZone) };
  }
  const { year, month } = zonedParts(now, timeZone);
  if (period === 'year') {
    return {
      start: fromZoned({ year, month: 1, day: 1 }, timeZone),
      end: fromZoned({ year: year + 1, month: 1, day: 1 }, timeZone),
    };
  }
  const firstMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return {
    start: fromZoned({ year, month: firstMonth, day: 1 }, timeZone),
    // `fromZoned` normalises month 13 to January of the next year.
    end: fromZoned({ year, month: firstMonth + 3, day: 1 }, timeZone),
  };
}

export function periodProgress(
  period: ProgressPeriod,
  now: Timestamp,
  timeZone: TimeZone,
): PeriodProgress {
  const { start, end } = periodBounds(period, now, timeZone);
  const ratio = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0;
  return { period, start, end, ratio };
}
