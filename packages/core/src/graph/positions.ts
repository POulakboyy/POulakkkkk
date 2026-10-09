/**
 * Helpers to read and write node positions immutably. Layout algorithms compute a
 * `Map<Id, Point>`; `applyPositions` turns it into a new graph value that the store can persist.
 */
import type { GraphNode, Id } from '../model.ts';
import type { GraphLike, Point } from './types.ts';

/** Returns `graph` with the positions of the listed nodes replaced (other nodes are shared). */
export function applyPositions<G extends GraphLike>(
  graph: G,
  positions: ReadonlyMap<Id, Readonly<Point>>,
): G {
  if (positions.size === 0) return graph;
  let changed = false;
  const nodes = graph.nodes.map((node) => {
    const p = positions.get(node.id);
    if (!p || (p.x === node.x && p.y === node.y)) return node;
    changed = true;
    return { ...node, x: p.x, y: p.y };
  });
  return changed ? { ...graph, nodes } : graph;
}

/** Current positions of every node, keyed by id. */
export function positionsOf(graph: GraphLike): Map<Id, Point> {
  const out = new Map<Id, Point>();
  for (const node of graph.nodes) out.set(node.id, { x: node.x, y: node.y });
  return out;
}

/** Nodes keyed by id. When ids are duplicated, the first node wins (consistent everywhere). */
export function indexNodes(nodes: readonly GraphNode[]): Map<Id, GraphNode> {
  const out = new Map<Id, GraphNode>();
  for (const node of nodes) if (!out.has(node.id)) out.set(node.id, node);
  return out;
}
