// The app's own dictionaries (typed TS objects, loaded through Node's type stripping): scenes
// find buttons by their real accessible names, and eyebrows reuse the app's own words.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { I18N_DIR } from './config.mjs';

const cache = new Map();

/** Dictionary of `lang` ('fr' | 'en'). */
export async function dictionary(lang) {
  if (!cache.has(lang)) {
    const mod = await import(pathToFileURL(join(I18N_DIR, lang, 'index.ts')).href);
    const dict = mod[lang];
    if (!dict) throw new Error(`i18n: no export "${lang}" in ${lang}/index.ts`);
    cache.set(lang, dict);
  }
  return cache.get(lang);
}

/** Raw message at dotted `key`; throws when missing so a renamed key never fails silently. */
export function message(dict, key) {
  const value = key.split('.').reduce((node, part) => node?.[part], dict);
  if (typeof value !== 'string') throw new Error(`i18n: missing key "${key}"`);
  return value;
}

/** Regex matching a message whose `{placeholders}` may hold any text. */
export function messagePattern(dict, key) {
  const parts = message(dict, key).split(/\{[^}]+\}/);
  const escaped = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${escaped.join('.+?')}$`);
}

/** `t(key)` bound to one dictionary. */
export async function translator(lang) {
  const dict = await dictionary(lang);
  const t = (key) => message(dict, key);
  t.pattern = (key) => messagePattern(dict, key);
  return t;
}
