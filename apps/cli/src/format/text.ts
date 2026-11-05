/** Terminal text layout: display width, truncation and padding that respect graphemes. */
import { stripAnsi } from '../output.ts';

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
const WIDE = /\p{Extended_Pictographic}|[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u;
const ZERO_WIDTH = /^[\p{Mn}\p{Me}​-‏︎]+$/u;

function graphemeWidth(g: string): number {
  if (ZERO_WIDTH.test(g)) return 0;
  return WIDE.test(g) ? 2 : 1;
}

/** Columns `s` occupies in a monospace terminal (colours ignored). */
export function displayWidth(s: string): number {
  let width = 0;
  for (const { segment } of segmenter.segment(stripAnsi(s))) width += graphemeWidth(segment);
  return width;
}

/** Cuts plain text to `max` columns, ending with `…` when something was removed. */
export function truncate(s: string, max: number): string {
  if (!Number.isFinite(max) || displayWidth(s) <= max) return s;
  if (max <= 1) return max === 1 ? '…' : '';
  let out = '';
  let width = 0;
  for (const { segment } of segmenter.segment(s)) {
    const w = graphemeWidth(segment);
    if (width + w > max - 1) break;
    out += segment;
    width += w;
  }
  return `${out}…`;
}

export function padEnd(s: string, width: number): string {
  const missing = width - displayWidth(s);
  return missing > 0 ? s + ' '.repeat(missing) : s;
}

/** Collapses whitespace runs (newlines included) into single spaces. */
export function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
