/**
 * Human-readable French / English description of a `RecurrenceRule`.
 *
 * Parts a rule leaves to the series start (time of day, weekday, day of month) are not
 * described: "tous les mois" says nothing about which day, because the rule does not either.
 */
import type { TimeZone } from '../model.ts';
import { zonedParts } from '../time.ts';
import type { RecurrenceRule, Until, WeekdayRef } from './types.ts';
import { MONTH_NAMES, WEEKDAY_NAMES, type RuleLocale } from './vocab.ts';

export interface DescribeOptions {
  /** Zone used to show an absolute `UNTIL` instant (default UTC). */
  timeZone?: TimeZone;
}

/** Beyond this many times a day, the times are summarised as a count. */
const MAX_LISTED_TIMES = 8;

export function describe(
  rule: RecurrenceRule,
  locale: RuleLocale = 'fr',
  opts: DescribeOptions = {},
): string {
  const t = locale === 'fr' ? FR : EN;
  let text = t.core(rule);
  const time = timePhrase(rule, t);
  if (time) text += ` ${time}`;
  const end = endPhrase(rule, t, opts.timeZone ?? 'UTC');
  if (end) text += `, ${end}`;
  return text;
}

/* ------------------------------------------------------------------------------------------ */
/* Shared helpers                                                                              */
/* ------------------------------------------------------------------------------------------ */

interface Lang {
  locale: RuleLocale;
  and: string;
  core(rule: RecurrenceRule): string;
  time(hour: number, minute: number | undefined): string;
  at: string;
  timesADay(n: number): string;
  count(n: number): string;
  until(date: string): string;
  date(year: number | undefined, month: number, day: number): string;
}

function join(items: readonly string[], and: string): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

function isMonFri(refs: readonly WeekdayRef[] | undefined): boolean {
  if (!refs || refs.length !== 5 || refs.some((r) => r.nth !== undefined)) return false;
  return [1, 2, 3, 4, 5].every((d) => refs.some((r) => r.weekday === d));
}

function isWeekend(refs: readonly WeekdayRef[] | undefined): boolean {
  if (!refs || refs.length !== 2 || refs.some((r) => r.nth !== undefined)) return false;
  return refs.some((r) => r.weekday === 0) && refs.some((r) => r.weekday === 6);
}

function monthName(t: Lang, month: number): string {
  return MONTH_NAMES[t.locale][month - 1] ?? '';
}

function months(t: Lang, list: readonly number[]): string {
  return join(
    list.map((m) => monthName(t, m)),
    t.and,
  );
}

function timePhrase(rule: RecurrenceRule, t: Lang): string {
  if (rule.freq === 'hourly' || rule.freq === 'minutely') return subDailyTimes(rule, t);
  if (!rule.byHour) return '';
  const minutes: (number | undefined)[] = rule.byMinute ?? [undefined];
  const times = rule.byHour.flatMap((h) => minutes.map((m) => t.time(h, m)));
  if (times.length > MAX_LISTED_TIMES) return t.timesADay(times.length);
  return `${t.at} ${join(times, t.and)}`;
}

function subDailyTimes(rule: RecurrenceRule, t: Lang): string {
  const parts: string[] = [];
  if (rule.byMinute && rule.freq === 'hourly') {
    const list = join(rule.byMinute.map(String), t.and);
    if (t.locale === 'fr') {
      parts.push(rule.byMinute.length > 1 ? `aux minutes ${list}` : `à la minute ${list}`);
    } else {
      parts.push(`at minute${rule.byMinute.length > 1 ? 's' : ''} ${list}`);
    }
  } else if (rule.byMinute) {
    const list = join(rule.byMinute.map(String), t.and);
    parts.push(`(minutes ${list})`);
  }
  if (rule.byHour) {
    const hours = join(
      rule.byHour.map((h) => t.time(h, undefined)),
      t.and,
    );
    parts.push(t.locale === 'fr' ? `pendant l'heure de ${hours}` : `during the ${hours} hour`);
  }
  return parts.join(' ');
}

function endPhrase(rule: RecurrenceRule, t: Lang, tz: TimeZone): string {
  if (rule.count !== undefined) return t.count(rule.count);
  if (!rule.until) return '';
  return t.until(untilDate(rule.until, t, tz));
}

function untilDate(until: Until, t: Lang, tz: TimeZone): string {
  if (until.kind === 'instant') {
    const p = zonedParts(until.at, tz);
    return `${t.date(p.year, p.month, p.day)} ${t.at} ${t.time(p.hour, p.minute)}`;
  }
  const date = t.date(until.year, until.month, until.day);
  return until.time ? `${date} ${t.at} ${t.time(until.time.hour, until.time.minute)}` : date;
}

/* ------------------------------------------------------------------------------------------ */
/* French                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const FR_NUMBERS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];

function frOrdinal(n: number): string {
  if (n === 1) return 'premier';
  if (n === -1) return 'dernier';
  if (n === -2) return 'avant-dernier';
  return n > 0 ? `${n}e` : `${-n}e en partant de la fin`;
}

function frMonthDay(n: number): string {
  if (n === 1) return 'le 1er';
  if (n === -1) return 'le dernier jour';
  if (n === -2) return "l'avant-dernier jour";
  return n > 0 ? `le ${n}` : `le ${-n}e jour en partant de la fin`;
}

function frEvery(n: number, plural: string, feminine = false): string {
  if (n === 1) return `${feminine ? 'toutes les' : 'tous les'} ${plural}`;
  return `${feminine ? 'toutes les' : 'tous les'} ${n === 2 ? 'deux' : n} ${plural}`;
}

function frWeekdays(refs: readonly WeekdayRef[], article: boolean): string {
  return join(
    refs.map((r) => {
      const name = WEEKDAY_NAMES.fr[r.weekday] ?? '';
      if (r.nth !== undefined) return `le ${frOrdinal(r.nth)} ${name}`;
      return article ? `le ${name}` : name;
    }),
    'et',
  );
}

/** "le 15", "le dernier vendredi", "le 2e jour ouvré"… or `''` when unspecified. */
function frDaySpec(rule: RecurrenceRule): string {
  const { byDay, byMonthDay, bySetPos } = rule;
  if (bySetPos && byDay) {
    const positions = join(bySetPos.map(frOrdinal), 'et');
    const working = rule.excludeHolidays ? ' ouvré' : '';
    if (isMonFri(byDay)) return `le ${positions} jour${working || ' de semaine'}`;
    if (byDay.length === 1 && byDay[0]) {
      return `le ${positions} ${WEEKDAY_NAMES.fr[byDay[0].weekday]}${working}`;
    }
    return `le ${positions} jour parmi ${frWeekdays(byDay, false)}${working}`;
  }
  const parts: string[] = [];
  if (byMonthDay) parts.push(join(byMonthDay.map(frMonthDay), 'et'));
  if (byDay) parts.push(frWeekdays(byDay, true));
  return parts.join(rule.dayMatch === 'any' ? ' ou ' : ', ');
}

function frWeekly(rule: RecurrenceRule): string {
  const n = rule.interval;
  const byDay = rule.byDay;
  if (!byDay) return n === 1 ? 'chaque semaine' : frEvery(n, 'semaines', true);
  if (isMonFri(byDay)) {
    const days = rule.excludeHolidays ? 'les jours ouvrés' : 'du lundi au vendredi';
    return n === 1 ? days : `${frEvery(n, 'semaines', true)}, ${days}`;
  }
  if (isWeekend(byDay))
    return n === 1 ? 'chaque week-end' : `${frEvery(n, 'semaines', true)}, le week-end`;
  if (n === 1) return `chaque ${frWeekdays(byDay, false)}`;
  if (n <= 6 && byDay.length === 1 && byDay[0]) {
    return `un ${WEEKDAY_NAMES.fr[byDay[0].weekday]} sur ${FR_NUMBERS[n]}`;
  }
  return `${frEvery(n, 'semaines', true)}, ${frWeekdays(byDay, true)}`;
}

function frCore(rule: RecurrenceRule): string {
  const n = rule.interval;
  const inMonths = rule.byMonth ? ` en ${months(FR, rule.byMonth)}` : '';
  switch (rule.freq) {
    case 'yearly': {
      const every = n === 1 ? 'chaque année' : frEvery(n, 'ans');
      if (rule.byMonth && rule.byMonthDay && !rule.byDay) {
        const days = join(rule.byMonthDay.map(frMonthDay), 'et');
        return `${every} ${days} ${months(FR, rule.byMonth)}`;
      }
      const spec = frDaySpec(rule);
      if (rule.byMonth) {
        return spec ? `${every} ${spec} de ${months(FR, rule.byMonth)}` : `${every}${inMonths}`;
      }
      return spec ? `${every}, ${spec} de l'année` : every;
    }
    case 'monthly': {
      const spec = frDaySpec(rule);
      if (!spec) return `${n === 1 ? 'tous les mois' : frEvery(n, 'mois')}${inMonths}`;
      if (n === 1) return `${spec} de chaque mois${inMonths}`;
      return `${frEvery(n, 'mois')}, ${spec}${inMonths}`;
    }
    case 'weekly':
      return `${frWeekly(rule)}${inMonths}`;
    case 'daily': {
      const every = n === 1 ? 'tous les jours' : n === 2 ? 'un jour sur deux' : frEvery(n, 'jours');
      return `${every}${frFilters(rule)}${inMonths}`;
    }
    case 'hourly':
      return `${n === 1 ? 'toutes les heures' : frEvery(n, 'heures', true)}${frFilters(rule)}${inMonths}`;
    case 'minutely':
      return `${n === 1 ? 'toutes les minutes' : frEvery(n, 'minutes', true)}${frFilters(rule)}${inMonths}`;
  }
}

function frFilters(rule: RecurrenceRule): string {
  if (isMonFri(rule.byDay) && !rule.byMonthDay) {
    return rule.excludeHolidays ? ', les jours ouvrés' : ', du lundi au vendredi';
  }
  const spec = frDaySpec(rule);
  return spec ? `, ${spec}` : '';
}

function frTime(hour: number, minute: number | undefined): string {
  return minute ? `${hour} h ${String(minute).padStart(2, '0')}` : `${hour} h`;
}

const FR: Lang = {
  locale: 'fr',
  and: 'et',
  core: frCore,
  time: frTime,
  at: 'à',
  timesADay: (n) => `${n} fois par jour`,
  count: (n) => `${n} fois`,
  until: (date) => `jusqu'au ${date}`,
  date: (year, month, day) =>
    `${day === 1 ? '1er' : day} ${MONTH_NAMES.fr[month - 1] ?? ''}${year === undefined ? '' : ` ${year}`}`,
};

/* ------------------------------------------------------------------------------------------ */
/* English                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const EN_ORDINAL_WORDS = ['', 'first', 'second', 'third', 'fourth', 'fifth'];

function enSuffix(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

function enOrdinal(n: number): string {
  if (n === -1) return 'last';
  if (n === -2) return 'second to last';
  if (n < 0) return `${enSuffix(-n)} to last`;
  return EN_ORDINAL_WORDS[n] ?? enSuffix(n);
}

function enMonthDay(n: number): string {
  if (n === -1) return 'the last day';
  if (n === -2) return 'the second to last day';
  return n > 0 ? `the ${enSuffix(n)}` : `the ${enSuffix(-n)} to last day`;
}

function enEvery(n: number, unit: string): string {
  if (n === 1) return `every ${unit}`;
  return n === 2 ? `every other ${unit}` : `every ${n} ${unit}s`;
}

function enWeekdays(refs: readonly WeekdayRef[]): string {
  return join(
    refs.map((r) => {
      const name = WEEKDAY_NAMES.en[r.weekday] ?? '';
      return r.nth === undefined ? name : `the ${enOrdinal(r.nth)} ${name}`;
    }),
    'and',
  );
}

function enDaySpec(rule: RecurrenceRule): string {
  const { byDay, byMonthDay, bySetPos } = rule;
  if (bySetPos && byDay) {
    const positions = join(bySetPos.map(enOrdinal), 'and');
    const working = rule.excludeHolidays ? 'business ' : '';
    if (isMonFri(byDay)) return `the ${positions} ${working || 'week'}day`;
    if (byDay.length === 1 && byDay[0]) {
      return `the ${positions} ${working}${WEEKDAY_NAMES.en[byDay[0].weekday]}`;
    }
    return `the ${positions} ${working}day among ${enWeekdays(byDay)}`;
  }
  const parts: string[] = [];
  if (byMonthDay) parts.push(join(byMonthDay.map(enMonthDay), 'and'));
  if (byDay) parts.push(enWeekdays(byDay));
  return parts.join(rule.dayMatch === 'any' ? ' or on ' : ', ');
}

function enWeekly(rule: RecurrenceRule): string {
  const n = rule.interval;
  const byDay = rule.byDay;
  if (!byDay) return enEvery(n, 'week');
  if (isMonFri(byDay)) {
    const days = rule.excludeHolidays ? 'business day' : 'weekday';
    return n === 1 ? `every ${days}` : `${enEvery(n, 'week')} on ${days}s`;
  }
  if (isWeekend(byDay)) return n === 1 ? 'every weekend' : `${enEvery(n, 'week')} on weekends`;
  if (n === 1) return `every ${enWeekdays(byDay)}`;
  if (n === 2 && byDay.length === 1 && byDay[0]) {
    return `every other ${WEEKDAY_NAMES.en[byDay[0].weekday]}`;
  }
  return `${enEvery(n, 'week')} on ${enWeekdays(byDay)}`;
}

function enCore(rule: RecurrenceRule): string {
  const n = rule.interval;
  const inMonths = rule.byMonth ? ` in ${months(EN, rule.byMonth)}` : '';
  switch (rule.freq) {
    case 'yearly': {
      const every = enEvery(n, 'year');
      if (rule.byMonth && rule.byMonthDay && !rule.byDay) {
        const days = join(
          rule.byMonthDay.map((d) => (d > 0 ? String(d) : enMonthDay(d))),
          'and',
        );
        return `${every} on ${months(EN, rule.byMonth)} ${days}`;
      }
      const spec = enDaySpec(rule);
      if (rule.byMonth) {
        return spec ? `${every} on ${spec} of ${months(EN, rule.byMonth)}` : `${every}${inMonths}`;
      }
      return spec ? `${every} on ${spec} of the year` : every;
    }
    case 'monthly': {
      const spec = enDaySpec(rule);
      return `${enEvery(n, 'month')}${spec ? ` on ${spec}` : ''}${inMonths}`;
    }
    case 'weekly':
      return `${enWeekly(rule)}${inMonths}`;
    case 'daily':
      return `${enEvery(n, 'day')}${enFilters(rule)}${inMonths}`;
    case 'hourly':
      return `${enEvery(n, 'hour')}${enFilters(rule)}${inMonths}`;
    case 'minutely':
      return `${enEvery(n, 'minute')}${enFilters(rule)}${inMonths}`;
  }
}

function enFilters(rule: RecurrenceRule): string {
  if (isMonFri(rule.byDay) && !rule.byMonthDay) {
    return rule.excludeHolidays ? ', on business days' : ', on weekdays';
  }
  const spec = enDaySpec(rule);
  return spec ? `, on ${spec}` : '';
}

function enTime(hour: number, minute: number | undefined): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute ?? 0).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

const EN: Lang = {
  locale: 'en',
  and: 'and',
  core: enCore,
  time: enTime,
  at: 'at',
  timesADay: (n) => `${n} times a day`,
  count: (n) => (n === 1 ? 'once' : `${n} times`),
  until: (date) => `until ${date}`,
  date: (year, month, day) =>
    `${MONTH_NAMES.en[month - 1] ?? ''} ${day}${year === undefined ? '' : `, ${year}`}`,
};
