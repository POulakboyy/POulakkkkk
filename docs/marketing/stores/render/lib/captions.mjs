// Reads the caption plan (docs/marketing/stores/screenshots.md): each series is a fenced `text`
// block right after an `<!-- field: captions.<series>@<lang> -->` marker, one caption per line.
import { readFileSync } from 'node:fs';
import { CAPTION_PLAN } from './config.mjs';

const FIELD = /<!--\s*field:\s*captions\.([\w-]+)@(\w+)\s*-->\s*```text\n([\s\S]*?)```/g;

/** `{ "<series>@<lang>": string[] }` from the plan's Markdown. */
export function parseCaptions(markdown) {
  const out = {};
  for (const [, series, lang, body] of markdown.matchAll(FIELD)) {
    out[`${series}@${lang}`] = body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return out;
}

let cached;

/** Caption `index` of `series` in `lang`; throws when the plan has no such line. */
export function caption(series, lang, index, plan = (cached ??= parseCaptions(readFileSync(CAPTION_PLAN, 'utf8')))) {
  const list = plan[`${series}@${lang}`];
  if (!list) throw new Error(`screenshots.md: no captions.${series}@${lang} block`);
  const text = list[index];
  if (!text) throw new Error(`screenshots.md: captions.${series}@${lang} has no line ${index + 1}`);
  return text;
}
