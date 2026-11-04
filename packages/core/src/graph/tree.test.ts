import { describe, expect, it } from 'vitest';
import type { GraphNode, Id, Task } from '../model.ts';
import { tasksToGraph } from './from-tasks.ts';
import { ancestorsOf, buildHierarchy, descendantsOf, preorder } from './hierarchy.ts';
import { edge, node, treeGraph } from './test-utils.ts';
import { treeLayout, treePositions } from './tree.ts';
import type { GraphContent, Point } from './types.ts';

function task(id: Id, extra: Partial<Task> = {}): Task {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    title: `Task ${id}`,
    status: 'todo',
    priority: 2,
    tags: [],
    dependsOn: [],
    mode: 'deep',
    postponedCount: 0,
    timeLogs: [],
    ...extra,
  } as Task;
}

/** Nodes of one level must be at least `gap` apart and never overlap. */
function expectTidy(positions: Map<Id, Point>, gap: number): void {
  const byLevel = new Map<number, number[]>();
  for (const p of positions.values()) {
    const list = byLevel.get(p.y) ?? [];
    list.push(p.x);
    byLevel.set(p.y, list);
  }
  for (const xs of byLevel.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      expect((xs[i] as number) - (xs[i - 1] as number)).toBeGreaterThanOrEqual(gap - 1e-6);
    }
  }
}

describe('hierarchy', () => {
  it('prefers parentId, then structural edges, and ignores flow edges by default', () => {
    const g: GraphContent = {
      nodes: [node('a'), node('b'), node('c', 0, 0, { parentId: 'b' }), node('d')],
      edges: [edge('a', 'b'), edge('a', 'c'), edge('a', 'd', 'on-complete')],
    };
    const h = buildHierarchy(g);
    expect(h.parent.get('b')).toBe('a');
    expect(h.parent.get('c')).toBe('b');
    expect(h.parent.has('d')).toBe(false);
    expect(h.roots).toEqual(['a', 'd']);
    expect(buildHierarchy(g, { includeFlowEdges: true }).parent.get('d')).toBe('a');
  });

  it('always produces a forest, even from cycles', () => {
    const g = treeGraph([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'a'],
    ]);
    const h = buildHierarchy(g);
    expect(h.roots.length).toBeGreaterThanOrEqual(1);
    expect(
      preorder(h)
        .map((e) => e.id)
        .sort(),
    ).toEqual(['a', 'b', 'c']);
  });

  it('walks descendants and ancestors', () => {
    const h = buildHierarchy(
      treeGraph([
        ['r', 'a'],
        ['a', 'a1'],
        ['a', 'a2'],
        ['r', 'b'],
      ]),
    );
    expect(preorder(h)).toEqual([
      { id: 'r', depth: 0 },
      { id: 'a', depth: 1 },
      { id: 'a1', depth: 2 },
      { id: 'a2', depth: 2 },
      { id: 'b', depth: 1 },
    ]);
    expect(descendantsOf(h, 'a')).toEqual(['a1', 'a2']);
    expect(ancestorsOf(h, 'a2')).toEqual(['a', 'r']);
  });
});

describe('treeLayout (Buchheim–Walker)', () => {
  it('centres parents over their children and puts levels on lines', () => {
    const g = treeGraph([
      ['r', 'a'],
      ['r', 'b'],
      ['r', 'c'],
    ]);
    const p = treePositions(g, { origin: { x: 0, y: 0 }, nodeSpacing: 100, levelSpacing: 50 });
    expect(p.get('r')).toEqual({ x: 0, y: 0 });
    expect(p.get('a')).toEqual({ x: -100, y: 50 });
    expect(p.get('b')).toEqual({ x: 0, y: 50 });
    expect(p.get('c')).toEqual({ x: 100, y: 50 });
  });

  it('never overlaps subtrees on irregular trees', () => {
    const pairs: Array<[Id, Id]> = [];
    // Deterministic irregular tree: node i's parent is floor(i / 3) with a few long chains.
    for (let i = 1; i < 300; i++)
      pairs.push([`t${i % 7 === 0 ? i - 1 : Math.floor(i / 3)}`, `t${i}`]);
    const g = treeGraph(pairs);
    const p = treePositions(g, { nodeSpacing: 10, subtreeSeparation: 1 });
    expect(p.size).toBe(300);
    expectTidy(p, 10);
    // Each parent is centred over its first and last child.
    const h = buildHierarchy(g);
    for (const [parent, kids] of h.children) {
      const first = p.get(kids[0] as Id) as Point;
      const last = p.get(kids[kids.length - 1] as Id) as Point;
      expect((p.get(parent) as Point).x).toBeCloseTo((first.x + last.x) / 2, 6);
    }
  });

  it('draws isomorphic subtrees identically', () => {
    const g = treeGraph([
      ['r', 'a'],
      ['a', 'a1'],
      ['a', 'a2'],
      ['r', 'm'],
      ['r', 'b'],
      ['b', 'b1'],
      ['b', 'b2'],
    ]);
    const p = treePositions(g);
    const offset = (parent: Id, child: Id): number =>
      (p.get(child) as Point).x - (p.get(parent) as Point).x;
    expect(offset('a', 'a1')).toBeCloseTo(offset('b', 'b1'));
    expect(offset('a', 'a2')).toBeCloseTo(offset('b', 'b2'));
  });

  it('supports horizontal mind maps, a root id, forests and the string shorthand', () => {
    const g = treeGraph([
      ['r', 'a'],
      ['r', 'b'],
      ['x', 'y'],
    ]);
    const horizontal = treePositions(g, { orientation: 'horizontal', origin: { x: 0, y: 0 } });
    expect((horizontal.get('a') as Point).x).toBeGreaterThan(0);
    expect((horizontal.get('a') as Point).y).not.toBe((horizontal.get('b') as Point).y);
    expect([...treePositions(g, { rootId: 'x' }).keys()].sort()).toEqual(['x', 'y']);
    expect(treePositions(g, { rootId: 'missing' }).size).toBe(0);
    const forest = treePositions(g, { origin: { x: 0, y: 0 } });
    expect((forest.get('x') as Point).x).toBeGreaterThan((forest.get('r') as Point).x);
    const laid = treeLayout(g, 'x');
    expect(laid.nodes.find((n) => n.id === 'r')).toBe(g.nodes[0]);
  });

  it('moves hidden descendants rigidly with their collapsed ancestor', () => {
    const g: GraphContent = {
      nodes: [node('r', 0, 0), node('c', 500, 500, { collapsed: true }), node('h', 520, 560)],
      edges: [edge('r', 'c'), edge('c', 'h')],
    };
    const p = treePositions(g, { origin: { x: 0, y: 0 } });
    const c = p.get('c') as Point;
    expect(p.get('h')).toEqual({ x: c.x + 20, y: c.y + 60 });
  });

  it('handles a 10 000-deep chain without overflowing the stack', () => {
    const pairs: Array<[Id, Id]> = [];
    for (let i = 1; i < 10_000; i++) pairs.push([`c${i - 1}`, `c${i}`]);
    const p = treePositions(treeGraph(pairs), { origin: { x: 0, y: 0 }, levelSpacing: 1 });
    expect(p.get('c9999')).toEqual({ x: 0, y: 9999 });
  });
});

describe('tasksToGraph', () => {
  it('turns subtasks into tree edges and dependencies into on-complete edges', () => {
    const tasks = [
      task('p', { color: 3, deadline: 1000 }),
      task('s1', { parentId: 'p' }),
      task('s2', { parentId: 'p', dependsOn: ['s1', 'outside', 's2'] }),
      task('s1'),
    ];
    const g = tasksToGraph(tasks);
    expect(g.nodes.map((n) => n.id)).toEqual(['p', 's1', 's2']);
    const p = g.nodes[0] as GraphNode;
    expect(p).toMatchObject({ kind: 'task', refId: 'p', label: 'Task p', color: 3, due: 1000 });
    expect(g.edges).toEqual([
      { id: 'tree:p>s1', from: 'p', to: 's1', condition: 'always' },
      { id: 'tree:p>s2', from: 'p', to: 's2', condition: 'always' },
      { id: 'dep:s1>s2', from: 's1', to: 's2', condition: 'on-complete' },
    ]);
    const s1 = g.nodes[1] as GraphNode;
    expect(s1.y).toBeGreaterThan(p.y);
  });

  it('is idempotent and can skip dependencies and layout', () => {
    const tasks = [task('a'), task('b', { dependsOn: ['a'] })];
    expect(tasksToGraph(tasks)).toEqual(tasksToGraph(tasks));
    const bare = tasksToGraph(tasks, { includeDependencies: false, layout: false });
    expect(bare.edges).toEqual([]);
    expect(bare.nodes.every((n) => n.x === 0 && n.y === 0)).toBe(true);
  });
});
