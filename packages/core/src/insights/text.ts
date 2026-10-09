/**
 * Tiny, dependency-free text normalisation for clustering short journal entries (FR + EN).
 */

/** Frequent French and English function words that carry no topic. */
const STOPWORDS = new Set(
  (
    // French
    'les des une un le la de du et en au aux ce ces cet cette que qui quoi dont pour par sur ' +
    'dans avec sans sous entre vers chez mais donc car pas plus moins tres trop peu bien mal ' +
    'est sont ete etre etait avoir avait ai as avons avez ont fait faire fais ses son sa mes ' +
    'mon ma tes ton ta nos notre vos votre leur leurs elle elles ils nous vous lui eux moi toi ' +
    'tout tous toute toutes comme encore aussi deja meme alors quand puis toujours jamais rien ' +
    'chose choses cela ceci celui celle ici fois jour jours hier demain aujourd hui semaine ' +
    // English
    'the and for are but not you all any can had her was one our out has have him his how its ' +
    'may new now old see two way who did get got let put say she too use that with this from ' +
    'they them then than there their what when where which while will would could should ' +
    'been being into onto over under again very just also only some such about after before ' +
    'because each every more most other same yet day days today yesterday week'
  ).split(' '),
);

/** Lower-case, strip diacritics. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Very light stemming shared by FR/EN: drops a plural `s`/`x` on longer words. */
function stem(word: string): string {
  return word.length > 4 && /[sx]$/.test(word) ? word.slice(0, -1) : word;
}

/** Topic keywords of a text: folded, stop words and short or numeric tokens removed, stemmed. */
export function keywords(text: string): string[] {
  const out: string[] = [];
  for (const raw of fold(text).split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 3 || STOPWORDS.has(raw) || !/\p{L}/u.test(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

/** Canonical form of a tag: trimmed, without leading `#`, folded, inner spaces collapsed. */
export function normalizeTag(tag: string): string {
  return fold(tag.trim().replace(/^#+/, '')).replace(/\s+/g, ' ');
}

/**
 * Weighted term set of an entry: each keyword weighs 1, each word of each tag weighs
 * `tagWeight` (tags are deliberate labels, so they count more than free text).
 */
export function termWeights(
  text: string,
  tags: readonly string[],
  tagWeight = 2,
): Map<string, number> {
  const terms = new Map<string, number>();
  for (const k of keywords(text)) terms.set(k, Math.max(terms.get(k) ?? 0, 1));
  for (const tag of tags) {
    for (const k of keywords(normalizeTag(tag).replace(/[/:]/g, ' '))) {
      terms.set(k, Math.max(terms.get(k) ?? 0, tagWeight));
    }
  }
  return terms;
}

/** Weighted Jaccard (Ruzicka) similarity: Σ min(wA, wB) / Σ max(wA, wB), 0 when both empty. */
export function weightedJaccard(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>) {
  let inter = 0;
  let union = 0;
  for (const [term, wa] of a) {
    const wb = b.get(term) ?? 0;
    inter += Math.min(wa, wb);
    union += Math.max(wa, wb);
  }
  for (const [term, wb] of b) if (!a.has(term)) union += wb;
  return union === 0 ? 0 : inter / union;
}
