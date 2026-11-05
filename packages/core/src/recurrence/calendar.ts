/**
 * Zone-free proleptic Gregorian calendar arithmetic on "day numbers" (days since 1970-01-01).
 *
 * The expansion engine reasons on local calendar dates and only converts to instants at the
 * very end (through `time.ts`), so these helpers never touch `Date` or `Intl`.
 */
import type { Weekday } from './types.ts';

export interface CivilDate {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

/** Days in a 400-year Gregorian cycle: every calendar pattern repeats after it. */
export const GREGORIAN_CYCLE_DAYS = 146_097;

/** Day number of a civil date (H. Hinnant's `days_from_civil`). */
export function toDayNum(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * GREGORIAN_CYCLE_DAYS + doe - 719_468;
}

/** Civil date of a day number (H. Hinnant's `civil_from_days`). */
export function fromDayNum(dayNum: number): CivilDate {
  const z = dayNum + 719_468;
  const era = Math.floor(z / GREGORIAN_CYCLE_DAYS);
  const doe = z - era * GREGORIAN_CYCLE_DAYS;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

/** 1970-01-01 was a Thursday. */
export function weekdayOf(dayNum: number): Weekday {
  return ((((dayNum + 4) % 7) + 7) % 7) as Weekday;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** Months since year 0, so consecutive months differ by one across year boundaries. */
export function monthIndex(year: number, month: number): number {
  return year * 12 + month - 1;
}

/** Day number of the first day of the week containing `dayNum`, weeks starting on `wkst`. */
export function weekStart(dayNum: number, wkst: Weekday): number {
  return dayNum - ((weekdayOf(dayNum) - wkst + 7) % 7);
}

/** Parses a strict `YYYY-MM-DD` key into a day number, or `null` when malformed/invalid. */
export function parseDayKey(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return toDayNum(year, month, day);
}

export function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
