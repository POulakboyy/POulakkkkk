/** Test helpers: wall-clock instants in a zone, and instants shown as local wall-clock text. */
import type { TimeZone, Timestamp } from '../model.ts';
import { fromZoned, zonedParts } from '../time.ts';

export const PARIS = 'Europe/Paris';
export const NEW_YORK = 'America/New_York';

/** `"2026-03-29 09:30"` in `tz` → instant. */
export function at(text: string, tz: TimeZone): Timestamp {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(text);
  if (!m) throw new Error(`Bad test date ${text}`);
  return fromZoned(
    {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      hour: Number(m[4] ?? 0),
      minute: Number(m[5] ?? 0),
    },
    tz,
  );
}

/** Instant → `"2026-03-29 09:30"` in `tz`. */
export function local(ts: Timestamp, tz: TimeZone): string {
  const p = zonedParts(ts, tz);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

export function locals(list: readonly Timestamp[], tz: TimeZone): string[] {
  return list.map((ts) => local(ts, tz));
}
