/**
 * Turns the parsed `tokens.css` into a W3C Design Tokens (DTCG 2025.10) document and into the
 * Markdown tables embedded in docs/design/DESIGN_SYSTEM.md. Pure: `build-tokens.mjs` does I/O.
 */
import { parseHex } from './color.ts';
import {
  auditContrast,
  type ContrastResult,
  type ThemeName,
  type TokenMap,
} from './tokens-model.ts';

type DtcgType =
  'color' | 'dimension' | 'duration' | 'cubicBezier' | 'fontFamily' | 'fontWeight' | 'number';

interface DtcgToken {
  $type: DtcgType;
  $value: unknown;
}
type DtcgGroup = { [key: string]: DtcgToken | DtcgGroup | string };

const VAR_RE = /^var\((--[\w-]+)\)$/;
const PX_REM_RE = /^(-?\d*\.?\d+)(px|rem)$/;
const RGB_RE = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/;

/** Classifies a token by name; `null` means "CSS-only" (no faithful DTCG representation). */
export function tokenType(name: string, value: string): DtcgType | null {
  if (/^--(font)-/.test(name)) return 'fontFamily';
  if (/^--weight-/.test(name)) return 'fontWeight';
  if (/^--dur-|^--stagger-/.test(name)) return /^\d+ms$/.test(value) ? 'duration' : null;
  if (/^--ease-/.test(name)) return /^cubic-bezier\(|^var\(/.test(value) ? 'cubicBezier' : null;
  if (/^--(leading|z|opacity|daylight|motion-scale)/.test(name)) return 'number';
  if (value.startsWith('#') || RGB_RE.test(value) || value === 'transparent') return 'color';
  if (VAR_RE.test(value)) return 'color';
  if (PX_REM_RE.test(value) || value === '0px') return 'dimension';
  return null;
}

function colorValue(value: string): unknown {
  if (value === 'transparent') return { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0 };
  const rgb = RGB_RE.exec(value);
  if (rgb) {
    const [, r, g, b, a] = rgb;
    return {
      colorSpace: 'srgb',
      components: [r, g, b].map((c) => Number(c) / 255),
      alpha: a === undefined ? 1 : Number(a),
    };
  }
  const components = parseHex(value).map((c) => Math.round(c * 10000) / 10000);
  return { colorSpace: 'srgb', components, hex: value.toLowerCase() };
}

function tokenValue(type: DtcgType, value: string, aliasOf: (n: string) => string): unknown {
  const alias = VAR_RE.exec(value);
  if (alias) return `{${aliasOf(alias[1]!)}}`;
  switch (type) {
    case 'color':
      return colorValue(value);
    case 'dimension': {
      const m = PX_REM_RE.exec(value);
      return m ? { value: Number(m[1]), unit: m[2] } : { value: 0, unit: 'px' };
    }
    case 'duration':
      return { value: Number.parseFloat(value), unit: 'ms' };
    case 'cubicBezier':
      return (/\(([^)]*)\)/.exec(value)?.[1] ?? '').split(',').map((n) => Number(n.trim()));
    case 'fontFamily':
      return value.split(',').map((f) => f.trim().replace(/^'|'$/g, ''));
    case 'fontWeight':
    case 'number':
      return Number(value);
  }
}

const GROUP: Record<DtcgType, string> = {
  color: 'color',
  dimension: 'size',
  duration: 'duration',
  cubicBezier: 'easing',
  fontFamily: 'font',
  fontWeight: 'weight',
  number: 'number',
};

function tokenPath(themeTokens: TokenMap, name: string): [string, string] {
  const type = tokenType(name, themeTokens[name] ?? '') ?? 'number';
  return [GROUP[type], name.replace(/^--/, '')];
}

function buildGroup(tokens: TokenMap, keep: (name: string) => boolean): DtcgGroup {
  const out: DtcgGroup = {};
  const aliasOf = (n: string) => tokenPath(tokens, n).join('.');
  for (const [name, value] of Object.entries(tokens)) {
    if (name.startsWith('--_') || !keep(name)) continue;
    const type = tokenType(name, value);
    if (!type) continue;
    const [group, key] = tokenPath(tokens, name);
    const bucket = (out[group] ??= {}) as DtcgGroup;
    bucket[key] = { $type: type, $value: tokenValue(type, value, aliasOf) };
  }
  return out;
}

/**
 * DTCG has no theming primitive: the light theme is the base token set, and dark / e-ink are
 * exported as complete override sets under `$extensions["app.pouxis.themes"]`.
 */
export function toDtcg(themes: Record<ThemeName, TokenMap>): DtcgGroup & object {
  const base = buildGroup(themes.light, () => true);
  const overrides = (name: ThemeName) =>
    buildGroup(themes[name], (n) => themes[name][n] !== themes.light[n]);
  const cssOnly = Object.fromEntries(
    Object.entries(themes.light).filter(([n, v]) => !n.startsWith('--_') && !tokenType(n, v)),
  );
  return {
    $description:
      'POuxis design tokens — generated from apps/pouxis/src/design/tokens.css. Do not edit.',
    ...base,
    $extensions: {
      'app.pouxis.themes': { dark: overrides('dark'), eink: overrides('eink') },
      'app.pouxis.cssOnly': cssOnly,
    },
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Markdown                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const USE_LABEL = { text: 'texte ≥ 4,5', large: 'grand texte ≥ 3', ui: 'UI ≥ 3' } as const;
const fmt = (n: number) => n.toFixed(2).replace('.', ',');

/** One row per rule, one ratio column per theme. */
export function contrastTable(themes: Record<ThemeName, TokenMap>): string {
  const names: ThemeName[] = ['light', 'dark', 'eink'];
  const results = names.map((n) => auditContrast(themes[n]));
  const first = results[0] ?? [];
  const cell = (r: ContrastResult | undefined) =>
    r ? `${fmt(r.ratio)} ${r.pass ? '✅' : '❌'}` : '—';
  const rows = first.map((r, i) =>
    [`\`${r.fg}\``, `\`${r.bg}\``, USE_LABEL[r.use], ...results.map((res) => cell(res[i]))]
      .join(' | ')
      .replace(/^/, '| ')
      .concat(' |'),
  );
  return [
    '| Premier plan | Fond | Exigence | Clair | Sombre | E-ink |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** Full token table: name, light value, dark value, e-ink value. */
export function tokenTable(themes: Record<ThemeName, TokenMap>): string {
  const esc = (v: string | undefined) =>
    v === undefined ? '—' : `\`${v.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')}\``;
  const rows = Object.keys(themes.light)
    .filter((n) => !n.startsWith('--_'))
    .map((n) => {
      const l = themes.light[n];
      const d = themes.dark[n] === l ? '=' : esc(themes.dark[n]);
      const e = themes.eink[n] === l ? '=' : esc(themes.eink[n]);
      return `| \`${n}\` | ${esc(l)} | ${d} | ${e} |`;
    });
  return ['| Token | Clair | Sombre | E-ink |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

/** Replaces the content between `<!-- @generated <id>:start -->` and `…:end -->`. */
export function spliceMarkdown(doc: string, id: string, content: string): string {
  const start = `<!-- @generated ${id}:start -->`;
  const end = `<!-- @generated ${id}:end -->`;
  const a = doc.indexOf(start);
  const b = doc.indexOf(end);
  if (a === -1 || b === -1 || b < a) return doc;
  return `${doc.slice(0, a + start.length)}\n\n${content}\n\n${doc.slice(b)}`;
}
