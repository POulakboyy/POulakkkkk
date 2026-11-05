import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../model.ts';
import { overlaps } from '../time.ts';
import { bufferLengthMs, insertBuffers } from './buffers.ts';
import { UTC_PREFS, at, event, rng } from './fixtures.test-utils.ts';

const soft = { fixed: false };

describe('insertBuffers', () => {
  it('adds a buffer after a meeting followed back to back by another', () => {
    const drafts = insertBuffers(
      [event('a', at(2, 9), at(2, 10), soft), event('b', at(2, 10), at(2, 11), soft)],
      UTC_PREFS,
    );
    expect(drafts).toEqual([
      {
        title: 'Transition',
        start: at(2, 10),
        end: at(2, 10, 10),
        timeZone: 'UTC',
        fixed: false,
        kind: 'buffer',
        attendees: [],
        tags: [],
      },
    ]);
  });

  it('clamps the length to 5–15 min and uses the locale', () => {
    expect(bufferLengthMs(1)).toBe(5 * 60_000);
    expect(bufferLengthMs(40)).toBe(15 * 60_000);
    expect(bufferLengthMs(Number.NaN)).toBe(5 * 60_000);
    const drafts = insertBuffers(
      [event('a', at(2, 9), at(2, 10), soft), event('b', at(2, 10, 5), at(2, 11), soft)],
      { bufferMin: 30, locale: 'en' },
    );
    expect(drafts.map((d) => [d.title, d.end])).toEqual([['Buffer', at(2, 10, 15)]]);
  });

  it('skips meetings with a natural break, the last meeting and other kinds', () => {
    const drafts = insertBuffers(
      [
        event('a', at(2, 9), at(2, 10)),
        event('b', at(2, 10, 30), at(2, 11)),
        event('focus', at(2, 11), at(2, 12), { kind: 'focus' }),
      ],
      UTC_PREFS,
    );
    expect(drafts).toEqual([]);
  });

  it('shortens a buffer before a fixed meeting and drops it under 5 min', () => {
    const short = insertBuffers(
      [event('a', at(2, 9), at(2, 10)), event('b', at(2, 10, 7), at(2, 11))],
      UTC_PREFS,
    );
    expect(short.map((d) => [d.start, d.end])).toEqual([[at(2, 10), at(2, 10, 7)]]);
    const none = insertBuffers(
      [event('a', at(2, 9), at(2, 10)), event('b', at(2, 10), at(2, 11))],
      UTC_PREFS,
    );
    expect(none).toEqual([]);
  });

  it('is idempotent once its drafts are saved', () => {
    const events = [event('a', at(2, 9), at(2, 10), soft), event('b', at(2, 10), at(2, 11), soft)];
    const saved = insertBuffers(events, UTC_PREFS).map((d, i): CalendarEvent => ({
      ...d,
      id: `buf${i}`,
      createdAt: 0,
      updatedAt: 0,
    }));
    expect(insertBuffers([...events, ...saved], UTC_PREFS)).toEqual([]);
  });

  it.each(Array.from({ length: 40 }, (_, i) => i + 1))(
    'seed %i: buffers are 5–15 min and never overlap fixed events',
    (seed) => {
      const rand = rng(seed);
      const events: CalendarEvent[] = [];
      for (let i = 0; i < 12; i++) {
        const start = at(2, 9 + Math.floor(rand() * 8), Math.floor(rand() * 12) * 5);
        events.push(
          event(`e${i}`, start, start + (1 + Math.floor(rand() * 6)) * 10 * 60_000, {
            fixed: rand() < 0.5,
          }),
        );
      }
      const drafts = insertBuffers(events, UTC_PREFS);
      for (const d of drafts) {
        expect(d.end - d.start).toBeGreaterThanOrEqual(5 * 60_000);
        expect(d.end - d.start).toBeLessThanOrEqual(15 * 60_000);
        expect(events.filter((e) => e.fixed).some((e) => overlaps(e, d))).toBe(false);
      }
      expect(new Set(drafts.map((d) => d.start)).size).toBe(drafts.length);
    },
  );
});
