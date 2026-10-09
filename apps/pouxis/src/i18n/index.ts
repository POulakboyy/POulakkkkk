import { useCallback, useMemo } from 'react';
import type { Locale, Timestamp } from '@pouxis/core';
import { usePrefs } from '../store/index.ts';
import { en } from './en/index.ts';
import { fr } from './fr/index.ts';
import {
  formatDate,
  formatDuration,
  formatList,
  formatNumber,
  formatPercent,
  formatRelativeDay,
  formatRelativeTime,
  formatTime,
  formatTimeRange,
  formatTimer,
  type DateStyle,
  type DurationStyle,
  type RelativeDayOptions,
} from './format.ts';
import { formatMessage, type MessageVars } from './message.ts';

export * from './format.ts';
export { formatMessage, MessageSyntaxError, parseMessage } from './message.ts';
export type { MessageVars } from './message.ts';

/** French is the canonical dictionary; every other locale must have the same shape. */
export type Dict = typeof fr;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Dict>;
/** Top-level namespaces: `common`, `nav`, `today`, … */
export type Namespace = keyof Dict;

/** Supported UI languages, in the order shown in Settings. */
export const LOCALES: readonly Locale[] = ['fr', 'en'];

const dictionaries: Record<Locale, Dict> = { fr, en };

/**
 * Looks up `key` (`'today.title'`) and formats it with `vars`: `{name}` placeholders plus ICU-lite
 * `plural` / `select` / `selectordinal` / `number` (see `message.ts`). Falls back to French, then
 * to the key itself.
 *
 * ```ts
 * translate('fr', 'common.count.tasks', { count: 0 }) // "Aucune tâche"
 * translate('en', 'common.count.tasks', { count: 2 }) // "2 tasks"
 * ```
 */
export function translate(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  const raw = lookup(dictionaries[locale], key) ?? lookup(fr, key) ?? key;
  return formatMessage(locale, raw, vars);
}

/** `t` bound to the user's locale. */
export function useT(): (key: MessageKey, vars?: MessageVars) => string {
  const { locale } = usePrefs();
  return useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(locale, key, vars),
    [locale],
  );
}

/** Formatting helpers bound to the user's locale and time zone (see `format.ts`). */
export interface BoundFormat {
  locale: Locale;
  timeZone: string;
  /** Minutes → `1 h 30` / `1 hr 30 min`. */
  duration(minutes: number, style?: DurationStyle): string;
  /** Seconds → `24:59`. */
  timer(seconds: number): string;
  time(ts: Timestamp): string;
  timeRange(start: Timestamp, end: Timestamp): string;
  date(ts: Timestamp, style?: DateStyle): string;
  /** `aujourd’hui`, `demain`, `samedi`, `12 novembre`… */
  relativeDay(ts: Timestamp, now?: Timestamp, options?: RelativeDayOptions): string;
  /** `il y a 5 minutes`, `dans 2 heures`… */
  relativeTime(ts: Timestamp, now?: Timestamp): string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  percent(ratio: number, maximumFractionDigits?: number): string;
  list(items: readonly string[], type?: 'conjunction' | 'disjunction'): string;
}

export function useFormat(): BoundFormat {
  const { locale, timeZone } = usePrefs();
  return useMemo<BoundFormat>(
    () => ({
      locale,
      timeZone,
      duration: (minutes, style) => formatDuration(minutes, locale, style),
      timer: formatTimer,
      time: (ts) => formatTime(ts, timeZone, locale),
      timeRange: (start, end) => formatTimeRange(start, end, timeZone, locale),
      date: (ts, style) => formatDate(ts, timeZone, locale, style),
      relativeDay: (ts, now = Date.now(), options) =>
        formatRelativeDay(ts, now, timeZone, locale, options),
      relativeTime: (ts, now = Date.now()) => formatRelativeTime(ts, now, locale),
      number: (value, options) => formatNumber(value, locale, options),
      percent: (ratio, digits) => formatPercent(ratio, locale, digits),
      list: (items, type) => formatList(items, locale, type),
    }),
    [locale, timeZone],
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
