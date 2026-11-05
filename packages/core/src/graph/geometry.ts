/**
 * Small, allocation-light rectangle helpers shared by the spatial index, the viewport maths and
 * the exporters. All rectangles are closed: a point on the border is inside.
 */
import type { Point, Rect } from './types.ts';

export const EMPTY_RECT: Readonly<Rect> = Object.freeze({ x: 0, y: 0, width: 0, height: 0 });

export function rectContainsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  );
}

/** Smallest rectangle containing both `a` and `b`. */
export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

/** Grows (or, with a negative margin, shrinks) a rectangle on every side; never below 0 × 0. */
export function inflateRect(rect: Rect, margin: number): Rect {
  const width = Math.max(0, rect.width + 2 * margin);
  const height = Math.max(0, rect.height + 2 * margin);
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

/** Bounding rectangle of a set of points; `EMPTY_RECT` (a copy) when there are none. */
export function boundsOfPoints(points: Iterable<Point>): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (minX === Infinity) return { ...EMPTY_RECT };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Squared distance from a point to the closest point of a rectangle (0 when inside). */
export function distanceSqToRect(rect: Rect, x: number, y: number): number {
  const dx = x < rect.x ? rect.x - x : x > rect.x + rect.width ? x - rect.x - rect.width : 0;
  const dy = y < rect.y ? rect.y - y : y > rect.y + rect.height ? y - rect.y - rect.height : 0;
  return dx * dx + dy * dy;
}

export function assertFinitePoint(x: number, y: number, what = 'point'): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError(`${what} must have finite coordinates (got ${x}, ${y})`);
  }
}
