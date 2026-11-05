import { describe, expect, it } from 'vitest';
import {
  collapseToDepth,
  expandAll,
  setCollapsed,
  toggleCollapsed,
  visibleSubgraph,
} from './collapse.ts';
import { treeGraph } from './test-utils.ts';

const base = treeGraph(
  [
    ['r', 'a'],
    ['a', 'a1'],
    ['a1', 'a11'],
    ['r', 'b'],
    ['b', 'b1'],
  ],
  ['solo'],
);

describe('collapsing', () => {
  it('returns everything when nothing is collapsed', () => {
    const v = visibleSubgraph(base);
    expect(v.nodes.length).toBe(base.nodes.length);
    expect(v.edges.length).toBe(base.edges.length);
    expect(v.hidden.size).toBe(0);
  });

  it('hides descendants of collapsed nodes and counts them', () => {
    const g = setCollapsed(base, ['a', 'a1'], true);
    const v = visibleSubgraph(g);
    expect(v.nodes.map((n) => n.id)).toEqual(['r', 'a', 'b', 'b1', 'solo']);
    expect([...v.hidden].sort()).toEqual(['a1', 'a11']);
    expect(v.hiddenCount).toEqual(new Map([['a', 2]]));
    expect(v.edges.map((e) => e.id)).toEqual(['r-a', 'r-b', 'b-b1']);
  });

  it('toggles, expands all and keeps unchanged graphs by reference', () => {
    const once = toggleCollapsed(base, 'b');
    expect(once.nodes.find((n) => n.id === 'b')?.collapsed).toBe(true);
    const twice = toggleCollapsed(once, 'b');
    expect('collapsed' in (twice.nodes.find((n) => n.id === 'b') ?? {})).toBe(false);
    expect(expandAll(base)).toBe(base);
    expect(setCollapsed(base, ['b'], false)).toBe(base);
  });

  it('collapses to a depth for presentations', () => {
    const g = collapseToDepth(base, 2);
    expect(visibleSubgraph(g).nodes.map((n) => n.id)).toEqual(['r', 'a', 'b', 'solo']);
    const roots = collapseToDepth(base, 1);
    expect(visibleSubgraph(roots).nodes.map((n) => n.id)).toEqual(['r', 'solo']);
    expect(visibleSubgraph(collapseToDepth(g, 10)).hidden.size).toBe(0);
  });
});
