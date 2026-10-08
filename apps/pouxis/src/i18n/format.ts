/**
 * Locale-aware formatting of numbers, durations, dates and times, built on `Intl` only.
 *
 * Rules (see docs/design/UX_WRITING.md):
 * - never concatenate a number and a unit by hand in a view: go through these helpers so that
 *   non-breaking spaces, plurals and word order are right in every language;
 * - every date helper takes an explicit IANA time zone (the user's `prefs.timeZone`), never the
 *   host's local zone — same contract as `@pouxis/core/time`.
 *
 * Pure functions, no React: views use the bound versions from `useFormat()` (`./index.ts`).
 */
import type { Locale, TimeZone, Timestamp } from '@pouxis/core';
import { DAY, zonedParts } from '@pouxis/core';

const NBSP = ' ';
const MINUS = '−';

/* ------------------------------------------------------------------------------------------ */
/* Locale resolution & formatter caches                                                        */
/* ------------------------------------------------------------------------------------------ */

const resolved = new Map<Locale, string>();

/**
 * BCP 47 tag used with `Intl` for an app locale. Picks the user's regional variant when the
 * system language matches (`en` + system `en-GB` → `en-GB`, so British users get a 24-hour
 * clock), otherwise the bare language.
 */
export function intlLocale(locale: Locale): string {
  const cached = resolved.get(locale);
  if (cached) return cached;
  const system = globalThis.navigator?.languages ?? [];
  const match = system.find((tag) => tag.toLowerCase().split('-')[0] === locale);
  let tag: string = locale;
  if (match) {
    try {
      tag = Intl.getCanonicalLocales(match)[0] ?? locale;
    } catch {
      tag = locale;
    }
  }
  resolved.set(locale, tag);
  return tag;
}

/** Test hook: forget resolved locales (e.g. after stubbing `navigator.languages`). */
export function resetLocaleCache(): void {
  resolved.clear();
  cache.clear();
}

const cache = new Map<string, unknown>();

function cached<T>(key: string, make: () => T): T {
  let value = cache.get(key) as T | undefined;
  if (value === undefined) {
    value = make();
    cache.set(key, value);
  }
  return value;
}

function numberFormat(tag: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  return cached(`n|${tag}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(tag, options));
}

function dateFormat(
  tag: string,
  timeZone: TimeZone,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return cached(
    `d|${tag}|${timeZone}|${JSON.stringify(options)}`,
    () => new Intl.DateTimeFormat(tag, { ...options, timeZone }),
  );
}

function relativeFormat(tag: string, numeric: 'auto' | 'always'): Intl.RelativeTimeFormat {
  return cached(
    `r|${tag}|${numeric}`,
    () => new Intl.RelativeTimeFormat(tag, { numeric, style: 'long' }),
  );
}

function listFormat(tag: string, type: Intl.ListFormatType): Intl.ListFormat {
  return cached(`l|${tag}|${type}`, () => new Intl.ListFormat(tag, { type, style: 'long' }));
}

/** Cached `Intl.PluralRules` — used by the ICU-lite message formatter. */
export function pluralRules(locale: Locale, type: Intl.PluralRuleType): Intl.PluralRules {
  const tag = intlLocale(locale);
  return cached(`p|${tag}|${type}`, () => new Intl.PluralRules(tag, { type }));
}

/* ------------------------------------------------------------------------------------------ */
/* Text                                                                                        */
/* ------------------------------------------------------------------------------------------ */

/** Upper-cases the first letter with the locale's rules (`aujourd’hui` → `Aujourd’hui`). */
export function capitalize(text: string, locale: Locale): string {
  if (!text) return text;
  const first = String.fromCodePoint(text.codePointAt(0)!);
  return first.toLocaleUpperCase(intlLocale(locale)) + text.slice(first.length);
}

/** `['a', 'b', 'c']` → `a, b et c` / `a, b, and c`. */
export function formatList(
  items: readonly string[],
  locale: Locale,
  type: 'conjunction' | 'disjunction' = 'conjunction',
): string {
  return listFormat(intlLocale(locale), type).format(items);
}

/* ------------------------------------------------------------------------------------------ */
/* Numbers                                                                                     */
/* ------------------------------------------------------------------------------------------ */

/** `12345.5` → `12 345,5` (fr, narrow no-break space) / `12,345.5` (en). */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return numberFormat(intlLocale(locale), options).format(value);
}

/** Ratio in [0, 1] → `42 %` (fr) / `42%` (en). */
export function formatPercent(ratio: number, locale: Locale, maximumFractionDigits = 0): string {
  return numberFormat(intlLocale(locale), { style: 'percent', maximumFractionDigits }).format(
    ratio,
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Durations                                                                                   */
/* ------------------------------------------------------------------------------------------ */

/**
 * - `short` (default, body text): `45 min`, `2 h`, `1 h 30` (fr) / `45 min`, `2 hr`, `1 hr 30 min` (en)
 * - `compact` (chips, timeline blocks): `45 min`, `2h`, `1h30` (fr) / `45m`, `2h`, `1h 30m` (en)
 * - `long` (screen readers, `aria-label`): `1 heure et 30 minutes` / `1 hour and 30 minutes`
 */
export type DurationStyle = 'short' | 'compact' | 'long';

/** Formats a duration given in minutes (rounded to the minute; negative values get a `−`). */
export function formatDuration(
  minutes: number,
  locale: Locale,
  style: DurationStyle = 'short',
): string {
  const total = Math.round(Math.abs(minutes));
  const sign = minutes < 0 && total > 0 ? MINUS : '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  const tag = intlLocale(locale);
  const unit = (u: 'hour' | 'minute', value: number, display: 'short' | 'long') =>
    numberFormat(tag, { style: 'unit', unit: u, unitDisplay: display }).format(value);

  let out: string;
  if (style === 'long') {
    const parts: string[] = [];
    if (h) parts.push(unit('hour', h, 'long'));
    if (m || !h) parts.push(unit('minute', m, 'long'));
    out = listFormat(tag, 'conjunction').format(parts);
  } else if (style === 'compact') {
    if (locale === 'fr') out = h ? `${h}h${m ? pad2(m) : ''}` : `${m}${NBSP}min`;
    else out = [h ? `${h}h` : '', m || !h ? `${m}m` : ''].filter(Boolean).join(' ');
  } else if (h && m) {
    out =
      locale === 'fr'
        ? `${unit('hour', h, 'short')}${NBSP}${pad2(m)}`
        : `${unit('hour', h, 'short')} ${unit('minute', m, 'short')}`;
  } else {
    out = h ? unit('hour', h, 'short') : unit('minute', m, 'short');
  }
  return sign + out;
}

/** Countdown / stopwatch display: `4:59`, `24:00`, `1:02:03`. Locale-independent. */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad2(m)}:${pad2(sec)}` : `${m}:${pad2(sec)}`;
}

/* ------------------------------------------------------------------------------------------ */
/* Dates & times                                                                               */
/* ------------------------------------------------------------------------------------------ */

/** `14:30` (fr, en-GB) / `2:30 PM` (en-US). */
export function formatTime(ts: Timestamp, timeZone: TimeZone, locale: Locale): string {
  return dateFormat(intlLocale(locale), timeZone, TIME).format(ts);
}

/** `14:00 – 16:00` / `2:00 – 4:00 PM` (shared parts are merged by `Intl`). */
export function formatTimeRange(
  start: Timestamp,
  end: Timestamp,
  timeZone: TimeZone,
  locale: Locale,
): string {
  return dateFormat(intlLocale(locale), timeZone, TIME).formatRange(start, end);
}

const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

export type DateStyle =
  /** `jeudi` / `Thursday` */
  | 'weekday'
  /** `jeu.` / `Thu` */
  | 'weekdayShort'
  /** `8 octobre` / `October 8` */
  | 'dayMonth'
  /** `8 oct.` / `Oct 8` */
  | 'dayMonthShort'
  /** `jeudi 8 octobre` / `Thursday, October 8` — the Today header */
  | 'weekdayDayMonth'
  /** `8 oct. 2026` / `Oct 8, 2026` */
  | 'medium'
  /** `jeudi 8 octobre 2026` / `Thursday, October 8, 2026` */
  | 'full'
  /** `octobre 2026` / `October 2026` */
  | 'monthYear';

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  weekday: { weekday: 'long' },
  weekdayShort: { weekday: 'short' },
  dayMonth: { day: 'numeric', month: 'long' },
  dayMonthShort: { day: 'numeric', month: 'short' },
  weekdayDayMonth: { weekday: 'long', day: 'numeric', month: 'long' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
};

const DAY_MONTH_YEAR: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

export function formatDate(
  ts: Timestamp,
  timeZone: TimeZone,
  locale: Locale,
  style: DateStyle = 'medium',
): string {
  return dateFormat(intlLocale(locale), timeZone, DATE_STYLES[style]).format(ts);
}

/** Calendar days from `now` to `ts` in `timeZone` (DST-safe): tomorrow = 1, yesterday = −1. */
export function calendarDayDiff(ts: Timestamp, now: Timestamp, timeZone: TimeZone): number {
  const a = zonedParts(ts, timeZone);
  const b = zonedParts(now, timeZone);
  return Math.round(
    (Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / DAY,
  );
}

export interface RelativeDayOptions {
  /** Start with a capital letter (`Demain`), for labels that open a line. */
  capitalize?: boolean;
}

/**
 * Human day label relative to `now`, lowercase by default so it fits mid-sentence:
 * - yesterday / today / tomorrow: `hier`, `aujourd’hui`, `demain` / `yesterday`, `today`, `tomorrow`
 * - within the next 6 days: the weekday, `samedi` / `Saturday`
 * - within the past 6 days: `il y a 3 jours` / `3 days ago`
 * - further: `12 novembre` / `November 12`, with the year when it differs from `now`'s.
 */
export function formatRelativeDay(
  ts: Timestamp,
  now: Timestamp,
  timeZone: TimeZone,
  locale: Locale,
  options: RelativeDayOptions = {},
): string {
  const diff = calendarDayDiff(ts, now, timeZone);
  const tag = intlLocale(locale);
  let out: string;
  if (Math.abs(diff) <= 1) {
    out = relativeFormat(tag, 'auto').format(diff, 'day');
  } else if (diff > 1 && diff < 7) {
    out = dateFormat(tag, timeZone, DATE_STYLES.weekday).format(ts);
  } else if (diff < -1 && diff > -7) {
    out = relativeFormat(tag, 'always').format(diff, 'day');
  } else {
    const sameYear = zonedParts(ts, timeZone).year === zonedParts(now, timeZone).year;
    out = dateFormat(tag, timeZone, sameYear ? DATE_STYLES.dayMonth : DAY_MONTH_YEAR).format(ts);
  }
  return options.capitalize ? capitalize(out, locale) : out;
}

/**
 * Elapsed / remaining time relative to `now`: `maintenant`, `il y a 5 minutes`, `dans 2 heures`,
 * `hier` / `now`, `5 minutes ago`, `in 2 hours`, `yesterday`. For "last synced …", "edited …".
 */
export function formatRelativeTime(ts: Timestamp, now: Timestamp, locale: Locale): string {
  const seconds = (ts - now) / 1000;
  const abs = Math.abs(seconds);
  const rtf = relativeFormat(intlLocale(locale), 'auto');
  if (abs < 45) return rtf.format(0, 'second');
  if (abs < 45 * 60) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 22 * 3600) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 26 * 86400) return rtf.format(Math.round(seconds / 86400), 'day');
  if (abs < 320 * 86400) return rtf.format(Math.round(seconds / (30 * 86400)), 'month');
  return rtf.format(Math.round(seconds / (365 * 86400)), 'year');
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
