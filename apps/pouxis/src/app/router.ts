import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { withViewTransition } from '../design/view-transition.ts';

export const VIEW_IDS = [
  'today',
  'tasks',
  'calendar',
  'canvas',
  'ideas',
  'insights',
  'settings',
  'lab',
  /** Minimal quick-capture window opened by the Tauri global shortcut (`index.html#/capture`). */
  'capture',
] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export interface Route {
  view: ViewId;
  params: URLSearchParams;
}

export const DEFAULT_VIEW: ViewId = 'today';

/** Hash routes: `#/tasks?view=kanban`. Hash routing works identically in browsers and Tauri webviews. */
export function parseHash(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?');
  const view = (VIEW_IDS as readonly string[]).includes(path) ? (path as ViewId) : DEFAULT_VIEW;
  return { view, params: new URLSearchParams(query) };
}

export function routeHash(view: ViewId, params?: Record<string, string>): string {
  const query = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : '';
  return `#/${view}${query}`;
}

let current = parseHash(globalThis.location?.hash ?? '');
const listeners = new Set<() => void>();

let currentHash = globalThis.location?.hash ?? '';

function commit(hash: string): void {
  if (hash === currentHash) return;
  currentHash = hash;
  current = parseHash(hash);
  for (const l of [...listeners]) l();
}

globalThis.addEventListener?.('hashchange', () => commit(location.hash));

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRoute(): Route {
  return current;
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute, getRoute);
}

/**
 * Navigates with a short cross-fade View Transition (MOTION.md § 5) when the browser supports
 * it and motion is allowed. The hash is applied synchronously inside the transition so the new
 * view is captured, not the old one.
 */
export function navigate(view: ViewId, params?: Record<string, string>): void {
  const next = routeHash(view, params);
  if (location.hash === next) return;
  void withViewTransition(() => {
    location.hash = next;
    // Render synchronously so the transition snapshots the new view.
    flushSync(() => commit(next));
  });
}
