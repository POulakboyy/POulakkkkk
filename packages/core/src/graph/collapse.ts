/**
 * Granular collapsing (4.9): a collapsed node hides its whole subtree. The renderer draws the
 * visible subgraph and shows a "+N" badge on collapsed nodes from `hiddenCount`.
 *
 * The tree comes from `buildHierarchy` (parentId first, then structural edges), so collapsing
 * works the same on mind maps, task trees and imported outlines.
 */
import type { GraphEdge, GraphNode, Id } from '../model.ts';
import { buildHierarchy, preorder } from './hierarchy.ts';
import type { Hierarchy, HierarchyOptions } from './hierarchy.ts';
import type { GraphLike } from './types.ts';

export interface VisibleSubgraph {
  nodes: GraphNode[];
  /** Edges whose two ends are visible. */
  edges: GraphEdge[];
  /** Ids of the hidden nodes. */
  hidden: Set<Id>;
  /** Number of hidden descendants of each visible collapsed node (absent when 0). */
  hiddenCount: Map<Id, number>;
}

/** The graph without the descendants of collapsed nodes. */
export function visibleSubgraph(graph: GraphLike, options: HierarchyOptions = {}): VisibleSubgraph {
  const hierarchy = buildHierarchy(graph, options);
  const collapsed = new Set<Id>();
  for (const node of graph.nodes) if (node.collapsed) collapsed.add(node.id);

  const hidden = new Set<Id>();
  const hiddenCount = new Map<Id, number>();
  if (collapsed.size > 0) {
    // Pre-order: an ancestor is always visited before its descendants.
    for (const { id } of preorder(hierarchy)) {
      if (hidden.has(id) || !collapsed.has(id)) continue;
      const count = hideDescendants(hierarchy, id, hidden);
      if (count > 0) hiddenCount.set(id, count);
    }
  }

  if (hidden.size === 0) {
    return { nodes: [...graph.nodes], edges: [...graph.edges], hidden, hiddenCount };
  }
  return {
    nodes: graph.nodes.filter((node) => !hidden.has(node.id)),
    edges: graph.edges.filter((edge) => !hidden.has(edge.from) && !hidden.has(edge.to)),
    hidden,
    hiddenCount,
  };
}

function hideDescendants(hierarchy: Hierarchy, id: Id, hidden: Set<Id>): number {
  let count = 0;
  const stack = [...(hierarchy.children.get(id) ?? [])];
  while (stack.length > 0) {
    const child = stack.pop() as Id;
    if (hidden.has(child)) continue;
    hidden.add(child);
    count++;
    const kids = hierarchy.children.get(child);
    if (kids) stack.push(...kids);
  }
  return count;
}

/** Returns `graph` with the `collapsed` flag of the listed nodes set to `collapsed`. */
export function setCollapsed<G extends GraphLike>(
  graph: G,
  ids: Iterable<Id>,
  collapsed: boolean,
): G {
  const targets = new Set(ids);
  return mapCollapsed(graph, (node) => (targets.has(node.id) ? collapsed : undefined));
}

/** Flips the `collapsed` flag of one node. */
export function toggleCollapsed<G extends GraphLike>(graph: G, id: Id): G {
  return mapCollapsed(graph, (node) => (node.id === id ? !node.collapsed : undefined));
}

/** Expands every node. */
export function expandAll<G extends GraphLike>(graph: G): G {
  return mapCollapsed(graph, () => false);
}

/**
 * Shows the first `depth` levels only: nodes at `depth - 1` that have children are collapsed,
 * shallower ones are expanded, deeper ones keep their flag (presentation mode, "show me the big
 * picture"). `depth` ≤ 1 collapses the roots.
 */
export function collapseToDepth<G extends GraphLike>(
  graph: G,
  depth: number,
  options: HierarchyOptions = {},
): G {
  const hierarchy = buildHierarchy(graph, options);
  const limit = Math.max(0, Math.floor(depth) - 1);
  const levels = new Map<Id, number>();
  for (const entry of preorder(hierarchy)) levels.set(entry.id, entry.depth);
  return mapCollapsed(graph, (node) => {
    const level = levels.get(node.id) ?? 0;
    const hasChildren = (hierarchy.children.get(node.id)?.length ?? 0) > 0;
    // Deeper nodes are hidden anyway: keep their own state for when the user drills down.
    if (!hasChildren || level > limit) return undefined;
    return level === limit;
  });
}

/** Applies `next(node)` (`undefined` = keep) and only copies nodes whose flag changes. */
function mapCollapsed<G extends GraphLike>(
  graph: G,
  next: (node: GraphNode) => boolean | undefined,
): G {
  let changed = false;
  const nodes = graph.nodes.map((node) => {
    const value = next(node);
    if (value === undefined || value === (node.collapsed ?? false)) return node;
    changed = true;
    const copy = { ...node };
    if (value) copy.collapsed = true;
    else delete copy.collapsed;
    return copy;
  });
  return changed ? { ...graph, nodes } : graph;
}
