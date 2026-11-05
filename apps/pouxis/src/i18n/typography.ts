/**
 * Typesetting applied once to every dictionary when the i18n module loads, so copy authors type
 * plain spaces and the reader still gets correct line breaks (docs/design/UX_WRITING.md):
 *
 * - all locales: ` · ` separators keep the dot on the line before (`A · B`, never `·` alone at
 *   the start of a line);
 * - French: no-break space before `:` and inside `« »`, narrow no-break space before `; ! ?`
 *   (Imprimerie nationale convention, the same narrow space `Intl` uses in `42 %`).
 *
 * Only dictionary strings go through this; interpolated values (task titles…) are never touched.
 */
import type { Locale } from '@pouxis/core';

/** U+00A0 NO-BREAK SPACE. */
export const NBSP = ' ';
/** U+202F NARROW NO-BREAK SPACE. */
export const NNBSP = ' ';

/** Returns `text` with the locale's non-breaking spaces in place of plain spaces. */
export function typeset(text: string, locale: Locale): string {
  let out = text.replace(/ · /g, `${NBSP}· `);
  if (locale === 'fr') {
    out = out
      .replace(/ +([;!?])/g, `${NNBSP}$1`)
      .replace(/ +:/g, `${NBSP}:`)
      .replace(/« +/g, `«${NBSP}`)
      .replace(/ +»/g, `${NBSP}»`);
  }
  return out;
}

/** Deep-copies a dictionary, typesetting every string leaf. The shape is preserved. */
export function typesetDict<T>(dict: T, locale: Locale): T {
  if (typeof dict === 'string') return typeset(dict, locale) as T;
  if (typeof dict !== 'object' || dict === null) return dict;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dict)) out[key] = typesetDict(value, locale);
  return out as T;
}
