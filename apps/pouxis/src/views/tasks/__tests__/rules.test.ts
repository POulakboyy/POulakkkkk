import { startOfDay } from '@pouxis/core';
import { describe, expect, it } from 'vitest';
import {
  addDependency,
  deadlineFromDateInput,
  dependencyOptions,
  fromDateInput,
  linkedTasks,
  quadrantReasons,
  resolveWip,
  toDateInput,
  wipConflict,
} from '../rules.ts';
import { DAY, NOW, TZ, task } from './fixtures.ts';

const today = startOfDay(NOW, TZ);
const prefs = { wipLimit: 2, timeZone: TZ };

describe('wipConflict', () => {
  const planned = [
    task({ priority: 3, floatingDay: today }),
    task({ priority: 3, floatingDay: today }),
  ];

  it('flags one high priority too many on the same day', () => {
    const c = wipConflict(planned, task({ priority: 3, floatingDay: today }), prefs);
    expect(c).toMatchObject({ day: today, count: 2, limit: 2 });
    expect(c!.others.map((t) => t.id)).toEqual(planned.map((t) => t.id));
  });

  it('ignores other days, lower priorities and the task itself', () => {
    expect(wipConflict(planned, task({ priority: 3, floatingDay: today + DAY }), prefs)).toBeNull();
    expect(wipConflict(planned, task({ priority: 2, floatingDay: today }), prefs)).toBeNull();
    expect(wipConflict(planned, planned[0]!, prefs)).toBeNull();
    expect(wipConflict(planned, task({ priority: 3 }), prefs)).toBeNull();
  });
});

describe('resolveWip', () => {
  const conflict = { day: today };
  it('maps each choice to the extra changes', () => {
    const other = task();
    expect(resolveWip({ kind: 'swap', other }, conflict, TZ)).toEqual({
      override: {},
      demote: other,
    });
    expect(resolveWip({ kind: 'tomorrow' }, conflict, TZ)).toEqual({
      override: { floatingDay: today + DAY, scheduled: undefined },
    });
    expect(resolveWip({ kind: 'lower' }, conflict, TZ)).toEqual({ override: { priority: 2 } });
    expect(resolveWip({ kind: 'cancel' }, conflict, TZ)).toBeNull();
  });
});

describe('dependencies', () => {
  const a = task({ title: 'A' });
  const b = task({ title: 'B', dependsOn: [a.id] });
  const c = task({ title: 'C', dependsOn: [b.id] });
  const all = [a, b, c];

  it('refuses links that would close a loop', () => {
    expect(addDependency(a, c.id, all)).toEqual({ ok: false, reason: 'cycle' });
    expect(addDependency(a, a.id, all)).toEqual({ ok: false, reason: 'self' });
    expect(addDependency(b, a.id, all)).toEqual({ ok: false, reason: 'duplicate' });
    expect(addDependency(a, 'missing', all)).toEqual({ ok: false, reason: 'missing' });
  });

  it('accepts a new link', () => {
    const d = task({ title: 'D' });
    expect(addDependency(c, d.id, [...all, d])).toEqual({ ok: true, dependsOn: [b.id, d.id] });
  });

  it('lists candidates with loops marked and last', () => {
    const options = dependencyOptions(a, all);
    expect(options.map((o) => [o.task.title, o.cycle])).toEqual([
      ['B', true],
      ['C', true],
    ]);
  });

  it('keeps only linked tasks, in dependency order', () => {
    const lone = task({ title: 'lone' });
    expect(linkedTasks([c, lone, b, a]).map((t) => t.title)).toEqual(['A', 'B', 'C']);
  });
});

describe('quadrantReasons', () => {
  it('explains the placement, most decisive first', () => {
    const t = task({ important: true, deadline: NOW + DAY, tags: ['urgent'] });
    expect(quadrantReasons(t, NOW).map((r) => r.kind)).toEqual(['manual', 'deadline', 'tag']);
    expect(quadrantReasons(task({ priority: 3 }), NOW)).toEqual([{ kind: 'priority' }]);
    expect(quadrantReasons(task({ deadline: NOW + 10 * DAY }), NOW)).toEqual([]);
  });
});

describe('date inputs', () => {
  it('round-trips a day in the user zone', () => {
    expect(toDateInput(today, TZ)).toBe('2026-11-05');
    expect(fromDateInput('2026-11-05', TZ)).toBe(today);
    expect(toDateInput(undefined, TZ)).toBe('');
    expect(fromDateInput('', TZ)).toBeUndefined();
    expect(fromDateInput('2026-13-01', TZ)).toBeUndefined();
  });

  it('reads a deadline as the end of that day', () => {
    expect(deadlineFromDateInput('2026-11-05', TZ)).toBe(today + DAY - 60_000);
  });
});
