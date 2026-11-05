/**
 * Zen interface (7.4): after `delayMs` without any input, <html> gets `data-zen="idle"` and
 * every `.px-chrome` element (toolbars, menus, scrollbars) fades out (motion.css). Chrome
 * stays in the DOM, focusable and reachable: hovering or focusing it reveals it at once, and
 * any pointer, key, wheel or touch input wakes the whole interface.
 *
 * Not applied under `prefers-reduced-motion` (docs/research/SCIENTIFIC_BASIS.md, 7.4): users
 * who asked for a calmer interface should not see controls vanish on their own.
 */
import { useEffect, useState } from 'react';

export const ZEN_ATTRIBUTE = 'zen';
export const ZEN_DEFAULT_DELAY_MS = 3000;

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const WAKE_EVENTS = [
  'pointermove',
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'focusin',
] as const;

export interface UseZenIdleOptions {
  /** Idle time before the chrome fades. Defaults to 3 s (brief, feature 7.4). */
  delayMs?: number;
  enabled: boolean;
  /** Element carrying the attribute; defaults to <html>. */
  root?: HTMLElement;
}

/** Returns whether the interface is currently idle. */
export function useZenIdle({
  delayMs = ZEN_DEFAULT_DELAY_MS,
  enabled,
  root,
}: UseZenIdleOptions): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const el = root ?? document.documentElement;
    if (!enabled || reducedMotion()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sleep = () => {
      // A hidden tab has no "user at rest": keep the state as it was when leaving.
      if (document.visibilityState === 'hidden') return;
      el.dataset[ZEN_ATTRIBUTE] = 'idle';
      setIdle(true);
    };
    const wake = () => {
      if (el.dataset[ZEN_ATTRIBUTE]) {
        delete el.dataset[ZEN_ATTRIBUTE];
        setIdle(false);
      }
      clearTimeout(timer);
      timer = setTimeout(sleep, delayMs);
    };

    for (const type of WAKE_EVENTS) window.addEventListener(type, wake, { passive: true });
    timer = setTimeout(sleep, delayMs);
    return () => {
      clearTimeout(timer);
      for (const type of WAKE_EVENTS) window.removeEventListener(type, wake);
      delete el.dataset[ZEN_ATTRIBUTE];
      setIdle(false);
    };
  }, [enabled, delayMs, root]);

  return idle;
}
