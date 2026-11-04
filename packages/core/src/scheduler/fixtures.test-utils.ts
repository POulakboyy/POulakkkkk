/** Test-only builders for the scheduler suites (not exported by the module). */
import type { CalendarEvent, Task, TimeZone, Timestamp, UserPrefs } from '../model.ts';
import { DEFAULT_PREFS } from '../model.ts';
import { fromZoned } from '../time.ts';

export const UTC_PREFS: UserPrefs = { ...DEFAULT_PREFS, timeZone: 'UTC' };

/** `at(2, 9, 30)` = 2026-11-02 09:30 in `timeZone` (a Monday). */
export function at(day: number, hour: number, minute = 0, timeZone: TimeZone = 'UTC'): Timestamp {
  return fromZoned({ year: 2026, month: 11, day, hour, minute }, timeZone);
}

export function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    title: id,
    status: 'todo',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'organize',
    postponedCount: 0,
    timeLogs: [],
    ...patch,
  };
}

export function event(
  id: string,
  start: Timestamp,
  end: Timestamp,
  patch: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    title: id,
    start,
    end,
    timeZone: 'UTC',
    fixed: true,
    kind: 'meeting',
    attendees: [],
    tags: [],
    ...patch,
  };
}

/** Deterministic PRNG (mulberry32) for seeded property tests. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
