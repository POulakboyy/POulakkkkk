import { describe, expect, it } from 'vitest';
import {
  CONNECTION_TEMPLATES,
  graphDistance,
  pairKey,
  randomConnection,
  tagOverlap,
  type ConnectionNote,
} from './connection.ts';
import { mulberry32 } from './rng.ts';

function note(
  id: string,
  tags: string[] = [],
  extra: Partial<ConnectionNote> = {},
): ConnectionNote {
  return { id, title: `Note ${id}`, tags, links: [], ...extra };
}

/** a — b — c — d — e (a chain) plus an isolated f. */
function chain(): ConnectionNote[] {
  return [
    note('a', [], { links: ['b'] }),
    note('b', [], { links: ['c'] }),
    note('c', [], { body: 'see [[Note d]]' }),
    note('d', [], { links: ['e'] }),
    note('e'),
    note('f'),
  ];
}

const allowed = (minDistance: number, notes: ConnectionNote[]): Set<string> => {
  const out = new Set<string>();
  for (let seed = 0; seed < 300; seed++) {
    const c = randomConnection({ notes, rng: mulberry32(seed), minDistance });
    if (c) out.add(pairKey(c.a.id, c.b.id));
  }
  return out;
};

describe('pairKey', () => {
  it('is order-independent and unambiguous', () => {
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'));
    expect(pairKey('a,b', 'c')).not.toBe(pairKey('a', 'b,c'));
  });
});

describe('tagOverlap', () => {
  it('computes a case/accent-insensitive Jaccard index', () => {
    expect(tagOverlap([], [])).toBe(0);
    expect(tagOverlap(['Idée', '#design'], ['idee', 'design'])).toBe(1);
    expect(tagOverlap(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
    expect(tagOverlap(['a'], [])).toBe(0);
  });
});

describe('graphDistance', () => {
  it('returns hop counts, 0 for itself and null when disconnected', () => {
    const g = new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['a', 'c'])],
      ['c', new Set(['b'])],
      ['d', new Set<string>()],
    ]);
    expect(graphDistance(g, 'a', 'a')).toBe(0);
    expect(graphDistance(g, 'a', 'c')).toBe(2);
    expect(graphDistance(g, 'a', 'd')).toBeNull();
  });
});

describe('randomConnection', () => {
  it('returns null with fewer than two eligible notes', () => {
    expect(randomConnection({ notes: [] })).toBeNull();
    expect(randomConnection({ notes: [note('a'), note('a')] })).toBeNull();
    expect(randomConnection({ notes: [note('a'), note('b', [], { sandbox: true })] })).toBeNull();
  });

  it('only pairs notes at distance >= 3 or disconnected (links and wiki links count)', () => {
    const pairs = allowed(3, chain());
    const expected = [
      ['a', 'd'],
      ['a', 'e'],
      ['b', 'e'],
      ['a', 'f'],
      ['b', 'f'],
      ['c', 'f'],
      ['d', 'f'],
      ['e', 'f'],
    ].map(([x, y]) => pairKey(x!, y!));
    expect([...pairs].sort()).toEqual(expected.sort());
  });

  it('treats links as undirected and honours a custom minDistance', () => {
    const pairs = allowed(5, chain());
    expect(pairs.has(pairKey('a', 'e'))).toBe(false); // distance 4
    expect(pairs.has(pairKey('a', 'f'))).toBe(true);
    // minDistance below 2 is raised to 2: linked notes are never paired.
    expect(allowed(0, chain()).has(pairKey('a', 'b'))).toBe(false);
  });

  it('reports the graph distance (null when disconnected)', () => {
    const notes = chain();
    for (let seed = 0; seed < 50; seed++) {
      const c = randomConnection({ notes, rng: mulberry32(seed) });
      if (!c) throw new Error('expected a connection');
      const key = pairKey(c.a.id, c.b.id);
      if (key === pairKey('a', 'd') || key === pairKey('b', 'e')) expect(c.distance).toBe(3);
      else if (key === pairKey('a', 'e')) expect(c.distance).toBe(4);
      else expect(c.distance).toBeNull();
    }
  });

  it('never proposes sandbox or vault notes', () => {
    const notes = [
      note('a'),
      note('b'),
      note('s', [], { sandbox: true }),
      note('v', [], { vaultId: 'vault-1' }),
    ];
    for (let seed = 0; seed < 50; seed++) {
      const c = randomConnection({ notes, rng: mulberry32(seed) });
      expect(pairKey(c!.a.id, c!.b.id)).toBe(pairKey('a', 'b'));
    }
  });

  it('skips pairs from history and returns null once exhausted', () => {
    const notes = [note('a'), note('b'), note('c')];
    const history: Array<[string, string]> = [];
    for (let i = 0; i < 3; i++) {
      const c = randomConnection({ notes, rng: mulberry32(i), history });
      expect(c).not.toBeNull();
      expect(history.some(([x, y]) => pairKey(x, y) === pairKey(c!.a.id, c!.b.id))).toBe(false);
      history.push([c!.b.id, c!.a.id]);
    }
    expect(randomConnection({ notes, rng: mulberry32(9), history })).toBeNull();
  });

  it('favours pairs with low tag overlap', () => {
    const notes = [
      note('a', ['x', 'y']),
      note('b', ['x', 'y']), // same tags as a
      note('c', ['z']),
    ];
    let disjoint = 0;
    const runs = 2000;
    const rng = mulberry32(11);
    for (let i = 0; i < runs; i++) {
      const c = randomConnection({ notes, rng });
      if (c!.tagOverlap === 0) disjoint++;
    }
    // Weights: 1.05 for each disjoint pair, 0.05 for the identical one.
    expect(disjoint / runs).toBeGreaterThan(0.95);
    expect(disjoint).toBeLessThan(runs); // never strictly excluded
  });

  it('reports shared tags and fills bilingual prompts', () => {
    const notes = [note('a', ['Design', 'ux']), note('b', ['design', 'audio'], { title: '  ' })];
    const c = randomConnection({ notes, rng: mulberry32(5) })!;
    expect(c.tagOverlap).toBeCloseTo(1 / 3);
    expect(c.sharedTags.map((t) => t.toLowerCase())).toEqual(['design']);
    expect(CONNECTION_TEMPLATES.map((t) => t[0])).toContain(c.templateId);
    expect(c.prompt.fr).toContain('Sans titre');
    expect(c.prompt.en).toContain('Untitled');
    expect(c.prompt.fr).toContain('Note a');
    expect(c.prompt.fr).not.toMatch(/\{[ab]\}/);
    expect(c.prompt.en).not.toMatch(/\{[ab]\}/);
  });

  it('is deterministic for a seed', () => {
    const notes = chain();
    const x = randomConnection({ notes, rng: mulberry32(123) });
    const y = randomConnection({ notes, rng: mulberry32(123) });
    expect(x).toEqual(y);
  });

  it('samples pairs when the pool exceeds maxPairs', () => {
    const notes = Array.from({ length: 200 }, (_, i) => note(`n${i}`, [`t${i % 7}`]));
    const c = randomConnection({ notes, rng: mulberry32(1), maxPairs: 50 });
    expect(c).not.toBeNull();
    expect(c!.a.id).not.toBe(c!.b.id);
  });

  it('ignores links to records outside the pool', () => {
    const notes = [note('a', [], { links: ['task-1'] }), note('b', [], { links: ['task-1'] })];
    // Both link to the same task, but paths only run through notes: they stay disconnected.
    expect(randomConnection({ notes, rng: mulberry32(1) })?.distance).toBeNull();
  });
});
