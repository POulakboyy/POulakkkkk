/**
 * Links between records and backlinks (3.14).
 *
 * A record references another one either structurally (its `links` array, a graph node's
 * `refId`) or inline, with a wiki link in its text: `[[id]]`, `[[Title]]`, and the usual
 * variants `[[Title#Heading]]`, `[[Title|label]]`, `![[Title]]` (embed). Titles are matched
 * case- and accent-insensitively. Wiki links inside Markdown code (fenced blocks or inline
 * code spans) are ignored, as they are examples rather than references.
 */
import type { Id, Timestamp } from '../model.ts';
import { excerpt, normalizeTitle } from './text.ts';

/**
 * Structural shape scanned for links. Every domain record satisfies it: notes (`body`,
 * `links`), tasks and events (`notes`), journal entries (`text`), graphs (`nodes`).
 */
export interface LinkSource {
  id: Id;
  title?: string;
  body?: string;
  notes?: string;
  text?: string;
  links?: readonly Id[];
  nodes?: readonly { refId?: Id; label?: string }[];
  /** Sandbox records (5.8) are ignored unless `includeSandbox` is set. */
  sandbox?: boolean;
  /** Vault records (3.5) have ciphertext bodies: only their structural links are read. */
  vaultId?: Id;
  updatedAt?: Timestamp;
}

export interface WikiLink {
  /** Referenced id or title, trimmed (text before `#` and `|`). */
  target: string;
  heading?: string;
  alias?: string;
  /** `![[…]]` embed rather than a plain link. */
  embed: boolean;
  /** Offsets of the whole `[[…]]` (including a leading `!`) in the source text. */
  start: number;
  end: number;
}

const WIKI_RE = /(!?)\[\[([^[\]\n]+?)\]\]/g;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
// A run of N backticks, content ending with a non-backtick, then exactly N backticks.
const INLINE_CODE_RE = /(`+)[\s\S]*?[^`]\1(?!`)/g;

/** Ranges of `text` covered by Markdown code (fenced blocks and inline code spans). */
function codeRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let fence: string | null = null;
  let fenceStart = 0;
  let offset = 0;
  const outside: Array<[number, number]> = [];
  let outsideStart = 0;
  for (const line of text.split('\n')) {
    const lineEnd = offset + line.length;
    const marker = FENCE_RE.exec(line)?.[1];
    if (fence === null && marker) {
      fence = marker;
      fenceStart = offset;
      outside.push([outsideStart, offset]);
    } else if (fence !== null && marker && marker[0] === fence[0] && marker.length >= fence.length) {
      if (line.trim() === marker) {
        ranges.push([fenceStart, lineEnd]);
        fence = null;
        outsideStart = lineEnd;
      }
    }
    offset = lineEnd + 1;
  }
  if (fence !== null) ranges.push([fenceStart, text.length]);
  else outside.push([outsideStart, text.length]);

  for (const [from, to] of outside) {
    const chunk = text.slice(from, to);
    for (const m of chunk.matchAll(INLINE_CODE_RE)) {
      ranges.push([from + m.index, from + m.index + m[0].length]);
    }
  }
  return ranges;
}

/** Every wiki link of `text`, in order, excluding those inside Markdown code. */
export function extractWikiLinks(text: string): WikiLink[] {
  if (!text.includes('[[')) return [];
  const code = text.includes('`') || text.includes('~~~') ? codeRanges(text) : [];
  const out: WikiLink[] = [];
  for (const m of text.matchAll(WIKI_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    if (code.some(([from, to]) => start >= from && start < to)) continue;
    const inner = m[2] ?? '';
    const pipe = inner.indexOf('|');
    const ref = pipe === -1 ? inner : inner.slice(0, pipe);
    const alias = pipe === -1 ? '' : inner.slice(pipe + 1).trim();
    const hash = ref.indexOf('#');
    const target = (hash === -1 ? ref : ref.slice(0, hash)).trim();
    const heading = hash === -1 ? '' : ref.slice(hash + 1).trim();
    if (!target) continue; // `[[#Heading]]` points inside the current record
    const link: WikiLink = { target, embed: m[1] === '!', start, end };
    if (heading) link.heading = heading;
    if (alias) link.alias = alias;
    out.push(link);
  }
  return out;
}

/** Text fields scanned for wiki links (none for vault records, whose body is ciphertext). */
function texts(record: LinkSource): string[] {
  if (record.vaultId) return [];
  const out: string[] = [];
  for (const t of [record.body, record.notes, record.text]) if (t) out.push(t);
  return out;
}

/** Resolves wiki-link targets to record ids: exact id first, then normalised title. */
export interface LinkResolver {
  resolve(target: string): Id[];
  /** Title of a known record (used to render `[[id]]` links as readable labels). */
  titleOf(id: Id): string | undefined;
}

export function createLinkResolver(records: Iterable<LinkSource>): LinkResolver {
  const ids = new Map<Id, string>();
  const byTitle = new Map<string, Id[]>();
  for (const r of records) {
    ids.set(r.id, r.title ?? '');
    const key = r.title ? normalizeTitle(r.title) : '';
    if (!key) continue;
    const list = byTitle.get(key);
    if (list) list.push(r.id);
    else byTitle.set(key, [r.id]);
  }
  return {
    resolve(target) {
      if (ids.has(target)) return [target];
      return byTitle.get(normalizeTitle(target)) ?? [];
    },
    titleOf(id) {
      const title = ids.get(id);
      return title ? title : undefined;
    },
  };
}

/** Ids a record references: `links`, graph node `refId`s and resolved wiki links (no self). */
export function outgoingLinks(record: LinkSource, resolver: LinkResolver): Set<Id> {
  const out = new Set<Id>();
  for (const id of record.links ?? []) out.add(id);
  for (const node of record.nodes ?? []) if (node.refId) out.add(node.refId);
  for (const text of texts(record)) {
    for (const link of extractWikiLinks(text)) {
      for (const id of resolver.resolve(link.target)) out.add(id);
    }
  }
  out.delete(record.id);
  return out;
}

/**
 * Outgoing-link adjacency of a whole collection, in one pass (`id → referenced ids`).
 * Sandbox records are skipped unless `includeSandbox` is set. Targets need not be in
 * `records` (a note may link to a task that lives in another collection).
 */
export function linkGraph(
  records: readonly LinkSource[],
  options: { includeSandbox?: boolean } = {},
): Map<Id, Set<Id>> {
  const pool = options.includeSandbox ? records : records.filter((r) => !r.sandbox);
  const resolver = createLinkResolver(pool);
  const graph = new Map<Id, Set<Id>>();
  for (const r of pool) graph.set(r.id, outgoingLinks(r, resolver));
  return graph;
}

/* ------------------------------------------------------------------------------------------ */
/* Backlinks                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export type BacklinkVia = 'link' | 'wikilink' | 'graph';

export interface Backlink<R extends LinkSource = LinkSource> {
  id: Id;
  record: R;
  /** How the record references the target (several ways are possible). */
  via: BacklinkVia[];
  /** Number of inline `[[…]]` references to the target. */
  mentions: number;
  /**
   * Context of the first inline reference, wiki links rendered as their label; otherwise the
   * beginning of the record's text, or the label of the graph node pointing at the target.
   */
  snippet: string;
}

export interface BacklinkOptions {
  /** Include references from sandbox records (5.8). Default false. */
  includeSandbox?: boolean;
  /**
   * Extra names the target is known by — needed when it is not part of `records` (e.g. an
   * imported file referenced as `[[report.pdf]]`).
   */
  targetTitles?: readonly string[];
  /** Characters of context on each side of the reference. Default 60. */
  snippetRadius?: number;
}

/**
 * Records referencing `targetId`, most recently updated first. A reference is a `links`
 * entry, a graph node `refId`, or an inline `[[targetId]]` / `[[Target title]]`.
 */
export function backlinks<R extends LinkSource>(
  records: readonly R[],
  targetId: Id,
  options: BacklinkOptions = {},
): Backlink<R>[] {
  const radius = options.snippetRadius ?? 60;
  const titles = new Set<string>();
  const target = records.find((r) => r.id === targetId);
  if (target?.title) titles.add(normalizeTitle(target.title));
  for (const t of options.targetTitles ?? []) if (t.trim()) titles.add(normalizeTitle(t));
  const resolver = createLinkResolver(records);
  const pointsToTarget = (link: WikiLink): boolean =>
    link.target === targetId || titles.has(normalizeTitle(link.target));

  const out: Backlink<R>[] = [];
  for (const record of records) {
    if (record.id === targetId) continue;
    if (record.sandbox && !options.includeSandbox) continue;
    const via: BacklinkVia[] = [];
    if (record.links?.includes(targetId)) via.push('link');
    const node = record.nodes?.find((n) => n.refId === targetId);
    if (node) via.push('graph');

    let mentions = 0;
    let snippet = '';
    for (const text of texts(record)) {
      const links = extractWikiLinks(text);
      const hits = links.filter(pointsToTarget);
      if (hits.length === 0) continue;
      if (mentions === 0) snippet = renderSnippet(text, links, hits[0] as WikiLink, resolver, radius);
      mentions += hits.length;
    }
    if (mentions > 0) via.push('wikilink');
    if (via.length === 0) continue;

    if (!snippet) {
      const text = texts(record)[0];
      if (text) {
        const rendered = renderLinks(text, extractWikiLinks(text), resolver).text;
        snippet = excerpt(rendered, 0, 0, radius * 2);
      } else if (node?.label) snippet = node.label;
    }
    out.push({ id: record.id, record, via, mentions, snippet });
  }

  return out.sort((x, y) => {
    const dx = (y.record.updatedAt ?? 0) - (x.record.updatedAt ?? 0);
    if (dx !== 0) return dx;
    const tx = x.record.title ?? '';
    const ty = y.record.title ?? '';
    if (tx !== ty) return tx.localeCompare(ty);
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
}

/** Display label of a wiki link: alias, else the resolved title for `[[id]]`, else target. */
function labelOf(link: WikiLink, resolver: LinkResolver): string {
  if (link.alias) return link.alias;
  const title = resolver.titleOf(link.target);
  const base = title ?? link.target;
  return link.heading ? `${base} › ${link.heading}` : base;
}

/** Replaces wiki links by their labels; maps each link to its range in the rendered text. */
function renderLinks(
  text: string,
  links: readonly WikiLink[],
  resolver: LinkResolver,
): { text: string; ranges: Map<WikiLink, [number, number]> } {
  let out = '';
  let cursor = 0;
  const ranges = new Map<WikiLink, [number, number]>();
  for (const link of links) {
    out += text.slice(cursor, link.start);
    const label = labelOf(link, resolver);
    ranges.set(link, [out.length, out.length + label.length]);
    out += label;
    cursor = link.end;
  }
  out += text.slice(cursor);
  return { text: out, ranges };
}

function renderSnippet(
  text: string,
  links: readonly WikiLink[],
  hit: WikiLink,
  resolver: LinkResolver,
  radius: number,
): string {
  const rendered = renderLinks(text, links, resolver);
  const [start, end] = rendered.ranges.get(hit) ?? [0, 0];
  return excerpt(rendered.text, start, end, radius);
}
