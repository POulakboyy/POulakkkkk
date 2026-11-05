import { describe, expect, it } from 'vitest';
import { dayKeyOf, dayNumber, median, weekdayOf } from './internal.ts';
import { fold, keywords, normalizeTag, termWeights, weightedJaccard } from './text.ts';

describe('text helpers', () => {
  it('folds case and diacritics', () => {
    expect(fold('Éléphant ÇA')).toBe('elephant ca');
  });

  it('extracts topic keywords without stop words, numbers or short tokens', () => {
    expect(keywords("Les réunions d'équipe du lundi, encore 3 fois")).toEqual([
      'reunion',
      'equipe',
      'lundi',
    ]);
    expect(keywords('The emails were too many')).toEqual(['email', 'were', 'many']);
    expect(keywords('focus access analysis inbox travaux')).toEqual([
      'focus',
      'access',
      'analysis',
      'inbox',
      'travau',
    ]);
  });

  it('normalises tags', () => {
    expect(normalizeTag('  ##Deep   Work ')).toBe('deep work');
  });

  it('weights tag words above free text', () => {
    const w = termWeights('email overload', ['#Email', 'admin/inbox']);
    expect(Object.fromEntries(w)).toEqual({ email: 2, overload: 1, admin: 2, inbox: 2 });
  });

  it('computes the weighted Jaccard similarity', () => {
    const a = new Map([
      ['x', 2],
      ['y', 1],
    ]);
    const b = new Map([
      ['x', 1],
      ['z', 1],
    ]);
    expect(weightedJaccard(a, b)).toBeCloseTo(1 / 4, 10);
    expect(weightedJaccard(a, a)).toBe(1);
    expect(weightedJaccard(new Map(), new Map())).toBe(0);
  });
});

describe('internal helpers', () => {
  it('maps day keys to day numbers and back', () => {
    expect(dayNumber('1970-01-01')).toBe(0);
    expect(dayKeyOf(dayNumber('2028-02-29') as number)).toBe('2028-02-29');
    expect(dayNumber('2027-02-29')).toBeNull();
    expect(dayNumber('2026-3-1')).toBeNull();
    expect(weekdayOf(0)).toBe(4); // Thursday
    expect(weekdayOf(dayNumber('2026-03-02') as number)).toBe(1); // Monday
    expect(weekdayOf(-1)).toBe(3);
  });

  it('computes medians', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(() => median([])).toThrow(RangeError);
  });
});
