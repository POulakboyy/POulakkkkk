/**
 * Camera maths of the infinite canvas (4.1, 4.13): world ↔ screen transforms, zoom around the
 * pointer, "fit to content" and the minimap.
 *
 * A `Viewport` is `{ x, y, zoom }` where `(x, y)` is the world point drawn at the top-left corner
 * of the screen: `screen = (world - (x, y)) · zoom`. It maps to a CSS
 * `transform: scale(zoom) translate(-x, -y)` (or the equivalent WebGL matrix).
 */
import { boundsOfPoints, inflateRect, unionRect } from './geometry.ts';
import type { GraphLike, Point, Rect, Size } from './types.ts';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ZoomLimits {
  /** Default 0.02 — far enough to see 10 000 nodes at once. */
  minZoom?: number;
  /** Default 8. */
  maxZoom?: number;
}

export const DEFAULT_MIN_ZOOM = 0.02;
export const DEFAULT_MAX_ZOOM = 8;

export function clampZoom(zoom: number, limits: ZoomLimits = {}): number {
  const min = limits.minZoom ?? DEFAULT_MIN_ZOOM;
  const max = Math.max(min, limits.maxZoom ?? DEFAULT_MAX_ZOOM);
  if (!Number.isFinite(zoom)) return zoom > 0 ? max : min;
  return Math.min(max, Math.max(min, zoom));
}

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return { x: (point.x - viewport.x) * viewport.zoom, y: (point.y - viewport.y) * viewport.zoom };
}

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return { x: point.x / viewport.zoom + viewport.x, y: point.y / viewport.zoom + viewport.y };
}

/** World rectangle covered by a screen of `size` — the culling query for the spatial index. */
export function visibleWorldRect(viewport: Viewport, size: Size, margin = 0): Rect {
  const rect = {
    x: viewport.x,
    y: viewport.y,
    width: size.width / viewport.zoom,
    height: size.height / viewport.zoom,
  };
  return margin === 0 ? rect : inflateRect(rect, margin / viewport.zoom);
}

/**
 * Multiplies the zoom by `factor` while keeping the world point under `screenPoint` fixed —
 * pinch and Ctrl + wheel zoom towards the fingers / the cursor.
 */
export function zoomAround(
  viewport: Viewport,
  screenPoint: Point,
  factor: number,
  limits: ZoomLimits = {},
): Viewport {
  const zoom = clampZoom(viewport.zoom * factor, limits);
  if (zoom === viewport.zoom) return viewport;
  const anchor = screenToWorld(screenPoint, viewport);
  return { x: anchor.x - screenPoint.x / zoom, y: anchor.y - screenPoint.y / zoom, zoom };
}

/** Pans by a screen-space delta (a drag of `(dx, dy)` pixels moves the content by as much). */
export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    x: viewport.x - dx / viewport.zoom,
    y: viewport.y - dy / viewport.zoom,
    zoom: viewport.zoom,
  };
}

/** Viewport showing `point` at the centre of a screen of `size`, at `zoom`. */
export function centerOn(point: Point, size: Size, zoom: number): Viewport {
  return { x: point.x - size.width / (2 * zoom), y: point.y - size.height / (2 * zoom), zoom };
}

export interface GraphBoundsOptions {
  /** Size of a node box centred on its position (default 0 × 0: positions only). */
  nodeSize?: Size;
}

/** Bounding rectangle of the nodes (with their boxes); an empty rectangle at 0, 0 when empty. */
export function graphBounds(graph: GraphLike, options: GraphBoundsOptions = {}): Rect {
  const rect = boundsOfPoints(graph.nodes);
  if (graph.nodes.length === 0 || !options.nodeSize) return rect;
  const { width, height } = options.nodeSize;
  return {
    x: rect.x - width / 2,
    y: rect.y - height / 2,
    width: rect.width + width,
    height: rect.height + height,
  };
}

export interface FitViewOptions extends ZoomLimits {
  /** Screen pixels kept free around the content (default 48). */
  padding?: number;
}

/** Viewport that shows the whole of `bounds` centred on a screen of `size`. */
export function fitView(bounds: Rect, size: Size, options: FitViewOptions = {}): Viewport {
  const padding = Math.max(0, options.padding ?? 48);
  const availableW = Math.max(1, size.width - 2 * padding);
  const availableH = Math.max(1, size.height - 2 * padding);
  const raw = Math.min(
    bounds.width > 0 ? availableW / bounds.width : Infinity,
    bounds.height > 0 ? availableH / bounds.height : Infinity,
  );
  // A single point (or nothing) is shown at zoom 1 rather than infinitely magnified.
  const zoom = clampZoom(Number.isFinite(raw) ? raw : 1, options);
  return centerOn({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }, size, zoom);
}

export interface MinimapTransform {
  /** Minimap pixels per world unit. */
  scale: number;
  /** World rectangle drawn by the minimap (content ∪ current view). */
  world: Rect;
  /** The current view, in minimap pixels — the draggable "radar" frame. */
  frame: Rect;
  toMinimap(point: Point): Point;
  /** World point under a minimap pixel — click or drag on the minimap to navigate. */
  toWorld(point: Point): Point;
}

/**
 * Fits the content and the current view into a minimap of `minimapSize`, keeping the aspect
 * ratio and centring the drawing. The frame therefore always stays inside the minimap.
 */
export function minimapTransform(
  contentBounds: Rect,
  viewport: Viewport,
  screenSize: Size,
  minimapSize: Size,
  padding = 4,
): MinimapTransform {
  const view = visibleWorldRect(viewport, screenSize);
  const world = unionRect(contentBounds, view);
  const innerW = Math.max(1, minimapSize.width - 2 * padding);
  const innerH = Math.max(1, minimapSize.height - 2 * padding);
  const scale = Math.min(
    innerW / Math.max(world.width, 1e-9),
    innerH / Math.max(world.height, 1e-9),
  );
  const offsetX = (minimapSize.width - world.width * scale) / 2 - world.x * scale;
  const offsetY = (minimapSize.height - world.height * scale) / 2 - world.y * scale;
  const toMinimap = (p: Point): Point => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY });
  const toWorld = (p: Point): Point => ({ x: (p.x - offsetX) / scale, y: (p.y - offsetY) / scale });
  const origin = toMinimap(view);
  return {
    scale,
    world,
    frame: { x: origin.x, y: origin.y, width: view.width * scale, height: view.height * scale },
    toMinimap,
    toWorld,
  };
}
