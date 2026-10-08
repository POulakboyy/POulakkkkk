import { useSyncExternalStore } from 'react';

export const VIEW_IDS = [
  'today',
  'tasks',
  'calendar',
  'canvas',
  'ideas',
  'insights',
  'settings',
] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export interface Route {
  view: ViewId;
  params: URLSearchParams;
}

const DEFAULT_VIEW: ViewId = 'today';
let current = parse(globalThis.location?.hash ?? '');
const listeners = new Set<() => void>();

globalThis.addEventListener?.('hashchange', () => {
  current = parse(location.hash);
  for (const l of [...listeners]) l();
});

/** Hash routes: `#/tasks?view=kanban`. Hash routing works identically in browsers and Tauri webviews. */
function parse(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?');
  const view = (VIEW_IDS as readonly string[]).includes(path) ? (path as ViewId) : DEFAULT_VIEW;
  return { view, params: new URLSearchParams(query) };
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

/** Navigates with a cross-fade View Transition when the browser supports it and motion is allowed. */
export function navigate(view: ViewId, params?: Record<string, string>): void {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  const next = `#/${view}${query}`;
  if (location.hash === next) return;
  const go = () => {
    location.hash = next;
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduced) doc.startViewTransition(go);
  else go();
}
