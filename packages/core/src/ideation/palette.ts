/**
 * Parametric moodboard (5.2): dominant-colour extraction and contrast helpers.
 *
 * Colours are clustered with k-means++ (Arthur & Vassilvitskii, 2007) in CIELAB, where
 * Euclidean distance approximates perceived colour difference far better than in RGB. Only a
 * deterministic, stratified sample of pixels is clustered, so a 12-megapixel photo costs the
 * same as a thumbnail; the same pixels, options and seed always give the same palette.
 *
 * Contrast follows WCAG 2.x: relative luminance and (L1 + 0.05) / (L2 + 0.05).
 */
import { mulberry32, weightedIndex, type Rng } from './rng.ts';

export type Rgb = readonly [number, number, number];
export type Lab = readonly [number, number, number];
/** `#rgb`, `#rrggbb` (the `#` is optional) or an [r, g, b] triple of 0–255 channels. */
export type ColorInput = string | Rgb;

export interface PaletteOptions {
  /** Number of colours wanted. Default 5. Fewer are returned for images with fewer colours. */
  k?: number;
  /** Pixels sampled (stratified). Default 4000. Every pixel is used for smaller images. */
  sample?: number;
  /** Seed of the sampling and k-means++ seeding. Default 1. */
  seed?: number;
  /** Lloyd iterations cap. Default 20. */
  maxIterations?: number;
  /** Pixels with an alpha below this are ignored (transparent background). Default 128. */
  alphaThreshold?: number;
}

export interface PaletteSwatch {
  hex: string;
  rgb: Rgb;
  lab: Lab;
  /** Share of the sampled opaque pixels in this cluster, in (0, 1]. */
  weight: number;
}

/* ------------------------------------------------------------------------------------------ */
/* Colour conversions (sRGB, D65)                                                              */
/* ------------------------------------------------------------------------------------------ */

const SRGB_TO_LINEAR = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// CIE constants (exact rational forms) and the D65 reference white.
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;
const XN = 0.95047;
const YN = 1;
const ZN = 1.08883;

function labF(t: number): number {
  return t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

/** sRGB (0–255 channels) → CIELAB (D65). */
export function rgbToLab(rgb: Rgb): Lab {
  const r = SRGB_TO_LINEAR[clampByte(rgb[0])] ?? 0;
  const g = SRGB_TO_LINEAR[clampByte(rgb[1])] ?? 0;
  const b = SRGB_TO_LINEAR[clampByte(rgb[2])] ?? 0;
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = labF(x / XN);
  const fy = labF(y / YN);
  const fz = labF(z / ZN);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIELAB (D65) → sRGB, out-of-gamut colours clamped to 0–255. */
export function labToRgb(lab: Lab): Rgb {
  const [l, a, bb] = lab;
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - bb / 200;
  const xr = fx ** 3 > EPSILON ? fx ** 3 : (116 * fx - 16) / KAPPA;
  const yr = l > KAPPA * EPSILON ? fy ** 3 : l / KAPPA;
  const zr = fz ** 3 > EPSILON ? fz ** 3 : (116 * fz - 16) / KAPPA;
  const x = xr * XN;
  const y = yr * YN;
  const z = zr * ZN;
  return [
    linearToSrgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
    linearToSrgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
    linearToSrgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
  ];
}

/** CIE76 colour difference (Euclidean distance in CIELAB). */
export function deltaE(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** `#rrggbb` (lower case). */
export function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map((c) => clampByte(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Parses `#rgb` / `#rrggbb` (with or without `#`); throws on anything else. */
export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex colour: ${hex}`);
  let digits = m[1] as string;
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join('');
  const n = Number.parseInt(digits, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toRgb(color: ColorInput): Rgb {
  return typeof color === 'string' ? hexToRgb(color) : color;
}

function clampByte(c: number): number {
  return Math.min(255, Math.max(0, Math.round(c)));
}

/* ------------------------------------------------------------------------------------------ */
/* WCAG contrast                                                                               */
/* ------------------------------------------------------------------------------------------ */

/** WCAG relative luminance in [0, 1]. */
export function relativeLuminance(color: ColorInput): number {
  const [r, g, b] = toRgb(color);
  return (
    0.2126 * (SRGB_TO_LINEAR[clampByte(r)] ?? 0) +
    0.7152 * (SRGB_TO_LINEAR[clampByte(g)] ?? 0) +
    0.0722 * (SRGB_TO_LINEAR[clampByte(b)] ?? 0)
  );
}

/** WCAG contrast ratio, from 1 (identical) to 21 (black on white). Order does not matter. */
export function contrastRatio(a: ColorInput, b: ColorInput): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Whether two colours meet a WCAG contrast level: AA needs 4.5:1 (3:1 for large text), AAA
 * needs 7:1 (4.5:1 for large text).
 */
export function meetsContrast(
  a: ColorInput,
  b: ColorInput,
  level: 'AA' | 'AAA' = 'AA',
  largeText = false,
): boolean {
  const min = level === 'AA' ? (largeText ? 3 : 4.5) : largeText ? 4.5 : 7;
  return contrastRatio(a, b) >= min;
}

/**
 * The candidate ink with the highest contrast on `background` (black or white by default),
 * e.g. to label a palette swatch.
 */
export function readableInk(
  background: ColorInput,
  candidates: readonly string[] = ['#000000', '#ffffff'],
): string {
  let best = candidates[0];
  if (best === undefined) throw new Error('readableInk needs at least one candidate');
  let bestRatio = -1;
  for (const ink of candidates) {
    const ratio = contrastRatio(background, ink);
    if (ratio > bestRatio) {
      best = ink;
      bestRatio = ratio;
    }
  }
  return best;
}

/* ------------------------------------------------------------------------------------------ */
/* Palette extraction                                                                          */
/* ------------------------------------------------------------------------------------------ */

/** Dominant colours of an RGBA pixel buffer (e.g. `ImageData.data`) as `#rrggbb`, most dominant first. */
export function extractPalette(
  rgba: Uint8ClampedArray | Uint8Array,
  options: PaletteOptions = {},
): string[] {
  return extractSwatches(rgba, options).map((s) => s.hex);
}

/** Like `extractPalette`, with the RGB/Lab value and the weight of each colour. */
export function extractSwatches(
  rgba: Uint8ClampedArray | Uint8Array,
  options: PaletteOptions = {},
): PaletteSwatch[] {
  if (rgba.length % 4 !== 0) throw new RangeError('RGBA buffer length must be a multiple of 4');
  const k = options.k ?? 5;
  if (!Number.isInteger(k) || k < 1) throw new RangeError(`k must be a positive integer: ${k}`);
  const sample = Math.max(1, Math.floor(options.sample ?? 4000));
  const maxIterations = Math.max(1, options.maxIterations ?? 20);
  const alphaThreshold = options.alphaThreshold ?? 128;
  const rng = mulberry32(options.seed ?? 1);

  // 1. Deterministic stratified sampling: one pixel per stratum of n / sample pixels.
  const pixelCount = rgba.length / 4;
  const counts = new Map<number, number>();
  let opaque = 0;
  const visit = (p: number): void => {
    const o = p * 4;
    if ((rgba[o + 3] ?? 0) < alphaThreshold) return;
    const key = ((rgba[o] ?? 0) << 16) | ((rgba[o + 1] ?? 0) << 8) | (rgba[o + 2] ?? 0);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    opaque++;
  };
  if (pixelCount <= sample) for (let p = 0; p < pixelCount; p++) visit(p);
  else {
    const stride = pixelCount / sample;
    for (let i = 0; i < sample; i++) visit(Math.min(pixelCount - 1, Math.floor((i + rng()) * stride)));
  }
  if (opaque === 0) return [];

  // 2. Identical colours become one weighted point (flat artwork collapses to a few points).
  const keys = [...counts.keys()].sort((x, y) => x - y);
  const n = keys.length;
  const points = new Float64Array(n * 3);
  const weights = new Float64Array(n);
  keys.forEach((key, i) => {
    const lab = rgbToLab([(key >> 16) & 255, (key >> 8) & 255, key & 255]);
    points[i * 3] = lab[0];
    points[i * 3 + 1] = lab[1];
    points[i * 3 + 2] = lab[2];
    weights[i] = counts.get(key) ?? 0;
  });

  const centers = n <= k ? points.slice() : kMeans(points, weights, k, maxIterations, rng);
  const clusterCount = centers.length / 3;

  // 3. Final assignment → cluster weights; clusters rounding to the same hex are merged.
  const clusterWeight = new Float64Array(clusterCount);
  for (let i = 0; i < n; i++) {
    clusterWeight[nearest(points, i, centers)] += weights[i] ?? 0;
  }
  const byHex = new Map<string, PaletteSwatch>();
  for (let c = 0; c < clusterCount; c++) {
    const w = clusterWeight[c] ?? 0;
    if (w <= 0) continue;
    const lab: Lab = [centers[c * 3] ?? 0, centers[c * 3 + 1] ?? 0, centers[c * 3 + 2] ?? 0];
    const rgb = labToRgb(lab);
    const hex = rgbToHex(rgb);
    const existing = byHex.get(hex);
    if (existing) existing.weight += w / opaque;
    else byHex.set(hex, { hex, rgb, lab, weight: w / opaque });
  }
  return [...byHex.values()].sort(
    (x, y) => y.weight - x.weight || x.lab[0] - y.lab[0] || (x.hex < y.hex ? -1 : 1),
  );
}

/** Squared distance between point `i` of `points` and center `c` of `centers`. */
function dist2(points: Float64Array, i: number, centers: Float64Array, c: number): number {
  const dl = (points[i * 3] ?? 0) - (centers[c * 3] ?? 0);
  const da = (points[i * 3 + 1] ?? 0) - (centers[c * 3 + 1] ?? 0);
  const db = (points[i * 3 + 2] ?? 0) - (centers[c * 3 + 2] ?? 0);
  return dl * dl + da * da + db * db;
}

function nearest(points: Float64Array, i: number, centers: Float64Array): number {
  let best = 0;
  let bestD = Infinity;
  for (let c = 0; c < centers.length / 3; c++) {
    const d = dist2(points, i, centers, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Weighted k-means with k-means++ seeding; returns the centers (flat Lab triples). */
function kMeans(
  points: Float64Array,
  weights: Float64Array,
  k: number,
  maxIterations: number,
  rng: Rng,
): Float64Array {
  const n = weights.length;
  const centers = new Float64Array(k * 3);
  const setCenter = (c: number, i: number): void => {
    centers[c * 3] = points[i * 3] ?? 0;
    centers[c * 3 + 1] = points[i * 3 + 1] ?? 0;
    centers[c * 3 + 2] = points[i * 3 + 2] ?? 0;
  };

  // k-means++: first center ∝ weight, then ∝ weight × squared distance to the nearest center.
  setCenter(0, Math.max(0, weightedIndex(rng, weights as unknown as number[])));
  const d2 = new Float64Array(n);
  for (let i = 0; i < n; i++) d2[i] = dist2(points, i, centers, 0);
  let seeded = 1;
  const score = new Array<number>(n);
  while (seeded < k) {
    for (let i = 0; i < n; i++) score[i] = (weights[i] ?? 0) * (d2[i] ?? 0);
    const next = weightedIndex(rng, score);
    if (next < 0) break; // fewer distinct colours than k (cannot happen when n > k)
    setCenter(seeded, next);
    for (let i = 0; i < n; i++) d2[i] = Math.min(d2[i] ?? 0, dist2(points, i, centers, seeded));
    seeded++;
  }

  // Lloyd iterations.
  const assignment = new Int32Array(n).fill(-1);
  const sums = new Float64Array(seeded * 4);
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    const active = centers.subarray(0, seeded * 3);
    for (let i = 0; i < n; i++) {
      const c = nearest(points, i, active);
      if (c !== assignment[i]) {
        assignment[i] = c;
        changed = true;
      }
    }
    if (!changed && iter > 0) break;
    sums.fill(0);
    for (let i = 0; i < n; i++) {
      const c = assignment[i] ?? 0;
      const w = weights[i] ?? 0;
      sums[c * 4] = (sums[c * 4] ?? 0) + (points[i * 3] ?? 0) * w;
      sums[c * 4 + 1] = (sums[c * 4 + 1] ?? 0) + (points[i * 3 + 1] ?? 0) * w;
      sums[c * 4 + 2] = (sums[c * 4 + 2] ?? 0) + (points[i * 3 + 2] ?? 0) * w;
      sums[c * 4 + 3] = (sums[c * 4 + 3] ?? 0) + w;
    }
    for (let c = 0; c < seeded; c++) {
      const w = sums[c * 4 + 3] ?? 0;
      if (w > 0) {
        centers[c * 3] = (sums[c * 4] ?? 0) / w;
        centers[c * 3 + 1] = (sums[c * 4 + 1] ?? 0) / w;
        centers[c * 3 + 2] = (sums[c * 4 + 2] ?? 0) / w;
      } else {
        // Empty cluster: move it to the point that contributes most to the current error.
        let far = 0;
        let farScore = -1;
        for (let i = 0; i < n; i++) {
          const s = (weights[i] ?? 0) * dist2(points, i, active, assignment[i] ?? 0);
          if (s > farScore) {
            farScore = s;
            far = i;
          }
        }
        setCenter(c, far);
        assignment[far] = c;
      }
    }
  }
  return centers.slice(0, seeded * 3);
}
