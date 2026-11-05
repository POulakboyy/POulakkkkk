import { describe, expect, it } from 'vitest';
import { NBSP, NNBSP, typeset, typesetDict } from './typography.ts';

describe('typeset', () => {
  it('applies French spacing rules', () => {
    expect(typeset('Un verre d’eau ?', 'fr')).toBe(`Un verre d’eau${NNBSP}?`);
    expect(typeset('Bravo !', 'fr')).toBe(`Bravo${NNBSP}!`);
    expect(typeset('A ; B', 'fr')).toBe(`A${NNBSP}; B`);
    expect(typeset('Résultat : {value}', 'fr')).toBe(`Résultat${NBSP}: {value}`);
    expect(typeset('Attend « {title} »', 'fr')).toBe(`Attend «${NBSP}{title}${NBSP}»`);
  });

  it('leaves punctuation without a preceding space alone', () => {
    expect(typeset('https://exemple.fr', 'fr')).toBe('https://exemple.fr');
    expect(typeset('Focus ({key})', 'fr')).toBe('Focus ({key})');
  });

  it('keeps the middle dot attached to the previous word in every locale', () => {
    expect(typeset('Libre · {duration}', 'en')).toBe(`Libre${NBSP}· {duration}`);
    expect(typeset('Free · 1 hr', 'fr')).toBe(`Free${NBSP}· 1 hr`);
  });

  it('does not apply French rules to English', () => {
    expect(typeset('Why here?', 'en')).toBe('Why here?');
    expect(typeset('Sync status: {status}', 'en')).toBe('Sync status: {status}');
  });

  it('keeps ICU syntax intact', () => {
    const msg = '{count, plural, one {Une tâche ?} other {# tâches ?}}';
    expect(typeset(msg, 'fr')).toBe(
      `{count, plural, one {Une tâche${NNBSP}?} other {# tâches${NNBSP}?}}`,
    );
  });
});

describe('typesetDict', () => {
  it('typesets every leaf and preserves the shape', () => {
    const dict = { a: 'Oui ?', b: { c: 'Non !', d: 'Rien' } };
    expect(typesetDict(dict, 'fr')).toEqual({
      a: `Oui${NNBSP}?`,
      b: { c: `Non${NNBSP}!`, d: 'Rien' },
    });
    expect(dict.a).toBe('Oui ?');
  });
});
