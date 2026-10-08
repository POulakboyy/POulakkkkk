import { useEffect, useRef, type RefObject } from 'react';
import { focusElement, getTabbable } from '../utils/dom.ts';

export interface FocusTrapOptions {
  /** Element to focus on activation. Defaults to the first tabbable element, then the container. */
  initialFocus?: RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);
  /** Return focus to the previously focused element on deactivation. Default `true`. */
  restoreFocus?: boolean;
  /** Element to return focus to instead of the previously focused one. */
  returnFocus?: RefObject<HTMLElement | null>;
}

export interface FocusTrap {
  /** The element that had focus before the trap activated. */
  previous: HTMLElement | null;
  /** Stops trapping (and restores focus if `restoreFocus`). */
  release: () => void;
}

const trapStack: object[] = [];

/**
 * Imperative focus trap: moves focus into `container`, cycles Tab / Shift+Tab, pulls stray focus
 * back. Nested traps work: only the most recently created one is enforced. Overlays layered
 * above (`[data-px-layer]`) and exempt regions (`[data-px-inert-exempt]`, e.g. toasts) may
 * receive focus.
 */
export function createFocusTrap(container: HTMLElement, options: FocusTrapOptions = {}): FocusTrap {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const token = {};
  trapStack.push(token);

  const { initialFocus } = options;
  const initial = typeof initialFocus === 'function' ? initialFocus() : initialFocus?.current ?? null;
  if (!container.contains(document.activeElement)) {
    focusElement(initial ?? getTabbable(container)[0] ?? container);
  }

  const isTop = () => trapStack[trapStack.length - 1] === token;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !isTop() || e.defaultPrevented) return;
    const tabbable = getTabbable(container);
    if (tabbable.length === 0) {
      e.preventDefault();
      focusElement(container);
      return;
    }
    const first = tabbable[0]!;
    const last = tabbable[tabbable.length - 1]!;
    const current = document.activeElement;
    if (e.shiftKey && (current === first || current === container || !container.contains(current))) {
      e.preventDefault();
      focusElement(last);
    } else if (!e.shiftKey && (current === last || !container.contains(current))) {
      e.preventDefault();
      focusElement(first);
    }
  };

  const onFocusIn = (e: FocusEvent) => {
    if (!isTop()) return;
    const target = e.target as Node | null;
    if (target && container.contains(target)) return;
    if (target instanceof Element && target.closest('[data-px-layer], [data-px-inert-exempt]')) {
      // Focus may go to overlays layered above (menus) or exempt regions (toasts) — but not
      // to the layer that contains this trap's own background.
      if (!target.closest('[data-px-layer]')?.contains(container)) return;
    }
    focusElement(getTabbable(container)[0] ?? container);
  };

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('focusin', onFocusIn);

  let released = false;
  return {
    previous,
    release() {
      if (released) return;
      released = true;
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      const i = trapStack.indexOf(token);
      if (i >= 0) trapStack.splice(i, 1);
      const { restoreFocus = true, returnFocus } = options;
      if (restoreFocus) restoreFocusTo(returnFocus?.current ?? previous, container);
    },
  };
}

/** Moves focus back to `target` if focus is currently lost (inside `container` or on `<body>`). */
export function restoreFocusTo(target: HTMLElement | null | undefined, container: HTMLElement): void {
  const active = document.activeElement;
  if (!target || !target.isConnected) return;
  if (!active || active === document.body || container.contains(active)) focusElement(target);
}

/**
 * Keeps keyboard focus inside `containerRef` while `active`: moves focus in on activation,
 * cycles Tab / Shift+Tab, pulls stray focus back, and restores focus on deactivation.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options: FocusTrapOptions = {},
): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const trap = createFocusTrap(container, {
      ...optionsRef.current,
      // Read the latest options at release time.
      get restoreFocus() {
        return optionsRef.current.restoreFocus;
      },
    });
    return () => trap.release();
  }, [active, containerRef]);
}
