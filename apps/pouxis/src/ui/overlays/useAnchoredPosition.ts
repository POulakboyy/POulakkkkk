import { useLayoutEffect, useState, type RefObject } from 'react';
import { computePosition, type Placement, type Position } from './position.ts';

/**
 * Positions `floatingRef` next to `anchorRef` while `open`, and keeps it there on scroll and
 * resize. Apply the result as `transform: translate3d(x, y, 0)` on a `position: fixed` wrapper.
 */
export function useAnchoredPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  placement: Placement,
  offset = 8,
): Position | null {
  const [pos, setPos] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    let frame = 0;
    const update = () => {
      const anchor = anchorRef.current;
      const floating = floatingRef.current;
      if (!anchor || !floating) return;
      const a = anchor.getBoundingClientRect();
      const size = { width: floating.offsetWidth, height: floating.offsetHeight };
      const viewport = {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      };
      const next = computePosition(
        { top: a.top, left: a.left, width: a.width, height: a.height },
        size,
        placement,
        { offset, viewport },
      );
      setPos((prev) =>
        prev && prev.x === next.x && prev.y === next.y && prev.placement === next.placement ? prev : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    if (floatingRef.current) ro?.observe(floatingRef.current);
    if (anchorRef.current) ro?.observe(anchorRef.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      ro?.disconnect();
    };
  }, [open, anchorRef, floatingRef, placement, offset]);

  return pos;
}
