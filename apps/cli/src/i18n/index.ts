import type { Locale } from '@pouxis/core';
import { en } from './en.ts';
import { fr } from './fr.ts';
import type { Messages } from './fr.ts';

export type { CommandHelp, HelpRow, Messages } from './fr.ts';
export type Lang = Locale;

const CATALOGUES: Record<Lang, Messages> = { fr, en };

export function messages(lang: Lang): Messages {
  return CATALOGUES[lang];
}

/** `fr`, `en`, or `undefined` for anything else (`C`, `POSIX`, `de_DE`…). */
export function langFromTag(tag: string | undefined): Lang | undefined {
  const t = tag?.trim().toLowerCase();
  if (!t) return undefined;
  if (t === 'en' || t.startsWith('en_') || t.startsWith('en-') || t.startsWith('en.')) return 'en';
  if (t === 'fr' || t.startsWith('fr_') || t.startsWith('fr-') || t.startsWith('fr.')) return 'fr';
  return undefined;
}

/**
 * Message language from the environment, POSIX precedence (`LC_ALL` > `LC_MESSAGES` > `LANG`):
 * the first non-empty variable decides; anything that is not English falls back to French,
 * the canonical language.
 */
export function langFromEnv(env: Readonly<Record<string, string | undefined>>): Lang {
  for (const name of ['LC_ALL', 'LC_MESSAGES', 'LANG']) {
    const value = env[name];
    if (value) return langFromTag(value) ?? 'fr';
  }
  return 'fr';
}
