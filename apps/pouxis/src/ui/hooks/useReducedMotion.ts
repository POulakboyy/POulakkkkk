import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(notify: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mql = typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
  mql?.addEventListener('change', notify);
  // The e-ink theme also disables motion; watch the theme attribute on <html>.
  const observer =
    typeof MutationObserver === 'function' ? new MutationObserver(notify) : null;
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => {
    mql?.removeEventListener('change', notify);
    observer?.disconnect();
  };
}

/** Synchronous read for non-React code (gesture handlers, imperative animations). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.dataset.theme === 'eink') return true;
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
}

/**
 * True when the user asked for reduced motion (OS setting) or uses the e-ink theme.
 * CSS durations already collapse through the `--dur-*` tokens; use this hook for JS-driven
 * motion (gesture fly-outs, count-ups, auto-advancing carousels).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
