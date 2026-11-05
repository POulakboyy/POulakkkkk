/**
 * Test-only reference: the original, straightforward BM25F index (Maps everywhere, full sort).
 * The optimised `createSearchIndex` must return exactly the same hits; see lexical.equivalence.test.ts.
 */
import type { Id } from '../model.ts';
import { docFilter, makeSnippet } from './lexical.ts';
import type { SearchDoc, SearchHit, SearchIndex, SearchIndexOptions, SearchOptions } from './lexical.ts';
import { tokenize, type Token } from './text.ts';

const TITLE = 0;
const TAGS = 1;
const BODY = 2;
type FieldFreqs = [number, number, number];
interface Entry {
  doc: SearchDoc;
  lengths: FieldFreqs;
  terms: Map<string, FieldFreqs>;
  surfaces: Map<string, string>;
}
interface QueryClause {
  terms: Map<string, number>;
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createReferenceIndex(options: SearchIndexOptions = {}): SearchIndex {
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

  const entries = new Map<Id, Entry>();
  /** term → (doc id → per-field frequencies). */
  const postings = new Map<string, Map<Id, FieldFreqs>>();
  /** Folded surface word → { stemmed term, number of docs containing it }. */
  const surfaces = new Map<string, { term: string; docs: number }>();
  let sortedSurfaces: string[] | null = null;
  const totalLengths: FieldFreqs = [0, 0, 0];

  function remove(id: Id): boolean {
    const entry = entries.get(id);
    if (!entry) return false;
    entries.delete(id);
    for (const term of entry.terms.keys()) {
      const list = postings.get(term);
      if (!list) continue;
      list.delete(id);
      if (list.size === 0) postings.delete(term);
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
    const entry: Entry = {
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
      for (const token of tokenize(fields[f] ?? '')) {
        if (token.stop) continue;
        entry.lengths[f] = (entry.lengths[f] ?? 0) + 1;
        let freqs = entry.terms.get(token.term);
        if (!freqs) {
          freqs = [0, 0, 0];
          entry.terms.set(token.term, freqs);
        }
        freqs[f] = (freqs[f] ?? 0) + 1;
        entry.surfaces.set(token.surface, token.term);
      }
    }
    entries.set(doc.id, entry);
    for (const [term, freqs] of entry.terms) {
      let list = postings.get(term);
      if (!list) {
        list = new Map();
        postings.set(term, list);
      }
      list.set(doc.id, freqs);
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
    const df = postings.get(term)?.size ?? 0;
    const n = entries.size;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  function search(query: string, opts: SearchOptions = {}): SearchHit[] {
    const limit = opts.limit ?? 20;
    if (limit <= 0 || entries.size === 0) return [];
    const clauses = parseQuery(query, opts.prefix ?? true);
    if (clauses.length === 0) return [];

    const keep = docFilter(opts);
    const accepted = new Map<Id, boolean>();
    const accepts = (id: Id): boolean => {
      let ok = accepted.get(id);
      if (ok === undefined) {
        const doc = entries.get(id)?.doc;
        ok = doc !== undefined && keep(doc);
        accepted.set(id, ok);
      }
      return ok;
    };

    const n = entries.size;
    const avg: FieldFreqs = [
      (totalLengths[TITLE] ?? 0) / n || 1,
      (totalLengths[TAGS] ?? 0) / n || 1,
      (totalLengths[BODY] ?? 0) / n || 1,
    ];
    const scores = new Map<Id, number>();
    const matched = new Map<Id, Set<string>>();

    for (const clause of clauses) {
      // Within a clause (one query word and its prefix expansions) keep the best term only,
      // so a document is not rewarded for containing many words sharing a prefix.
      const best = new Map<Id, { score: number; term: string }>();
      for (const [term, multiplier] of clause.terms) {
        const list = postings.get(term);
        if (!list) continue;
        const termIdf = idf(term) * multiplier;
        for (const [id, freqs] of list) {
          if (!accepts(id)) continue;
          const entry = entries.get(id) as Entry;
          let tf = 0;
          for (let f = 0; f < 3; f++) {
            const freq = freqs[f] ?? 0;
            if (freq === 0) continue;
            const norm = 1 - b + (b * (entry.lengths[f] ?? 0)) / (avg[f] ?? 1);
            tf += ((weights[f] ?? 0) * freq) / norm;
          }
          const score = (termIdf * tf) / (k1 + tf);
          const current = best.get(id);
          if (!current || score > current.score) best.set(id, { score, term });
        }
      }
      for (const [id, { score, term }] of best) {
        scores.set(id, (scores.get(id) ?? 0) + score);
        let set = matched.get(id);
        if (!set) {
          set = new Set();
          matched.set(id, set);
        }
        set.add(term);
      }
    }

    const ranked = [...scores.entries()].sort((x, y) => {
      if (y[1] !== x[1]) return y[1] - x[1];
      const ux = entries.get(x[0])?.doc.updatedAt ?? 0;
      const uy = entries.get(y[0])?.doc.updatedAt ?? 0;
      if (uy !== ux) return uy - ux;
      return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0;
    });

    return ranked.slice(0, limit).map(([id, score]) => {
      const doc = (entries.get(id) as Entry).doc;
      const terms = matched.get(id) ?? new Set<string>();
      return {
        id,
        collection: doc.collection,
        title: doc.title,
        score,
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

