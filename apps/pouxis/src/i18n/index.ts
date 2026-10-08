import { useCallback } from 'react';
import type { Locale } from '@pouxis/core';
import { usePrefs } from '../store/index.ts';
import { en } from './en/index.ts';
import { fr } from './fr/index.ts';

/** French is the canonical dictionary; every other locale must have the same shape. */
export type Dict = typeof fr;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Dict>;
export type MessageVars = Record<string, string | number>;

const dictionaries: Record<Locale, Dict> = { fr, en };

/** Looks up `key` (`'today.title'`) and fills `{name}` placeholders. Falls back to French, then the key. */
export function translate(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  const raw = lookup(dictionaries[locale], key) ?? lookup(fr, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** `t` bound to the user's locale. */
export function useT(): (key: MessageKey, vars?: MessageVars) => string {
  const { locale } = usePrefs();
  return useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(locale, key, vars),
    [locale],
  );
}

function lookup(dict: Dict, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}
