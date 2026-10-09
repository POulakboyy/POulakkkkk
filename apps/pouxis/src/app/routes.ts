import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { MessageKey } from '../i18n/index.ts';
import {
  IconCalendar,
  IconCanvas,
  IconIdeas,
  IconInsights,
  IconSettings,
  IconTasks,
  IconToday,
} from '../ui/icons.tsx';
import type { ViewId } from './router.ts';

export interface ViewDef {
  id: ViewId;
  label: MessageKey;
  icon: ComponentType<{ size?: number }>;
  component: LazyExoticComponent<ComponentType>;
  /** Shown in the mobile tab bar (max 4 + the central capture button). */
  mobileTab: boolean;
}

/** Views are code-split: each one loads on first visit. */
export const VIEWS: readonly ViewDef[] = [
  {
    id: 'today',
    label: 'nav.today',
    icon: IconToday,
    component: lazy(() => import('../views/today/index.tsx')),
    mobileTab: true,
  },
  {
    id: 'tasks',
    label: 'nav.tasks',
    icon: IconTasks,
    component: lazy(() => import('../views/tasks/index.tsx')),
    mobileTab: true,
  },
  {
    id: 'calendar',
    label: 'nav.calendar',
    icon: IconCalendar,
    component: lazy(() => import('../views/calendar/index.tsx')),
    mobileTab: true,
  },
  {
    id: 'canvas',
    label: 'nav.canvas',
    icon: IconCanvas,
    component: lazy(() => import('../views/canvas/index.tsx')),
    mobileTab: false,
  },
  {
    id: 'ideas',
    label: 'nav.ideas',
    icon: IconIdeas,
    component: lazy(() => import('../views/ideas/index.tsx')),
    mobileTab: true,
  },
  {
    id: 'insights',
    label: 'nav.insights',
    icon: IconInsights,
    component: lazy(() => import('../views/insights/index.tsx')),
    mobileTab: false,
  },
  {
    id: 'settings',
    label: 'nav.settings',
    icon: IconSettings,
    component: lazy(() => import('../views/settings/index.tsx')),
    mobileTab: false,
  },
];
