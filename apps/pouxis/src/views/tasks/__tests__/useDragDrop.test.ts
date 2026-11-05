import { describe, expect, it } from 'vitest';
import { gridNavigator, linearNavigator } from '../useDragDrop.ts';

describe('zone navigators', () => {
  const zones = ['a', 'b', 'c', 'd'];

  it('moves linearly and stops at the ends', () => {
    expect(linearNavigator('a', 'ArrowRight', zones)).toBe('b');
    expect(linearNavigator('a', 'ArrowLeft', zones)).toBe('a');
    expect(linearNavigator('d', 'ArrowDown', zones)).toBe('d');
  });

  it('moves in two dimensions on a 2×2 grid without wrapping rows', () => {
    const nav = gridNavigator(2);
    expect(nav('a', 'ArrowRight', zones)).toBe('b');
    expect(nav('b', 'ArrowRight', zones)).toBe('b');
    expect(nav('a', 'ArrowDown', zones)).toBe('c');
    expect(nav('d', 'ArrowUp', zones)).toBe('b');
    expect(nav('c', 'ArrowLeft', zones)).toBe('c');
  });
});
