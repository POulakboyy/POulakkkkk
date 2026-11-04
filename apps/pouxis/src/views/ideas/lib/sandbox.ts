/**
 * Sandbox lifecycle (5.8): sandbox notes never survive the session. They are purged when the
 * page is hidden for good and, as a safety net, when a new session starts (the purge on exit
 * may not reach storage if the app is killed).
 */
import type { Note } from '@pouxis/core';
import type { Store } from '../../../store/index.ts';

export const SESSION_FLAG = 'pouxis:ideas:session';

export function sandboxNotes(notes: readonly Note[]): Note[] {
  return notes.filter((n) => n.sandbox === true);
}

/** Removes every sandbox note; returns how many were removed. */
export function purgeSandbox(store: Store): number {
  const doomed = sandboxNotes(store.all('notes'));
  for (const note of doomed) store.remove('notes', note.id);
  return doomed.length;
}

/**
 * True the first time it is called in a browsing session (tab or app window). Without
 * `sessionStorage` every call counts as a new session, which only errs towards purging.
 */
export function startSession(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined): boolean {
  try {
    if (!storage) return true;
    if (storage.getItem(SESSION_FLAG)) return false;
    storage.setItem(SESSION_FLAG, '1');
    return true;
  } catch {
    return true;
  }
}

let installed = false;

/** Purges leftovers of a previous session once, then purges again on exit. Idempotent. */
export function installSandboxLifecycle(store: Store, win: Window | undefined = globalThis.window): void {
  if (installed) return;
  installed = true;
  let storage: Storage | undefined;
  try {
    storage = win?.sessionStorage;
  } catch {
    storage = undefined;
  }
  if (startSession(storage)) purgeSandbox(store);
  win?.addEventListener('pagehide', (event) => {
    if (!(event as PageTransitionEvent).persisted) purgeSandbox(store);
  });
}

/** Test hook. */
export function resetSandboxLifecycle(): void {
  installed = false;
}
