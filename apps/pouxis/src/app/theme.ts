import { useEffect } from 'react';
import type { Task, WorkMode } from '@pouxis/core';
import { useDaylight } from '../design/daylight.ts';
import { useZenIdle } from '../design/zen.ts';
import { THEMES, type AppPrefs, type ThemePref } from './appPrefs.ts';
import type { ViewId } from './router.ts';

/**
 * Applies a theme preference to <html>. `auto` and `daylight` leave `data-theme` unset (the OS
 * preference, or the sun via `useDaylight`, decides); the others force one (tokens.css § themes).
 */
export function applyTheme(theme: ThemePref, root: HTMLElement = document.documentElement): void {
  if (theme === 'light' || theme === 'dark' || theme === 'eink') root.dataset.theme = theme;
  else delete root.dataset.theme;
}

/** Next theme in the Settings order, for the "change theme" command. */
export function nextTheme(theme: ThemePref): ThemePref {
  const i = THEMES.indexOf(theme);
  return THEMES[(i + 1) % THEMES.length] ?? 'auto';
}

/** `data-mode` value: blue tint for creative work, warm tint for execution (tokens.css). */
export type UiMode = 'create' | 'execute';

const VIEW_MODE: Partial<Record<ViewId, UiMode>> = {
  canvas: 'create',
  ideas: 'create',
  tasks: 'execute',
  calendar: 'execute',
  insights: 'execute',
};

/**
 * The colour mode of a view. Today follows the task in progress, if any, so the tint names the
 * kind of work being done right now; other views have a fixed nature.
 */
export function modeForView(view: ViewId, doing?: WorkMode): UiMode | undefined {
  if (view === 'today' && doing) return doing === 'create' ? 'create' : 'execute';
  return VIEW_MODE[view];
}

/**
 * Work mode of the running task. Memoised on the collection's identity: the store hands out the
 * same array until tasks change, so subscribers can call this on every store notification.
 */
export const doingMode: (tasks: readonly Task[]) => WorkMode | undefined = (() => {
  let lastTasks: readonly Task[] | null = null;
  let lastMode: WorkMode | undefined;
  return (tasks) => {
    if (tasks !== lastTasks) {
      lastTasks = tasks;
      lastMode = tasks.find((task) => task.status === 'doing')?.mode;
    }
    return lastMode;
  };
})();

export function applyMode(mode: UiMode | undefined, root = document.documentElement): void {
  if (mode) root.dataset.mode = mode;
  else delete root.dataset.mode;
}

/** Wires theme, daylight, zen and work mode to <html> for the lifetime of the shell. */
export function useAppearance(prefs: AppPrefs, mode: UiMode | undefined): boolean {
  const { theme, location, zen } = prefs;
  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => applyMode(mode), [mode]);
  useDaylight({ enabled: theme === 'daylight', at: location });
  return useZenIdle({ enabled: zen });
}
