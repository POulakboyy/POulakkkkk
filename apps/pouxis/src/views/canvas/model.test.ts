import { describe, expect, it } from 'vitest';
import { DAY, fromZoned, graph as g } from '@pouxis/core';
import type { GraphNode, Task } from '@pouxis/core';
import {
  DAY_WIDTH,
  applyMove,
  createMeasure,
  daysBetween,
  doneTaskIds,
  latestGraph,
  outlineRows,
  taskFromNode,
  timelineScale,
} from './model.ts';
import { parseAnnotations } from './annotations.ts';

const TZ = 'Europe/Paris';

function node(id: string, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, label: id, kind: 'idea', x: 0, y: 0, ...extra };
}

function task(id: string, status: Task['status']): Task {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    title: id,
    status,
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'create',
    postponedCount: 0,
    timeLogs: [],
  };
}

describe('timeline', () => {
  const now = fromZoned({ year: 2026, month: 11, day: 5, hour: 15 }, TZ);
  const scale = timelineScale(now, TZ);

  it('puts local midnight at x = 0 and one day every DAY_WIDTH', () => {
    expect(scale.toX(fromZoned({ year: 2026, month: 11, day: 5 }, TZ))).toBeCloseTo(0);
    expect(scale.toX(fromZoned({ year: 2026, month: 11, day: 7 }, TZ))).toBeCloseTo(2 * DAY_WIDTH);
  });

  it('turns a horizontal drop into a due date snapped to a whole day, and updates mirrored tasks', () => {
    const content = { nodes: [node('a', { refId: 'task-a' }), node('b')], edges: [] };
    const { content: next, due } = applyMove(
      content,
      new Map([['a', { x: 3.4 * DAY_WIDTH, y: 40 }]]),
      scale,
    );
    const moved = next.nodes.find((n) => n.id === 'a')!;
    expect(moved.y).toBe(40);
    expect(moved.x).toBeCloseTo(3 * DAY_WIDTH);
    expect(daysBetween(fromZoned({ year: 2026, month: 11, day: 5 }, TZ), moved.due!)).toBe(3);
    expect(due).toEqual([{ nodeId: 'a', taskId: 'task-a', due: moved.due }]);
    expect(next.nodes.find((n) => n.id === 'b')).toBe(content.nodes[1]);
  });

  it('only moves positions outside timeline mode', () => {
    const content = { nodes: [node('a')], edges: [] };
    const result = applyMove(content, new Map([['a', { x: 10, y: 20 }]]));
    expect(result.content.nodes[0]).toMatchObject({ x: 10, y: 20 });
    expect(result.content.nodes[0]?.due).toBeUndefined();
    expect(applyMove(content, new Map()).content).toBe(content);
  });
});

describe('outline rows', () => {
  it('reads the forest depth first, in reading order, with collapse and lock state', () => {
    const content = {
      nodes: [
        node('root'),
        node('second', { parentId: 'root', y: 100 }),
        node('first', { parentId: 'root', y: -100, collapsed: true }),
        node('hidden', { parentId: 'first' }),
        node('gate', { kind: 'task', y: 300 }),
        node('locked', { y: 400 }),
      ],
      edges: [{ id: 'e', from: 'gate', to: 'locked', condition: 'on-complete' as const }],
    };
    const rows = outlineRows(content, new Set());
    expect(rows.map((r) => r.id)).toEqual(['root', 'first', 'second', 'gate', 'locked']);
    expect(rows[1]).toMatchObject({
      depth: 1,
      collapsed: true,
      childCount: 1,
      index: 1,
      siblings: 2,
    });
    expect(rows.find((r) => r.id === 'locked')?.locked).toBe(true);
    const done = outlineRows(content, new Set(['gate']));
    expect(done.find((r) => r.id === 'gate')?.done).toBe(true);
    expect(done.find((r) => r.id === 'locked')?.locked).toBe(false);
  });
});

describe('tasks', () => {
  it('collects done task ids', () => {
    expect([...doneTaskIds([task('a', 'done'), task('b', 'todo')])]).toEqual(['a']);
  });

  it('creates a task record mirroring a node', () => {
    const record = taskFromNode(node('n', { label: '  Écrire  ', due: DAY, color: 3 }), true);
    expect(record).toMatchObject({
      title: '  Écrire  '.trim(),
      status: 'done',
      deadline: DAY,
      color: 3,
    });
    expect(record.completedAt).toBeTypeOf('number');
    expect(taskFromNode(node('x', { label: '' })).title).toBe('…');
  });

  it('builds a tree from tasks with conditional dependency links (4.3)', () => {
    const parent = task('p', 'todo');
    const child = { ...task('c', 'todo'), parentId: 'p' };
    const after = { ...task('d', 'todo'), dependsOn: ['c'] };
    const tree = g.tasksToGraph([parent, child, after]);
    expect(tree.edges.some((e) => e.from === 'p' && e.to === 'c')).toBe(true);
    expect(tree.edges.find((e) => e.to === 'd')?.condition).toBe('on-complete');
  });
});

describe('misc', () => {
  it('measures text without a canvas (jsdom fallback)', () => {
    const m = createMeasure('600 14px sans-serif');
    expect(m('abcd')).toBeGreaterThan(m('ab'));
  });

  it('picks the most recently edited canvas', () => {
    const a = { id: 'a', title: 'A', nodes: [], edges: [], createdAt: 0, updatedAt: 5 };
    const b = { ...a, id: 'b', updatedAt: 9 };
    expect(latestGraph([a, b])?.id).toBe('b');
    expect(latestGraph([])).toBeUndefined();
  });

  it('drops malformed stored annotations instead of crashing', () => {
    expect(parseAnnotations('{oops')).toEqual({ strokes: [], waypoints: [] });
    const raw = JSON.stringify({
      strokes: [
        { id: 's', points: [{ x: 1, y: 2, p: 0.5 }], width: 2, color: 0 },
        { id: 'bad', points: [{ x: 'nope' }], width: 2, color: 0 },
      ],
      waypoints: [{ id: 'w', rect: { x: 0, y: 0, width: 10, height: 10 } }, { id: 'w2' }],
    });
    const parsed = parseAnnotations(raw);
    expect(parsed.strokes.map((s) => s.id)).toEqual(['s']);
    expect(parsed.waypoints.map((w) => w.id)).toEqual(['w']);
  });
});
