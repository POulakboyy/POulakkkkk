import { useEffect, useRef, type RefObject } from 'react';
import { pushLayer } from './layers.ts';

export interface DismissOptions {
  open: boolean;
  /** The overlay node (registered in the layer stack). */
  layerRef: RefObject<HTMLElement | null>;
  /** Elements that do not count as "outside" (the trigger). */
  insideRefs?: readonly RefObject<HTMLElement | null>[];
  /** Escape (top-most layer only). */
  onEscape: () => void;
  /** Pointer down outside, or focus leaving to the page. */
  onOutside: () => void;
}

/**
 * Non-modal overlay dismissal (Popover, Menu): Escape through the overlay stack, pointer-down
 * outside, and focus moving outside. Overlays opened from inside this one count as inside.
 */
export function useDismiss({
  open,
  layerRef,
  insideRefs = [],
  onEscape,
  onOutside,
}: DismissOptions) {
  const handlers = useRef({ onEscape, onOutside, insideRefs });
  handlers.current = { onEscape, onOutside, insideRefs };

  useEffect(() => {
    if (!open) return;
    const node = layerRef.current;
    if (!node) return;
    const pop = pushLayer({ node, modal: false, onEscape: () => handlers.current.onEscape() });
    const isInside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      if (node.contains(target)) return true;
      if (handlers.current.insideRefs.some((r) => r.current?.contains(target))) return true;
      // Nested overlays registered after this one (submenus, tooltips) are inside.
      const layer = target instanceof Element ? target.closest('[data-px-layer]') : null;
      const own = Number(node.getAttribute('data-px-layer'));
      return !!layer && Number(layer.getAttribute('data-px-layer')) > own;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!isInside(e.target)) handlers.current.onOutside();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!isInside(e.target)) handlers.current.onOutside();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      pop();
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, layerRef]);
}
