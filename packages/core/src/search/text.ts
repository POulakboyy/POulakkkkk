/**
 * Text analysis shared by the lexical index, highlighting and backlinks: Unicode folding,
 * FR/EN tokenisation with stop words, and a light, language-neutral stemmer.
 *
 * Notes are routinely bilingual, so the analyser does not try to detect a language: the same
 * conservative rules run on every token. What matters for retrieval is that a query and a
 * document go through exactly the same pipeline; light stemming keeps over-conflation rare.
 */

/** Characters `NFD` does not decompose but users expect to fold. */
const LIGATURES: Record<string, string> = {
  œ: 'oe',
  æ: 'ae',
  ß: 'ss',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ı: 'i',
  ﬁ: 'fi',
  ﬂ: 'fl',
};
const LIGATURE_RE = /[œæßøłđıﬁﬂ]/g;
const MARKS_RE = /\p{M}+/gu;

/**
 * Lower-cases and strips diacritics (`Écrire l'Œuvre` → `ecrire l'oeuvre`). Lower-casing
 * happens first so that e.g. Turkish `İ` decomposes to `i` + a removable mark.
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(MARKS_RE, '')
    .replace(LIGATURE_RE, (c) => LIGATURES[c] ?? c);
}

/** Folded, whitespace-collapsed form used to compare titles (`[[Title]]` resolution). */
export function normalizeTitle(text: string): string {
  return fold(text).replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------------------------------ */
/* Stop words (folded forms)                                                                   */
/* ------------------------------------------------------------------------------------------ */

const FRENCH_STOPWORDS = [
  'au aux avec ce ceci cela ces cet cette ca chez comme dans de des du donc dont elle elles',
  'en entre et eux il ils je la le les leur leurs lui ma mais me meme mes moi mon ne ni nos',
  'notre nous on ou par pas pour qu que quel quelle quels quelles qui quoi sa sans se ses',
  'si son sont sur ta te tes toi ton tu un une vos votre vous etre ai as avons avez ont',
  'suis es est sommes etes etait aussi alors car lors puis tout tous toute toutes tres',
  'deja ici jusqu lorsqu puisqu quoiqu aujourd hui ceux celle celles celui sous vers peu',
  'fait ainsi',
]
  .join(' ')
  .split(' ');

const ENGLISH_STOPWORDS = [
  'about above after again against all am and any are as at be because been before being',
  'below between both but by can could did do does doing don down during each few for from',
  'further had has have having he her here hers him his how if in into is it its itself',
  'just me more most my no nor not now of off on once only or other our ours out over own',
  'same she should so some such than that the their theirs them then there these they this',
  'those through to too under until up very was we were what when where which while who',
  'whom why will with would you your yours',
]
  .join(' ')
  .split(' ');

/** Folded FR + EN stop words. */
export const STOPWORDS: ReadonlySet<string> = new Set([...FRENCH_STOPWORDS, ...ENGLISH_STOPWORDS]);

/* ------------------------------------------------------------------------------------------ */
/* Tokenisation                                                                                */
/* ------------------------------------------------------------------------------------------ */

export interface Token {
  /** Folded surface form (`Idées` → `idees`). */
  surface: string;
  /** Stemmed form used as the index term (`idees` → `ide`). */
  term: string;
  /** Offsets in the ORIGINAL text, so callers can highlight it. */
  start: number;
  end: number;
  /** True for stop words (filtered out of the index). */
  stop: boolean;
}

/** Longer runs are almost always noise (base64, hashes, URLs without separators). */
export const MAX_TOKEN_LENGTH = 48;

// Letters, digits and combining marks (text may arrive already NFD-decomposed). Apostrophes,
// hyphens and underscores separate tokens: `l'idée` → `l`, `idée`; `mind-map` → `mind`, `map`.
const WORD_RE = /[\p{L}\p{N}\p{M}]+/gu;

/**
 * Splits `text` into folded tokens with their offsets in the original string. Single letters
 * are dropped (elided articles: `l'`, `d'`), single digits are kept. Stop words are returned
 * with `stop: true` so highlighting can still see them; the index ignores them.
 */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const match of text.matchAll(WORD_RE)) {
    const raw = match[0];
    const surface = fold(raw);
    if (surface.length === 0 || surface.length > MAX_TOKEN_LENGTH) continue;
    if (surface.length === 1 && !/\d/.test(surface)) continue;
    const start = match.index;
    out.push({
      surface,
      term: stem(surface),
      start,
      end: start + raw.length,
      stop: STOPWORDS.has(surface),
    });
  }
  return out;
}

/** Index terms of `text`: tokenised, stop words removed, stemmed. */
export function analyze(text: string): string[] {
  const terms: string[] = [];
  for (const token of tokenize(text)) if (!token.stop) terms.push(token.term);
  return terms;
}

/* ------------------------------------------------------------------------------------------ */
/* Light stemmer                                                                               */
/* ------------------------------------------------------------------------------------------ */

const VOWEL_RE = /[aeiouy]/;
const ALPHA_RE = /^[a-z]+$/;

function isConsonant(c: string | undefined): boolean {
  return c !== undefined && !VOWEL_RE.test(c);
}

/**
 * Light FR/EN stemmer on a folded token. Inspired by the "minimal" stemmers of Savoy (French)
 * and Harman's S-stemmer (English): plural markers, `-er`/`-ed`/`-ing`, trailing `e`, final
 * `y` and doubled consonants are normalised so that inflections collapse onto one term:
 * `notes`/`note`/`noté` → `not`, `idées`/`idée` → `ide`, `stories`/`story` → `stori`,
 * `planning`/`planned`/`plan` → `plan`, `journaux`/`journal` → `journal`.
 *
 * Tokens shorter than 4 characters or containing non-letters (`v2`, `2026`) are untouched.
 */
export function stem(token: string): string {
  let w = token;
  if (w.length < 4 || !ALPHA_RE.test(w)) return w;

  // 1. Plurals (EN `-ies`/`-sses`/`-s`, FR `-aux`/`-eaux`/`-eux`/`-oux`/`-s`).
  if (w.length >= 5 && w.endsWith('ies')) w = w.slice(0, -2);
  else if (w.endsWith('eaux')) w = w.slice(0, -1);
  else if (w.length >= 5 && w.endsWith('aux')) w = `${w.slice(0, -2)}l`;
  else if (w.endsWith('eux') || w.endsWith('oux')) w = w.slice(0, -1);
  else if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);

  // 2. Verbal endings (EN `-ing`/`-ed`, FR/EN `-er`). The remaining stem must keep a vowel
  // (`string` stays `string`, not `str`).
  if (w.length >= 6 && w.endsWith('ing') && VOWEL_RE.test(w.slice(0, -3))) w = w.slice(0, -3);
  else if (w.length >= 5 && w.endsWith('ed') && VOWEL_RE.test(w.slice(0, -2))) w = w.slice(0, -2);
  else if (w.length >= 5 && w.endsWith('er')) w = w.slice(0, -2);

  // 3. Trailing (possibly doubled, FR `-ée`) `e`.
  while (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);

  // 4. Final `y` → `i` so `story`/`stories` and `study`/`studied` meet.
  if (w.length >= 4 && w.endsWith('y')) w = `${w.slice(0, -1)}i`;

  // 5. Doubled final consonant (`plann` → `plan`, `nouvell` → `nouvel`).
  const last = w[w.length - 1];
  if (w.length >= 4 && last === w[w.length - 2] && isConsonant(last)) w = w.slice(0, -1);

  return w;
}

/* ------------------------------------------------------------------------------------------ */
/* Excerpts                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/**
 * Excerpt of `text` around the range [start, end): up to `radius` characters on each side, cut
 * on whitespace (never inside a word), whitespace collapsed, `…` where text was dropped.
 */
export function excerpt(text: string, start: number, end: number, radius: number): string {
  let from = Math.max(0, start - radius);
  let to = Math.min(text.length, end + radius);
  if (from > 0 && !isSpace(text[from - 1])) {
    let i = from;
    while (i < start && !isSpace(text[i])) i++;
    if (i < start) from = i + 1;
  }
  if (to < text.length && !isSpace(text[to])) {
    let i = to;
    while (i > end && !isSpace(text[i - 1])) i--;
    if (i > end) to = i - 1;
  }
  const body = text.slice(from, to).replace(/\s+/g, ' ').trim();
  const before = from > 0 && text.slice(0, from).trim() !== '' ? '…' : '';
  const after = to < text.length && text.slice(to).trim() !== '' ? '…' : '';
  return `${before}${body}${after}`;
}

function isSpace(c: string | undefined): boolean {
  return c !== undefined && /\s/.test(c);
}
