import { describe, expect, it } from 'vitest';
import { HOUR } from '../../time.ts';
import { NONE_KEY, hierarchyBoard, moveCardPatch, subtaskProgress, toBoard } from '../kanban.ts';
import type { Board } from '../kanban.ts';
import { T0, ids, task } from './fixtures.ts';

const shape = (board: Board) => board.columns.map((c) => [c.key, ids(c.tasks)]);

describe('toBoard', () => {
  const tasks = [
    task('a', {
      status: 'doing',
      priority: 3,
      tags: ['Zeta', 'alpha'],
      projectId: 'p2',
      mode: 'create',
    }),
    task('b', { status: 'todo', tags: ['Élan'], projectId: 'p1' }),
    task('c', { status: 'archived', tags: ['alpha'] }),
    task('d', { status: 'done', priority: 1 }),
  ];

  it('groups by status with every column in a stable order', () => {
    expect(shape(toBoard(tasks, 'status'))).toEqual([
      ['inbox', []],
      ['todo', ['b']],
      ['doing', ['a']],
      ['done', ['d']],
    ]);
    expect(toBoard(tasks, 'status', { includeArchived: true }).columns.at(-1)).toMatchObject({
      key: 'archived',
    });
  });

  it('groups by priority and mode', () => {
    expect(shape(toBoard(tasks, 'priority'))).toEqual([
      ['3', ['a']],
      ['2', []],
      ['1', ['d']],
      ['0', ['b']],
    ]);
    expect(shape(toBoard(tasks, 'mode'))).toEqual([
      ['create', ['a']],
      ['organize', ['b', 'd']],
    ]);
  });

  it('groups by tag alphabetically (accent-insensitive), multi-tag cards in each column', () => {
    expect(shape(toBoard(tasks, 'tag'))).toEqual([
      ['alpha', ['a']],
      ['Élan', ['b']],
      ['Zeta', ['a']],
      [NONE_KEY, ['d']],
    ]);
  });

  it('follows columnOrder for projects and shows listed empty columns', () => {
    expect(shape(toBoard(tasks, 'project', { columnOrder: ['p0', 'p1'] }))).toEqual([
      ['p0', []],
      ['p1', ['b']],
      ['p2', ['a']],
      [NONE_KEY, ['d']],
    ]);
  });

  it('groups by quadrant and requires now', () => {
    const board = toBoard([task('u', { priority: 3, deadline: T0 + HOUR })], 'quadrant', {
      now: T0,
    });
    expect(shape(board)).toEqual([
      ['do', ['u']],
      ['schedule', []],
      ['delegate', []],
      ['eliminate', []],
    ]);
    expect(() => toBoard(tasks, 'quadrant')).toThrow(RangeError);
  });
});

describe('hierarchyBoard / subtaskProgress', () => {
  const tasks = [
    task('goal'),
    task('s1', { parentId: 'goal' }),
    task('s2', { parentId: 'goal' }),
    task('x1', { parentId: 's1', status: 'done' }),
    task('x2', { parentId: 's1' }),
    task('x3', { parentId: 's1', status: 'archived' }),
    task('orphan', { parentId: 'deleted' }),
  ];

  it('makes top-level tasks (and orphans) the columns by default', () => {
    expect(shape(hierarchyBoard(tasks))).toEqual([
      ['goal', ['s1', 's2']],
      ['orphan', []],
    ]);
  });

  it('drills down into a root', () => {
    const board = hierarchyBoard(tasks, 'goal');
    expect(board.groupBy).toBe('parent');
    expect(shape(board)).toEqual([
      ['s1', ['x1', 'x2']],
      ['s2', []],
    ]);
    expect(board.columns[0]?.parent?.id).toBe('s1');
  });

  it('counts direct subtasks, ignoring archived ones', () => {
    expect(subtaskProgress('s1', tasks)).toEqual({ done: 1, total: 2 });
    expect(subtaskProgress('none', tasks)).toEqual({ done: 0, total: 0 });
  });
});

describe('moveCardPatch', () => {
  it('moves across statuses, stamping and clearing completedAt', () => {
    expect(moveCardPatch(task('a'), 'done', 'status', { now: T0 })).toEqual({
      ok: true,
      patch: { status: 'done', completedAt: T0 },
    });
    expect(moveCardPatch(task('a', { status: 'done', completedAt: T0 }), 'todo', 'status')).toEqual(
      {
        ok: true,
        patch: { status: 'todo', completedAt: undefined },
      },
    );
    expect(
      moveCardPatch(task('a', { status: 'done', completedAt: T0 }), 'archived', 'status'),
    ).toEqual({
      ok: true,
      patch: { status: 'archived' },
    });
    expect(moveCardPatch(task('a'), 'todo', 'status')).toEqual({ ok: true, patch: {} });
    expect(moveCardPatch(task('a'), 'nope', 'status')).toEqual({
      ok: false,
      reason: 'unknown-column',
    });
    expect(() => moveCardPatch(task('a'), 'done', 'status')).toThrow(RangeError);
  });

  it('moves across priorities, modes and projects', () => {
    expect(moveCardPatch(task('a'), '3', 'priority')).toEqual({ ok: true, patch: { priority: 3 } });
    expect(moveCardPatch(task('a'), '9', 'priority')).toMatchObject({ ok: false });
    expect(moveCardPatch(task('a'), 'create', 'mode')).toEqual({
      ok: true,
      patch: { mode: 'create' },
    });
    expect(moveCardPatch(task('a'), 'x', 'mode')).toMatchObject({ ok: false });
    expect(moveCardPatch(task('a'), 'p1', 'project')).toEqual({
      ok: true,
      patch: { projectId: 'p1' },
    });
    expect(moveCardPatch(task('a', { projectId: 'p1' }), NONE_KEY, 'project')).toEqual({
      ok: true,
      patch: { projectId: undefined },
    });
  });

  it('replaces the source tag when moving across tag columns', () => {
    const t = task('a', { tags: ['x', 'y'] });
    expect(moveCardPatch(t, 'z', 'tag', { fromColumn: 'x' })).toEqual({
      ok: true,
      patch: { tags: ['y', 'z'] },
    });
    expect(moveCardPatch(t, 'y', 'tag', { fromColumn: 'x' })).toEqual({
      ok: true,
      patch: { tags: ['y'] },
    });
    expect(moveCardPatch(t, 'x', 'tag', { fromColumn: 'x' })).toEqual({ ok: true, patch: {} });
    expect(moveCardPatch(t, NONE_KEY, 'tag')).toEqual({ ok: true, patch: { tags: [] } });
    expect(moveCardPatch(task('b'), 'new', 'tag', { fromColumn: NONE_KEY })).toEqual({
      ok: true,
      patch: { tags: ['new'] },
    });
  });

  it('delegates quadrant moves to the Eisenhower rules', () => {
    expect(moveCardPatch(task('a'), 'schedule', 'quadrant', { now: T0 })).toEqual({
      ok: true,
      patch: { important: true },
    });
    expect(moveCardPatch(task('a'), 'bogus', 'quadrant', { now: T0 })).toMatchObject({ ok: false });
  });

  it('reparents but refuses hierarchy cycles', () => {
    const tasks = [task('a'), task('b', { parentId: 'a' }), task('c', { parentId: 'b' })];
    expect(moveCardPatch(tasks[2]!, 'a', 'parent', { tasks })).toEqual({
      ok: true,
      patch: { parentId: 'a' },
    });
    expect(moveCardPatch(tasks[1]!, NONE_KEY, 'parent', { tasks })).toEqual({
      ok: true,
      patch: { parentId: undefined },
    });
    expect(moveCardPatch(tasks[0]!, 'c', 'parent', { tasks })).toEqual({
      ok: false,
      reason: 'hierarchy-cycle',
    });
    expect(moveCardPatch(tasks[0]!, 'a', 'parent', { tasks })).toEqual({
      ok: false,
      reason: 'hierarchy-cycle',
    });
  });
});
