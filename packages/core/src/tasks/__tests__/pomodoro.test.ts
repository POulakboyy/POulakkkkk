import { describe, expect, it } from 'vitest';
import { MINUTE } from '../../time.ts';
import { estimateAccuracy, focusMinutes, logTimePatch, pomodoroPlan } from '../pomodoro.ts';
import { T0, task } from './fixtures.ts';

const log = (startMin: number, endMin: number, kind: 'focus' | 'break' = 'focus') => ({
  start: T0 + startMin * MINUTE,
  end: T0 + endMin * MINUTE,
  kind,
});

describe('pomodoroPlan', () => {
  it('splits 60 min into 25 + 25 + 10 with short breaks', () => {
    const plan = pomodoroPlan(60);
    expect(plan.blocks.map((b) => `${b.kind}:${b.minutes}`)).toEqual([
      'focus:25',
      'shortBreak:5',
      'focus:25',
      'shortBreak:5',
      'focus:10',
    ]);
    expect(plan).toMatchObject({ sessions: 3, focusMin: 60, breakMin: 10, totalMin: 70 });
  });

  it('inserts a long break after every 4th session', () => {
    const plan = pomodoroPlan(25 * 5);
    expect(plan.blocks.filter((b) => b.kind === 'longBreak')).toHaveLength(1);
    expect(plan.blocks[7]).toEqual({ kind: 'longBreak', minutes: 15 });
  });

  it('rounds the estimate up and handles empty or invalid estimates', () => {
    expect(pomodoroPlan(0.2).focusMin).toBe(1);
    expect(pomodoroPlan(0)).toMatchObject({ blocks: [], sessions: 0, totalMin: 0 });
    expect(pomodoroPlan(-5).sessions).toBe(0);
    expect(pomodoroPlan(Number.NaN).sessions).toBe(0);
  });

  it('honours custom options and rejects invalid ones', () => {
    expect(pomodoroPlan(100, { focus: 50, shortBreak: 10 }).totalMin).toBe(110);
    expect(() => pomodoroPlan(30, { focus: 0 })).toThrow(RangeError);
    expect(() => pomodoroPlan(30, { shortBreak: -1 })).toThrow(RangeError);
    expect(() => pomodoroPlan(30, { longEvery: 1.5 })).toThrow(RangeError);
  });
});

describe('logTimePatch', () => {
  it('appends and keeps logs sorted', () => {
    const t = task('a', { timeLogs: [log(30, 55)] });
    expect(logTimePatch(t, log(0, 25)).timeLogs).toEqual([log(0, 25), log(30, 55)]);
    expect(t.timeLogs).toHaveLength(1);
  });

  it('is idempotent for the same entry and rejects empty spans', () => {
    const t = task('a', { timeLogs: [log(0, 25)] });
    expect(logTimePatch(t, log(0, 25)).timeLogs).toEqual([log(0, 25)]);
    expect(() => logTimePatch(t, log(10, 10))).toThrow(RangeError);
    expect(() => logTimePatch(t, { start: Number.NaN, end: T0, kind: 'focus' })).toThrow(
      RangeError,
    );
  });
});

describe('focusMinutes', () => {
  const t = task('a', { timeLogs: [log(0, 25), log(25, 30, 'break'), log(30, 55)] });

  it('sums focus logs only', () => {
    expect(focusMinutes(t)).toBe(50);
  });

  it('clips to a range', () => {
    expect(focusMinutes(t, { start: T0 + 10 * MINUTE, end: T0 + 40 * MINUTE })).toBe(25);
    expect(focusMinutes(t, { start: T0 + 100 * MINUTE, end: T0 + 200 * MINUTE })).toBe(0);
  });
});

describe('estimateAccuracy', () => {
  it('is empty without usable samples', () => {
    const r = estimateAccuracy([task('a', { estimateMin: 30 }), task('b', { status: 'done' })]);
    expect(r).toMatchObject({ samples: 0, medianRatio: null, tendency: null });
  });

  it('computes the median ratio and tendency on completed tasks', () => {
    const done = (id: string, est: number, actual: number) =>
      task(id, { status: 'done', estimateMin: est, timeLogs: [log(0, actual)] });
    const r = estimateAccuracy([
      done('a', 30, 60),
      done('b', 30, 45),
      done('c', 60, 60),
      task('open', { estimateMin: 10, timeLogs: [log(0, 100)] }),
    ]);
    expect(r.samples).toBe(3);
    expect(r.medianRatio).toBe(1.5);
    expect(r.totalEstimateMin).toBe(120);
    expect(r.totalActualMin).toBe(165);
    expect(r.withinTolerance).toBeCloseTo(1 / 3);
    expect(r.tendency).toBe('underestimates');
    expect(estimateAccuracy([done('a', 60, 30), done('b', 60, 20)]).tendency).toBe('overestimates');
    expect(estimateAccuracy([done('a', 60, 55), done('b', 60, 65)])).toMatchObject({
      medianRatio: 1,
      tendency: 'accurate',
    });
  });
});
