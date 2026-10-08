/**
 * Seedable PRNG so that layouts are reproducible: the same graph and seed always give the same
 * picture on every device (important for sync and for tests).
 */

/** Uniform numbers in [0, 1). */
export type Random = () => number;

/** Mulberry32 (Tommy Ettinger, public domain): fast, 32-bit state, good enough for layouts. */
export function createRandom(seed: number): Random {
  let state = Math.floor(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic integer hash of two indices, used to break ties between coincident points. */
export function hashPair(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}
