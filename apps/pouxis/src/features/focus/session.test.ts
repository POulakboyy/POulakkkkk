import { describe, expect, it } from 'vitest';
import { MINUTE, type Task } from '@pouxis/core';
import * as session from './session.ts';
import { focusDisplay, phaseOf } from './display.ts';

const T0 = Date.UTC(2026, 10, 5, 9, 0);

function task(estimateMin?: number, logged = 0): Task {
  return {
    id: 't1',
    createdAt: 0,
    updatedAt: 0,
    title: 'Write',
    status: 'todo',
    priority: 2,
    tags: [],
    dependsOn: [],
    mode: 'create',
    postponedCount: 0,
    timeLogs: logged ? [{ start: 0, end: logged * MINUTE, kind: 'focus' }] : [],
    ...(estimateMin === undefined ? {} : { estimateMin }),
  };
}

describe('startSession', () => {
  it('plans what is left of the estimate', () => {
    const s = session.startSession(task(50), T0);
    expect(s.blocks.map((b) => [b.kind, b.minutes])).toEqual([
      ['focus', 25],
      ['shortBreak', 5],
      ['focus', 25],
    ]);
    expect(session.isRunning(s)).toBe(true);
  });

  it('falls back to one standard block without estimate or when it is used up', () => {
    expect(session.startSession(task(), T0).blocks).toEqual([{ kind: 'focus', minutes: 25 }]);
    expect(session.startSession(task(30, 40), T0).blocks).toEqual([{ kind: 'focus', minutes: 25 }]);
  });
});

describe('timing', () => {
  it('reports progress and remaining time of the running block', () => {
    const s = session.startSession(task(25), T0);
    expect(session.remainingMs(s, T0 + 5 * MINUTE)).toBe(20 * MINUTE);
    expect(session.blockProgress(s, T0 + 5 * MINUTE)).toBeCloseTo(0.2);
  });

  it('freezes on pause and logs the focus stretch', () => {
    const s = session.startSession(task(25), T0);
    const step = session.pause(s, T0 + 10 * MINUTE);
    expect(step.logs).toEqual([{ start: T0, end: T0 + 10 * MINUTE, kind: 'focus' }]);
    const paused = step.session!;
    expect(session.isRunning(paused)).toBe(false);
    expect(session.remainingMs(paused, T0 + 60 * MINUTE)).toBe(15 * MINUTE);
    const resumed = session.resume(paused, T0 + 20 * MINUTE);
    expect(session.remainingMs(resumed, T0 + 25 * MINUTE)).toBe(10 * MINUTE);
  });

  it('does not log accidental stretches shorter than 30 s', () => {
    const s = session.startSession(task(25), T0);
    expect(session.stop(s, T0 + 10_000).logs).toEqual([]);
  });
});

describe('advance', () => {
  it('moves from focus to break at once and logs the block up to its exact end', () => {
    const s = session.startSession(task(50), T0);
    const step = session.advance(s, T0 + 26 * MINUTE);
    expect(step.signals).toEqual(['focus-done']);
    expect(step.logs).toEqual([{ start: T0, end: T0 + 25 * MINUTE, kind: 'focus' }]);
    expect(session.isBreak(step.session!)).toBe(true);
    expect(session.remainingMs(step.session!, T0 + 26 * MINUTE)).toBe(4 * MINUTE);
  });

  it('waits for the user after a break', () => {
    const s = session.startSession(task(50), T0);
    const step = session.advance(s, T0 + 40 * MINUTE);
    expect(step.signals).toEqual(['focus-done', 'break-done']);
    expect(session.isRunning(step.session!)).toBe(false);
    expect(phaseOf(step.session!)).toBe('ready');
  });

  it('ends the session after the last block', () => {
    const s = session.startSession(task(25), T0);
    const step = session.advance(s, T0 + 30 * MINUTE);
    expect(step.session).toBeNull();
    expect(step.signals).toEqual(['focus-done', 'session-done']);
  });

  it('does nothing while the block is running', () => {
    const s = session.startSession(task(25), T0);
    expect(session.advance(s, T0 + MINUTE)).toEqual({ session: s, logs: [], signals: [] });
  });
});

describe('skipBreak and extend', () => {
  it('starts the next focus block now', () => {
    const onBreak = session.advance(session.startSession(task(50), T0), T0 + 26 * MINUTE).session!;
    const next = session.skipBreak(onBreak, T0 + 27 * MINUTE);
    expect(session.isBreak(next)).toBe(false);
    expect(session.isRunning(next)).toBe(true);
    expect(session.focusCount(next)).toEqual({ current: 2, total: 2 });
  });

  it('adds minutes to the current focus block only', () => {
    const s = session.extend(session.startSession(task(25), T0), 5);
    expect(session.blockMs(s)).toBe(30 * MINUTE);
    expect(session.extend(s, -3)).toBe(s);
  });
});

describe('focusDisplay', () => {
  it('derives the player model', () => {
    const s = session.startSession(task(50), T0);
    const d = focusDisplay(s, task(50), T0 + 60_000, 'Focus');
    expect(d).toMatchObject({
      phase: 'focus',
      title: 'Write',
      icon: '✏️',
      remainingSec: 24 * 60,
      count: { current: 1, total: 2 },
      next: { kind: 'shortBreak', minutes: 5 },
      running: true,
      isBreak: false,
    });
    expect(focusDisplay(s, undefined, T0, 'Focus').title).toBe('Focus');
  });

  it('distinguishes paused from ready', () => {
    const paused = session.pause(session.startSession(task(25), T0), T0 + MINUTE).session!;
    expect(phaseOf(paused)).toBe('paused');
  });
});
