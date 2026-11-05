/**
 * Pointer gestures of the time grid: drag on empty space to draw a new slot (mouse and pen;
 * touch scrolls instead and a tap creates), drag an event to move it, drag its edges to
 * resize it. The live result is exposed as `preview`; nothing is stored until release.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  DRAG_THRESHOLD_PX,
  applyGesture,
  drawSlot,
  type Gesture,
  type Slot,
} from './model/drag.ts';

export interface GridPreview {
  /** Instance being moved or resized; absent while drawing a new slot. */
  key?: string;
  slot: Slot;
}

interface Active {
  pointerId: number;
  x0: number;
  y0: number;
  started: boolean;
  /** `null` when drawing a new slot. */
  key: string | null;
  gesture: Gesture;
  origin: Slot;
  anchorMin: number;
  slot: Slot;
}

export interface GridDragOptions {
  dayCount: number;
  hourHeight: number;
  /** Column index under a viewport x, clamped to the visible columns. */
  columnAt: (clientX: number) => number;
  /** Minutes from midnight under a viewport y, in any column. */
  minuteAt: (clientY: number) => number;
  onMove: (key: string, slot: Slot) => void;
  onDraw: (slot: Slot) => void;
}

export function useGridDrag(options: GridDragOptions) {
  const [preview, setPreview] = useState<GridPreview | null>(null);
  const active = useRef<Active | null>(null);
  const suppressClick = useRef(false);
  const opts = useRef(options);
  opts.current = options;

  const update = (a: Active, e: PointerEvent) => {
    const dx = e.clientX - a.x0;
    const dy = e.clientY - a.y0;
    if (!a.started) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      a.started = true;
    }
    const o = opts.current;
    if (a.key === null) {
      a.slot = drawSlot(a.origin.day, a.anchorMin, o.minuteAt(e.clientY));
      setPreview({ slot: a.slot });
    } else {
      const deltaMin = (dy / o.hourHeight) * 60;
      const deltaDay = a.gesture === 'move' ? o.columnAt(e.clientX) - a.origin.day : 0;
      a.slot = applyGesture(a.gesture, a.origin, deltaMin, deltaDay, o.dayCount);
      setPreview({ key: a.key, slot: a.slot });
    }
  };

  const finish = (a: Active, commit: boolean) => {
    active.current = null;
    setPreview(null);
    if (!a.started) return;
    suppressClick.current = true;
    if (!commit) return;
    if (a.key === null) opts.current.onDraw(a.slot);
    else opts.current.onMove(a.key, a.slot);
  };

  const begin = (
    e: ReactPointerEvent,
    init: Omit<Active, 'pointerId' | 'x0' | 'y0' | 'started'>,
  ) => {
    if (e.button !== 0 || active.current) return;
    const a: Active = {
      ...init,
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      started: false,
    };
    active.current = a;
    suppressClick.current = false;
    const mine = (ev: PointerEvent) => ev.pointerId === a.pointerId;
    const onMove = (ev: PointerEvent) => {
      if (mine(ev)) update(a, ev);
    };
    const onEnd = (ev: PointerEvent) => {
      if (!mine(ev)) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      finish(a, ev.type === 'pointerup');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };

  /** Pointer down on an event block (or one of its resize handles). */
  const startEvent = (e: ReactPointerEvent, key: string, origin: Slot, gesture: Gesture) => {
    e.stopPropagation();
    begin(e, { key, gesture, origin, anchorMin: origin.startMin, slot: origin });
  };

  /** Pointer down on the empty background of a column. Touch keeps scrolling the grid. */
  const startDraw = (e: ReactPointerEvent, day: number) => {
    if (e.pointerType === 'touch') return;
    const minute = opts.current.minuteAt(e.clientY);
    const origin = { day, startMin: minute, endMin: minute };
    begin(e, { key: null, gesture: 'resize-end', origin, anchorMin: minute, slot: origin });
  };

  /** True once after a drag ended, so the click that follows it is ignored. */
  const consumeClick = () => {
    const was = suppressClick.current;
    suppressClick.current = false;
    return was;
  };

  return { preview, startEvent, startDraw, consumeClick };
}
