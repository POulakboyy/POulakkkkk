/**
 * Hybrid search (3.2): BM25F lexical ranking fused with semantic similarity from an
 * on-device embedding model, through Reciprocal Rank Fusion (Cormack, Clarke & Büttcher,
 * 2009, "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning
 * Methods", SIGIR). RRF only needs ranks, so BM25 scores and cosine similarities never have
 * to be put on a common scale.
 *
 * The embedding model is a plug-in (`Embedder`): without one, hybrid search is exactly the
 * lexical search. Vectors are computed lazily by `flush()` and can be persisted with
 * `exportVectors()` / `importVectors()` so a model never re-embeds unchanged documents.
 */
import type { Id } from '../model.ts';
import {
  docFilter,
  type SearchDoc,
  type SearchHit,
  type SearchIndex,
  type SearchOptions,
} from './lexical.ts';
import { excerpt } from './text.ts';

/** On-device text embedding model. */
export interface Embedder {
  /** Model identifier; persisted vectors from another model are discarded on import. */
  readonly id?: string;
  /** One vector per input text, in order. All vectors must share one dimension. */
  embed(texts: readonly string[]): Promise<Float32Array[]>;
}

export interface HybridSearchOptions {
  index: SearchIndex;
  embedder?: Embedder;
  /** RRF constant k in 1 / (k + rank). Default 60, the value used by Cormack et al. */
  rrfK?: number;
  /** Results taken from each ranking before fusion. Default 50. */
  candidates?: number;
  /** Cosine similarity a document must exceed to be a semantic candidate. Default 0. */
  minSimilarity?: number;
  /** Texts per `embed()` call during `flush()`. Default 32. */
  batchSize?: number;
  /** Characters of a document sent to the model (title, tags, then body). Default 2000. */
  maxChars?: number;
  /** Receives embedder failures during `search()`, which then falls back to lexical. */
  onError?: (error: unknown) => void;
}

export interface HybridHit extends SearchHit {
  /** 1-based rank in the lexical ranking, when the document is there. */
  lexicalRank?: number;
  /** 1-based rank in the semantic ranking, when the document is there. */
  semanticRank?: number;
  /** Cosine similarity with the query, when computed. */
  similarity?: number;
}

export interface StoredVector {
  id: Id;
  /** Hash of the embedded text: a mismatch means the document changed and is re-embedded. */
  hash: string;
  vector: Float32Array;
}

export interface VectorExport {
  model?: string;
  vectors: StoredVector[];
}

export interface HybridSearch {
  readonly index: SearchIndex;
  /** True when an embedder is plugged in. */
  readonly semantic: boolean;
  add(doc: SearchDoc): void;
  update(doc: SearchDoc): void;
  remove(id: Id): boolean;
  /** Number of indexed documents whose vector is missing or stale. */
  pending(): number;
  /**
   * Embeds every indexed document whose vector is missing or stale and drops vectors of
   * removed documents. Concurrent calls share one run. Rejects if the embedder fails.
   */
  flush(): Promise<void>;
  exportVectors(): VectorExport;
  /** Restores persisted vectors (ignored if they come from another model). */
  importVectors(data: VectorExport): void;
  /** Ranks with BM25F and, when vectors exist, semantic similarity fused by RRF. */
  search(query: string, options?: SearchOptions): Promise<HybridHit[]>;
}

/** Normalised copy of `v` (unit length), or null for a zero / non-finite vector. */
export function normalize(v: Float32Array): Float32Array | null {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += (v[i] ?? 0) * (v[i] ?? 0);
  const norm = Math.sqrt(sum);
  if (!(norm > 0) || !Number.isFinite(norm)) return null;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = (v[i] ?? 0) / norm;
  return out;
}

/** Cosine similarity of two vectors of the same dimension (0 if either is zero). */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new RangeError(`Dimension mismatch: ${a.length} vs ${b.length}`);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Reciprocal Rank Fusion of several rankings (best first): score(d) = Σ 1 / (k + rank(d)).
 * Returns ids by decreasing fused score; ties keep the order of first appearance.
 */
export function reciprocalRankFusion(
  rankings: readonly (readonly Id[])[],
  k: number = 60,
): Array<{ id: Id; score: number }> {
  const scores = new Map<Id, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((x, y) => y.score - x.score);
}

/** 32-bit FNV-1a hash of the text plus its length, as a compact change detector. */
function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}:${text.length.toString(36)}`;
}

export function createHybridSearch(options: HybridSearchOptions): HybridSearch {
  const { index, embedder, onError } = options;
  const rrfK = options.rrfK ?? 60;
  const candidates = Math.max(1, options.candidates ?? 50);
  const minSimilarity = options.minSimilarity ?? 0;
  const batchSize = Math.max(1, options.batchSize ?? 32);
  const maxChars = Math.max(1, options.maxChars ?? 2000);
  /** id → unit vector + hash of the text it was computed from. */
  const vectors = new Map<Id, { hash: string; vector: Float32Array }>();
  let running: Promise<void> | null = null;
  let rerun = false;

  function embedText(doc: SearchDoc): string {
    return [doc.title, (doc.tags ?? []).join(' '), doc.body ?? '']
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n')
      .slice(0, maxChars);
  }

  function stale(): Array<{ id: Id; text: string; hash: string }> {
    const out: Array<{ id: Id; text: string; hash: string }> = [];
    for (const doc of index.docs()) {
      const text = embedText(doc);
      if (!text) continue;
      const hash = textHash(text);
      if (vectors.get(doc.id)?.hash !== hash) out.push({ id: doc.id, text, hash });
    }
    return out;
  }

  async function embedStale(model: Embedder): Promise<void> {
    for (const id of [...vectors.keys()]) if (!index.has(id)) vectors.delete(id);
    const todo = stale();
    for (let i = 0; i < todo.length; i += batchSize) {
      const batch = todo.slice(i, i + batchSize);
      const result = await model.embed(batch.map((item) => item.text));
      if (result.length !== batch.length) {
        throw new Error(`Embedder returned ${result.length} vectors for ${batch.length} texts`);
      }
      batch.forEach((item, j) => {
        // The document may have changed or disappeared while the model was running.
        const doc = index.get(item.id);
        if (!doc || textHash(embedText(doc)) !== item.hash) return;
        const unit = normalize(result[j] as Float32Array);
        if (unit) vectors.set(item.id, { hash: item.hash, vector: unit });
      });
    }
  }

  function flush(): Promise<void> {
    if (!embedder) return Promise.resolve();
    if (running) {
      rerun = true;
      return running;
    }
    const model = embedder;
    running = (async () => {
      try {
        do {
          rerun = false;
          await embedStale(model);
        } while (rerun);
      } finally {
        running = null;
      }
    })();
    return running;
  }

  function lexicalOnly(hits: SearchHit[], limit: number): HybridHit[] {
    return hits.slice(0, limit).map((hit, i) => ({ ...hit, lexicalRank: i + 1 }));
  }

  async function search(query: string, opts: SearchOptions = {}): Promise<HybridHit[]> {
    const limit = opts.limit ?? 20;
    if (limit <= 0) return [];
    const lexical = index.search(query, { ...opts, limit: Math.max(limit, candidates) });
    if (!embedder || vectors.size === 0 || query.trim() === '') return lexicalOnly(lexical, limit);

    let semantic: Array<{ id: Id; similarity: number }>;
    try {
      const [raw] = await embedder.embed([query]);
      const q = raw ? normalize(raw) : null;
      if (!q) return lexicalOnly(lexical, limit);
      const keep = docFilter(opts);
      semantic = [];
      for (const [id, { vector }] of vectors) {
        const doc = index.get(id);
        if (!doc || !keep(doc)) continue;
        if (vector.length !== q.length) {
          throw new RangeError(`Dimension mismatch: ${vector.length} vs ${q.length}`);
        }
        let dot = 0;
        for (let i = 0; i < q.length; i++) dot += (q[i] ?? 0) * (vector[i] ?? 0);
        if (dot > minSimilarity) semantic.push({ id, similarity: dot });
      }
    } catch (error) {
      onError?.(error);
      return lexicalOnly(lexical, limit);
    }
    semantic.sort((x, y) => y.similarity - x.similarity || (x.id < y.id ? -1 : 1));
    semantic = semantic.slice(0, candidates);

    const lexicalById = new Map(lexical.map((hit, i) => [hit.id, { hit, rank: i + 1 }]));
    const semanticById = new Map(semantic.map((s, i) => [s.id, { ...s, rank: i + 1 }]));
    const fused = reciprocalRankFusion(
      [lexical.map((h) => h.id), semantic.map((s) => s.id)],
      rrfK,
    );

    const out: HybridHit[] = [];
    for (const { id, score } of fused.slice(0, limit)) {
      const lex = lexicalById.get(id);
      const sem = semanticById.get(id);
      let hit: HybridHit;
      if (lex) hit = { ...lex.hit, score, lexicalRank: lex.rank };
      else {
        const doc = index.get(id) as SearchDoc;
        const body = doc.body ?? '';
        hit = {
          id,
          collection: doc.collection,
          title: doc.title,
          score,
          snippet: body ? excerpt(body, 0, 0, 160) : '',
          matched: [],
        };
      }
      if (sem) {
        hit.semanticRank = sem.rank;
        hit.similarity = sem.similarity;
      }
      out.push(hit);
    }
    return out;
  }

  return {
    index,
    semantic: embedder !== undefined,
    add: (doc) => index.add(doc),
    update: (doc) => index.update(doc),
    remove(id) {
      vectors.delete(id);
      return index.remove(id);
    },
    pending: () => (embedder ? stale().length : 0),
    flush,
    exportVectors() {
      const out: VectorExport = { vectors: [] };
      if (embedder?.id !== undefined) out.model = embedder.id;
      for (const [id, { hash, vector }] of vectors) out.vectors.push({ id, hash, vector });
      return out;
    },
    importVectors(data) {
      if (!embedder) return;
      if (data.model !== embedder.id) return;
      for (const { id, hash, vector } of data.vectors) {
        const unit = normalize(vector);
        if (unit) vectors.set(id, { hash, vector: unit });
      }
    },
    search,
  };
}
