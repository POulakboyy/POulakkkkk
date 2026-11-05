import { describe, expect, it } from 'vitest';
import { addDays, startOfDay } from '@pouxis/core';
import { NOW, TZ, makeEntry, makeTask } from '../shared/fixtures.test-utils.ts';
import {
  defaultChoices,
  highlight,
  movedCount,
  recordedMoved,
  reviewDay,
  shutdownChanges,
  shutdownTags,
  todaysShutdown,
} from './shutdown.ts';

const HOUR = 3_600_000;
const today = startOfDay(NOW, TZ);
const tomorrow = addDays(today, 1, TZ);

describe('reviewDay', () => {
  it('splits today into done (in order) and open planned tasks', () => {
    const later = makeTask({ status: 'done', completedAt: NOW - HOUR });
    const earlier = makeTask({ status: 'done', completedAt: NOW - 3 * HOUR });
    const open = makeTask({ floatingDay: today });
    const unplanned = makeTask();
    const review = reviewDay([later, open, earlier, unplanned], NOW, TZ);
    expect(review.done).toEqual([earlier, later]);
    expect(review.open).toEqual([open]);
  });
});

describe('shutdownChanges', () => {
  it('moves to tomorrow by default, counting the postponement, and keeps an undo snapshot', () => {
    const slot = { start: NOW - HOUR, end: NOW };
    const task = makeTask({ scheduled: slot, pinned: true });
    const [change] = shutdownChanges([task], defaultChoices([task]), NOW, TZ);
    expect(change!.patch).toEqual({
      floatingDay: tomorrow,
      scheduled: undefined,
      pinned: undefined,
      postponedCount: 1,
    });
    expect(change!.before).toEqual({
      floatingDay: undefined,
      scheduled: slot,
      pinned: true,
      postponedCount: 0,
    });
  });

  it('unplans "later" tasks and leaves "keep" untouched', () => {
    const later = makeTask({ floatingDay: today });
    const keep = makeTask({ floatingDay: today });
    const changes = shutdownChanges(
      [later, keep],
      { [later.id]: 'later', [keep.id]: 'keep' },
      NOW,
      TZ,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]!.patch.floatingDay).toBeUndefined();
    expect(movedCount(changes)).toBe(0);
  });
});

describe('highlight', () => {
  it('prefers important, then priority, then focus time', () => {
    const focused = makeTask({ timeLogs: [{ start: 0, end: HOUR, kind: 'focus' }] });
    const quick = makeTask();
    const urgent = makeTask({ priority: 3 });
    expect(highlight([quick, focused])).toBe(focused);
    expect(highlight([focused, urgent])).toBe(urgent);
    expect(highlight([])).toBeUndefined();
  });
});

describe('shutdown entry', () => {
  it('records the moved count and is found for its day only', () => {
    const entry = makeEntry({ tags: shutdownTags(NOW, TZ, 3) });
    expect(recordedMoved(entry)).toBe(3);
    expect(todaysShutdown([entry], NOW, TZ)).toBe(entry);
    expect(todaysShutdown([entry], NOW + 24 * HOUR, TZ)).toBeUndefined();
    expect(recordedMoved(makeEntry())).toBe(0);
  });
});
