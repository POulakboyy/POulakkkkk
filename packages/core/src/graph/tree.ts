/**
 * Tidy tree layout (4.3): Walker's algorithm in the linear-time formulation of Buchheim,
 * Jünger & Leipert (2002), "Improving Walker's Algorithm to Run in Linear Time".
 *
 * Guarantees of a tidy drawing: nodes of a level share a line, a parent is centred above its
 * children, subtrees never overlap and isomorphic subtrees are drawn identically. All passes are
 * iterative, so a 10 000-deep chain of subtasks cannot overflow the call stack.
 */
import type { Id } from '../model.ts';
import { buildHierarchy, descendantsOf } from './hierarchy.ts';
import type { HierarchyOptions } from './hierarchy.ts';
import { applyPositions, indexNodes } from './positions.ts';
import type { GraphLike, Point } from './types.ts';

export type TreeOrientation = 'vertical' | 'horizontal';

export interface TreeLayoutOptions extends HierarchyOptions {
  /** Lay out only the subtree of this node (default: every tree of the forest, side by side). */
  rootId?: Id;
  /** `vertical`: root on top, like an org chart (default). `horizontal`: root on the left, like a mind map. */
  orientation?: TreeOrientation;
  /** Distance between the centres of adjacent siblings (default 180 vertical, 72 horizontal). */
  nodeSpacing?: number;
  /** Distance between consecutive levels (default 140 vertical, 260 horizontal). */
  levelSpacing?: number;
  /** Gap between neighbours of different parents, in sibling gaps (default 1.5). */
  subtreeSeparation?: number;
  /** Final position of the (first) root. Default: the root keeps its current position. */
  origin?: Point;
  /**
   * Leave the descendants of collapsed nodes out of the layout; they move rigidly with their
   * collapsed ancestor so that expanding it later shows them in place (default true).
   */
  respectCollapsed?: boolean;
}

/** Computes tidy-tree positions without touching the graph (useful to animate a transition). */
export function treePositions(graph: GraphLike, options: TreeLayoutOptions = {}): Map<Id, Point> {
  const out = new Map<Id, Point>();
  const byId = indexNodes(graph.nodes);
  const hierarchy = buildHierarchy(graph, options);
  const respectCollapsed = options.respectCollapsed ?? true;
  let roots: readonly Id[];
  if (options.rootId !== undefined) {
    if (!byId.has(options.rootId)) return out;
    roots = [options.rootId];
  } else {
    roots = hierarchy.roots;
  }
  if (roots.length === 0) return out;

  // Flatten the forest under a virtual root (index 0).
  const ids: Id[] = [''];
  const parent: number[] = [-1];
  const children: number[][] = [[]];
  const collapsedLaidOut: Id[] = [];
  const stack: number[] = [];
  for (const root of roots) {
    const index = ids.length;
    ids.push(root);
    parent.push(0);
    children.push([]);
    (children[0] as number[]).push(index);
    stack.push(index);
  }
  while (stack.length > 0) {
    const v = stack.pop() as number;
    const id = ids[v] as Id;
    const kids = hierarchy.children.get(id);
    if (!kids || kids.length === 0) continue;
    if (respectCollapsed && byId.get(id)?.collapsed) {
      collapsedLaidOut.push(id);
      continue;
    }
    for (const kid of kids) {
      const index = ids.length;
      ids.push(kid);
      parent.push(v);
      children.push([]);
      (children[v] as number[]).push(index);
      stack.push(index);
    }
  }

  const separation = Math.max(0, options.subtreeSeparation ?? 1.5);
  const { x, depth } = buchheim(children, parent, separation);

  const vertical = (options.orientation ?? 'vertical') === 'vertical';
  const nodeSpacing = positiveOr(options.nodeSpacing, vertical ? 180 : 72);
  const levelSpacing = positiveOr(options.levelSpacing, vertical ? 140 : 260);
  const anchorIndex = 1;
  const anchorNode = byId.get(ids[anchorIndex] as Id);
  const origin = options.origin ?? { x: anchorNode?.x ?? 0, y: anchorNode?.y ?? 0 };
  const along0 = (x[anchorIndex] as number) * nodeSpacing;
  for (let v = 1; v < ids.length; v++) {
    const along = (x[v] as number) * nodeSpacing - along0;
    const across = ((depth[v] as number) - 1) * levelSpacing;
    out.set(
      ids[v] as Id,
      vertical
        ? { x: origin.x + along, y: origin.y + across }
        : { x: origin.x + across, y: origin.y + along },
    );
  }

  // Hidden descendants follow their collapsed ancestor rigidly.
  for (const id of collapsedLaidOut) {
    const before = byId.get(id);
    const after = out.get(id);
    if (!before || !after) continue;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    for (const d of descendantsOf(hierarchy, id)) {
      const node = byId.get(d);
      if (node && !out.has(d)) out.set(d, { x: node.x + dx, y: node.y + dy });
    }
  }
  return out;
}

/**
 * Lays out the hierarchy of `graph` as a tidy tree and returns the updated graph. Accepts the
 * root id directly (`treeLayout(graph, rootId)`) or full options.
 */
export function treeLayout<G extends GraphLike>(graph: G, options: TreeLayoutOptions | Id = {}): G {
  const opts = typeof options === 'string' ? { rootId: options } : options;
  return applyPositions(graph, treePositions(graph, opts));
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Buchheim–Jünger–Leipert over index arrays. Node 0 is the root. Returns the horizontal
 * position of each node in units of the sibling gap, and its depth (root = 0).
 */
export function buchheim(
  children: readonly (readonly number[])[],
  parent: readonly number[],
  subtreeSeparation = 1,
): { x: Float64Array; depth: Int32Array } {
  const n = children.length;
  const prelim = new Float64Array(n);
  const mod = new Float64Array(n);
  const change = new Float64Array(n);
  const shift = new Float64Array(n);
  const thread = new Int32Array(n).fill(-1);
  const ancestor = new Int32Array(n);
  const number = new Int32Array(n);
  const defaultAncestor = new Int32Array(n).fill(-1);
  for (let v = 0; v < n; v++) {
    ancestor[v] = v;
    const kids = children[v] as readonly number[];
    for (let i = 0; i < kids.length; i++) number[kids[i] as number] = i;
    if (kids.length > 0) defaultAncestor[v] = kids[0] as number;
  }

  const sep = (a: number, b: number): number =>
    parent[a] === parent[b] ? 1 : subtreeSeparation;
  const leftBrother = (v: number): number => {
    const p = parent[v] as number;
    const i = number[v] as number;
    return p < 0 || i === 0 ? -1 : ((children[p] as readonly number[])[i - 1] as number);
  };
  const nextLeft = (v: number): number => {
    const kids = children[v] as readonly number[];
    return kids.length > 0 ? (kids[0] as number) : (thread[v] as number);
  };
  const nextRight = (v: number): number => {
    const kids = children[v] as readonly number[];
    return kids.length > 0 ? (kids[kids.length - 1] as number) : (thread[v] as number);
  };
  const moveSubtree = (wl: number, wr: number, amount: number): void => {
    const subtrees = (number[wr] as number) - (number[wl] as number);
    const ratio = amount / subtrees;
    change[wr] = (change[wr] as number) - ratio;
    shift[wr] = (shift[wr] as number) + amount;
    change[wl] = (change[wl] as number) + ratio;
    prelim[wr] = (prelim[wr] as number) + amount;
    mod[wr] = (mod[wr] as number) + amount;
  };
  const executeShifts = (v: number): void => {
    let s = 0;
    let c = 0;
    const kids = children[v] as readonly number[];
    for (let i = kids.length - 1; i >= 0; i--) {
      const w = kids[i] as number;
      prelim[w] = (prelim[w] as number) + s;
      mod[w] = (mod[w] as number) + s;
      c += change[w] as number;
      s += (shift[w] as number) + c;
    }
  };
  const apportion = (v: number, fallback: number): number => {
    const w = leftBrother(v);
    if (w < 0) return fallback;
    const p = parent[v] as number;
    let vir = v;
    let vor = v;
    let vil = w;
    let vol = (children[p] as readonly number[])[0] as number;
    let sir = mod[vir] as number;
    let sor = mod[vor] as number;
    let sil = mod[vil] as number;
    let sol = mod[vol] as number;
    let result = fallback;
    while (nextRight(vil) >= 0 && nextLeft(vir) >= 0) {
      vil = nextRight(vil);
      vir = nextLeft(vir);
      vol = nextLeft(vol);
      vor = nextRight(vor);
      ancestor[vor] = v;
      const amount = (prelim[vil] as number) + sil - ((prelim[vir] as number) + sir) + sep(vil, vir);
      if (amount > 0) {
        const a = ancestor[vil] as number;
        moveSubtree(parent[a] === p ? a : result, v, amount);
        sir += amount;
        sor += amount;
      }
      sil += mod[vil] as number;
      sir += mod[vir] as number;
      sol += mod[vol] as number;
      sor += mod[vor] as number;
    }
    if (nextRight(vil) >= 0 && nextRight(vor) < 0) {
      thread[vor] = nextRight(vil);
      mod[vor] = (mod[vor] as number) + sil - sor;
    } else {
      if (nextLeft(vir) >= 0 && nextLeft(vol) < 0) {
        thread[vol] = nextLeft(vir);
        mod[vol] = (mod[vol] as number) + sir - sol;
      }
      result = v;
    }
    return result;
  };

  // First walk: iterative post-order; a node is finished once all its children are.
  const cursor = new Int32Array(n);
  const stack: number[] = [0];
  while (stack.length > 0) {
    const v = stack[stack.length - 1] as number;
    const kids = children[v] as readonly number[];
    const i = cursor[v] as number;
    if (i < kids.length) {
      cursor[v] = i + 1;
      stack.push(kids[i] as number);
      continue;
    }
    stack.pop();
    const lb = leftBrother(v);
    if (kids.length === 0) {
      prelim[v] = lb >= 0 ? (prelim[lb] as number) + sep(lb, v) : 0;
    } else {
      executeShifts(v);
      const mid =
        ((prelim[kids[0] as number] as number) + (prelim[kids[kids.length - 1] as number] as number)) /
        2;
      if (lb >= 0) {
        prelim[v] = (prelim[lb] as number) + sep(lb, v);
        mod[v] = (prelim[v] as number) - mid;
      } else {
        prelim[v] = mid;
      }
    }
    const p = parent[v] as number;
    if (p >= 0) defaultAncestor[p] = apportion(v, defaultAncestor[p] as number);
  }

  // Second walk: pre-order, accumulating modifiers.
  const x = new Float64Array(n);
  const depth = new Int32Array(n);
  const modSum = new Float64Array(n);
  const order: number[] = [0];
  while (order.length > 0) {
    const v = order.pop() as number;
    const m = modSum[v] as number;
    x[v] = (prelim[v] as number) + m;
    for (const w of children[v] as readonly number[]) {
      modSum[w] = m + (mod[v] as number);
      depth[w] = (depth[v] as number) + 1;
      order.push(w);
    }
  }
  return { x, depth };
}
