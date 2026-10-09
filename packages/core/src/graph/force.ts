/**
 * Force-directed layout (4.2): Fruchterman–Reingold with a Barnes–Hut approximation.
 *
 * - Repulsion between every pair of nodes is `k² / d`, attraction along each edge is `d² / k`,
 *   so two linked nodes rest at the ideal edge length `k`.
 * - Repulsion is approximated with a Barnes–Hut quadtree rebuilt every step: a far-away cell
 *   (side / distance < θ) acts as one body at its centre of mass, which brings a step from
 *   O(n²) down to O(n log n). `theta: 0` gives the exact O(n²) computation.
 * - A linear gravity towards a centre keeps disconnected components together on an infinite
 *   canvas (Fruchterman–Reingold originally used a bounded frame instead).
 * - Each step moves a node by at most the current temperature, which cools geometrically
 *   so that the simulation settles after `iterations` steps. The UI can call `step()` once per
 *   animation frame to show the graph untangling, or `layout()` for a one-shot result.
 *
 * Everything is deterministic for a given graph and seed: the only randomness (initial
 * scattering of coincident nodes) comes from a seeded PRNG.
 */
import type { Id } from '../model.ts';
import { applyPositions } from './positions.ts';
import { createRandom, hashPair } from './random.ts';
import type { GraphLike, Point } from './types.ts';

export interface ForceLayoutOptions {
  /** Seed of the PRNG used to scatter coincident nodes (default 1). */
  seed?: number;
  /** Length of the cooling schedule: the layout is settled after this many steps (default 300). */
  iterations?: number;
  /** Ideal edge length `k`, in world units (default 120). */
  edgeLength?: number;
  /** Barnes–Hut opening angle; lower is more accurate and slower, 0 is exact (default 0.8). */
  theta?: number;
  /** Strength of the pull towards `center` (default 0.05). 0 disables gravity. */
  gravity?: number;
  /** Gravity centre (default: centroid of the initial positions). */
  center?: Point;
  /** Nodes that never move (they still push and pull the others). */
  pinned?: Iterable<Id>;
  /** Maximum displacement per step at the start (default `k · max(1, √n / 4)`). */
  temperature?: number;
  /** Temperature reached at the end of the schedule (default `k / 200`). */
  minTemperature?: number;
  /**
   * Scatter every non-pinned node at random first (default false: keep current positions and
   * only spread nodes that share the exact same position, e.g. freshly created ones).
   */
  randomize?: boolean;
  /** The layout settles early once no node moves more than this in a step (default `k / 1000`). */
  tolerance?: number;
}

export interface ForceLayout {
  /** Ids of the laid-out nodes, in graph order (duplicate ids are kept once). */
  readonly ids: readonly Id[];
  /** Current positions. The map and its points are updated in place after each step. */
  readonly positions: ReadonlyMap<Id, Readonly<Point>>;
  /** Sum of the squared displacements of the last step (`Infinity` before the first step). */
  readonly energy: number;
  /** `true` once the schedule is over or the layout reached equilibrium. */
  readonly settled: boolean;
  /** Steps performed since creation or the last `reheat`. */
  readonly iteration: number;
  /** Current maximum displacement per step. */
  readonly temperature: number;
  /** Runs up to `count` steps (default 1), stopping early when settled. Returns `settled`. */
  step(count?: number): boolean;
  /** Moves a node (e.g. while it is dragged). Unknown ids are ignored. */
  setPosition(id: Id, x: number, y: number): void;
  /** Freezes a node, optionally at a new position. */
  pin(id: Id, x?: number, y?: number): void;
  unpin(id: Id): void;
  isPinned(id: Id): boolean;
  /** Restarts the cooling schedule (after a drag or an edit), at `temperature` if given. */
  reheat(temperature?: number): void;
  /** Writes the current positions into a copy of `graph`. */
  apply<G extends GraphLike>(graph: G): G;
}

const MAX_DEPTH = 40;

/**
 * Barnes–Hut quadtree over flat typed arrays, rebuilt every step without allocating.
 * Cells are allocated in blocks of four children after their parent, so a reverse sweep over
 * cell indices aggregates masses bottom-up.
 */
class BarnesHutTree {
  #cap = 0;
  #count = 0;
  #x0 = new Float64Array(0);
  #y0 = new Float64Array(0);
  #size = new Float64Array(0);
  #mass = new Float64Array(0);
  #cx = new Float64Array(0);
  #cy = new Float64Array(0);
  #firstChild = new Int32Array(0);
  #body = new Int32Array(0);
  #next = new Int32Array(0);
  #stack = new Int32Array(4 * (MAX_DEPTH + 2));

  build(xs: Float64Array, ys: Float64Array, n: number): void {
    if (this.#next.length < n) this.#next = new Int32Array(n);
    this.#count = 0;
    if (n === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = xs[i] as number;
      const y = ys[i] as number;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const extent = Math.max(maxX - minX, maxY - minY);
    // Pad so that the max coordinates fall strictly inside the half-open root cell.
    const side = extent * (1 + 1e-6) + 1e-6 * Math.max(1, Math.abs(minX), Math.abs(minY));
    const root = this.#alloc(1);
    this.#x0[root] = minX;
    this.#y0[root] = minY;
    this.#size[root] = side;
    for (let i = 0; i < n; i++) this.#insert(i, xs[i] as number, ys[i] as number, xs, ys);
    this.#aggregate(xs, ys);
  }

  /** Adds the repulsion felt by body `i` to `fx[i]`, `fy[i]`. */
  repulse(
    i: number,
    xs: Float64Array,
    ys: Float64Array,
    k2: number,
    theta2: number,
    fx: Float64Array,
    fy: Float64Array,
  ): void {
    if (this.#count === 0) return;
    const xi = xs[i] as number;
    const yi = ys[i] as number;
    const eps2 = k2 * 1e-12;
    const stack = this.#stack;
    let sx = 0;
    let sy = 0;
    let sp = 0;
    stack[sp++] = 0;
    while (sp > 0) {
      const c = stack[--sp] as number;
      const m = this.#mass[c] as number;
      if (m === 0) continue;
      const fc = this.#firstChild[c] as number;
      if (fc === -1) {
        for (let j = this.#body[c] as number; j !== -1; j = this.#next[j] as number) {
          if (j === i) continue;
          const dx = xi - (xs[j] as number);
          const dy = yi - (ys[j] as number);
          const d2 = dx * dx + dy * dy;
          if (d2 > eps2) {
            const f = k2 / d2;
            sx += dx * f;
            sy += dy * f;
          } else {
            // Coincident bodies: push them apart along a deterministic, antisymmetric direction.
            const angle = (hashPair(Math.min(i, j), Math.max(i, j)) / 4294967296) * 2 * Math.PI;
            const sign = i < j ? 1 : -1;
            const f = Math.sqrt(k2);
            sx += sign * Math.cos(angle) * f;
            sy += sign * Math.sin(angle) * f;
          }
        }
        continue;
      }
      const dx = xi - (this.#cx[c] as number);
      const dy = yi - (this.#cy[c] as number);
      const d2 = dx * dx + dy * dy;
      const s = this.#size[c] as number;
      const x0 = this.#x0[c] as number;
      const y0 = this.#y0[c] as number;
      const inside = xi >= x0 && xi < x0 + s && yi >= y0 && yi < y0 + s;
      if (!inside && d2 > eps2 && s * s < theta2 * d2) {
        const f = (m * k2) / d2;
        sx += dx * f;
        sy += dy * f;
      } else {
        stack[sp++] = fc;
        stack[sp++] = fc + 1;
        stack[sp++] = fc + 2;
        stack[sp++] = fc + 3;
      }
    }
    fx[i] = (fx[i] as number) + sx;
    fy[i] = (fy[i] as number) + sy;
  }

  #alloc(cells: number): number {
    const base = this.#count;
    const needed = base + cells;
    if (needed > this.#cap) {
      const cap = Math.max(needed, this.#cap * 2, 64);
      const grow = (a: Float64Array): Float64Array => {
        const b = new Float64Array(cap);
        b.set(a.subarray(0, base));
        return b;
      };
      const growInt = (a: Int32Array): Int32Array => {
        const b = new Int32Array(cap);
        b.set(a.subarray(0, base));
        return b;
      };
      this.#x0 = grow(this.#x0);
      this.#y0 = grow(this.#y0);
      this.#size = grow(this.#size);
      this.#mass = new Float64Array(cap);
      this.#cx = new Float64Array(cap);
      this.#cy = new Float64Array(cap);
      this.#firstChild = growInt(this.#firstChild);
      this.#body = growInt(this.#body);
      this.#cap = cap;
    }
    for (let c = base; c < needed; c++) {
      this.#firstChild[c] = -1;
      this.#body[c] = -1;
    }
    this.#count = needed;
    return base;
  }

  #insert(i: number, x: number, y: number, xs: Float64Array, ys: Float64Array): void {
    let c = 0;
    let depth = 0;
    for (;;) {
      const fc = this.#firstChild[c] as number;
      if (fc !== -1) {
        c = fc + this.#quadrant(c, x, y);
        depth++;
        continue;
      }
      const head = this.#body[c] as number;
      if (head === -1) {
        this.#body[c] = i;
        this.#next[i] = -1;
        return;
      }
      if (depth >= MAX_DEPTH || (xs[head] === x && ys[head] === y)) {
        this.#next[i] = head;
        this.#body[c] = i;
        return;
      }
      // Split the leaf; its bodies are all coincident, so they move to a single child.
      const half = (this.#size[c] as number) / 2;
      const x0 = this.#x0[c] as number;
      const y0 = this.#y0[c] as number;
      const base = this.#alloc(4);
      for (let q = 0; q < 4; q++) {
        this.#x0[base + q] = x0 + (q & 1) * half;
        this.#y0[base + q] = y0 + (q >> 1) * half;
        this.#size[base + q] = half;
      }
      this.#firstChild[c] = base;
      this.#body[base + this.#quadrant(c, xs[head] as number, ys[head] as number)] = head;
      this.#body[c] = -1;
    }
  }

  #quadrant(c: number, x: number, y: number): number {
    const half = (this.#size[c] as number) / 2;
    return (
      (y >= (this.#y0[c] as number) + half ? 2 : 0) + (x >= (this.#x0[c] as number) + half ? 1 : 0)
    );
  }

  #aggregate(xs: Float64Array, ys: Float64Array): void {
    for (let c = this.#count - 1; c >= 0; c--) {
      let m = 0;
      let sx = 0;
      let sy = 0;
      const fc = this.#firstChild[c] as number;
      if (fc === -1) {
        for (let j = this.#body[c] as number; j !== -1; j = this.#next[j] as number) {
          m++;
          sx += xs[j] as number;
          sy += ys[j] as number;
        }
      } else {
        for (let q = fc; q < fc + 4; q++) {
          const cm = this.#mass[q] as number;
          if (cm === 0) continue;
          m += cm;
          sx += cm * (this.#cx[q] as number);
          sy += cm * (this.#cy[q] as number);
        }
      }
      this.#mass[c] = m;
      this.#cx[c] = m > 0 ? sx / m : 0;
      this.#cy[c] = m > 0 ? sy / m : 0;
    }
  }
}

class ForceSimulation implements ForceLayout {
  readonly ids: readonly Id[];
  readonly #index: Map<Id, number>;
  readonly #n: number;
  readonly #xs: Float64Array;
  readonly #ys: Float64Array;
  readonly #fx: Float64Array;
  readonly #fy: Float64Array;
  readonly #pinned: Uint8Array;
  readonly #edges: Int32Array;
  readonly #tree = new BarnesHutTree();
  readonly #k: number;
  readonly #theta2: number;
  readonly #gravity: number;
  readonly #center: Point;
  readonly #iterations: number;
  readonly #t0: number;
  readonly #tMin: number;
  readonly #tolerance: number;
  readonly #positions = new Map<Id, Point>();
  #cooling: number;
  #t: number;
  #iteration = 0;
  #energy = Infinity;
  #settled = false;
  #dirty = true;

  constructor(graph: GraphLike, options: ForceLayoutOptions) {
    const ids: Id[] = [];
    const index = new Map<Id, number>();
    for (const node of graph.nodes) {
      if (index.has(node.id)) continue;
      index.set(node.id, ids.length);
      ids.push(node.id);
    }
    const n = ids.length;
    this.ids = ids;
    this.#index = index;
    this.#n = n;
    this.#xs = new Float64Array(n);
    this.#ys = new Float64Array(n);
    this.#fx = new Float64Array(n);
    this.#fy = new Float64Array(n);
    this.#pinned = new Uint8Array(n);

    const k = positive(options.edgeLength, 120);
    this.#k = k;
    const theta = Math.max(0, options.theta ?? 0.8);
    this.#theta2 = theta * theta;
    this.#gravity = Math.max(0, options.gravity ?? 0.05);
    this.#iterations = Math.max(1, Math.floor(options.iterations ?? 300));
    this.#t0 = positive(options.temperature, k * Math.max(1, Math.sqrt(n) / 4));
    this.#tMin = Math.min(this.#t0, positive(options.minTemperature, k / 200));
    this.#tolerance = Math.max(0, options.tolerance ?? k / 1000);
    this.#cooling = Math.pow(this.#tMin / this.#t0, 1 / this.#iterations);
    this.#t = this.#t0;

    for (const id of options.pinned ?? []) {
      const i = index.get(id);
      if (i !== undefined) this.#pinned[i] = 1;
    }

    const edges: number[] = [];
    for (const edge of graph.edges) {
      const a = index.get(edge.from);
      const b = index.get(edge.to);
      if (a === undefined || b === undefined || a === b) continue;
      edges.push(a, b);
    }
    this.#edges = Int32Array.from(edges);

    this.#initPositions(graph, options);
    this.#center = options.center ? { ...options.center } : this.#centroid();
    if (n === 0) this.#settled = true;
  }

  get positions(): ReadonlyMap<Id, Readonly<Point>> {
    if (this.#dirty) {
      for (let i = 0; i < this.#n; i++) {
        const id = this.ids[i] as Id;
        const p = this.#positions.get(id);
        const x = this.#xs[i] as number;
        const y = this.#ys[i] as number;
        if (p) {
          p.x = x;
          p.y = y;
        } else this.#positions.set(id, { x, y });
      }
      this.#dirty = false;
    }
    return this.#positions;
  }

  get energy(): number {
    return this.#energy;
  }

  get settled(): boolean {
    return this.#settled;
  }

  get iteration(): number {
    return this.#iteration;
  }

  get temperature(): number {
    return this.#t;
  }

  step(count = 1): boolean {
    for (let s = 0; s < count && !this.#settled; s++) this.#tick();
    return this.#settled;
  }

  setPosition(id: Id, x: number, y: number): void {
    const i = this.#index.get(id);
    if (i === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return;
    this.#xs[i] = x;
    this.#ys[i] = y;
    this.#dirty = true;
  }

  pin(id: Id, x?: number, y?: number): void {
    const i = this.#index.get(id);
    if (i === undefined) return;
    this.#pinned[i] = 1;
    if (x !== undefined && y !== undefined) this.setPosition(id, x, y);
  }

  unpin(id: Id): void {
    const i = this.#index.get(id);
    if (i !== undefined) this.#pinned[i] = 0;
  }

  isPinned(id: Id): boolean {
    const i = this.#index.get(id);
    return i !== undefined && this.#pinned[i] === 1;
  }

  reheat(temperature?: number): void {
    this.#t = positive(temperature, this.#t0);
    this.#cooling = Math.pow(Math.min(this.#tMin, this.#t) / this.#t, 1 / this.#iterations);
    this.#iteration = 0;
    this.#settled = this.#n === 0;
  }

  apply<G extends GraphLike>(graph: G): G {
    return applyPositions(graph, this.positions);
  }

  #tick(): void {
    const n = this.#n;
    const xs = this.#xs;
    const ys = this.#ys;
    const fx = this.#fx;
    const fy = this.#fy;
    const pinned = this.#pinned;
    const k = this.#k;
    const k2 = k * k;
    fx.fill(0);
    fy.fill(0);

    // Repulsion (Barnes–Hut). Pinned nodes are in the tree but their own forces are useless.
    this.#tree.build(xs, ys, n);
    for (let i = 0; i < n; i++) {
      if (pinned[i] === 0) this.#tree.repulse(i, xs, ys, k2, this.#theta2, fx, fy);
    }

    // Attraction along edges: d² / k, i.e. the vector (b - a) · d / k.
    const edges = this.#edges;
    for (let e = 0; e < edges.length; e += 2) {
      const a = edges[e] as number;
      const b = edges[e + 1] as number;
      const dx = (xs[b] as number) - (xs[a] as number);
      const dy = (ys[b] as number) - (ys[a] as number);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d === 0) continue;
      const f = d / k;
      fx[a] = (fx[a] as number) + dx * f;
      fy[a] = (fy[a] as number) + dy * f;
      fx[b] = (fx[b] as number) - dx * f;
      fy[b] = (fy[b] as number) - dy * f;
    }

    // Gravity and displacement capped by the temperature.
    const g = this.#gravity;
    const cx = this.#center.x;
    const cy = this.#center.y;
    const t = this.#t;
    let energy = 0;
    let maxMove = 0;
    for (let i = 0; i < n; i++) {
      if (pinned[i] === 1) continue;
      const x = xs[i] as number;
      const y = ys[i] as number;
      const dx = (fx[i] as number) + (cx - x) * g;
      const dy = (fy[i] as number) + (cy - y) * g;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0 || !Number.isFinite(len)) continue;
      const move = Math.min(len, t);
      xs[i] = x + (dx / len) * move;
      ys[i] = y + (dy / len) * move;
      energy += move * move;
      if (move > maxMove) maxMove = move;
    }

    this.#energy = energy;
    this.#iteration++;
    this.#t *= this.#cooling;
    this.#dirty = true;
    if (this.#iteration >= this.#iterations || maxMove <= this.#tolerance) this.#settled = true;
  }

  #initPositions(graph: GraphLike, options: ForceLayoutOptions): void {
    const n = this.#n;
    const k = this.#k;
    const random = createRandom(options.seed ?? 1);
    const seen = new Set<Id>();
    let sumX = 0;
    let sumY = 0;
    let finite = 0;
    for (const node of graph.nodes) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      const i = this.#index.get(node.id) as number;
      const ok = Number.isFinite(node.x) && Number.isFinite(node.y);
      this.#xs[i] = ok ? node.x : NaN;
      this.#ys[i] = ok ? node.y : NaN;
      if (ok) {
        sumX += node.x;
        sumY += node.y;
        finite++;
      }
    }
    const ox = finite > 0 ? sumX / finite : 0;
    const oy = finite > 0 ? sumY / finite : 0;
    const scatter = (i: number, cx: number, cy: number, radius: number): void => {
      const r = radius * Math.sqrt(random());
      const a = random() * 2 * Math.PI;
      this.#xs[i] = cx + r * Math.cos(a);
      this.#ys[i] = cy + r * Math.sin(a);
    };

    if (options.randomize) {
      const radius = (k * Math.sqrt(n)) / 2;
      for (let i = 0; i < n; i++) {
        if (this.#pinned[i] === 0 || Number.isNaN(this.#xs[i])) scatter(i, ox, oy, radius);
      }
      return;
    }

    // Keep positions; spread nodes that share a position (or have none) around it.
    const groups = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const x = this.#xs[i] as number;
      const key = Number.isNaN(x) ? 'none' : `${x},${this.#ys[i]}`;
      const group = groups.get(key);
      if (group) group.push(i);
      else groups.set(key, [i]);
    }
    for (const [key, group] of groups) {
      const free = key === 'none' ? group : group.filter((i) => this.#pinned[i] === 0);
      const anchored = key !== 'none' && free.length < group.length;
      // The first node (or a pinned one) keeps the spot; the others are scattered around it.
      const movers = key === 'none' || anchored ? free : free.slice(1);
      if (movers.length === 0) continue;
      const cx = key === 'none' ? ox : (this.#xs[group[0] as number] as number);
      const cy = key === 'none' ? oy : (this.#ys[group[0] as number] as number);
      const radius = (k * Math.sqrt(movers.length + 1)) / 2;
      for (const i of movers) scatter(i, cx, cy, radius);
    }
  }

  #centroid(): Point {
    if (this.#n === 0) return { x: 0, y: 0 };
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < this.#n; i++) {
      sx += this.#xs[i] as number;
      sy += this.#ys[i] as number;
    }
    return { x: sx / this.#n, y: sy / this.#n };
  }
}

function positive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Incremental layout: call `step()` once per animation frame until `settled`. */
export function createLayout(graph: GraphLike, options: ForceLayoutOptions = {}): ForceLayout {
  return new ForceSimulation(graph, options);
}

/** One-shot layout: runs the whole cooling schedule and returns the graph with new positions. */
export function layout<G extends GraphLike>(graph: G, options: ForceLayoutOptions = {}): G {
  const simulation = new ForceSimulation(graph, options);
  simulation.step(Number.POSITIVE_INFINITY);
  return simulation.apply(graph);
}
