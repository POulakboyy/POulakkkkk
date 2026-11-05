import { describe, expect, it } from 'vitest';
import {
  CONSTRAINT_CATEGORIES,
  CONSTRAINTS,
  drawConstraint,
  getConstraint,
  type ConstraintCategory,
} from './constraints.ts';
import { mulberry32 } from './rng.ts';

describe('constraint library', () => {
  it('holds at least 60 bilingual constraints with unique ids', () => {
    expect(CONSTRAINTS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(CONSTRAINTS.map((c) => c.id)).size).toBe(CONSTRAINTS.length);
    for (const c of CONSTRAINTS) {
      expect(c.id.startsWith(`${c.category}-`)).toBe(true);
      expect(c.text.fr.trim()).not.toBe('');
      expect(c.text.en.trim()).not.toBe('');
      expect(c.text.fr).not.toBe(c.text.en);
    }
  });

  it('covers every category', () => {
    for (const { id } of CONSTRAINT_CATEGORIES) {
      expect(CONSTRAINTS.filter((c) => c.category === id).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('looks constraints up by id', () => {
    const first = CONSTRAINTS[0]!;
    expect(getConstraint(first.id)).toBe(first);
    expect(getConstraint('nope')).toBeUndefined();
  });
});

describe('drawConstraint', () => {
  it('is deterministic for a seed', () => {
    expect(drawConstraint({ rng: mulberry32(4) })).toBe(drawConstraint({ rng: mulberry32(4) }));
  });

  it('filters by one or several categories', () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 30; i++)
      expect(drawConstraint({ rng, category: 'time' })!.category).toBe('time');
    const allowed: ConstraintCategory[] = ['user', 'emotion'];
    for (let i = 0; i < 30; i++) {
      expect(allowed).toContain(drawConstraint({ rng, category: allowed })!.category);
    }
  });

  it('never repeats excluded ids and returns null once exhausted', () => {
    const rng = mulberry32(8);
    const drawn: string[] = [];
    for (;;) {
      const c = drawConstraint({ rng, exclude: drawn, category: 'scale' });
      if (!c) break;
      expect(drawn).not.toContain(c.id);
      drawn.push(c.id);
    }
    expect(drawn.length).toBe(CONSTRAINTS.filter((c) => c.category === 'scale').length);
  });

  it('returns null for an empty category selection', () => {
    expect(drawConstraint({ category: [] })).toBeNull();
  });
});
