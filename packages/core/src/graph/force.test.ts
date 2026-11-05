import { describe, expect, it } from 'vitest';
import type { GraphEdge, GraphNode } from '../model.ts';
import { createLayout, layout } from './force.ts';
import { createRandom } from './random.ts';
import { edge, node } from './test-utils.ts';
import type { GraphContent, Point } from './types.ts';

function dist(a: Readonly<Point>, b: Readonly<Point>): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function ring(count: number): GraphContent {
  const nodes = Array.from({ length: count }, (_, i) => node(`r${i}`, i * 3, (i * 7) % 5));
  const edges = nodes.map((_, i) => edge(`r${i}`, `r${(i + 1) % count}`));
  return { nodes, edges };
}

function randomGraph(n: number, m: number, seed: number): GraphContent {
  const random = createRandom(seed);
  const nodes: GraphNode[] = Array.from({ length: n }, (_, i) =>
    node(`v${i}`, random() * 2000, random() * 2000),
  );
  const edges: GraphEdge[] = [];
  for (let e = 0; e < m; e++) {
    edges.push({
      id: `e${e}`,
      from: `v${Math.floor(random() * n)}`,
      to: `v${Math.floor(random() * n)}`,
    });
  }
  return { nodes, edges };
}

describe('force layout', () => {
  it('is deterministic for a graph and seed', () => {
    const g = ring(12);
    const a = layout(g, { seed: 4, randomize: true });
    const b = layout(g, { seed: 4, randomize: true });
    const c = layout(g, { seed: 5, randomize: true });
    expect(a.nodes).toEqual(b.nodes);
    expect(a.nodes).not.toEqual(c.nodes);
  });

  it('brings linked nodes close to the ideal edge length', () => {
    const g = { nodes: [node('a', 0, 0), node('b', 900, 0)], edges: [edge('a', 'b')] };
    const out = layout(g, { edgeLength: 100, gravity: 0, iterations: 500 });
    const [a, b] = out.nodes as [GraphNode, GraphNode];
    expect(dist(a, b)).toBeGreaterThan(80);
    expect(dist(a, b)).toBeLessThan(120);
  });

  it('separates nodes created at the same spot', () => {
    const g = { nodes: [node('a'), node('b'), node('c')], edges: [] };
    const out = layout(g, { edgeLength: 100 });
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        expect(dist(out.nodes[i] as GraphNode, out.nodes[j] as GraphNode)).toBeGreaterThan(30);
      }
    }
  });

  it('never moves pinned nodes and handles pin/unpin at run time', () => {
    const g = ring(8);
    const sim = createLayout(g, { pinned: ['r0'] });
    sim.step(50);
    expect(sim.positions.get('r0')).toEqual({ x: 0, y: 0 });
    sim.pin('r1', 500, 500);
    expect(sim.isPinned('r1')).toBe(true);
    sim.step(50);
    expect(sim.positions.get('r1')).toEqual({ x: 500, y: 500 });
    sim.unpin('r1');
    sim.reheat();
    sim.step(10);
    expect(sim.positions.get('r1')).not.toEqual({ x: 500, y: 500 });
  });

  it('settles: energy drops, step() stops at the end of the schedule, reheat restarts', () => {
    const g = randomGraph(80, 120, 2);
    const sim = createLayout(g, { iterations: 120, seed: 3 });
    expect(sim.energy).toBe(Infinity);
    expect(sim.settled).toBe(false);
    sim.step();
    const early = sim.energy;
    sim.step(1000);
    expect(sim.settled).toBe(true);
    expect(sim.iteration).toBeLessThanOrEqual(120);
    expect(sim.energy).toBeLessThan(early);
    const iteration = sim.iteration;
    expect(sim.step()).toBe(true);
    expect(sim.iteration).toBe(iteration);
    sim.reheat(50);
    expect(sim.settled).toBe(false);
    expect(sim.temperature).toBe(50);
  });

  it('Barnes–Hut stays close to the exact computation', () => {
    const g = randomGraph(150, 200, 8);
    const exact = createLayout(g, { theta: 0, seed: 1 });
    const approx = createLayout(g, { theta: 0.5, seed: 1 });
    exact.step(1);
    approx.step(1);
    let total = 0;
    for (const id of exact.ids) {
      total += dist(exact.positions.get(id) as Point, approx.positions.get(id) as Point);
    }
    // Same starting point, one step: displacements differ by a small fraction of the edge length.
    expect(total / exact.ids.length).toBeLessThan(15);
  });

  it('applies positions immutably and keeps duplicates, self-loops and dangling edges harmless', () => {
    const g = {
      nodes: [node('a', 0, 0), node('b', 10, 0), node('a', 99, 99)],
      edges: [edge('a', 'a'), edge('a', 'missing'), edge('a', 'b')],
    };
    const sim = createLayout(g);
    expect(sim.ids).toEqual(['a', 'b']);
    sim.step(20);
    const out = sim.apply(g);
    expect(out).not.toBe(g);
    expect(g.nodes[0]).toEqual(node('a', 0, 0));
    for (const p of sim.positions.values()) expect(Number.isFinite(p.x + p.y)).toBe(true);
  });

  it('handles empty graphs, NaN positions and setPosition', () => {
    const empty = createLayout({ nodes: [], edges: [] });
    expect(empty.settled).toBe(true);
    expect(empty.step()).toBe(true);
    const g = { nodes: [node('a', Number.NaN, 0), node('b', 5, 5)], edges: [edge('a', 'b')] };
    const sim = createLayout(g);
    expect(Number.isFinite(sim.positions.get('a')?.x ?? Number.NaN)).toBe(true);
    sim.setPosition('b', 42, 43);
    sim.setPosition('nope', 1, 1);
    expect(sim.positions.get('b')).toEqual({ x: 42, y: 43 });
  });

  it('lays out 10 000 nodes in reasonable time (soft performance check)', () => {
    const g = randomGraph(10_000, 12_000, 13);
    const sim = createLayout(g, { seed: 1 });
    const t0 = performance.now();
    sim.step(5);
    const perStep = (performance.now() - t0) / 5;
    // O(n log n): a few tens of ms per step on a laptop; O(n²) would take seconds.
    expect(perStep).toBeLessThan(400);
    for (const p of sim.positions.values()) expect(Number.isFinite(p.x + p.y)).toBe(true);
  });
});
