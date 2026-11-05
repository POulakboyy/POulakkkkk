import { translate } from '../i18n/index.ts';
import { store } from '../store/index.ts';
import { toast } from '../ui/index.ts';
import type { ExportFormat } from '../views/settings/export.ts';
import { getAppPrefs, setAppPrefs, type ThemePref } from './appPrefs.ts';
import { getRoute, navigate, type ViewId } from './router.ts';
import { nextTheme } from './theme.ts';

/** Fired on window to start a focus session; the focus feature listens for it. */
export const FOCUS_START_EVENT = 'pouxis:focus-start';

function t(key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) {
  return translate(store.prefs().locale, key, vars);
}

/**
 * App-wide actions shared by the keymap, the command bar and the tray. Each one is safe to call
 * at any time and gives its own feedback.
 */
export const appActions = {
  go(view: Exclude<ViewId, 'capture'>, params?: Record<string, string>): void {
    navigate(view, params);
  },

  setTheme(theme: ThemePref): void {
    setAppPrefs({ theme });
  },

  cycleTheme(): ThemePref {
    const theme = nextTheme(getAppPrefs().theme);
    setAppPrefs({ theme });
    toast({ id: 'theme', title: t(`settings.appearance.theme.${theme}`) });
    return theme;
  },

  toggleZen(): void {
    const zen = !getAppPrefs().zen;
    setAppPrefs({ zen });
    toast({
      id: 'zen',
      title: `${t('settings.appearance.zen.label')} · ${t(zen ? 'common.state.on' : 'common.state.off')}`,
    });
  },

  startFocus(): void {
    navigate('today');
    window.dispatchEvent(new CustomEvent(FOCUS_START_EVENT));
  },

  newNote(): void {
    const note = store.create('notes', {
      title: t('command.newNoteTitle'),
      body: '',
      tags: [],
      links: [],
    });
    navigate('ideas', { note: note.id });
  },

  newCanvas(): void {
    const graph = store.create('graphs', {
      title: t('command.newCanvasTitle'),
      nodes: [],
      edges: [],
    });
    navigate('canvas', { graph: graph.id });
  },

  /** Brain dump (5.14) from anywhere: opens the ideas view with the dump overlay on top. */
  async brainDump(): Promise<void> {
    if (getRoute().view !== 'ideas') navigate('ideas');
    const { brainDump } = await import('../views/ideas/dump/brainDump.ts');
    brainDump.open();
  },

  /** The exporters load on demand: they are only needed when the user exports. */
  async exportData(format: ExportFormat = 'zip'): Promise<void> {
    const { exportAll } = await import('../views/settings/export.ts');
    const file = exportAll(store, format);
    toast({ title: t('settings.data.export.done'), description: file, tone: 'success' });
  },

  replayOnboarding(): void {
    setAppPrefs({ onboarded: false });
  },
};
