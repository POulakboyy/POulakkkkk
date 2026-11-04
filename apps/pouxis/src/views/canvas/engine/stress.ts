import { graph as g } from '@pouxis/core';
import type { GraphContent, GraphEdge, GraphNode } from '@pouxis/core';

/**
 * Deterministic large canvas for the dev "stress" button: `count` nodes in a forest of
 * mind maps laid out on a grid, plus a few cross links, so culling, LOD and the minimap are
 * exercised the way a real 10 000-node canvas would.
 */
export function stressGraph(count = 10_000, seed = 7): GraphContent {
  const random = g.createRandom(seed);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const perTree = 100;
  const columns = Math.ceil(Math.sqrt(count / perTree));
  for (let i = 0; i < count; i++) {
    const tree = Math.floor(i / perTree);
    const local = i % perTree;
    const cx = (tree % columns) * 2600;
    const cy = Math.floor(tree / columns) * 2600;
    const angle = local * 2.399963; // golden angle: an even spiral without overlaps
    const radius = local === 0 ? 0 : 90 * Math.sqrt(local) + 40;
    const id = `s${i}`;
    const node: GraphNode = {
      id,
      label: local === 0 ? `Thème ${tree + 1}` : `Idée ${tree + 1}.${local}`,
      kind: local % 9 === 0 ? 'task' : 'idea',
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      color: (tree % 8) + 1,
    };
    if (local > 0) {
      const parent = tree * perTree + Math.floor(random() * local);
      node.parentId = `s${parent}`;
      edges.push({ id: `e${i}`, from: `s${parent}`, to: id, condition: 'always' });
    }
    nodes.push(node);
  }
  for (let i = 0; i < count / 50; i++) {
    const from = Math.floor(random() * count);
    const to = Math.floor(random() * count);
    if (from !== to) edges.push({ id: `x${i}`, from: `s${from}`, to: `s${to}`, condition: 'on-complete' });
  }
  return { nodes, edges };
}
