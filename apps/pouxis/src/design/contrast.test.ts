// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, cvdDeltaE, isHex } from './color.ts';
import {
  CONTRAST_RULES,
  auditContrast,
  daylightTokens,
  readThemes,
  resolveAll,
  spliceDaylight,
  type ContrastResult,
  type TokenMap,
} from './tokens-model.ts';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const themes = readThemes(css);

function failures(results: ContrastResult[]): string[] {
  return results
    .filter((r) => !r.pass)
    .map((r) => `${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)} < ${r.min} (${r.fgValue}/${r.bgValue})`);
}

describe('WCAG contrast contract (tokens.css)', () => {
  it.each(['light', 'dark', 'eink'] as const)('%s theme passes every rule', (name) => {
    const results = auditContrast(themes[name]);
    expect(results).toHaveLength(CONTRAST_RULES.length);
    expect(failures(results)).toEqual([]);
  });

  it('the OS-preference dark block mirrors the [data-theme=dark] block', () => {
    const forced = themes.dark;
    const media = themes.darkMedia;
    const keys = new Set([...Object.keys(forced), ...Object.keys(media)]);
    const diff = [...keys].filter((k) => forced[k] !== media[k]);
    expect(diff).toEqual([]);
  });

  it('every audited token resolves to a hex colour in every theme', () => {
    for (const name of ['light', 'dark', 'eink'] as const) {
      const resolved = resolveAll(themes[name]);
      for (const r of CONTRAST_RULES) {
        expect(isHex(resolved[r.fg] ?? ''), `${name} ${r.fg}`).toBe(true);
        expect(isHex(resolved[r.bg] ?? ''), `${name} ${r.bg}`).toBe(true);
      }
    }
  });

  it('work modes: --mode-accent is text-safe in create and execute', () => {
    for (const name of ['light', 'dark'] as const) {
      const t = resolveAll(themes[name]);
      for (const mode of ['--create', '--execute'] as const) {
        expect(contrastRatio(t[mode]!, t['--bg']!)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t[`${mode}-ink`]!, t[mode]!)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('E-ink theme (7.10)', () => {
  const eink = resolveAll(themes.eink);
  const greys = Object.entries(eink).filter(
    ([k, v]) => /^--(ink|line)/.test(k) && isHex(v) && v.toLowerCase() !== '#ffffff',
  );

  it('uses no text or stroke grey lighter than #333', () => {
    const limit = contrastRatio('#333333', '#ffffff');
    for (const [k, v] of greys)
      expect(contrastRatio(v, '#ffffff'), k).toBeGreaterThanOrEqual(limit);
  });

  it('drops shadows, motion and thin strokes', () => {
    for (const s of ['--shadow-1', '--shadow-2', '--shadow-3']) expect(eink[s]).toBe('none');
    for (const d of ['--dur-instant', '--dur-fast', '--dur-base', '--dur-slow', '--dur-slower']) {
      expect(eink[d]).toBe('0ms');
    }
    expect(eink['--border-width']).toBe('2px');
    expect(Number.parseInt(eink['--tap-min'] ?? '0', 10)).toBeGreaterThanOrEqual(48);
  });
});

describe('Data-viz palette', () => {
  const adjacent = (t: TokenMap) =>
    Array.from({ length: 7 }, (_, i) => [t[`--viz-${i + 1}`]!, t[`--viz-${i + 2}`]!] as const);

  it.each(['light', 'dark'] as const)('%s: adjacent series stay distinct under CVD', (name) => {
    const t = resolveAll(themes[name]);
    for (const [a, b] of adjacent(t)) {
      expect(cvdDeltaE(a, b), `${a}/${b} normal`).toBeGreaterThanOrEqual(15);
      expect(cvdDeltaE(a, b, 'protan'), `${a}/${b} protan`).toBeGreaterThanOrEqual(6);
      expect(cvdDeltaE(a, b, 'deutan'), `${a}/${b} deutan`).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('Daylight blend (7.6)', () => {
  it('generated section in tokens.css is up to date', () => {
    expect(spliceDaylight(css)).toBe(css);
  });

  it.each([1, 0.75, 0.51, 0.49, 0.25, 0])('text contrast holds at daylight %s', (level) => {
    const tokens = daylightTokens(themes, level);
    expect(failures(auditContrast(tokens))).toEqual([]);
  });
});
