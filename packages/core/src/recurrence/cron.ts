/**
 * Five-field cron expressions: `minute hour day-of-month month day-of-week`.
 *
 * Supported: `*`, `?`, lists (`1,15`), ranges (`1-5`), steps (`*\/15`, `10-50/10`, `5/15`),
 * month and weekday names (`JAN`, `mon-fri`), `7` as Sunday, `L` in day-of-month (last day),
 * `5L` (last Friday) and `2#3` (third Tuesday) in day-of-week, and the `@yearly`, `@annually`,
 * `@monthly`, `@weekly`, `@daily`, `@midnight` and `@hourly` macros.
 *
 * As in Vixie cron, when both day fields are restricted a day matches if *either* does
 * (`dayMatch: 'any'`). Times are wall-clock times in the zone given to `occurrences`.
 */
import { sortUnique } from './rrule.ts';
import type { Frequency, RecurrenceRule, Weekday, WeekdayRef } from './types.ts';

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};
const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface FieldSpec {
  min: number;
  max: number;
  names?: readonly string[];
  /** Value of the first name (months start at 1). */
  nameBase?: number;
}

const MINUTE: FieldSpec = { min: 0, max: 59 };
const HOUR: FieldSpec = { min: 0, max: 23 };
const DOM: FieldSpec = { min: 1, max: 31 };
const MONTH: FieldSpec = { min: 1, max: 12, names: MONTH_NAMES, nameBase: 1 };
const DOW: FieldSpec = { min: 0, max: 7, names: DAY_NAMES, nameBase: 0 };

/** `null` = unrestricted (`*` or `?`). */
type Field = number[] | null;

export function parseCron(text: string): RecurrenceRule | null {
  const trimmed = text.trim().toLowerCase();
  const expr = MACROS[trimmed] ?? trimmed;
  const fields = expr.split(/\s+/);
  if (fields.length !== 5) return null;
  const [minF, hourF, domF, monthF, dowF] = fields as [string, string, string, string, string];
  const minutes = parseField(minF, MINUTE);
  const hours = parseField(hourF, HOUR);
  const months = parseField(monthF, MONTH);
  const dom = parseDayOfMonth(domF);
  const dow = parseDayOfWeek(dowF);
  if (!minutes || !hours || !months || !dom || !dow) return null;
  return buildRule(minutes.value, hours.value, dom.value, months.value, dow.value);
}

function buildRule(
  minutes: Field,
  hours: Field,
  dom: Field,
  months: Field,
  dow: WeekdayRef[] | null,
): RecurrenceRule {
  const hasOrdinals = dow?.some((d) => d.nth !== undefined) ?? false;
  const rule: RecurrenceRule = {
    syntax: 'cron',
    freq: chooseFrequency(minutes, hours, dom, dow, hasOrdinals),
    interval: 1,
    wkst: 1,
  };
  if (months) rule.byMonth = months;
  if (dom) rule.byMonthDay = dom;
  if (dow) rule.byDay = dow;
  if (dom && dow) rule.dayMatch = 'any';
  // Explicit hours/minutes keep the rule independent of the series start's time of day
  // (an unrestricted field selects the sub-daily frequency instead).
  if (hours) rule.byHour = hours;
  if (minutes) rule.byMinute = minutes;
  return rule;
}

function chooseFrequency(
  minutes: Field,
  hours: Field,
  dom: Field,
  dow: WeekdayRef[] | null,
  hasOrdinals: boolean,
): Frequency {
  if (!minutes) return 'minutely';
  if (!hours) return 'hourly';
  if (dom || hasOrdinals) return 'monthly';
  if (dow) return 'weekly';
  return 'daily';
}

function parseDayOfMonth(text: string): { value: Field } | null {
  if (text === 'l') return { value: [-1] };
  const items = text.split(',');
  if (items.includes('l')) {
    const rest = parseField(items.filter((i) => i !== 'l').join(','), DOM);
    if (!rest?.value) return null;
    return { value: sortUnique([...rest.value, -1]) };
  }
  return parseField(text, DOM);
}

function parseDayOfWeek(text: string): { value: WeekdayRef[] | null } | null {
  const plain: string[] = [];
  const refs: WeekdayRef[] = [];
  for (const item of text.split(',')) {
    const ordinal = /^([a-z0-9]+)(?:#([1-5])|(l))$/.exec(item);
    if (ordinal) {
      const wd = parseValue(ordinal[1] ?? '', DOW);
      if (wd === null) return null;
      refs.push({ weekday: (wd % 7) as Weekday, nth: ordinal[3] ? -1 : Number(ordinal[2]) });
    } else {
      plain.push(item);
    }
  }
  if (plain.length > 0) {
    const parsed = parseField(plain.join(','), DOW);
    if (!parsed) return null;
    if (parsed.value === null) {
      if (refs.length > 0) return null;
      return { value: null };
    }
    for (const wd of sortUnique(parsed.value.map((v) => v % 7))) {
      refs.push({ weekday: wd as Weekday });
    }
  }
  return { value: refs };
}

/** Parses one field; `{ value: null }` when the field covers its whole range. */
function parseField(text: string, spec: FieldSpec): { value: Field } | null {
  if (text === '*' || text === '?') return { value: null };
  const values: number[] = [];
  for (const item of text.split(',')) {
    const expanded = parseItem(item, spec);
    if (!expanded) return null;
    values.push(...expanded);
  }
  const unique = sortUnique(values);
  if (unique.length === 0) return null;
  const isFull = unique.length === spec.max - spec.min + 1 && spec !== DOW;
  return { value: isFull ? null : unique };
}

/** `a`, `a-b`, `*\/s`, `a-b/s` or `a/s` (from `a` to the field maximum). */
function parseItem(item: string, spec: FieldSpec): number[] | null {
  const m = /^([^/]+)(?:\/(\d+))?$/.exec(item);
  if (!m) return null;
  const step = m[2] === undefined ? 1 : Number(m[2]);
  if (step < 1) return null;
  const base = m[1] ?? '';
  let lo: number | null;
  let hi: number | null;
  if (base === '*') {
    [lo, hi] = [spec.min, spec.max];
  } else if (base.includes('-')) {
    const [a, b, extra] = base.split('-');
    if (extra !== undefined) return null;
    [lo, hi] = [parseValue(a ?? '', spec), parseValue(b ?? '', spec)];
  } else {
    lo = parseValue(base, spec);
    hi = m[2] === undefined ? lo : spec.max;
  }
  if (lo === null || hi === null || lo > hi) return null;
  return range(lo, hi, step);
}

function parseValue(text: string, spec: FieldSpec): number | null {
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return n >= spec.min && n <= spec.max ? n : null;
  }
  const i = spec.names?.indexOf(text.toUpperCase()) ?? -1;
  return i < 0 ? null : i + (spec.nameBase ?? 0);
}

function range(lo: number, hi: number, step = 1): number[] {
  const out: number[] = [];
  for (let v = lo; v <= hi; v += step) out.push(v);
  return out;
}
