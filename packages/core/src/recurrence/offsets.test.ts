import { describe, expect, it } from 'vitest';
import { DAY, MINUTE, fromZoned, tzOffset } from '../time.ts';
import { createOffsetLookup } from './offsets.ts';

const ZONES = [
  'Europe/Paris',
  'America/New_York',
  'Australia/Sydney',
  'Australia/Lord_Howe', // 30-minute DST shift
  'America/St_Johns', // half-hour base offset
  'Asia/Kathmandu', // no DST, +05:45
  'Pacific/Chatham',
  'UTC',
];

describe('createOffsetLookup', () => {
  for (const zone of ZONES) {
    it(`agrees with tzOffset every 17 minutes over 2026 in ${zone}`, () => {
      const offsetAt = createOffsetLookup(zone);
      const start = fromZoned({ year: 2026, month: 1, day: 1 }, 'UTC');
      const end = start + 366 * DAY;
      for (let ts = start; ts < end; ts += 17 * MINUTE) {
        expect(offsetAt(ts)).toBe(tzOffset(ts, zone));
      }
    });
  }

  it('is exact on both sides of a DST change, to the millisecond', () => {
    const offsetAt = createOffsetLookup('Europe/Paris');
    // 29 March 2026, 01:00 UTC: Paris jumps from +01:00 to +02:00.
    const change = fromZoned({ year: 2026, month: 3, day: 29, hour: 1 }, 'UTC');
    for (const ts of [change - 1, change, change + 1, change - 1000, change + 999]) {
      expect(offsetAt(ts)).toBe(tzOffset(ts, 'Europe/Paris'));
    }
  });
});
