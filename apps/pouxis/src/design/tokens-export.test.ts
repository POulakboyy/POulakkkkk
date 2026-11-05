// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, mixOklab, readableInk, simulateCvd } from './color.ts';
import { contrastTable, spliceMarkdown, toDtcg, tokenTable, tokenType } from './tokens-export.ts';
import { readThemes } from './tokens-model.ts';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const themes = readThemes(css);
const json = readFileSync(new URL('../../../../docs/design/tokens.json', import.meta.url), 'utf8');

describe('color maths', () => {
  it('matches WCAG reference ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('mixOklab hits both ends and stays in gamut', () => {
    expect(mixOklab('#ff0000', '#0000ff', 1)).toBe('#ff0000');
    expect(mixOklab('#ff0000', '#0000ff', 0)).toBe('#0000ff');
    expect(mixOklab('#ffffff', '#000000', 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('greys are invariant under CVD simulation', () => {
    expect(simulateCvd('#808080', 'deutan')).toBe('#808080');
  });

  it('readableInk picks the better candidate', () => {
    expect(readableInk('#ffffff')).toBe('#1c1b18');
    expect(readableInk('#000000')).toBe('#ffffff');
  });
});

describe('DTCG export', () => {
  it('docs/design/tokens.json is up to date', () => {
    expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(toDtcg(themes))));
  });

  it('classifies tokens and keeps aliases as references', () => {
    expect(tokenType('--ink', '#000000')).toBe('color');
    expect(tokenType('--space-4', '1rem')).toBe('dimension');
    expect(tokenType('--dur-fast', '140ms')).toBe('duration');
    expect(tokenType('--text-display', 'clamp(1rem, 2vw, 3rem)')).toBeNull();
    const doc = toDtcg(themes) as Record<string, Record<string, { $value: unknown }>>;
    expect(doc.color?.['mode-accent']?.$value).toBe('{color.create}');
    expect(doc.easing?.['ease-enter']?.$value).toBe('{easing.ease-out}');
    expect(doc.duration?.['dur-fast']?.$value).toEqual({ value: 140, unit: 'ms' });
  });
});

describe('Markdown tables', () => {
  it('replaces only the marked region', () => {
    const doc = 'a\n<!-- @generated x:start -->\nold\n<!-- @generated x:end -->\nb';
    const out = spliceMarkdown(doc, 'x', 'new');
    expect(out).toBe('a\n<!-- @generated x:start -->\n\nnew\n\n<!-- @generated x:end -->\nb');
    expect(spliceMarkdown('no markers', 'x', 'new')).toBe('no markers');
  });

  it('renders one row per rule and per token', () => {
    expect(contrastTable(themes)).not.toContain('❌');
    expect(tokenTable(themes)).toContain('| `--ink` |');
  });
});
