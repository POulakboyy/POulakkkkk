import { describe, expect, it } from 'vitest';
import { HOUR } from '../../time.ts';
import { isImportant, isUrgent, matrix, quadrant, quadrantPatch } from '../eisenhower.ts';
import { T0, ids, task } from './fixtures.ts';

describe('isUrgent / isImportant', () => {
  it('is urgent within 48 h, when overdue, or with an urgency tag', () => {
    expect(isUrgent(task('a', { deadline: T0 + 47 * HOUR }), T0)).toBe(true);
    expect(isUrgent(task('a', { deadline: T0 + 48 * HOUR }), T0)).toBe(true);
    expect(isUrgent(task('a', { deadline: T0 + 49 * HOUR }), T0)).toBe(false);
    expect(isUrgent(task('a', { deadline: T0 - HOUR }), T0)).toBe(true);
    expect(isUrgent(task('a', { tags: ['#URGENT'] }), T0)).toBe(true);
    expect(isUrgent(task('a'), T0)).toBe(false);
    expect(isUrgent(task('a', { deadline: T0 + 2 * HOUR }), T0, { urgentWithinMin: 60 })).toBe(
      false,
    );
  });

  it('infers importance from priority or tags, explicit flag wins', () => {
    expect(isImportant(task('a', { priority: 2 }))).toBe(true);
    expect(isImportant(task('a', { priority: 1 }))).toBe(false);
    expect(isImportant(task('a', { tags: ['Clé'] }))).toBe(true);
    expect(isImportant(task('a', { tags: ['cle'] }))).toBe(true);
    expect(isImportant(task('a', { priority: 3, important: false }))).toBe(false);
    expect(isImportant(task('a', { important: true }))).toBe(true);
    expect(isImportant(task('a', { priority: 1 }), { importantFromPriority: 1 })).toBe(true);
    expect(isImportant(task('a', { tags: ['boss'] }), { importantTags: ['boss'] })).toBe(true);
  });
});

describe('quadrant / matrix', () => {
  const doIt = task('do', { priority: 3, deadline: T0 + HOUR });
  const schedule = task('schedule', { priority: 2 });
  const delegate = task('delegate', { tags: ['asap'] });
  const eliminate = task('eliminate');

  it('maps urgency × importance', () => {
    expect(quadrant(doIt, T0)).toBe('do');
    expect(quadrant(schedule, T0)).toBe('schedule');
    expect(quadrant(delegate, T0)).toBe('delegate');
    expect(quadrant(eliminate, T0)).toBe('eliminate');
  });

  it('sorts by deadline, then priority, then input order, skipping closed tasks', () => {
    const m = matrix(
      [
        task('s1', { priority: 2 }),
        task('s2', { priority: 3 }),
        task('s3', { priority: 2, deadline: T0 + 100 * HOUR }),
        task('s4', { priority: 2 }),
        task('closed', { priority: 3, status: 'done' }),
        eliminate,
      ],
      T0,
    );
    expect(ids(m.schedule)).toEqual(['s3', 's2', 's1', 's4']);
    expect(ids(m.eliminate)).toEqual(['eliminate']);
    expect(m.do).toEqual([]);
  });
});

describe('quadrantPatch', () => {
  it('adds importance and urgency when dragging into "do"', () => {
    expect(quadrantPatch(task('a', { tags: ['x'] }), 'do', T0)).toEqual({
      ok: true,
      patch: { important: true, tags: ['x', 'urgent'] },
    });
  });

  it('removes urgency tags and importance when dragging into "eliminate"', () => {
    const t = task('a', { priority: 3, tags: ['Urgent', 'work'] });
    expect(quadrantPatch(t, 'eliminate', T0)).toEqual({
      ok: true,
      patch: { important: false, tags: ['work'] },
    });
  });

  it('refuses to remove urgency coming from a close deadline', () => {
    expect(quadrantPatch(task('a', { deadline: T0 + HOUR }), 'schedule', T0)).toEqual({
      ok: false,
      reason: 'deadline-too-close',
    });
  });

  it('is an empty patch when already there, and the result lands in the target', () => {
    const t = task('a', { priority: 2 });
    expect(quadrantPatch(t, 'schedule', T0)).toEqual({ ok: true, patch: {} });
    const moved = quadrantPatch(t, 'delegate', T0);
    if (!moved.ok) throw new Error('expected ok');
    expect(quadrant({ ...t, ...moved.patch }, T0)).toBe('delegate');
  });
});
