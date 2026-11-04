/** Fixtures shared by the graph tests (not exported from the module). */
import type { EdgeCondition, GraphEdge, GraphNode, Id } from '../model.ts';
import type { GraphContent } from './types.ts';

export function node(id: Id, x = 0, y = 0, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, label: id.toUpperCase(), kind: 'idea', x, y, ...extra };
}

export function edge(from: Id, to: Id, condition?: EdgeCondition, label?: string): GraphEdge {
  const e: GraphEdge = { id: `${from}-${to}`, from, to };
  if (condition) e.condition = condition;
  if (label) e.label = label;
  return e;
}

/** Tree from `[parent, child]` pairs, linked by edges (no parentId). */
export function treeGraph(
  pairs: ReadonlyArray<readonly [Id, Id]>,
  extraIds: Id[] = [],
): GraphContent {
  const ids: Id[] = [];
  const add = (id: Id): void => {
    if (!ids.includes(id)) ids.push(id);
  };
  for (const [a, b] of pairs) {
    add(a);
    add(b);
  }
  extraIds.forEach(add);
  return { nodes: ids.map((id) => node(id)), edges: pairs.map(([a, b]) => edge(a, b)) };
}

export function sequentialIds(prefix = 'n'): (index: number) => Id {
  return (index) => `${prefix}${index}`;
}
