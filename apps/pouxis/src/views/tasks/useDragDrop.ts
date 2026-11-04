/**
 * Pointer + keyboard drag and drop between drop zones (kanban columns, matrix quadrants).
 *
 * - Mouse / pen: drag starts after a few pixels of movement.
 * - Touch: press and hold, then drag (a quick swipe still scrolls the page).
 * - Keyboard: Space/Enter on the handle grabs the card, arrows pick the zone, Space/Enter
 *   drops, Escape cancels. Every step is announced through `announce`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

export type ZoneNavigator = (zone: string, key: string, zones: readonly string[]) => string;

/** Left/Up = previous zone, Right/Down = next zone (kanban columns). */
export const linearNavigator: ZoneNavigator = (zone, key, zones) => {
  const i = zones.indexOf(zone);
  const step = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  return zones[Math.min(zones.length - 1, Math.max(0, i + step))] ?? zone;
};

/** 2-column grid (Eisenhower matrix): arrows move in two dimensions. */
export const gridNavigator =
  (columns: number): ZoneNavigator =>
  (zone, key, zones) => {
    const i = zones.indexOf(zone);
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[key] ?? 0;
    const sameRow = key === 'ArrowLeft' || key === 'ArrowRight';
    const j = i + delta;
    if (j < 0 || j >= zones.length) return zone;
    if (sameRow && Math.floor(j / columns) !== Math.floor(i / columns)) return zone;
    return zones[j] ?? zone;
  };

export interface DragState {
  id: string;
  /** Zone currently under the pointer or chosen with the keyboard. */
  over: string | null;
  via: 'pointer' | 'keyboard';
  x: number;
  y: number;
  /** Pointer offset inside the card, so the ghost does not jump. */
  dx: number;
  dy: number;
  width: number;
}

export interface DragDropOptions {
  zones: readonly string[];
  onDrop: (id: string, zone: string) => void;
  announce: (message: string) => void;
  describe: {
    grabbed: (id: string, zone: string) => string;
    over: (zone: string) => string;
    dropped: (id: string, zone: string) => string;
    cancelled: () => string;
  };
  navigate?: ZoneNavigator;
}

const DRAG_THRESHOLD_PX = 6;
const TOUCH_HOLD_MS = 280;

export function zoneAt(x: number, y: number): string | null {
  const el = document.elementFromPoint?.(x, y);
  return el?.closest<HTMLElement>('[data-drop-zone]')?.dataset.dropZone ?? null;
}

export function useDragDrop(opts: DragDropOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const pending = useRef<{
    id: string;
    zone: string;
    x: number;
    y: number;
    el: HTMLElement;
    pointerId: number;
    touch: boolean;
    timer?: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const begin = useCallback((x: number, y: number) => {
    const p = pending.current;
    if (!p) return;
    const rect = p.el.getBoundingClientRect();
    p.el.setPointerCapture?.(p.pointerId);
    suppressClick.current = true;
    setDrag({
      id: p.id,
      over: p.zone,
      via: 'pointer',
      x,
      y,
      dx: p.x - rect.left,
      dy: p.y - rect.top,
      width: rect.width,
    });
  }, []);

  // While a touch drag runs, stop the page from scrolling under the finger.
  useEffect(() => {
    if (drag?.via !== 'pointer') return;
    const block = (e: TouchEvent) => e.preventDefault();
    window.addEventListener('touchmove', block, { passive: false });
    return () => window.removeEventListener('touchmove', block);
  }, [drag?.via]);

  const cancelPending = () => {
    if (pending.current?.timer) window.clearTimeout(pending.current.timer);
    pending.current = null;
  };

  const itemPointerProps = (id: string, zone: string) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as Element).closest('input, textarea, select, [data-no-drag]')) return;
      suppressClick.current = false;
      const touch = e.pointerType === 'touch';
      pending.current = {
        id,
        zone,
        x: e.clientX,
        y: e.clientY,
        el: e.currentTarget,
        pointerId: e.pointerId,
        touch,
      };
      if (touch) {
        const { clientX, clientY } = e;
        pending.current.timer = window.setTimeout(() => begin(clientX, clientY), TOUCH_HOLD_MS);
      }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const p = pending.current;
      const current = dragRef.current;
      if (current && current.via === 'pointer') {
        const over = zoneAt(e.clientX, e.clientY);
        setDrag({ ...current, x: e.clientX, y: e.clientY, over });
        return;
      }
      if (!p) return;
      const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (moved < DRAG_THRESHOLD_PX) return;
      if (p.touch) cancelPending();
      else begin(e.clientX, e.clientY);
    },
    onPointerUp: () => {
      const current = dragRef.current;
      cancelPending();
      if (!current || current.via !== 'pointer') return;
      setDrag(null);
      if (current.over) finish(current.id, current.over);
    },
    onPointerCancel: () => {
      cancelPending();
      if (dragRef.current?.via === 'pointer') setDrag(null);
    },
    onClickCapture: (e: { preventDefault(): void; stopPropagation(): void }) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  });

  const finish = (id: string, zone: string) => {
    const o = optsRef.current;
    o.onDrop(id, zone);
    o.announce(o.describe.dropped(id, zone));
  };

  const handleKeyProps = (id: string, zone: string) => ({
    'aria-pressed': drag?.id === id && drag.via === 'keyboard',
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const o = optsRef.current;
      const current = dragRef.current;
      const grabbed = current?.id === id && current.via === 'keyboard';
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!grabbed) {
          setDrag({ id, over: zone, via: 'keyboard', x: 0, y: 0, dx: 0, dy: 0, width: 0 });
          o.announce(o.describe.grabbed(id, zone));
        } else {
          setDrag(null);
          if (current.over && current.over !== zone) finish(id, current.over);
          else o.announce(o.describe.cancelled());
        }
      } else if (grabbed && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const nav = o.navigate ?? linearNavigator;
        const over = nav(current.over ?? zone, e.key, o.zones);
        setDrag({ ...current, over });
        o.announce(o.describe.over(over));
      } else if (grabbed && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setDrag(null);
        o.announce(o.describe.cancelled());
      }
    },
    onBlur: () => {
      if (dragRef.current?.via === 'keyboard' && dragRef.current.id === id) setDrag(null);
    },
  });

  const zoneProps = (zone: string) => ({
    'data-drop-zone': zone,
    'data-over': drag?.over === zone ? 'true' : undefined,
  });

  return { drag, itemPointerProps, handleKeyProps, zoneProps };
}
