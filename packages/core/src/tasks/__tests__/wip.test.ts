import { describe, expect, it } from 'vitest';
import { DAY, HOUR, fromZoned } from '../../time.ts';
import { canAddPriorityTask, isPlannedOn, wipReasonText, wipStatus } from '../wip.ts';
import { task } from './fixtures.ts';

const zone = 'Europe/Paris';
const day = fromZoned({ year: 2026, month: 11, day: 4, hour: 0, minute: 0 }, zone);
const at = (h: number) => day + h * HOUR;
const prefs = { wipLimit: 2 };

const top = (id: string, overrides = {}) =>
  task(id, { priority: 3, floatingDay: day, ...overrides });

describe('isPlannedOn', () => {
  it('uses the floating day or the slot start', () => {
    expect(isPlannedOn(task('a', { floatingDay: day }), day, day + DAY)).toBe(true);
    expect(
      isPlannedOn(task('a', { scheduled: { start: at(23.5), end: at(25) } }), day, day + DAY),
    ).toBe(true);
    expect(
      isPlannedOn(task('a', { scheduled: { start: at(-1), end: at(1) } }), day, day + DAY),
    ).toBe(false);
    expect(isPlannedOn(task('a'), day, day + DAY)).toBe(false);
  });
});

describe('wipStatus', () => {
  it('counts open priority-3 tasks planned that day, in the given zone', () => {
    const tasks = [
      top('a'),
      top('b', { floatingDay: undefined, scheduled: { start: at(22.5), end: at(23) } }),
      top('done', { status: 'done' }),
      top('tomorrow', { floatingDay: day + DAY }),
      task('low', { priority: 2, floatingDay: day }),
      top('a'),
    ];
    const s = wipStatus(tasks, at(12), prefs, zone);
    expect(s).toEqual({
      count: 2,
      limit: 2,
      enabled: true,
      atLimit: true,
      exceeded: false,
      taskIds: ['a', 'b'],
    });
    // Paris midnight is 23:00 UTC the day before: the same data splits differently in UTC.
    expect(wipStatus(tasks, at(12), prefs, 'UTC').taskIds).toEqual(['b', 'tomorrow']);
  });

  it('is disabled with a non-positive or invalid limit', () => {
    const s = wipStatus([top('a'), top('b'), top('c')], day, { wipLimit: 0 }, zone);
    expect(s).toMatchObject({ enabled: false, atLimit: false, exceeded: false, count: 3 });
    expect(wipStatus([top('a')], day, { wipLimit: Number.NaN }, zone).enabled).toBe(false);
    expect(wipStatus([top('a'), top('b'), top('c')], day, prefs, zone).exceeded).toBe(true);
  });
});

describe('canAddPriorityTask', () => {
  const tasks = [top('a'), top('b')];

  it('refuses at the limit with a cited reason', () => {
    const check = canAddPriorityTask(tasks, day, prefs, zone);
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatchObject({ code: 'wip-limit-reached', count: 2, limit: 2 });
    expect(check.reason?.citation).toContain('Cowan, N. (2001)');
  });

  it('allows below the limit and re-checks of an already counted task', () => {
    expect(canAddPriorityTask([top('a')], day, prefs, zone)).toMatchObject({ allowed: true });
    expect(canAddPriorityTask(tasks, day, prefs, zone, 'a').allowed).toBe(true);
    expect(canAddPriorityTask(tasks, day, prefs, zone, 'z').allowed).toBe(false);
  });

  it('explains the refusal in both locales', () => {
    const reason = canAddPriorityTask(tasks, day, prefs, zone).reason;
    if (!reason) throw new Error('expected a reason');
    expect(wipReasonText(reason, 'fr')).toContain('Cowan, 2001');
    expect(wipReasonText(reason, 'fr')).toContain('limite : 2');
    expect(wipReasonText(reason, 'en')).toContain('limit: 2');
  });
});
