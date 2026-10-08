import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query. Returns `fallback` where `matchMedia` is unavailable
 * (tests, very old webviews).
 *
 * @example const isDesktop = useMediaQuery('(min-width: 768px)');
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    [query],
  );
  const getSnapshot = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : fallback;
  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}

/** Breakpoint shared with the shell: sidebar + side panels from 768 px, tab bar + bottom sheets below. */
export const DESKTOP_QUERY = '(min-width: 768px)';
