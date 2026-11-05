import { useEffect } from 'react';

let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/** Locks page scrolling (ref-counted, so nested overlays are safe). Returns the unlock function. */
export function lockScroll(): () => void {
  const html = document.documentElement;
  if (locks === 0) {
    const scrollbar = window.innerWidth - html.clientWidth;
    saved = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
    html.style.overflow = 'hidden';
    // Compensate for the vanished scrollbar so the layout does not jump.
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
  }
  locks++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks--;
    if (locks === 0 && saved) {
      html.style.overflow = saved.overflow;
      html.style.paddingRight = saved.paddingRight;
      saved = null;
    }
  };
}

/** Locks page scrolling while `active` (modal overlays). */
export function useScrollLock(active: boolean): void {
  useEffect(() => (active ? lockScroll() : undefined), [active]);
}
