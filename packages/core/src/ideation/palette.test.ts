import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  deltaE,
  extractPalette,
  extractSwatches,
  hexToRgb,
  labToRgb,
  meetsContrast,
  readableInk,
  relativeLuminance,
  rgbToHex,
  rgbToLab,
  type Rgb,
} from './palette.ts';
import { mulberry32 } from './rng.ts';

/** RGBA buffer made of `count` pixels of each colour, in blocks. */
function image(blocks: Array<[Rgb, number, number?]>): Uint8ClampedArray {
  const total = blocks.reduce((n, [, count]) => n + count, 0);
  const out = new Uint8ClampedArray(total * 4);
  let p = 0;
  for (const [[r, g, b], count, alpha = 255] of blocks) {
    for (let i = 0; i < count; i++, p++) out.set([r, g, b, alpha], p * 4);
  }
  return out;
}

describe('colour conversions', () => {
  it('parses and formats hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('1A2b3C')).toEqual([26, 43, 60]);
    expect(() => hexToRgb('#12345')).toThrow();
    expect(rgbToHex([255, 0, 16.4])).toBe('#ff0010');
    expect(rgbToHex([300, -5, 0])).toBe('#ff0000');
  });

  it('maps reference colours to CIELAB', () => {
    const white = rgbToLab([255, 255, 255]);
    expect(white[0]).toBeCloseTo(100, 1);
    expect(Math.abs(white[1])).toBeLessThan(0.05);
    expect(rgbToLab([0, 0, 0])).toEqual([0, 0, 0]);
    const red = rgbToLab([255, 0, 0]);
    expect(red[0]).toBeCloseTo(53.24, 1);
    expect(red[1]).toBeCloseTo(80.09, 0);
    expect(red[2]).toBeCloseTo(67.2, 0);
  });

  it('round-trips sRGB → Lab → sRGB', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      const rgb: Rgb = [0, 0, 0].map(() => Math.floor(rng() * 256)) as unknown as Rgb;
      expect(labToRgb(rgbToLab(rgb))).toEqual(rgb);
    }
  });

  it('measures CIE76 distance', () => {
    expect(deltaE([50, 0, 0], [50, 3, 4])).toBe(5);
  });
});

describe('WCAG contrast', () => {
  it('matches the reference values', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(1);
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21);
    expect(contrastRatio('#777', '#777')).toBe(1);
    expect(contrastRatio('#767676', '#fff')).toBeCloseTo(4.54, 2);
  });

  it('checks AA/AAA thresholds', () => {
    expect(meetsContrast('#767676', '#fff')).toBe(true);
    expect(meetsContrast('#777777', '#fff')).toBe(false);
    expect(meetsContrast('#777777', '#fff', 'AA', true)).toBe(true);
    expect(meetsContrast('#767676', '#fff', 'AAA')).toBe(false);
    expect(meetsContrast('#000', '#fff', 'AAA')).toBe(true);
  });

  it('picks the most readable ink', () => {
    expect(readableInk('#ffeb3b')).toBe('#000000');
    expect(readableInk('#1a237e')).toBe('#ffffff');
    expect(readableInk('#fff', ['#999', '#333'])).toBe('#333');
    expect(() => readableInk('#fff', [])).toThrow();
  });
});

describe('extractPalette', () => {
  it('returns dominant colours, most dominant first', () => {
    const rgba = image([
      [[200, 30, 30], 600],
      [[20, 40, 200], 300],
      [[240, 240, 240], 100],
    ]);
    expect(extractPalette(rgba, { k: 3 })).toEqual(['#c81e1e', '#1428c8', '#f0f0f0']);
    const swatches = extractSwatches(rgba, { k: 3 });
    expect(swatches.map((s) => s.weight)).toEqual([0.6, 0.3, 0.1]);
  });

  it('clusters noisy colours around their centres', () => {
    const rng = mulberry32(2);
    const centres: Rgb[] = [
      [220, 60, 50],
      [40, 160, 90],
      [30, 50, 140],
      [240, 200, 60],
      [20, 20, 20],
    ];
    const pixels = new Uint8ClampedArray(50_000 * 4);
    for (let p = 0; p < 50_000; p++) {
      const c = centres[p % 5]!;
      const jitter = () => Math.round((rng() - 0.5) * 16);
      pixels.set([c[0] + jitter(), c[1] + jitter(), c[2] + jitter(), 255], p * 4);
    }
    const palette = extractSwatches(pixels, { k: 5, sample: 4000, seed: 3 });
    expect(palette).toHaveLength(5);
    for (const centre of centres) {
      const lab = rgbToLab(centre);
      const best = Math.min(...palette.map((s) => deltaE(s.lab, lab)));
      expect(best).toBeLessThan(5);
    }
    expect(palette.reduce((n, s) => n + s.weight, 0)).toBeCloseTo(1);
  });

  it('is deterministic for a seed', () => {
    const rng = mulberry32(9);
    const pixels = new Uint8ClampedArray(20_000 * 4).map((_, i) =>
      i % 4 === 3 ? 255 : Math.floor(rng() * 256),
    );
    const a = extractPalette(pixels, { seed: 7 });
    expect(extractPalette(pixels, { seed: 7 })).toEqual(a);
    expect(a).toHaveLength(5);
  });

  it('ignores transparent pixels and handles tiny or empty images', () => {
    const rgba = image([
      [[10, 200, 10], 5],
      [[255, 0, 255], 50, 0],
    ]);
    expect(extractPalette(rgba)).toEqual(['#0ac80a']);
    expect(extractPalette(new Uint8ClampedArray(0))).toEqual([]);
    expect(extractPalette(image([[[1, 2, 3], 4, 10]]))).toEqual([]);
    expect(extractPalette(rgba, { alphaThreshold: 0 })).toHaveLength(2);
  });

  it('validates its inputs', () => {
    expect(() => extractPalette(new Uint8ClampedArray(5))).toThrow(RangeError);
    expect(() => extractPalette(new Uint8ClampedArray(4), { k: 0 })).toThrow(RangeError);
    expect(() => extractPalette(new Uint8ClampedArray(4), { k: 1.5 })).toThrow(RangeError);
  });

  it('accepts a plain Uint8Array', () => {
    const rgba = new Uint8Array(image([[[0, 0, 0], 3]]));
    expect(extractPalette(rgba, { k: 2 })).toEqual(['#000000']);
  });
});
