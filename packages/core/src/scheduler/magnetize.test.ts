import { describe, expect, it } from 'vitest';
import { magnetize } from './magnetize.ts';
import { UTC_PREFS, at, event, task } from './fixtures.test-utils.ts';

describe('magnetize', () => {
  const day = at(3, 12);

  it('snaps floating tasks of the day into its free gaps without moving anything', () => {
    const r = magnetize({
      day,
      tasks: [
        task('f1', { floatingDay: at(3, 0), estimateMin: 60, createdAt: 1 }),
        task('f2', { floatingDay: at(3, 0), status: 'inbox', createdAt: 2 }),
        task('other-day', { floatingDay: at(4, 0) }),
        task('plain'),
      ],
      events: [event('m', at(3, 9), at(3, 10))],
      prefs: UTC_PREFS,
    });
    expect(r.suggestions).toEqual([
      { taskId: 'f1', start: at(3, 10), end: at(3, 11), reason: 'earliest' },
      { taskId: 'f2', start: at(3, 11), end: at(3, 11, 30), reason: 'earliest' },
    ]);
    expect(r.unplaced).toEqual([]);
  });

  it('works on a day off and respects `now`', () => {
    const saturday = at(7, 0);
    const r = magnetize({
      day: saturday,
      tasks: [task('f', { floatingDay: saturday })],
      events: [],
      prefs: UTC_PREFS,
      now: at(7, 13, 2),
    });
    expect(r.suggestions[0]).toMatchObject({ start: at(7, 13, 5) });
  });

  it('reports blocked floating tasks and those without room', () => {
    const r = magnetize({
      day,
      tasks: [
        task('dep'),
        task('blocked', { floatingDay: at(3, 0), dependsOn: ['dep'] }),
        task('huge', { floatingDay: at(3, 0), estimateMin: 600 }),
      ],
      events: [],
      prefs: UTC_PREFS,
    });
    expect(r.unplaced).toEqual([
      { taskId: 'blocked', reason: 'blocked' },
      { taskId: 'huge', reason: 'too-long' },
    ]);
  });

  it('ignores floating tasks that already have a slot', () => {
    const slot = { start: at(3, 9), end: at(3, 10) };
    const r = magnetize({
      day,
      tasks: [
        task('f', { floatingDay: at(3, 0), scheduled: slot }),
        task('g', { floatingDay: at(3, 0) }),
      ],
      events: [],
      prefs: UTC_PREFS,
    });
    expect(r.suggestions.map((s) => [s.taskId, s.start])).toEqual([['g', at(3, 10)]]);
  });
});
