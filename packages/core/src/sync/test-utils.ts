/** Deterministic helpers for the sync property tests (not part of the public API). */

/** Mulberry32: small, fast, seeded PRNG returning floats in [0, 1). */
export function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function int(random: () => number, max: number): number {
  return Math.floor(random() * max);
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[int(random, items.length)] as T;
}

export function shuffle<T>(random: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(random, i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** A manually advanced physical clock. */
export function manualClock(start = 1_700_000_000_000): {
  now: () => number;
  advance(ms: number): void;
  set(ms: number): void;
} {
  let t = start;
  return {
    now: () => t,
    advance(ms) {
      t += ms;
    },
    set(ms) {
      t = ms;
    },
  };
}
