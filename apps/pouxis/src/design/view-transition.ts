/**
 * View Transitions API wrapper (progressive enhancement). Falls back to a synchronous update
 * where the API is missing, when the user prefers reduced motion, or in the e-ink theme.
 * Shared elements: give the mini-player and the full player the same `px-vt-player` class
 * (only one is mounted at a time) and the browser morphs one into the other.
 */

interface ViewTransitionLike {
  /** Settles once `update` has run; rejects with its error. */
  updateCallbackDone: Promise<void>;
  /** Settles when the animation ends; rejects if the transition is skipped. */
  finished: Promise<void>;
}

type StartViewTransition = (update: () => void | Promise<void>) => ViewTransitionLike;

function motionAllowed(): boolean {
  if (document.documentElement.dataset.theme === 'eink') return false;
  const mql =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  return !mql?.matches;
}

/**
 * Runs `update` inside a view transition when possible. Resolves once the DOM is updated
 * (not when the animation ends) and rejects with `update`'s own error.
 */
export async function withViewTransition(update: () => void | Promise<void>): Promise<void> {
  const start = (document as Document & { startViewTransition?: StartViewTransition })
    .startViewTransition;
  if (typeof start !== 'function' || !motionAllowed()) {
    await update();
    return;
  }
  const transition = start.call(document, update);
  transition.finished.catch(() => {
    // A skipped or aborted animation is cosmetic; errors surface via updateCallbackDone.
  });
  await transition.updateCallbackDone;
}
