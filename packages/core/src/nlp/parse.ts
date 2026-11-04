/**
 * The capture-line parser: scans the input once, keeps the first hit of each kind and turns them
 * into a task or an event. Designed for every keystroke: one left-to-right pass of sticky regexes
 * tried only at word boundaries, no backtracking-prone patterns.
 */
import type { Minutes, Priority, Timestamp } from '../model.ts';
import { addDaysCal, atTime, calOf, nextWeekday, compareCal, type CalDate } from './calendar.ts';
import { hasMeetingWord, inferMode } from './classify.ts';
import {
  applyPod,
  matchDate,
  matchDeadline,
  matchDuration,
  matchTime,
  matchTimeRange,
} from './datetime.ts';
import {
  matchLocation,
  matchMention,
  matchPriority,
  matchRecurrence,
  matchTag,
} from './entities.ts';
import type { Ctx, DateSpec, Hit, HitData, Matcher, TimeSpec } from './internal.ts';
import { capitalizeFirst, fold, isWordChar, skipWord } from './text.ts';
import type { CaptureKind, ParseContext, ParseResult, ParseToken, PartOfDay } from './types.ts';

const MINUTE_MS = 60_000;
const DEFAULT_EVENT_MIN = 60;

/** Tried at every word boundary; the longest hit wins, ties go to the earlier matcher. */
const MATCHERS: readonly Matcher[] = [
  matchRecurrence,
  matchDeadline,
  matchTimeRange,
  matchDate,
  matchTime,
  matchDuration,
  matchMention,
  matchTag,
  matchPriority,
  matchLocation,
];

const SIGILS = new Set(['@', '#', '!', '~', '≈']);

function scan(c: Ctx): Hit[] {
  const f = c.f;
  const hits: Hit[] = [];
  let i = 0;
  while (i < f.length) {
    const word = isWordChar(f, i);
    if ((word || SIGILS.has(f.charAt(i))) && !isWordChar(f, i - 1)) {
      let best: Hit | null = null;
      for (const match of MATCHERS) {
        const h = match(c, i);
        if (h && h.end > i && (!best || h.end > best.end)) best = h;
      }
      if (best) {
        hits.push(best);
        i = best.end;
        continue;
      }
    }
    i = word ? skipWord(f, i) : i + 1;
  }
  return hits;
}

type DataOf<K extends HitData['k']> = Extract<HitData, { k: K }>;

/** Single-valued kinds keep their first hit; the later ones stay in the title. */
const SINGLE = new Set<HitData['k']>([
  'date',
  'time',
  'duration',
  'deadline',
  'recurrence',
  'location',
]);

/** Joins recurrence phrases that touch ("hebdo tous les lundis") into a single hit. */
function mergeRecurrences(raw: string, hits: Hit[]): Hit[] {
  const out: Hit[] = [];
  for (const h of hits) {
    const prev = out[out.length - 1];
    if (
      prev?.data.k === 'recurrence' &&
      h.data.k === 'recurrence' &&
      /^[\s,]*$/u.test(raw.slice(prev.end, h.start))
    ) {
      const weekdays = [...new Set([...prev.data.weekdays, ...h.data.weekdays])];
      out[out.length - 1] = { ...prev, end: h.end, data: { k: 'recurrence', weekdays } };
    } else out.push(h);
  }
  return out;
}

const LATE_PODS = new Set<PartOfDay>(['afternoon', 'evening', 'night']);

/**
 * "vendredi après-midi 3h": right after a late part of the day, an unprefixed "3h" is the time
 * (15:00), not a three-hour duration.
 */
function clockAfterPod(raw: string, hits: Hit[]): Hit[] {
  if (hits.some((h) => h.data.k === 'time')) return hits;
  const i = hits.findIndex((h) => h.data.k === 'date');
  const date = hits[i];
  const next = hits[i + 1];
  if (!date || !next || date.data.k !== 'date' || next.data.k !== 'duration') return hits;
  const pod = date.data.spec.pod;
  const clock = next.data.clock;
  if (!pod || !LATE_PODS.has(pod) || clock === undefined) return hits;
  if (!/^[\s,]*$/u.test(raw.slice(date.end, next.start))) return hits;
  const time: Hit = {
    ...next,
    type: 'time',
    data: { k: 'time', time: { start: clock, confidence: 0.9 } },
  };
  return hits.map((h) => (h === next ? time : h));
}

function selectHits(hits: Hit[]): Hit[] {
  const seen = new Set<HitData['k']>();
  return hits.filter((h) => {
    if (!SINGLE.has(h.data.k)) return true;
    if (seen.has(h.data.k)) return false;
    seen.add(h.data.k);
    return true;
  });
}

function firstData<K extends HitData['k']>(hits: Hit[], k: K): DataOf<K> | undefined {
  for (const h of hits) if (h.data.k === k) return h.data as DataOf<K>;
  return undefined;
}

/* ------------------------------------------------------------------------------------------ */
/* Title                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/** Separators trimmed from both ends; a single final period (sentence end) goes too, not "…". */
const EDGE_PUNCT = /^[\s,;:.\-–—/|·]+|[\s,;:\-–—/|·]+$|(?<!\.)\.$/gu;
const TRAILING_CONNECTOR =
  /(?:^|[\s,])(?:à|À|a|au|aux|le|la|les|l'|de|du|des|d'|avec|et|ou|pour|chez|at|on|for|with|and|or|the|by|to|from|in)$/u;

/** Input minus the used spans, with whitespace, edge punctuation and dangling words cleaned. */
function tidyTitle(raw: string, hits: Hit[]): string {
  let out = '';
  let last = 0;
  for (const h of hits) {
    out += `${raw.slice(last, h.start)} `;
    last = h.end;
  }
  out += raw.slice(last);
  out = out
    .replace(/\s+/gu, ' ')
    .replace(/\(\s*\)|\[\s*\]/gu, ' ')
    .replace(/ +([,.;:)\]])/gu, '$1')
    .replace(/,(?=[,.;:])/gu, '');
  for (let prev = ''; prev !== out;) {
    prev = out;
    out = out.replace(EDGE_PUNCT, '').replace(TRAILING_CONNECTOR, '');
  }
  return capitalizeFirst(out.replace(/ {2,}/gu, ' ').trim());
}

/* ------------------------------------------------------------------------------------------ */
/* Resolution                                                                                  */
/* ------------------------------------------------------------------------------------------ */

interface Schedule {
  start?: Timestamp;
  end?: Timestamp;
  allDay?: boolean;
  timed: boolean;
}

/** First day (today included) matching one of `weekdays`. */
function firstWeekday(today: CalDate, weekdays: readonly number[]): CalDate | undefined {
  let best: CalDate | undefined;
  for (const wd of weekdays) {
    const cal = nextWeekday(today, wd);
    if (!best || compareCal(cal, best) < 0) best = cal;
  }
  return best;
}

function withPod(
  minutes: Minutes,
  own: PartOfDay | undefined,
  ctx: PartOfDay | undefined,
): Minutes {
  return !own && ctx ? applyPod(minutes, ctx) : minutes;
}

/**
 * Where a time that has already passed today moves to: tomorrow without any date, the next
 * matching weekday for a recurrence, a week later for a bare weekday ("jeudi 9h" on a Thursday
 * at 10:00). An explicit date stays put.
 */
function laterDay(
  day: CalDate,
  date: DateSpec | undefined,
  anchor: CalDate | undefined,
  weekdays: readonly number[],
): CalDate | undefined {
  if (date?.rollWeek) return addDaysCal(day, 7);
  if (date) return undefined;
  if (anchor) return firstWeekday(addDaysCal(day, 1), weekdays);
  return addDaysCal(day, 1);
}

/**
 * Turns the date/time hits into instants. A time without any date is today, or tomorrow when
 * that moment has already passed; a range ending before it starts ends the next day.
 */
function resolveSchedule(
  c: Ctx,
  date: DateSpec | undefined,
  time: TimeSpec | undefined,
  anchor: CalDate | undefined,
  weekdays: readonly number[],
): Schedule {
  if (date?.instant !== undefined) return { start: date.instant, timed: true };
  const cal = date?.cal ?? anchor;
  if (time) {
    const startMin = withPod(time.start, time.pod, date?.pod);
    let day = cal ?? c.today;
    let start = atTime(day, startMin, c.timeZone);
    if (start <= c.now) {
      const later = laterDay(day, date, anchor, weekdays);
      if (later) {
        day = later;
        start = atTime(day, startMin, c.timeZone);
      }
    }
    if (time.end === undefined) return { start, timed: true };
    const endMin = withPod(time.end, time.pod, date?.pod);
    const endDay = endMin > startMin ? day : addDaysCal(day, 1);
    return { start, end: atTime(endDay, endMin, c.timeZone), timed: true };
  }
  if (!cal) return { timed: false };
  return { start: atTime(cal, 0, c.timeZone), allDay: true, timed: false };
}

/** Deadline instant. "avant/before <day>" is exclusive (midnight starting it); others end it. */
function resolveDeadline(c: Ctx, d: DataOf<'deadline'>): Timestamp {
  if (d.spec?.instant !== undefined) return d.spec.instant;
  const day = d.spec?.cal ?? c.today;
  if (d.time) {
    const minutes = withPod(d.time.start, d.time.pod, d.spec?.pod);
    const ts = atTime(day, minutes, c.timeZone);
    return !d.spec && ts <= c.now ? atTime(addDaysCal(day, 1), minutes, c.timeZone) : ts;
  }
  return atTime(d.exclusive ? day : addDaysCal(day, 1), 0, c.timeZone);
}

function tokenValue(
  h: Hit,
  raw: string,
  values: { date?: Timestamp; deadline?: Timestamp },
): ParseToken['value'] {
  const d = h.data;
  switch (d.k) {
    case 'date':
      return values.date;
    case 'time':
      return d.time.start;
    case 'duration':
      return d.minutes;
    case 'deadline':
      return values.deadline;
    case 'recurrence':
      return raw.slice(h.start, h.end);
    case 'priority':
      return d.level;
    default:
      return d.name;
  }
}

function makeContext(input: string, ctx: ParseContext): Ctx {
  return {
    raw: input,
    f: fold(input),
    now: ctx.now,
    timeZone: ctx.timeZone,
    today: calOf(ctx.now, ctx.timeZone),
    locale: ctx.locale ?? 'fr',
    localeGiven: ctx.locale !== undefined,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Parses one capture line ("Réunion projet X mardi prochain 14h-16h avec @paul").
 * Pure and deterministic: everything relative is resolved against `ctx.now` in `ctx.timeZone`.
 */
export function parse(input: string, ctx: ParseContext): ParseResult {
  const c = makeContext(input, ctx);
  let hits = selectHits(clockAfterPod(input, mergeRecurrences(input, scan(c))));

  const date = firstData(hits, 'date')?.spec;
  const time = firstData(hits, 'time')?.time;
  const duration = firstData(hits, 'duration')?.minutes;
  const deadlineHit = firstData(hits, 'deadline');
  const recurrenceHit = hits.find((h) => h.data.k === 'recurrence');
  let location = firstData(hits, 'location');
  const attendees: string[] = [];
  const tags: string[] = [];
  let priority: Priority | undefined;
  for (const h of hits) {
    const d = h.data;
    if (d.k === 'attendee' && !attendees.includes(d.name)) attendees.push(d.name);
    else if (d.k === 'tag' && !tags.includes(d.name)) tags.push(d.name);
    else if (d.k === 'priority' && (priority === undefined || d.level > priority))
      priority = d.level;
  }

  const weekdays = recurrenceHit?.data.k === 'recurrence' ? recurrenceHit.data.weekdays : [];
  const anchor = date ? undefined : firstWeekday(c.today, weekdays);
  const schedule = resolveSchedule(c, date, time, anchor, weekdays);
  const deadline = deadlineHit ? resolveDeadline(c, deadlineHit) : undefined;

  let title = tidyTitle(input, hits);
  const mode = inferMode(title);
  if (mode && location?.weak) {
    // "Répondre à Jean": after an action verb, "à <Name>" is the person, not a place.
    hits = hits.filter((h) => h.data.k !== 'location');
    location = undefined;
    title = tidyTitle(input, hits);
  }
  const meeting = hasMeetingWord(c.f);
  const kind: CaptureKind =
    schedule.timed || meeting || (attendees.length > 0 && !mode) ? 'event' : 'task';

  const result: ParseResult = { kind, title, attendees, tags, tokens: [], confidence: 1 };
  if (schedule.start !== undefined) result.start = schedule.start;
  if (schedule.allDay) result.allDay = true;
  const pod = date?.pod ?? time?.pod;
  if (pod) result.partOfDay = pod;
  if (kind === 'event') applyEventSpan(result, schedule, duration, ctx.defaultEventMin, c);
  else if (duration !== undefined) result.estimateMin = duration;
  if (priority !== undefined) result.priority = priority;
  if (deadline !== undefined) result.deadline = deadline;
  if (recurrenceHit) result.recurrence = input.slice(recurrenceHit.start, recurrenceHit.end);
  if (location) result.location = location.name;
  if (mode) result.mode = mode;

  const values: { date?: Timestamp; deadline?: Timestamp } = {};
  if (date) values.date = date.instant ?? (date.cal && atTime(date.cal, 0, c.timeZone));
  if (deadline !== undefined) values.deadline = deadline;
  result.tokens = hits.map((h) => {
    const token: ParseToken = {
      type: h.type,
      start: h.start,
      end: h.end,
      text: input.slice(h.start, h.end),
    };
    const value = tokenValue(h, input, values);
    if (value !== undefined) token.value = value;
    return token;
  });

  let confidence = (date?.confidence ?? 1) * (time?.confidence ?? 1) * (location?.confidence ?? 1);
  confidence *= deadlineHit?.spec?.confidence ?? 1;
  confidence *= deadlineHit?.time?.confidence ?? 1;
  if (!title) confidence *= 0.5;
  result.confidence = round2(confidence);
  return result;
}

/** End and length of an event: explicit end, else duration, else the default length. */
function applyEventSpan(
  result: ParseResult,
  schedule: Schedule,
  duration: Minutes | undefined,
  defaultMin: Minutes | undefined,
  c: Ctx,
): void {
  if (schedule.start === undefined) {
    if (duration !== undefined) result.durationMin = duration;
    return;
  }
  if (schedule.allDay) {
    result.end = atTime(addDaysCal(calOf(schedule.start, c.timeZone), 1), 0, c.timeZone);
    return;
  }
  const end =
    schedule.end ?? schedule.start + (duration ?? defaultMin ?? DEFAULT_EVENT_MIN) * MINUTE_MS;
  result.end = end;
  result.durationMin = Math.round((end - schedule.start) / MINUTE_MS);
}
