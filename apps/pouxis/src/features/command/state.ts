import { useSyncExternalStore } from 'react';

/**
 * Open/closed state of the command bar, shared by the shell (⌘K, capture buttons), the keymap
 * and any feature that wants to prefill it. Other modules may also dispatch
 * `COMMAND_OPEN_EVENT` on window with an optional `{ text }` detail.
 */

export const COMMAND_OPEN_EVENT = 'pouxis:command-open';

export interface CommandBarState {
  open: boolean;
  /** Text the composer starts with (`'/'` opens straight into commands). */
  initialText: string;
  /** Changes on every opening so the composer resets even if it was already open. */
  session: number;
}

let state: CommandBarState = { open: false, initialText: '', session: 0 };
const listeners = new Set<() => void>();

function set(next: CommandBarState): void {
  state = next;
  for (const l of [...listeners]) l();
}

export function openCommandBar(initialText: unknown = ''): void {
  // Tolerates being used directly as an event handler (`onClick={openCommandBar}`).
  const text = typeof initialText === 'string' ? initialText : '';
  set({ open: true, initialText: text, session: state.session + 1 });
}

export function closeCommandBar(): void {
  if (state.open) set({ ...state, open: false });
}

export function getCommandBarState(): CommandBarState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCommandBar(): CommandBarState {
  return useSyncExternalStore(subscribe, getCommandBarState, getCommandBarState);
}

globalThis.addEventListener?.(COMMAND_OPEN_EVENT, (e: Event) => {
  const detail = (e as CustomEvent<{ text?: unknown } | undefined>).detail;
  openCommandBar(typeof detail?.text === 'string' ? detail.text : '');
});
