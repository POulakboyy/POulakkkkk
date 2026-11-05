/**
 * Brain dump (5.14) state, framework-free so any part of the app (shortcut, command bar, tray)
 * can open it: `brainDump.open()`. `<BrainDumpHost />` renders it.
 */
import { useSyncExternalStore } from 'react';
import { translate } from '../../../i18n/index.ts';
import type { Store } from '../../../store/index.ts';
import { toast } from '../../../ui/index.ts';
import { inboxTask, splitIdeas } from '../lib/notes.ts';

let isOpen = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of [...listeners]) l();
}

export const brainDump = {
  isOpen: (): boolean => isOpen,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  open(): void {
    if (isOpen) return;
    isOpen = true;
    emit();
  },
  close(): void {
    if (!isOpen) return;
    isOpen = false;
    emit();
  },
};

export function useBrainDumpOpen(): boolean {
  return useSyncExternalStore(brainDump.subscribe, brainDump.isOpen, brainDump.isOpen);
}

/**
 * Sends every idea of `text` to the task inbox as one undoable step and confirms with a toast.
 * Returns the number of tasks created.
 */
export function flushToInbox(store: Store, text: string): number {
  const ideas = splitIdeas(text);
  if (ideas.length === 0) return 0;
  store.batch(() => {
    for (const title of ideas) store.create('tasks', inboxTask(title));
  });
  const { locale } = store.prefs();
  toast({
    title: translate(locale, 'ideas.brainDump.sent', { count: ideas.length }),
    tone: 'success',
    action: { label: translate(locale, 'common.undo'), onClick: () => store.undo() },
  });
  return ideas.length;
}
