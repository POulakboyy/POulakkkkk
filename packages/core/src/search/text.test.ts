import { describe, expect, it } from 'vitest';
import { analyze, excerpt, fold, normalizeTitle, stem, STOPWORDS, tokenize } from './text.ts';

describe('fold', () => {
  it('lower-cases and strips diacritics and ligatures', () => {
    expect(fold('Écrire l’Œuvre')).toBe('ecrire l’oeuvre');
    expect(fold('Straße Æsir')).toBe('strasse aesir');
    expect(fold('İstanbul')).toBe('istanbul');
    expect(fold('été')).toBe('ete'); // already-decomposed input
  });

  it('normalises titles for comparison', () => {
    expect(normalizeTitle('  Idées   de  Projet ')).toBe('idees de projet');
  });
});

describe('tokenize', () => {
  it('splits on punctuation, keeps offsets in the original text', () => {
    const text = "L'idée du mind-map";
    const tokens = tokenize(text);
    expect(tokens.map((t) => t.surface)).toEqual(['idee', 'du', 'mind', 'map']);
    for (const t of tokens) expect(fold(text.slice(t.start, t.end))).toBe(t.surface);
  });

  it('flags stop words, drops single letters, keeps single digits', () => {
    const tokens = tokenize('the plan a 3 et le');
    expect(tokens.map((t) => [t.surface, t.stop])).toEqual([
      ['the', true],
      ['plan', false],
      ['3', false],
      ['et', true],
      ['le', true],
    ]);
  });

  it('drops absurdly long tokens', () => {
    expect(tokenize(`ok ${'x'.repeat(60)}`).map((t) => t.surface)).toEqual(['ok']);
  });

  it('analyze returns stemmed non-stop terms', () => {
    expect(analyze('Les idées et les notes')).toEqual(['ide', 'not']);
  });

  it('includes FR and EN stop words', () => {
    for (const w of ['les', 'avec', 'etre', 'the', 'with', 'would'])
      expect(STOPWORDS.has(w)).toBe(true);
  });
});

describe('stem', () => {
  it.each([
    ['notes', 'not'],
    ['note', 'not'],
    ['note', stem('notee')],
    ['idees', 'ide'],
    ['idee', 'ide'],
    ['stories', 'stori'],
    ['story', 'stori'],
    ['planning', 'plan'],
    ['planned', 'plan'],
    ['plan', 'plan'],
    ['journaux', 'journal'],
    ['journal', 'journal'],
    ['chateaux', stem('chateau')],
    ['string', 'string'],
    ['class', 'clas'],
    ['v2', 'v2'],
    ['2026', '2026'],
    ['art', 'art'],
  ])('%s → %s', (input, expected) => {
    expect(stem(input)).toBe(expected);
  });
});

describe('excerpt', () => {
  const text = 'one two three four five six seven eight nine ten';

  it('cuts on word boundaries with ellipses', () => {
    const start = text.indexOf('five');
    expect(excerpt(text, start, start + 4, 6)).toBe('…four five six…');
  });

  it('returns the whole text when it fits', () => {
    expect(excerpt('short  text', 0, 5, 50)).toBe('short text');
  });

  it('omits the ellipsis when only whitespace was dropped', () => {
    expect(excerpt('   word   ', 3, 7, 1)).toBe('word');
  });
});
