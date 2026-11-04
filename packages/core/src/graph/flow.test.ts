import { describe, expect, it } from 'vitest';
import { isNodeDone, lockedNodes, lockedReason, unlockedBy, unlockedNodes } from './flow.ts';
import { edge, node } from './test-utils.ts';

const g = {
  nodes: [node('a'), node('b', 0, 0, { refId: 'task-b' }), node('c'), node('d')],
  edges: [
    edge('a', 'c', 'on-complete'),
    edge('b', 'c', 'on-complete'),
    edge('b', 'c', 'on-complete'),
    edge('a', 'd'),
    edge('c', 'c', 'on-complete'),
    edge('ghost', 'd', 'on-complete'),
  ],
};

describe('conditional flows', () => {
  it('locks targets until every on-complete source is done', () => {
    expect([...unlockedNodes(g, [])]).toEqual(['a', 'b', 'd']);
    expect(lockedNodes(g, ['a'])).toEqual(new Map([['c', ['b']]]));
    expect([...unlockedNodes(g, ['a', 'b'])]).toEqual(['a', 'b', 'c', 'd']);
  });

  it('matches done ids on node ids and on refIds', () => {
    expect(isNodeDone(g.nodes[1] as (typeof g.nodes)[number], new Set(['task-b']))).toBe(true);
    expect(unlockedNodes(g, new Set(['a', 'task-b'])).has('c')).toBe(true);
  });

  it('explains why a node is locked', () => {
    expect(lockedReason(g, 'c', [])).toEqual({
      nodeId: 'c',
      blockers: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    });
    expect(lockedReason(g, 'd', [])).toBeNull();
    expect(lockedReason(g, 'missing', [])).toBeNull();
  });

  it('reports what a completion unlocks', () => {
    expect(unlockedBy(g, 'a', [])).toEqual([]);
    expect(unlockedBy(g, 'task-b', ['a'])).toEqual(['c']);
  });
});
