/**
 * Record lifecycle detectors: "dead ends" (feature 5.15) and archive candidates (feature 3.9).
 *
 * Both take any durable records (tasks, notes, graphs, journal entries…) and only read
 * `createdAt`, `updatedAt` and, when present, `status` and `sandbox`. Records that are already
 * finished or archived (`status` `done` / `archived`) and sandbox notes are never reported.
 */
import type { Record_, TimeZone, Timestamp } from '../model.ts';
import { DAY, daysInMonth, fromZoned, MINUTE, zonedParts } from '../time.ts';
import { assertFiniteTimestamp } from './internal.ts';

/** The fields the detectors read; every other field of the record is passed through. */
export type LifecycleRecord = Record_ & { status?: string; sandbox?: boolean };

export interface DeadEndOptions {
  /** Days without any edit since creation before a record is flagged (default 30). */
  idleDays?: number;
  /**
   * Edits made within this many minutes of creation still belong to the creation session
   * (typing the first lines, fixing a typo) and do not count as a revisit (default 10).
   */
  creationSessionMin?: number;
}

export interface StaleRecord<T> {
  record: T;
  /** Whole days since the last edit (since creation for dead ends). */
  idleDays: number;
}

export interface ArchiveOptions {
  /** Years without interaction before a record is proposed for archiving (default 2). */
  years?: number;
  /**
   * Zone whose calendar the years are counted in (recommended: the user's zone). Without it,
   * years are counted on the UTC calendar, which can differ by a few hours.
   */
  timeZone?: TimeZone;
}

function isSettled(record: LifecycleRecord): boolean {
  return record.status === 'done' || record.status === 'archived' || record.sandbox === true;
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be > 0`);
  return value;
}

function byIdleDesc<T extends LifecycleRecord>(a: StaleRecord<T>, b: StaleRecord<T>): number {
  return b.idleDays - a.idleDays || a.record.id.localeCompare(b.record.id);
}

/**
 * Records started and never touched again: last edit within the creation session and
 * created at least `idleDays` days before `now`. Most idle first.
 */
export function deadEnds<T extends LifecycleRecord>(
  records: readonly T[],
  now: Timestamp,
  options: DeadEndOptions = {},
): StaleRecord<T>[] {
  assertFiniteTimestamp(now, 'now');
  const idleMs = positive(options.idleDays ?? 30, 'idleDays') * DAY;
  const sessionMs = (options.creationSessionMin ?? 10) * MINUTE;
  if (!(sessionMs >= 0)) throw new RangeError('creationSessionMin must be >= 0');

  const out: StaleRecord<T>[] = [];
  for (const record of records) {
    if (isSettled(record)) continue;
    const age = now - record.createdAt;
    if (!(age >= idleMs)) continue;
    if (record.updatedAt - record.createdAt > sessionMs) continue;
    out.push({ record, idleDays: Math.floor(age / DAY) });
  }
  return out.sort(byIdleDesc);
}

/**
 * `now` moved back by whole calendar years in `timeZone` (UTC calendar when omitted; 29 February
 * maps to 28 February). A fractional remainder (e.g. 1.5 years) uses an average year length.
 */
function yearsBefore(now: Timestamp, years: number, timeZone: TimeZone = 'UTC'): Timestamp {
  const p = zonedParts(now, timeZone);
  const whole = Math.floor(years);
  const year = p.year - whole;
  const shifted = fromZoned(
    {
      year,
      month: p.month,
      day: Math.min(p.day, daysInMonth(year, p.month)),
      hour: p.hour,
      minute: p.minute,
      second: p.second,
    },
    timeZone,
  );
  return shifted + (now % 1000) - (years - whole) * 365.2425 * DAY;
}

/**
 * Records without any interaction (`updatedAt`) for at least `years` years: candidates for
 * the automatic archiving policy. Most idle first. Nothing is archived here; the caller asks.
 */
export function archiveCandidates<T extends LifecycleRecord>(
  records: readonly T[],
  now: Timestamp,
  options: ArchiveOptions = {},
): StaleRecord<T>[] {
  assertFiniteTimestamp(now, 'now');
  const cutoff = yearsBefore(now, positive(options.years ?? 2, 'years'), options.timeZone);
  const out: StaleRecord<T>[] = [];
  for (const record of records) {
    if (isSettled(record) || !(record.updatedAt <= cutoff)) continue;
    out.push({ record, idleDays: Math.floor((now - record.updatedAt) / DAY) });
  }
  return out.sort(byIdleDesc);
}
