import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startOfDay } from '@pouxis/core';
import { toast } from '../../ui/index.ts';
import { completeTask, reopenTask } from './complete.ts';
import { pickFocusTask } from './pick.ts';
import { createFakeStore, taskFixture } from './testing.ts';

vi.mock('../../app/router.ts', () => ({ navigate: vi.fn() }));
vi.mock('../../ui/index.ts', () => ({ toast: vi.fn() }));

const NOW = Date.UTC(2026, 10, 5, 10, 0);
const TZ = 'Europe/Paris';

beforeEach(() => vi.mocked(toast).mockClear());

describe('completeTask', () => {
  it('saves the status and announces the task it unlocks (2.1)', () => {
    const store = createFakeStore();
    const a = store.create('tasks', taskFixture({ title: 'Brief' }));
    const b = store.create('tasks', taskFixture({ title: 'Design', dependsOn: [a.id] }));
    const unlocked = completeTask(store, a.id, NOW);
    expect(store.get('tasks', a.id)).toMatchObject({ status: 'done', completedAt: NOW });
    expect(unlocked.map((t) => t.id)).toEqual([b.id]);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/Design.*peut commencer/),
        tone: 'success',
      }),
    );
  });

  it('offers to put an unlocked task on today and does it', () => {
    const store = createFakeStore();
    const a = store.create('tasks', taskFixture({ title: 'Brief' }));
    const b = store.create('tasks', taskFixture({ title: 'Design', dependsOn: [a.id] }));
    completeTask(store, a.id, NOW);
    const action = vi.mocked(toast).mock.calls[0]?.[0].action;
    expect(action?.label).toBe('L’ajouter à aujourd’hui');
    action?.onClick();
    expect(store.get('tasks', b.id)?.floatingDay).toBe(startOfDay(NOW, TZ));
  });

  it('is a no-op on a done task and reopens it on demand', () => {
    const store = createFakeStore();
    const a = store.create(
      'tasks',
      taskFixture({ title: 'Brief', status: 'done', completedAt: 1 }),
    );
    expect(completeTask(store, a.id, NOW)).toEqual([]);
    reopenTask(store, a.id);
    expect(store.get('tasks', a.id)?.status).toBe('todo');
    expect(store.get('tasks', a.id)?.completedAt).toBeUndefined();
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('pickFocusTask', () => {
  const at = (h: number) => NOW + (h - 11) * 3_600_000; // NOW is 11:00 in Paris

  it('prefers the running slot, then work in progress, then the next slot, then floating', () => {
    const store = createFakeStore();
    const floating = store.create(
      'tasks',
      taskFixture({ title: 'Float', floatingDay: startOfDay(NOW, TZ), priority: 3 }),
    );
    expect(pickFocusTask(store.all('tasks'), NOW, TZ)?.id).toBe(floating.id);
    const next = store.create(
      'tasks',
      taskFixture({ title: 'Next', scheduled: { start: at(14), end: at(15) } }),
    );
    expect(pickFocusTask(store.all('tasks'), NOW, TZ)?.id).toBe(next.id);
    const doing = store.create('tasks', taskFixture({ title: 'Doing', status: 'doing' }));
    expect(pickFocusTask(store.all('tasks'), NOW, TZ)?.id).toBe(doing.id);
    const running = store.create(
      'tasks',
      taskFixture({ title: 'Now', scheduled: { start: at(10), end: at(12) } }),
    );
    expect(pickFocusTask(store.all('tasks'), NOW, TZ)?.id).toBe(running.id);
  });

  it('skips blocked and finished tasks', () => {
    const store = createFakeStore();
    const blocker = store.create('tasks', taskFixture({ title: 'Blocker' }));
    store.create(
      'tasks',
      taskFixture({ title: 'Blocked', status: 'doing', dependsOn: [blocker.id] }),
    );
    store.create('tasks', taskFixture({ title: 'Done', status: 'done' }));
    expect(pickFocusTask(store.all('tasks'), NOW, TZ)).toBeUndefined();
  });
});
