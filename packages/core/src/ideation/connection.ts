/**
 * Random Connector, the "serendipity engine" (5.1): confronts two notes that are far apart in
 * the link graph to provoke a new association.
 *
 * Rationale: Mednick (1962, "The associative basis of the creative process", Psychological
 * Review, 69(3)) describes creative thinking as forming combinations of remote associative
 * elements. The engine therefore only pairs notes with no direct link and a graph distance of at
 * least `minDistance` (or no path at all), and favours pairs whose tags overlap little.
 */
import type { Id, Locale, Note } from '../model.ts';
import { linkGraph } from '../search/links.ts';
import { fold } from '../search/text.ts';
import { pick, randomInt, weightedIndex, type Rng } from './rng.ts';

export type ConnectionNote = Pick<Note, 'id' | 'title' | 'tags'> &
  Partial<Pick<Note, 'body' | 'links' | 'sandbox' | 'vaultId' | 'updatedAt'>>;

export interface RandomConnectionOptions<N extends ConnectionNote = ConnectionNote> {
  notes: readonly N[];
  rng?: Rng;
  /** Pairs already shown (order irrelevant), never proposed again. */
  history?: Iterable<readonly [Id, Id]>;
  /** Minimum link-graph distance between the two notes. Default 3 (min 2: never linked). */
  minDistance?: number;
  /** Above this many candidate pairs, `maxPairs` random pairs are sampled. Default 20 000. */
  maxPairs?: number;
}

export interface Connection<N extends ConnectionNote = ConnectionNote> {
  a: N;
  b: N;
  /** Shortest undirected link path between the notes, or `null` when disconnected. */
  distance: number | null;
  /** Tags shared by both notes (as written on `a`). */
  sharedTags: string[];
  /** Jaccard similarity of the two tag sets, in [0, 1]. */
  tagOverlap: number;
  /** Id of the prompt template used. */
  templateId: string;
  /** Creative prompt confronting the two notes. */
  prompt: Readonly<Record<Locale, string>>;
}

type Template = readonly [id: string, fr: string, en: string];

/** `{a}` and `{b}` are replaced with the note titles. */
export const CONNECTION_TEMPLATES: readonly Template[] = [
  ['common', 'Qu’ont en commun « {a} » et « {b} » ?', 'What do “{a}” and “{b}” have in common?'],
  [
    'merge',
    'Imagine un projet qui fusionne « {a} » et « {b} ».',
    'Imagine a project that merges “{a}” and “{b}”.',
  ],
  [
    'solve',
    'Et si « {b} » était la solution à un problème de « {a} » ?',
    'What if “{b}” were the solution to a problem in “{a}”?',
  ],
  [
    'lens',
    'Relis « {a} » avec le regard de « {b} ». Que change-t-il ?',
    'Reread “{a}” through the lens of “{b}”. What changes?',
  ],
  [
    'metaphor',
    'Décris « {a} » en n’utilisant que le vocabulaire de « {b} ».',
    'Describe “{a}” using only the vocabulary of “{b}”.',
  ],
  [
    'borrow',
    'Quelle idée de « {b} » pourrais-tu voler pour « {a} » ?',
    'Which idea from “{b}” could you steal for “{a}”?',
  ],
  [
    'tension',
    'Où « {a} » et « {b} » se contredisent-ils ? Que révèle cette tension ?',
    'Where do “{a}” and “{b}” contradict each other? What does that tension reveal?',
  ],
  [
    'story',
    'Écris la phrase qui relie « {a} » à « {b} ».',
    'Write the sentence that links “{a}” to “{b}”.',
  ],
];

const UNTITLED: Readonly<Record<Locale, string>> = { fr: 'Sans titre', en: 'Untitled' };

/** Order-independent key of a pair of ids. */
export function pairKey(a: Id, b: Id): string {
  return a < b ? JSON.stringify([a, b]) : JSON.stringify([b, a]);
}

/** Jaccard similarity of two tag lists, compared case- and accent-insensitively. */
export function tagOverlap(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a.map(normalizeTag).filter(Boolean));
  const sb = new Set(b.map(normalizeTag).filter(Boolean));
  if (sa.size === 0 && sb.size === 0) return 0;
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared++;
  return shared / (sa.size + sb.size - shared);
}

function normalizeTag(tag: string): string {
  return fold(tag).replace(/^#/, '').trim();
}

/** Undirected adjacency among the given notes (`links` arrays and wiki links). */
function undirectedGraph(notes: readonly ConnectionNote[]): Map<Id, Set<Id>> {
  const directed = linkGraph(notes, { includeSandbox: true });
  const graph = new Map<Id, Set<Id>>();
  for (const n of notes) graph.set(n.id, new Set());
  for (const [from, targets] of directed) {
    for (const to of targets) {
      if (!graph.has(to)) continue; // link to a record outside the pool
      graph.get(from)?.add(to);
      graph.get(to)?.add(from);
    }
  }
  return graph;
}

/** Nodes reachable from `start` in fewer than `depth` hops (including `start`). */
function neighbourhood(graph: Map<Id, Set<Id>>, start: Id, depth: number): Set<Id> {
  const seen = new Set<Id>([start]);
  let frontier: Id[] = [start];
  for (let d = 1; d < depth && frontier.length > 0; d++) {
    const next: Id[] = [];
    for (const id of frontier) {
      for (const n of graph.get(id) ?? []) {
        if (seen.has(n)) continue;
        seen.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return seen;
}

/** Shortest undirected path length between two nodes, `null` when disconnected. */
export function graphDistance(
  graph: ReadonlyMap<Id, ReadonlySet<Id>>,
  a: Id,
  b: Id,
): number | null {
  if (a === b) return 0;
  const seen = new Set<Id>([a]);
  let frontier: Id[] = [a];
  for (let d = 1; frontier.length > 0; d++) {
    const next: Id[] = [];
    for (const id of frontier) {
      for (const n of graph.get(id) ?? []) {
        if (n === b) return d;
        if (seen.has(n)) continue;
        seen.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

/** Candidate pairs as index pairs: every pair, or a random sample when there are too many. */
function candidatePairs(n: number, maxPairs: number, rng: Rng): Array<[number, number]> {
  const total = (n * (n - 1)) / 2;
  const out: Array<[number, number]> = [];
  if (total <= maxPairs) {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
    return out;
  }
  const seen = new Set<number>();
  for (let attempt = 0; out.length < maxPairs && attempt < maxPairs * 4; attempt++) {
    const i = randomInt(rng, n);
    const j = randomInt(rng, n);
    if (i === j) continue;
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    const key = lo * n + hi;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([lo, hi]);
  }
  return out;
}

/** Weight of a pair: strongly favours low tag overlap, but never rules out a pair. */
function pairWeight(overlap: number): number {
  return 0.05 + (1 - overlap) ** 2;
}

function fill(template: string, a: string, b: string): string {
  return template.replaceAll('{a}', a).replaceAll('{b}', b);
}

function titleOf(note: ConnectionNote, locale: Locale): string {
  const title = note.title.trim();
  return title || UNTITLED[locale];
}

/**
 * Two remote notes and a prompt confronting them, or `null` when no eligible pair remains.
 * Sandbox notes (5.8) and vault notes (3.5) are never proposed. Deterministic for a given
 * `rng` (see `mulberry32`).
 */
export function randomConnection<N extends ConnectionNote>(
  options: RandomConnectionOptions<N>,
): Connection<N> | null {
  const rng = options.rng ?? Math.random;
  const minDistance = Math.max(2, Math.floor(options.minDistance ?? 3));
  const maxPairs = Math.max(1, Math.floor(options.maxPairs ?? 20_000));

  const unique = new Map<Id, N>();
  for (const note of options.notes) {
    if (!note.sandbox && !note.vaultId && !unique.has(note.id)) unique.set(note.id, note);
  }
  const pool = [...unique.values()];
  if (pool.length < 2) return null;

  const history = new Set<string>();
  for (const [x, y] of options.history ?? []) history.add(pairKey(x, y));

  const graph = undirectedGraph(pool);
  const near = new Map<Id, Set<Id>>();
  const tooClose = (a: Id, b: Id): boolean => {
    let set = near.get(a);
    if (!set) {
      set = neighbourhood(graph, a, minDistance);
      near.set(a, set);
    }
    return set.has(b);
  };

  const pairs: Array<{ a: N; b: N; overlap: number }> = [];
  for (const [i, j] of candidatePairs(pool.length, maxPairs, rng)) {
    const a = pool[i] as N;
    const b = pool[j] as N;
    if (history.has(pairKey(a.id, b.id)) || tooClose(a.id, b.id)) continue;
    pairs.push({ a, b, overlap: tagOverlap(a.tags, b.tags) });
  }
  const chosen =
    pairs[
      weightedIndex(
        rng,
        pairs.map((p) => pairWeight(p.overlap)),
      )
    ];
  if (!chosen) return null;

  // Present the pair in a random order so `a` is not always the older note.
  const [a, b] = rng() < 0.5 ? [chosen.a, chosen.b] : [chosen.b, chosen.a];
  const template = pick(rng, CONNECTION_TEMPLATES) as Template;
  const bTags = new Set(b.tags.map(normalizeTag));
  return {
    a,
    b,
    distance: graphDistance(graph, a.id, b.id),
    sharedTags: a.tags.filter((t) => bTags.has(normalizeTag(t))),
    tagOverlap: chosen.overlap,
    templateId: template[0],
    prompt: {
      fr: fill(template[1], titleOf(a, 'fr'), titleOf(b, 'fr')),
      en: fill(template[2], titleOf(a, 'en'), titleOf(b, 'en')),
    },
  };
}
