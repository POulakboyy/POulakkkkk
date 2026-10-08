/**
 * Colour maths for the design system: WCAG 2.x contrast, OKLab/OKLCH, CSS `color-mix(in oklab)`
 * and colour-vision-deficiency simulation (Machado, Oliveira & Fernandes, IEEE TVCG 2009).
 *
 * Pure functions, no DOM: used by the token tests, the token build script and — at runtime —
 * by features that need to pick a readable ink for a user-chosen colour.
 */

/** sRGB channels in 0..1. */
export type Rgb = readonly [number, number, number];
/** OKLab (L in 0..1). */
export type Oklab = readonly [number, number, number];
export type CvdKind = 'protan' | 'deutan' | 'tritan';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function parseHex(value: string): Rgb {
  const m = HEX_RE.exec(value.trim());
  if (!m) throw new Error(`Not a hex colour: ${value}`);
  let h = m[1]!;
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = Number.parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function toHex(rgb: Rgb): string {
  return (
    '#' +
    rgb
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, c)) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(color: string | Rgb): number {
  const [r, g, b] = (typeof color === 'string' ? parseHex(color) : color).map(srgbToLinear) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** sRGB → OKLab (Ottosson 2020). */
export function toOklab(color: string | Rgb): Oklab {
  const [r, g, b] = (typeof color === 'string' ? parseHex(color) : color).map(srgbToLinear) as [
    number,
    number,
    number,
  ];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → sRGB, clamped to the sRGB gamut. */
export function fromOklab([L, a, b]: Oklab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((c) => Math.min(1, Math.max(0, linearToSrgb(c)))) as unknown as Rgb;
}

export function toOklch(color: string): { l: number; c: number; h: number } {
  const [l, a, b] = toOklab(color);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

/**
 * Same result as CSS `color-mix(in oklab, a <weightA * 100>%, b)` for opaque colours.
 * `weightA` is clamped to 0..1.
 */
export function mixOklab(a: string, b: string, weightA: number): string {
  const t = Math.min(1, Math.max(0, weightA));
  const la = toOklab(a);
  const lb = toOklab(b);
  return toHex(
    fromOklab([
      la[0] * t + lb[0] * (1 - t),
      la[1] * t + lb[1] * (1 - t),
      la[2] * t + lb[2] * (1 - t),
    ]),
  );
}

/** Euclidean distance in OKLab × 100 (≈ 2 is a just-noticeable difference). */
export function deltaEOk(a: string, b: string): number {
  const la = toOklab(a);
  const lb = toOklab(b);
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]) * 100;
}

// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB.
const MACHADO: Record<CvdKind, readonly (readonly [number, number, number])[]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function simulateLinear(color: string, kind: CvdKind): Rgb {
  const lin = parseHex(color).map(srgbToLinear);
  return MACHADO[kind].map((row) =>
    Math.min(1, Math.max(0, row[0] * lin[0]! + row[1] * lin[1]! + row[2] * lin[2]!)),
  ) as unknown as Rgb;
}

function oklabFromLinear([r, g, b]: Rgb): Oklab {
  return toOklab([linearToSrgb(r), linearToSrgb(g), linearToSrgb(b)]);
}

/** Simulates how a colour is perceived with full protanopia, deuteranopia or tritanopia. */
export function simulateCvd(color: string, kind: CvdKind): string {
  return toHex(simulateLinear(color, kind).map(linearToSrgb) as unknown as Rgb);
}

/**
 * OKLab ΔE × 100 between two colours as seen with a given deficiency (or normal vision when
 * `kind` is omitted). Same model and scale as the data-viz validator: target ≥ 8, floor ≥ 6
 * for adjacent series under protan/deutan, ≥ 15 under normal vision.
 */
export function cvdDeltaE(a: string, b: string, kind?: CvdKind): number {
  if (!kind) return deltaEOk(a, b);
  const la = oklabFromLinear(simulateLinear(a, kind));
  const lb = oklabFromLinear(simulateLinear(b, kind));
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]) * 100;
}

/** Returns the candidate with the highest contrast against `background`. */
export function readableInk(
  background: string,
  candidates: readonly string[] = ['#1c1b18', '#ffffff'],
): string {
  let best = candidates[0] ?? '#000000';
  let bestRatio = 0;
  for (const c of candidates) {
    const r = contrastRatio(c, background);
    if (r > bestRatio) {
      best = c;
      bestRatio = r;
    }
  }
  return best;
}
