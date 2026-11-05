import { describe, expect, it } from 'vitest';
import { DAY, MINUTE, dayKey, endOfDay, fromZoned, startOfDay } from '../time.ts';
import { createDayLookup } from './internal.ts';

describe('createDayLookup', () => {
  for (const zone of [
    'Europe/Paris',
    'America/Santiago',
    'Asia/Kathmandu',
    'Pacific/Apia',
    'UTC',
  ]) {
    it(`matches dayKey/startOfDay/endOfDay over 2026 in ${zone}`, () => {
      const localDay = createDayLookup(zone);
      const start = fromZoned({ year: 2026, month: 1, day: 1 }, 'UTC');
      // Jumps back and forth so lookups do not only hit the "last day" fast path.
      for (let i = 0; i < 4000; i++) {
        const ts = start + ((i * 7919 * 13 * MINUTE) % (366 * DAY));
        const day = localDay(ts);
        expect(day.key).toBe(dayKey(ts, zone));
        expect(day.start).toBe(startOfDay(ts, zone));
        expect(day.end).toBe(endOfDay(ts, zone));
      }
    });
  }

  it('handles both edges of a day', () => {
    const localDay = createDayLookup('Europe/Paris');
    const midnight = fromZoned({ year: 2026, month: 3, day: 29 }, 'Europe/Paris');
    expect(localDay(midnight).key).toBe('2026-03-29');
    expect(localDay(midnight - 1).key).toBe('2026-03-28');
    // DST day: 23 hours long.
    expect(localDay(midnight).end - midnight).toBe(23 * 60 * MINUTE);
  });
});
