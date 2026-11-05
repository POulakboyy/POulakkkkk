/**
 * Helpers for dictated captures (2.7): clean a speech-to-text transcript, then split it into
 * actionable items that can each go through `parse`.
 */
import type { Locale } from '../model.ts';
import { FILLERS_EN, FILLERS_FR, LEGIT_REPEATS, alt } from './lexicon.ts';
import { capitalizeFirst } from './text.ts';

const W = "[\\p{L}\\p{N}'’]";
const NOT_W_BEFORE = `(?<!${W})`;
const NOT_W_AFTER = `(?!${W})`;
/** Elongated hesitation sounds: "euhhh", "heuu", "hummm", "hmmm", "uhh", "umm". */
const SHAPES = 'e+u+h+|h+e+u+h*|h+u+m+|h+m+|u+h+|u+m+';
/** Fillers that are also real words when capitalised ("Ben" the name): matched in lower case only. */
const CASE_SENSITIVE = new Set(['ben', 'bah']);

const fillerCache = new Map<string, RegExp[]>();

function fillerPatterns(locale: Locale | undefined): RegExp[] {
  const key = locale ?? 'both';
  const cached = fillerCache.get(key);
  if (cached) return cached;
  const words = new Set<string>();
  if (locale !== 'en') for (const w of FILLERS_FR) words.add(w);
  if (locale !== 'fr') for (const w of FILLERS_EN) words.add(w);
  const insensitive = [...words].filter((w) => !CASE_SENSITIVE.has(w));
  const sensitive = [...words].filter((w) => CASE_SENSITIVE.has(w));
  const shapes = locale === 'fr' ? SHAPES : `${SHAPES}|e+r+m+`;
  const tail = `${NOT_W_AFTER}[ \\t]*,?[ \\t]*`;
  const out = [new RegExp(`${NOT_W_BEFORE}(?:${shapes}|${alt(insensitive)})${tail}`, 'giu')];
  if (sensitive.length) out.push(new RegExp(`${NOT_W_BEFORE}(?:${alt(sensitive)})${tail}`, 'gu'));
  fillerCache.set(key, out);
  return out;
}

const RE_STUTTER_1 = new RegExp(
  `${NOT_W_BEFORE}(${W}+)(?:[ \\t]*,?[ \\t]+\\1)+${NOT_W_AFTER}`,
  'giu',
);
const RE_STUTTER_2 = new RegExp(
  `${NOT_W_BEFORE}(${W}+[ \\t]+${W}+)(?:[ \\t]*,?[ \\t]+\\1)+${NOT_W_AFTER}`,
  'giu',
);

function dropStutters(text: string): string {
  return text
    .replace(RE_STUTTER_2, '$1')
    .replace(RE_STUTTER_1, (all: string, word: string) =>
      LEGIT_REPEATS.has(word.toLowerCase()) ? all : word,
    );
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]+/gu, ' ')
    .replace(/ ([,.;:])/gu, '$1')
    .replace(/,(?=\s*[,.;:!?])/gu, '')
    .replace(/^[\s,;:]+|[\s,;:]+$/gu, '')
    .replace(/(^|[.!?]\s+|\n\s*)[,;:]\s*/gu, '$1');
}

/**
 * Removes hesitation fillers ("euh", "hum", "bah", "um", "uh", "er"…) and stuttered repeats
 * ("je je veux" → "je veux", "il faut il faut" → "il faut"), keeping grammatical doubles such as
 * "nous nous". `locale` picks the filler list; both are used when it is omitted.
 */
export function cleanTranscript(text: string, locale?: Locale): string {
  let out = text;
  for (const re of fillerPatterns(locale)) out = out.replace(re, '');
  return capitalizeFirst(tidy(dropStutters(out)));
}

const SEQUENCERS = [
  'et puis',
  'et ensuite',
  'puis',
  'ensuite',
  'and then',
  'then',
  'after that',
  'après ça',
  'après cela',
];
const ADDITIVES = ['aussi', 'also', 'enfin', 'finally'];
const RE_SPLIT = new RegExp(
  [
    '[.!?;]+(?=\\s|$)',
    '\\n+',
    '^\\s*[-*•]\\s+',
    `(?:,\\s*|\\s+)(?:${alt(SEQUENCERS)})${NOT_W_AFTER}`,
    `(?:,\\s*|\\s+(?:et|and)\\s+)(?:et\\s+|and\\s+)?(?:${alt(ADDITIVES)})${NOT_W_AFTER}`,
    '\\s+[-*•]\\s+',
  ].join('|'),
  'gimu',
);

const RE_LEAD_IN = new RegExp(
  `^(?:(?:et|and|so|alors|donc|bon|ok|okay|d'abord|first|premièrement|deuxièmement|troisièmement|aussi|also)${NOT_W_AFTER}[\\s,]*)*` +
    `(?:${alt([
      'il faut aussi que je ',
      "il faut aussi que j'",
      'il faut que je ',
      "il faut que j'",
      'il faut aussi ',
      'il faut ',
      'il faudrait que je ',
      "il faudrait que j'",
      'il faudrait ',
      'faut que je ',
      "faut que j'",
      'je dois aussi ',
      'je dois ',
      'je devrais ',
      'je vais ',
      "n'oublie pas de ",
      "n'oublie pas d'",
      'ne pas oublier de ',
      'penser à ',
      'pense à ',
      'rappelle-moi de ',
      'rappelle moi de ',
      'i need to ',
      'i have to ',
      "i've got to ",
      'i should ',
      'i must ',
      "i'll ",
      'i will ',
      'need to ',
      'have to ',
      'remember to ',
      "don't forget to ",
      'dont forget to ',
      'remind me to ',
      'gotta ',
    ])})?`,
  'iu',
);

/** Removes a dictation lead-in ("il faut que je", "I need to") and edge punctuation. */
function toAction(piece: string): string {
  const stripped = piece
    .trim()
    .replace(/’/gu, "'")
    .replace(RE_LEAD_IN, '')
    .replace(/^[\s,;:]+|[\s,;:.!?]+$/gu, '');
  return capitalizeFirst(stripped);
}

/**
 * Splits a dictation into actionable items: on sentence ends, new lines, bullets and sequencing
 * words ("puis", "ensuite", "and then", ", et aussi"…). A plain "et"/"and" never splits, since it
 * usually joins objects ("du pain et du lait").
 */
export function splitActions(text: string, locale?: Locale): string[] {
  const cleaned = cleanTranscript(text, locale);
  return cleaned
    .split(RE_SPLIT)
    .map((p) => toAction(p))
    .filter((p) => /\p{L}/u.test(p));
}
