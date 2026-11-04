import { describe, expect, it } from 'vitest';
import {
  actionable,
  blockers,
  detectCycles,
  isActionable,
  topoOrder,
  unlockedBy,
  wouldCreateCycle,
} from '../dependencies.ts';
import { indexById } from '../common.ts';
import { ids, task } from './fixtures.ts';

describe('blockers / isActionable / actionable', () => {
  const a = task('a');
  const b = task('b', { dependsOn: ['a'] });
  const c = task('c', { dependsOn: ['a', 'b', 'a'] });
  const all = [a, b, c];

  it('lists open dependencies once, in declaration order', () => {
    expect(ids(blockers(c, indexById(all)))).toEqual(['a', 'b']);
  });

  it('treats done, archived and missing dependencies as resolved', () => {
    const lookup = indexById([task('x', { status: 'done' }), task('y', { status: 'archived' })]);
    const t = task('t', { dependsOn: ['x', 'y', 'ghost'] });
    expect(blockers(t, lookup)).toEqual([]);
    expect(isActionable(t, lookup)).toBe(true);
  });

  it('never marks closed tasks actionable', () => {
    expect(isActionable(task('d', { status: 'done' }), indexById([]))).toBe(false);
  });

  it('keeps open unblocked tasks in input order', () => {
    expect(ids(actionable(all))).toEqual(['a']);
    expect(ids(actionable([{ ...a, status: 'done' }, b, c]))).toEqual(['b']);
  });
});

describe('unlockedBy', () => {
  it('returns tasks whose only remaining blocker is the completed one', () => {
    const tasks = [
      task('a'),
      task('z'),
      task('b', { dependsOn: ['a'] }),
      task('c', { dependsOn: ['a', 'z'] }),
      task('d', { dependsOn: ['a'], status: 'done' }),
    ];
    expect(ids(unlockedBy('a', tasks))).toEqual(['b']);
  });

  it('works after the status change was saved', () => {
    const tasks = [task('a', { status: 'done' }), task('b', { dependsOn: ['a'] })];
    expect(ids(unlockedBy('a', tasks))).toEqual(['b']);
  });

  it('is empty for an unknown id', () => {
    expect(unlockedBy('nope', [task('b', { dependsOn: ['nope'] })])).toEqual([]);
  });
});

describe('topoOrder', () => {
  it('puts dependencies first and keeps independent tasks in input order', () => {
    const tasks = [
      task('c', { dependsOn: ['b'] }),
      task('x'),
      task('b', { dependsOn: ['a'] }),
      task('a'),
    ];
    const order = ids(topoOrder(tasks));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
    expect(order).toEqual(['a', 'b', 'c', 'x']);
  });

  it('returns each task once on cyclic data and ignores dangling ids', () => {
    const tasks = [task('a', { dependsOn: ['b'] }), task('b', { dependsOn: ['a', 'ghost'] })];
    expect(ids(topoOrder(tasks)).sort()).toEqual(['a', 'b']);
  });

  it('handles very long chains without overflowing the stack', () => {
    const n = 20_000;
    const tasks = Array.from({ length: n }, (_, i) =>
      task(`t${i}`, { dependsOn: i === 0 ? [] : [`t${i - 1}`] }),
    ).reverse();
    const order = topoOrder(tasks);
    expect(order[0]?.id).toBe('t0');
    expect(order[n - 1]?.id).toBe(`t${n - 1}`);
  });
});

describe('detectCycles', () => {
  it('is empty for a DAG', () => {
    expect(detectCycles([task('a'), task('b', { dependsOn: ['a'] })])).toEqual([]);
  });

  it('reports each strongly connected component in input order', () => {
    const tasks = [
      task('x', { dependsOn: ['x'] }),
      task('a', { dependsOn: ['c'] }),
      task('b', { dependsOn: ['a'] }),
      task('c', { dependsOn: ['b'] }),
      task('free', { dependsOn: ['a'] }),
      task('p', { dependsOn: ['q'] }),
      task('q', { dependsOn: ['p'] }),
    ];
    expect(detectCycles(tasks)).toEqual([['x'], ['a', 'b', 'c'], ['p', 'q']]);
  });

  it('handles a long cycle iteratively', () => {
    const n = 10_000;
    const tasks = Array.from({ length: n }, (_, i) =>
      task(`t${i}`, { dependsOn: [`t${(i + 1) % n}`] }),
    );
    const cycles = detectCycles(tasks);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toHaveLength(n);
  });
});

describe('wouldCreateCycle', () => {
  const tasks = [task('a'), task('b', { dependsOn: ['a'] }), task('c', { dependsOn: ['b'] })];

  it('refuses self-dependency and transitive back edges', () => {
    expect(wouldCreateCycle(tasks, 'a', 'a')).toBe(true);
    expect(wouldCreateCycle(tasks, 'a', 'c')).toBe(true);
    expect(wouldCreateCycle(tasks, 'a', 'b')).toBe(true);
  });

  it('allows forward and unrelated links', () => {
    expect(wouldCreateCycle(tasks, 'c', 'a')).toBe(false);
    expect(wouldCreateCycle([...tasks, task('d')], 'd', 'c')).toBe(false);
    expect(wouldCreateCycle(tasks, 'a', 'ghost')).toBe(false);
  });
});
