import { describe, expect, it } from 'vitest';
import { between, isValidOrderKey, spread } from './fractional.ts';
import { int, prng } from './test-utils.ts';

describe('fractional order keys', () => {
  it('always finds a valid key strictly between two keys', () => {
    const random = prng(9);
    const keys: string[] = [between(null, null, { random })];
    for (let i = 0; i < 2000; i++) {
      const at = int(random, keys.length + 1);
      const lo = keys[at - 1] ?? null;
      const hi = keys[at] ?? null;
      const key = between(lo, hi, { random, jitter: int(random, 3) });
      expect(isValidOrderKey(key)).toBe(true);
      if (lo !== null) expect(key > lo).toBe(true);
      if (hi !== null) expect(key < hi).toBe(true);
      keys.splice(at, 0, key);
    }
    expect([...keys].sort()).toEqual(keys);
  });

  it('stays short when appending at the end', () => {
    let key: string | null = null;
    for (let i = 0; i < 1000; i++) key = between(key, null, { jitter: 0 });
    expect((key as string).length).toBeLessThan(25);
  });

  it('jitter separates concurrent inserts at the same place', () => {
    const a = between('A', 'B', { random: prng(1) });
    const b = between('A', 'B', { random: prng(2) });
    expect(a).not.toBe(b);
    expect(between('A', 'B', { jitter: 0 })).toBe(between('A', 'B', { jitter: 0 }));
  });

  it('spreads keys evenly between bounds', () => {
    const keys = spread('1', 'z', 50);
    expect(keys).toHaveLength(50);
    expect([...keys].sort()).toEqual(keys);
    expect(new Set(keys).size).toBe(50);
    expect(keys[0]! > '1' && keys[49]! < 'z').toBe(true);
  });

  it('rejects unordered or malformed keys', () => {
    expect(() => between('b', 'a')).toThrow();
    expect(() => between('a', 'a')).toThrow();
    expect(() => between('a0', null)).toThrow();
    expect(() => between('a-', null)).toThrow();
  });
});
