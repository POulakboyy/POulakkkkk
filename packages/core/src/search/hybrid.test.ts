import { describe, expect, it, vi } from 'vitest';
import {
  cosineSimilarity,
  createHybridSearch,
  normalize,
  reciprocalRankFusion,
  type Embedder,
} from './hybrid.ts';
import { createSearchIndex, type SearchDoc } from './lexical.ts';

function doc(id: string, title: string, body = '', extra: Partial<SearchDoc> = {}): SearchDoc {
  return { id, collection: 'notes', title, body, ...extra };
}

/** Toy embedder: one dimension per concept, keyword-triggered. */
const CONCEPTS = [
  ['ocean', 'mer', 'plage', 'vague'],
  ['music', 'musique', 'guitare', 'chanson'],
  ['code', 'programme', 'logiciel'],
];
function toyEmbedder(id = 'toy'): Embedder & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    id,
    calls,
    async embed(texts) {
      calls.push([...texts]);
      return texts.map((t) => {
        const lower = t.toLowerCase();
        return Float32Array.from(
          CONCEPTS.map((words) => (words.some((w) => lower.includes(w)) ? 1 : 0.01)),
        );
      });
    },
  };
}

describe('vector helpers', () => {
  it('normalize returns unit vectors or null', () => {
    const v = normalize(Float32Array.from([3, 4]))!;
    expect(v[0]).toBeCloseTo(0.6);
    expect(normalize(Float32Array.from([0, 0]))).toBeNull();
    expect(normalize(Float32Array.from([Number.NaN]))).toBeNull();
  });

  it('cosineSimilarity handles zero vectors and dimension mismatches', () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([2, 0]))).toBeCloseTo(1);
    expect(cosineSimilarity(Float32Array.from([0, 0]), Float32Array.from([1, 0]))).toBe(0);
    expect(() => cosineSimilarity(new Float32Array(2), new Float32Array(3))).toThrow(RangeError);
  });

  it('reciprocalRankFusion sums 1 / (k + rank)', () => {
    const fused = reciprocalRankFusion(
      [
        ['a', 'b', 'c'],
        ['c', 'a'],
      ],
      60,
    );
    expect(fused.map((f) => f.id)).toEqual(['a', 'c', 'b']);
    expect(fused[0]!.score).toBeCloseTo(1 / 61 + 1 / 62);
    expect(reciprocalRankFusion([])).toEqual([]);
  });
});

describe('createHybridSearch', () => {
  it('is purely lexical without an embedder', async () => {
    const hybrid = createHybridSearch({ index: createSearchIndex() });
    hybrid.add(doc('1', 'Vacances à la mer'));
    expect(hybrid.semantic).toBe(false);
    expect(hybrid.pending()).toBe(0);
    await hybrid.flush();
    const hits = await hybrid.search('mer ');
    expect(hits.map((h) => [h.id, h.lexicalRank])).toEqual([['1', 1]]);
    hybrid.importVectors({ vectors: [] });
    expect(hybrid.exportVectors()).toEqual({ vectors: [] });
  });

  it('surfaces semantic matches that share no word with the query', async () => {
    const embedder = toyEmbedder();
    const hybrid = createHybridSearch({ index: createSearchIndex(), embedder });
    hybrid.add(doc('beach', 'Journée à la plage', 'Les vagues étaient hautes'));
    hybrid.add(doc('song', 'Nouvelle chanson', 'Accords de guitare'));
    hybrid.add(doc('ocean', 'Ocean notes'));
    expect(hybrid.pending()).toBe(3);
    await hybrid.flush();
    expect(hybrid.pending()).toBe(0);
    const hits = await hybrid.search('ocean ');
    expect(hits[0]!.id).toBe('ocean'); // lexical + semantic
    expect(hits[0]!.lexicalRank).toBe(1);
    expect(hits[0]!.semanticRank).toBeDefined();
    const beach = hits.find((h) => h.id === 'beach')!;
    expect(beach.lexicalRank).toBeUndefined();
    expect(beach.similarity).toBeGreaterThan(0.9);
    expect(beach.snippet).toContain('vagues');
    expect(hits.find((h) => h.id === 'song')?.similarity ?? 0).toBeLessThan(0.1);
  });

  it('applies filters (sandbox excluded) to the semantic leg', async () => {
    const hybrid = createHybridSearch({ index: createSearchIndex(), embedder: toyEmbedder() });
    hybrid.add(doc('s', 'plage secrète', '', { sandbox: true }));
    hybrid.add(doc('t', 'mer', '', { collection: 'tasks' }));
    await hybrid.flush();
    expect((await hybrid.search('ocean')).map((h) => h.id)).toEqual(['t']);
    expect(await hybrid.search('ocean', { collections: ['notes'] })).toEqual([]);
    const all = await hybrid.search('ocean', { includeSandbox: true });
    expect(all.map((h) => h.id).sort()).toEqual(['s', 't']);
  });

  it('only re-embeds changed documents and drops removed ones', async () => {
    const embedder = toyEmbedder();
    const hybrid = createHybridSearch({ index: createSearchIndex(), embedder, batchSize: 1 });
    hybrid.add(doc('1', 'mer'));
    hybrid.add(doc('2', 'code'));
    await hybrid.flush();
    expect(embedder.calls).toHaveLength(2);
    await hybrid.flush();
    expect(embedder.calls).toHaveLength(2);
    hybrid.update(doc('2', 'logiciel libre'));
    await hybrid.flush();
    expect(embedder.calls.at(-1)).toEqual(['logiciel libre']);
    hybrid.remove('1');
    expect(hybrid.exportVectors().vectors.map((v) => v.id)).toEqual(['2']);
  });

  it('shares concurrent flushes and reruns for edits made meanwhile', async () => {
    const embedder = toyEmbedder();
    const hybrid = createHybridSearch({ index: createSearchIndex(), embedder });
    hybrid.add(doc('1', 'mer'));
    const first = hybrid.flush();
    hybrid.add(doc('2', 'code'));
    const second = hybrid.flush();
    await Promise.all([first, second]);
    expect(hybrid.pending()).toBe(0);
  });

  it('exports and re-imports vectors for the same model only', async () => {
    const a = createHybridSearch({ index: createSearchIndex(), embedder: toyEmbedder('m1') });
    a.add(doc('1', 'mer'));
    await a.flush();
    const exported = a.exportVectors();
    expect(exported.model).toBe('m1');

    const sameIndex = createSearchIndex();
    sameIndex.add(doc('1', 'mer'));
    const same = createHybridSearch({ index: sameIndex, embedder: toyEmbedder('m1') });
    same.importVectors(exported);
    expect(same.pending()).toBe(0);

    const otherIndex = createSearchIndex();
    otherIndex.add(doc('1', 'mer'));
    const other = createHybridSearch({ index: otherIndex, embedder: toyEmbedder('m2') });
    other.importVectors(exported);
    expect(other.pending()).toBe(1);
  });

  it('falls back to lexical results when the embedder fails at query time', async () => {
    const embedder = toyEmbedder();
    const onError = vi.fn();
    const hybrid = createHybridSearch({ index: createSearchIndex(), embedder, onError });
    hybrid.add(doc('1', 'mer'));
    await hybrid.flush();
    embedder.embed = async () => {
      throw new Error('model unloaded');
    };
    const hits = await hybrid.search('mer ');
    expect(hits.map((h) => h.id)).toEqual(['1']);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('rejects flush when the embedder returns the wrong number of vectors', async () => {
    const embedder: Embedder = { embed: async () => [] };
    const hybrid = createHybridSearch({ index: createSearchIndex(), embedder });
    hybrid.add(doc('1', 'mer'));
    await expect(hybrid.flush()).rejects.toThrow(/0 vectors for 1/);
  });

  it('respects limit and minSimilarity', async () => {
    const hybrid = createHybridSearch({
      index: createSearchIndex(),
      embedder: toyEmbedder(),
      minSimilarity: 0.5,
    });
    hybrid.add(doc('1', 'plage'));
    hybrid.add(doc('2', 'guitare'));
    await hybrid.flush();
    expect((await hybrid.search('ocean')).map((h) => h.id)).toEqual(['1']);
    expect(await hybrid.search('ocean', { limit: 0 })).toEqual([]);
  });
});
