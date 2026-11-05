/**
 * Literal French / English recurrence phrases ("tous les lundis à 9h", "the last friday of the
 * month", "le 2e jour ouvré du mois jusqu'au 31 décembre"…).
 *
 * The parser normalises the text (lower case, no diacritics), then consumes known phrases in a
 * fixed order — end clause, working-day phrases, intervals and units, times, dates, months,
 * ordinal weekdays, weekdays, bare month days — replacing each match with a space. Whatever is
 * left must be filler words ("le", "of", "chaque"…); any unknown word makes the whole parse fail,
 * so a phrase is never half-understood.
 *
 * "Ouvré" / "business day" / "working day" means Monday–Friday and not in the holiday list given
 * to `occurrences`; "weekday" / "en semaine" means Monday–Friday only.
 */
import { daysInMonth } from './calendar.ts';
import { sortUnique } from './rrule.ts';
import type { Frequency, RecurrenceRule, Until, Weekday, WeekdayRef } from './types.ts';
import type { RuleLocale } from './vocab.ts';

export interface ParseOptions {
  /** Disambiguates numeric dates ("03/04"): `fr` = day/month, `en` = month/day. */
  locale?: RuleLocale;
}

const WEEKDAYS: Record<string, Weekday> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
  tues: 2,
  thurs: 4,
  thur: 4,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
  lun: 1,
  mar: 2,
  mer: 3,
  jeu: 4,
  ven: 5,
  sam: 6,
  dim: 0,
};

/** Month names usable on their own ("en mars"). Ambiguous abbreviations are date-only. */
const MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  janv: 1,
  fevr: 2,
  fev: 2,
  avr: 4,
  juil: 7,
  jan: 1,
  feb: 2,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
/** "mar" is also Tuesday (FR) and "sept" also seven: months only next to a day number. */
const DATE_MONTHS: Record<string, number> = { ...MONTHS, mar: 3, sept: 9 };

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  one: 1,
  deux: 2,
  two: 2,
  other: 2,
  trois: 3,
  three: 3,
  quatre: 4,
  four: 4,
  cinq: 5,
  five: 5,
  six: 6,
  sept: 7,
  seven: 7,
  huit: 8,
  eight: 8,
  neuf: 9,
  nine: 9,
  dix: 10,
  ten: 10,
  onze: 11,
  eleven: 11,
  douze: 12,
  twelve: 12,
  quinze: 15,
};

const ORDINAL_WORDS: Record<string, number> = {
  'avant dernier': -2,
  'avant derniere': -2,
  penultimate: -2,
  'second to last': -2,
  'second last': -2,
  'next to last': -2,
  premier: 1,
  premiere: 1,
  first: 1,
  deuxieme: 2,
  second: 2,
  seconde: 2,
  troisieme: 3,
  third: 3,
  quatrieme: 4,
  fourth: 4,
  cinquieme: 5,
  fifth: 5,
  dernier: -1,
  derniere: -1,
  last: -1,
};

const FILLER = new Set(
  (
    'le la les l un une des de du d et and the of on in en a at au aux sur each every chaque ' +
    'tous toutes tout , - & par per repeat repeats repeter recurring'
  ).split(' '),
);

const MON_FRI: Weekday[] = [1, 2, 3, 4, 5];

/** Longest alternatives first, so `monday` wins over `mon`. */
function alternation(words: Iterable<string>): string {
  return (
    [...words]
      .sort((a, b) => b.length - a.length)
      // Hyphens are spaced out before matching: "avant-dernier" reads "avant - dernier".
      .map((w) => w.replace(/ /g, '(?: - | )'))
      .join('|')
  );
}

const WD = `(?:${alternation(Object.keys(WEEKDAYS))})`;
const MONTH = `(?:${alternation(Object.keys(MONTHS))})`;
const DATE_MONTH = `(?:${alternation(Object.keys(DATE_MONTHS))})`;
const NUM = `(?:\\d{1,4}|${alternation(Object.keys(NUMBER_WORDS))})`;
const ORD = `(?:${alternation(Object.keys(ORDINAL_WORDS))}|\\d{1,2}(?:ere|er|re|eme|e|st|nd|rd|th))`;
const DAY_SUFFIX = '(?:ere|er|re|eme|e|st|nd|rd|th)';
const WORKING = '(?:ouvres?|ouvrables?)';
const UNIT =
  '(jours?|days?|semaines?|weeks?|mois|months?|ans|annees?|years?|heures?|hours?|h|minutes?|mins?)';

type Unit = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'hourly' | 'minutely';

const PLAIN_UNITS: [Unit, RegExp][] = [
  [
    'daily',
    /\b(?:tous les jours|chaque jour|quotidien(?:ne)?(?:ment)?|daily|every day|each day)\b/g,
  ],
  [
    'weekly',
    /\b(?:toutes les semaines|chaque semaine|par semaine|hebdomadaire(?:ment)?|weekly|every week|each week|per week)\b/g,
  ],
  [
    'monthly',
    /\b(?:tous les mois|chaque mois|du mois|par mois|mensuel(?:le)?(?:ment)?|monthly|(?:every|each|the|a) month)\b/g,
  ],
  [
    'yearly',
    /\b(?:tous les ans|toutes les annees|chaque annee|chaque an|de l annee|par an|annuel(?:le)?(?:ment)?|yearly|annually|(?:every|each|the|a) year)\b/g,
  ],
  ['hourly', /\b(?:toutes les heures|chaque heure|hourly|every hour|each hour)\b/g],
  ['minutely', /\b(?:toutes les minutes|chaque minute|every minute|each minute)\b/g],
];

interface Draft {
  ok: boolean;
  locale: RuleLocale;
  unit?: Unit;
  interval?: number;
  /** Weekdays without ordinal. */
  days: Set<Weekday>;
  /** Weekdays with ordinal inside the month (or year). */
  nthDays: WeekdayRef[];
  /** "le 3ᵉ mardi ouvré": one weekday, positions among its non-holiday occurrences. */
  workingWeekday?: { weekday: Weekday; positions: number[] };
  /** "le 2ᵉ jour ouvré": positions among Monday–Friday non-holidays. */
  workingDayPositions: number[];
  excludeHolidays: boolean;
  monthDays: number[];
  months: number[];
  dates: { month: number; day: number }[];
  times: { hour: number; minute: number }[];
  count?: number;
  until?: Until;
}

/** Parses a literal phrase, or returns `null` when any part of it is not understood. */
export function parseLiteral(text: string, opts: ParseOptions = {}): RecurrenceRule | null {
  let s = ` ${normalize(text)} `;
  const draft: Draft = {
    ok: true,
    locale: opts.locale ?? guessLocale(s),
    days: new Set(),
    nthDays: [],
    workingDayPositions: [],
    excludeHolidays: false,
    monthDays: [],
    months: [],
    dates: [],
    times: [],
  };
  s = takeEnd(s, draft);
  s = spaced(s.replace(/-/g, ' - '));
  for (const step of STEPS) {
    if (!draft.ok) return null;
    s = step(s, draft);
  }
  if (!draft.ok || !onlyFiller(s)) return null;
  return assemble(draft);
}

export function normalize(text: string): string {
  return spaced(
    text
      .toLowerCase()
      .replace(/ᵉʳ/g, 'er')
      .replace(/ʳᵉ/g, 're')
      .replace(/ᵉ/g, 'e')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[’'`]/g, ' ')
      .replace(/,/g, ' , ')
      .replace(/[;!?()]/g, ' ')
      .replace(/\.(?!\d)/g, ' '),
  );
}

function spaced(s: string): string {
  return ` ${s.replace(/\s+/g, ' ').trim()} `;
}

function guessLocale(s: string): RuleLocale {
  return /\b(?:jusqu|tous|toutes|chaque|le|les|fois|jours?|mois|ans?|semaines?)\b/.test(s)
    ? 'fr'
    : 'en';
}

/** Replaces every match of `re` with a space after handing its groups to `onMatch`. */
function consume(s: string, re: RegExp, onMatch: (groups: (string | undefined)[]) => void): string {
  return s.replace(re, (...args: unknown[]) => {
    const groups = args.slice(1).filter((a) => typeof a === 'string' || a === undefined);
    // `replace` passes the offset and whole string after the groups; drop the string.
    onMatch(groups.slice(0, -1) as (string | undefined)[]);
    return ' ';
  });
}

function onlyFiller(s: string): boolean {
  return s
    .trim()
    .split(/\s+/)
    .every((w) => w === '' || FILLER.has(w));
}

function numberValue(word: string): number {
  return NUMBER_WORDS[word] ?? Number(word);
}

function ordinalValue(word: string): number {
  const key = word.replace(/ - | /g, ' ');
  return ORDINAL_WORDS[key] ?? Number.parseInt(key, 10);
}

function weekdayOf(word: string): Weekday {
  return WEEKDAYS[word.replace(/s$/, '')] ?? WEEKDAYS[word] ?? 0;
}

/* ------------------------------------------------------------------------------------------ */
/* End clause                                                                                  */
/* ------------------------------------------------------------------------------------------ */

const COUNT_RE = new RegExp(`\\b(?:pendant |for )?(${NUM}) (?:fois|times|occurrences?)\\b`, 'g');
const UNTIL_RE =
  /\b(?:jusqu(?: au| a| a la)?|jusque|until|till|through|thru|up to|ending(?: on)?)\s+(?:le |the |on )?/g;

function takeEnd(s: string, draft: Draft): string {
  s = consume(s, COUNT_RE, ([n]) => {
    const value = numberValue(n ?? '');
    if (draft.count !== undefined || !(value >= 1)) draft.ok = false;
    draft.count = value;
  });
  // "monday through friday" also starts like an end clause: only a following date makes one.
  for (const m of s.matchAll(UNTIL_RE)) {
    const rest = s.slice(m.index + m[0].length);
    const date = matchDate(rest, draft.locale);
    if (!date) continue;
    const { length, ...until } = date;
    draft.until = { kind: 'local', ...until };
    return `${s.slice(0, m.index)} ${rest.slice(length)}`;
  }
  return s;
}

interface MatchedDate {
  year?: number;
  month: number;
  day: number;
  length: number;
}

/** A date at the very start of `s` (ISO, numeric, "31 décembre 2026", "Dec 31st, 2026"). */
function matchDate(s: string, locale: RuleLocale): MatchedDate | null {
  let m = /^(\d{4})-(\d{2})-(\d{2})\b/.exec(s);
  if (m) return checkDate(Number(m[2]), Number(m[3]), Number(m[1]), m[0].length);
  m = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}|\d{2}))?\b/.exec(s);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const year = m[3] === undefined ? undefined : expandYear(m[3]);
    return locale === 'fr'
      ? checkDate(b, a, year, m[0].length)
      : checkDate(a, b, year, m[0].length);
  }
  const yearPart = '(?: ,)?(?: (\\d{4}))?';
  m = new RegExp(`^(\\d{1,2})${DAY_SUFFIX}? (?:of |de |d )?(${DATE_MONTH})\\b${yearPart}`).exec(s);
  if (m) {
    return checkDate(DATE_MONTHS[m[2] ?? ''] ?? 0, Number(m[1]), optYear(m[3]), m[0].length);
  }
  m = new RegExp(`^(${DATE_MONTH}) (?:the )?(\\d{1,2})${DAY_SUFFIX}?\\b${yearPart}`).exec(s);
  if (m) {
    return checkDate(DATE_MONTHS[m[1] ?? ''] ?? 0, Number(m[2]), optYear(m[3]), m[0].length);
  }
  return null;
}

function optYear(text: string | undefined): number | undefined {
  return text === undefined ? undefined : Number(text);
}

function expandYear(text: string): number {
  return text.length === 2 ? 2000 + Number(text) : Number(text);
}

function checkDate(
  month: number,
  day: number,
  year: number | undefined,
  length: number,
): MatchedDate | null {
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year ?? 2000, month)) return null;
  return year === undefined ? { month, day, length } : { year, month, day, length };
}

/* ------------------------------------------------------------------------------------------ */
/* Phrase steps, in order                                                                      */
/* ------------------------------------------------------------------------------------------ */

type Step = (s: string, draft: Draft) => string;

function setUnit(draft: Draft, unit: Unit, interval?: number): void {
  if (draft.unit !== undefined && draft.unit !== unit) draft.ok = false;
  if (interval !== undefined) {
    if (draft.interval !== undefined && draft.interval !== interval) draft.ok = false;
    if (!(interval >= 1)) draft.ok = false;
    draft.interval = interval;
  }
  draft.unit = unit;
}

const workingDayPhrases: Step = (s, draft) => {
  s = consume(
    s,
    new RegExp(
      `\\b(${ORD}) (?:jours? ${WORKING}|(?:business|working|work) days?|workdays?)\\b`,
      'g',
    ),
    ([ord]) => draft.workingDayPositions.push(ordinalValue(ord ?? '')),
  );
  s = consume(
    s,
    new RegExp(
      `\\b(?:tous les |chaque |les |every |each |on )?(?:jours? ${WORKING}|(?:business|working) days?|workdays?)\\b`,
      'g',
    ),
    () => {
      MON_FRI.forEach((d) => draft.days.add(d));
      draft.excludeHolidays = true;
    },
  );
  s = consume(s, /\b(?:every |each |on )?weekdays?\b|\ben semaine\b/g, () =>
    MON_FRI.forEach((d) => draft.days.add(d)),
  );
  s = consume(
    s,
    /\b(?:tous les |chaque |les |le |every |each |on )?(?:the )?week(?: - )?ends?\b/g,
    () => {
      draft.days.add(6);
      draft.days.add(0);
    },
  );
  // "le dernier jour du mois", "the 15th day of the month".
  return consume(s, new RegExp(`\\b(${ORD}) (?:jour|day)\\b`, 'g'), ([ord]) =>
    draft.monthDays.push(ordinalValue(ord ?? '')),
  );
};

const UNIT_OF: Record<string, Unit> = {
  j: 'daily',
  d: 'daily',
  s: 'weekly',
  w: 'weekly',
  mo: 'monthly',
  a: 'yearly',
  y: 'yearly',
  he: 'hourly',
  ho: 'hourly',
  h: 'hourly',
  mi: 'minutely',
};

function unitOf(word: string): Unit {
  return UNIT_OF[word.slice(0, 2)] ?? UNIT_OF[word.slice(0, 1)] ?? 'daily';
}

const intervals: Step = (s, draft) => {
  s = consume(
    s,
    new RegExp(`\\b(?:un|une|one) (${WD})s? (?:sur|out of) (${NUM})\\b`, 'g'),
    ([wd, n]) => {
      draft.days.add(weekdayOf(wd ?? ''));
      setUnit(draft, 'weekly', numberValue(n ?? ''));
    },
  );
  s = consume(s, new RegExp(`\\bevery (other|${NUM}) (${WD})s?\\b`, 'g'), ([n, wd]) => {
    draft.days.add(weekdayOf(wd ?? ''));
    setUnit(draft, 'weekly', numberValue(n ?? ''));
  });
  s = consume(
    s,
    new RegExp(`\\b(?:tous|toutes|every|chaque) (?:les )?(other|${NUM}) ${UNIT}\\b`, 'g'),
    ([n, unitWord]) => {
      const unit = unitOf(unitWord ?? '');
      // French "tous les quinze jours" is the idiom for "every two weeks".
      if (n === 'quinze' && unit === 'daily') setUnit(draft, 'weekly', 2);
      else setUnit(draft, unit, numberValue(n ?? ''));
    },
  );
  s = consume(
    s,
    new RegExp(
      `\\b(?:un|une|one) (jour|day|semaine|week|mois|month|an|annee|year|heure|hour) (?:sur|out of) (${NUM})\\b`,
      'g',
    ),
    ([unitWord, n]) => setUnit(draft, unitOf(unitWord ?? ''), numberValue(n ?? '')),
  );
  for (const [unit, re] of PLAIN_UNITS) s = consume(s, re, () => setUnit(draft, unit));
  return s;
};

const times: Step = (s, draft) => {
  const push = (hour: number, minute: number): void => {
    if (hour > 23 || minute > 59) draft.ok = false;
    draft.times.push({ hour, minute });
  };
  s = consume(s, /\b(?:a |at |vers |@ )?(midi|noon|minuit|midnight)\b/g, ([w]) =>
    push(w === 'midi' || w === 'noon' ? 12 : 0, 0),
  );
  s = consume(
    s,
    /\b(?:a |at |vers |@ )?(\d{1,2})(?::(\d{2}))? ?(am|pm|a m|p m)\b/g,
    ([h, m, meridiem]) => {
      const hour = Number(h);
      if (hour < 1 || hour > 12) draft.ok = false;
      push((hour % 12) + (meridiem?.startsWith('p') ? 12 : 0), Number(m ?? 0));
    },
  );
  s = consume(s, /\b(?:a |at |vers |@ )?(\d{1,2}):(\d{2})\b/g, ([h, m]) =>
    push(Number(h), Number(m)),
  );
  s = consume(s, /\b(?:a |vers )?(\d{1,2}) ?h ?(\d{2})?\b/g, ([h, m]) =>
    push(Number(h), Number(m ?? 0)),
  );
  return consume(s, /\b(?:a |vers )(\d{1,2}) heures?(?: (\d{2}))?\b/g, ([h, m]) =>
    push(Number(h), Number(m ?? 0)),
  );
};

const dates: Step = (s, draft) => {
  const push = (month: number, day: number): void => {
    if (checkDate(month, day, undefined, 0) === null) draft.ok = false;
    draft.dates.push({ month, day });
  };
  s = consume(
    s,
    new RegExp(`\\b(\\d{1,2})${DAY_SUFFIX}? (?:of |de |d )?(${DATE_MONTH})\\b`, 'g'),
    ([d, m]) => push(DATE_MONTHS[m ?? ''] ?? 0, Number(d)),
  );
  return consume(
    s,
    new RegExp(`\\b(${DATE_MONTH}) (?:the )?(\\d{1,2})${DAY_SUFFIX}?\\b`, 'g'),
    ([m, d]) => push(DATE_MONTHS[m ?? ''] ?? 0, Number(d)),
  );
};

const months: Step = (s, draft) =>
  consume(s, new RegExp(`\\b(${MONTH})\\b`, 'g'), ([m]) => draft.months.push(MONTHS[m ?? ''] ?? 0));

const ORD_LIST = `((?:${ORD})(?: (?:et|and|,) (?:le |la |the )?(?:${ORD}))*)`;

const ordinalWeekdays: Step = (s, draft) =>
  consume(
    s,
    new RegExp(`\\b${ORD_LIST} (?:(business|working) )?(${WD})s?(?: (${WORKING}))?\\b`, 'g'),
    ([list, business, wd, working]) => {
      const weekday = weekdayOf(wd ?? '');
      const positions = [...(list ?? '').matchAll(new RegExp(ORD, 'g'))].map((m) =>
        ordinalValue(m[0]),
      );
      if (business || working) {
        if (draft.workingWeekday && draft.workingWeekday.weekday !== weekday) draft.ok = false;
        draft.workingWeekday = { weekday, positions };
      } else {
        for (const nth of positions) draft.nthDays.push({ weekday, nth });
      }
    },
  );

const weekdays: Step = (s, draft) => {
  s = consume(
    s,
    new RegExp(`\\b(?:du |from )?(${WD}) (?:au|a|to|through|thru|-) (${WD})\\b`, 'g'),
    ([a, b]) => {
      const [start, end] = [weekdayOf(a ?? ''), weekdayOf(b ?? '')];
      for (let d = start; ; d = ((d + 1) % 7) as Weekday) {
        draft.days.add(d);
        if (d === end) break;
      }
    },
  );
  return consume(s, new RegExp(`\\b(${WD})s?\\b`, 'g'), ([wd]) =>
    draft.days.add(weekdayOf(wd ?? '')),
  );
};

const monthDays: Step = (s, draft) =>
  consume(s, new RegExp(`\\b(\\d{1,2})${DAY_SUFFIX}?\\b`, 'g'), ([d]) =>
    draft.monthDays.push(Number(d)),
  );

const STEPS: Step[] = [
  workingDayPhrases,
  intervals,
  times,
  dates,
  months,
  ordinalWeekdays,
  weekdays,
  monthDays,
];

/* ------------------------------------------------------------------------------------------ */
/* Assembly                                                                                    */
/* ------------------------------------------------------------------------------------------ */

function assemble(d: Draft): RecurrenceRule | null {
  const daySpec = buildDaySpec(d);
  if (!daySpec) return null;
  const yearlyDates = buildDates(d);
  if (!yearlyDates) return null;
  const freq = resolveFrequency(d, daySpec, yearlyDates.byMonth !== undefined);
  if (!freq) return null;

  const rule: RecurrenceRule = { syntax: 'literal', freq, interval: d.interval ?? 1, wkst: 1 };
  const byMonth = yearlyDates.byMonth ?? (d.months.length ? sortUnique(d.months) : undefined);
  if (byMonth) rule.byMonth = byMonth;
  const byMonthDay = yearlyDates.byMonthDay ?? daySpec.byMonthDay;
  if (byMonthDay) rule.byMonthDay = byMonthDay;
  if (daySpec.byDay) rule.byDay = daySpec.byDay;
  if (daySpec.bySetPos) rule.bySetPos = daySpec.bySetPos;
  if (d.excludeHolidays || daySpec.bySetPos) rule.excludeHolidays = true;
  if (!applyTimes(rule, d.times)) return null;
  if (d.count !== undefined) rule.count = d.count;
  if (d.until) rule.until = d.until;
  return rule.count !== undefined && rule.until ? null : rule;
}

interface DaySpec {
  byDay?: WeekdayRef[];
  byMonthDay?: number[];
  bySetPos?: number[];
  /** Needs a monthly or yearly period (ordinals, month days, positions). */
  periodic: boolean;
}

function buildDaySpec(d: Draft): DaySpec | null {
  const sources = [
    d.workingWeekday !== undefined,
    d.workingDayPositions.length > 0,
    d.nthDays.length > 0 || d.days.size > 0 || d.monthDays.length > 0,
  ].filter(Boolean).length;
  if (sources > 1) return null;
  if (d.workingWeekday) {
    const { weekday, positions } = d.workingWeekday;
    if (!validPositions(positions)) return null;
    return { byDay: [{ weekday }], bySetPos: sortUnique(positions), periodic: true };
  }
  if (d.workingDayPositions.length > 0) {
    if (!validPositions(d.workingDayPositions)) return null;
    return {
      byDay: MON_FRI.map((weekday) => ({ weekday })),
      bySetPos: sortUnique(d.workingDayPositions),
      periodic: true,
    };
  }
  const monthDays = sortUnique(d.monthDays);
  if (monthDays.some((n) => n === 0 || n < -31 || n > 31)) return null;
  const refs: WeekdayRef[] = [
    // Monday-first order, as people read a week.
    ...[...d.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((weekday) => ({ weekday })),
    ...d.nthDays,
  ];
  if (refs.some((r) => r.nth !== undefined && (r.nth === 0 || Math.abs(r.nth) > 5))) return null;
  const spec: DaySpec = { periodic: monthDays.length > 0 || d.nthDays.length > 0 };
  if (refs.length > 0) spec.byDay = refs;
  if (monthDays.length > 0) spec.byMonthDay = monthDays;
  return spec;
}

/** Positions inside a month's working days (at most 23 of them). */
function validPositions(positions: readonly number[]): boolean {
  return positions.every((p) => p !== 0 && Math.abs(p) <= 23);
}

/** "le 1er mars et le 1er septembre": dates must form a month × day grid. */
function buildDates(d: Draft): { byMonth?: number[]; byMonthDay?: number[] } | null {
  if (d.dates.length === 0) return {};
  if (d.months.length > 0 || d.monthDays.length > 0) return null;
  const byMonth = sortUnique(d.dates.map((x) => x.month));
  const byMonthDay = sortUnique(d.dates.map((x) => x.day));
  const unique = new Set(d.dates.map((x) => `${x.month}/${x.day}`));
  return unique.size === byMonth.length * byMonthDay.length ? { byMonth, byMonthDay } : null;
}

function resolveFrequency(d: Draft, spec: DaySpec, hasDates: boolean): Frequency | null {
  const unit = d.unit;
  if (unit === undefined) {
    if (hasDates || d.months.length > 0) return 'yearly';
    if (spec.periodic) return 'monthly';
    return spec.byDay ? 'weekly' : null;
  }
  switch (unit) {
    case 'yearly':
      // A bare month day under a yearly rule would repeat every month (RFC 5545).
      return spec.byMonthDay && !hasDates && d.months.length === 0 ? null : 'yearly';
    case 'monthly':
      return hasDates ? null : 'monthly';
    case 'weekly':
    case 'daily':
      if (hasDates || spec.periodic) return null;
      return unit === 'daily' && spec.byDay && (d.interval ?? 1) === 1 ? 'weekly' : unit;
    default:
      return hasDates || spec.bySetPos || d.times.length > 0 ? null : unit;
  }
}

/** Several times must share either their minute or their hour (one BYHOUR × BYMINUTE grid). */
function applyTimes(rule: RecurrenceRule, list: Draft['times']): boolean {
  if (list.length === 0) return true;
  const hours = sortUnique(list.map((t) => t.hour));
  const minutes = sortUnique(list.map((t) => t.minute));
  if (hours.length > 1 && minutes.length > 1) return false;
  rule.byHour = hours;
  rule.byMinute = minutes;
  return true;
}
