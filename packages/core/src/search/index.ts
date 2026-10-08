/**
 * Search module (3.2, 3.14, 5.8): lexical BM25F index with FR/EN analysis and
 * search-as-you-type, hybrid lexical + semantic ranking (pluggable on-device embedder), and
 * backlinks. Sandbox records are excluded by default everywhere.
 */
export {
  createSearchIndex,
  docFilter,
  highlight,
  makeSnippet,
  type HighlightRange,
  type SearchDoc,
  type SearchField,
  type SearchHit,
  type SearchIndex,
  type SearchIndexOptions,
  type SearchOptions,
} from './lexical.ts';
export { toSearchDoc } from './docs.ts';
export {
  cosineSimilarity,
  createHybridSearch,
  normalize,
  reciprocalRankFusion,
  type Embedder,
  type HybridHit,
  type HybridSearch,
  type HybridSearchOptions,
  type StoredVector,
  type VectorExport,
} from './hybrid.ts';
export {
  backlinks,
  createLinkResolver,
  extractWikiLinks,
  linkGraph,
  outgoingLinks,
  type Backlink,
  type BacklinkOptions,
  type BacklinkVia,
  type LinkResolver,
  type LinkSource,
  type WikiLink,
} from './links.ts';
export {
  analyze,
  excerpt,
  fold,
  normalizeTitle,
  stem,
  STOPWORDS,
  tokenize,
  MAX_TOKEN_LENGTH,
  type Token,
} from './text.ts';
