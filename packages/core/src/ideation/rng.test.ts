import { describe, expect, it } from 'vitest';
import { mulberry32, pick, randomInt, seedFrom, shuffle, weightedIndex } from './rng.ts';

describe('mulberry32', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
  });

  it('stays in [0, 1) and is roughly uniform', () => {
    const rng = mulberry32(7);
    const buckets = new Array<number>(10).fill(0);
    for (let i = 0; i < 10_000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      buckets[Math.floor(x * 10)]! += 1;
    }
    for (const count of buckets) expect(count).toBeGreaterThan(850);
  });
});

describe('seedFrom', () => {
  it('hashes strings to stable unsigned 32-bit seeds', () => {
    expect(seedFrom('2026-10-08')).toBe(seedFrom('2026-10-08'));
    expect(seedFrom('a')).not.toBe(seedFrom('b'));
    expect(seedFrom('')).toBe(0x811c9dc5);
    expect(seedFrom('x')).toBeGreaterThanOrEqual(0);
  });
});

describe('randomInt / pick', () => {
  it('handles degenerate sizes and an rng returning 1', () => {
    expect(randomInt(() => 0.5, 0)).toBe(0);
    expect(randomInt(() => 0.5, 1)).toBe(0);
    expect(randomInt(() => 1, 5)).toBe(4);
    expect(pick(() => 0, [])).toBeUndefined();
    expect(pick(() => 0.99, ['a', 'b'])).toBe('b');
  });
});

describe('weightedIndex', () => {
  it('ignores non-positive and non-finite weights', () => {
    expect(weightedIndex(() => 0.5, [])).toBe(-1);
    expect(weightedIndex(() => 0.5, [0, -1, Number.NaN])).toBe(-1);
    expect(weightedIndex(() => 0, [0, Infinity, 2])).toBe(2);
    expect(weightedIndex(() => 0.999999, [1, 0, 1])).toBe(2);
  });

  it('draws proportionally to the weights', () => {
    const rng = mulberry32(3);
    const counts = [0, 0];
    for (let i = 0; i < 4000; i++) counts[weightedIndex(rng, [1, 3])]! += 1;
    expect(counts[1]! / 4000).toBeGreaterThan(0.7);
    expect(counts[1]! / 4000).toBeLessThan(0.8);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(mulberry32(1), input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
    expect(shuffle(mulberry32(1), input)).toEqual(out);
  });
});
