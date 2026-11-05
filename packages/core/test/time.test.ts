import { describe, expect, it } from 'vitest';
import {
  addDays,
  atMinutes,
  dayKey,
  freeSlots,
  fromZoned,
  HOUR,
  mergeIntervals,
  minutesOfDay,
  startOfDay,
  startOfWeek,
  tzOffset,
  zonedParts,
} from '../src/time.ts';

const PARIS = 'Europe/Paris';

describe('time', () => {
  it('converts wall-clock time in a zone to an instant and back', () => {
    const ts = fromZoned({ year: 2026, month: 1, day: 15, hour: 14, minute: 30 }, PARIS);
    expect(new Date(ts).toISOString()).toBe('2026-01-15T13:30:00.000Z');
    expect(zonedParts(ts, PARIS)).toMatchObject({
      year: 2026,
      month: 1,
      day: 15,
      hour: 14,
      minute: 30,
      weekday: 4,
    });
  });

  it('reports DST-aware offsets', () => {
    expect(tzOffset(Date.UTC(2026, 0, 1), PARIS)).toBe(HOUR);
    expect(tzOffset(Date.UTC(2026, 6, 1), PARIS)).toBe(2 * HOUR);
  });

  it('keeps wall-clock time across a DST change when adding days', () => {
    // Paris springs forward on 2026-03-29.
    const before = fromZoned({ year: 2026, month: 3, day: 28, hour: 9 }, PARIS);
    const after = addDays(before, 1, PARIS);
    expect(zonedParts(after, PARIS).hour).toBe(9);
    expect(after - before).toBe(23 * HOUR);
  });

  it('resolves a time skipped by DST forward', () => {
    const ts = fromZoned({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, PARIS);
    expect(zonedParts(ts, PARIS).hour).toBe(3);
  });

  it('computes day keys, starts of day and week', () => {
    const ts = fromZoned({ year: 2026, month: 10, day: 8, hour: 23, minute: 59 }, PARIS);
    expect(dayKey(ts, PARIS)).toBe('2026-10-08');
    expect(dayKey(ts, 'UTC')).toBe('2026-10-08');
    expect(minutesOfDay(startOfDay(ts, PARIS), PARIS)).toBe(0);
    expect(dayKey(startOfWeek(ts, PARIS), PARIS)).toBe('2026-10-05');
    expect(minutesOfDay(atMinutes(ts, 9 * 60 + 15, PARIS), PARIS)).toBe(555);
  });

  it('merges intervals and finds free slots', () => {
    expect(
      mergeIntervals([
        { start: 5, end: 8 },
        { start: 0, end: 3 },
        { start: 3, end: 4 },
      ]),
    ).toEqual([
      { start: 0, end: 4 },
      { start: 5, end: 8 },
    ]);
    expect(
      freeSlots({ start: 0, end: 10 }, [
        { start: 2, end: 4 },
        { start: 3, end: 6 },
        { start: 9, end: 12 },
      ]),
    ).toEqual([
      { start: 0, end: 2 },
      { start: 6, end: 9 },
    ]);
  });
});
