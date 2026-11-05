import { describe, expect, it } from 'vitest';
import type { TimeLog } from '@pouxis/core';
import { NOW, TZ, makeTask } from '../shared/fixtures.test-utils.ts';
import {
  breakLog,
  focusStretch,
  isRhythmId,
  isSnoozed,
  suggestBreak,
  untilNextBreak,
} from './breaks.ts';

const MIN = 60_000;

function focus(fromMinAgo: number, toMinAgo: number): TimeLog {
  return { start: NOW - fromMinAgo * MIN, end: NOW - toMinAgo * MIN, kind: 'focus' };
}

describe('focusStretch', () => {
  it('adds up focus logs separated by short gaps', () => {
    const task = makeTask({ timeLogs: [focus(30, 16), focus(15, 0)] });
    const stretch = focusStretch([task], NOW, TZ, 6);
    expect(stretch.focusMs).toBe(29 * MIN);
    expect(stretch.lastTaskId).toBe(task.id);
    expect(stretch.restingMs).toBeUndefined();
  });

  it('restarts after a gap as long as a rest, or after a logged break', () => {
    const gap = makeTask({ timeLogs: [focus(60, 30), focus(20, 0)] });
    expect(focusStretch([gap], NOW, TZ, 6).focusMs).toBe(20 * MIN);
    const brk: TimeLog = { start: NOW - 10 * MIN, end: NOW - 8 * MIN, kind: 'break' };
    const logged = makeTask({ timeLogs: [focus(40, 10), brk, focus(8, 0)] });
    expect(focusStretch([logged], NOW, TZ, 6).focusMs).toBe(8 * MIN);
  });

  it('reports a rest once the user has been away long enough', () => {
    const task = makeTask({ timeLogs: [focus(40, 10)] });
    const stretch = focusStretch([task], NOW, TZ, 6);
    expect(stretch.focusMs).toBe(0);
    expect(stretch.restingMs).toBe(10 * MIN);
    expect(stretch.focusedToday).toBe(true);
  });

  it('ignores logs from previous days and clips the one crossing midnight', () => {
    const midnight = Date.UTC(2026, 10, 4, 23, 0); // 00:00 in Paris
    const crossing: TimeLog = {
      start: midnight - 10 * MIN,
      end: midnight + 5 * MIN,
      kind: 'focus',
    };
    const task = makeTask({ timeLogs: [crossing] });
    expect(focusStretch([task], midnight + 6 * MIN, TZ, 6).focusMs).toBe(5 * MIN);
    expect(focusStretch([], NOW, TZ, 6).focusedToday).toBe(false);
  });
});

describe('suggestBreak', () => {
  const stretch = (minutes: number, mode: 'create' | 'organize' = 'organize') => ({
    focusMs: minutes * MIN,
    focusedToday: true,
    lastMode: mode,
  });

  it('waits for the rhythm, then picks the kind of break', () => {
    expect(suggestBreak(stretch(20), '24/6')).toBeUndefined();
    expect(suggestBreak(stretch(25), '24/6')).toEqual({ kind: 'micro', minutes: 6 });
    expect(suggestBreak(stretch(13), '12/3')).toEqual({ kind: 'micro', minutes: 3 });
    expect(suggestBreak(stretch(13, 'create'), '12/3')).toEqual({ kind: 'move', minutes: 5 });
    expect(suggestBreak(stretch(95, 'create'), '24/6')).toEqual({ kind: 'rest', minutes: 12 });
  });

  it('never suggests in free mode', () => {
    expect(suggestBreak(stretch(200), 'free')).toBeUndefined();
    expect(untilNextBreak(stretch(200), 'free')).toBeUndefined();
  });

  it('counts down to the next break and honours "not now"', () => {
    expect(untilNextBreak(stretch(20), '24/6')).toBe(4 * MIN);
    expect(untilNextBreak(stretch(30), '24/6')).toBe(0);
    expect(isSnoozed(stretch(30), 25 * MIN)).toBe(true);
    expect(isSnoozed(stretch(36), 25 * MIN)).toBe(false);
    expect(isSnoozed(stretch(30), undefined)).toBe(false);
  });
});

describe('helpers', () => {
  it('builds a break log and validates stored rhythm ids', () => {
    expect(breakLog(10, 5)).toEqual({ start: 10, end: 10, kind: 'break' });
    expect(isRhythmId('12/3')).toBe(true);
    expect(isRhythmId('25/5')).toBe(false);
    expect(isRhythmId(null)).toBe(false);
  });
});
