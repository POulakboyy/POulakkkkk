/** Test-only factories for the insights suites. */
import type { CalendarEvent, JournalEntry, Task, TimeLog, Timestamp } from '../model.ts';
import { fromZoned, HOUR, MINUTE } from '../time.ts';

export const TZ = 'Europe/Paris';

let seq = 0;
function nextId(prefix: string): string {
  seq++;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/** Local wall-clock instant in {@link TZ} (or `tz`). */
export function at(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  tz: string = TZ,
): Timestamp {
  return fromZoned({ year, month, day, hour, minute }, tz);
}

export function focus(start: Timestamp, minutes: number): TimeLog {
  return { start, end: start + minutes * MINUTE, kind: 'focus' };
}

export function task(overrides: Partial<Task> = {}): Task {
  const created = overrides.createdAt ?? at(2026, 1, 1);
  return {
    id: nextId('t'),
    createdAt: created,
    updatedAt: created,
    title: 'Task',
    status: 'todo',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'create',
    postponedCount: 0,
    timeLogs: [],
    ...overrides,
  };
}

/** A completed task at `completed`. */
export function done(completed: Timestamp, overrides: Partial<Task> = {}): Task {
  return task({ status: 'done', completedAt: completed, ...overrides });
}

export function meeting(start: Timestamp, minutes: number, overrides: Partial<CalendarEvent> = {}) {
  const event: CalendarEvent = {
    id: nextId('e'),
    createdAt: start - HOUR,
    updatedAt: start - HOUR,
    title: 'Meeting',
    start,
    end: start + minutes * MINUTE,
    timeZone: TZ,
    fixed: true,
    kind: 'meeting',
    attendees: [],
    tags: [],
    ...overrides,
  };
  return event;
}

export function journal(
  kind: JournalEntry['kind'],
  createdAt: Timestamp,
  text: string,
  tags: string[] = [],
): JournalEntry {
  return { id: nextId('j'), createdAt, updatedAt: createdAt, kind, text, tags };
}
