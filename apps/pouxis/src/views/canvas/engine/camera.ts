import type { graph } from '@pouxis/core';

type Viewport = graph.Viewport;
type Rect = graph.Rect;
type Size = graph.Size;

/** Ease-in-out cubic: continuous speed at both ends, for camera moves across the canvas. */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Viewport between `a` and `b` at progress `t`. The zoom is interpolated geometrically (a 1→4
 * zoom feels as long as 4→16) and the screen centre linearly in world space, so the camera
 * glides instead of swinging around the top-left corner.
 */
export function interpolateViewport(a: Viewport, b: Viewport, t: number, size: Size): Viewport {
  const k = Math.min(1, Math.max(0, t));
  const zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * k);
  const ca = centerOf(a, size);
  const cb = centerOf(b, size);
  const cx = ca.x + (cb.x - ca.x) * k;
  const cy = ca.y + (cb.y - ca.y) * k;
  return { x: cx - size.width / 2 / zoom, y: cy - size.height / 2 / zoom, zoom };
}

export function centerOf(vp: Viewport, size: Size): { x: number; y: number } {
  return { x: vp.x + size.width / 2 / vp.zoom, y: vp.y + size.height / 2 / vp.zoom };
}

export interface CameraTween {
  from: Viewport;
  to: Viewport;
  start: number;
  duration: number;
}

/** Viewport of a running tween at time `now`, and whether it is finished. */
export function tweenAt(
  tween: CameraTween,
  now: number,
  size: Size,
): { vp: Viewport; done: boolean } {
  if (tween.duration <= 0) return { vp: tween.to, done: true };
  const t = (now - tween.start) / tween.duration;
  if (t >= 1) return { vp: tween.to, done: true };
  return { vp: interpolateViewport(tween.from, tween.to, easeInOut(t), size), done: false };
}

/** A presentation stop: the world rectangle to frame, independent of the screen size. */
export interface Waypoint {
  id: string;
  rect: Rect;
}

/** Whether two viewports are visually identical (avoids no-op tweens). */
export function sameViewport(a: Viewport, b: Viewport): boolean {
  return (
    Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.zoom - b.zoom) < 1e-4
  );
}
