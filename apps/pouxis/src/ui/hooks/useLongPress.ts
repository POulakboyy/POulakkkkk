import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { platform } from '../../platform/index.ts';

export interface LongPressOptions {
  /** Hold duration before firing, in ms. Default 480. */
  delay?: number;
  /** Pointer travel (px) that cancels the press, so scrolling never triggers it. Default 10. */
  tolerance?: number;
  /** Fire a haptic tick when the press triggers. Default `true`. */
  haptic?: boolean;
  /** Also fire on the context-menu event (right click, Shift+F10, the Menu key). Default `true`. */
  contextMenu?: boolean;
}

export interface LongPressHandlers<T extends Element> {
  onPointerDown: (e: ReactPointerEvent<T>) => void;
  onPointerMove: (e: ReactPointerEvent<T>) => void;
  onPointerUp: (e: ReactPointerEvent<T>) => void;
  onPointerCancel: (e: ReactPointerEvent<T>) => void;
  onPointerLeave: (e: ReactPointerEvent<T>) => void;
  onContextMenu: (e: ReactMouseEvent<T>) => void;
  onClickCapture: (e: ReactMouseEvent<T>) => void;
}

/**
 * Long-press (touch/pen/mouse) with movement tolerance; suppresses the click that follows.
 * The context-menu event doubles as the keyboard and right-click path.
 *
 * @example <ListRow {...useLongPress(() => openMenu())} />
 */
export function useLongPress<T extends Element = HTMLElement>(
  onLongPress: (e: ReactPointerEvent<T> | ReactMouseEvent<T>) => void,
  { delay = 480, tolerance = 10, haptic = true, contextMenu = true }: LongPressOptions = {},
): LongPressHandlers<T> {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cb = useRef(onLongPress);
  cb.current = onLongPress;

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    start.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      e.persist?.();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        if (haptic) platform.haptic('medium');
        cb.current(e);
        start.current = null;
      }, delay);
    },
    onPointerMove: (e) => {
      if (!start.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > tolerance) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e) => {
      if (!contextMenu) return;
      e.preventDefault();
      // Touch long-press may also emit `contextmenu`: never fire twice.
      if (fired.current) return;
      clear();
      cb.current(e);
    },
    onClickCapture: (e) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}
