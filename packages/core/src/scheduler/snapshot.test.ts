import { describe, expect, it } from 'vitest';
import { compareSnapshots, snapshot } from './snapshot.ts';
import { at, event, task } from './fixtures.test-utils.ts';

const slot = (h: number, len = 60) => ({ start: at(2, h), end: at(2, h) + len * 60_000 });

describe('snapshot', () => {
  it('freezes events and scheduled tasks, sorted, as plain data', () => {
    const s = snapshot(
      [
        task('t', {
          scheduled: slot(11),
          estimateMin: 60,
          timeLogs: [{ ...slot(11, 30), kind: 'focus' }],
        }),
        task('unscheduled'),
        event('e', at(2, 9), at(2, 10)),
      ],
      at(2, 8),
    );
    expect(s).toEqual({
      takenAt: at(2, 8),
      entries: [
        { id: 'e', kind: 'event', title: 'e', start: at(2, 9), end: at(2, 10), fixed: true },
        {
          id: 't',
          kind: 'task',
          title: 't',
          start: at(2, 11),
          end: at(2, 12),
          status: 'todo',
          estimateMin: 60,
          loggedMin: 30,
        },
      ],
    });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('compareSnapshots', () => {
  const planned = snapshot(
    [
      task('on-time', { scheduled: slot(9), estimateMin: 60 }),
      task('late', { scheduled: slot(10), estimateMin: 30 }),
      task('not-done', { scheduled: slot(11) }),
      task('dropped', { scheduled: slot(12) }),
      task('future', { scheduled: slot(17) }),
      event('meeting', at(2, 14), at(2, 15)),
    ],
    at(2, 8),
  );
  const actual = snapshot(
    [
      task('on-time', {
        scheduled: slot(9),
        status: 'done',
        completedAt: at(2, 9, 50),
        timeLogs: [{ ...slot(9, 50), kind: 'focus' }],
      }),
      task('late', {
        scheduled: slot(10),
        status: 'done',
        completedAt: at(2, 12),
        timeLogs: [{ ...slot(10, 90), kind: 'focus' }],
      }),
      task('not-done', { scheduled: slot(13) }),
      task('future', { scheduled: slot(17) }),
      event('meeting', at(2, 14, 30), at(2, 16)),
      event('new', at(2, 16), at(2, 17)),
    ],
    at(2, 16),
  );
  const diff = compareSnapshots(planned, actual);

  it('lists added, removed and moved items', () => {
    expect(diff.added).toEqual(['new']);
    expect(diff.removed).toEqual(['dropped']);
    expect(diff.moved).toEqual([
      { id: 'not-done', kind: 'task', deltaStartMin: 120, deltaDurationMin: 0 },
      { id: 'meeting', kind: 'event', deltaStartMin: 30, deltaDurationMin: 30 },
    ]);
  });

  it('separates tasks done on time from slips; future slots are not judged', () => {
    expect(diff.completedOnTime).toEqual(['on-time']);
    expect(diff.slipped).toEqual([
      { id: 'late', reason: 'completed-late', delayMin: 60 },
      { id: 'not-done', reason: 'not-done' },
      { id: 'dropped', reason: 'dropped' },
    ]);
  });

  it('measures planning accuracy as estimated over logged time', () => {
    expect(diff.accuracy).toEqual({
      estimatedMin: 90,
      loggedMin: 140,
      sampleSize: 2,
      ratio: 90 / 140,
    });
    const empty = compareSnapshots(snapshot([], 0), snapshot([], 0));
    expect(empty.accuracy).toEqual({ estimatedMin: 0, loggedMin: 0, sampleSize: 0 });
  });
});
