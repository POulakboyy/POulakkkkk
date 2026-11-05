import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  calendarDayDiff,
  capitalize,
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
  intlLocale,
  resetLocaleCache,
} from './format.ts';

const PARIS = 'Europe/Paris';
const NY = 'America/New_York';
const NNBSP = ' ';
const NBSP = ' ';
/** Thursday 8 October 2026, 14:30 in Paris (12:30 UTC). */
const T = Date.UTC(2026, 9, 8, 12, 30);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Normalises the spaces `Intl` uses (versions differ between NBSP and NNBSP). */
const spaces = (s: string) => s.replace(/[   ]/g, ' ');

function setSystemLanguages(languages: string[]): void {
  Object.defineProperty(globalThis.navigator, 'languages', {
    value: languages,
    configurable: true,
  });
  resetLocaleCache();
}

beforeEach(() => setSystemLanguages(['en-US', 'en']));
afterEach(() => setSystemLanguages(['en-US', 'en']));

describe('intlLocale', () => {
  it('uses the system region when the language matches', () => {
    expect(intlLocale('en')).toBe('en-US');
    setSystemLanguages(['en-GB']);
    expect(intlLocale('en')).toBe('en-GB');
  });

  it('falls back to the bare language', () => {
    expect(intlLocale('fr')).toBe('fr');
    setSystemLanguages(['fr-CA', 'en-US']);
    expect(intlLocale('fr')).toBe('fr-CA');
  });
});

describe('numbers', () => {
  it('groups digits with the locale separator', () => {
    expect(formatNumber(12345.5, 'fr')).toBe(`12${NNBSP}345,5`);
    expect(formatNumber(12345.5, 'en')).toBe('12,345.5');
  });

  it('formats percentages', () => {
    expect(spaces(formatPercent(0.42, 'fr'))).toBe('42 %');
    expect(formatPercent(0.42, 'en')).toBe('42%');
    expect(formatPercent(0.425, 'en', 1)).toBe('42.5%');
  });
});

describe('formatDuration', () => {
  it('short style', () => {
    expect(spaces(formatDuration(45, 'fr'))).toBe('45 min');
    expect(spaces(formatDuration(120, 'fr'))).toBe('2 h');
    expect(spaces(formatDuration(90, 'fr'))).toBe('1 h 30');
    expect(spaces(formatDuration(90, 'en'))).toBe('1 hr 30 min');
    expect(spaces(formatDuration(0, 'en'))).toBe('0 min');
  });

  it('compact style', () => {
    expect(formatDuration(90, 'fr', 'compact')).toBe('1h30');
    expect(formatDuration(60, 'fr', 'compact')).toBe('1h');
    expect(formatDuration(5, 'fr', 'compact')).toBe(`5${NBSP}min`);
    expect(formatDuration(90, 'en', 'compact')).toBe('1h 30m');
    expect(formatDuration(45, 'en', 'compact')).toBe('45m');
  });

  it('long style, for screen readers', () => {
    expect(spaces(formatDuration(90, 'fr', 'long'))).toBe('1 heure et 30 minutes');
    expect(spaces(formatDuration(61, 'en', 'long'))).toBe('1 hour and 1 minute');
    expect(spaces(formatDuration(120, 'en', 'long'))).toBe('2 hours');
  });

  it('rounds and signs', () => {
    expect(spaces(formatDuration(-15, 'fr'))).toBe('−15 min');
    expect(spaces(formatDuration(-0.2, 'fr'))).toBe('0 min');
    expect(spaces(formatDuration(29.6, 'en'))).toBe('30 min');
  });
});

describe('formatTimer', () => {
  it('pads minutes and seconds', () => {
    expect(formatTimer(299)).toBe('4:59');
    expect(formatTimer(1500)).toBe('25:00');
    expect(formatTimer(3723)).toBe('1:02:03');
    expect(formatTimer(-4)).toBe('0:00');
  });
});

describe('times and dates', () => {
  it('formats in the requested zone, never the host zone', () => {
    expect(formatTime(T, PARIS, 'fr')).toBe('14:30');
    expect(spaces(formatTime(T, NY, 'en'))).toBe('8:30 AM');
    setSystemLanguages(['en-GB']);
    expect(formatTime(T, PARIS, 'en')).toBe('14:30');
  });

  it('merges shared parts of a range', () => {
    expect(spaces(formatTimeRange(T, T + 2 * HOUR, PARIS, 'fr'))).toMatch(/^14:30 – 16:30$/);
    expect(spaces(formatTimeRange(T, T + HOUR, PARIS, 'en'))).toBe('2:30 – 3:30 PM');
  });

  it('formats date styles', () => {
    expect(formatDate(T, PARIS, 'fr', 'weekdayDayMonth')).toBe('jeudi 8 octobre');
    expect(formatDate(T, PARIS, 'en', 'weekdayDayMonth')).toBe('Thursday, October 8');
    expect(formatDate(T, PARIS, 'fr', 'medium')).toBe('8 oct. 2026');
    expect(formatDate(T, PARIS, 'en', 'monthYear')).toBe('October 2026');
  });

  it('counts calendar days across DST in the given zone', () => {
    // 25 Oct 2026: clocks go back in Paris; 23:30 → next-day 00:30 is still one calendar day.
    const before = Date.UTC(2026, 9, 24, 21, 30);
    expect(calendarDayDiff(before + 3 * HOUR, before, PARIS)).toBe(1);
    expect(calendarDayDiff(T, T + 30 * DAY, PARIS)).toBe(-30);
  });
});

describe('formatRelativeDay', () => {
  it('names nearby days', () => {
    expect(formatRelativeDay(T, T, PARIS, 'fr')).toBe('aujourd’hui');
    expect(formatRelativeDay(T + DAY, T, PARIS, 'fr')).toBe('demain');
    expect(formatRelativeDay(T - DAY, T, PARIS, 'en')).toBe('yesterday');
    expect(formatRelativeDay(T + DAY, T, PARIS, 'en', { capitalize: true })).toBe('Tomorrow');
  });

  it('uses the weekday within the coming week', () => {
    expect(formatRelativeDay(T + 2 * DAY, T, PARIS, 'fr')).toBe('samedi');
    expect(formatRelativeDay(T + 2 * DAY, T, PARIS, 'en')).toBe('Saturday');
  });

  it('counts back within the past week', () => {
    expect(formatRelativeDay(T - 3 * DAY, T, PARIS, 'fr')).toBe('il y a 3 jours');
    expect(formatRelativeDay(T - 3 * DAY, T, PARIS, 'en')).toBe('3 days ago');
  });

  it('falls back to a date, with the year only when it differs', () => {
    expect(formatRelativeDay(T + 35 * DAY, T, PARIS, 'fr')).toBe('12 novembre');
    expect(formatRelativeDay(T + 100 * DAY, T, PARIS, 'en')).toBe('January 16, 2027');
  });
});

describe('formatRelativeTime', () => {
  it('picks a sensible unit', () => {
    expect(formatRelativeTime(T, T + 10_000, 'fr')).toBe('maintenant');
    expect(formatRelativeTime(T - 5 * 60_000, T, 'en')).toBe('5 minutes ago');
    expect(formatRelativeTime(T + 2 * HOUR, T, 'fr')).toBe('dans 2 heures');
    expect(formatRelativeTime(T - DAY, T, 'en')).toBe('yesterday');
    expect(formatRelativeTime(T - 60 * DAY, T, 'en')).toBe('2 months ago');
  });
});

describe('text helpers', () => {
  it('capitalises with the locale rules', () => {
    expect(capitalize('aujourd’hui', 'fr')).toBe('Aujourd’hui');
    expect(capitalize('', 'fr')).toBe('');
    expect(capitalize('éphémère', 'fr')).toBe('Éphémère');
  });

  it('joins lists', () => {
    expect(formatList(['a', 'b', 'c'], 'fr')).toBe('a, b et c');
    expect(formatList(['a', 'b', 'c'], 'en')).toBe('a, b, and c');
    expect(formatList(['a', 'b'], 'en', 'disjunction')).toBe('a or b');
  });
});
