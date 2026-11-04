import { graph as g } from '@pouxis/core';
import type { GraphEdge, GraphLike, GraphNode, Id } from '@pouxis/core';

/** Text width in world units for the node label font. Injected so tests need no canvas. */
export type Measure = (text: string) => number;

export const NODE_HEIGHT = 44;
export const NODE_MIN_WIDTH = 96;
export const NODE_MAX_WIDTH = 260;
export const NODE_PAD_X = 16;
/** Room for the task check circle or the lock glyph before the label. */
export const NODE_GLYPH = 22;
/** Room for the "+N" collapse badge after the label. */
export const NODE_BADGE = 34;

export interface SceneNode {
  readonly id: Id;
  readonly node: GraphNode;
  /** Mutable: dragging and layout animations move scene nodes before the graph is committed. */
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  /** Label fitted to the box (ellipsis when too long). */
  readonly text: string;
  readonly locked: boolean;
  readonly done: boolean;
  readonly hasChildren: boolean;
  /** Hidden descendants when collapsed (0 otherwise). */
  readonly hiddenCount: number;
  /** Draw order, used to pick the top-most node on overlap. */
  readonly order: number;
}

export interface SceneEdge {
  readonly edge: GraphEdge;
  readonly from: SceneNode;
  readonly to: SceneNode;
  readonly conditional: boolean;
}

export interface Scene {
  readonly nodes: readonly SceneNode[];
  readonly edges: readonly SceneEdge[];
  readonly byId: ReadonlyMap<Id, SceneNode>;
  /** Centres of the visible nodes; boxes extend by at most `maxHalfW` × `NODE_HEIGHT / 2`. */
  readonly index: g.QuadTree;
  readonly maxHalfW: number;
  /** Ids hidden by collapsed ancestors. */
  readonly hidden: ReadonlySet<Id>;
  /** Blockers of every locked node (4.7). */
  readonly locks: ReadonlyMap<Id, Id[]>;
  readonly doneIds: ReadonlySet<Id>;
}

export interface SceneOptions {
  measure: Measure;
  /** Completed task ids (or node ids); unlocks `on-complete` edges and checks task nodes. */
  doneIds?: ReadonlySet<Id>;
}

/** Shortens `label` with an ellipsis until it fits `maxWidth` (binary search on length). */
export function fitLabel(label: string, maxWidth: number, measure: Measure): string {
  const clean = label.replace(/\s+/g, ' ').trim();
  if (measure(clean) <= maxWidth) return clean;
  let lo = 0;
  let hi = clean.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(`${clean.slice(0, mid).trimEnd()}…`) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${clean.slice(0, lo).trimEnd()}…`;
}

/** Box width for a label given the glyphs drawn around it. */
export function nodeWidth(labelWidth: number, glyph: boolean, badge: boolean): number {
  const extra = 2 * NODE_PAD_X + (glyph ? NODE_GLYPH : 0) + (badge ? NODE_BADGE : 0);
  return Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, Math.ceil(labelWidth + extra)));
}

/**
 * Turns a stored graph into what the renderer and hit-testing need: visible nodes only
 * (collapsed branches removed), fitted labels and box sizes, lock state and a quadtree.
 */
export function buildScene(graph: GraphLike, options: SceneOptions): Scene {
  const doneIds = options.doneIds ?? new Set<Id>();
  const visible = g.visibleSubgraph(graph);
  const hierarchy = g.buildHierarchy(graph);
  const locks = g.lockedNodes(graph, doneIds);
  const index = new g.QuadTree();
  const byId = new Map<Id, SceneNode>();
  const nodes: SceneNode[] = [];
  let maxHalfW = NODE_MIN_WIDTH / 2;

  for (const node of visible.nodes) {
    if (byId.has(node.id) || !Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    const sceneNode = toSceneNode(node, nodes.length, {
      measure: options.measure,
      locked: locks.has(node.id),
      done: g.isNodeDone(node, doneIds),
      hasChildren: (hierarchy.children.get(node.id)?.length ?? 0) > 0,
      hiddenCount: visible.hiddenCount.get(node.id) ?? 0,
    });
    nodes.push(sceneNode);
    byId.set(node.id, sceneNode);
    index.insert(node.id, node.x, node.y);
    maxHalfW = Math.max(maxHalfW, sceneNode.w / 2);
  }

  const edges: SceneEdge[] = [];
  for (const edge of visible.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to || from === to) continue;
    edges.push({ edge, from, to, conditional: edge.condition === 'on-complete' });
  }

  return { nodes, edges, byId, index, maxHalfW, hidden: visible.hidden, locks, doneIds };
}

interface NodeFacts {
  measure: Measure;
  locked: boolean;
  done: boolean;
  hasChildren: boolean;
  hiddenCount: number;
}

function toSceneNode(node: GraphNode, order: number, facts: NodeFacts): SceneNode {
  const glyph = node.kind === 'task' || facts.locked;
  const badge = facts.hiddenCount > 0;
  const maxLabel =
    NODE_MAX_WIDTH - 2 * NODE_PAD_X - (glyph ? NODE_GLYPH : 0) - (badge ? NODE_BADGE : 0);
  const text = fitLabel(node.label, maxLabel, facts.measure);
  return {
    id: node.id,
    node,
    x: node.x,
    y: node.y,
    w: nodeWidth(facts.measure(text), glyph, badge),
    h: NODE_HEIGHT,
    text,
    locked: facts.locked,
    done: facts.done,
    hasChildren: facts.hasChildren,
    hiddenCount: facts.hiddenCount,
    order,
  };
}

/** Top-most node whose box contains the world point. */
export function hitNode(scene: Scene, x: number, y: number): SceneNode | undefined {
  const candidates = scene.index.queryRect({
    x: x - scene.maxHalfW,
    y: y - NODE_HEIGHT / 2,
    width: scene.maxHalfW * 2,
    height: NODE_HEIGHT,
  });
  let best: SceneNode | undefined;
  for (const item of candidates) {
    const node = scene.byId.get(item.id);
    if (!node || !containsPoint(node, x, y)) continue;
    if (!best || node.order > best.order) best = node;
  }
  return best;
}

/** Whether the world point is on the "+N" / collapse toggle at the right end of a node. */
export function hitToggle(node: SceneNode, x: number, y: number): boolean {
  if (!node.hasChildren) return false;
  const right = node.x + node.w / 2;
  return x >= right - NODE_BADGE && x <= right + 12 && Math.abs(y - node.y) <= node.h / 2;
}

export function containsPoint(node: SceneNode, x: number, y: number): boolean {
  return Math.abs(x - node.x) <= node.w / 2 && Math.abs(y - node.y) <= node.h / 2;
}

/** Moves a scene node and keeps the spatial index in sync. */
export function moveSceneNode(scene: Scene, node: SceneNode, x: number, y: number): void {
  node.x = x;
  node.y = y;
  scene.index.update(node.id, x, y);
}

/** Current scene positions (after drags or animations) for `graph.applyPositions`. */
export function scenePositions(nodes: Iterable<SceneNode>): Map<Id, { x: number; y: number }> {
  const out = new Map<Id, { x: number; y: number }>();
  for (const node of nodes) out.set(node.id, { x: node.x, y: node.y });
  return out;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Nearest node in a direction (keyboard navigation on the canvas). Candidates must lie in the
 * 90° cone around the direction; lateral offset costs twice as much as forward distance.
 */
export function nodeInDirection(
  scene: Scene,
  from: SceneNode,
  direction: Direction,
): SceneNode | undefined {
  let best: SceneNode | undefined;
  let bestScore = Infinity;
  for (const node of scene.nodes) {
    if (node === from) continue;
    const dx = node.x - from.x;
    const dy = node.y - from.y;
    const forward =
      direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy;
    const lateral = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (forward <= 0 || lateral > forward) continue;
    const score = forward + 2 * lateral;
    if (score < bestScore) {
      bestScore = score;
      best = node;
    }
  }
  return best;
}
