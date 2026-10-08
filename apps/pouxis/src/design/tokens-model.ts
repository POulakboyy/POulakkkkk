/**
 * Reads `tokens.css` as data: per-theme token maps, the contrast contract every theme must
 * honour, and the generated daylight (7.6) section. Pure string processing — shared by
 * `contrast.test.ts` (CI guard) and `build-tokens.mjs` (tokens.json + docs tables).
 */
import { contrastRatio, isHex, mixOklab } from './color.ts';

export type ThemeName = 'light' | 'dark' | 'eink';
export type TokenMap = Record<string, string>;

export interface CssBlock {
  /** Selector list of the rule, whitespace-normalised. */
  selector: string;
  /** Enclosing at-rule preludes, outermost first (e.g. `@media (prefers-color-scheme: dark)`). */
  conditions: string[];
  decls: TokenMap;
}

/** Splits a stylesheet into flat rules carrying their custom-property declarations. */
export function parseBlocks(css: string): CssBlock[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: CssBlock[] = [];
  const walk = (text: string, conditions: string[]) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) return;
      const prelude = text.slice(i, open).trim().replace(/\s+/g, ' ');
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') depth--;
        j++;
      }
      const body = text.slice(open + 1, j - 1);
      if (prelude.startsWith('@')) walk(body, [...conditions, prelude]);
      else blocks.push({ selector: prelude, conditions, decls: parseDecls(body) });
      i = j;
    }
  };
  walk(src, []);
  return blocks;
}

function parseDecls(body: string): TokenMap {
  const out: TokenMap = {};
  // Custom property values may contain `;` only inside parentheses — none of ours do.
  for (const raw of body.split(';')) {
    const idx = raw.indexOf(':');
    if (idx === -1) continue;
    const name = raw.slice(0, idx).trim();
    if (!name.startsWith('--')) continue;
    out[name] = raw
      .slice(idx + 1)
      .trim()
      .replace(/\s+/g, ' ');
  }
  return out;
}

const DARK_ATTR = ":root[data-theme='dark']";
const EINK_ATTR = ":root[data-theme='eink']";

function selectorList(sel: string): string[] {
  return sel.split(',').map((s) => s.trim());
}

/** Returns the raw (unresolved) declarations of each theme, light being the `:root` base. */
export function readThemes(css: string): Record<ThemeName, TokenMap> & { darkMedia: TokenMap } {
  const blocks = parseBlocks(css);
  const base: TokenMap = {};
  const dark: TokenMap = {};
  const darkMedia: TokenMap = {};
  const eink: TokenMap = {};
  for (const b of blocks) {
    const sels = selectorList(b.selector);
    const media = b.conditions.join(' ');
    if (b.conditions.length === 0 && sels.length === 1 && sels[0] === ':root') {
      Object.assign(base, b.decls);
    } else if (b.conditions.length === 0 && sels.includes(DARK_ATTR)) {
      Object.assign(dark, b.decls);
    } else if (media.includes('prefers-color-scheme: dark') && sels.length === 1) {
      Object.assign(darkMedia, b.decls);
    } else if (b.conditions.length === 0 && sels.length === 1 && sels[0] === EINK_ATTR) {
      Object.assign(eink, b.decls);
    }
  }
  return {
    light: { ...base },
    dark: { ...base, ...dark },
    eink: { ...base, ...eink },
    darkMedia: { ...base, ...darkMedia },
  };
}

/** Resolves `var(--x)` references (one level of fallback supported). */
export function resolve(tokens: TokenMap, value: string, depth = 0): string {
  if (depth > 12) return value;
  return value.replace(
    /var\((--[\w-]+)(?:,\s*([^()]*))?\)/g,
    (_m, name: string, fallback?: string) => {
      const v = tokens[name];
      if (v !== undefined) return resolve(tokens, v, depth + 1);
      return fallback !== undefined ? resolve(tokens, fallback, depth + 1) : `var(${name})`;
    },
  );
}

export function resolveAll(tokens: TokenMap): TokenMap {
  const out: TokenMap = {};
  for (const [k, v] of Object.entries(tokens)) out[k] = resolve(tokens, v);
  return out;
}

/* ------------------------------------------------------------------------------------------ */
/* Contrast contract                                                                           */
/* ------------------------------------------------------------------------------------------ */

/**
 * `text` = body text, 4.5:1 (WCAG 1.4.3). `large` = ≥ 24 px, or ≥ 18.66 px bold, 3:1.
 * `ui` = component boundaries, focus indicators, chart marks, 3:1 (WCAG 1.4.11).
 */
export type ContrastUse = 'text' | 'large' | 'ui';
export interface ContrastRule {
  fg: string;
  bg: string;
  use: ContrastUse;
}
export const MIN_RATIO: Record<ContrastUse, number> = { text: 4.5, large: 3, ui: 3 };

const TEXT_INKS = ['--ink', '--ink-2', '--ink-3'];
const PAPERS = ['--bg', '--bg-elevated', '--surface', '--surface-2'];
const SEMANTIC = [
  ['--accent-strong', '--accent-soft'],
  ['--create', '--create-soft'],
  ['--execute', '--execute-soft'],
  ['--success', '--success-soft'],
  ['--warning', '--warning-soft'],
  ['--danger', '--danger-soft'],
] as const;

function rules(): ContrastRule[] {
  const out: ContrastRule[] = [];
  const add = (fg: string, bg: string, use: ContrastUse) => out.push({ fg, bg, use });
  for (const fg of TEXT_INKS) for (const bg of PAPERS) add(fg, bg, 'text');
  add('--ink', '--surface-3', 'text');
  add('--ink-2', '--surface-3', 'text');
  add('--ink-3', '--surface-3', 'large');
  add('--accent-ink', '--accent', 'text');
  for (const [fg, soft] of SEMANTIC) {
    for (const bg of ['--bg', '--surface', '--surface-2', soft]) add(fg, bg, 'text');
    add('--ink', soft, 'text');
  }
  for (const [fill, ink] of [
    ['--create', '--create-ink'],
    ['--execute', '--execute-ink'],
    ['--mode-accent', '--mode-accent-ink'],
    ['--danger', '--danger-ink'],
    ['--success', '--success-ink'],
  ] as const) {
    add(ink, fill, 'text');
  }
  for (let i = 1; i <= 8; i++) {
    add('--ink', `--cat-${i}`, 'text');
    add('--ink-2', `--cat-${i}`, 'text');
  }
  for (const bg of ['--bg', '--surface', '--surface-2']) {
    add('--focus-ring', bg, 'ui');
    add('--line-control', bg, 'ui');
  }
  for (let i = 1; i <= 8; i++) {
    add(`--viz-${i}`, '--surface', 'ui');
    add(`--viz-${i}`, '--bg', 'ui');
  }
  return out;
}
export const CONTRAST_RULES: readonly ContrastRule[] = rules();

export interface ContrastResult extends ContrastRule {
  fgValue: string;
  bgValue: string;
  ratio: number;
  min: number;
  pass: boolean;
}

export function auditContrast(tokens: TokenMap): ContrastResult[] {
  const resolved = resolveAll(tokens);
  return CONTRAST_RULES.map((r) => {
    const fgValue = resolved[r.fg] ?? '';
    const bgValue = resolved[r.bg] ?? '';
    const ok = isHex(fgValue) && isHex(bgValue);
    const ratio = ok ? contrastRatio(fgValue, bgValue) : 0;
    const min = MIN_RATIO[r.use];
    return { ...r, fgValue, bgValue, ratio, min, pass: ratio >= min };
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Daylight (7.6) — progressive dark mode                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * "Paper" tokens dim progressively with the daylight level; everything else (ink, semantic
 * text colours, accents) switches once, at the phase change, so text contrast never passes
 * through a muddy middle.
 */
export const DAYLIGHT_PAPER_TOKENS = [
  '--bg',
  '--bg-elevated',
  '--surface',
  '--surface-2',
  '--surface-3',
  '--line',
  '--line-strong',
  '--accent-soft',
  '--create-soft',
  '--execute-soft',
  '--success-soft',
  '--warning-soft',
  '--danger-soft',
  '--cat-1',
  '--cat-2',
  '--cat-3',
  '--cat-4',
  '--cat-5',
  '--cat-6',
  '--cat-7',
  '--cat-8',
  '--heat-0',
] as const;

/** Max share of the dark value mixed into light paper at the switch point (dusk). */
export const DAYLIGHT_DIM = 0.08;
/** Max share of the light value mixed into dark paper right after the switch. */
export const DAYLIGHT_LIFT = 0.06;

/** Token values as the CSS would compute them for a given daylight level (0 night .. 1 day). */
export function daylightTokens(
  themes: Record<'light' | 'dark', TokenMap>,
  level: number,
): TokenMap {
  const d = Math.min(1, Math.max(0, level));
  const night = d < 0.5;
  const light = resolveAll(themes.light);
  const dark = resolveAll(themes.dark);
  const out: TokenMap = { ...(night ? dark : light) };
  const dusk = Math.min(1, Math.max(0, (1 - d) * 2));
  const deep = Math.min(1, Math.max(0, (0.5 - d) * 2));
  for (const name of DAYLIGHT_PAPER_TOKENS) {
    const l = light[name];
    const k = dark[name];
    if (!l || !k || !isHex(l) || !isHex(k)) continue;
    out[name] = night
      ? mixOklab(l, k, (1 - deep) * DAYLIGHT_LIFT)
      : mixOklab(k, l, dusk * DAYLIGHT_DIM);
  }
  // Tokens that alias paper tokens (e.g. --mode-accent-soft) follow them.
  for (const [k, v] of Object.entries(night ? themes.dark : themes.light)) {
    if (v.includes('var(')) out[k] = resolve(out, v);
  }
  return out;
}

export const DAYLIGHT_START = '/* @generated daylight:start';
export const DAYLIGHT_END = '/* @generated daylight:end */';

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

/** CSS for the generated daylight section (light/dark values copied from the theme blocks). */
export function generateDaylightCss(themes: Record<'light' | 'dark', TokenMap>): string {
  const light = resolveAll(themes.light);
  const dark = resolveAll(themes.dark);
  const dayLines: string[] = [];
  const nightLines: string[] = [];
  for (const name of DAYLIGHT_PAPER_TOKENS) {
    const l = light[name];
    const k = dark[name];
    if (!l || !k || !isHex(l) || !isHex(k)) continue;
    dayLines.push(`    ${name}: color-mix(in oklab, ${k} var(--_daylight-dim), ${l});`);
    nightLines.push(`    ${name}: color-mix(in oklab, ${l} var(--_daylight-lift), ${k});`);
  }
  return [
    `${DAYLIGHT_START} — run \`node apps/pouxis/src/design/build-tokens.mjs\` */`,
    '/*',
    ' * Progressive dark mode (7.6). `applyDaylight()` (daylight.ts) sets --daylight (1 = full day,',
    ' * 0 = night), data-theme-auto="daylight" and data-daylight-phase="day|night". Paper tokens',
    ` * dim by up to ${pct(DAYLIGHT_DIM)} toward their dark value as dusk approaches; at the switch`,
    ' * (level 0.5) the dark theme takes over, starting slightly lifted and deepening into the night.',
    ' * Ink and semantic colours switch once, so text contrast never crosses a grey middle.',
    ' */',
    '@supports (color: color-mix(in oklab, red, blue)) {',
    "  :root[data-theme-auto='daylight']:not([data-theme]) {",
    '    --_daylight-dusk: clamp(0, (1 - var(--daylight, 1)) * 2, 1);',
    '    --_daylight-deep: clamp(0, (0.5 - var(--daylight, 1)) * 2, 1);',
    `    --_daylight-dim: calc(var(--_daylight-dusk) * ${pct(DAYLIGHT_DIM)});`,
    `    --_daylight-lift: calc((1 - var(--_daylight-deep)) * ${pct(DAYLIGHT_LIFT)});`,
    ...dayLines,
    '  }',
    '',
    "  :root[data-theme-auto='daylight'][data-daylight-phase='night']:not([data-theme]) {",
    ...nightLines,
    '  }',
    '}',
    DAYLIGHT_END,
  ].join('\n');
}

/** Returns `css` with the generated daylight section replaced (or `null` if markers are absent). */
export function spliceDaylight(css: string): string | null {
  const start = css.indexOf(DAYLIGHT_START);
  const end = css.indexOf(DAYLIGHT_END);
  if (start === -1 || end === -1) return null;
  const themes = readThemes(css);
  return css.slice(0, start) + generateDaylightCss(themes) + css.slice(end + DAYLIGHT_END.length);
}
