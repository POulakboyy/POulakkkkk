import { useEffect, useMemo } from 'react';
import { openCommandBar } from '../features/command/index.tsx';
import { translate, type MessageKey } from '../i18n/index.ts';
import { deepLinkRoute, platform, type Unsubscribe } from '../platform/index.ts';
import { usePrefs } from '../store/index.ts';
import { appActions } from './actions.ts';
import type { AppPrefs } from './appPrefs.ts';
import { moveFocus, resolveKeymap, useKeymap, type KeymapHandlers } from './keymap.ts';
import { navigate } from './router.ts';

/** Keyboard handlers of every keymap action. */
export function shellHandlers(main: () => HTMLElement | null): KeymapHandlers {
  return {
    'command.open': () => openCommandBar(),
    'command.palette': () => openCommandBar('/'),
    'nav.today': () => appActions.go('today'),
    'nav.tasks': () => appActions.go('tasks'),
    'nav.calendar': () => appActions.go('calendar'),
    'nav.canvas': () => appActions.go('canvas'),
    'nav.ideas': () => appActions.go('ideas'),
    'nav.insights': () => appActions.go('insights'),
    'nav.settings': () => appActions.go('settings'),
    'nav.lab': () => appActions.go('lab'),
    'note.new': () => appActions.newNote(),
    'focus.start': () => appActions.startFocus(),
    'theme.cycle': () => void appActions.cycleTheme(),
    'zen.toggle': () => appActions.toggleZen(),
    'move.next': () => moveFocus(1, main()),
    'move.previous': () => moveFocus(-1, main()),
  };
}

/** Resolves and binds the user's keymap (preset + JSON overrides, Settings › Keyboard). */
export function useShellKeymap(prefs: AppPrefs, main: () => HTMLElement | null, enabled = true) {
  const { keymap } = useMemo(
    () => resolveKeymap(prefs.keymapPreset, prefs.keymap),
    [prefs.keymapPreset, prefs.keymap],
  );
  const handlers = useMemo(() => shellHandlers(main), [main]);
  useKeymap(keymap, handlers, enabled);
}

/** `<html lang>` and the window title follow the language and the current view. */
export function useDocumentMeta(viewLabel: MessageKey): void {
  const { locale } = usePrefs();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'nav.documentTitle', {
      view: translate(locale, viewLabel),
    });
  }, [locale, viewLabel]);
}

/** Routes native deep links (`pouxis://task/<id>`) and tray actions to views. */
export function usePlatformRouting(): void {
  useEffect(() => {
    const offs: Unsubscribe[] = [];
    let alive = true;
    const keep = (p: Promise<Unsubscribe>) =>
      void p.then((off) => (alive ? offs.push(off) : off())).catch(() => {});
    keep(
      platform.onDeepLink((link) => {
        const route = deepLinkRoute(link);
        navigate(route.view, route.params);
      }),
    );
    keep(platform.onTrayAction((action) => action === 'today' && navigate('today')));
    return () => {
      alive = false;
      for (const off of offs) off();
    };
  }, []);
}
