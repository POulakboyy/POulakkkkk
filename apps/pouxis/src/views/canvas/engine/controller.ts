import { graph as g } from '@pouxis/core';
import type { Id } from '@pouxis/core';
import { sameViewport, tweenAt, type CameraTween } from './camera.ts';
import { addInkPoint, hitStroke, normalisePressure, simplify, type InkPoint, type Stroke } from './ink.ts';
import { renderScene, type RenderState, type RenderStats } from './render.ts';
import {
  NODE_GLYPH,
  NODE_PAD_X,
  hitEdge,
  hitNode,
  hitToggle,
  moveSceneNode,
  type Scene,
  type SceneNode,
} from './scene.ts';
import { FALLBACK_THEME, type CanvasTheme } from './theme.ts';

type Viewport = g.Viewport;
type Point = g.Point;

export type Tool = 'select' | 'pan' | 'node' | 'edge' | 'draw' | 'eraser';

export const ZOOM_LIMITS = { minZoom: 0.02, maxZoom: 4 } as const;
/** Pointer travel (CSS px) under which a press counts as a click, not a drag. */
const CLICK_SLOP = 4;
/** Pointer travel under which a touch press counts as a tap (fingers are less precise). */
const TAP_SLOP = 10;

export interface ControllerEvents {
  /** Nodes were dragged; positions are world centres after the drop. */
  onMoveNodes(positions: Map<Id, Point>): void;
  /** Click with the node tool or double click on empty canvas. */
  onCreateNode(at: Point): void;
  onEditNode(id: Id): void;
  onConnect(from: Id, to: Id): void;
  onToggleCollapse(id: Id): void;
  /** Click on the check circle of a task node. */
  onToggleDone(id: Id): void;
  onSelectionChange(nodes: ReadonlySet<Id>, edge: Id | undefined): void;
  /** Called at most once per frame while the camera moves. */
  onViewportChange(vp: Viewport): void;
  onStrokeEnd(stroke: Stroke): void;
  onErase(strokeIds: Id[]): void;
}

/** Per-frame animation: return `false` once finished. */
export type FrameTask = (now: number) => boolean;

interface DragGesture {
  kind: 'drag';
  start: Point;
  nodes: { node: SceneNode; dx: number; dy: number }[];
  moved: boolean;
}

type Gesture =
  | { kind: 'pan'; last: Point; start: Point; moved: boolean; tapNode?: SceneNode | undefined }
  | DragGesture
  | { kind: 'marquee'; start: Point; current: Point; additive: boolean }
  | { kind: 'connect'; from: SceneNode; current: Point; target?: SceneNode | undefined }
  | { kind: 'draw'; stroke: Stroke }
  | { kind: 'erase'; erased: Set<Id> }
  | { kind: 'create'; start: Point }
  | { kind: 'pinch'; distance: number; mid: Point };

export interface ControllerOptions {
  events: ControllerEvents;
  /** Supplies stroke ids (the view uses `createId`). */
  makeId: () => Id;
  /** Formats the due date shown while dragging in timeline mode. */
  dueLabel?: (ts: number) => string;
}

/**
 * Imperative core of the canvas: owns the `<canvas>`, the camera and every pointer gesture,
 * and redraws on `requestAnimationFrame` only when something changed. React renders the
 * chrome around it and feeds it scenes; nothing here re-renders React during a gesture.
 */
export class CanvasController {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly options: ControllerOptions;
  private scene: Scene;
  private theme: CanvasTheme = FALLBACK_THEME;
  private vp: Viewport = { x: -400, y: -300, zoom: 1 };
  private size = { width: 800, height: 600 };
  private dpr = 1;
  private tool: Tool = 'select';
  private selection = new Set<Id>();
  private selectedEdge: Id | undefined;
  private hover: Id | undefined;
  private strokes: readonly Stroke[] = [];
  private timeline: RenderState['timeline'];
  private inkStyle = { width: 3, color: 0 };
  private gesture: Gesture | undefined;
  private readonly pointers = new Map<number, Point>();
  private spaceHeld = false;
  private tween: CameraTween | undefined;
  private readonly tasks = new Set<FrameTask>();
  private frame = 0;
  private lastViewportEmitted: Viewport | undefined;
  private destroyed = false;
  lastStats: RenderStats = { nodes: 0, edges: 0, lod: 'full' };
  /** Duration of the last drawn frame (ms), for the dev stress overlay. */
  lastFrameMs = 0;

  constructor(canvas: HTMLCanvasElement, scene: Scene, options: ControllerOptions) {
    this.canvas = canvas;
    this.scene = scene;
    this.options = options;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d', { alpha: true });
    } catch {
      // jsdom and very old webviews: interactions keep working, drawing is skipped.
    }
    this.ctx = ctx;
    this.bind();
  }

  /* ---------------------------------------------------------------- state from React */

  setScene(scene: Scene): void {
    this.scene = scene;
    // Drop selected ids that no longer exist (deleted or hidden by a collapse).
    const kept = [...this.selection].filter((id) => scene.byId.has(id));
    if (kept.length !== this.selection.size) this.select(kept, undefined);
    if (this.selectedEdge && !scene.edges.some((e) => e.edge.id === this.selectedEdge)) {
      this.select([...this.selection], undefined);
    }
    this.requestDraw();
  }

  getScene(): Scene {
    return this.scene;
  }

  setTheme(theme: CanvasTheme): void {
    this.theme = theme;
    this.requestDraw();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
    this.canvas.dataset.tool = tool;
    this.requestDraw();
  }

  setStrokes(strokes: readonly Stroke[]): void {
    this.strokes = strokes;
    this.requestDraw();
  }

  setInkStyle(style: { width: number; color: number }): void {
    this.inkStyle = style;
  }

  setTimeline(timeline: RenderState['timeline']): void {
    this.timeline = timeline;
    this.requestDraw();
  }

  getSelection(): ReadonlySet<Id> {
    return this.selection;
  }

  getSelectedEdge(): Id | undefined {
    return this.selectedEdge;
  }

  select(ids: Iterable<Id>, edge: Id | undefined): void {
    this.selection = new Set(ids);
    this.selectedEdge = edge;
    this.options.events.onSelectionChange(this.selection, edge);
    this.requestDraw();
  }

  /* ---------------------------------------------------------------- camera */

  getViewport(): Viewport {
    return this.vp;
  }

  getSize(): { width: number; height: number } {
    return this.size;
  }

  setViewport(vp: Viewport, duration = 0): void {
    const target = { ...vp, zoom: g.clampZoom(vp.zoom, ZOOM_LIMITS) };
    if (duration <= 0 || sameViewport(this.vp, target)) {
      this.tween = undefined;
      this.vp = target;
    } else {
      this.tween = { from: this.vp, to: target, start: performance.now(), duration };
    }
    this.requestDraw();
  }

  /** Frames a world rectangle (fit, presentation waypoints). */
  frameRect(rect: g.Rect, duration = 0, padding = 64): void {
    const vp = g.fitView(rect, this.size, { padding, ...ZOOM_LIMITS, maxZoom: 1.5 });
    this.setViewport(vp, duration);
  }

  fit(duration = 0): void {
    if (this.scene.nodes.length === 0) {
      this.setViewport(g.centerOn({ x: 0, y: 0 }, this.size, 1), duration);
      return;
    }
    this.frameRect(this.sceneBounds(), duration);
  }

  sceneBounds(): g.Rect {
    return g.graphBounds(
      { nodes: this.scene.nodes.map((n) => n.node).map((n, i) => this.withScenePos(n, i)), edges: [] },
      { nodeSize: { width: this.scene.maxHalfW * 2, height: 44 } },
    );
  }

  private withScenePos(node: SceneNode['node'], i: number): SceneNode['node'] {
    const s = this.scene.nodes[i];
    return s && (s.x !== node.x || s.y !== node.y) ? { ...node, x: s.x, y: s.y } : node;
  }

  zoomBy(factor: number, screenPoint?: Point, duration = 0): void {
    const base = this.tween?.to ?? this.vp;
    const at = screenPoint ?? { x: this.size.width / 2, y: this.size.height / 2 };
    this.setViewport(g.zoomAround(base, at, factor, ZOOM_LIMITS), duration);
  }

  panBy(dx: number, dy: number, duration = 0): void {
    const base = this.tween?.to ?? this.vp;
    this.setViewport(g.panBy(base, dx, dy), duration);
  }

  centerOnNode(id: Id, duration = 0): void {
    const node = this.scene.byId.get(id);
    if (!node) return;
    const zoom = Math.max(this.vp.zoom, 0.6);
    this.setViewport(g.centerOn({ x: node.x, y: node.y }, this.size, zoom), duration);
  }

  /** Pans just enough to keep a node on screen (keyboard navigation). */
  revealNode(id: Id, duration = 0): void {
    const node = this.scene.byId.get(id);
    if (!node) return;
    const view = g.visibleWorldRect(this.vp, this.size, -48 / this.vp.zoom);
    const inside =
      node.x - node.w / 2 >= view.x &&
      node.x + node.w / 2 <= view.x + view.width &&
      node.y - node.h / 2 >= view.y &&
      node.y + node.h / 2 <= view.y + view.height;
    if (!inside) this.centerOnNode(id, duration);
  }

  worldToScreen(p: Point): Point {
    return g.worldToScreen(p, this.vp);
  }

  screenToWorld(p: Point): Point {
    return g.screenToWorld(p, this.vp);
  }

  /** Measures the element and resizes the backing store for the device pixel ratio. */
  resize(width: number, height: number, dpr = globalThis.devicePixelRatio || 1): void {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const first = this.size.width === 800 && this.size.height === 600 && !this.lastViewportEmitted;
    // Keep the centre of the view stable when the window is resized.
    const center = this.screenToWorld({ x: this.size.width / 2, y: this.size.height / 2 });
    this.size = { width: w, height: h };
    this.dpr = Math.min(3, dpr);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    if (!first) this.vp = g.centerOn(center, this.size, this.vp.zoom);
    this.requestDraw();
  }

  /* ---------------------------------------------------------------- frame loop */

  addFrameTask(task: FrameTask): () => void {
    this.tasks.add(task);
    this.requestDraw();
    return () => this.tasks.delete(task);
  }

  requestDraw(): void {
    if (this.frame || this.destroyed) return;
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number): void {
    this.frame = 0;
    if (this.destroyed) return;
    for (const task of [...this.tasks]) {
      if (!task(now)) this.tasks.delete(task);
    }
    if (this.tween) {
      const { vp, done } = tweenAt(this.tween, now, this.size);
      this.vp = vp;
      if (done) this.tween = undefined;
    }
    this.draw();
    this.emitViewport();
    if (this.tween || this.tasks.size > 0) this.requestDraw();
  }

  /** Synchronous redraw (exports, tests). */
  draw(): void {
    if (!this.ctx) return;
    const t0 = performance.now();
    this.lastStats = renderScene(this.ctx, this.scene, this.renderState(), this.theme);
    this.lastFrameMs = performance.now() - t0;
  }

  private renderState(): RenderState {
    const gesture = this.gesture;
    const lifted =
      gesture?.kind === 'drag' && gesture.moved ? new Set(gesture.nodes.map((n) => n.node.id)) : undefined;
    let dragDue: RenderState['dragDue'];
    if (this.timeline && lifted && gesture?.kind === 'drag' && this.options.dueLabel) {
      const first = gesture.nodes[0]?.node;
      if (first) dragDue = { x: first.x, text: this.options.dueLabel(this.timeline.scale.toTime(first.x)) };
    }
    return {
      vp: this.vp,
      width: this.size.width,
      height: this.size.height,
      dpr: this.dpr,
      selection: this.selection,
      selectedEdge: this.selectedEdge,
      hover: this.hover,
      connecting:
        gesture?.kind === 'connect'
          ? { from: gesture.from, x: gesture.current.x, y: gesture.current.y, target: gesture.target }
          : undefined,
      marquee: gesture?.kind === 'marquee' ? rectFrom(gesture.start, gesture.current) : undefined,
      strokes: this.strokes,
      draft: gesture?.kind === 'draw' ? gesture.stroke : undefined,
      timeline: this.timeline,
      dragDue,
      background: true,
      lifted,
    };
  }

  private emitViewport(): void {
    const last = this.lastViewportEmitted;
    if (last && sameViewport(last, this.vp)) return;
    this.lastViewportEmitted = this.vp;
    this.options.events.onViewportChange(this.vp);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.unbind();
  }

  /* ---------------------------------------------------------------- input */

  private readonly listeners: [keyof HTMLElementEventMap, EventListener, AddEventListenerOptions?][] = [];

  private bind(): void {
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      const listener = fn as EventListener;
      this.canvas.addEventListener(type, listener, opts);
      this.listeners.push([type, listener, opts]);
    };
    on('pointerdown', (e) => this.onPointerDown(e));
    on('pointermove', (e) => this.onPointerMove(e));
    on('pointerup', (e) => this.onPointerUp(e));
    on('pointercancel', (e) => this.onPointerCancel(e));
    on('pointerleave', () => this.setHover(undefined));
    on('wheel', (e) => this.onWheel(e), { passive: false });
    on('dblclick', (e) => this.onDoubleClick(e));
    on('contextmenu', (e) => e.preventDefault());
  }

  private unbind(): void {
    for (const [type, fn, opts] of this.listeners) this.canvas.removeEventListener(type, fn, opts);
    this.listeners.length = 0;
  }

  /** Space held: temporary hand tool, like design tools. */
  setSpaceHeld(held: boolean): void {
    this.spaceHeld = held;
    this.canvas.dataset.panning = held ? 'true' : 'false';
  }

  private local(e: { clientX: number; clientY: number }): Point {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.button !== 1 && e.pointerType === 'mouse') return;
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events (tests) have no active pointer to capture.
    }
    this.tween = undefined;
    if (this.pointers.size === 2) {
      this.cancelGesture();
      this.gesture = this.pinchStart();
      return;
    }
    if (this.pointers.size > 2) return;
    this.gesture = this.startGesture(e, p);
    this.requestDraw();
  }

  private startGesture(e: PointerEvent, p: Point): Gesture | undefined {
    const w = this.screenToWorld(p);
    if (e.button === 1 || this.spaceHeld || this.tool === 'pan') {
      return { kind: 'pan', last: p, start: p, moved: false };
    }
    const node = hitNode(this.scene, w.x, w.y);
    switch (this.tool) {
      case 'draw':
        return this.startStroke(e, w);
      case 'eraser':
        return this.eraseAt(w, { kind: 'erase', erased: new Set() });
      case 'edge':
        if (node) return { kind: 'connect', from: node, current: w };
        return { kind: 'pan', last: p, start: p, moved: false };
      case 'node':
        return node ? this.pressNode(e, node, w) : { kind: 'create', start: p };
      default:
        if (node) return this.pressNode(e, node, w);
        if (e.shiftKey && e.pointerType === 'mouse') {
          return { kind: 'marquee', start: w, current: w, additive: true };
        }
        return { kind: 'pan', last: p, start: p, moved: false };
    }
  }

  private pressNode(e: PointerEvent, node: SceneNode, w: Point): Gesture | undefined {
    if (hitToggle(node, w.x, w.y)) {
      this.options.events.onToggleCollapse(node.id);
      return undefined;
    }
    if (node.node.kind === 'task' && !node.locked && hitCheck(node, w.x)) {
      this.options.events.onToggleDone(node.id);
      return undefined;
    }
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (additive) {
      const next = new Set(this.selection);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      this.select(next, undefined);
    } else if (!this.selection.has(node.id)) {
      this.select([node.id], undefined);
    }
    const dragged = [...this.selection]
      .map((id) => this.scene.byId.get(id))
      .filter((n): n is SceneNode => n !== undefined);
    return {
      kind: 'drag',
      start: w,
      nodes: dragged.map((n) => ({ node: n, dx: n.x - w.x, dy: n.y - w.y })),
      moved: false,
    };
  }

  private startStroke(e: PointerEvent, w: Point): Gesture {
    const stroke: Stroke = {
      id: this.options.makeId(),
      points: [],
      width: this.inkStyle.width / Math.max(0.25, Math.min(this.vp.zoom, 4)),
      color: this.inkStyle.color,
    };
    addInkPoint(stroke.points, { ...w, p: normalisePressure(e.pressure, e.pointerType) });
    return { kind: 'draw', stroke };
  }

  private eraseAt(w: Point, gesture: Extract<Gesture, { kind: 'erase' }>): Gesture {
    const radius = 10 / this.vp.zoom;
    for (const s of this.strokes) {
      if (!gesture.erased.has(s.id) && hitStroke(s, w.x, w.y, radius)) gesture.erased.add(s.id);
    }
    return gesture;
  }

  private onPointerMove(e: PointerEvent): void {
    const p = this.local(e);
    if (!this.pointers.has(e.pointerId)) {
      this.updateHover(p);
      return;
    }
    this.pointers.set(e.pointerId, p);
    const gesture = this.gesture;
    if (!gesture) return;
    if (gesture.kind === 'pinch') {
      this.pinchMove(gesture);
      return;
    }
    const w = this.screenToWorld(p);
    switch (gesture.kind) {
      case 'pan': {
        const dx = p.x - gesture.last.x;
        const dy = p.y - gesture.last.y;
        gesture.last = p;
        if (!gesture.moved && distance(p, gesture.start) < slop(e)) return;
        gesture.moved = true;
        this.vp = g.panBy(this.vp, -dx / this.vp.zoom, -dy / this.vp.zoom);
        break;
      }
      case 'drag':
        this.dragMove(gesture, w, p, e);
        break;
      case 'marquee':
        gesture.current = w;
        break;
      case 'connect': {
        gesture.current = w;
        const target = hitNode(this.scene, w.x, w.y);
        gesture.target = target && target !== gesture.from ? target : undefined;
        break;
      }
      case 'draw':
        for (const ev of coalesced(e)) {
          const q = this.screenToWorld(this.local(ev));
          addInkPoint(gesture.stroke.points, { ...q, p: normalisePressure(ev.pressure, ev.pointerType) });
        }
        break;
      case 'erase':
        this.eraseAt(w, gesture);
        break;
      default:
        break;
    }
    this.requestDraw();
  }

  private dragMove(gesture: DragGesture, w: Point, p: Point, e: PointerEvent): void {
    if (!gesture.moved) {
      const s = this.worldToScreen(gesture.start);
      if (distance(p, s) < slop(e)) return;
      gesture.moved = true;
    }
    for (const { node, dx, dy } of gesture.nodes) {
      if (this.timeline) {
        // Timeline mode: x is the due date, so dragging snaps to whole days.
        const due = g.dragToDue(node.node, w.x + dx, this.timeline.scale, { snap: 'day' });
        moveSceneNode(this.scene, node, due.x, w.y + dy);
      } else {
        moveSceneNode(this.scene, node, w.x + dx, w.y + dy);
      }
    }
  }

  private onPointerUp(e: PointerEvent): void {
    const p = this.local(e);
    this.pointers.delete(e.pointerId);
    const gesture = this.gesture;
    if (gesture?.kind === 'pinch') {
      // Lifting one finger of a pinch must not turn into a pan jump.
      if (this.pointers.size === 0) this.gesture = undefined;
      return;
    }
    this.gesture = undefined;
    if (gesture) this.finishGesture(gesture, p, e);
    this.requestDraw();
  }

  private finishGesture(gesture: Gesture, p: Point, e: PointerEvent): void {
    const events = this.options.events;
    switch (gesture.kind) {
      case 'pan':
        if (!gesture.moved && this.tool !== 'pan' && !this.spaceHeld) this.tapEmpty(p, e);
        break;
      case 'drag':
        if (gesture.moved) {
          const positions = new Map<Id, Point>();
          for (const { node } of gesture.nodes) positions.set(node.id, { x: node.x, y: node.y });
          events.onMoveNodes(positions);
        } else if (!(e.shiftKey || e.metaKey || e.ctrlKey)) {
          const only = gesture.nodes.find((n) => containsScreen(this, n.node, p));
          if (only) this.select([only.node.id], undefined);
        }
        break;
      case 'marquee':
        this.selectInRect(rectFrom(gesture.start, gesture.current), gesture.additive);
        break;
      case 'connect':
        if (gesture.target) events.onConnect(gesture.from.id, gesture.target.id);
        break;
      case 'draw': {
        const points = simplify(gesture.stroke.points, 0.35 / this.vp.zoom);
        if (points.length > 0) events.onStrokeEnd({ ...gesture.stroke, points });
        break;
      }
      case 'erase':
        if (gesture.erased.size > 0) events.onErase([...gesture.erased]);
        break;
      case 'create':
        if (distance(p, gesture.start) < slop(e)) events.onCreateNode(this.screenToWorld(p));
        break;
      default:
        break;
    }
  }

  /** Click on empty canvas: select an edge under the pointer, or clear the selection. */
  private tapEmpty(p: Point, e: PointerEvent): void {
    const w = this.screenToWorld(p);
    const edge = hitEdge(this.scene, w.x, w.y, (e.pointerType === 'touch' ? 14 : 8) / this.vp.zoom);
    if (edge) this.select([], edge.edge.id);
    else if (this.selection.size > 0 || this.selectedEdge) this.select([], undefined);
  }

  private selectInRect(rect: g.Rect, additive: boolean): void {
    const ids = new Set(additive ? this.selection : []);
    for (const item of this.scene.index.queryRect(rect)) ids.add(item.id);
    this.select(ids, undefined);
  }

  private onPointerCancel(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    this.cancelGesture();
  }

  /** Aborts the current gesture and puts dragged nodes back. */
  cancelGesture(): void {
    const gesture = this.gesture;
    this.gesture = undefined;
    if (gesture?.kind === 'drag' && gesture.moved) {
      for (const { node } of gesture.nodes) moveSceneNode(this.scene, node, node.node.x, node.node.y);
    }
    this.requestDraw();
  }

  isGestureActive(): boolean {
    return this.gesture !== undefined;
  }

  private pinchStart(): Gesture {
    const [a, b] = [...this.pointers.values()] as [Point, Point];
    return { kind: 'pinch', distance: Math.max(1, distance(a, b)), mid: midpoint(a, b) };
  }

  private pinchMove(gesture: Extract<Gesture, { kind: 'pinch' }>): void {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return;
    const [a, b] = pts as [Point, Point];
    const d = Math.max(1, distance(a, b));
    const mid = midpoint(a, b);
    let vp = g.panBy(this.vp, -(mid.x - gesture.mid.x) / this.vp.zoom, -(mid.y - gesture.mid.y) / this.vp.zoom);
    vp = g.zoomAround(vp, mid, d / gesture.distance, ZOOM_LIMITS);
    this.vp = vp;
    gesture.distance = d;
    gesture.mid = mid;
    this.requestDraw();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.tween = undefined;
    const p = this.local(e);
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.size.height : 1;
    const dx = e.deltaX * scale;
    const dy = e.deltaY * scale;
    if (e.ctrlKey || e.metaKey) {
      // Trackpad pinch arrives as ctrl + wheel; a mouse wheel with ctrl zooms too.
      this.vp = g.zoomAround(this.vp, p, Math.exp(-dy * 0.01), ZOOM_LIMITS);
    } else if (e.shiftKey && dx === 0) {
      this.vp = g.panBy(this.vp, dy / this.vp.zoom, 0);
    } else {
      this.vp = g.panBy(this.vp, dx / this.vp.zoom, dy / this.vp.zoom);
    }
    this.requestDraw();
  }

  private onDoubleClick(e: MouseEvent): void {
    if (this.tool === 'draw' || this.tool === 'eraser') return;
    const w = this.screenToWorld(this.local(e));
    const node = hitNode(this.scene, w.x, w.y);
    if (node) this.options.events.onEditNode(node.id);
    else if (this.tool !== 'edge') this.options.events.onCreateNode(w);
  }

  private updateHover(p: Point): void {
    const w = this.screenToWorld(p);
    this.setHover(hitNode(this.scene, w.x, w.y)?.id);
  }

  private setHover(id: Id | undefined): void {
    if (id === this.hover) return;
    this.hover = id;
    this.canvas.dataset.hover = id ? 'node' : 'none';
    this.requestDraw();
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function slop(e: PointerEvent): number {
  return e.pointerType === 'touch' ? TAP_SLOP : CLICK_SLOP;
}

export function rectFrom(a: Point, b: Point): g.Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

/** Whether a world x falls on the check circle drawn at the left of a task node. */
export function hitCheck(node: SceneNode, x: number): boolean {
  const left = node.x - node.w / 2;
  return x >= left + NODE_PAD_X - 6 && x <= left + NODE_PAD_X + NODE_GLYPH;
}

function containsScreen(c: CanvasController, node: SceneNode, p: Point): boolean {
  const w = c.screenToWorld(p);
  return Math.abs(w.x - node.x) <= node.w / 2 && Math.abs(w.y - node.y) <= node.h / 2;
}

/** High-frequency pen samples when the browser exposes them (smoother ink). */
function coalesced(e: PointerEvent): PointerEvent[] {
  const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
  return list.length > 0 ? list : [e];
}

export type { InkPoint };
