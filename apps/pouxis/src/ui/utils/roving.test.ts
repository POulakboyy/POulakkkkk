import { describe, expect, it } from 'vitest';
import { nextRovingIndex, typeaheadIndex } from './roving.ts';

describe('nextRovingIndex', () => {
  it('moves horizontally and wraps', () => {
    expect(nextRovingIndex(0, 'ArrowRight', 3)).toBe(1);
    expect(nextRovingIndex(2, 'ArrowRight', 3)).toBe(0);
    expect(nextRovingIndex(0, 'ArrowLeft', 3)).toBe(2);
  });

  it('ignores the other axis and unknown keys', () => {
    expect(nextRovingIndex(0, 'ArrowDown', 3)).toBeNull();
    expect(nextRovingIndex(0, 'ArrowRight', 3, { orientation: 'vertical' })).toBeNull();
    expect(nextRovingIndex(0, 'a', 3)).toBeNull();
  });

  it('jumps with Home/End and skips disabled items', () => {
    const isDisabled = (i: number) => i === 0 || i === 3;
    expect(nextRovingIndex(2, 'Home', 4, { isDisabled })).toBe(1);
    expect(nextRovingIndex(1, 'End', 4, { isDisabled })).toBe(2);
    expect(nextRovingIndex(1, 'ArrowRight', 4, { isDisabled })).toBe(2);
    expect(nextRovingIndex(2, 'ArrowRight', 4, { isDisabled })).toBe(1);
  });

  it('mirrors arrows in RTL and can stop at the ends', () => {
    expect(nextRovingIndex(0, 'ArrowLeft', 3, { rtl: true })).toBe(1);
    expect(nextRovingIndex(2, 'ArrowRight', 3, { loop: false })).toBe(2);
  });
});

describe('typeaheadIndex', () => {
  const labels = ['Modifier', 'Dupliquer', 'Déplacer', 'Épingler', 'Supprimer'];

  it('finds the next match after the current item, accent-insensitive', () => {
    expect(typeaheadIndex(labels, 'd', 0)).toBe(1);
    expect(typeaheadIndex(labels, 'd', 1)).toBe(2);
    expect(typeaheadIndex(labels, 'e', 0)).toBe(3);
  });

  it('matches multi-letter prefixes from the current item', () => {
    expect(typeaheadIndex(labels, 'dep', 0)).toBe(2);
    expect(typeaheadIndex(labels, 'zz', 0)).toBeNull();
  });

  it('cycles on a repeated letter and skips disabled items', () => {
    expect(typeaheadIndex(labels, 'dd', 1)).toBe(2);
    expect(typeaheadIndex(labels, 'd', 0, (i) => i === 1)).toBe(2);
  });
});
