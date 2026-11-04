import type { insights } from '@pouxis/core';

/** Generative layout of the skill tree (7.5): the trunk grows up, branches fan out by weight. */

export const TREE_WIDTH = 800;
export const TREE_HEIGHT = 440;
const MAX_DEPTH = 4;
const MAX_CHILDREN = 6;
const TRUNK = 120;
/** Total fan of the first fork, in radians (≈ 150°). */
const ROOT_SPREAD = (150 * Math.PI) / 180;

export interface TreeBranch {
  id: string;
  node: insights.SkillNode;
  depth: number;
  /** SVG path (one quadratic curve) from the branch base to its tip. */
  d: string;
  /** Base of the branch: the transform origin of its growth animation. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

export interface TreeLeaf {
  id: string;
  node: insights.SkillNode;
  x: number;
  y: number;
  r: number;
  depth: number;
  /** Labelled leaves get a text label; small twigs stay quiet to avoid clutter. */
  labelled: boolean;
  /** Text anchor that keeps the label outside the canopy. */
  anchor: 'start' | 'middle' | 'end';
}

export interface TreeLayout {
  branches: TreeBranch[];
  leaves: TreeLeaf[];
}

/** Deterministic pseudo-random in [-1, 1] from a string: the same tree always grows the same way. */
export function jitter(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function layoutTree(root: insights.SkillNode): TreeLayout {
  const out: TreeLayout = { branches: [], leaves: [] };
  if (root.weight <= 0 || root.children.length === 0) return out;

  const baseX = TREE_WIDTH / 2;
  const baseY = TREE_HEIGHT - 8;
  const up = -Math.PI / 2;
  const trunk = branch(root, 0, baseX, baseY, up, TRUNK, 14);
  out.branches.push(trunk);
  grow(root, trunk.x2, trunk.y2, up, ROOT_SPREAD, 1, root.weight, out);
  return out;
}

function grow(
  parent: insights.SkillNode,
  x: number,
  y: number,
  angle: number,
  spread: number,
  depth: number,
  rootWeight: number,
  out: TreeLayout,
): void {
  const children = parent.children.filter((c) => c.weight > 0).slice(0, MAX_CHILDREN);
  const total = children.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return;

  // Each child owns an angular sector proportional to its weight, heavier ones in the middle.
  const ordered = centreHeavy(children);
  let cursor = angle - spread / 2;
  for (const child of ordered) {
    const sector = (spread * child.weight) / total;
    // A lone child leans a little instead of growing dead straight.
    const a =
      children.length === 1
        ? angle + jitter(child.id) * 0.3
        : cursor + sector / 2 + jitter(child.id) * 0.06;
    cursor += sector;
    const share = child.weight / rootWeight;
    const length = (95 + 75 * Math.sqrt(share)) * 0.74 ** (depth - 1);
    const width = Math.max(1.5, 12 * Math.sqrt(share) * 0.8 ** (depth - 1));
    const b = branch(child, depth, x, y, a, length, width);
    out.branches.push(b);

    const isTip = depth >= MAX_DEPTH || child.children.length === 0;
    out.leaves.push(leaf(child, b, depth, share, isTip));
    if (!isTip) grow(child, b.x2, b.y2, a, Math.min(spread, Math.PI * 0.75) * 0.7, depth + 1, rootWeight, out);
  }
}

/** Reorders `[a, b, c, d, e]` (heaviest first) to `[d, b, a, c, e]`: the heaviest grows upright. */
export function centreHeavy<T>(items: readonly T[]): T[] {
  const out: T[] = [];
  items.forEach((item, i) => {
    if (i % 2 === 0) out.push(item);
    else out.unshift(item);
  });
  return out;
}

function branch(
  node: insights.SkillNode,
  depth: number,
  x1: number,
  y1: number,
  angle: number,
  length: number,
  width: number,
): TreeBranch {
  const x2 = x1 + Math.cos(angle) * length;
  const y2 = y1 + Math.sin(angle) * length;
  // A slight organic bend, perpendicular to the branch, stable per node.
  const bend = jitter(`${node.id}~`) * length * 0.18;
  const cx = (x1 + x2) / 2 - Math.sin(angle) * bend;
  const cy = (y1 + y2) / 2 + Math.cos(angle) * bend;
  return {
    id: node.id || 'root',
    node,
    depth,
    d: `M${round(x1)} ${round(y1)} Q${round(cx)} ${round(cy)} ${round(x2)} ${round(y2)}`,
    x1: round(x1),
    y1: round(y1),
    x2: round(x2),
    y2: round(y2),
    width: round(width),
  };
}

function leaf(
  node: insights.SkillNode,
  b: TreeBranch,
  depth: number,
  share: number,
  isTip: boolean,
): TreeLeaf {
  const r = round(4 + 3 * Math.min(node.level, 5) * (isTip ? 1 : 0.7));
  const dx = b.x2 - TREE_WIDTH / 2;
  return {
    id: node.id,
    node,
    x: b.x2,
    y: b.y2,
    r,
    depth,
    labelled: depth === 1 || share >= 0.12,
    anchor: Math.abs(dx) < 40 ? 'middle' : dx < 0 ? 'end' : 'start',
  };
}
