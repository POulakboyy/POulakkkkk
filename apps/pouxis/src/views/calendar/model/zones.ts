/**
 * Multi-time-zone alignment (1.5): each collaborator zone is shown hour by hour against the
 * user's own hours, and the working windows of every zone are intersected into the shared
 * window where a meeting suits everyone.
 */
import {
  MINUTE,
  atMinutes,
  fromZoned,
  tzOffset,
  zonedParts,
  type Interval,
  type TimeZone,
  type Timestamp,
  type WorkingHours,
} from '@pouxis/core';

/** Suggested collaborator zones when the runtime cannot list them. */
export const FALLBACK_ZONES: readonly TimeZone[] = [
  'America/Los_Angeles',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

/** Every IANA zone the runtime knows, or a short fallback list. */
export function availableZones(): readonly TimeZone[] {
  try {
    const list = Intl.supportedValuesOf('timeZone');
    return list.length > 0 ? list : FALLBACK_ZONES;
  } catch {
    return FALLBACK_ZONES;
  }
}

export function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** `America/New_York` → `New York`. */
export function zoneCity(zone: TimeZone): string {
  const last = zone.split('/').pop() ?? zone;
  return last.replace(/_/g, ' ');
}

/** Minutes `zone` is ahead of `reference` at instant `at` (negative when behind). */
export function offsetFrom(zone: TimeZone, reference: TimeZone, at: Timestamp): number {
  return Math.round((tzOffset(at, zone) - tzOffset(at, reference)) / MINUTE);
}

/** `+6 h`, `−5 h 30`, `+0 h 45`; empty string for no offset. */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return '';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h} h` : `${sign}${h} h ${String(m).padStart(2, '0')}`;
}

export type HourKind = 'work' | 'day' | 'night';

export interface ZoneHour {
  /** Instant of the user's local hour this cell is aligned with. */
  at: Timestamp;
  /** Wall-clock hour and minute in the collaborator's zone. */
  hour: number;
  minute: number;
  kind: HourKind;
  /** First hour of a new local date in the zone (a date label goes here). */
  newDate: boolean;
}

/** 24 cells aligned on the user's local hours of `day`, as seen in `zone`. */
export function zoneHours(
  day: Timestamp,
  localZone: TimeZone,
  zone: TimeZone,
  hours: WorkingHours,
): ZoneHour[] {
  const cells: ZoneHour[] = [];
  for (let h = 0; h < 24; h++) {
    const at = atMinutes(day, h * 60, localZone);
    const p = zonedParts(at, zone);
    const minuteOfDay = p.hour * 60 + p.minute;
    const working =
      hours.days.includes(p.weekday) && minuteOfDay >= hours.start && minuteOfDay < hours.end;
    const kind: HourKind = working ? 'work' : p.hour >= 7 && p.hour < 22 ? 'day' : 'night';
    cells.push({ at, hour: p.hour, minute: p.minute, kind, newDate: h > 0 && p.hour === 0 });
  }
  return cells;
}

/** Working intervals of `zone` that touch `range`, on the zone's own working days. */
export function workingIntervals(
  zone: TimeZone,
  hours: WorkingHours,
  range: Interval,
): Interval[] {
  const out: Interval[] = [];
  const first = zonedParts(range.start, zone);
  for (let offset = -1; offset <= 1; offset++) {
    const date = { year: first.year, month: first.month, day: first.day + offset };
    const midnight = fromZoned(date, zone);
    const weekday = zonedParts(midnight, zone).weekday;
    if (!hours.days.includes(weekday)) continue;
    const start = atMinutes(midnight, hours.start, zone);
    const end = atMinutes(midnight, hours.end, zone);
    const clipped = { start: Math.max(start, range.start), end: Math.min(end, range.end) };
    if (clipped.end > clipped.start) out.push(clipped);
  }
  return out;
}

function intersect(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) out.push({ start, end });
    }
  }
  return out.sort((p, q) => p.start - q.start);
}

/**
 * Longest window of `day` (local) inside the working hours of every zone, the user's
 * included. Collaborators are assumed to keep the same working hours as the user.
 */
export function sharedWindow(
  day: Interval,
  zones: readonly TimeZone[],
  hours: WorkingHours,
): Interval | null {
  let windows: Interval[] = [day];
  for (const zone of zones) {
    windows = intersect(windows, workingIntervals(zone, hours, day));
    if (windows.length === 0) return null;
  }
  return windows.reduce<Interval | null>(
    (best, w) => (!best || w.end - w.start > best.end - best.start ? w : best),
    null,
  );
}
