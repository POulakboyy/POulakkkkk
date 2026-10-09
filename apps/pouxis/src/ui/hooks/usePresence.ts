import { useCallback, useEffect, useRef, useState } from 'react';
import { getMaxMotionMs } from '../utils/dom.ts';

export type PresenceState = 'open' | 'closed';

export interface Presence<T extends HTMLElement> {
  /** Render the element while this is true (it stays true during the exit animation). */
  mounted: boolean;
  /** `open` while present, `closed` while the exit animation runs: bind it to `data-state`. */
  state: PresenceState;
  /** Attach to the element whose CSS animation/transition marks the end of the exit. */
  ref: (node: T | null) => void;
}

/**
 * Mount/unmount with exit animations, without a library.
 *
 * Style the enter with a keyframe on `[data-state='open']` and the exit with a keyframe (or
 * transition) on `[data-state='closed']`. When `present` turns false the element keeps
 * rendering until its longest animation ends; with reduced motion the tokens are 0 ms and it
 * unmounts immediately.
 *
 * @example
 * const p = usePresence(open);
 * return p.mounted && <div ref={p.ref} data-state={p.state} className={s.panel} />;
 */
export function usePresence<T extends HTMLElement = HTMLElement>(present: boolean): Presence<T> {
  const [mounted, setMounted] = useState(present);
  const nodeRef = useRef<T | null>(null);

  // Derived state: mount synchronously as soon as `present` flips on.
  if (present && !mounted) setMounted(true);

  useEffect(() => {
    if (present || !mounted) return;
    const node = nodeRef.current;
    const ms = node ? getMaxMotionMs(node) : 0;
    if (!node || ms <= 0) {
      setMounted(false);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setMounted(false);
    };
    const onEnd = (e: Event) => {
      if (e.target === node) finish();
    };
    node.addEventListener('animationend', onEnd);
    node.addEventListener('transitionend', onEnd);
    const timer = window.setTimeout(finish, ms + 50);
    return () => {
      node.removeEventListener('animationend', onEnd);
      node.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
    };
  }, [present, mounted]);

  const ref = useCallback((node: T | null) => {
    nodeRef.current = node;
  }, []);

  return { mounted: present || mounted, state: present ? 'open' : 'closed', ref };
}
