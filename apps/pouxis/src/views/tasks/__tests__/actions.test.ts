import { describe, expect, it } from 'vitest';
import { store } from '../../../store/index.ts';
import { completeTask, deleteTask, planPatch, restore, restorePatch } from '../actions.ts';
import { NOW, task } from './fixtures.ts';

const t = (key: string) => key;
const base = {
  tags: [],
  dependsOn: [],
  timeLogs: [],
  postponedCount: 0,
  mode: 'organize' as const,
};

describe('restorePatch', () => {
  it('clears optional keys the snapshot did not have', () => {
    const snap = task({ title: 'Snap' });
    const patch = restorePatch(snap);
    expect(patch.title).toBe('Snap');
    expect('deadline' in patch && patch.deadline === undefined).toBe(true);
    expect('id' in patch).toBe(false);
  });
});

describe('store actions with undo', () => {
  it('deletes a task with its subtasks and restores them all', () => {
    const parent = store.create('tasks', { ...base, title: 'Parent', status: 'todo', priority: 0 });
    const child = store.create('tasks', {
      ...base,
      title: 'Child',
      status: 'todo',
      priority: 0,
      parentId: parent.id,
    });
    deleteTask(parent, t as never);
    expect(store.get('tasks', parent.id)).toBeUndefined();
    expect(store.get('tasks', child.id)).toBeUndefined();
    restore([parent, child]);
    expect(store.get('tasks', parent.id)?.title).toBe('Parent');
    expect(store.get('tasks', child.id)?.parentId).toBe(parent.id);
  });

  it('completes a task and undoes it exactly', () => {
    const tk = store.create('tasks', { ...base, title: 'Finish', status: 'doing', priority: 1 });
    completeTask(tk, t as never, NOW);
    expect(store.get('tasks', tk.id)).toMatchObject({ status: 'done', completedAt: NOW });
    restore([tk]);
    expect(store.get('tasks', tk.id)?.status).toBe('doing');
    expect(store.get('tasks', tk.id)?.completedAt).toBeUndefined();
  });
});

describe('planPatch', () => {
  it('moves an inbox task to todo when planned', () => {
    const p = planPatch(task({ status: 'inbox' }), NOW);
    expect(p).toMatchObject({ status: 'todo', floatingDay: NOW });
  });
});
