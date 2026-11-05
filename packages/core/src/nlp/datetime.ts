/**
 * Date, time, duration and deadline matchers.
 *
 * Each matcher runs a sticky regex on the folded input at a word boundary and resolves its
 * value against `ctx.today` immediately. Semantics (documented in README.md):
 * - a bare weekday or "ce/this <weekday>" is its next occurrence, today included;
 *   "<weekday> prochain" / "next <weekday>" is strictly after today;
 * - "le 12" / "12 mars" / "12/03" without a year is the next occurrence, today included;
 * - "Nh"/"N heures" without a prefix is a time of day when N ≥ 5 and a duration when N ≤ 4;
 *   "à"/"at"/"vers" force a time, "pendant"/"for"/"~" force a duration.
 */
import {
  addDaysCal,
  addMonthsCal,
  isValidCal,
  lastDayOfMonth,
  mondayOf,
  nextDayOfMonth,
  nextMonthDay,
  nextWeekday,
  weekdayCal,
  type CalDate,
} from './calendar.ts';
import type { Ctx, DateSpec, Hit, TimeSpec } from './internal.ts';
import {
  MONTHS,
  NUMBER_WORDS,
  PARTS_OF_DAY,
  PERIODS,
  RELATIVE_DAYS,
  WEEKDAYS,
  alt,
  parseNumber,
  type PeriodKind,
} from './lexicon.ts';
import { execAt, sticky, WE } from './text.ts';
import type { PartOfDay } from './types.ts';

const MINUTE_MS = 60_000;
const WD = alt(WEEKDAYS.keys());
const MONTH = alt(MONTHS.keys());
const NUM = `(\\d{1,3}|${alt(NUMBER_WORDS.keys())})`;
/** End of a numeric token: no letter, digit, colon or slash follows. */
const NE = '(?![\\p{L}\\p{N}:/])';

/* ------------------------------------------------------------------------------------------ */
/* Times of day                                                                                */
/* ------------------------------------------------------------------------------------------ */

type TimeForm = 'word' | 'ampm' | 'colon' | 'hour' | 'bare';

interface RawTime {
  end: number;
  h: number;
  m: number;
  form: TimeForm;
  mer?: 'am' | 'pm';
  pod?: PartOfDay;
}

const RE_T_WORD = sticky(`(midi|noon|minuit|midnight)${WE}`);
const RE_T_AMPM = sticky(`(\\d{1,2})(?:[:.](\\d{2}))? ?(am|pm|a\\.m\\.|p\\.m\\.)${WE}`);
const RE_T_COLON = sticky(`(\\d{1,2}):(\\d{2})${WE}`);
const RE_T_HOUR = sticky(
  `(\\d{1,2}) ?(?:heures?|h)(?: ?(\\d{2}))?(?: (?:du (matin|soir)|de l'(apres-midi)))?${WE}`,
);
const RE_T_BARE = sticky(`(\\d{1,2})(?![\\p{L}\\p{N}:/.,])`);

/** Reads a time expression at `pos` without classifying it. */
function readTime(f: string, pos: number, allowBare: boolean): RawTime | null {
  let m = execAt(RE_T_WORD, f, pos);
  if (m) {
    const w = m[1] ?? '';
    const isNoon = w === 'midi' || w === 'noon';
    return { end: pos + m[0].length, h: isNoon ? 12 : 24, m: 0, form: 'word' };
  }
  m = execAt(RE_T_AMPM, f, pos);
  if (m) {
    const mer = (m[3] ?? '').startsWith('p') ? 'pm' : 'am';
    return { end: pos + m[0].length, h: Number(m[1]), m: Number(m[2] ?? 0), form: 'ampm', mer };
  }
  m = execAt(RE_T_COLON, f, pos);
  if (m) return { end: pos + m[0].length, h: Number(m[1]), m: Number(m[2]), form: 'colon' };
  m = execAt(RE_T_HOUR, f, pos);
  if (m) {
    const pod: PartOfDay | undefined =
      m[3] === 'matin' ? 'morning' : m[3] === 'soir' ? 'evening' : m[4] ? 'afternoon' : undefined;
    const out: RawTime = {
      end: pos + m[0].length,
      h: Number(m[1]),
      m: Number(m[2] ?? 0),
      form: 'hour',
    };
    if (pod) out.pod = pod;
    return out;
  }
  if (!allowBare) return null;
  m = execAt(RE_T_BARE, f, pos);
  return m ? { end: pos + m[0].length, h: Number(m[1]), m: 0, form: 'bare' } : null;
}

/** Minutes after midnight, or null when out of range. `mer` overrides the time's own meridiem. */
function toMinutes(t: RawTime, mer = t.mer): number | null {
  if (t.m > 59) return null;
  if (t.form === 'word') return t.h * 60;
  if (mer) {
    if (t.h < 1 || t.h > 12) return null;
    return ((t.h % 12) + (mer === 'pm' ? 12 : 0)) * 60 + t.m;
  }
  if (t.h > 23) return null;
  let minutes = t.h * 60 + t.m;
  if (t.pod) minutes = applyPod(minutes, t.pod);
  return minutes;
}

/** Moves a morning-looking hour into the afternoon/evening when the context says so. */
export function applyPod(minutes: number, pod: PartOfDay): number {
  const h = Math.floor(minutes / 60);
  if (pod === 'afternoon' && h >= 1 && h <= 7) return minutes + 720;
  if (pod === 'evening' && h >= 1 && h <= 11) return minutes + 720;
  if (pod === 'night' && h >= 6 && h <= 11) return minutes + 720;
  return minutes;
}

const RE_TIME_PREFIX = sticky(`(a partir de|aux alentours de|vers|des|a|at|around) `);

function single(t: RawTime, minutes: number, confidence = 1): TimeSpec {
  const out: TimeSpec = { start: minutes, confidence };
  if (t.pod) out.pod = t.pod;
  return out;
}

/** Reads a time that is known to be one (after a prefix such as "à", "avant", or a date). */
function readForcedTime(
  f: string,
  pos: number,
  allowBare: boolean,
): { end: number; time: TimeSpec } | null {
  const t = readTime(f, pos, allowBare);
  if (!t) return null;
  if (t.form === 'bare') {
    if (t.h > 23) return null;
    // "at 3" → 15:00: the afternoon is the likeliest reading of a small bare hour.
    if (t.h >= 1 && t.h <= 6) return { end: t.end, time: single(t, (t.h + 12) * 60, 0.8) };
    return { end: t.end, time: single(t, t.h * 60, t.h <= 12 ? 0.8 : 1) };
  }
  const minutes = toMinutes(t);
  return minutes === null ? null : { end: t.end, time: single(t, minutes) };
}

export function matchTime(c: Ctx, pos: number): Hit | null {
  const pm = execAt(RE_TIME_PREFIX, c.f, pos);
  if (pm) {
    const r = readForcedTime(c.f, pos + pm[0].length, pm[1] === 'at');
    return r ? { type: 'time', start: pos, end: r.end, data: { k: 'time', time: r.time } } : null;
  }
  const t = readTime(c.f, pos, false);
  if (!t) return null;
  // Unprefixed "2h" / "1h30" read as a duration; "14h" as a time of day.
  if (t.form === 'hour' && t.h <= 4) return null;
  const minutes = toMinutes(t);
  if (minutes === null) return null;
  return { type: 'time', start: pos, end: t.end, data: { k: 'time', time: single(t, minutes) } };
}

const RE_RANGE_PREFIX = sticky(`(de|from|entre|between) `);
const RE_RANGE_SEP = sticky(`(?: ?- ?| (a|au|to|until|till|jusqu'a|et|and) )`);

/** "14h-16h", "de 14h à 16h", "from 2 to 4pm", "entre 9h et 10h". */
export function matchTimeRange(c: Ctx, pos: number): Hit | null {
  const pm = execAt(RE_RANGE_PREFIX, c.f, pos);
  const prefix = pm?.[1];
  const p1 = pos + (pm ? pm[0].length : 0);
  const t1 = readTime(c.f, p1, true);
  if (!t1) return null;
  const sep = execAt(RE_RANGE_SEP, c.f, t1.end);
  if (!sep) return null;
  const word = sep[1];
  if ((word === 'et' || word === 'and') && prefix !== 'entre' && prefix !== 'between') return null;
  const t2 = readTime(c.f, t1.end + sep[0].length, true);
  if (!t2) return null;
  if (t1.form === 'bare' && t2.form === 'bare') return null;
  if (t2.form === 'bare' && !prefix) return null;
  const minutes = rangeMinutes(t1, t2);
  if (!minutes) return null;
  const time: TimeSpec = { start: minutes[0], end: minutes[1], confidence: 1 };
  const pod = t2.pod ?? t1.pod;
  if (pod) time.pod = pod;
  return { type: 'time', start: pos, end: t2.end, data: { k: 'time', time } };
}

/** Resolves both ends, sharing a meridiem written on one side only ("2-4pm", "11-1pm"). */
function rangeMinutes(t1: RawTime, t2: RawTime): [number, number] | null {
  const pod = t2.pod ?? t1.pod;
  const a: RawTime = pod && !t1.pod ? { ...t1, pod } : t1;
  const b: RawTime = pod && !t2.pod ? { ...t2, pod } : t2;
  let start = toMinutes(a);
  let end = toMinutes(b);
  if (start === null || end === null) return null;
  if (b.mer && !a.mer && a.h >= 1 && a.h <= 12) {
    const shared = toMinutes(a, b.mer);
    if (shared !== null && shared < end) start = shared;
  } else if (a.mer && !b.mer && b.h >= 1 && b.h <= 12) {
    const shared = toMinutes(b, a.mer);
    if (shared !== null && shared > start) end = shared;
  }
  if (start === end) return null;
  return [start, end];
}

/* ------------------------------------------------------------------------------------------ */
/* Durations                                                                                   */
/* ------------------------------------------------------------------------------------------ */

interface RawDuration {
  end: number;
  minutes: number;
  /** A bare "Nh"/"N heures" form that might be a time of day; `hours` is N. */
  hourish?: number;
}

const RE_D_HM = sticky(`(\\d{1,2}) ?h ?(\\d{1,2})(?: ?(?:min|mn))?${WE}`);
const RE_D_H = sticky(`(\\d{1,3}(?:[.,]\\d{1,2})?) ?(heures?|hours?|hrs?|h)${WE}`);
const RE_D_M = sticky(`(\\d{1,4}) ?(?:minutes?|mins?|mn)${WE}`);
const RE_D_HALF = sticky(
  `(?:(?:une|a|an|one) )?(?:demi-heure|demie heure|half an hour|half-hour|half hour)${WE}`,
);
const RE_D_QUARTER = sticky(
  `(?:(?:un|a|one) )?(?:quart d'heure|quarter of an hour|quarter hour)${WE}`,
);
const RE_D_3QUARTERS = sticky(`(?:trois quarts d'heure|three quarters of an hour)${WE}`);
const RE_D_WORDS = sticky(`${NUM} (heures?|hours?|minutes?)(?: (et demie?|and a half))?${WE}`);

/** Reads a duration at `pos` ("2h", "1h30", "45 min", "1,5 h", "une demi-heure"). */
function readDuration(f: string, pos: number): RawDuration | null {
  let m = execAt(RE_D_HM, f, pos);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (min > 59) return null;
    return { end: pos + m[0].length, minutes: h * 60 + min, hourish: h };
  }
  m = execAt(RE_D_H, f, pos);
  if (m) {
    const value = Number((m[1] ?? '').replace(',', '.'));
    const unit = m[2] ?? '';
    const hourish = unit === 'h' || unit.startsWith('heure');
    const out: RawDuration = { end: pos + m[0].length, minutes: Math.round(value * 60) };
    if (hourish && Number.isInteger(value)) out.hourish = value;
    return out;
  }
  m = execAt(RE_D_M, f, pos);
  if (m) return { end: pos + m[0].length, minutes: Number(m[1]) };
  m = execAt(RE_D_HALF, f, pos);
  if (m) return { end: pos + m[0].length, minutes: 30 };
  m = execAt(RE_D_QUARTER, f, pos);
  if (m) return { end: pos + m[0].length, minutes: 15 };
  m = execAt(RE_D_3QUARTERS, f, pos);
  if (m) return { end: pos + m[0].length, minutes: 45 };
  m = execAt(RE_D_WORDS, f, pos);
  if (m) {
    const n = parseNumber(m[1] ?? '');
    if (n === undefined) return null;
    const hours = (m[2] ?? '').startsWith('h');
    const half = m[3] ? 30 : 0;
    return { end: pos + m[0].length, minutes: hours ? n * 60 + half : n };
  }
  return null;
}

const RE_DUR_PREFIX = sticky(
  `(?:(?:pendant|durant|during|for|pour|en|environ|env\\.|about|approx\\.?|approximately|around) |[~≈] ?)`,
);

export function matchDuration(c: Ctx, pos: number): Hit | null {
  const pm = execAt(RE_DUR_PREFIX, c.f, pos);
  const d = readDuration(c.f, pos + (pm ? pm[0].length : 0));
  if (!d || d.minutes <= 0) return null;
  if (!pm && d.hourish !== undefined && d.hourish > 4) return null;
  const data: Hit['data'] = { k: 'duration', minutes: d.minutes };
  if (!pm && d.hourish !== undefined) data.clock = d.minutes;
  return { type: 'duration', start: pos, end: d.end, data };
}

/* ------------------------------------------------------------------------------------------ */
/* Dates                                                                                       */
/* ------------------------------------------------------------------------------------------ */

interface DateRead {
  end: number;
  spec: DateSpec;
}

const RE_REL_DAY = sticky(`(${alt(RELATIVE_DAYS.keys())})${WE}`);

function readRelativeDay(c: Ctx, pos: number): DateRead | null {
  const m = execAt(RE_REL_DAY, c.f, pos);
  const entry = m && RELATIVE_DAYS.get(m[1] ?? '');
  if (!m || !entry) return null;
  const spec: DateSpec = { cal: addDaysCal(c.today, entry.days), confidence: 1 };
  if (entry.pod) spec.pod = entry.pod;
  return { end: pos + m[0].length, spec };
}

const RE_WEEKDAY = sticky(
  `(?:(ce|cette|this|next|coming|prochain|on|le) )?(${WD})\\.?(?: (prochain|qui vient|next))?${WE}`,
);

function readWeekday(c: Ctx, pos: number): DateRead | null {
  const m = execAt(RE_WEEKDAY, c.f, pos);
  const wd = m ? WEEKDAYS.get(m[2] ?? '') : undefined;
  if (!m || wd === undefined) return null;
  const strict = m[1] === 'next' || m[1] === 'coming' || m[1] === 'prochain' || m[3] !== undefined;
  const spec: DateSpec = { cal: nextWeekday(c.today, wd, strict), confidence: 1 };
  if (!strict && wd === weekdayCal(c.today)) spec.rollWeek = true;
  return { end: pos + m[0].length, spec };
}

const RE_DAY_MONTH = sticky(
  `(?:(le|on|the) )?(?:(${WD}),? )?(?:(le|the) )?(\\d{1,2})(er|st|nd|rd|th)?` +
    `(?: (?:de |of )?(${MONTH})\\.?(?: (\\d{4}))?)?${NE}`,
);

/** "le 12", "12 mars", "mardi 13 octobre 2027", "the 12th", "1er mars". */
function readDayMonth(c: Ctx, pos: number): DateRead | null {
  const m = execAt(RE_DAY_MONTH, c.f, pos);
  if (!m) return null;
  const [, lead, wdName, article, dayStr, suffix, monthName, yearStr] = m;
  const day = Number(dayStr);
  if (suffix === 'er' && day !== 1) return null;
  const french = lead === 'le' || article === 'le';
  const anchored = Boolean(monthName || suffix || wdName || french);
  if (!anchored) return null;
  const cal = resolveDayMonth(c.today, day, monthName ? MONTHS.get(monthName) : undefined, yearStr);
  if (!cal) return null;
  const wd = wdName ? WEEKDAYS.get(wdName) : undefined;
  const confidence = wd !== undefined && weekdayCal(cal) !== wd ? 0.7 : 1;
  return { end: pos + m[0].length, spec: { cal, confidence } };
}

function resolveDayMonth(
  today: CalDate,
  day: number,
  month?: number,
  yearStr?: string,
): CalDate | null {
  if (month === undefined) return nextDayOfMonth(today, day);
  if (yearStr) {
    const y = Number(yearStr);
    return isValidCal(y, month, day) ? { y, m: month, d: day } : null;
  }
  return nextMonthDay(today, month, day);
}

const RE_MONTH_DAY = sticky(
  `(?:on )?(${MONTH})\\.? (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?${NE}`,
);

/** "March 12", "Mar. 12th, 2027". */
function readMonthDay(c: Ctx, pos: number): DateRead | null {
  const m = execAt(RE_MONTH_DAY, c.f, pos);
  const month = m ? MONTHS.get(m[1] ?? '') : undefined;
  if (!m || month === undefined) return null;
  const cal = resolveDayMonth(c.today, Number(m[2]), month, m[3]);
  return cal ? { end: pos + m[0].length, spec: { cal, confidence: 1 } } : null;
}

const RE_NUMERIC = sticky(
  `(?:(?:le|on|the) )?(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}|\\d{2}))?(?![\\p{L}\\p{N}/])`,
);
const RE_ISO = sticky(`(\\d{4})-(\\d{1,2})-(\\d{1,2})${WE}`);

/** "12/03" (d/m in French, m/d in English), "12/03/2027", "2026-10-12". */
function readNumericDate(c: Ctx, pos: number): DateRead | null {
  const iso = execAt(RE_ISO, c.f, pos);
  if (iso) {
    const [y, mo, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    return isValidCal(y, mo, d)
      ? { end: pos + iso[0].length, spec: { cal: { y, m: mo, d }, confidence: 1 } }
      : null;
  }
  const m = execAt(RE_NUMERIC, c.f, pos);
  // "3/4" reads as a fraction: a date needs a two-digit part, a year or a leading article.
  if (!m || (m[1]?.length === 1 && m[2]?.length === 1 && !m[3] && /^\d/u.test(m[0]))) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const [day, month] = c.locale === 'en' ? [b, a] : [a, b];
  if (month < 1 || month > 12) return null;
  const yearStr = m[3] && m[3].length === 2 ? `20${m[3]}` : m[3];
  const cal = resolveDayMonth(c.today, day, month, yearStr);
  if (!cal) return null;
  const ambiguous = !c.localeGiven && a !== b && a <= 12 && b <= 12;
  return { end: pos + m[0].length, spec: { cal, confidence: ambiguous ? 0.85 : 1 } };
}

const RE_PERIOD = sticky(
  `(?:(?:a la|at the|la|le|the|en|ce|cette|this) )?(${alt(PERIODS.keys())})${WE}`,
);

function readPeriod(c: Ctx, pos: number): DateRead | null {
  const m = execAt(RE_PERIOD, c.f, pos);
  const kind = m && PERIODS.get(m[1] ?? '');
  if (!m || !kind) return null;
  return { end: pos + m[0].length, spec: { cal: resolvePeriod(c.today, kind), confidence: 1 } };
}

/**
 * - next week: Monday of the next ISO week; next month: the 1st of next month;
 * - end of week: Friday of the current week (Sunday when today is already the weekend);
 * - end of month: its last day; weekend: the coming Saturday (today on a Sunday).
 */
function resolvePeriod(today: CalDate, kind: PeriodKind): CalDate {
  const wd = weekdayCal(today);
  switch (kind) {
    case 'nextWeek':
      return addDaysCal(mondayOf(today), 7);
    case 'nextMonth':
      return addMonthsCal({ y: today.y, m: today.m, d: 1 }, 1);
    case 'endOfWeek':
      return wd === 6 || wd === 0 ? nextWeekday(today, 0) : nextWeekday(today, 5);
    case 'endOfMonth':
      return lastDayOfMonth(today);
    case 'weekend':
      return wd === 0 ? today : nextWeekday(today, 6);
  }
}

const RE_REL_PREFIX = sticky(`(?:dans|in) `);
const RE_OFFSET = sticky(
  `${NUM} ?(jours?|j|semaines?|sem|mois|ans?|annees?|days?|weeks?|wks?|months?|years?|yrs?)${WE}`,
);
const RE_FROM_NOW = sticky(` (?:from now|plus tard)${WE}`);
const RE_FORTNIGHT = sticky(`(?:a )?fortnight${WE}`);

/** "3 jours", "deux semaines", "a month" — a calendar offset from today. */
function readOffset(c: Ctx, pos: number): DateRead | null {
  const fn = execAt(RE_FORTNIGHT, c.f, pos);
  if (fn) return { end: pos + fn[0].length, spec: { cal: addDaysCal(c.today, 14), confidence: 1 } };
  const m = execAt(RE_OFFSET, c.f, pos);
  if (!m) return null;
  const word = m[1] ?? '';
  const unit = m[2] ?? '';
  const n = parseNumber(word);
  if (n === undefined) return null;
  let cal: CalDate;
  if (unit.startsWith('j') || unit.startsWith('day')) {
    // French idiom: "dans huit jours" is one week, "dans quinze jours" two weeks.
    const days = word === 'huit' ? 7 : word === 'quinze' ? 14 : n;
    cal = addDaysCal(c.today, days);
  } else if (unit.startsWith('s') || unit.startsWith('w')) cal = addDaysCal(c.today, 7 * n);
  else if (unit === 'mois' || unit.startsWith('month')) cal = addMonthsCal(c.today, n);
  else cal = addMonthsCal(c.today, 12 * n);
  return { end: pos + m[0].length, spec: { cal, confidence: 1 } };
}

/** "dans 3 jours", "in 2 weeks", "dans 2h" (an instant), "3 days from now". */
function readRelative(c: Ctx, pos: number): DateRead | null {
  const pm = execAt(RE_REL_PREFIX, c.f, pos);
  if (!pm) {
    const off = readOffset(c, pos);
    const tail = off && execAt(RE_FROM_NOW, c.f, off.end);
    return off && tail ? { end: off.end + tail[0].length, spec: off.spec } : null;
  }
  const p = pos + pm[0].length;
  const off = readOffset(c, p);
  if (off) return off;
  const d = readDuration(c.f, p);
  if (!d || d.minutes <= 0) return null;
  const instant = Math.floor((c.now + d.minutes * MINUTE_MS) / MINUTE_MS) * MINUTE_MS;
  return { end: d.end, spec: { instant, confidence: 1 } };
}

const READERS = [
  readRelativeDay,
  readPeriod,
  readWeekday,
  readDayMonth,
  readMonthDay,
  readNumericDate,
  readRelative,
];

const RE_POD_SUFFIX = sticky(
  `,? (?:(?:au|le|dans la|en|in the|at) )?(${alt(PARTS_OF_DAY.keys())})${WE}`,
);

/** Longest date expression at `pos`, extended by a trailing part of the day ("demain soir"). */
export function readDate(c: Ctx, pos: number, readers = READERS): DateRead | null {
  let best: DateRead | null = null;
  for (const read of readers) {
    const r = read(c, pos);
    if (r && (!best || r.end > best.end)) best = r;
  }
  if (!best || best.spec.pod || best.spec.instant !== undefined) return best;
  const pod = execAt(RE_POD_SUFFIX, c.f, best.end);
  const kind = pod && PARTS_OF_DAY.get(pod[1] ?? '');
  if (pod && kind) return { end: best.end + pod[0].length, spec: { ...best.spec, pod: kind } };
  return best;
}

export function matchDate(c: Ctx, pos: number): Hit | null {
  const r = readDate(c, pos);
  return r ? { type: 'date', start: pos, end: r.end, data: { k: 'date', spec: r.spec } } : null;
}

/* ------------------------------------------------------------------------------------------ */
/* Deadlines                                                                                   */
/* ------------------------------------------------------------------------------------------ */

const RE_DEADLINE = sticky(
  `(${alt([
    'avant',
    "d'ici",
    "d'ici a",
    'au plus tard',
    'a rendre pour',
    'a rendre',
    'pour',
    'due by',
    'due on',
    'due',
    'by',
    'before',
    'no later than',
    'deadline',
    'echeance',
    'within',
  ])}):? `,
);
const RE_DT_GLUE = sticky(`,? (?:(?:a|at|vers|around) )?`);

/** "avant vendredi", "d'ici le 12", "by friday 5pm", "due tomorrow", "avant 18h". */
export function matchDeadline(c: Ctx, pos: number): Hit | null {
  const pm = execAt(RE_DEADLINE, c.f, pos);
  if (!pm) return null;
  const prefix = pm[1] ?? '';
  const p = pos + pm[0].length;
  const exclusive = prefix === 'avant' || prefix === 'before';
  const offsetOk = prefix.startsWith("d'ici") || prefix === 'within';
  const date = readDate(c, p) ?? (offsetOk ? readOffset(c, p) : null);
  if (date) {
    const glue = execAt(RE_DT_GLUE, c.f, date.end);
    const t =
      glue && date.spec.instant === undefined
        ? readForcedTime(c.f, date.end + glue[0].length, /[a-z]/.test(glue[0]))
        : null;
    const data: Hit['data'] = { k: 'deadline', spec: date.spec, exclusive };
    if (t) data.time = t.time;
    return { type: 'deadline', start: pos, end: t ? t.end : date.end, data };
  }
  // A time alone ("avant 18h") is a deadline today; "pour 2h" is a duration instead.
  if (prefix === 'pour' || offsetOk) return null;
  const t = readForcedTime(c.f, p, false);
  return t
    ? { type: 'deadline', start: pos, end: t.end, data: { k: 'deadline', time: t.time, exclusive } }
    : null;
}
