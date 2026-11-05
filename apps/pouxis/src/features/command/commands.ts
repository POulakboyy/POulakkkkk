import type { ComponentType } from 'react';
import { search } from '@pouxis/core';
import type { Locale } from '@pouxis/core';
import { appActions } from '../../app/actions.ts';
import { THEMES, type ThemePref } from '../../app/appPrefs.ts';
import { VIEWS } from '../../app/routes.ts';
import type { MessageKey, MessageVars } from '../../i18n/index.ts';
import { LOCALES } from '../../i18n/index.ts';
import { store } from '../../store/index.ts';
import {
  IconArrowRight,
  IconBolt,
  IconCanvas,
  IconEdit,
  IconEye,
  IconLayers,
  IconMoon,
  IconPlay,
  IconRepeat,
  IconSettings,
  IconShare,
  IconSun,
} from '../../ui/index.ts';

export interface CommandItem {
  id: string;
  label: string;
  /** Extra words matched by the filter (synonyms, English names…). */
  keywords: readonly string[];
  icon: ComponentType<{ size?: number }>;
  run: () => void;
}

type Translate = (key: MessageKey, vars?: MessageVars) => string;

const THEME_ICON: Record<ThemePref, ComponentType<{ size?: number }>> = {
  auto: IconEye,
  light: IconSun,
  dark: IconMoon,
  daylight: IconSun,
  eink: IconEdit,
};

/** Every command of the `/` mode, labelled in the current language. */
export function buildCommands(t: Translate): CommandItem[] {
  const views: CommandItem[] = VIEWS.map((v) => ({
    id: `go.${v.id}`,
    label: t('command.actions.goTo', { view: t(v.label) }),
    keywords: [v.id],
    icon: v.icon,
    run: () => appActions.go(v.id),
  }));

  const themes: CommandItem[] = THEMES.map((theme) => ({
    id: `theme.${theme}`,
    label: t('command.actions.setTheme', { theme: t(`settings.appearance.theme.${theme}`) }),
    keywords: ['theme', 'thème', theme],
    icon: THEME_ICON[theme],
    run: () => appActions.setTheme(theme),
  }));

  const languages: CommandItem[] = LOCALES.map((locale: Locale) => ({
    id: `language.${locale}`,
    label: t('command.actions.language', { language: t(`settings.language.${locale}`) }),
    keywords: ['langue', 'language', locale],
    icon: IconRepeat,
    run: () => store.setPrefs({ locale }),
  }));

  return [
    {
      id: 'note.new',
      label: t('command.actions.newNote'),
      keywords: ['note', 'idée', 'idea'],
      icon: IconEdit,
      run: () => appActions.newNote(),
    },
    {
      id: 'canvas.new',
      label: t('command.actions.newCanvas'),
      keywords: ['toile', 'canvas', 'mindmap'],
      icon: IconCanvas,
      run: () => appActions.newCanvas(),
    },
    {
      id: 'focus.start',
      label: t('command.actions.startFocus'),
      keywords: ['focus', 'pomodoro', 'concentration'],
      icon: IconPlay,
      run: () => appActions.startFocus(),
    },
    {
      id: 'theme.cycle',
      label: t('command.actions.toggleTheme'),
      keywords: ['theme', 'thème', 'dark', 'sombre'],
      icon: IconMoon,
      run: () => void appActions.cycleTheme(),
    },
    {
      id: 'zen.toggle',
      label: t('command.actions.toggleZen'),
      keywords: ['zen', 'calme', 'distraction'],
      icon: IconBolt,
      run: () => appActions.toggleZen(),
    },
    ...views,
    {
      id: 'settings.keyboard',
      label: t('command.actions.shortcuts'),
      keywords: ['clavier', 'keyboard', 'vim', 'raccourci', 'shortcut'],
      icon: IconSettings,
      run: () => appActions.go('settings', { section: 'keyboard' }),
    },
    {
      id: 'data.export',
      label: t('command.actions.exportData'),
      keywords: ['export', 'zip', 'json', 'sauvegarde', 'backup'],
      icon: IconShare,
      run: () => appActions.exportData('zip'),
    },
    ...themes,
    ...languages,
    {
      id: 'onboarding.replay',
      label: t('command.actions.replayOnboarding'),
      keywords: ['onboarding', 'introduction', 'intro', 'bienvenue'],
      icon: IconArrowRight,
      run: () => appActions.replayOnboarding(),
    },
    {
      id: 'gallery.open',
      label: t('command.actions.openGallery'),
      keywords: ['gallery', 'galerie', 'design', 'composants', 'components'],
      icon: IconLayers,
      run: () => appActions.go('settings', { gallery: '1' }),
    },
  ];
}

function isWordStart(text: string, index: number): boolean {
  return index === 0 || /[\s\-·’'/(]/.test(text[index - 1] ?? ' ');
}

/**
 * Fuzzy relevance of `text` for `query`, accent- and case-insensitive; `null` when the query
 * letters do not all appear in order. Prefix > word-start substring > substring > subsequence.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = search.fold(query).trim();
  if (q === '') return 0;
  const s = search.fold(text);
  const at = s.indexOf(q);
  if (at === 0) return 3000 - s.length;
  if (at > 0) return (isWordStart(s, at) ? 2000 : 1000) - at;
  let qi = 0;
  let score = 0;
  let last = -2;
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] !== q[qi]) continue;
    score += (i === last + 1 ? 4 : 1) + (isWordStart(s, i) ? 3 : 0);
    last = i;
    qi++;
  }
  return qi === q.length ? score : null;
}

/** Commands matching `query` (the text after `/`), best first; all of them when empty. */
export function filterCommands(items: readonly CommandItem[], query: string): CommandItem[] {
  if (query.trim() === '') return [...items];
  const scored: { item: CommandItem; score: number }[] = [];
  for (const item of items) {
    let best: number | null = fuzzyScore(query, item.label);
    for (const k of item.keywords) {
      const s = fuzzyScore(query, k);
      if (s !== null && (best === null || s > best)) best = s;
    }
    if (best !== null) scored.push({ item, score: best });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}
