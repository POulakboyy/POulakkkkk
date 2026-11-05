#!/usr/bin/env node
/**
 * Regenerates every artefact derived from tokens.css:
 *  - the daylight (7.6) section inside tokens.css,
 *  - docs/design/tokens.json (W3C DTCG),
 *  - the token and contrast tables inside docs/design/DESIGN_SYSTEM.md.
 * Usage: node apps/pouxis/src/design/build-tokens.mjs   (Node ≥ 22.18, runs the .ts directly)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readThemes, spliceDaylight } from './tokens-model.ts';
import { contrastTable, spliceMarkdown, toDtcg, tokenTable } from './tokens-export.ts';

/** Formats with the repo's Prettier config when available (dev dependency), else unchanged. */
async function pretty(text, filepath) {
  try {
    const prettier = await import('prettier');
    const options = (await prettier.resolveConfig(filepath)) ?? {};
    return await prettier.format(text, { ...options, filepath });
  } catch {
    return text;
  }
}

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const cssPath = here('./tokens.css');
const docsDir = here('../../../../docs/design/');

const css = spliceDaylight(readFileSync(cssPath, 'utf8'));
if (css === null) throw new Error('tokens.css: @generated daylight markers missing');
writeFileSync(cssPath, css);

const themes = readThemes(css);
const jsonPath = `${docsDir}tokens.json`;
writeFileSync(jsonPath, await pretty(JSON.stringify(toDtcg(themes), null, 2), jsonPath));

const mdPath = `${docsDir}DESIGN_SYSTEM.md`;
let md = null;
try {
  md = readFileSync(mdPath, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (md !== null) {
  md = spliceMarkdown(md, 'tokens', tokenTable(themes));
  md = spliceMarkdown(md, 'contrast', contrastTable(themes));
  writeFileSync(mdPath, await pretty(md, mdPath));
}
console.log('tokens.css, tokens.json and DESIGN_SYSTEM.md tables regenerated.');
