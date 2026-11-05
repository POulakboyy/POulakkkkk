import { describe, expect, it } from 'vitest';
import { createSearchIndex, topK, type SearchDoc, type SearchOptions } from './lexical.ts';
import { createReferenceIndex } from './lexical.reference.test-utils.ts';

/** Mulberry32, so failures are reproducible from the seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  'idée', 'idées', 'projet', 'projets', 'planning', 'planned', 'plan', 'jardin', 'écrire',
  'roman', 'story', 'stories', 'note', 'notes', 'concentration', 'concert', 'concevoir', 'le',
  'the', 'and', 'réunion', 'client', 'Œuvre', 'rapport', 'v2', '2026', 'conception', 'idéal',
];

function sentence(rand: () => number, min: number, spread: number): string {
  const n = min + Math.floor(rand() * spread);
  return Array.from({ length: n }, () => WORDS[Math.floor(rand() * WORDS.length)]).join(' ');
}

function randomDoc(rand: () => number, id: string): SearchDoc {
  return {
    id,
    collection: rand() < 0.5 ? 'notes' : 'tasks',
    title: sentence(rand, 1, 4),
    body: sentence(rand, 0, 30),
    tags: rand() < 0.5 ? [WORDS[Math.floor(rand() * WORDS.length)] as string] : [],
    sandbox: rand() < 0.1,
    // Few distinct timestamps so the updatedAt and id tie-breakers are exercised.
    updatedAt: Math.floor(rand() * 3),
  };
}

const QUERIES = ['idée', 'projet plan ', 'con', 'conc', 'story ', 'le the', 'jard', 'écrire roman', 'zzz', 'i'];

describe('createSearchIndex matches the reference implementation', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    it(`returns identical hits after random adds, updates and removals (seed ${seed})`, () => {
      const rand = rng(seed);
      const fast = createSearchIndex();
      const reference = createReferenceIndex();
      for (let step = 0; step < 400; step++) {
        const id = `d${Math.floor(rand() * 120)}`;
        if (rand() < 0.2) expect(fast.remove(id)).toBe(reference.remove(id));
        else {
          const doc = randomDoc(rand, id);
          fast.add(doc);
          reference.add(doc);
        }
        if (step % 40 === 0) {
          const options: SearchOptions[] = [
            {},
            { limit: 3 },
            { limit: 500, includeSandbox: true },
            { collections: ['tasks'], prefix: false },
            { filter: (d) => d.id.endsWith('7') },
          ];
          for (const query of QUERIES) {
            for (const opts of options) {
              expect(fast.search(query, opts)).toEqual(reference.search(query, opts));
            }
          }
        }
      }
      expect(fast.size).toBe(reference.size);
      expect([...fast.docs()]).toEqual([...reference.docs()]);
    });
  }

  it('matches with a zero prefix weight (zero-score hits are still reported)', () => {
    const fast = createSearchIndex({ prefixWeight: 0 });
    const reference = createReferenceIndex({ prefixWeight: 0 });
    for (const doc of [randomDoc(rng(9), 'a'), randomDoc(rng(10), 'b'), randomDoc(rng(11), 'c')]) {
      fast.add(doc);
      reference.add(doc);
    }
    for (const query of QUERIES) expect(fast.search(query)).toEqual(reference.search(query));
  });

  it('keeps working after clear', () => {
    const index = createSearchIndex();
    index.add({ id: 'a', collection: 'notes', title: 'Jardin' });
    index.clear();
    expect(index.search('jardin')).toEqual([]);
    index.add({ id: 'b', collection: 'notes', title: 'Jardin' });
    expect(index.search('jardin').map((h) => h.id)).toEqual(['b']);
  });
});

describe('topK', () => {
  const asc = (a: number, b: number) => a - b;

  it('returns the k smallest items in order', () => {
    const rand = rng(42);
    const items = Array.from({ length: 1000 }, () => Math.floor(rand() * 500));
    for (const k of [0, 1, 7, 20, 999, 1000, 2000]) {
      expect(topK(items, k, asc)).toEqual([...items].sort(asc).slice(0, k));
    }
  });

  it('does not mutate its input', () => {
    const items = [3, 1, 2];
    topK(items, 2, asc);
    expect(items).toEqual([3, 1, 2]);
  });
});
