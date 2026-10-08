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

/**
 * Keeps keyboard focus inside `containerRef` while `active`: moves focus in on activation,
 * cycles Tab / Shift+Tab, pulls stray focus back, and restores focus on deactivation.
 * Nested traps work: only the most recently activated trap is enforced.
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
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const token = {};
    trapStack.push(token);

    const { initialFocus } = optionsRef.current;
    const initial =
      typeof initialFocus === 'function' ? initialFocus() : initialFocus?.current ?? null;
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
      if (e.shiftKey && (current === first || !container.contains(current))) {
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
      // Allow focus into overlays layered above this one (menus, tooltips, toasts).
      if (target instanceof Element && target.closest('[data-px-layer-above], [data-px-inert-exempt]'))
        return;
      focusElement(getTabbable(container)[0] ?? container);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      const i = trapStack.indexOf(token);
      if (i >= 0) trapStack.splice(i, 1);
      const { restoreFocus = true, returnFocus } = optionsRef.current;
      if (!restoreFocus) return;
      const target = returnFocus?.current ?? previous;
      // Only restore if focus is lost (inside the closing container or on <body>).
      const activeEl = document.activeElement;
      if (target && target.isConnected && (!activeEl || activeEl === document.body || container.contains(activeEl))) {
        focusElement(target);
      }
    };
  }, [active, containerRef]);
}

const trapStack: object[] = [];
