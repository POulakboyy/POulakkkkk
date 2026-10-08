/**
 * The tree structure hidden in a canvas graph, shared by the tidy-tree layout, collapsing and
 * the outline/OPML/SVG exporters.
 *
 * Rule (deterministic, always a forest):
 * 1. a node's parent is its `parentId` when that node exists;
 * 2. otherwise the source of its first incoming structural edge, in edge order. `on-complete`
 *    edges are flow conditions, not hierarchy, unless `includeFlowEdges` is set;
 * 3. a candidate that would close a cycle is skipped (the next candidate is tried), so cyclic
 *    drawings still produce a forest.
 * Children keep the order of `graph.nodes`, so importers control sibling order.
 */
import type { Id } from '../model.ts';
import type { GraphLike } from './types.ts';

export interface HierarchyOptions {
  /** Also treat `on-complete` flow edges as parent → child links (default false). */
  includeFlowEdges?: boolean;
}

export interface Hierarchy {
  /** Parent of every non-root node. */
  readonly parent: ReadonlyMap<Id, Id>;
  /** Children of every node that has some, in graph order. */
  readonly children: ReadonlyMap<Id, readonly Id[]>;
  /** Nodes without a parent, in graph order. */
  readonly roots: readonly Id[];
}

export interface HierarchyEntry {
  id: Id;
  depth: number;
}

export function buildHierarchy(graph: GraphLike, options: HierarchyOptions = {}): Hierarchy {
  const order: Id[] = [];
  const known = new Set<Id>();
  const declared = new Map<Id, Id | undefined>();
  for (const node of graph.nodes) {
    if (known.has(node.id)) continue;
    known.add(node.id);
    order.push(node.id);
    declared.set(node.id, node.parentId);
  }

  const incoming = new Map<Id, Id[]>();
  for (const edge of graph.edges) {
    if (edge.condition === 'on-complete' && !options.includeFlowEdges) continue;
    if (edge.from === edge.to || !known.has(edge.from) || !known.has(edge.to)) continue;
    const list = incoming.get(edge.to);
    if (list) list.push(edge.from);
    else incoming.set(edge.to, [edge.from]);
  }

  // Union-find over trees: a node is always the root of its own tree when it gets its parent,
  // so a candidate in the same set is one of its descendants and would close a cycle.
  const uf = new Map<Id, Id>();
  const find = (id: Id): Id => {
    let x = id;
    for (;;) {
      const up = uf.get(x);
      if (up === undefined) return x;
      const upper = uf.get(up);
      if (upper !== undefined) uf.set(x, upper);
      x = up;
    }
  };

  const parent = new Map<Id, Id>();
  for (const id of order) {
    const candidates: Id[] = [];
    const p = declared.get(id);
    if (p !== undefined && p !== id && known.has(p)) candidates.push(p);
    const fromEdges = incoming.get(id);
    if (fromEdges) candidates.push(...fromEdges);
    const self = find(id);
    for (const candidate of candidates) {
      const top = find(candidate);
      if (top === self) continue;
      parent.set(id, candidate);
      uf.set(self, top);
      break;
    }
  }

  const children = new Map<Id, Id[]>();
  const roots: Id[] = [];
  for (const id of order) {
    const p = parent.get(id);
    if (p === undefined) {
      roots.push(id);
      continue;
    }
    const list = children.get(p);
    if (list) list.push(id);
    else children.set(p, [id]);
  }
  return { parent, children, roots };
}

/**
 * Depth-first pre-order walk (parent before children, siblings in order) from `roots`
 * (default: every root). Iterative, so arbitrarily deep trees are safe.
 */
export function preorder(hierarchy: Hierarchy, roots: readonly Id[] = hierarchy.roots): HierarchyEntry[] {
  const out: HierarchyEntry[] = [];
  const stack: HierarchyEntry[] = [];
  for (let i = roots.length - 1; i >= 0; i--) stack.push({ id: roots[i] as Id, depth: 0 });
  while (stack.length > 0) {
    const entry = stack.pop() as HierarchyEntry;
    out.push(entry);
    const kids = hierarchy.children.get(entry.id);
    if (!kids) continue;
    for (let i = kids.length - 1; i >= 0; i--) {
      stack.push({ id: kids[i] as Id, depth: entry.depth + 1 });
    }
  }
  return out;
}

/** Every descendant of `id` in pre-order (excluding `id`). */
export function descendantsOf(hierarchy: Hierarchy, id: Id): Id[] {
  return preorder(hierarchy, [id])
    .slice(1)
    .map((entry) => entry.id);
}

/** Ancestors of `id`, closest first. */
export function ancestorsOf(hierarchy: Hierarchy, id: Id): Id[] {
  const out: Id[] = [];
  for (let p = hierarchy.parent.get(id); p !== undefined; p = hierarchy.parent.get(p)) out.push(p);
  return out;
}
