import type { Id } from '@pouxis/core';

/**
 * Freehand ink (4.6). Points are world coordinates with a pressure in [0, 1]. Input is
 * stabilised while drawing (exponential smoothing), simplified when the stroke ends
 * (Ramer–Douglas–Peucker) and rendered as a filled outline whose width follows pressure.
 */
export interface InkPoint {
  x: number;
  y: number;
  /** Pointer pressure, 0…1 (mouse reports 0.5 while pressed). */
  p: number;
}

export interface Stroke {
  id: Id;
  points: InkPoint[];
  /** Base width in world units at pressure 0.5. */
  width: number;
  /** 0 = ink colour, 1…8 = category palette. */
  color: number;
}

/** Normalises pointer pressure: devices without pressure report 0 or 0.5. */
export function normalisePressure(pressure: number, pointerType: string): number {
  if (pointerType !== 'pen' || !Number.isFinite(pressure) || pressure <= 0) return 0.5;
  return Math.min(1, pressure);
}

/**
 * Appends a raw sample, pulled towards the previous point by `smoothing` (0 = raw, 0.9 = very
 * steady). Samples closer than `minDistance` are dropped. Returns whether a point was added.
 */
export function addInkPoint(
  points: InkPoint[],
  raw: InkPoint,
  smoothing = 0.45,
  minDistance = 0.75,
): boolean {
  const last = points[points.length - 1];
  if (!last) {
    points.push({ ...raw });
    return true;
  }
  const k = Math.min(0.95, Math.max(0, smoothing));
  const x = last.x + (raw.x - last.x) * (1 - k);
  const y = last.y + (raw.y - last.y) * (1 - k);
  if (Math.hypot(x - last.x, y - last.y) < minDistance) return false;
  points.push({ x, y, p: last.p + (raw.p - last.p) * 0.5 });
  return true;
}

/** Ramer–Douglas–Peucker, iterative. Keeps end points and the pressure of kept samples. */
export function simplify(points: readonly InkPoint[], tolerance: number): InkPoint[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length > 0) {
    const [a, b] = stack.pop() as [number, number];
    const pa = points[a] as InkPoint;
    const pb = points[b] as InkPoint;
    let worst = -1;
    let worstD = tol2;
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistanceSq(points[i] as InkPoint, pa, pb);
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst < 0) continue;
    keep[worst] = 1;
    stack.push([a, worst], [worst, b]);
  }
  return points.filter((_, i) => keep[i] === 1);
}

export function segmentDistanceSq(p: InkPoint | { x: number; y: number }, a: InkPoint, b: InkPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const x = a.x + t * dx - p.x;
  const y = a.y + t * dy - p.y;
  return x * x + y * y;
}

/** Half-width at a sample: pressure 0.5 gives `width / 2`, from 35 % to 165 %. */
export function halfWidthAt(point: InkPoint, width: number): number {
  return (width / 2) * (0.35 + 1.3 * point.p);
}

/**
 * Closed outline of a variable-width stroke: left offsets forward, then right offsets back.
 * A single point yields a small diamond so a tap still leaves a dot.
 */
export function strokeOutline(points: readonly InkPoint[], width: number): { x: number; y: number }[] {
  const first = points[0];
  if (!first) return [];
  if (points.length === 1) {
    const r = halfWidthAt(first, width);
    return [
      { x: first.x, y: first.y - r },
      { x: first.x + r, y: first.y },
      { x: first.x, y: first.y + r },
      { x: first.x - r, y: first.y },
    ];
  }
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as InkPoint;
    const prev = points[Math.max(0, i - 1)] as InkPoint;
    const next = points[Math.min(points.length - 1, i + 1)] as InkPoint;
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const r = halfWidthAt(p, width);
    left.push({ x: p.x - ty * r, y: p.y + tx * r });
    right.push({ x: p.x + ty * r, y: p.y - tx * r });
  }
  return [...left, ...right.reverse()];
}

/** SVG path data for an outline, smoothed with quadratic curves through edge midpoints. */
export function outlinePath(outline: readonly { x: number; y: number }[]): string {
  const n = outline.length;
  if (n === 0) return '';
  const r = (v: number) => Math.round(v * 100) / 100;
  const at = (i: number) => outline[i % n] as { x: number; y: number };
  const mid = (i: number) => ({ x: (at(i).x + at(i + 1).x) / 2, y: (at(i).y + at(i + 1).y) / 2 });
  const start = mid(0);
  let d = `M${r(start.x)} ${r(start.y)}`;
  for (let i = 1; i <= n; i++) {
    const c = at(i);
    const m = mid(i);
    d += `Q${r(c.x)} ${r(c.y)} ${r(m.x)} ${r(m.y)}`;
  }
  return `${d}Z`;
}

export function strokeBounds(stroke: Stroke): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of stroke.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
  const pad = stroke.width;
  return { x: minX - pad, y: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad };
}

/** Whether the eraser circle at `(x, y)` with `radius` touches the stroke. */
export function hitStroke(stroke: Stroke, x: number, y: number, radius: number): boolean {
  const pts = stroke.points;
  const reach = radius + stroke.width;
  const reach2 = reach * reach;
  if (pts.length === 1) {
    const p = pts[0] as InkPoint;
    return (p.x - x) ** 2 + (p.y - y) ** 2 <= reach2;
  }
  for (let i = 1; i < pts.length; i++) {
    if (segmentDistanceSq({ x, y }, pts[i - 1] as InkPoint, pts[i] as InkPoint) <= reach2) return true;
  }
  return false;
}
