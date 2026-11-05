import { describe, expect, it } from 'vitest';
import {
  createSearchIndex,
  docFilter,
  highlight,
  makeSnippet,
  type SearchDoc,
  type SearchOptions,
} from './lexical.ts';

function doc(id: string, title: string, body = '', extra: Partial<SearchDoc> = {}): SearchDoc {
  return { id, collection: 'notes', title, body, ...extra };
}

function ids(
  index: ReturnType<typeof createSearchIndex>,
  q: string,
  opts: SearchOptions = {},
): string[] {
  return index.search(q, opts).map((h) => h.id);
}

describe('createSearchIndex', () => {
  it('finds documents through folding, stop words and stemming (FR/EN)', () => {
    const index = createSearchIndex();
    index.add(doc('1', 'Mes idées de projet', 'Écrire un roman'));
    index.add(doc('2', 'Planning', 'The planned stories'));
    expect(ids(index, 'IDEE ')).toEqual(['1']);
    expect(ids(index, 'ecrire ')).toEqual(['1']);
    expect(ids(index, 'story plan ')).toEqual(['2']);
    expect(ids(index, 'les et the ')).toEqual([]);
    expect(ids(index, '')).toEqual([]);
  });

  it('weights title > tags > body', () => {
    const index = createSearchIndex();
    index.add(doc('body', 'Alpha', 'jardin'));
    index.add(doc('tags', 'Beta', '', { tags: ['jardin'] }));
    index.add(doc('title', 'Jardin', ''));
    expect(ids(index, 'jardin ')).toEqual(['title', 'tags', 'body']);
  });

  it('honours custom field weights', () => {
    const index = createSearchIndex({ fieldWeights: { title: 0.1, body: 5 } });
    index.add(doc('body', 'Alpha', 'jardin'));
    index.add(doc('title', 'Jardin', 'zzz'));
    expect(ids(index, 'jardin ')[0]).toBe('body');
  });

  it('ranks rarer terms higher (IDF) and sums query terms', () => {
    const index = createSearchIndex();
    index.add(doc('a', 'common rare'));
    index.add(doc('b', 'common'));
    index.add(doc('c', 'common'));
    expect(ids(index, 'common rare ')[0]).toBe('a');
    const [first, second] = index.search('common rare ');
    expect(first!.score).toBeGreaterThan(second!.score);
    expect(first!.matched.sort()).toEqual(['common', 'rar'].sort());
  });

  it('expands the last token as a prefix unless the query ends with a space', () => {
    const index = createSearchIndex();
    index.add(doc('1', 'Photographie'));
    index.add(doc('2', 'Photo'));
    expect(ids(index, 'phot').sort()).toEqual(['1', '2']);
    expect(ids(index, 'photo')[0]).toBe('2'); // exact beats expansion
    expect(ids(index, 'phot ')).toEqual([]);
    expect(ids(index, 'phot', { prefix: false })).toEqual([]);
    expect(ids(index, 'p')).toEqual([]); // below minPrefixLength
  });

  it('caps prefix expansions', () => {
    const index = createSearchIndex({ maxExpansions: 1 });
    index.add(doc('1', 'cartable'));
    index.add(doc('2', 'carton'));
    index.add(doc('3', 'carton'));
    expect(ids(index, 'car')).toEqual(['2', '3']);
  });

  it('excludes sandbox documents unless asked', () => {
    const index = createSearchIndex();
    index.add(doc('1', 'brouillon'));
    index.add(doc('2', 'brouillon', '', { sandbox: true }));
    expect(ids(index, 'brouillon ')).toEqual(['1']);
    expect(ids(index, 'brouillon ', { includeSandbox: true }).sort()).toEqual(['1', '2']);
  });

  it('filters by collection and custom predicate', () => {
    const index = createSearchIndex();
    index.add(doc('n', 'rapport'));
    index.add(doc('t', 'rapport', '', { collection: 'tasks' }));
    expect(ids(index, 'rapport ', { collections: ['tasks'] })).toEqual(['t']);
    expect(ids(index, 'rapport ', { filter: (d) => d.id === 'n' })).toEqual(['n']);
  });

  it('applies the limit and breaks ties by recency then id', () => {
    const index = createSearchIndex();
    index.add(doc('b', 'pareil', '', { updatedAt: 1 }));
    index.add(doc('a', 'pareil', '', { updatedAt: 1 }));
    index.add(doc('c', 'pareil', '', { updatedAt: 5 }));
    expect(ids(index, 'pareil ')).toEqual(['c', 'a', 'b']);
    expect(ids(index, 'pareil ', { limit: 1 })).toEqual(['c']);
    expect(ids(index, 'pareil ', { limit: 0 })).toEqual([]);
  });

  it('updates and removes documents', () => {
    const index = createSearchIndex();
    index.add(doc('1', 'ancien titre'));
    index.update(doc('1', 'nouveau titre'));
    expect(index.size).toBe(1);
    expect(ids(index, 'ancien ')).toEqual([]);
    expect(ids(index, 'anc')).toEqual([]); // stale prefix surfaces are dropped
    expect(ids(index, 'nouveau ')).toEqual(['1']);
    expect(index.get('1')?.title).toBe('nouveau titre');
    expect(index.remove('1')).toBe(true);
    expect(index.remove('1')).toBe(false);
    expect(index.has('1')).toBe(false);
    expect(ids(index, 'titre ')).toEqual([]);
  });

  it('copies documents and lists them; clear empties the index', () => {
    const index = createSearchIndex();
    const tags = ['x'];
    index.add(doc('1', 'Un', '', { tags }));
    tags.push('y');
    expect(index.get('1')?.tags).toEqual(['x']);
    index.add(doc('2', 'Deux'));
    expect([...index.docs()].map((d) => d.id)).toEqual(['1', '2']);
    index.clear();
    expect(index.size).toBe(0);
    expect(ids(index, 'un ')).toEqual([]);
  });

  it('returns a snippet around the first body match', () => {
    const index = createSearchIndex();
    const body = `${'intro '.repeat(40)}le concept clé est ici ${'outro '.repeat(40)}`;
    index.add(doc('1', 'Titre', body));
    const [hit] = index.search('concept ');
    expect(hit!.snippet).toContain('concept');
    expect(hit!.snippet.startsWith('…')).toBe(true);
    expect(hit!.snippet.endsWith('…')).toBe(true);
    expect(index.search('titre ')[0]!.snippet).toBe('');
  });

  it('stays fast on a few thousand documents', () => {
    const index = createSearchIndex();
    const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];
    for (let i = 0; i < 5000; i++) {
      index.add(
        doc(`d${i}`, `${words[i % 8]} ${i}`, `${words[(i * 3) % 8]} ${words[(i * 5) % 8]}`),
      );
    }
    const t = performance.now();
    for (let i = 0; i < 50; i++) index.search('gam');
    expect((performance.now() - t) / 50).toBeLessThan(50);
  });
});

describe('docFilter', () => {
  it('combines sandbox, collections and filter', () => {
    const keep = docFilter({ collections: ['notes'], filter: (d) => d.title !== 'no' });
    expect(keep(doc('1', 'yes'))).toBe(true);
    expect(keep(doc('1', 'no'))).toBe(false);
    expect(keep(doc('1', 'yes', '', { sandbox: true }))).toBe(false);
    expect(keep(doc('1', 'yes', '', { collection: 'tasks' }))).toBe(false);
  });
});

describe('makeSnippet / highlight', () => {
  it('makeSnippet returns empty without a match', () => {
    expect(makeSnippet('', new Set(['x']))).toBe('');
    expect(makeSnippet('abc def', new Set())).toBe('');
    expect(makeSnippet('abc def', new Set(['zzz']))).toBe('');
  });

  it('highlights stems and the trailing prefix in the original text', () => {
    const text = 'Les Idées photographiques';
    const ranges = highlight(text, 'idee photo');
    expect(ranges.map((r) => text.slice(r.start, r.end))).toEqual(['Idées', 'photographiques']);
    expect(highlight(text, 'photo ')).toEqual([]);
    expect(highlight(text, 'photo', { prefix: false })).toEqual([]);
  });
});
