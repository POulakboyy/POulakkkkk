/**
 * French + English vocabulary used by the matchers. Every key is in *folded* form (lower case,
 * no diacritics, straight apostrophes, `-` for every dash) so it can be matched against
 * `fold(input)` directly.
 */
import type { PartOfDay } from './types.ts';

/** 0 = Sunday … 6 = Saturday. Only unambiguous abbreviations are listed. */
export const WEEKDAYS: ReadonlyMap<string, number> = new Map([
  ['dimanche', 0],
  ['lundi', 1],
  ['mardi', 2],
  ['mercredi', 3],
  ['jeudi', 4],
  ['vendredi', 5],
  ['samedi', 6],
  ['sunday', 0],
  ['monday', 1],
  ['tuesday', 2],
  ['wednesday', 3],
  ['thursday', 4],
  ['friday', 5],
  ['saturday', 6],
  ['mon', 1],
  ['tue', 2],
  ['tues', 2],
  ['thu', 4],
  ['thur', 4],
  ['thurs', 4],
  ['fri', 5],
]);

/** Month names and abbreviations (1–12). `mar` is left out: it collides with `mardi`. */
export const MONTHS: ReadonlyMap<string, number> = new Map([
  ['janvier', 1],
  ['janv', 1],
  ['fevrier', 2],
  ['fevr', 2],
  ['fev', 2],
  ['mars', 3],
  ['avril', 4],
  ['avr', 4],
  ['mai', 5],
  ['juin', 6],
  ['juillet', 7],
  ['juil', 7],
  ['aout', 8],
  ['septembre', 9],
  ['sept', 9],
  ['octobre', 10],
  ['oct', 10],
  ['novembre', 11],
  ['nov', 11],
  ['decembre', 12],
  ['dec', 12],
  ['january', 1],
  ['jan', 1],
  ['february', 2],
  ['feb', 2],
  ['march', 3],
  ['april', 4],
  ['apr', 4],
  ['may', 5],
  ['june', 6],
  ['jun', 6],
  ['july', 7],
  ['jul', 7],
  ['august', 8],
  ['aug', 8],
  ['september', 9],
  ['sep', 9],
  ['october', 10],
  ['november', 11],
  ['december', 12],
]);

/** Small cardinal numbers written as words. */
export const NUMBER_WORDS: ReadonlyMap<string, number> = new Map([
  ['un', 1],
  ['une', 1],
  ['deux', 2],
  ['trois', 3],
  ['quatre', 4],
  ['cinq', 5],
  ['six', 6],
  ['sept', 7],
  ['huit', 8],
  ['neuf', 9],
  ['dix', 10],
  ['onze', 11],
  ['douze', 12],
  ['quinze', 15],
  ['vingt', 20],
  ['trente', 30],
  ['a', 1],
  ['an', 1],
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
  ['fifteen', 15],
  ['twenty', 20],
  ['thirty', 30],
]);

/** Day-relative words: offset in days from today, plus an optional part of the day. */
export const RELATIVE_DAYS: ReadonlyMap<string, { days: number; pod?: PartOfDay }> = new Map([
  ["aujourd'hui", { days: 0 }],
  ['aujourdhui', { days: 0 }],
  ['auj', { days: 0 }],
  ['today', { days: 0 }],
  ['demain', { days: 1 }],
  ['tomorrow', { days: 1 }],
  ['tmrw', { days: 1 }],
  ['apres-demain', { days: 2 }],
  ['apres demain', { days: 2 }],
  ['the day after tomorrow', { days: 2 }],
  ['day after tomorrow', { days: 2 }],
  ['overmorrow', { days: 2 }],
  ['ce matin', { days: 0, pod: 'morning' }],
  ['ce midi', { days: 0, pod: 'midday' }],
  ['cet apres-midi', { days: 0, pod: 'afternoon' }],
  ['cet apres midi', { days: 0, pod: 'afternoon' }],
  ['cet aprem', { days: 0, pod: 'afternoon' }],
  ['ce soir', { days: 0, pod: 'evening' }],
  ['cette nuit', { days: 0, pod: 'night' }],
  ['tonight', { days: 0, pod: 'evening' }],
  ['this morning', { days: 0, pod: 'morning' }],
  ['this afternoon', { days: 0, pod: 'afternoon' }],
  ['this evening', { days: 0, pod: 'evening' }],
]);

/** Parts of the day that may follow a date ("demain soir", "friday morning"). */
export const PARTS_OF_DAY: ReadonlyMap<string, PartOfDay> = new Map([
  ['matin', 'morning'],
  ['apres-midi', 'afternoon'],
  ['apres midi', 'afternoon'],
  ['aprem', 'afternoon'],
  ['soir', 'evening'],
  ['soiree', 'evening'],
  ['nuit', 'night'],
  ['morning', 'morning'],
  ['afternoon', 'afternoon'],
  ['evening', 'evening'],
  ['night', 'night'],
]);

export type PeriodKind = 'nextWeek' | 'nextMonth' | 'endOfWeek' | 'endOfMonth' | 'weekend';

/** Week/month-level expressions. Leading articles are matched separately. */
export const PERIODS: ReadonlyMap<string, PeriodKind> = new Map([
  ['semaine prochaine', 'nextWeek'],
  ['next week', 'nextWeek'],
  ['mois prochain', 'nextMonth'],
  ['next month', 'nextMonth'],
  ['fin de semaine', 'endOfWeek'],
  ['fin de la semaine', 'endOfWeek'],
  ['end of the week', 'endOfWeek'],
  ['end of week', 'endOfWeek'],
  ['end of this week', 'endOfWeek'],
  ['fin du mois', 'endOfMonth'],
  ['fin de mois', 'endOfMonth'],
  ['end of the month', 'endOfMonth'],
  ['end of month', 'endOfMonth'],
  ['end of this month', 'endOfMonth'],
  ['week-end', 'weekend'],
  ['weekend', 'weekend'],
]);

/** Words that make a capture an event even without a time. Matched as whole words. */
export const MEETING_WORDS: readonly string[] = [
  'reunion',
  'rdv',
  'rendez-vous',
  'rendez vous',
  'visio',
  'visioconference',
  'appel',
  'entretien',
  'conference',
  'seminaire',
  'point avec',
  'dejeuner avec',
  'diner avec',
  'petit-dejeuner avec',
  'cafe avec',
  'apero avec',
  'verre avec',
  'call',
  'meeting',
  'meet',
  'workshop',
  'standup',
  'stand-up',
  'interview',
  'appointment',
  'sync',
  'one-on-one',
  'catch-up',
  'catch up',
  'lunch with',
  'dinner with',
  'breakfast with',
  'coffee with',
  'drinks with',
];

/** Word prefixes (≥ 4 letters) that mark creative work. */
export const CREATE_PREFIXES: readonly string[] = [
  'ecri',
  'redig',
  'dessin',
  'compos',
  'tourner',
  'tournage',
  'film',
  'peind',
  'peint',
  'illustr',
  'esquiss',
  'brainstorm',
  'imagin',
  'concevoir',
  'concoi',
  'conception',
  'creer',
  'cree',
  'creation',
  'design',
  'maquett',
  'prototyp',
  'photograph',
  'writ',
  'draft',
  'draw',
  'shoot',
  'paint',
  'sketch',
  'creat',
  'ideat',
  'invent',
];

/** Word prefixes that mark organisational/execution work. */
export const ORGANIZE_PREFIXES: readonly string[] = [
  'payer',
  'paye',
  'paie',
  'regler',
  'repond',
  'repons',
  'trier',
  'organis',
  'organiz',
  'factur',
  'invoic',
  'ranger',
  'classer',
  'relanc',
  'reserv',
  'command',
  'nettoy',
  'declar',
  'rempli',
  'archiv',
  'planifi',
  'envoy',
  'renouvel',
  'appeler',
  'appelle',
  'pay',
  'reply',
  'answer',
  'send',
  'book',
  'schedul',
  'clean',
  'tidy',
  'email',
  'renew',
  'fill',
];

/** Exact words for short or ambiguous organisational verbs. */
export const ORGANIZE_WORDS: ReadonlySet<string> = new Set([
  'tri',
  'trie',
  'range',
  'sort',
  'order',
  'file',
  'mail',
]);

/** Vocal fillers removed from transcripts. Shapes like "euhhh" are handled by a pattern. */
export const FILLERS_FR: ReadonlySet<string> = new Set(['euh', 'heu', 'hum', 'hmm', 'bah', 'ben']);
export const FILLERS_EN: ReadonlySet<string> = new Set([
  'um',
  'umm',
  'uh',
  'uhh',
  'er',
  'erm',
  'hmm',
  'hum',
]);

/** Doubled words that are grammatical and must survive stutter removal. */
export const LEGIT_REPEATS: ReadonlySet<string> = new Set(['nous', 'vous', 'had', 'that']);

/** Escapes regex metacharacters. */
export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex alternation of `words`, longest first so a longer key always wins. */
export function alt(words: Iterable<string>): string {
  return [...words]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|');
}

/** Parses a number written in digits or as a small number word. */
export function parseNumber(s: string): number | undefined {
  if (/^\d+$/.test(s)) return Number(s);
  return NUMBER_WORDS.get(s);
}

/** Folded words that must never be swallowed into a location or a title connector. */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  ...WEEKDAYS.keys(),
  ...MONTHS.keys(),
  ...PARTS_OF_DAY.keys(),
  'aujourd',
  'aujourdhui',
  'demain',
  'today',
  'tomorrow',
  'tonight',
  'midi',
  'minuit',
  'noon',
  'midnight',
  'ce',
  'cet',
  'cette',
  'this',
  'next',
  'prochain',
  'prochaine',
  'semaine',
  'week',
  'avec',
  'with',
  'pour',
  'for',
  'et',
  'and',
  'dans',
  'in',
  'at',
  'on',
  'a',
  'au',
  'avant',
  'before',
  'by',
  'due',
  'de',
  'from',
  'to',
  'tous',
  'toutes',
  'chaque',
  'every',
  'each',
  'pendant',
  'during',
  'vers',
  'around',
]);
