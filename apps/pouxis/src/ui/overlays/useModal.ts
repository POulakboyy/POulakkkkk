import { useEffect, useRef, type RefObject } from 'react';
import { createFocusTrap, restoreFocusTo } from '../hooks/useFocusTrap.ts';
import { lockScroll } from '../hooks/useScrollLock.ts';
import { pushLayer } from './layers.ts';

export interface ModalOptions {
  open: boolean;
  /** The overlay root rendered in the portal (backdrop + panel wrapper). */
  layerRef: RefObject<HTMLElement | null>;
  /** The element that holds focus (the dialog panel). */
  panelRef: RefObject<HTMLElement | null>;
  /** Called on Escape (if `closeOnEscape`). */
  onDismiss: () => void;
  closeOnEscape?: boolean;
  initialFocus?: RefObject<HTMLElement | null> | undefined;
  /** Element to focus on close instead of the one focused before opening. */
  returnFocus?: RefObject<HTMLElement | null> | undefined;
  /** Default `true`: makes the page inert and locks scrolling. */
  modal?: boolean;
}

/**
 * Shared modal behaviour for Dialog and Sheet: overlay stack registration (Escape goes to the
 * top-most layer), `inert` background, scroll lock, focus trap and focus restoration.
 *
 * Order matters: focus moves into the panel *before* the page becomes inert, and on close the
 * trap is released and the page un-inerted *before* focus returns to the trigger.
 */
export function useModal({
  open,
  layerRef,
  panelRef,
  onDismiss,
  closeOnEscape = true,
  initialFocus,
  returnFocus,
  modal = true,
}: ModalOptions): void {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const focusRef = useRef({ initialFocus, returnFocus });
  focusRef.current = { initialFocus, returnFocus };

  useEffect(() => {
    if (!open) return;
    const node = layerRef.current;
    const panel = panelRef.current;
    if (!node || !panel) return;
    const { initialFocus: initial, returnFocus: back } = focusRef.current;
    const trap = createFocusTrap(panel, { restoreFocus: false, ...(initial ? { initialFocus: initial } : {}) });
    const pop = pushLayer({
      node,
      modal,
      onEscape: closeOnEscape ? () => dismissRef.current() : undefined,
    });
    const unlock = modal ? lockScroll() : () => {};
    return () => {
      trap.release();
      pop();
      unlock();
      restoreFocusTo(focusRef.current.returnFocus?.current ?? back?.current ?? trap.previous, panel);
    };
  }, [open, modal, closeOnEscape, layerRef, panelRef]);
}
