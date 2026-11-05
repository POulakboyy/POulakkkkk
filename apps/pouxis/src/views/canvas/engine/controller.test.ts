import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphNode } from '@pouxis/core';
import { CanvasController, hitCheck, rectFrom, type ControllerEvents } from './controller.ts';
import { buildScene, type Measure } from './scene.ts';

const measure: Measure = (text) => text.length * 8;

function node(id: string, x: number, y: number, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, label: id, kind: 'idea', x, y, ...extra };
}

function makeScene() {
  return buildScene(
    {
      nodes: [node('a', 0, 0), node('b', 300, 0), node('t', 0, 200, { kind: 'task' })],
      edges: [{ id: 'ab', from: 'a', to: 'b' }],
    },
    { measure },
  );
}

function pointer(type: string, x: number, y: number, extra: Record<string, unknown> = {}) {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    bubbles: true,
    ...extra,
  });
  Object.defineProperties(event, {
    pointerId: { value: extra.pointerId ?? 1 },
    pointerType: { value: extra.pointerType ?? 'mouse' },
    pressure: { value: 0.5 },
  });
  return event;
}

function events(): ControllerEvents {
  return {
    onMoveNodes: vi.fn(),
    onCreateNode: vi.fn(),
    onEditNode: vi.fn(),
    onConnect: vi.fn(),
    onToggleCollapse: vi.fn(),
    onToggleDone: vi.fn(),
    onSelectionChange: vi.fn(),
    onViewportChange: vi.fn(),
    onStrokeEnd: vi.fn(),
    onErase: vi.fn(),
  };
}

describe('CanvasController', () => {
  let canvas: HTMLCanvasElement;
  let ev: ControllerEvents;
  let controller: CanvasController;

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    canvas = document.createElement('canvas');
    document.body.append(canvas);
    ev = events();
    controller = new CanvasController(canvas, makeScene(), {
      events: ev,
      makeId: () => 'stroke-1',
    });
    controller.resize(800, 600, 1);
    // World (0, 0) at the screen centre, zoom 1.
    controller.setViewport({ x: -400, y: -300, zoom: 1 });
  });

  afterEach(() => {
    controller.destroy();
    canvas.remove();
    vi.restoreAllMocks();
  });

  const at = (wx: number, wy: number) => ({ x: wx + 400, y: wy + 300 });

  it('selects a node on press and drags it, reporting world positions on drop', () => {
    const p = at(0, 0);
    canvas.dispatchEvent(pointer('pointerdown', p.x, p.y));
    expect(controller.getSelection().has('a')).toBe(true);
    canvas.dispatchEvent(pointer('pointermove', p.x + 50, p.y + 20));
    canvas.dispatchEvent(pointer('pointerup', p.x + 50, p.y + 20));
    expect(ev.onMoveNodes).toHaveBeenCalledOnce();
    const moved = vi.mocked(ev.onMoveNodes).mock.calls[0]![0];
    expect(moved.get('a')).toEqual({ x: 50, y: 20 });
  });

  it('pans the view with a drag on empty canvas, following the pointer', () => {
    const p = at(150, 150);
    canvas.dispatchEvent(pointer('pointerdown', p.x, p.y));
    canvas.dispatchEvent(pointer('pointermove', p.x + 100, p.y));
    canvas.dispatchEvent(pointer('pointerup', p.x + 100, p.y));
    // Content moved right: the same world point is now 100 px further right on screen.
    expect(controller.worldToScreen({ x: 150, y: 150 }).x).toBeCloseTo(p.x + 100);
    expect(ev.onMoveNodes).not.toHaveBeenCalled();
  });

  it('clears the selection or picks an edge on a click on empty canvas', () => {
    controller.select(['a'], undefined);
    const empty = at(150, 150);
    canvas.dispatchEvent(pointer('pointerdown', empty.x, empty.y));
    canvas.dispatchEvent(pointer('pointerup', empty.x, empty.y));
    expect(controller.getSelection().size).toBe(0);
    const onEdge = at(150, 0);
    canvas.dispatchEvent(pointer('pointerdown', onEdge.x, onEdge.y));
    canvas.dispatchEvent(pointer('pointerup', onEdge.x, onEdge.y));
    expect(controller.getSelectedEdge()).toBe('ab');
  });

  it('creates nodes with the node tool and links with the edge tool', () => {
    controller.setTool('node');
    const empty = at(-200, 100);
    canvas.dispatchEvent(pointer('pointerdown', empty.x, empty.y));
    canvas.dispatchEvent(pointer('pointerup', empty.x, empty.y));
    expect(ev.onCreateNode).toHaveBeenCalledWith({ x: -200, y: 100 });

    controller.setTool('edge');
    const a = at(0, 0);
    const b = at(300, 0);
    canvas.dispatchEvent(pointer('pointerdown', a.x, a.y));
    canvas.dispatchEvent(pointer('pointermove', b.x, b.y));
    canvas.dispatchEvent(pointer('pointerup', b.x, b.y));
    expect(ev.onConnect).toHaveBeenCalledWith('a', 'b');
  });

  it('records a smoothed stroke with the pen and erases it with the eraser', () => {
    controller.setTool('draw');
    const start = at(-300, -200);
    canvas.dispatchEvent(pointer('pointerdown', start.x, start.y));
    for (let i = 1; i <= 20; i++)
      canvas.dispatchEvent(pointer('pointermove', start.x + i * 5, start.y));
    canvas.dispatchEvent(pointer('pointerup', start.x + 100, start.y));
    expect(ev.onStrokeEnd).toHaveBeenCalledOnce();
    const stroke = vi.mocked(ev.onStrokeEnd).mock.calls[0]![0];
    expect(stroke.id).toBe('stroke-1');
    expect(stroke.points.length).toBeGreaterThanOrEqual(2);

    controller.setStrokes([stroke]);
    controller.setTool('eraser');
    const mid = at(-260, -200);
    canvas.dispatchEvent(pointer('pointerdown', mid.x, mid.y));
    canvas.dispatchEvent(pointer('pointerup', mid.x, mid.y));
    expect(ev.onErase).toHaveBeenCalledWith(['stroke-1']);
  });

  it('toggles a task when its check circle is pressed', () => {
    const scene = controller.getScene();
    const task = scene.byId.get('t')!;
    const x = task.x - task.w / 2 + 20;
    expect(hitCheck(task, x)).toBe(true);
    const p = at(x, task.y);
    canvas.dispatchEvent(pointer('pointerdown', p.x, p.y));
    expect(ev.onToggleDone).toHaveBeenCalledWith('t');
  });

  it('zooms towards the pointer with ctrl + wheel and pans with the wheel', () => {
    const p = at(0, 0);
    canvas.dispatchEvent(
      new WheelEvent('wheel', { clientX: p.x, clientY: p.y, deltaY: -100, ctrlKey: true }),
    );
    expect(controller.getViewport().zoom).toBeGreaterThan(1);
    expect(controller.worldToScreen({ x: 0, y: 0 }).x).toBeCloseTo(p.x);
    const before = controller.getViewport().y;
    canvas.dispatchEvent(new WheelEvent('wheel', { clientX: p.x, clientY: p.y, deltaY: 120 }));
    expect(controller.getViewport().y).toBeGreaterThan(before);
  });

  it('pinch-zooms with two touch pointers', () => {
    const a = at(-100, 0);
    const b = at(100, 0);
    canvas.dispatchEvent(pointer('pointerdown', a.x, a.y, { pointerId: 1, pointerType: 'touch' }));
    canvas.dispatchEvent(pointer('pointerdown', b.x, b.y, { pointerId: 2, pointerType: 'touch' }));
    canvas.dispatchEvent(
      pointer('pointermove', b.x + 200, b.y, { pointerId: 2, pointerType: 'touch' }),
    );
    expect(controller.getViewport().zoom).toBeGreaterThan(1.5);
    canvas.dispatchEvent(
      pointer('pointerup', b.x + 200, b.y, { pointerId: 2, pointerType: 'touch' }),
    );
    canvas.dispatchEvent(pointer('pointerup', a.x, a.y, { pointerId: 1, pointerType: 'touch' }));
    expect(controller.isGestureActive()).toBe(false);
  });

  it('opens the editor on double click of a node, creates on empty canvas', () => {
    const p = at(300, 0);
    canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: p.x, clientY: p.y }));
    expect(ev.onEditNode).toHaveBeenCalledWith('b');
    const e = at(-300, 250);
    canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: e.x, clientY: e.y }));
    expect(ev.onCreateNode).toHaveBeenCalledWith({ x: -300, y: 250 });
  });

  it('selects nodes inside a shift-drag marquee', () => {
    const from = at(-100, -50);
    const to = at(350, 50);
    canvas.dispatchEvent(pointer('pointerdown', from.x, from.y, { shiftKey: true }));
    canvas.dispatchEvent(pointer('pointermove', to.x, to.y, { shiftKey: true }));
    canvas.dispatchEvent(pointer('pointerup', to.x, to.y, { shiftKey: true }));
    expect([...controller.getSelection()].sort()).toEqual(['a', 'b']);
  });

  it('opens readable on small screens instead of fitting tiny boxes', () => {
    controller.resize(200, 200, 1);
    controller.fitReadable(0.55);
    expect(controller.getViewport().zoom).toBeGreaterThanOrEqual(0.55);
  });

  it('normalises rectangles from any two corners', () => {
    expect(rectFrom({ x: 10, y: 5 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0, width: 10, height: 5 });
  });
});
