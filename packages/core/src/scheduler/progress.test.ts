import { describe, expect, it } from 'vitest';
import { fromZoned } from '../time.ts';
import { periodBounds, progress } from './progress.ts';

const paris = (month: number, day: number, hour = 0) =>
  fromZoned({ year: 2026, month, day, hour }, 'Europe/Paris');

describe('progress', () => {
  it('measures the elapsed share of the local day', () => {
    expect(progress(paris(11, 4, 12), 'day', 'Europe/Paris')).toBe(0.5);
    expect(progress(paris(11, 4, 0), 'day', 'Europe/Paris')).toBe(0);
  });

  it('uses the real length of DST days', () => {
    // 29 March 2026 has 23 h in Paris: 12:00 is 11 h after midnight.
    expect(progress(paris(3, 29, 12), 'day', 'Europe/Paris')).toBeCloseTo(11 / 23);
    // 25 October 2026 has 25 h.
    expect(progress(paris(10, 25, 12), 'day', 'Europe/Paris')).toBeCloseTo(13 / 25);
  });

  it('supports weeks with a configurable first day', () => {
    // Wednesday 4 November 2026, 00:00.
    expect(progress(paris(11, 4), 'week', 'Europe/Paris')).toBeCloseTo(2 / 7);
    expect(progress(paris(11, 4), 'week', 'Europe/Paris', { weekStartsOn: 0 })).toBeCloseTo(3 / 7);
  });

  it('supports months, quarters and years', () => {
    expect(periodBounds(paris(11, 4), 'month', 'Europe/Paris')).toEqual({
      start: paris(11, 1),
      end: paris(12, 1),
    });
    expect(periodBounds(paris(11, 4), 'quarter', 'Europe/Paris')).toEqual({
      start: paris(10, 1),
      end: fromZoned({ year: 2027, month: 1, day: 1 }, 'Europe/Paris'),
    });
    expect(periodBounds(paris(2, 10), 'year', 'Europe/Paris').start).toBe(paris(1, 1));
    expect(progress(paris(7, 2, 12), 'year', 'UTC')).toBeGreaterThan(0.49);
  });

  it('clamps to 0..1 and handles explicit and empty intervals', () => {
    const span = { start: 0, end: 100 };
    expect(progress(50, span, 'UTC')).toBe(0.5);
    expect(progress(-5, span, 'UTC')).toBe(0);
    expect(progress(500, span, 'UTC')).toBe(1);
    expect(progress(5, { start: 10, end: 10 }, 'UTC')).toBe(0);
  });
});
