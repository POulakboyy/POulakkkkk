import { describe, expect, it } from 'vitest';
import { DAY } from '../../time.ts';
import { decay, postponePatch } from '../decay.ts';
import { T0, task } from './fixtures.ts';

const prefs = { decayThreshold: 3 };

describe('decay', () => {
  it('is fresh for a new task', () => {
    expect(decay(task('a'), prefs, T0)).toEqual({ level: 0, state: 'fresh' });
  });

  it('grows with postponements and is stale beyond the threshold', () => {
    expect(decay(task('a', { postponedCount: 1 }), prefs, T0)).toEqual({
      level: 0.25,
      state: 'fresh',
    });
    expect(decay(task('a', { postponedCount: 2 }), prefs, T0).state).toBe('aging');
    expect(decay(task('a', { postponedCount: 4 }), prefs, T0)).toEqual({
      level: 1,
      state: 'stale',
    });
    expect(decay(task('a', { postponedCount: 40 }), prefs, T0).level).toBe(1);
  });

  it('treats a threshold of 0 as "stale on the first postponement"', () => {
    expect(decay(task('a', { postponedCount: 1 }), { decayThreshold: 0 }, T0).state).toBe('stale');
    expect(decay(task('a', { postponedCount: 1 }), { decayThreshold: Number.NaN }, T0).state).toBe(
      'stale',
    );
  });

  it('ages unplanned tasks after the grace period', () => {
    const old = task('a', { createdAt: T0 - 37 * DAY });
    expect(decay(old, prefs, T0)).toEqual({ level: 0.5, state: 'aging' });
    expect(decay(task('a', { createdAt: T0 - 10 * DAY }), prefs, T0).level).toBe(0);
    expect(decay(task('a', { createdAt: T0 - 90 * DAY }), prefs, T0).state).toBe('stale');
  });

  it('respects custom age options, including a degenerate window', () => {
    const t = task('a', { createdAt: T0 - 5 * DAY });
    expect(decay(t, prefs, T0, { ageGraceDays: 0, ageStaleDays: 10 }).level).toBe(0.5);
    expect(decay(t, prefs, T0, { ageGraceDays: 5, ageStaleDays: 5 }).level).toBe(1);
    expect(decay(t, prefs, T0, { ageGraceDays: 9, ageStaleDays: 6 }).level).toBe(0);
  });

  it('ignores age while the task is planned ahead', () => {
    const created = T0 - 90 * DAY;
    expect(decay(task('a', { createdAt: created, deadline: T0 + DAY }), prefs, T0).level).toBe(0);
    expect(
      decay(task('a', { createdAt: created, scheduled: { start: T0, end: T0 + 1000 } }), prefs, T0)
        .level,
    ).toBe(0);
    expect(decay(task('a', { createdAt: created, floatingDay: T0 - 1000 }), prefs, T0).level).toBe(
      0,
    );
    expect(decay(task('a', { createdAt: created, deadline: T0 - DAY }), prefs, T0).state).toBe(
      'stale',
    );
  });

  it('never decays closed tasks', () => {
    expect(decay(task('a', { status: 'done', postponedCount: 9 }), prefs, T0).level).toBe(0);
    expect(decay(task('a', { status: 'archived', postponedCount: 9 }), prefs, T0).level).toBe(0);
  });
});

describe('postponePatch', () => {
  it('counts a move to a later day and clears the slot and pin', () => {
    const t = task('a', {
      scheduled: { start: T0, end: T0 + 1000 },
      pinned: true,
      postponedCount: 1,
    });
    const patch = postponePatch(t, T0 + DAY);
    expect(patch).toEqual({
      floatingDay: T0 + DAY,
      scheduled: undefined,
      pinned: undefined,
      postponedCount: 2,
    });
    expect(Object.hasOwn(patch, 'scheduled')).toBe(true);
  });

  it('does not count first planning nor pulling forward', () => {
    expect(postponePatch(task('a'), T0)).toEqual({ floatingDay: T0 });
    expect(postponePatch(task('a', { floatingDay: T0 + DAY }), T0)).toEqual({ floatingDay: T0 });
    expect(postponePatch(task('a', { floatingDay: T0 }), T0)).toEqual({ floatingDay: T0 });
  });
});
