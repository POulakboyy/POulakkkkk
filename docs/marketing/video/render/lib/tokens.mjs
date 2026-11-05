// Reads brand colours from the app's design tokens so title cards never drift from the UI.
import { readFileSync } from 'node:fs';
import { TOKENS_CSS } from './config.mjs';

/** Custom properties declared directly inside the first block whose selector list starts with `selector`. */
export function blockVars(css, selector) {
  const start =
    css.indexOf(`${selector} {`) !== -1
      ? css.indexOf(`${selector} {`)
      : css.indexOf(`${selector},`);
  if (start === -1) return {};
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const vars = {};
  for (const m of css.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  }
  return vars;
}

/** `{ light, dark }` token maps; dark inherits every light token it does not redefine. */
export function themeTokens(css = readFileSync(TOKENS_CSS, 'utf8')) {
  const light = blockVars(css, ':root');
  const dark = { ...light, ...blockVars(css, ":root[data-theme='dark']") };
  for (const name of ['--bg', '--ink', '--ink-2', '--accent', '--line']) {
    if (!light[name] || !dark[name]) throw new Error(`tokens.css: ${name} not found`);
  }
  return { light, dark };
}

/** CSS declarations (`--bg: …; --ink: …;`) for a stage page. */
export function cssVars(tokens) {
  return Object.entries(tokens)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
}
