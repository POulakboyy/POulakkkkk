import { graph as g } from '@pouxis/core';
import type { Id } from '@pouxis/core';
import { outlinePath, strokeBounds, strokeOutline, type Stroke } from './ink.ts';
import {
  NODE_BADGE,
  NODE_HEIGHT,
  NODE_PAD_X,
  edgeAnchors,
  type Anchors,
  type Scene,
  type SceneEdge,
  type SceneNode,
} from './scene.ts';
import type { CanvasTheme } from './theme.ts';

type Viewport = g.Viewport;

/** Level of detail, chosen from the zoom so 10 000 nodes stay fluid when zoomed out. */
export type Lod = 'full' | 'block' | 'dot';

/** Text below ~7 px on screen is unreadable; below ~5 px tall a box is a dot. */
export function lodFor(zoom: number): Lod {
  if (zoom >= 0.5) return 'full';
  if (zoom >= 0.12) return 'block';
  return 'dot';
}

export const LABEL_FONT_SIZE = 14;
const RADIUS = 12;
/** Above this many visible nodes, soft shadows are skipped (they cost a blur per node). */
const SHADOW_BUDGET = 250;

export interface RenderState {
  vp: Viewport;
  /** CSS pixels. */
  width: number;
  height: number;
  dpr: number;
  selection: ReadonlySet<Id>;
  selectedEdge?: Id | undefined;
  hover?: Id | undefined;
  /** Edge being drawn with the link tool, in world coordinates. */
  connecting?:
    { from: SceneNode; x: number; y: number; target?: SceneNode | undefined } | undefined;
  strokes: readonly Stroke[];
  draft?: Stroke | undefined;
  timeline?:
    | {
        scale: g.TimeScale;
        label: (tick: g.TimeTick) => string;
        today: number;
        /** Screen y of the date axis (CSS px), below the floating header. */
        top?: number;
      }
    | undefined;
  /** Fill the background and draw the dot grid (off for transparent PNG export). */
  background: boolean;
  /** Nodes being dragged are drawn lifted. */
  lifted?: ReadonlySet<Id> | undefined;
  /** Rubber-band selection rectangle, in world coordinates. */
  marquee?: g.Rect | undefined;
  /** Due date shown above the dragged node in timeline mode (world x of the node). */
  dragDue?: { x: number; text: string } | undefined;
}

export interface RenderStats {
  nodes: number;
  edges: number;
  lod: Lod;
}

const strokePaths = new WeakMap<Stroke, { path: Path2D; bounds: g.Rect }>();

function strokePath(stroke: Stroke): { path: Path2D; bounds: g.Rect } {
  const cached = strokePaths.get(stroke);
  if (cached) return cached;
  const entry = {
    path: new Path2D(outlinePath(strokeOutline(stroke.points, stroke.width))),
    bounds: strokeBounds(stroke),
  };
  strokePaths.set(stroke, entry);
  return entry;
}

export function inkColor(stroke: Stroke, theme: CanvasTheme): string {
  return stroke.color > 0 ? (theme.viz[stroke.color - 1] ?? theme.ink) : theme.ink;
}

/** Draws one frame. The context must belong to a canvas of `width × dpr` by `height × dpr`. */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  state: RenderState,
  theme: CanvasTheme,
): RenderStats {
  const { vp, width, height, dpr } = state;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (state.background) {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
  }

  const view = g.visibleWorldRect(vp, { width, height }, 0);
  const lod = lodFor(vp.zoom);
  ctx.setTransform(
    dpr * vp.zoom,
    0,
    0,
    dpr * vp.zoom,
    -vp.x * vp.zoom * dpr,
    -vp.y * vp.zoom * dpr,
  );

  if (state.background) drawGrid(ctx, view, vp.zoom, theme);
  if (state.timeline) drawTimelineLines(ctx, view, state.timeline, vp.zoom, theme);

  // Dots are drawn grouped by colour, so draw order only matters for boxes.
  const visible = visibleNodes(scene, view, lod !== 'dot');
  const edges = drawEdges(ctx, scene.edges, view, lod, state, theme);
  drawInk(ctx, state.strokes, state.draft, view, theme);
  if (state.connecting) drawConnecting(ctx, state.connecting, vp.zoom, theme);

  if (lod === 'dot') drawDots(ctx, visible, vp.zoom, state, theme);
  else if (lod === 'block') drawBlocks(ctx, visible, state, theme);
  else drawFull(ctx, visible, state, theme);
  if (state.marquee) drawMarquee(ctx, state.marquee, vp.zoom, theme);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state.timeline) drawTimelineAxis(ctx, state.timeline, vp, width, theme);
  if (state.dragDue) {
    const top = (state.timeline?.top ?? 0) + AXIS_HEIGHT + 8;
    drawDuePill(ctx, (state.dragDue.x - vp.x) * vp.zoom, top, state.dragDue.text, theme);
  }
  return { nodes: visible.length, edges, lod };
}

/** Viewport culling through the quadtree; returned in draw order. */
export function visibleNodes(scene: Scene, view: g.Rect, sorted = true): SceneNode[] {
  const items = scene.index.queryRect(g.inflateRect(view, scene.maxHalfW + 8));
  const out: SceneNode[] = [];
  for (const item of items) {
    const node = scene.byId.get(item.id);
    if (node) out.push(node);
  }
  if (sorted) out.sort((a, b) => a.order - b.order);
  return out;
}

function drawGrid(ctx: CanvasRenderingContext2D, view: g.Rect, zoom: number, theme: CanvasTheme) {
  if (zoom < 0.3) return;
  const step = zoom < 0.7 ? 96 : 32;
  const size = 1.4 / zoom;
  const x0 = Math.floor(view.x / step) * step;
  const y0 = Math.floor(view.y / step) * step;
  const cols = Math.ceil(view.width / step) + 1;
  const rows = Math.ceil(view.height / step) + 1;
  if (cols * rows > 6000) return;
  ctx.fillStyle = theme.lineStrong;
  ctx.globalAlpha = Math.min(1, (zoom - 0.3) * 2.5) * 0.9;
  ctx.beginPath();
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++)
      ctx.rect(x0 + i * step - size / 2, y0 + j * step - size / 2, size, size);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

function traceEdge(ctx: CanvasRenderingContext2D, a: Anchors, curved: boolean) {
  ctx.moveTo(a.ax, a.ay);
  if (!curved) {
    ctx.lineTo(a.bx, a.by);
    return;
  }
  if (a.horizontal) {
    const mx = (a.ax + a.bx) / 2;
    ctx.bezierCurveTo(mx, a.ay, mx, a.by, a.bx, a.by);
  } else {
    const my = (a.ay + a.by) / 2;
    ctx.bezierCurveTo(a.ax, my, a.bx, my, a.bx, a.by);
  }
}

function arrowHead(ctx: CanvasRenderingContext2D, a: Anchors, size: number) {
  const angle = a.horizontal
    ? a.bx >= a.ax
      ? 0
      : Math.PI
    : a.by >= a.ay
      ? Math.PI / 2
      : -Math.PI / 2;
  ctx.moveTo(a.bx, a.by);
  ctx.lineTo(a.bx - size * Math.cos(angle - 0.45), a.by - size * Math.sin(angle - 0.45));
  ctx.moveTo(a.bx, a.by);
  ctx.lineTo(a.bx - size * Math.cos(angle + 0.45), a.by - size * Math.sin(angle + 0.45));
}

function edgeInView(e: SceneEdge, view: g.Rect): boolean {
  const minX = Math.min(e.from.x, e.to.x) - e.from.w;
  const maxX = Math.max(e.from.x, e.to.x) + e.to.w;
  const minY = Math.min(e.from.y, e.to.y) - NODE_HEIGHT;
  const maxY = Math.max(e.from.y, e.to.y) + NODE_HEIGHT;
  return (
    maxX >= view.x && minX <= view.x + view.width && maxY >= view.y && minY <= view.y + view.height
  );
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: readonly SceneEdge[],
  view: g.Rect,
  lod: Lod,
  state: RenderState,
  theme: CanvasTheme,
): number {
  const zoom = state.vp.zoom;
  const curved = lod === 'full';
  const plain: Anchors[] = [];
  const flow: Anchors[] = [];
  const arrows: Anchors[] = [];
  let selected: Anchors | undefined;
  // Zoomed far out, edges shorter than a few pixels only add noise (and raster cost).
  const minLength = lod === 'dot' ? 10 / zoom : 0;
  for (const e of edges) {
    if (!edgeInView(e, view)) continue;
    if (minLength > 0 && Math.abs(e.to.x - e.from.x) + Math.abs(e.to.y - e.from.y) < minLength)
      continue;
    const a = edgeAnchors(e.from, e.to);
    if (e.edge.id === state.selectedEdge) selected = a;
    else if (e.conditional) flow.push(a);
    else plain.push(a);
    if (lod === 'full' && (e.conditional || e.to.node.parentId !== e.from.id)) arrows.push(a);
  }
  const width = Math.max(1.5, 1 / zoom);
  ctx.lineCap = 'round';
  ctx.lineWidth = lod === 'dot' ? 1 / zoom : width;
  ctx.strokeStyle = theme.lineStrong;
  ctx.globalAlpha = lod === 'dot' ? 0.6 : 1;
  ctx.beginPath();
  for (const a of plain) traceEdge(ctx, a, curved);
  ctx.stroke();

  ctx.strokeStyle = theme.accent;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  for (const a of flow) traceEdge(ctx, a, curved);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  if (arrows.length > 0) {
    ctx.strokeStyle = theme.ink3;
    ctx.beginPath();
    for (const a of arrows) arrowHead(ctx, a, 7);
    ctx.stroke();
  }
  if (selected) {
    ctx.strokeStyle = theme.accentStrong;
    ctx.lineWidth = width * 2;
    ctx.beginPath();
    traceEdge(ctx, selected, curved);
    ctx.stroke();
  }
  return plain.length + flow.length + (selected ? 1 : 0);
}

function drawConnecting(
  ctx: CanvasRenderingContext2D,
  c: NonNullable<RenderState['connecting']>,
  zoom: number,
  theme: CanvasTheme,
) {
  ctx.strokeStyle = theme.accentStrong;
  ctx.lineWidth = 2 / Math.max(zoom, 0.5);
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(c.from.x, c.from.y);
  ctx.lineTo(c.target ? c.target.x : c.x, c.target ? c.target.y : c.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawInk(
  ctx: CanvasRenderingContext2D,
  strokes: readonly Stroke[],
  draft: Stroke | undefined,
  view: g.Rect,
  theme: CanvasTheme,
) {
  for (const stroke of strokes) {
    const { path, bounds } = strokePath(stroke);
    if (!g.rectsIntersect(bounds, view)) continue;
    ctx.fillStyle = inkColor(stroke, theme);
    ctx.fill(path);
  }
  if (draft && draft.points.length > 0) {
    ctx.fillStyle = inkColor(draft, theme);
    ctx.fill(new Path2D(outlinePath(strokeOutline(draft.points, draft.width))));
  }
}

function nodeFill(node: SceneNode, theme: CanvasTheme): string {
  const c = node.node.color;
  return c !== undefined && c > 0 ? (theme.cats[c - 1] ?? theme.surface) : theme.surface;
}

function nodeMark(node: SceneNode, theme: CanvasTheme): string {
  const c = node.node.color;
  return c !== undefined && c > 0 ? (theme.viz[c - 1] ?? theme.ink3) : theme.ink3;
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  nodes: readonly SceneNode[],
  zoom: number,
  state: RenderState,
  theme: CanvasTheme,
) {
  const size = Math.max(3 / zoom, 24);
  const groups = new Map<string, SceneNode[]>();
  for (const n of nodes) {
    const color = nodeMark(n, theme);
    const list = groups.get(color);
    if (list) list.push(n);
    else groups.set(color, [n]);
  }
  for (const [color, list] of groups) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const n of list) ctx.rect(n.x - size / 2, n.y - size / 2, size, size);
    ctx.fill();
  }
  highlightSelection(ctx, nodes, state, theme, zoom);
}

function drawBlocks(
  ctx: CanvasRenderingContext2D,
  nodes: readonly SceneNode[],
  state: RenderState,
  theme: CanvasTheme,
) {
  const groups = new Map<string, SceneNode[]>();
  for (const n of nodes) {
    const color = nodeFill(n, theme);
    const list = groups.get(color);
    if (list) list.push(n);
    else groups.set(color, [n]);
  }
  for (const [color, list] of groups) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const n of list) ctx.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, RADIUS);
    ctx.fill();
  }
  ctx.strokeStyle = theme.lineStrong;
  ctx.lineWidth = 1 / state.vp.zoom;
  ctx.beginPath();
  for (const n of nodes) ctx.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, RADIUS);
  ctx.stroke();
  highlightSelection(ctx, nodes, state, theme, state.vp.zoom);
}

function highlightSelection(
  ctx: CanvasRenderingContext2D,
  nodes: readonly SceneNode[],
  state: RenderState,
  theme: CanvasTheme,
  zoom: number,
) {
  if (state.selection.size === 0) return;
  ctx.strokeStyle = theme.accentStrong;
  ctx.lineWidth = 3 / zoom;
  ctx.beginPath();
  for (const n of nodes) {
    if (!state.selection.has(n.id)) continue;
    const pad = 4 / zoom;
    ctx.roundRect(
      n.x - n.w / 2 - pad,
      n.y - n.h / 2 - pad,
      n.w + 2 * pad,
      n.h + 2 * pad,
      RADIUS + pad,
    );
  }
  ctx.stroke();
}

function drawFull(
  ctx: CanvasRenderingContext2D,
  nodes: readonly SceneNode[],
  state: RenderState,
  theme: CanvasTheme,
) {
  const font = theme.font;
  if (nodes.length <= SHADOW_BUDGET) drawShadows(ctx, nodes, state.lifted, theme);
  ctx.textBaseline = 'middle';
  for (const n of nodes) {
    const x = n.x - n.w / 2;
    const y = n.y - n.h / 2;
    ctx.globalAlpha = n.locked ? 0.6 : 1;
    ctx.fillStyle = nodeFill(n, theme);
    ctx.beginPath();
    ctx.roundRect(x, y, n.w, n.h, RADIUS);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = n.id === state.hover ? theme.ink3 : theme.line;
    ctx.stroke();

    let textX = x + NODE_PAD_X;
    if (n.node.kind === 'task' || n.locked) {
      drawGlyph(ctx, n, textX + 7, n.y, theme);
      textX += 22;
    }
    const weight = n.hasChildren ? 600 : 500;
    ctx.font = `${weight} ${LABEL_FONT_SIZE}px ${font}`;
    ctx.fillStyle = n.done ? theme.ink3 : theme.ink;
    ctx.fillText(n.text, textX, n.y + 0.5);
    if (n.done) {
      const w = ctx.measureText(n.text).width;
      ctx.fillRect(textX, n.y, w, 1);
    }
    if (n.hiddenCount > 0) drawBadge(ctx, n, theme, font);
    ctx.globalAlpha = 1;
  }
  highlightSelection(ctx, nodes, state, theme, state.vp.zoom);
}

/**
 * Soft elevation without `shadowBlur` (a Gaussian blur per node is the most expensive thing a
 * 2D canvas can do): two offset translucent layers, batched in one path each. Lifted (dragged)
 * nodes get a deeper, wider shadow.
 */
function drawShadows(
  ctx: CanvasRenderingContext2D,
  nodes: readonly SceneNode[],
  lifted: ReadonlySet<Id> | undefined,
  theme: CanvasTheme,
) {
  const layers = [
    { dy: 1, spread: 0, alpha: theme.dark ? 0.5 : 0.06, lift: false },
    { dy: 3, spread: 1.5, alpha: theme.dark ? 0.25 : 0.035, lift: false },
    { dy: 10, spread: 4, alpha: theme.dark ? 0.4 : 0.1, lift: true },
  ];
  for (const layer of layers) {
    ctx.fillStyle = theme.dark ? `rgba(0,0,0,${layer.alpha})` : `rgba(28,27,24,${layer.alpha})`;
    ctx.beginPath();
    let any = false;
    for (const n of nodes) {
      const isLifted = lifted?.has(n.id) ?? false;
      if (layer.lift !== isLifted && layer.lift) continue;
      const p = layer.spread;
      ctx.roundRect(
        n.x - n.w / 2 - p,
        n.y - n.h / 2 + layer.dy - p,
        n.w + 2 * p,
        n.h + 2 * p,
        RADIUS + p,
      );
      any = true;
    }
    if (any) ctx.fill();
  }
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  n: SceneNode,
  cx: number,
  cy: number,
  theme: CanvasTheme,
) {
  ctx.lineWidth = 1.5;
  if (n.locked) {
    ctx.strokeStyle = theme.ink2;
    ctx.beginPath();
    ctx.roundRect(cx - 5.5, cy - 1.5, 11, 8.5, 2);
    ctx.moveTo(cx - 3, cy - 1.5);
    ctx.arc(cx, cy - 4, 3, Math.PI, 0);
    ctx.lineTo(cx + 3, cy - 1.5);
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  if (n.done) {
    ctx.fillStyle = theme.success;
    ctx.fill();
    ctx.strokeStyle = theme.surface;
    ctx.beginPath();
    ctx.moveTo(cx - 3.2, cy + 0.2);
    ctx.lineTo(cx - 0.8, cy + 2.6);
    ctx.lineTo(cx + 3.4, cy - 2.4);
    ctx.stroke();
  } else {
    ctx.strokeStyle = theme.ink3;
    ctx.stroke();
  }
}

function drawBadge(ctx: CanvasRenderingContext2D, n: SceneNode, theme: CanvasTheme, font: string) {
  const label = `+${n.hiddenCount}`;
  ctx.font = `600 11px ${font}`;
  const w = Math.max(24, ctx.measureText(label).width + 12);
  const right = n.x + n.w / 2 - 8;
  const bx = right - w;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.roundRect(bx, n.y - 10, w, 20, 10);
  ctx.fill();
  ctx.fillStyle = theme.surface;
  ctx.textAlign = 'center';
  ctx.fillText(label, bx + w / 2, n.y + 0.5);
  ctx.textAlign = 'start';
}

/** Badge geometry shared by the renderer and hit-testing. */
export const BADGE_WIDTH = NODE_BADGE;

function drawTimelineLines(
  ctx: CanvasRenderingContext2D,
  view: g.Rect,
  tl: NonNullable<RenderState['timeline']>,
  zoom: number,
  theme: CanvasTheme,
) {
  const scale = visibleScale(tl.scale, view);
  ctx.lineWidth = 1 / zoom;
  for (const tick of scale.ticks(Math.max(2, Math.round((view.width * zoom) / 140)))) {
    ctx.strokeStyle = tick.major ? theme.lineStrong : theme.line;
    ctx.beginPath();
    ctx.moveTo(tick.x, view.y);
    ctx.lineTo(tick.x, view.y + view.height);
    ctx.stroke();
  }
  const today = tl.scale.toX(tl.today);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2 / zoom;
  ctx.beginPath();
  ctx.moveTo(today, view.y);
  ctx.lineTo(today, view.y + view.height);
  ctx.stroke();
}

/** Same linear mapping as `scale`, restricted to the visible range so ticks fit the screen. */
export function visibleScale(scale: g.TimeScale, view: g.Rect): g.TimeScale {
  return g.createTimeScale({
    start: scale.toTime(view.x),
    end: scale.toTime(view.x + Math.max(1, view.width)),
    x0: view.x,
    x1: view.x + Math.max(1, view.width),
    timeZone: scale.timeZone,
  });
}

export const AXIS_HEIGHT = 36;

function drawTimelineAxis(
  ctx: CanvasRenderingContext2D,
  tl: NonNullable<RenderState['timeline']>,
  vp: Viewport,
  width: number,
  theme: CanvasTheme,
) {
  const view = g.visibleWorldRect(vp, { width, height: 1 });
  const scale = visibleScale(tl.scale, view);
  const top = tl.top ?? 0;
  ctx.fillStyle = theme.bg;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(0, top, width, AXIS_HEIGHT);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.line;
  ctx.fillRect(0, top, width, 1);
  ctx.fillRect(0, top + AXIS_HEIGHT - 1, width, 1);
  ctx.textBaseline = 'middle';
  for (const tick of scale.ticks(Math.max(2, Math.round(width / 140)))) {
    const sx = (tick.x - vp.x) * vp.zoom;
    ctx.font = `${tick.major ? 600 : 500} 12px ${theme.font}`;
    ctx.fillStyle = tick.major ? theme.ink : theme.ink3;
    ctx.fillText(tl.label(tick), sx + 6, top + AXIS_HEIGHT / 2);
    ctx.fillRect(sx, top + AXIS_HEIGHT - 8, 1, 7);
  }
}

function drawMarquee(
  ctx: CanvasRenderingContext2D,
  rect: g.Rect,
  zoom: number,
  theme: CanvasTheme,
) {
  ctx.fillStyle = theme.accentSoft;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.accentStrong;
  ctx.lineWidth = 1 / zoom;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

/** Screen-space pill under the axis telling the due date the drop will set. */
function drawDuePill(
  ctx: CanvasRenderingContext2D,
  sx: number,
  y: number,
  text: string,
  theme: CanvasTheme,
) {
  ctx.font = `600 12px ${theme.font}`;
  const w = ctx.measureText(text).width + 20;
  const x = sx - w / 2;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 24, 12);
  ctx.fill();
  ctx.fillStyle = theme.bg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, sx, y + 12.5);
  ctx.textAlign = 'start';
}
