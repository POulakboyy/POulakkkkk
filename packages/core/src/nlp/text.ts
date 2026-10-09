/**
 * Low-level text helpers shared by the matchers.
 *
 * Matching runs on a *folded* copy of the input (lower case, diacritics removed, typographic
 * apostrophes/dashes/spaces normalised) that has exactly the same length as the original, so
 * every index found in the folded text is also a valid index in the raw input.
 */

const SPECIAL: Readonly<Record<string, string>> = {
  '’': "'",
  '‘': "'",
  'ʼ': "'",
  '`': "'",
  '´': "'",
  '‐': '-',
  '‑': '-',
  '–': '-',
  '—': '-',
  '−': '-',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  '\t': ' ',
  '\r': ' ',
  '\n': ' ',
};

const MAX_CACHE = 4096;
const foldCache = new Map<string, string>();

/** Folds one UTF-16 code unit to exactly one code unit. */
function foldChar(c: string): string {
  const cached = foldCache.get(c);
  if (cached !== undefined) return cached;
  let out = SPECIAL[c];
  if (out === undefined) {
    const lower = c.toLowerCase();
    out = lower.length === 1 ? lower : c;
    if (out.charCodeAt(0) > 0x7f) {
      const base = out.normalize('NFD').charAt(0);
      if (base.charCodeAt(0) < 0x80) out = base;
    }
  }
  if (foldCache.size < MAX_CACHE) foldCache.set(c, out);
  return out;
}

/** Lower-cased, accent-free copy of `s` with the same length (index-aligned). */
export function fold(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) out += foldChar(s.charAt(i));
  return out;
}

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** True when `s[i]` is a letter or a digit (any script). Out-of-range indexes are false. */
export function isWordChar(s: string, i: number): boolean {
  if (i < 0 || i >= s.length) return false;
  const c = s.charCodeAt(i);
  if (c < 0x80) return (c >= 48 && c <= 57) || (c >= 97 && c <= 122) || (c >= 65 && c <= 90);
  return LETTER_OR_DIGIT.test(s.charAt(i));
}

/** True when `s[i]` is an upper-case letter. */
export function isUpper(s: string, i: number): boolean {
  const c = s.charAt(i);
  return c !== '' && c !== c.toLowerCase() && c === c.toUpperCase();
}

/** Index just after the run of word characters starting at `i` (at least `i + 1`). */
export function skipWord(s: string, i: number): number {
  if (!isWordChar(s, i)) return i + 1;
  let j = i + 1;
  while (isWordChar(s, j)) j++;
  return j;
}

/** True when the text between `from` and `to` only holds spaces (and, optionally, commas). */
export function onlySeparators(s: string, from: number, to: number, allowComma = false): boolean {
  for (let i = from; i < to; i++) {
    const c = s.charAt(i);
    if (c === ' ' || (allowComma && c === ',')) continue;
    return false;
  }
  return true;
}

/** Negative look-ahead asserting a word ends here (no letter or digit follows). */
export const WE = '(?![\\p{L}\\p{N}])';

/** Compiles a sticky, Unicode-aware regex: it only matches exactly at `lastIndex`. */
export function sticky(src: string): RegExp {
  return new RegExp(src, 'uy');
}

/** Runs a sticky regex at `pos`. */
export function execAt(re: RegExp, s: string, pos: number): RegExpExecArray | null {
  re.lastIndex = pos;
  return re.exec(s);
}

/** Upper-cases the first letter of `s` when its first word is entirely lower case. */
export function capitalizeFirst(s: string): string {
  const m = /^[^\p{L}]*([\p{L}][\p{L}\p{N}'’-]*)/u.exec(s);
  if (!m || !m[1]) return s;
  const word = m[1];
  if (word !== word.toLowerCase()) return s;
  const at = m.index + m[0].length - word.length;
  return s.slice(0, at) + word.charAt(0).toUpperCase() + s.slice(at + 1);
}
