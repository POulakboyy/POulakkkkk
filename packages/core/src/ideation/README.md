# `ideation` — ideation engine (5.1, 5.2, 5.4, 5.10)

Pure, deterministic helpers for creative work. Every random draw takes an `Rng`
(`() => number` in [0, 1)); pass `mulberry32(seed)` (or `mulberry32(seedFrom('2026-11-04'))`
for a "daily" draw) to make results reproducible. `Math.random` works too.

## Random Connector — `randomConnection({ notes, rng?, history?, minDistance?, maxPairs? })`

Picks two notes with no direct link and an undirected link-graph distance ≥ `minDistance`
(default 3; disconnected pairs qualify). Links come from `links` arrays and `[[id]]`/`[[Title]]`
wiki links. Sandbox and vault notes are never proposed; pairs in `history` are skipped. Pairs
are weighted by `0.05 + (1 − Jaccard(tags))²`, so low tag overlap is favoured (remote
associations, Mednick 1962). Returns `{ a, b, distance, sharedTags, tagOverlap, templateId,
prompt: { fr, en } }` or `null`. Helpers: `pairKey`, `tagOverlap`, `graphDistance`,
`CONNECTION_TEMPLATES`.

## Divergent constraints — `drawConstraint({ rng?, exclude?, category? })`

Uniform draw from `CONSTRAINTS` (66 FR/EN constraints in 7 `CONSTRAINT_CATEGORIES`, rationale
Haught-Tromp 2017); excluded ids are never returned; `null` when exhausted. `getConstraint(id)`.

## Method cards — `SCAMPER`, `SIX_HATS`, `METHODS`, `getMethod(id)`

FR/EN steps (title, prompt, questions, suggested `minutes`). SCAMPER (Eberle 1971) has 7 steps;
Six Thinking Hats (de Bono 1985) runs blue → white → red → yellow → black → green → blue.

Step machine (immutable, JSON-serialisable, never reads the clock — pass `now` in ms):
`startSession(id, now, { minutes? })`, `nextStep`, `previousStep`, `goToStep`, `pauseSession`,
`resumeSession`, `finishSession`, `addIdea`, `currentStep`, `stepElapsed`, `stepRemaining`,
`isOverdue`, `sessionProgress`, `summarizeSession(session, locale)` (Markdown).

## Palette — `extractPalette(rgba, { k = 5, sample = 4000, seed = 1 })`

Weighted k-means++ in CIELAB on a deterministic stratified sample of an RGBA buffer
(`ImageData.data`); returns `#rrggbb` most dominant first (`extractSwatches` adds rgb/lab/weight).
Transparent pixels are ignored. Contrast: `contrastRatio`, `meetsContrast` (WCAG 2.x AA/AAA),
`readableInk(bg, candidates?)`, `relativeLuminance`; conversions `rgbToLab`, `labToRgb`,
`hexToRgb`, `rgbToHex`, `deltaE` (CIE76).
