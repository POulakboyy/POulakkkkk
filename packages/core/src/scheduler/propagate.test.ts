import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Task } from '../model.ts';
import { overlaps } from '../time.ts';
import { propagateDelay } from './propagate.ts';
import type { PropagateInput } from './types.ts';
import { UTC_PREFS, at, event, rng, task } from './fixtures.test-utils.ts';

const slot = (
  id: string,
  h1: number,
  m1: number,
  h2: number,
  m2: number,
  patch: Partial<Task> = {},
) => task(id, { scheduled: { start: at(2, h1, m1), end: at(2, h2, m2) }, ...patch });

function run(items: (Task | CalendarEvent)[], newEnd: number, extra: Partial<PropagateInput> = {}) {
  return propagateDelay({
    items,
    overrunId: 'a',
    newEnd,
    prefs: UTC_PREFS,
    timeZone: 'UTC',
    ...extra,
  });
}

describe('propagateDelay', () => {
  it('shifts later movable items by the overrun, keeping their gaps', () => {
    const r = run(
      [slot('a', 9, 0, 10, 0), slot('b', 10, 0, 11, 0), slot('c', 11, 30, 12, 0)],
      at(2, 10, 30),
    );
    expect(r.moves).toEqual([
      { id: 'a', kind: 'task', start: at(2, 9), end: at(2, 10, 30) },
      { id: 'b', kind: 'task', start: at(2, 10, 30), end: at(2, 11, 30) },
      { id: 'c', kind: 'task', start: at(2, 12), end: at(2, 12, 30) },
    ]);
    expect(r.overflow).toEqual([]);
  });

  it('push mode lets free time absorb the delay', () => {
    const r = run(
      [slot('a', 9, 0, 10, 0), slot('b', 10, 0, 11, 0), slot('c', 11, 30, 12, 0)],
      at(2, 10, 30),
      {
        mode: 'push',
      },
    );
    expect(r.moves.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('never moves fixed events or pinned tasks; colliding items jump after them', () => {
    const items = [
      slot('a', 9, 0, 10, 0),
      slot('b', 10, 0, 11, 0),
      event('fixed', at(2, 11), at(2, 12)),
      slot('pinned', 12, 0, 12, 30, { pinned: true }),
      event('soft', at(2, 13), at(2, 13, 30), { fixed: false }),
    ];
    const r = run(items, at(2, 10, 30));
    expect(r.moves).toEqual([
      { id: 'a', kind: 'task', start: at(2, 9), end: at(2, 10, 30) },
      { id: 'b', kind: 'task', start: at(2, 12, 30), end: at(2, 13, 30) },
      { id: 'soft', kind: 'event', start: at(2, 13, 30), end: at(2, 14) },
    ]);
  });

  it('reports fixed items the overrun itself now overlaps', () => {
    const r = run([slot('a', 9, 0, 10, 0), event('fixed', at(2, 10), at(2, 11))], at(2, 10, 15));
    expect(r.conflicts).toEqual(['fixed']);
  });

  it('reports items pushed past the end of working hours', () => {
    const r = run([slot('a', 16, 0, 17, 0), slot('b', 17, 0, 17, 45)], at(2, 17, 30));
    expect(r.overflow).toEqual(['b']);
  });

  it('does nothing for an unknown item or an end before the start', () => {
    const items = [slot('a', 9, 0, 10, 0)];
    expect(run(items, at(2, 8)).moves).toEqual([]);
    expect(run(items, at(2, 11), { overrunId: 'zzz' }).moves).toEqual([]);
  });

  it('does not pull items earlier when the item ends early', () => {
    const r = run([slot('a', 9, 0, 10, 0), slot('b', 10, 0, 11, 0)], at(2, 9, 30));
    expect(r.moves).toEqual([{ id: 'a', kind: 'task', start: at(2, 9), end: at(2, 9, 30) }]);
  });

  it('leaves items of other days and done tasks alone', () => {
    const tomorrow = task('t', { scheduled: { start: at(3, 9), end: at(3, 10) } });
    const done = slot('d', 10, 0, 11, 0, { status: 'done' });
    const r = run([slot('a', 9, 0, 10, 0), tomorrow, done], at(2, 10, 30));
    expect(r.moves.map((m) => m.id)).toEqual(['a']);
  });

  it.each(Array.from({ length: 40 }, (_, i) => i + 1))(
    'seed %i: moved items overlap neither fixed items nor each other',
    (seed) => {
      const rand = rng(seed);
      const items: (Task | CalendarEvent)[] = [slot('a', 9, 0, 10, 0)];
      for (let i = 0; i < 10; i++) {
        const start = at(2, 10 + Math.floor(rand() * 7), Math.floor(rand() * 4) * 15);
        const end = start + (1 + Math.floor(rand() * 4)) * 15 * 60_000;
        items.push(
          rand() < 0.4
            ? event(`e${i}`, start, end, { fixed: true })
            : task(`t${i}`, { scheduled: { start, end } }),
        );
      }
      const newEnd = at(2, 10) + Math.floor(rand() * 8) * 15 * 60_000 + 60_000;
      const mode = rand() < 0.5 ? 'shift' : 'push';
      const r = run(items, newEnd, { mode });
      const fixed = items.filter((i): i is CalendarEvent => 'fixed' in i && i.fixed);
      const moved = r.moves.filter((m) => m.id !== 'a');
      for (const m of moved) {
        expect(fixed.some((f) => overlaps(f, m))).toBe(false);
        expect(overlaps(m, { start: at(2, 9), end: newEnd })).toBe(false);
        expect(moved.filter((o) => o !== m).some((o) => overlaps(o, m))).toBe(false);
      }
      expect(run(items, newEnd, { mode })).toEqual(r);
    },
  );
});
