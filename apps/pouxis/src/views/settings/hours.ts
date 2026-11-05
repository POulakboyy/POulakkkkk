import type { Locale, WorkingHours } from '@pouxis/core';

/** Weekdays in display order (Monday first), as `WorkingHours.days` numbers (0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** `540` → `"09:00"`, the value format of `<input type="time">`. */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** `"09:30"` → `570`; `null` for anything that is not a valid 24 h time. */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function hoursValid(hours: WorkingHours): boolean {
  return hours.end > hours.start && hours.days.length > 0;
}

/**
 * Short weekday names (`lun.`, `Mon`). 4 January 2026 is a Sunday; the explicit UTC zone keeps
 * the result independent of the machine's zone.
 */
export function weekdayName(day: number, locale: Locale, style: 'short' | 'long' = 'short') {
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
    Date.UTC(2026, 0, 4 + day),
  );
}

export function toggleDay(days: readonly number[], day: number): number[] {
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
  return next.sort((a, b) => a - b);
}
