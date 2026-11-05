# `search` — universal search and backlinks (3.2, 3.14, 5.8)

## Lexical — `createSearchIndex(options?)`

In-memory BM25F index (field weights title 3 > tags 2 > body 1, `k1` 1.2, `b` 0.75).
`add` / `update` / `remove` / `has` / `get` / `docs` / `clear` / `size` and
`search(query, { limit = 20, collections?, includeSandbox = false, prefix = true, filter? })`
→ `SearchHit { id, collection, title, score, snippet, matched }`.
The last query word is expanded as a prefix (search-as-you-type) unless the query ends with a
space. Sandbox documents are indexed but hidden by default. Build documents from domain records
with `toSearchDoc(collection, record)` (vault note bodies are never indexed).

Text analysis (`text.ts`): `fold` (lower case + NFD diacritic and ligature folding),
`tokenize` (offsets in the original text), FR/EN `STOPWORDS`, light FR/EN `stem`, `analyze`,
`excerpt`. UI helpers: `highlight(text, query)` → ranges, `makeSnippet`.

## Hybrid — `createHybridSearch({ index, embedder?, rrfK = 60, candidates = 50, ... })`

Fuses BM25F and cosine similarity from a pluggable on-device `Embedder`
(`embed(texts) → Float32Array[]`) with Reciprocal Rank Fusion. Without an embedder (or before
`flush()` has embedded anything, or if the model fails at query time) it is exactly the lexical
search. `flush()` embeds only new/changed documents; `exportVectors` / `importVectors` persist
vectors per model id. Also exported: `reciprocalRankFusion`, `cosineSimilarity`, `normalize`.

## Links — `backlinks(records, targetId, { includeSandbox?, targetTitles?, snippetRadius? })`

Records referencing the target through `links`, a graph node `refId`, or inline
`[[id]]` / `[[Title]]` (also `[[Title#Heading]]`, `[[Title|alias]]`, `![[embed]]`; titles match
case- and accent-insensitively; links inside Markdown code are ignored). Each `Backlink` has
`via`, `mentions` and a snippet with links rendered as labels; most recently updated first.
Also: `extractWikiLinks`, `createLinkResolver`, `outgoingLinks`, `linkGraph`.

## Performance

Documents get a dense integer slot; posting lists are unordered arrays with O(1) swap removal,
queries accumulate scores in typed arrays and keep the top `limit` hits with a bounded heap,
and word analysis (folding + stemming) is memoised. `lexical.equivalence.test.ts` checks hit
for hit against the straightforward reference implementation. Figures and budgets:
`docs/performance/BENCHMARKS.md`.
