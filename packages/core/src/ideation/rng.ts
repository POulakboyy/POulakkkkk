/**
 * Small, seedable pseudo-random number generation for the ideation engine.
 *
 * Every random draw in `ideation/` goes through an `Rng` so that tests (and the UI, e.g. to
 * replay a "daily" connection) can be fully deterministic. `Math.random` satisfies the type.
 */

/** A source of uniformly distributed numbers in [0, 1). `Math.random` is a valid `Rng`. */
export type Rng = () => number;

/**
 * Mulberry32 — a fast 32-bit PRNG (Tommy Ettinger, public domain). Statistically good enough
 * for UI randomness and sampling; NOT suitable for cryptography.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 32-bit seed from a string (FNV-1a), e.g. `mulberry32(seedFrom('2026-10-08'))`. */
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Integer in [0, n). Returns 0 when `n <= 1`. */
export function randomInt(rng: Rng, n: number): number {
  if (n <= 1) return 0;
  // Guard against a non-conforming rng returning exactly 1.
  return Math.min(n - 1, Math.floor(rng() * n));
}

/** Uniformly picked element, or `undefined` for an empty list. */
export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  return items.length === 0 ? undefined : items[randomInt(rng, items.length)];
}

/**
 * Index drawn with probability proportional to `weights[i]` (non-positive and non-finite
 * weights never win). Returns -1 when no weight is positive.
 */
export function weightedIndex(rng: Rng, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) if (w > 0 && Number.isFinite(w)) total += w;
  if (total <= 0) return -1;
  let target = rng() * total;
  let last = -1;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i] ?? 0;
    if (!(w > 0 && Number.isFinite(w))) continue;
    last = i;
    target -= w;
    if (target < 0) return i;
  }
  // Floating-point rounding can leave a tiny remainder: fall back to the last eligible index.
  return last;
}

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}
