/** Matchers for recurrence phrases, @mentions, #tags, priority markers and locations. */
import type { Priority } from '../model.ts';
import type { Ctx, Hit } from './internal.ts';
import { STOP_WORDS, WEEKDAYS, alt } from './lexicon.ts';
import { execAt, isUpper, isWordChar, sticky, WE } from './text.ts';

/* ------------------------------------------------------------------------------------------ */
/* Recurrence                                                                                  */
/* ------------------------------------------------------------------------------------------ */

const WD = alt(WEEKDAYS.keys());
const WD_S = `(?:${WD})s`;
const WD_OPT_S = `(?:${WD})s?`;
const N = '(?:\\d{1,2}|deux|trois|quatre|cinq|six|two|three|four|five|six)';

const RECURRENCE = [
  `(?:tous|toutes) les (?:${N} )?(?:jours ouvres|jours|semaines|mois|ans|annees|matins|soirs|week-?ends|${WD_S})` +
    `(?:(?:,| et) (?:les )?${WD_S})*`,
  `chaque (?:jour|semaine|mois|annee|an|matin|soir|week-?end|${WD})(?:(?:,| et) ${WD})*`,
  `(?:un|une) (?:jour|semaine|mois) sur (?:deux|trois|2|3)`,
  `le (?:1er|\\d{1,2}) (?:de chaque mois|du mois)`,
  `the \\d{1,2}(?:st|nd|rd|th) of (?:each|every) month`,
  `du (?:${WD}) au (?:${WD})`,
  `from (?:${WD}) to (?:${WD})`,
  `(?:every|each) (?:other |${N} )?(?:weekdays?|weekends?|days?|weeks?|months?|years?|mornings?|evenings?|nights?|${WD_OPT_S})` +
    `(?:(?:,|,? and) ${WD_OPT_S})*`,
  `on ${WD_S}(?:(?:,|,? and) ${WD_S})*`,
  'quotidiennement|quotidienne|quotidien|hebdomadaire|hebdo|daily|weekly|biweekly|fortnightly|monthly|yearly|annually',
];
const RE_RECURRENCE = sticky(`(?:${RECURRENCE.join('|')})${WE}`);
const RE_WEEKDAY_GLOBAL = new RegExp(`(?<![\\p{L}])(${WD})s?(?![\\p{L}])`, 'gu');
const RE_RANGE_WD = /^(?:du|from) (\S+) (?:au|to) (\S+)$/u;

/** Weekdays named in a recurrence phrase; "du lundi au vendredi" expands to the whole range. */
function recurrenceWeekdays(phrase: string): number[] {
  const range = RE_RANGE_WD.exec(phrase);
  if (range) {
    const from = WEEKDAYS.get(range[1] ?? '');
    const to = WEEKDAYS.get(range[2] ?? '');
    if (from === undefined || to === undefined) return [];
    const out: number[] = [];
    for (let d = from; out.length < 7; d = (d + 1) % 7) {
      out.push(d);
      if (d === to) break;
    }
    return out;
  }
  if (/jours ouvres|weekdays?(?![\p{L}])/u.test(phrase)) return [1, 2, 3, 4, 5];
  const out: number[] = [];
  for (const m of phrase.matchAll(RE_WEEKDAY_GLOBAL)) {
    const d = WEEKDAYS.get(m[1] ?? '');
    if (d !== undefined && !out.includes(d)) out.push(d);
  }
  return out;
}

export function matchRecurrence(c: Ctx, pos: number): Hit | null {
  const m = execAt(RE_RECURRENCE, c.f, pos);
  if (!m) return null;
  const end = pos + m[0].length;
  return {
    type: 'recurrence',
    start: pos,
    end,
    data: { k: 'recurrence', weekdays: recurrenceWeekdays(m[0]) },
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Mentions, tags, priority                                                                    */
/* ------------------------------------------------------------------------------------------ */

const RE_MENTION = sticky(`(?:(?:avec|with|et|and|&) )?@([\\p{L}\\p{N}_][\\p{L}\\p{N}_.\\-]*)`);
const RE_TAG = sticky(`#(\\p{L}[\\p{L}\\p{N}_\\-/]*)`);

/** Strips punctuation that ends a sentence rather than the name ("@paul." → "paul"). */
function trimName(name: string): string {
  return name.replace(/[.\-/]+$/u, '');
}

/** "@paul", "avec @paul" — the joiner is part of the token so the title loses it too. */
export function matchMention(c: Ctx, pos: number): Hit | null {
  const m = execAt(RE_MENTION, c.f, pos);
  if (!m || !m[1]) return null;
  const nameStart = pos + m[0].length - m[1].length;
  const name = trimName(c.raw.slice(nameStart, pos + m[0].length));
  if (!name) return null;
  const end = nameStart + name.length;
  return { type: 'attendee', start: pos, end, data: { k: 'attendee', name } };
}

export function matchTag(c: Ctx, pos: number): Hit | null {
  const m = execAt(RE_TAG, c.f, pos);
  if (!m || !m[1]) return null;
  const name = trimName(c.raw.slice(pos + 1, pos + m[0].length));
  return { type: 'tag', start: pos, end: pos + 1 + name.length, data: { k: 'tag', name } };
}

const RE_BANGS = sticky(`(!{1,3})(?![!\\p{L}\\p{N}])`);
const RE_P_LEVEL = sticky(`p([123])${WE}`);
const PRIORITY_WORDS: ReadonlyMap<string, Priority> = new Map([
  ['urgent', 3],
  ['urgente', 3],
  ['urgemment', 3],
  ['asap', 3],
  ['tres important', 3],
  ['tres importante', 3],
  ['top priorite', 3],
  ['priorite haute', 3],
  ['haute priorite', 3],
  ['high priority', 3],
  ['top priority', 3],
  ['prioritaire', 2],
  ['priorite moyenne', 2],
  ['medium priority', 2],
  ['priorite basse', 1],
  ['basse priorite', 1],
  ['low priority', 1],
]);
const RE_PRIORITY_WORD = sticky(`(${alt(PRIORITY_WORDS.keys())})${WE}`);
const RE_IMPORTANT = sticky(`(importante?|important)${WE}`);

/**
 * "!" / "!!" / "!!!", Todoist-style "p1" (highest) … "p3", and priority words. The plain
 * adjective "important(e)" only counts as the first or last word of the input, since mid-sentence
 * it usually qualifies a noun ("le document important").
 */
export function matchPriority(c: Ctx, pos: number): Hit | null {
  const hit = (end: number, level: Priority): Hit => ({
    type: 'priority',
    start: pos,
    end,
    data: { k: 'priority', level },
  });
  let m = execAt(RE_BANGS, c.f, pos);
  if (m) return hit(pos + m[0].length, (m[1] ?? '').length as Priority);
  m = execAt(RE_P_LEVEL, c.f, pos);
  if (m) return hit(pos + m[0].length, (4 - Number(m[1])) as Priority);
  m = execAt(RE_PRIORITY_WORD, c.f, pos);
  const level = m && PRIORITY_WORDS.get(m[1] ?? '');
  if (m && level) return hit(pos + m[0].length, level);
  m = execAt(RE_IMPORTANT, c.f, pos);
  if (m) {
    const end = pos + m[0].length;
    const atEdge =
      /^[\s,;:.!-]*$/u.test(c.f.slice(0, pos)) || /^[\s,;:.!-]*$/u.test(c.f.slice(end));
    if (atEdge) return hit(end, 2);
  }
  return null;
}

/* ------------------------------------------------------------------------------------------ */
/* Locations                                                                                   */
/* ------------------------------------------------------------------------------------------ */

const CONNECTORS: ReadonlySet<string> = new Set([
  'de',
  'du',
  'des',
  'la',
  'le',
  'les',
  'of',
  'the',
]);
const ARTICLES: ReadonlySet<string> = new Set([
  'le',
  'la',
  'les',
  'mon',
  'ma',
  'mes',
  'ton',
  'ta',
  'son',
  'sa',
  'nos',
  'the',
  'my',
]);
const MAX_LOCATION_WORDS = 5;

/** End of the word at `i`, keeping inner apostrophes and hyphens ("l'Opéra", "Saint-Michel"). */
function wordEnd(s: string, i: number): number {
  let j = i;
  while (isWordChar(s, j) || ((s[j] === "'" || s[j] === '-') && isWordChar(s, j + 1) && j > i)) j++;
  return j;
}

/** Splits the text after `from` into consecutive single-space separated words. */
function* wordsFrom(s: string, from: number): Generator<{ start: number; end: number }> {
  let i = from;
  for (let n = 0; n < MAX_LOCATION_WORDS + 2; n++) {
    if (!isWordChar(s, i)) return;
    const end = wordEnd(s, i);
    yield { start: i, end };
    if (s[end] !== ' ') return;
    i = end + 1;
  }
}

/** Capitalised words, possibly linked by connectors ("Café de Flore"), stopping at keywords. */
function capitalisedRun(c: Ctx, from: number): number {
  let end = -1;
  let pendingConnector = false;
  let count = 0;
  for (const w of wordsFrom(c.f, from)) {
    const fw = c.f.slice(w.start, w.end);
    const elided = /^[ld]'/u.test(fw);
    const capital = isUpper(c.raw, elided ? w.start + 2 : w.start);
    if (capital && !STOP_WORDS.has(fw) && !/^\d/u.test(fw)) {
      end = w.end;
      pendingConnector = false;
      if (++count >= MAX_LOCATION_WORDS) break;
    } else if (end > 0 && !pendingConnector && CONNECTORS.has(fw)) {
      pendingConnector = true;
    } else break;
  }
  return end;
}

/** "chez Marie", "chez le dentiste": an optional article then one word, then capitalised words. */
function chezRun(c: Ctx, from: number): number {
  let end = -1;
  let content = 0;
  let article = false;
  for (const w of wordsFrom(c.f, from)) {
    const fw = c.f.slice(w.start, w.end);
    if (STOP_WORDS.has(fw) || /^\d/u.test(fw)) break;
    if (content === 0 && !article && (ARTICLES.has(fw) || /^l'/u.test(fw))) {
      article = true;
      if (/^l'./u.test(fw)) {
        end = w.end;
        content++;
      }
      continue;
    }
    if (content > 0 && !isUpper(c.raw, w.start)) break;
    end = w.end;
    if (++content >= MAX_LOCATION_WORDS) break;
  }
  return end;
}

/**
 * Conservative location detection: "chez …", or "à/au/aux/at" followed by capitalised words
 * ("à Lyon", "au Café de Flore", "at Starbucks"). Lower-case "a" (English article) never counts.
 */
export function matchLocation(c: Ctx, pos: number): Hit | null {
  const f = c.f;
  let from: number;
  let end: number;
  const weak = !f.startsWith('chez ', pos);
  if (!weak) {
    from = pos + 5;
    end = chezRun(c, from);
  } else {
    const ch = c.raw[pos];
    if ((ch === 'à' || ch === 'À') && f[pos + 1] === ' ') from = pos + 2;
    else if (f.startsWith('aux ', pos)) from = pos + 4;
    else if (f.startsWith('au ', pos) || f.startsWith('at ', pos)) from = pos + 3;
    else return null;
    end = capitalisedRun(c, from);
  }
  if (end <= from) return null;
  const name = c.raw.slice(from, end);
  return {
    type: 'location',
    start: pos,
    end,
    data: { k: 'location', name, confidence: 0.9, weak },
  };
}
