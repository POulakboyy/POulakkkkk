/**
 * Occurrence expansion: turns a `RecurrenceRule` into instants, RFC 5545 style.
 *
 * Periods (year, month, week, day) are walked from the series start; each period's candidate
 * days are filtered by the BYxxx parts in local calendar space, holidays are dropped, times of
 * day are expanded, BYSETPOS selects positions, and only then are wall-clock values converted
 * to instants with `fromZoned` — so 09:00 stays 09:00 across DST changes. A wall-clock time
 * skipped by a DST jump resolves forward (as `fromZoned` does); duplicates are removed.
 *
 * Termination: calendar patterns repeat every 400 Gregorian years, so after a full cycle of
 * consecutive empty periods the rule can never match again (e.g. 31 February) and expansion
 * stops with what it has.
 */
import type { TimeZone, Timestamp } from '../model.ts';
import { fromZoned, startOfDay, zonedParts } from '../time.ts';
import {
  daysInMonth,
  daysInYear,
  fromDayNum,
  GREGORIAN_CYCLE_DAYS,
  monthIndex,
  parseDayKey,
  positiveMod,
  toDayNum,
  weekdayOf,
  weekStart,
} from './calendar.ts';
import type { Frequency, RecurrenceRule, Until, Weekday, WeekdayRef } from './types.ts';

export interface OccurrenceOptions {
  /** Inclusive lower bound. */
  from: Timestamp;
  /** Exclusive upper bound (may be `Infinity`). */
  to: Timestamp;
  /** IANA zone the rule's wall-clock times live in. */
  timeZone: TimeZone;
  /**
   * Series start: anchors `interval` phases, `count`, and the defaults RFC 5545 takes from
   * DTSTART (time of day, weekday, day of month). Defaults to local midnight of `from`'s day —
   * pass it whenever the rule has an interval, a count or no explicit time, for stable results.
   */
  dtstart?: Timestamp;
  /** Maximum number of instants returned (default `DEFAULT_LIMIT`). */
  limit?: number;
  /** Local `YYYY-MM-DD` dates skipped by rules with `excludeHolidays`. */
  holidays?: readonly string[];
}

export type NextOptions = Omit<OccurrenceOptions, 'from' | 'to' | 'limit'>;

export const DEFAULT_LIMIT = 10_000;
/** Hard cap on generated candidates, against pathological counts or sub-daily spans. */
const MAX_CANDIDATES = 1_000_000;
/** Periods in a 400-year Gregorian cycle, per frequency (sub-daily rules walk days). */
const CYCLE_PERIODS: Record<Frequency, number> = {
  yearly: 400,
  monthly: 4_800,
  weekly: GREGORIAN_CYCLE_DAYS / 7,
  daily: GREGORIAN_CYCLE_DAYS,
  hourly: GREGORIAN_CYCLE_DAYS,
  minutely: GREGORIAN_CYCLE_DAYS,
};
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface Anchor {
  ts: Timestamp;
  day: number;
  year: number;
  month: number;
  dom: number;
  weekday: Weekday;
  hour: number;
  minute: number;
  second: number;
}

interface Plan {
  freq: Frequency;
  interval: number;
  months: ReadonlySet<number> | null;
  monthDays: readonly number[] | null;
  days: readonly WeekdayRef[] | null;
  /** Ordinal weekdays count inside the year (yearly rule without BYMONTH). */
  nthInYear: boolean;
  dayMatchAny: boolean;
  hours: readonly number[];
  minutes: readonly number[];
  second: number;
  setPos: readonly number[] | null;
  holidays: ReadonlySet<number> | null;
  anchor: Anchor;
  weekStartDay: number;
  monthIdx: number;
}

/** Local wall-clock instance: day number + seconds after local midnight. */
interface LocalInstance {
  day: number;
  sec: number;
}

/** Occurrences of `rule` in `[from, to)`, ascending. */
export function occurrences(rule: RecurrenceRule, opts: OccurrenceOptions): Timestamp[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  if (!(opts.to > opts.from) || limit <= 0) return [];
  const tz = opts.timeZone;
  const anchor = makeAnchor(opts.dtstart ?? startOfDay(opts.from, tz), tz);
  const plan = buildPlan(rule, anchor, opts.holidays);
  const untilTs = rule.until ? resolveUntil(rule.until, anchor, tz) : Infinity;
  const end = Math.min(opts.to, untilTs + 1);
  const stopDay = Number.isFinite(end) ? localDay(end - 1, tz) + 1 : Infinity;

  const out: Timestamp[] = [];
  let counted = 0;
  let candidates = 0;
  let emptyRun = 0;
  const startDay = Math.max(localDay(opts.from, tz) - 1, anchor.day);
  for (let k = rule.count === undefined ? periodIndexOf(plan, startDay) : 0; ; k++) {
    if (periodStart(plan, k) > stopDay) break;
    const instants = periodInstants(plan, k, tz);
    if (instants.length === 0) {
      if (++emptyRun > CYCLE_PERIODS[plan.freq]) break;
      continue;
    }
    emptyRun = 0;
    candidates += instants.length;
    for (const ts of instants) {
      if (ts < anchor.ts) continue;
      if (ts >= end) return out;
      if (rule.count !== undefined && ++counted > rule.count) return out;
      if (ts >= opts.from && out.push(ts) >= limit) return out;
    }
    if (candidates > MAX_CANDIDATES) break;
  }
  return out;
}

/** First occurrence strictly after `after`, or `null` when the series is over or impossible. */
export function next(rule: RecurrenceRule, after: Timestamp, opts: NextOptions): Timestamp | null {
  return occurrences(rule, { ...opts, from: after + 1, to: Infinity, limit: 1 })[0] ?? null;
}

/* ------------------------------------------------------------------------------------------ */
/* Setup                                                                                       */
/* ------------------------------------------------------------------------------------------ */

function makeAnchor(ts: Timestamp, tz: TimeZone): Anchor {
  const p = zonedParts(ts, tz);
  return {
    ts,
    day: toDayNum(p.year, p.month, p.day),
    year: p.year,
    month: p.month,
    dom: p.day,
    weekday: p.weekday as Weekday,
    hour: p.hour,
    minute: p.minute,
    second: p.second,
  };
}

function localDay(ts: Timestamp, tz: TimeZone): number {
  const p = zonedParts(ts, tz);
  return toDayNum(p.year, p.month, p.day);
}

/** Applies the RFC 5545 defaults taken from DTSTART when a rule leaves a level unspecified. */
function buildPlan(
  rule: RecurrenceRule,
  anchor: Anchor,
  holidays: readonly string[] | undefined,
): Plan {
  let { byMonth, byMonthDay, byDay } = rule;
  if (rule.freq === 'yearly' && !byMonthDay && !byDay) {
    byMonthDay = [anchor.dom];
    byMonth ??= [anchor.month];
  } else if (rule.freq === 'monthly' && !byMonthDay && !byDay) {
    byMonthDay = [anchor.dom];
  } else if (rule.freq === 'weekly' && !byDay) {
    byDay = [{ weekday: anchor.weekday }];
  }
  const subDaily = rule.freq === 'hourly' || rule.freq === 'minutely';
  return {
    freq: rule.freq,
    interval: Math.max(1, Math.floor(rule.interval)),
    months: byMonth ? new Set(byMonth) : null,
    monthDays: byMonthDay ?? null,
    days: byDay ?? null,
    nthInYear: rule.freq === 'yearly' && !byMonth,
    dayMatchAny: rule.dayMatch === 'any',
    hours: rule.byHour ?? (subDaily ? ALL_HOURS : [anchor.hour]),
    minutes: rule.byMinute ?? (rule.freq === 'minutely' ? ALL_MINUTES : [anchor.minute]),
    second: anchor.second,
    setPos: rule.bySetPos ?? null,
    holidays: rule.excludeHolidays ? parseHolidays(holidays ?? []) : null,
    anchor,
    weekStartDay: weekStart(anchor.day, rule.wkst),
    monthIdx: monthIndex(anchor.year, anchor.month),
  };
}

function parseHolidays(keys: readonly string[]): Set<number> {
  const out = new Set<number>();
  for (const key of keys) {
    const day = parseDayKey(key);
    if (day === null) throw new RangeError(`Invalid holiday date "${key}" (expected YYYY-MM-DD)`);
    out.add(day);
  }
  return out;
}

/** Inclusive end instant of the series. */
function resolveUntil(until: Until, anchor: Anchor, tz: TimeZone): Timestamp {
  if (until.kind === 'instant') return until.at;
  const year = until.year ?? firstYearWithDate(anchor, until.month, until.day);
  if (until.time) return fromZoned({ year, month: until.month, day: until.day, ...until.time }, tz);
  return fromZoned({ year, month: until.month, day: until.day + 1 }, tz) - 1;
}

/** First year whose `month/day` falls on or after the anchor date (29 February → leap year). */
function firstYearWithDate(anchor: Anchor, month: number, day: number): number {
  let year =
    month < anchor.month || (month === anchor.month && day < anchor.dom)
      ? anchor.year + 1
      : anchor.year;
  for (let i = 0; i < 8 && day > daysInMonth(year, month); i++) year++;
  return year;
}

/* ------------------------------------------------------------------------------------------ */
/* Periods                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function periodIndexOf(plan: Plan, day: number): number {
  const { anchor, interval } = plan;
  switch (plan.freq) {
    case 'yearly':
      return Math.floor((fromDayNum(day).year - anchor.year) / interval);
    case 'monthly': {
      const c = fromDayNum(day);
      return Math.floor((monthIndex(c.year, c.month) - plan.monthIdx) / interval);
    }
    case 'weekly':
      return Math.floor((weekStart(day, weekdayOfStart(plan)) - plan.weekStartDay) / (7 * interval));
    case 'daily':
      return Math.floor((day - anchor.day) / interval);
    default:
      return day - anchor.day;
  }
}

function weekdayOfStart(plan: Plan): Weekday {
  return weekdayOf(plan.weekStartDay);
}

/** First local day of period `k`. */
function periodStart(plan: Plan, k: number): number {
  const { anchor, interval } = plan;
  switch (plan.freq) {
    case 'yearly':
      return toDayNum(anchor.year + k * interval, 1, 1);
    case 'monthly': {
      const idx = plan.monthIdx + k * interval;
      return toDayNum(Math.floor(idx / 12), (idx % 12) + 1, 1);
    }
    case 'weekly':
      return plan.weekStartDay + 7 * interval * k;
    case 'daily':
      return anchor.day + interval * k;
    default:
      return anchor.day + k;
  }
}

/** Sorted, deduplicated instants of period `k`. */
function periodInstants(plan: Plan, k: number, tz: TimeZone): Timestamp[] {
  const days = candidateDays(plan, k).filter((d) => !plan.holidays?.has(d));
  if (days.length === 0) return [];
  let instances = expandTimes(plan, days);
  if (plan.setPos) instances = applySetPos(plan, instances);
  const instants = instances.map((i) => toInstant(i, tz)).sort((a, b) => a - b);
  return instants.filter((ts, i) => i === 0 || ts !== instants[i - 1]);
}

function candidateDays(plan: Plan, k: number): number[] {
  const first = periodStart(plan, k);
  switch (plan.freq) {
    case 'yearly': {
      const year = fromDayNum(first).year;
      const out: number[] = [];
      for (let month = 1; month <= 12; month++) {
        if (!plan.months || plan.months.has(month)) pushMonthDays(plan, year, month, out);
      }
      return out;
    }
    case 'monthly': {
      const { year, month } = fromDayNum(first);
      const out: number[] = [];
      if (!plan.months || plan.months.has(month)) pushMonthDays(plan, year, month, out);
      return out;
    }
    case 'weekly':
      return [0, 1, 2, 3, 4, 5, 6].map((i) => first + i).filter((d) => dayMatches(plan, d));
    default:
      return dayMatches(plan, first) ? [first] : [];
  }
}

function pushMonthDays(plan: Plan, year: number, month: number, out: number[]): void {
  const first = toDayNum(year, month, 1);
  const dim = daysInMonth(year, month);
  for (let dom = 1; dom <= dim; dom++) {
    if (matchesCivil(plan, first + dom - 1, year, month, dom)) out.push(first + dom - 1);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Day filters                                                                                 */
/* ------------------------------------------------------------------------------------------ */

function dayMatches(plan: Plan, day: number): boolean {
  const c = fromDayNum(day);
  return matchesCivil(plan, day, c.year, c.month, c.day);
}

function matchesCivil(plan: Plan, day: number, year: number, month: number, dom: number): boolean {
  if (plan.months && !plan.months.has(month)) return false;
  const byMonthDay = plan.monthDays ? matchesMonthDay(plan.monthDays, year, month, dom) : null;
  const byDay = plan.days ? matchesWeekday(plan, plan.days, day, year, month, dom) : null;
  if (byMonthDay !== null && byDay !== null) {
    return plan.dayMatchAny ? byMonthDay || byDay : byMonthDay && byDay;
  }
  return byMonthDay ?? byDay ?? true;
}

function matchesMonthDay(list: readonly number[], year: number, month: number, dom: number) {
  const dim = daysInMonth(year, month);
  return list.some((md) => (md > 0 ? md === dom : dim + md + 1 === dom));
}

function matchesWeekday(
  plan: Plan,
  refs: readonly WeekdayRef[],
  day: number,
  year: number,
  month: number,
  dom: number,
): boolean {
  const wd = weekdayOf(day);
  return refs.some((ref) => {
    if (ref.weekday !== wd) return false;
    if (ref.nth === undefined) return true;
    // Position among the same weekdays of the scope, from the start and from the end.
    const [index, size] = plan.nthInYear
      ? [day - toDayNum(year, 1, 1), daysInYear(year)]
      : [dom - 1, daysInMonth(year, month)];
    const fromStart = Math.floor(index / 7) + 1;
    const fromEnd = Math.floor((size - 1 - index) / 7) + 1;
    return ref.nth > 0 ? ref.nth === fromStart : -ref.nth === fromEnd;
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Times of day and BYSETPOS                                                                   */
/* ------------------------------------------------------------------------------------------ */

function expandTimes(plan: Plan, days: readonly number[]): LocalInstance[] {
  const { anchor, interval } = plan;
  const out: LocalInstance[] = [];
  for (const day of days) {
    const dayOffset = day - anchor.day;
    for (const h of plan.hours) {
      if (plan.freq === 'hourly' && positiveMod(dayOffset * 24 + h - anchor.hour, interval) !== 0) {
        continue;
      }
      for (const m of plan.minutes) {
        if (plan.freq === 'minutely') {
          const offset = dayOffset * 1440 + h * 60 + m - (anchor.hour * 60 + anchor.minute);
          if (positiveMod(offset, interval) !== 0) continue;
        }
        out.push({ day, sec: h * 3600 + m * 60 + plan.second });
      }
    }
  }
  return out;
}

/** Selects BYSETPOS positions inside each period (a whole period, or an hour / a minute). */
function applySetPos(plan: Plan, instances: readonly LocalInstance[]): LocalInstance[] {
  const positions = plan.setPos ?? [];
  const groupSize = plan.freq === 'hourly' ? 3600 : plan.freq === 'minutely' ? 60 : 0;
  const groups = new Map<number, LocalInstance[]>();
  for (const i of instances) {
    const key = groupSize === 0 ? 0 : i.day * 86_400 + Math.floor(i.sec / groupSize);
    const group = groups.get(key);
    if (group) group.push(i);
    else groups.set(key, [i]);
  }
  const out: LocalInstance[] = [];
  for (const group of groups.values()) {
    const picked = new Set<number>();
    for (const pos of positions) {
      const index = pos > 0 ? pos - 1 : group.length + pos;
      if (index >= 0 && index < group.length) picked.add(index);
    }
    for (const index of [...picked].sort((a, b) => a - b)) out.push(group[index] as LocalInstance);
  }
  return out;
}

function toInstant(i: LocalInstance, tz: TimeZone): Timestamp {
  const { year, month, day } = fromDayNum(i.day);
  const hour = Math.floor(i.sec / 3600);
  const minute = Math.floor((i.sec % 3600) / 60);
  return fromZoned({ year, month, day, hour, minute, second: i.sec % 60 }, tz);
}
