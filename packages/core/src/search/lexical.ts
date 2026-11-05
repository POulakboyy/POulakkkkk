/**
 * In-memory lexical search index with BM25F ranking (3.2 base).
 *
 * Ranking: BM25F — BM25 extended to weighted fields (Robertson, Zaragoza & Taylor, 2004,
 * "Simple BM25 extension to multiple weighted fields"; Robertson & Zaragoza, 2009, "The
 * Probabilistic Relevance Framework: BM25 and Beyond"). Each field's term frequency is
 * length-normalised, the weighted sum is saturated once, then multiplied by the term's IDF.
 *
 * Search-as-you-type: unless the query ends with whitespace, its last token is also treated
 * as a prefix and expanded to the most frequent indexed words starting with it.
 *
 * Sandbox records (5.8) are indexed but excluded from results unless explicitly requested.
 */
import type { CollectionName, Id, Timestamp } from '../model.ts';
import { excerpt, indexWords, tokenize, type Token } from './text.ts';

/** A record flattened for indexing. Build one from a domain record with `toSearchDoc`. */
export interface SearchDoc {
  id: Id;
  collection: CollectionName;
  title: string;
  body?: string;
  tags?: readonly string[];
  /** Sandbox records (5.8) are excluded from search unless `includeSandbox` is set. */
  sandbox?: boolean;
  /** Tie-breaker between equal scores: most recent first. */
  updatedAt?: Timestamp;
}

export type SearchField = 'title' | 'tags' | 'body';

export interface SearchIndexOptions {
  /** BM25F field weights. Defaults: title 3, tags 2, body 1 (title > tags > body). */
  fieldWeights?: Partial<Record<SearchField, number>>;
  /** Term-frequency saturation. Default 1.2 (the usual BM25 setting). */
  k1?: number;
  /** Length normalisation in [0, 1]. Default 0.75 (the usual BM25 setting). */
  b?: number;
  /** Max indexed words a prefix expands to (most frequent first). Default 50. */
  maxExpansions?: number;
  /** Score multiplier for prefix expansions vs an exact term match. Default 0.7. */
  prefixWeight?: number;
  /** Shortest last token that triggers prefix expansion. Default 2. */
  minPrefixLength?: number;
}

export interface SearchOptions {
  /** Max hits returned. Default 20. */
  limit?: number;
  /** Restrict to these collections. */
  collections?: readonly CollectionName[];
  /** Include sandbox records (5.8). Default false. */
  includeSandbox?: boolean;
  /** Treat the last query token as a prefix (search-as-you-type). Default true. */
  prefix?: boolean;
  /** Arbitrary extra filter on the indexed document. */
  filter?: (doc: SearchDoc) => boolean;
}

export interface SearchHit {
  id: Id;
  collection: CollectionName;
  title: string;
  score: number;
  /** Excerpt of the body around the first match ('' when the body does not match). */
  snippet: string;
  /** Index terms that matched (stemmed forms). */
  matched: string[];
}

export interface SearchIndex {
  /** Adds a document, replacing any document with the same id. */
  add(doc: SearchDoc): void;
  /** Alias of `add` that reads better at call sites reacting to edits. */
  update(doc: SearchDoc): void;
  /** Removes a document; returns false when it was not indexed. */
  remove(id: Id): boolean;
  has(id: Id): boolean;
  get(id: Id): SearchDoc | undefined;
  /** Every indexed document (in insertion order). */
  docs(): IterableIterator<SearchDoc>;
  clear(): void;
  readonly size: number;
  search(query: string, options?: SearchOptions): SearchHit[];
}

/* ------------------------------------------------------------------------------------------ */

const TITLE = 0;
const TAGS = 1;
const BODY = 2;

/** Per-field term frequencies of one term in one document. */
type FieldFreqs = [number, number, number];

/**
 * One document in one term's posting list. Postings are unordered arrays (cache-friendly to
 * scan, cheap to build); `index` is the posting's position so removal is an O(1) swap.
 */
interface Posting {
  readonly slot: number;
  /** Term frequencies per field, inline to halve allocations on large indexes. */
  title: number;
  tags: number;
  body: number;
  index: number;
}

interface Entry {
  /** Dense integer handle used by postings and the per-query score arrays. */
  readonly slot: number;
  doc: SearchDoc;
  lengths: FieldFreqs;
  terms: Map<string, Posting>;
  /** Folded surface word → its index term. */
  surfaces: Map<string, string>;
}

interface QueryClause {
  /** Candidate terms with their score multiplier. */
  terms: Map<string, number>;
}

const SNIPPET_RADIUS = 80;

export function createSearchIndex(options: SearchIndexOptions = {}): SearchIndex {
  const weights: FieldFreqs = [
    options.fieldWeights?.title ?? 3,
    options.fieldWeights?.tags ?? 2,
    options.fieldWeights?.body ?? 1,
  ];
  const k1 = options.k1 ?? 1.2;
  const b = clamp(options.b ?? 0.75, 0, 1);
  const maxExpansions = Math.max(0, options.maxExpansions ?? 50);
  const prefixWeight = options.prefixWeight ?? 0.7;
  const minPrefixLength = Math.max(1, options.minPrefixLength ?? 2);

  /** Insertion-ordered (a replaced document moves to the end, like a Map delete + set). */
  const entries = new Map<Id, Entry>();
  /** Entry by slot; freed slots are reused. */
  const slots: (Entry | undefined)[] = [];
  const freeSlots: number[] = [];
  const postings = new Map<string, Posting[]>();
  /** Folded surface word → { stemmed term, number of docs containing it }. */
  const surfaces = new Map<string, { term: string; docs: number }>();
  let sortedSurfaces: string[] | null = null;
  const totalLengths: FieldFreqs = [0, 0, 0];

  function remove(id: Id): boolean {
    const entry = entries.get(id);
    if (!entry) return false;
    entries.delete(id);
    slots[entry.slot] = undefined;
    freeSlots.push(entry.slot);
    for (const [term, posting] of entry.terms) {
      const list = postings.get(term);
      if (!list) continue;
      const moved = list.pop() as Posting;
      if (moved !== posting) {
        list[posting.index] = moved;
        moved.index = posting.index;
      }
      if (list.length === 0) postings.delete(term);
    }
    for (const surface of entry.surfaces.keys()) {
      const info = surfaces.get(surface);
      if (!info) continue;
      info.docs -= 1;
      if (info.docs <= 0) {
        surfaces.delete(surface);
        sortedSurfaces = null;
      }
    }
    for (let f = 0; f < 3; f++) totalLengths[f] = (totalLengths[f] ?? 0) - (entry.lengths[f] ?? 0);
    return true;
  }

  function add(doc: SearchDoc): void {
    remove(doc.id);
    const slot = freeSlots.pop() ?? slots.length;
    const entry: Entry = {
      slot,
      doc: { ...doc, tags: doc.tags ? [...doc.tags] : [] },
      lengths: [0, 0, 0],
      terms: new Map(),
      surfaces: new Map(),
    };
    const fields: [string, string, string] = [
      doc.title,
      (doc.tags ?? []).join(' '),
      doc.body ?? '',
    ];
    for (let f = 0; f < 3; f++) {
      for (const token of indexWords(fields[f] ?? '')) {
        entry.lengths[f] = (entry.lengths[f] ?? 0) + 1;
        let posting = entry.terms.get(token.term);
        if (!posting) {
          posting = { slot, title: 0, tags: 0, body: 0, index: 0 };
          entry.terms.set(token.term, posting);
        }
        if (f === TITLE) posting.title++;
        else if (f === TAGS) posting.tags++;
        else posting.body++;
        entry.surfaces.set(token.surface, token.term);
      }
    }
    entries.set(doc.id, entry);
    slots[slot] = entry;
    for (const [term, posting] of entry.terms) {
      let list = postings.get(term);
      if (!list) {
        list = [];
        postings.set(term, list);
      }
      posting.index = list.length;
      list.push(posting);
    }
    for (const [surface, term] of entry.surfaces) {
      const info = surfaces.get(surface);
      if (info) info.docs += 1;
      else {
        surfaces.set(surface, { term, docs: 1 });
        sortedSurfaces = null;
      }
    }
    for (let f = 0; f < 3; f++) totalLengths[f] = (totalLengths[f] ?? 0) + (entry.lengths[f] ?? 0);
  }

  function surfacesWithPrefix(prefix: string): string[] {
    if (!sortedSurfaces) sortedSurfaces = [...surfaces.keys()].sort();
    const list = sortedSurfaces;
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((list[mid] as string) < prefix) lo = mid + 1;
      else hi = mid;
    }
    const out: string[] = [];
    for (let i = lo; i < list.length; i++) {
      const s = list[i] as string;
      if (!s.startsWith(prefix)) break;
      out.push(s);
    }
    return out;
  }

  function parseQuery(query: string, prefix: boolean): QueryClause[] {
    const tokens = tokenize(query);
    const last = tokens[tokens.length - 1];
    const prefixToken =
      prefix && last && last.end === query.length && last.surface.length >= minPrefixLength
        ? last
        : undefined;
    const clauses: QueryClause[] = [];
    const seen = new Set<string>();
    for (const token of tokens) {
      if (token === prefixToken) continue;
      if (token.stop || seen.has(token.term)) continue;
      seen.add(token.term);
      clauses.push({ terms: new Map([[token.term, 1]]) });
    }
    if (prefixToken) clauses.push(prefixClause(prefixToken));
    return clauses.filter((c) => c.terms.size > 0);
  }

  function prefixClause(token: Token): QueryClause {
    const terms = new Map<string, number>();
    // A complete word typed without trailing space still counts as an exact match.
    if (!token.stop) terms.set(token.term, 1);
    const expansions = new Map<string, number>();
    for (const surface of surfacesWithPrefix(token.surface)) {
      const info = surfaces.get(surface);
      if (!info || terms.has(info.term)) continue;
      expansions.set(info.term, Math.max(expansions.get(info.term) ?? 0, info.docs));
    }
    const ranked = [...expansions.entries()]
      .sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))
      .slice(0, maxExpansions);
    for (const [term] of ranked) terms.set(term, prefixWeight);
    return { terms };
  }

  function idf(term: string): number {
    const df = postings.get(term)?.length ?? 0;
    const n = entries.size;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  /** BM25F contribution of one term to one document. */
  function termScore(posting: Posting, lengths: FieldFreqs, avg: FieldFreqs, termIdf: number) {
    let tf = 0;
    for (let f = 0; f < 3; f++) {
      const freq = f === TITLE ? posting.title : f === TAGS ? posting.tags : posting.body;
      if (freq === 0) continue;
      const norm = 1 - b + (b * (lengths[f] ?? 0)) / (avg[f] ?? 1);
      tf += ((weights[f] ?? 0) * freq) / norm;
    }
    return (termIdf * tf) / (k1 + tf);
  }

  /** Best-scoring term of each clause in `entry` (the terms reported as `matched`). */
  function matchedTerms(entry: Entry, clauses: readonly QueryClause[], avg: FieldFreqs) {
    const matched = new Set<string>();
    for (const clause of clauses) {
      let bestTerm: string | undefined;
      let bestScore = 0;
      for (const [term, multiplier] of clause.terms) {
        const posting = entry.terms.get(term);
        if (!posting) continue;
        const score = termScore(posting, entry.lengths, avg, idf(term) * multiplier);
        if (bestTerm === undefined || score > bestScore) {
          bestTerm = term;
          bestScore = score;
        }
      }
      if (bestTerm !== undefined) matched.add(bestTerm);
    }
    return matched;
  }

  function search(query: string, opts: SearchOptions = {}): SearchHit[] {
    const limit = opts.limit ?? 20;
    if (limit <= 0 || entries.size === 0) return [];
    const clauses = parseQuery(query, opts.prefix ?? true);
    if (clauses.length === 0) return [];

    const keep = docFilter(opts);
    const n = entries.size;
    const avg: FieldFreqs = [
      (totalLengths[TITLE] ?? 0) / n || 1,
      (totalLengths[TAGS] ?? 0) / n || 1,
      (totalLengths[BODY] ?? 0) / n || 1,
    ];
    // Per-slot scratch arrays: 0 = unknown, 1 = accepted, 2 = filtered out.
    const acceptance = new Uint8Array(slots.length);
    const totals = new Float64Array(slots.length);
    const clauseBest = new Float64Array(slots.length);
    /** Index (+1) of the last clause that touched the slot. */
    const clauseMark = new Int32Array(slots.length);
    const scored = new Uint8Array(slots.length);
    const candidates: number[] = [];

    for (let c = 0; c < clauses.length; c++) {
      // Within a clause (one query word and its prefix expansions) keep the best term only,
      // so a document is not rewarded for containing many words sharing a prefix.
      const touched: number[] = [];
      for (const [term, multiplier] of (clauses[c] as QueryClause).terms) {
        const list = postings.get(term);
        if (!list) continue;
        const termIdf = idf(term) * multiplier;
        for (const posting of list) {
          const slot = posting.slot;
          const entry = slots[slot] as Entry;
          let state = acceptance[slot];
          if (state === 0) {
            state = keep(entry.doc) ? 1 : 2;
            acceptance[slot] = state;
          }
          if (state === 2) continue;
          const score = termScore(posting, entry.lengths, avg, termIdf);
          if (clauseMark[slot] !== c + 1) {
            clauseMark[slot] = c + 1;
            clauseBest[slot] = score;
            touched.push(slot);
          } else if (score > (clauseBest[slot] as number)) clauseBest[slot] = score;
        }
      }
      for (const slot of touched) {
        totals[slot] = (totals[slot] as number) + (clauseBest[slot] as number);
        if (scored[slot] === 0) {
          scored[slot] = 1;
          candidates.push(slot);
        }
      }
    }

    const compare = (x: number, y: number): number => {
      const sx = totals[x] as number;
      const sy = totals[y] as number;
      if (sy !== sx) return sy - sx;
      const dx = (slots[x] as Entry).doc;
      const dy = (slots[y] as Entry).doc;
      const ux = dx.updatedAt ?? 0;
      const uy = dy.updatedAt ?? 0;
      if (uy !== ux) return uy - ux;
      return dx.id < dy.id ? -1 : dx.id > dy.id ? 1 : 0;
    };

    return topK(candidates, limit, compare).map((slot) => {
      const entry = slots[slot] as Entry;
      const doc = entry.doc;
      const terms = matchedTerms(entry, clauses, avg);
      return {
        id: doc.id,
        collection: doc.collection,
        title: doc.title,
        score: totals[slot] as number,
        snippet: makeSnippet(doc.body ?? '', terms),
        matched: [...terms],
      };
    });
  }

  return {
    add,
    update: add,
    remove,
    has: (id) => entries.has(id),
    get: (id) => entries.get(id)?.doc,
    *docs() {
      for (const entry of entries.values()) yield entry.doc;
    },
    clear() {
      entries.clear();
      slots.length = 0;
      freeSlots.length = 0;
      postings.clear();
      surfaces.clear();
      sortedSurfaces = null;
      totalLengths.fill(0);
    },
    get size() {
      return entries.size;
    },
    search,
  };
}

/**
 * The `k` smallest items under `compare`, sorted. A bounded max-heap keeps it O(n log k)
 * instead of sorting every candidate (a frequent term can match the whole index).
 */
export function topK<T>(items: readonly T[], k: number, compare: (a: T, b: T) => number): T[] {
  if (k <= 0) return [];
  if (items.length <= k) return [...items].sort(compare);
  // heap[0] is the worst item kept so far.
  const heap: T[] = [];
  const worse = (i: number, j: number): boolean => compare(heap[i] as T, heap[j] as T) > 0;
  const swap = (i: number, j: number): void => {
    const t = heap[i] as T;
    heap[i] = heap[j] as T;
    heap[j] = t;
  };
  const siftDown = (start: number): void => {
    let i = start;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let top = i;
      if (l < heap.length && worse(l, top)) top = l;
      if (r < heap.length && worse(r, top)) top = r;
      if (top === i) return;
      swap(i, top);
      i = top;
    }
  };
  for (const item of items) {
    if (heap.length < k) {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (!worse(i, parent)) break;
        swap(i, parent);
        i = parent;
      }
    } else if (compare(item, heap[0] as T) < 0) {
      heap[0] = item;
      siftDown(0);
    }
  }
  return heap.sort(compare);
}

/**
 * Predicate applying the `collections`, `includeSandbox` and `filter` options of a search, so
 * other rankers (e.g. the semantic leg of hybrid search) filter exactly like the index.
 */
export function docFilter(
  opts: Pick<SearchOptions, 'collections' | 'includeSandbox' | 'filter'>,
): (doc: SearchDoc) => boolean {
  const collections = opts.collections ? new Set(opts.collections) : undefined;
  const includeSandbox = opts.includeSandbox ?? false;
  return (doc) =>
    (includeSandbox || !doc.sandbox) &&
    (!collections || collections.has(doc.collection)) &&
    (!opts.filter || opts.filter(doc));
}

/* ------------------------------------------------------------------------------------------ */
/* Snippets and highlighting                                                                   */
/* ------------------------------------------------------------------------------------------ */

/**
 * Excerpt of `text` centred on the first token whose index term is in `terms`, cut on word
 * boundaries, with `…` where text was dropped. Returns '' when nothing matches.
 */
export function makeSnippet(
  text: string,
  terms: ReadonlySet<string>,
  radius: number = SNIPPET_RADIUS,
): string {
  if (!text || terms.size === 0) return '';
  const hit = tokenize(text).find((t) => !t.stop && terms.has(t.term));
  if (!hit) return '';
  return excerpt(text, hit.start, hit.end, radius);
}

export interface HighlightRange {
  start: number;
  end: number;
}

/**
 * Ranges of `text` that match `query` with the index's own analysis (folding, stemming and
 * prefix on the last word unless the query ends with whitespace), for UI highlighting.
 */
export function highlight(
  text: string,
  query: string,
  options: { prefix?: boolean; minPrefixLength?: number } = {},
): HighlightRange[] {
  const queryTokens = tokenize(query);
  const last = queryTokens[queryTokens.length - 1];
  const usePrefix =
    (options.prefix ?? true) &&
    last !== undefined &&
    last.end === query.length &&
    last.surface.length >= (options.minPrefixLength ?? 2);
  const terms = new Set<string>();
  for (const t of queryTokens) if (!t.stop) terms.add(t.term);
  const prefix = usePrefix ? last.surface : undefined;
  const ranges: HighlightRange[] = [];
  for (const t of tokenize(text)) {
    if (t.stop) continue;
    if (terms.has(t.term) || (prefix !== undefined && t.surface.startsWith(prefix))) {
      ranges.push({ start: t.start, end: t.end });
    }
  }
  return ranges;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
