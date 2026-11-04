import { createId, graph as g } from '@pouxis/core';
import type {
  EdgeCondition,
  GraphContent,
  GraphEdge,
  GraphLike,
  GraphNode,
  GraphNodeKind,
  Id,
} from '@pouxis/core';

/**
 * Pure editing operations on graph content. Each returns new `{ nodes, edges }` (the same
 * reference when nothing changed) so the view can commit it with `store.update`.
 */
export type Content = Pick<GraphContent, 'nodes' | 'edges'>;

/** Horizontal gap between a parent and its children in mind-map placement. */
export const CHILD_DX = 260;
/** Vertical gap between siblings. */
export const SIBLING_DY = 64;

export function makeNode(
  label: string,
  x: number,
  y: number,
  extra: Partial<Omit<GraphNode, 'id' | 'label' | 'x' | 'y'>> & { id?: Id } = {},
): GraphNode {
  const { id, kind, ...rest } = extra;
  return { id: id ?? createId(), label, kind: kind ?? ('idea' satisfies GraphNodeKind), x, y, ...rest };
}

export function addNode(content: Content, node: GraphNode): Content {
  return { nodes: [...content.nodes, node], edges: content.edges };
}

/** Children of `id`, using the same rules as the engine's hierarchy. */
function childrenOf(content: GraphLike, id: Id): GraphNode[] {
  const kids = g.buildHierarchy(content).children.get(id) ?? [];
  const index = g.indexNodes(content.nodes);
  return kids.map((k) => index.get(k)).filter((n): n is GraphNode => n !== undefined);
}

/** Adds a child to the right of `parentId`, below its last child; returns the new node too. */
export function addChild(
  content: Content,
  parentId: Id,
  label = '',
): { content: Content; node: GraphNode } | undefined {
  const parent = content.nodes.find((n) => n.id === parentId);
  if (!parent) return undefined;
  const kids = childrenOf(content, parentId);
  const last = kids[kids.length - 1];
  const y = last ? last.y + SIBLING_DY : parent.y;
  const x = last ? last.x : parent.x + CHILD_DX;
  const node = makeNode(label, x, y, { parentId });
  const edge: GraphEdge = { id: createId(), from: parentId, to: node.id, condition: 'always' };
  const nodes = content.nodes.map((n) => (n.id === parentId && n.collapsed ? { ...n, collapsed: false } : n));
  return { content: { nodes: [...nodes, node], edges: [...content.edges, edge] }, node };
}

/** Adds a sibling just below `id` (a new root when `id` has no parent). */
export function addSibling(
  content: Content,
  id: Id,
  label = '',
): { content: Content; node: GraphNode } | undefined {
  const current = content.nodes.find((n) => n.id === id);
  if (!current) return undefined;
  const parentId = g.buildHierarchy(content).parent.get(id);
  if (parentId !== undefined) return addChild(content, parentId, label);
  const node = makeNode(label, current.x, current.y + SIBLING_DY * 1.5);
  return { content: addNode(content, node), node };
}

/**
 * Removes nodes and every edge touching them. Children of a removed node are re-attached to
 * the removed node's own parent so a branch is never orphaned silently.
 */
export function removeNodes(content: Content, ids: Iterable<Id>): Content {
  const gone = new Set(ids);
  if (gone.size === 0) return content;
  const hierarchy = g.buildHierarchy(content);
  const survivingParent = (id: Id | undefined): Id | undefined => {
    let p = id;
    while (p !== undefined && gone.has(p)) p = hierarchy.parent.get(p);
    return p;
  };
  const nodes: GraphNode[] = [];
  for (const node of content.nodes) {
    if (gone.has(node.id)) continue;
    if (node.parentId === undefined || !gone.has(node.parentId)) {
      nodes.push(node);
      continue;
    }
    const { parentId: _old, ...rest } = node;
    const parentId = survivingParent(node.parentId);
    nodes.push(parentId === undefined ? rest : { ...rest, parentId });
  }
  if (nodes.length === content.nodes.length) return content;
  const edges = content.edges.filter((e) => !gone.has(e.from) && !gone.has(e.to));
  return { nodes, edges };
}

/** Links two nodes; ignored for self-links and when the same link already exists. */
export function connect(
  content: Content,
  from: Id,
  to: Id,
  condition: EdgeCondition = 'always',
): Content {
  if (from === to) return content;
  if (content.edges.some((e) => e.from === from && e.to === to)) return content;
  const ids = new Set(content.nodes.map((n) => n.id));
  if (!ids.has(from) || !ids.has(to)) return content;
  return {
    nodes: content.nodes,
    edges: [...content.edges, { id: createId(), from, to, condition }],
  };
}

export function removeEdge(content: Content, edgeId: Id): Content {
  const edges = content.edges.filter((e) => e.id !== edgeId);
  return edges.length === content.edges.length ? content : { nodes: content.nodes, edges };
}

export function setEdgeCondition(content: Content, edgeId: Id, condition: EdgeCondition): Content {
  let changed = false;
  const edges = content.edges.map((e) => {
    if (e.id !== edgeId || (e.condition ?? 'always') === condition) return e;
    changed = true;
    return { ...e, condition };
  });
  return changed ? { nodes: content.nodes, edges } : content;
}

export function updateNode(
  content: Content,
  id: Id,
  patch: Partial<Omit<GraphNode, 'id'>>,
): Content {
  let changed = false;
  const nodes = content.nodes.map((n) => {
    if (n.id !== id) return n;
    changed = true;
    return { ...n, ...patch };
  });
  return changed ? { nodes, edges: content.edges } : content;
}

/**
 * Adds imported content (outline, OPML, tasks) centred on `at`, with fresh ids so it can be
 * pasted twice into the same canvas.
 */
export function mergeContent(
  content: Content,
  incoming: GraphContent,
  at: { x: number; y: number },
): Content {
  if (incoming.nodes.length === 0) return content;
  const bounds = g.graphBounds(incoming);
  const dx = at.x - (bounds.x + bounds.width / 2);
  const dy = at.y - (bounds.y + bounds.height / 2);
  const ids = new Map<Id, Id>();
  for (const node of incoming.nodes) ids.set(node.id, createId());
  const remap = (id: Id): Id => ids.get(id) ?? id;
  const nodes = incoming.nodes.map((n) => {
    const moved: GraphNode = { ...n, id: remap(n.id), x: n.x + dx, y: n.y + dy };
    if (n.parentId !== undefined) moved.parentId = remap(n.parentId);
    return moved;
  });
  const edges = incoming.edges.map((e) => ({ ...e, id: createId(), from: remap(e.from), to: remap(e.to) }));
  return { nodes: [...content.nodes, ...nodes], edges: [...content.edges, ...edges] };
}

/** A small mind map so a new canvas shows the gestures instead of an empty page. */
export function starterMindMap(labels: {
  root: string;
  branches: readonly string[];
}): GraphContent {
  const root = makeNode(labels.root, 0, 0, { color: 1 });
  let content: Content = { nodes: [root], edges: [] };
  labels.branches.forEach((label, i) => {
    const added = addChild(content, root.id, label);
    if (!added) return;
    content = updateNode(added.content, added.node.id, { color: (i % 7) + 2 });
  });
  const laid = g.treeLayout(content, { orientation: 'horizontal', rootId: root.id });
  return { nodes: laid.nodes, edges: laid.edges };
}
