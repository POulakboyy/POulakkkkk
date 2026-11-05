import { describe, expect, it } from 'vitest';
import { NOW, TZ, makeEntry, makeTask } from '../shared/fixtures.test-utils.ts';
import {
  memoryAt,
  pastWins,
  pebbleColor,
  unjarredCompletions,
  winTags,
  winsThisWeek,
} from './wins.ts';

const DAY = 86_400_000;

describe('wins', () => {
  // NOW is Thursday: the week started on Monday 2 Nov.
  const monday = makeEntry({ kind: 'win', text: 'lundi', createdAt: NOW - 3 * DAY });
  const today = makeEntry({ kind: 'win', text: 'jeudi', createdAt: NOW });
  const lastWeek = makeEntry({ kind: 'win', text: 'avant', createdAt: NOW - 5 * DAY });
  const friction = makeEntry({ kind: 'friction', createdAt: NOW });

  it('keeps this week’s wins, newest first', () => {
    expect(winsThisWeek([monday, lastWeek, friction, today], NOW, TZ)).toEqual([today, monday]);
  });

  it('pools older wins as memories and cycles through them', () => {
    const older = makeEntry({ kind: 'win', text: 'bien avant', createdAt: NOW - 20 * DAY });
    const pool = pastWins([today, lastWeek, older], NOW, TZ);
    expect(pool).toEqual([older, lastWeek]);
    expect(memoryAt(pool, 0)).toBe(older);
    expect(memoryAt(pool, 3)).toBe(lastWeek);
    expect(memoryAt(pool, -1)).toBe(lastWeek);
    expect(memoryAt([], 2)).toBeUndefined();
  });

  it('offers today’s completed tasks that are not in the jar yet', () => {
    const jarred = makeTask({ status: 'done', completedAt: NOW });
    const fresh = makeTask({ status: 'done', completedAt: NOW });
    const win = makeEntry({ kind: 'win', tags: winTags(jarred.id) });
    expect(unjarredCompletions([jarred, fresh], [win], NOW, TZ)).toEqual([fresh]);
  });

  it('gives each pebble a stable category colour', () => {
    expect(pebbleColor('abc')).toBe(pebbleColor('abc'));
    for (const id of ['a', 'b', 'xyz', '']) {
      expect(pebbleColor(id)).toBeGreaterThanOrEqual(1);
      expect(pebbleColor(id)).toBeLessThanOrEqual(8);
    }
  });
});

describe('fresh entries', () => {
  it('counts a win created just after the minute clock ticked', () => {
    const fresh = makeEntry({ kind: 'win', createdAt: NOW + 30_000 });
    expect(winsThisWeek([fresh], NOW, TZ)).toEqual([fresh]);
  });
});
