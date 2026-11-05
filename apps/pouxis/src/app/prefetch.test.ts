import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@pouxis/core';
import { prefetch, prefetchWhenIdle, shouldSaveData, type IdleScheduler } from './prefetch.ts';
import { doingMode } from './theme.ts';

/** Idle scheduler driven by the test: `flush()` runs the pending callback. */
function manualScheduler() {
  const queue = new Map<number, () => void>();
  let id = 0;
  const scheduler: IdleScheduler = {
    request: (cb) => (queue.set(++id, cb), id),
    cancel: (h) => void queue.delete(h),
  };
  const flush = async () => {
    const [first] = queue;
    if (!first) return false;
    queue.delete(first[0]);
    first[1]();
    await new Promise((r) => setTimeout(r, 0));
    return true;
  };
  return { scheduler, flush, pending: () => queue.size };
}

describe('prefetch', () => {
  it('runs a loader once and retries it after a failure', async () => {
    const ok = vi.fn(async () => 'chunk');
    await Promise.all([prefetch(ok), prefetch(ok)]);
    expect(ok).toHaveBeenCalledTimes(1);

    const flaky = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('chunk');
    await expect(prefetch(flaky)).resolves.toBeUndefined();
    await prefetch(flaky);
    expect(flaky).toHaveBeenCalledTimes(2);
  });

  it('loads one chunk per idle period, in order, and stops on demand', async () => {
    const { scheduler, flush, pending } = manualScheduler();
    const calls: string[] = [];
    const loader = (name: string) => async () => void calls.push(name);
    const stop = prefetchWhenIdle([loader('a'), loader('b'), loader('c')], scheduler);

    await flush();
    expect(calls).toEqual(['a']);
    await flush();
    expect(calls).toEqual(['a', 'b']);
    stop();
    expect(pending()).toBe(0);
    expect(await flush()).toBe(false);
    expect(calls).toEqual(['a', 'b']);
  });

  it('respects data saver and slow connections', () => {
    expect(shouldSaveData({ connection: { saveData: true } })).toBe(true);
    expect(shouldSaveData({ connection: { effectiveType: 'slow-2g' } })).toBe(true);
    expect(shouldSaveData({ connection: { effectiveType: '4g' } })).toBe(false);
    expect(shouldSaveData({})).toBe(false);
    expect(shouldSaveData(undefined)).toBe(false);
  });
});

describe('doingMode', () => {
  const task = (status: Task['status'], mode: Task['mode']) => ({ status, mode }) as Task;

  it('returns the mode of the running task, memoised on the array', () => {
    const tasks = [task('todo', 'organize'), task('doing', 'create')];
    expect(doingMode(tasks)).toBe('create');
    expect(doingMode([task('todo', 'create')])).toBeUndefined();
    const spy = vi.spyOn(tasks, 'find');
    expect(doingMode(tasks)).toBe('create');
    expect(doingMode(tasks)).toBe('create');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
