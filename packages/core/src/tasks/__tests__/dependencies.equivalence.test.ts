import { describe, expect, it } from 'vitest';
import type { Task, TaskStatus } from '../../model.ts';
import * as fast from '../dependencies.ts';
import * as reference from './dependencies.reference.ts';
import { ids, task } from './fixtures.ts';

/** Mulberry32, so failures are reproducible from the seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STATUSES: TaskStatus[] = ['inbox', 'todo', 'doing', 'done', 'archived'];

/** Random graphs with cycles, self-loops, duplicate ids, duplicate and dangling deps. */
function randomTasks(seed: number, n: number): Task[] {
  const rand = rng(seed);
  const list: Task[] = [];
  for (let i = 0; i < n; i++) {
    const deps = Array.from({ length: Math.floor(rand() * 4) }, () =>
      rand() < 0.1 ? `ghost${i}` : `t${Math.floor(rand() * n)}`,
    );
    const id = rand() < 0.05 ? `t${Math.floor(rand() * n)}` : `t${i}`;
    list.push(
      task(id, { dependsOn: deps, status: STATUSES[Math.floor(rand() * 5)] as TaskStatus }),
    );
  }
  return list;
}

describe('index-based dependency algorithms match the reference implementation', () => {
  for (let seed = 1; seed <= 40; seed++) {
    it(`agrees on random graph #${seed}`, () => {
      const list = randomTasks(seed, 5 + seed * 3);
      expect(ids(fast.topoOrder(list))).toEqual(ids(reference.topoOrder(list)));
      expect(fast.detectCycles(list)).toEqual(reference.detectCycles(list));
      expect(ids(fast.actionable(list))).toEqual(ids(reference.actionable(list)));
      for (const doneId of ['t0', 't1', `t${seed}`, 'ghost']) {
        expect(ids(fast.unlockedBy(doneId, list))).toEqual(ids(reference.unlockedBy(doneId, list)));
      }
    });
  }

  it('handles a 100k-long chain without overflowing the stack', () => {
    const chain = Array.from({ length: 100_000 }, (_, i) =>
      task(`c${i}`, { dependsOn: i === 0 ? [] : [`c${i - 1}`] }),
    ).reverse();
    expect(fast.topoOrder(chain)[0]?.id).toBe('c0');
    expect(fast.detectCycles(chain)).toEqual([]);
  });
});
