import { describe, expect, it } from 'vitest';
import { dayKey } from '@pouxis/core';
import { NOW, PREFS, TZ, makeTask } from '../shared/fixtures.test-utils.ts';
import {
  FIRST_STEP_MIN,
  FRESH_TAG,
  MAX_STALLED,
  firstStepRecord,
  freshStartTags,
  letGoChange,
  nextLandmarks,
  restartChange,
  stalledTasks,
} from './freshstart.ts';

describe('nextLandmarks', () => {
  it('returns next Monday then the first of next month (Thursday 5 November 2026)', () => {
    const [week, month] = nextLandmarks(NOW, TZ);
    expect(week).toMatchObject({ kind: 'week' });
    expect(dayKey(week!.at, TZ)).toBe('2026-11-09');
    expect(month).toMatchObject({ kind: 'month' });
    expect(dayKey(month!.at, TZ)).toBe('2026-12-01');
  });

  it('puts the month first when it comes sooner, and rolls over the year', () => {
    const lateDecember = Date.UTC(2026, 11, 30, 10);
    const list = nextLandmarks(lateDecember, TZ);
    expect(list.map((l) => l.kind)).toEqual(['month', 'week']);
    expect(dayKey(list[0]!.at, TZ)).toBe('2027-01-01');
  });

  it('keeps a single landmark when a month starts on a Monday', () => {
    // Friday 26 February 2027: next Monday is 1 March.
    const list = nextLandmarks(Date.UTC(2027, 1, 26, 10), TZ);
    expect(list).toHaveLength(1);
    expect(list[0]!.kind).toBe('month');
    expect(dayKey(list[0]!.at, TZ)).toBe('2027-03-01');
  });
});

describe('stalledTasks', () => {
  it('keeps decayed open tasks, most decayed first, capped', () => {
    const stale = makeTask({ title: 'stale', postponedCount: 5 });
    const aging = makeTask({ title: 'aging', postponedCount: 2 });
    const fresh = makeTask({ title: 'fresh' });
    const done = makeTask({ title: 'done', status: 'done', postponedCount: 9 });
    expect(stalledTasks([fresh, aging, done, stale], PREFS, NOW).map((t) => t.title)).toEqual([
      'stale',
      'aging',
    ]);
    const many = Array.from({ length: 8 }, () => makeTask({ postponedCount: 4 }));
    expect(stalledTasks(many, PREFS, NOW)).toHaveLength(MAX_STALLED);
  });
});

describe('changes', () => {
  const landmark = { kind: 'week' as const, at: Date.UTC(2026, 10, 8, 23) };

  it('restart floats the task on the landmark with a clean counter, and can be undone', () => {
    const task = makeTask({
      status: 'inbox',
      postponedCount: 4,
      scheduled: { start: NOW, end: NOW + 3_600_000 },
      pinned: true,
    });
    const change = restartChange(task, landmark);
    expect(change.patch).toEqual({
      floatingDay: landmark.at,
      scheduled: undefined,
      pinned: undefined,
      postponedCount: 0,
      status: 'todo',
    });
    expect(change.before).toMatchObject({ status: 'inbox', postponedCount: 4, pinned: true });
  });

  it('let go archives', () => {
    expect(letGoChange(makeTask()).patch).toEqual({ status: 'archived' });
  });

  it('first step is a small subtask of the same project and mode', () => {
    const parent = makeTask({ projectId: 'p1', mode: 'create', priority: 2 });
    expect(firstStepRecord(parent, '  Ouvrir   le fichier ', landmark)).toMatchObject({
      title: 'Ouvrir le fichier',
      parentId: parent.id,
      projectId: 'p1',
      mode: 'create',
      priority: 2,
      estimateMin: FIRST_STEP_MIN,
      floatingDay: landmark.at,
    });
  });

  it('tags keep the cleared count', () => {
    const task = makeTask({ postponedCount: 6 });
    expect(freshStartTags(task, 'month')).toEqual([
      FRESH_TAG,
      `lab:task:${task.id}`,
      'lab:landmark:month',
      'lab:postponed:6',
    ]);
  });
});
