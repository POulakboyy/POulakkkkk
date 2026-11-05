/**
 * iCalendar `RRULE` subset (RFC 5545 §3.3.10): FREQ, INTERVAL, BYDAY (with ordinals),
 * BYMONTHDAY (negatives allowed), BYMONTH, BYHOUR, BYMINUTE, BYSETPOS, COUNT, UNTIL, WKST.
 *
 * Unsupported parts (SECONDLY, BYSECOND, BYYEARDAY, BYWEEKNO, RSCALE…) make the parser return
 * `null` rather than silently ignoring them: a rule that expands differently from what the
 * user wrote is worse than no rule.
 */
import type { Frequency, RecurrenceRule, Until, Weekday, WeekdayRef } from './types.ts';

const FREQS: Record<string, Frequency> = {
  YEARLY: 'yearly',
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
  DAILY: 'daily',
  HOURLY: 'hourly',
  MINUTELY: 'minutely',
};
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/** Whether `text` looks like an RRULE (with or without the `RRULE:` prefix). */
export function looksLikeRRule(text: string): boolean {
  return /(^|[\s;:])FREQ=/i.test(text);
}

/** Parses an RRULE value; tolerates a leading `RRULE:` and surrounding `DTSTART`/`EXDATE` lines. */
export function parseRRule(text: string): RecurrenceRule | null {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => looksLikeRRule(l));
  if (!line) return null;
  const body = line.replace(/^RRULE:/i, '');
  const parts = new Map<string, string>();
  for (const part of body.split(';')) {
    if (part === '') continue;
    const eq = part.indexOf('=');
    if (eq <= 0) return null;
    const key = part.slice(0, eq).toUpperCase();
    if (parts.has(key)) return null;
    parts.set(key, part.slice(eq + 1).toUpperCase());
  }
  const freq = FREQS[parts.get('FREQ') ?? ''];
  if (!freq) return null;
  const rule: RecurrenceRule = { syntax: 'rrule', freq, interval: 1, wkst: 1 };
  for (const [key, value] of parts) {
    if (key === 'FREQ') continue;
    if (!applyPart(rule, key, value)) return null;
  }
  if (rule.count !== undefined && rule.until !== undefined) return null;
  if (rule.byDay?.some((d) => d.nth !== undefined) && !acceptsOrdinalDays(rule)) return null;
  return rule;
}

/** RFC 5545: ordinal BYDAY only in MONTHLY rules, or YEARLY rules without BYWEEKNO. */
function acceptsOrdinalDays(rule: RecurrenceRule): boolean {
  if (rule.freq === 'monthly') return rule.byDay?.every((d) => Math.abs(d.nth ?? 0) <= 5) ?? true;
  return rule.freq === 'yearly';
}

function applyPart(rule: RecurrenceRule, key: string, value: string): boolean {
  switch (key) {
    case 'INTERVAL': {
      const n = parseInteger(value, 1, 1_000_000);
      if (n === null) return false;
      rule.interval = n;
      return true;
    }
    case 'COUNT': {
      const n = parseInteger(value, 1, 1_000_000);
      if (n === null) return false;
      rule.count = n;
      return true;
    }
    case 'UNTIL': {
      const until = parseUntil(value);
      if (!until) return false;
      rule.until = until;
      return true;
    }
    case 'WKST': {
      const wd = dayCode(value);
      if (wd === null) return false;
      rule.wkst = wd;
      return true;
    }
    case 'BYDAY': {
      const days = parseList(value, parseDayRef);
      if (!days) return false;
      rule.byDay = days;
      return true;
    }
    case 'BYMONTHDAY':
      return assignNumbers(value, -31, 31, (list) => (rule.byMonthDay = list));
    case 'BYMONTH':
      return assignNumbers(value, 1, 12, (list) => (rule.byMonth = list));
    case 'BYHOUR':
      return assignNumbers(value, 0, 23, (list) => (rule.byHour = list));
    case 'BYMINUTE':
      return assignNumbers(value, 0, 59, (list) => (rule.byMinute = list));
    case 'BYSETPOS':
      return assignNumbers(value, -366, 366, (list) => (rule.bySetPos = list));
    default:
      return false;
  }
}

function assignNumbers(
  value: string,
  min: number,
  max: number,
  assign: (list: number[]) => void,
): boolean {
  const list = parseList(value, (v) => {
    const n = parseInteger(v, min, max);
    // Zero is never a valid ordinal (BYMONTHDAY, BYSETPOS) but is a valid hour/minute.
    return n === 0 && min < 0 ? null : n;
  });
  if (!list) return false;
  assign(sortUnique(list));
  return true;
}

function parseList<T>(value: string, parse: (v: string) => T | null): T[] | null {
  const out: T[] = [];
  for (const item of value.split(',')) {
    const parsed = parse(item.trim());
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out.length > 0 ? out : null;
}

function parseInteger(value: string, min: number, max: number): number | null {
  if (!/^[+-]?\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

function dayCode(value: string): Weekday | null {
  const i = DAY_CODES.indexOf(value as (typeof DAY_CODES)[number]);
  return i < 0 ? null : (i as Weekday);
}

function parseDayRef(value: string): WeekdayRef | null {
  const m = /^([+-]?\d{1,2})?([A-Z]{2})$/.exec(value);
  if (!m) return null;
  const weekday = dayCode(m[2] ?? '');
  if (weekday === null) return null;
  if (m[1] === undefined) return { weekday };
  const nth = Number(m[1]);
  if (nth === 0 || Math.abs(nth) > 53) return null;
  return { weekday, nth };
}

/** `YYYYMMDD` (local date), `YYYYMMDDTHHMMSS` (local) or `YYYYMMDDTHHMMSSZ` (UTC instant). */
function parseUntil(value: string): Until | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (m[4] === undefined) return { kind: 'local', year, month, day };
  const time = { hour: Number(m[4]), minute: Number(m[5]), second: Number(m[6]) };
  if (time.hour > 23 || time.minute > 59 || time.second > 59) return null;
  if (m[7]) {
    return {
      kind: 'instant',
      at: Date.UTC(year, month - 1, day, time.hour, time.minute, time.second),
    };
  }
  return { kind: 'local', year, month, day, time };
}

export function sortUnique(list: readonly number[]): number[] {
  return [...new Set(list)].sort((a, b) => a - b);
}

/* ------------------------------------------------------------------------------------------ */
/* Serialisation                                                                               */
/* ------------------------------------------------------------------------------------------ */

/**
 * RRULE value (without the `RRULE:` prefix) equivalent to `rule`, or `null` when RFC 5545
 * cannot express it: holiday exclusion, cron's OR day matching, COUNT with UNTIL, or an UNTIL
 * date without a year.
 */
export function toRRule(rule: RecurrenceRule): string | null {
  if (rule.excludeHolidays || rule.dayMatch === 'any') return null;
  if (rule.count !== undefined && rule.until !== undefined) return null;
  const freq = Object.keys(FREQS).find((k) => FREQS[k] === rule.freq);
  if (!freq) return null;
  const out = [`FREQ=${freq}`];
  if (rule.interval > 1) out.push(`INTERVAL=${rule.interval}`);
  if (rule.byMonth) out.push(`BYMONTH=${rule.byMonth.join(',')}`);
  if (rule.byMonthDay) out.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
  if (rule.byDay) out.push(`BYDAY=${rule.byDay.map(formatDayRef).join(',')}`);
  if (rule.byHour) out.push(`BYHOUR=${rule.byHour.join(',')}`);
  if (rule.byMinute) out.push(`BYMINUTE=${rule.byMinute.join(',')}`);
  if (rule.bySetPos) out.push(`BYSETPOS=${rule.bySetPos.join(',')}`);
  if (rule.count !== undefined) out.push(`COUNT=${rule.count}`);
  if (rule.until) {
    const until = formatUntil(rule.until);
    if (!until) return null;
    out.push(`UNTIL=${until}`);
  }
  if (rule.wkst !== 1) out.push(`WKST=${DAY_CODES[rule.wkst]}`);
  return out.join(';');
}

function formatDayRef(ref: WeekdayRef): string {
  return `${ref.nth ?? ''}${DAY_CODES[ref.weekday]}`;
}

function formatUntil(until: Until): string | null {
  if (until.kind === 'instant') {
    const d = new Date(until.at);
    return (
      `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
      `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
    );
  }
  if (until.year === undefined) return null;
  const date = `${String(until.year).padStart(4, '0')}${pad2(until.month)}${pad2(until.day)}`;
  if (!until.time) return date;
  const { hour, minute, second } = until.time;
  return `${date}T${pad2(hour)}${pad2(minute)}${pad2(second)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
