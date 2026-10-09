/**
 * Dates on the command line: parsing option values (`--due vendredi`, `--date 2026-10-14`)
 * and formatting instants for humans, always in the user's configured IANA zone.
 */
import { addDays, atMinutes, daysInMonth, fromZoned, minutesOfDay, startOfDay, weekday, zonedParts } from '@pouxis/core';
import type { Minutes, TimeZone, Timestamp } from '@pouxis/core';
import type { Messages } from '../i18n/index.ts';

export interface ParsedDate {
  ts: Timestamp;
  /** The input named a time of day; otherwise `ts` is the start of the day. */
  hasTime: boolean;
}

/** `'clear'` means the user asked to remove the date (`none`, `aucune`…). */
export type DateInput = ParsedDate | 'clear';

const CLEAR = new Set(['none', 'aucune', 'aucun', 'rien', 'clear', '-']);
const TODAY = new Set(['today', "aujourd'hui", 'aujourd’hui', 'aujourdhui', 'auj', 'now']);
const TOMORROW = new Set(['tomorrow', 'demain']);
const YESTERDAY = new Set(['yesterday', 'hier']);
const WEEKDAYS: Readonly<Record<string, number>> = {
  dimanche: 0, dim: 0, sunday: 0, sun: 0,
  lundi: 1, lun: 1, monday: 1, mon: 1,
  mardi: 2, mar: 2, tuesday: 2, tue: 2,
  mercredi: 3, mer: 3, wednesday: 3, wed: 3,
  jeudi: 4, jeu: 4, thursday: 4, thu: 4,
  vendredi: 5, ven: 5, friday: 5, fri: 5,
  samedi: 6, sam: 6, saturday: 6, sat: 6,
}; // prettier-ignore

/** Minutes after midnight for `14:30`, `14h30`, `14h`, `9:05`, `2pm`, `2:30pm`. */
export function parseTimeOfDay(input: string): Minutes | undefined {
  const s = input.trim().toLowerCase();
  let match = /^(\d{1,2})(?::|h)(\d{2})?$/.exec(s) ?? /^(\d{1,2})h$/.exec(s);
  if (match) return hm(Number(match[1]), Number(match[2] ?? 0));
  match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(s);
  if (match) {
    const h = Number(match[1]);
    if (h < 1 || h > 12) return undefined;
    return hm((h % 12) + (match[3] === 'pm' ? 12 : 0), Number(match[2] ?? 0));
  }
  return undefined;
}

function hm(h: number, m: number): Minutes | undefined {
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? h * 60 + m : undefined;
}

/**
 * Parses a date option value relative to `now` in `timeZone`. Accepts `YYYY-MM-DD`,
 * `YYYY-MM-DD HH:MM` (or `T`), full ISO 8601 with an offset, today/aujourd'hui, demain/tomorrow,
 * hier/yesterday, `+3d`/`+3j`/`+2w`/`+2s`, weekday names (next occurrence, today excluded),
 * a bare time (today), each optionally followed by a time. `undefined` when unparseable.
 */
export function parseDateInput(input: string, now: Timestamp, timeZone: TimeZone): DateInput | undefined {
  const s = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (s === '') return undefined;
  if (CLEAR.has(s)) return 'clear';

  if (/^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}(:\d{2}(\.\d+)?)?(z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const ts = Date.parse(input.trim());
    return Number.isFinite(ts) ? { ts, hasTime: true } : undefined;
  }

  let day: Timestamp | undefined;
  let rest: string | undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[t ](.+))?$/.exec(s);
  if (iso) {
    const [year, month, date] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    if (month < 1 || month > 12 || date < 1 || date > daysInMonth(year, month)) return undefined;
    day = fromZoned({ year, month, day: date }, timeZone);
    rest = iso[4];
  } else {
    const [head = '', ...tail] = s.split(' ');
    rest = tail.length > 0 ? tail.join(' ') : undefined;
    day = resolveDayWord(head, now, timeZone);
    if (day === undefined && rest === undefined) {
      const minutes = parseTimeOfDay(head);
      if (minutes === undefined) return undefined;
      return { ts: atMinutes(now, minutes, timeZone), hasTime: true };
    }
  }
  if (day === undefined) return undefined;
  if (rest === undefined) return { ts: day, hasTime: false };
  const minutes = parseTimeOfDay(rest.replace(/^(à|a|at)\s+/, ''));
  if (minutes === undefined) return undefined;
  return { ts: atMinutes(day, minutes, timeZone), hasTime: true };
}

function resolveDayWord(word: string, now: Timestamp, timeZone: TimeZone): Timestamp | undefined {
  const today = startOfDay(now, timeZone);
  if (TODAY.has(word)) return today;
  if (TOMORROW.has(word)) return addDays(today, 1, timeZone);
  if (YESTERDAY.has(word)) return addDays(today, -1, timeZone);
  const relative = /^([+-]\d{1,4})([djws])$/.exec(word);
  if (relative) {
    const n = Number(relative[1]);
    return addDays(today, relative[2] === 'w' || relative[2] === 's' ? n * 7 : n, timeZone);
  }
  const target = WEEKDAYS[word.replace(/\.$/, '')];
  if (target !== undefined) {
    const delta = ((target - weekday(today, timeZone) + 7) % 7) || 7;
    return addDays(today, delta, timeZone);
  }
  return undefined;
}

/** Minutes from `90`, `90m`, `90min`, `1h`, `1h30`, `1h30m`, `1.5h`. */
export function parseDuration(input: string): Minutes | undefined {
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  let match = /^(\d+)(m|min|mn|mins|minutes?)?$/.exec(s);
  if (match) return positive(Number(match[1]));
  match = /^(\d+)h(\d{1,2})?(m|min|mn)?$/.exec(s);
  if (match) {
    const minutes = Number(match[2] ?? 0);
    return minutes < 60 ? positive(Number(match[1]) * 60 + minutes) : undefined;
  }
  match = /^(\d+(?:[.,]\d+)?)h$/.exec(s);
  if (match) return positive(Math.round(Number((match[1] ?? '').replace(',', '.')) * 60));
  return undefined;
}

function positive(n: number): number | undefined {
  return Number.isFinite(n) && n > 0 && n <= 7 * 24 * 60 ? n : undefined;
}

/** A date stored without a time of day sits exactly on local midnight. */
export function isDateOnly(ts: Timestamp, timeZone: TimeZone): boolean {
  return minutesOfDay(ts, timeZone) === 0 && zonedParts(ts, timeZone).second === 0;
}

export interface DateFormatter {
  /** `aujourd’hui`, `demain`, `hier`, or `mer. 8 oct.` (with the year when it differs). */
  day(ts: Timestamp): string;
  /** `14:05` */
  time(ts: Timestamp): string;
  /** `day` followed by the time unless the instant is local midnight. */
  dayTime(ts: Timestamp): string;
  /** `mer. 8 oct. 14:00–16:00`, or both ends in full when they fall on different days. */
  range(start: Timestamp, end: Timestamp): string;
  /** `mercredi 8 octobre 2026` */
  longDay(ts: Timestamp): string;
  /** `45 min`, `1 h 30` */
  duration(minutes: Minutes): string;
}

export function dateFormatter(m: Messages, timeZone: TimeZone, now: Timestamp): DateFormatter {
  const short = new Intl.DateTimeFormat(m.intlLocale, { timeZone, weekday: 'short', day: 'numeric', month: 'short' });
  const shortYear = new Intl.DateTimeFormat(m.intlLocale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const long = new Intl.DateTimeFormat(m.intlLocale, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const today = startOfDay(now, timeZone);
  const thisYear = zonedParts(now, timeZone).year;
  const pad = (n: number) => String(n).padStart(2, '0');

  const fmt: DateFormatter = {
    day(ts) {
      const start = startOfDay(ts, timeZone);
      if (start === today) return m.relativeDays.today;
      if (start === addDays(today, 1, timeZone)) return m.relativeDays.tomorrow;
      if (start === addDays(today, -1, timeZone)) return m.relativeDays.yesterday;
      return (zonedParts(ts, timeZone).year === thisYear ? short : shortYear).format(ts);
    },
    time(ts) {
      const p = zonedParts(ts, timeZone);
      return `${pad(p.hour)}:${pad(p.minute)}`;
    },
    dayTime(ts) {
      return isDateOnly(ts, timeZone) ? fmt.day(ts) : `${fmt.day(ts)} ${fmt.time(ts)}`;
    },
    range(start, end) {
      if (startOfDay(start, timeZone) === startOfDay(end - 1, timeZone)) {
        return `${fmt.day(start)} ${fmt.time(start)}–${fmt.time(end)}`;
      }
      return `${fmt.dayTime(start)} → ${fmt.dayTime(end)}`;
    },
    longDay(ts) {
      return long.format(ts);
    },
    duration(minutes) {
      const rounded = Math.round(minutes);
      return rounded < 60 ? m.minutes(rounded) : m.hours(Math.floor(rounded / 60), rounded % 60);
    },
  };
  return fmt;
}
