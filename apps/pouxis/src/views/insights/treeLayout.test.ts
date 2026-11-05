import { describe, expect, it } from 'vitest';
import { insights, type Task } from '@pouxis/core';
import { TREE_WIDTH, centreHeavy, jitter, layoutTree } from './treeLayout.ts';

const done = (id: string, tags: string[]): Task => ({
  id,
  createdAt: 0,
  updatedAt: 1,
  title: id,
  status: 'done',
  priority: 2,
  mode: 'create',
  tags,
  dependsOn: [],
  postponedCount: 0,
  timeLogs: [],
  completedAt: 1,
});

const tree = insights.skillTree([
  done('a', ['design/typo']),
  done('b', ['design/typo']),
  done('c', ['design/couleur']),
  done('d', ['code']),
  done('e', ['musique']),
]);

describe('layoutTree', () => {
  it('grows nothing from an empty tree', () => {
    expect(layoutTree(insights.skillTree([]))).toEqual({ branches: [], leaves: [] });
  });

  it('draws a trunk plus one branch and one leaf per node', () => {
    const layout = layoutTree(tree);
    const nodes = insights.flattenSkills(tree).length - 1;
    expect(layout.branches).toHaveLength(nodes + 1);
    expect(layout.leaves).toHaveLength(nodes);
    expect(layout.branches[0]?.depth).toBe(0);
  });

  it('is deterministic and grows upwards', () => {
    const a = layoutTree(tree);
    expect(layoutTree(tree)).toEqual(a);
    for (const b of a.branches.filter((x) => x.depth === 1)) expect(b.y2).toBeLessThan(b.y1);
  });

  it('labels main branches and anchors labels away from the trunk', () => {
    const layout = layoutTree(tree);
    for (const leaf of layout.leaves.filter((l) => l.depth === 1)) {
      expect(leaf.labelled).toBe(true);
      if (leaf.anchor === 'end') expect(leaf.x).toBeLessThan(TREE_WIDTH / 2);
      if (leaf.anchor === 'start') expect(leaf.x).toBeGreaterThan(TREE_WIDTH / 2);
    }
  });
});

describe('helpers', () => {
  it('keeps the heaviest item in the centre', () => {
    expect(centreHeavy(['a', 'b', 'c', 'd', 'e'])).toEqual(['d', 'b', 'a', 'c', 'e']);
  });

  it('jitters within [-1, 1], stably', () => {
    for (const id of ['', 'design', 'design/typo', 'x'.repeat(50)]) {
      expect(Math.abs(jitter(id))).toBeLessThanOrEqual(1);
      expect(jitter(id)).toBe(jitter(id));
    }
  });
});
