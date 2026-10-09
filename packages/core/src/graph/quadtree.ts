/**
 * Point-region quadtree used as the spatial index of the infinite canvas (4.1).
 *
 * The renderer queries it every frame for the nodes inside the viewport (culling) and on every
 * pointer event for the node under the cursor (hit testing), so only visible nodes are drawn and
 * hit tests stay logarithmic with 10 000+ nodes.
 *
 * Design notes:
 * - leaves hold up to `capacity` items and split when they overflow; `maxDepth` stops splitting
 *   so that many coincident points cannot recurse forever;
 * - the root grows (doubling towards the new point) when a point lands outside it, so callers
 *   never have to know the extent of an infinite canvas up front;
 * - removals merge under-filled subtrees back into a single leaf to keep queries tight;
 * - `update` has an O(depth) fast path when a node moves inside its current leaf (dragging).
 */
import type { Id } from '../model.ts';
import { assertFinitePoint } from './geometry.ts';
import type { Rect } from './types.ts';

export interface QuadItem {
  readonly id: Id;
  readonly x: number;
  readonly y: number;
}

export interface QuadTreeOptions {
  /** Initial extent. The tree grows automatically, so this is only a hint. */
  bounds?: Rect;
  /** Items per leaf before it splits (default 16). */
  capacity?: number;
  /** Depth after which leaves stop splitting (default 32). */
  maxDepth?: number;
}

interface QuadNode {
  /** Top-left corner and side of the (square) cell. The cell is half-open: [x, x + size). */
  x: number;
  y: number;
  size: number;
  /** Items of a leaf; `null` for an internal node. */
  items: QuadItem[] | null;
  /** NW, NE, SW, SE children of an internal node; `null` for a leaf. */
  children: QuadNode[] | null;
  /** Number of items in the whole subtree. */
  count: number;
}

const DEFAULT_CAPACITY = 16;
const DEFAULT_MAX_DEPTH = 32;
const DEFAULT_ROOT_SIZE = 1024;

function leaf(x: number, y: number, size: number): QuadNode {
  return { x, y, size, items: [], children: null, count: 0 };
}

function cellContains(node: QuadNode, x: number, y: number): boolean {
  return x >= node.x && x < node.x + node.size && y >= node.y && y < node.y + node.size;
}

function quadrant(node: QuadNode, x: number, y: number): number {
  const half = node.size / 2;
  return (y >= node.y + half ? 2 : 0) + (x >= node.x + half ? 1 : 0);
}

/** Squared distance from (x, y) to the closest point of a cell (0 when inside). */
function distanceSqToCell(node: QuadNode, x: number, y: number): number {
  const x1 = node.x + node.size;
  const y1 = node.y + node.size;
  const dx = x < node.x ? node.x - x : x > x1 ? x - x1 : 0;
  const dy = y < node.y ? node.y - y : y > y1 ? y - y1 : 0;
  return dx * dx + dy * dy;
}

function cellRect(node: QuadNode): Rect {
  return { x: node.x, y: node.y, width: node.size, height: node.size };
}

export class QuadTree {
  readonly capacity: number;
  readonly maxDepth: number;
  #root: QuadNode;
  #items = new Map<Id, QuadItem>();
  /** Whether the root has been positioned (by `bounds` or by the first insertion). */
  #anchored: boolean;

  constructor(options: QuadTreeOptions = {}) {
    this.capacity = Math.max(1, Math.floor(options.capacity ?? DEFAULT_CAPACITY));
    this.maxDepth = Math.max(1, Math.floor(options.maxDepth ?? DEFAULT_MAX_DEPTH));
    const b = options.bounds;
    if (b && b.width >= 0 && b.height >= 0 && Number.isFinite(b.x) && Number.isFinite(b.y)) {
      // Slightly larger than requested so that points on the max edge fall inside.
      const size = Math.max(b.width, b.height, 1) * (1 + 1e-9) + 1e-9;
      this.#root = leaf(b.x, b.y, size);
      this.#anchored = true;
    } else {
      this.#root = leaf(-DEFAULT_ROOT_SIZE / 2, -DEFAULT_ROOT_SIZE / 2, DEFAULT_ROOT_SIZE);
      this.#anchored = false;
    }
  }

  /** Builds a tree sized to the given points in one pass (no root growth). */
  static from(points: Iterable<QuadItem>, options: Omit<QuadTreeOptions, 'bounds'> = {}): QuadTree {
    const list = Array.isArray(points) ? (points as QuadItem[]) : [...points];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of list) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const bounds =
      minX <= maxX && Number.isFinite(minX + maxX + minY + maxY)
        ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
        : undefined;
    const tree = new QuadTree(bounds ? { ...options, bounds } : options);
    for (const p of list) tree.insert(p.id, p.x, p.y);
    return tree;
  }

  get size(): number {
    return this.#items.size;
  }

  /** Current extent of the root cell (grows as points are added). */
  get bounds(): Rect {
    return cellRect(this.#root);
  }

  has(id: Id): boolean {
    return this.#items.has(id);
  }

  get(id: Id): QuadItem | undefined {
    return this.#items.get(id);
  }

  items(): IterableIterator<QuadItem> {
    return this.#items.values();
  }

  clear(): void {
    this.#items.clear();
    const r = this.#root;
    this.#root = leaf(r.x, r.y, r.size);
  }

  /** Adds a point, or moves it when `id` is already indexed. */
  insert(id: Id, x: number, y: number): void {
    assertFinitePoint(x, y);
    if (this.#items.has(id)) {
      this.update(id, x, y);
      return;
    }
    const item: QuadItem = { id, x, y };
    this.#items.set(id, item);
    this.#ensureContains(x, y);
    this.#insertItem(item);
  }

  /** Removes a point. Returns `false` when `id` was not indexed. */
  remove(id: Id): boolean {
    const item = this.#items.get(id);
    if (!item) return false;
    this.#items.delete(id);
    const path: QuadNode[] = [];
    let node = this.#root;
    for (;;) {
      node.count--;
      path.push(node);
      if (!node.children) break;
      node = node.children[quadrant(node, item.x, item.y)] as QuadNode;
    }
    const items = node.items as QuadItem[];
    const index = items.indexOf(item);
    if (index >= 0) {
      items[index] = items[items.length - 1] as QuadItem;
      items.pop();
    }
    // Merge the highest internal ancestor that no longer needs to be split.
    for (const ancestor of path) {
      if (ancestor.children && ancestor.count <= this.capacity) {
        ancestor.items = collect(ancestor, []);
        ancestor.children = null;
        break;
      }
    }
    return true;
  }

  /** Moves an indexed point (inserts it when unknown). */
  update(id: Id, x: number, y: number): void {
    assertFinitePoint(x, y);
    const current = this.#items.get(id);
    if (!current) {
      this.insert(id, x, y);
      return;
    }
    if (current.x === x && current.y === y) return;
    // Fast path: the point stays inside its leaf.
    if (cellContains(this.#root, x, y)) {
      let node = this.#root;
      while (node.children) {
        const q = quadrant(node, current.x, current.y);
        if (q !== quadrant(node, x, y)) break;
        node = node.children[q] as QuadNode;
      }
      if (!node.children) {
        const items = node.items as QuadItem[];
        const index = items.indexOf(current);
        const moved: QuadItem = { id, x, y };
        if (index >= 0) items[index] = moved;
        this.#items.set(id, moved);
        return;
      }
    }
    this.remove(id);
    this.insert(id, x, y);
  }

  /** Every point inside `rect` (borders included) — the viewport culling query. */
  queryRect(rect: Rect, out: QuadItem[] = []): QuadItem[] {
    const minX = rect.x;
    const minY = rect.y;
    const maxX = rect.x + rect.width;
    const maxY = rect.y + rect.height;
    const stack: QuadNode[] = [this.#root];
    while (stack.length > 0) {
      const node = stack.pop() as QuadNode;
      if (node.count === 0) continue;
      const nx1 = node.x + node.size;
      const ny1 = node.y + node.size;
      if (node.x > maxX || nx1 < minX || node.y > maxY || ny1 < minY) continue;
      if (node.x >= minX && nx1 <= maxX && node.y >= minY && ny1 <= maxY) {
        collect(node, out);
        continue;
      }
      if (node.children) {
        for (const child of node.children) stack.push(child);
      } else {
        for (const item of node.items as QuadItem[]) {
          if (item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY) out.push(item);
        }
      }
    }
    return out;
  }

  /** Every point within `radius` of (x, y). */
  queryRadius(x: number, y: number, radius: number, out: QuadItem[] = []): QuadItem[] {
    if (!(radius >= 0)) return out;
    const r2 = radius * radius;
    const stack: QuadNode[] = [this.#root];
    while (stack.length > 0) {
      const node = stack.pop() as QuadNode;
      if (node.count === 0 || distanceSqToCell(node, x, y) > r2) continue;
      if (node.children) {
        for (const child of node.children) stack.push(child);
      } else {
        for (const item of node.items as QuadItem[]) {
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= r2) out.push(item);
        }
      }
    }
    return out;
  }

  /**
   * Closest point to (x, y) within `maxDistance` — the hit-testing query. `accept` can skip
   * points (hidden or locked nodes) without rebuilding the index. Ties keep the first found.
   */
  nearest(
    x: number,
    y: number,
    maxDistance = Infinity,
    accept?: (item: QuadItem) => boolean,
  ): QuadItem | undefined {
    let best: QuadItem | undefined;
    let bestD2 = maxDistance === Infinity ? Infinity : maxDistance * maxDistance;
    const stack: QuadNode[] = [this.#root];
    const order: Array<{ node: QuadNode; d2: number }> = [];
    while (stack.length > 0) {
      const node = stack.pop() as QuadNode;
      if (node.count === 0 || distanceSqToCell(node, x, y) > bestD2) continue;
      if (node.children) {
        // Push the closest child last so it is explored first and tightens the bound early.
        order.length = 0;
        for (const child of node.children) {
          if (child.count > 0) order.push({ node: child, d2: distanceSqToCell(child, x, y) });
        }
        order.sort((a, b) => b.d2 - a.d2);
        for (const entry of order) stack.push(entry.node);
      } else {
        for (const item of node.items as QuadItem[]) {
          const dx = item.x - x;
          const dy = item.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= bestD2 && (d2 < bestD2 || !best) && (!accept || accept(item))) {
            best = item;
            bestD2 = d2;
          }
        }
      }
    }
    return best;
  }

  /** Maximum depth currently reached — exposed for tests and diagnostics. */
  depth(): number {
    let max = 0;
    const stack: Array<[QuadNode, number]> = [[this.#root, 0]];
    while (stack.length > 0) {
      const [node, d] = stack.pop() as [QuadNode, number];
      if (d > max) max = d;
      if (node.children) for (const child of node.children) stack.push([child, d + 1]);
    }
    return max;
  }

  #ensureContains(x: number, y: number): void {
    if (!this.#anchored || (this.#root.count === 0 && !cellContains(this.#root, x, y))) {
      const size = this.#root.size;
      this.#root = leaf(x - size / 2, y - size / 2, size);
      this.#anchored = true;
      return;
    }
    while (!cellContains(this.#root, x, y)) {
      const old = this.#root;
      const size = old.size;
      const growLeft = x < old.x;
      const growUp = y < old.y;
      const nx = growLeft ? old.x - size : old.x;
      const ny = growUp ? old.y - size : old.y;
      const parent: QuadNode = {
        x: nx,
        y: ny,
        size: size * 2,
        items: null,
        children: [leaf(nx, ny, size), leaf(nx + size, ny, size), leaf(nx, ny + size, size), leaf(nx + size, ny + size, size)],
        count: old.count,
      };
      (parent.children as QuadNode[])[(growUp ? 2 : 0) + (growLeft ? 1 : 0)] = old;
      this.#root = parent;
    }
  }

  #insertItem(item: QuadItem): void {
    let node = this.#root;
    let depth = 0;
    for (;;) {
      node.count++;
      if (node.children) {
        node = node.children[quadrant(node, item.x, item.y)] as QuadNode;
        depth++;
        continue;
      }
      const items = node.items as QuadItem[];
      items.push(item);
      if (items.length > this.capacity && depth < this.maxDepth) this.#split(node, depth);
      return;
    }
  }

  #split(node: QuadNode, depth: number): void {
    const half = node.size / 2;
    const children = [
      leaf(node.x, node.y, half),
      leaf(node.x + half, node.y, half),
      leaf(node.x, node.y + half, half),
      leaf(node.x + half, node.y + half, half),
    ];
    for (const item of node.items as QuadItem[]) {
      const child = children[quadrant(node, item.x, item.y)] as QuadNode;
      (child.items as QuadItem[]).push(item);
      child.count++;
    }
    node.items = null;
    node.children = children;
    // Clustered points can all land in one child: keep splitting while it overflows.
    if (depth + 1 < this.maxDepth) {
      for (const child of children) {
        if (child.count > this.capacity) this.#split(child, depth + 1);
      }
    }
  }
}

function collect(node: QuadNode, out: QuadItem[]): QuadItem[] {
  const stack: QuadNode[] = [node];
  while (stack.length > 0) {
    const n = stack.pop() as QuadNode;
    if (n.children) for (const child of n.children) stack.push(child);
    else for (const item of n.items as QuadItem[]) out.push(item);
  }
  return out;
}
