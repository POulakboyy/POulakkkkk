import { createElement, lazy, useState, type ComponentType } from 'react';
import type { MessageKey } from '../i18n/index.ts';
import {
  IconCalendar,
  IconCanvas,
  IconIdeas,
  IconInsights,
  IconLayers,
  IconSettings,
  IconTasks,
  IconToday,
} from '../ui/icons.tsx';
import type { ViewId } from './router.ts';

/** Views reachable from the navigation (`capture` is a separate window, not a view). */
export type NavViewId = Exclude<ViewId, 'capture'>;

export interface ViewDef {
  id: NavViewId;
  label: MessageKey;
  icon: ComponentType<{ size?: number }>;
  /** Suspends while the chunk loads, unless it was already prefetched. */
  component: ComponentType;
  /** Fetches and evaluates the view's chunk without rendering it (hover / idle prefetch). */
  preload: () => Promise<unknown>;
  /** Shown in the mobile tab bar (max 4 + the central capture button). */
  mobileTab: boolean;
  /** Sidebar group: main views first, then secondary ones pinned at the bottom. */
  group: 'main' | 'secondary';
}

type ViewModule = { default: ComponentType };

/**
 * One loader shared by rendering and prefetching. Once the chunk is in, the view renders
 * directly: `lazy()` alone suspends on every first render, even for a prefetched chunk, which
 * flashes the skeleton and makes the navigation's View Transition capture it.
 */
export function split(load: () => Promise<ViewModule>): Pick<ViewDef, 'component' | 'preload'> {
  let loaded: ComponentType | null = null;
  const preload = () =>
    load().then((mod) => {
      loaded = mod.default;
      return mod;
    });
  const Lazy = lazy(preload);
  function SplitView() {
    // Fixed per mount: switching from `Lazy` to the module later would remount the view.
    const [View] = useState<ComponentType>(() => loaded ?? Lazy);
    return createElement(View);
  }
  return { component: SplitView, preload };
}

/** Views are code-split: each one loads on first visit, or earlier when prefetched. */
export const VIEWS: readonly ViewDef[] = [
  {
    id: 'today',
    label: 'nav.today',
    icon: IconToday,
    ...split(() => import('../views/today/index.tsx')),
    mobileTab: true,
    group: 'main',
  },
  {
    id: 'tasks',
    label: 'nav.tasks',
    icon: IconTasks,
    ...split(() => import('../views/tasks/index.tsx')),
    mobileTab: true,
    group: 'main',
  },
  {
    id: 'calendar',
    label: 'nav.calendar',
    icon: IconCalendar,
    ...split(() => import('../views/calendar/index.tsx')),
    mobileTab: true,
    group: 'main',
  },
  {
    id: 'canvas',
    label: 'nav.canvas',
    icon: IconCanvas,
    ...split(() => import('../views/canvas/index.tsx')),
    mobileTab: false,
    group: 'main',
  },
  {
    id: 'ideas',
    label: 'nav.ideas',
    icon: IconIdeas,
    ...split(() => import('../views/ideas/index.tsx')),
    mobileTab: true,
    group: 'main',
  },
  {
    id: 'insights',
    label: 'nav.insights',
    icon: IconInsights,
    ...split(() => import('../views/insights/index.tsx')),
    mobileTab: false,
    group: 'main',
  },
  {
    id: 'settings',
    label: 'nav.settings',
    icon: IconSettings,
    ...split(() => import('../views/settings/index.tsx')),
    mobileTab: false,
    group: 'secondary',
  },
  {
    id: 'lab',
    label: 'nav.lab',
    icon: IconLayers,
    ...split(() => import('./LabView.tsx')),
    mobileTab: false,
    group: 'secondary',
  },
];

export function viewDef(id: ViewId): ViewDef {
  return VIEWS.find((v) => v.id === id) ?? VIEWS[0]!;
}
