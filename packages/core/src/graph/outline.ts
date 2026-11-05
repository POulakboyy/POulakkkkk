/**
 * Text extraction (4.15) and Markdown export (4.11): the tree of a canvas becomes a nested
 * Markdown list, and a nested list (or a document with headings) becomes a mind map.
 *
 * `fromOutline(toOutline(g))` rebuilds the same tree (labels, order, nesting): labels are put on
 * one line and a leading Markdown marker in a label is escaped with `\`.
 */
import type { GraphNode, Id } from '../model.ts';
import { buildHierarchy, preorder } from './hierarchy.ts';
import type { HierarchyOptions } from './hierarchy.ts';
import { isNodeDone } from './flow.ts';
import { buildTree } from './import-tree.ts';
import type { ImportEntry, TreeImportOptions } from './import-tree.ts';
import { indexNodes } from './positions.ts';
import { visibleSubgraph } from './collapse.ts';
import type { GraphContent, GraphLike } from './types.ts';

export interface OutlineExportOptions extends HierarchyOptions {
  /** Export only this node and its descendants. */
  rootId?: Id;
  /** Adds a `# title` heading on top. */
  title?: string;
  /** When given, task nodes get a `[x]` / `[ ]` checkbox (ids or `refId`s of done records). */
  doneIds?: Iterable<Id>;
  /** Leave out what collapsed nodes hide, as on screen (default false: export everything). */
  respectCollapsed?: boolean;
  /** One indentation level (default two spaces). */
  indent?: string;
}

export interface OutlineImport extends GraphContent {
  /** Ids of the items written as checked boxes (`- [x] …`). */
  checked: Id[];
}

const LEADING_MARKER = /^(?:[-*+>#\\]|\d+[.)]|\[[ xX]\])/;

/** One-line, marker-safe label. */
export function outlineLabel(label: string): string {
  const flat = label.replace(/\s+/g, ' ').trim();
  return LEADING_MARKER.test(flat) ? `\\${flat}` : flat;
}

export function toOutline(graph: GraphLike, options: OutlineExportOptions = {}): string {
  const source = options.respectCollapsed ? visibleSubgraph(graph, options) : graph;
  const hierarchy = buildHierarchy(source, options);
  const byId = indexNodes(source.nodes);
  if (options.rootId !== undefined && !byId.has(options.rootId)) return '';
  const roots = options.rootId !== undefined ? [options.rootId] : hierarchy.roots;
  const done = options.doneIds ? new Set(options.doneIds) : undefined;
  const indent = options.indent ?? '  ';

  const lines: string[] = [];
  if (options.title !== undefined) lines.push(`# ${options.title.replace(/\s+/g, ' ').trim()}`, '');
  for (const { id, depth } of preorder(hierarchy, roots)) {
    const node = byId.get(id) as GraphNode;
    const box = done && node.kind === 'task' ? (isNodeDone(node, done) ? '[x] ' : '[ ] ') : '';
    lines.push(`${indent.repeat(depth)}- ${box}${outlineLabel(node.label)}`);
  }
  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

const HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/;
const BULLET = /^(\s*)(?:[-*+]|\d+[.)])(?:\s+(.*))?$/;
const CHECKBOX = /^\[([ xX])\]\s+/;
const FENCE = /^\s*(```|~~~)/;
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;

/**
 * Parses a Markdown outline: headings nest by level, list items nest by indentation under the
 * latest heading, indented plain lines continue the previous item, other lines are items at the
 * current heading level. Fenced code blocks are skipped.
 */
export function fromOutline(markdown: string, options: TreeImportOptions = {}): OutlineImport {
  const entries: ImportEntry[] = [];
  const checkedIndexes: number[] = [];
  const headings: Array<{ level: number; depth: number }> = [];
  let base = 0;
  let bullets: number[] = [];
  let inFence = false;

  for (const raw of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\t/g, '    ');
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || line.trim() === '' || RULE.test(line)) continue;

    const heading = HEADING.exec(line);
    if (heading) {
      const level = (heading[1] as string).length;
      while (
        headings.length > 0 &&
        (headings[headings.length - 1] as { level: number }).level >= level
      ) {
        headings.pop();
      }
      const depth = headings.length;
      headings.push({ level, depth });
      entries.push({ label: unescapeLabel(heading[2] ?? ''), depth });
      base = depth + 1;
      bullets = [];
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      const width = (bullet[1] as string).length;
      while (bullets.length > 0 && (bullets[bullets.length - 1] as number) >= width) bullets.pop();
      let text = (bullet[2] ?? '').trim();
      const box = CHECKBOX.exec(text);
      if (box) {
        text = text.slice(box[0].length);
        if (box[1] !== ' ') checkedIndexes.push(entries.length);
      }
      entries.push({ label: unescapeLabel(text), depth: base + bullets.length });
      bullets.push(width);
      continue;
    }

    const text = line.trim();
    const previous = entries[entries.length - 1];
    if (/^\s/.test(line) && previous) {
      previous.label = previous.label ? `${previous.label} ${text}` : text;
    } else {
      entries.push({ label: unescapeLabel(text), depth: base });
      bullets = [];
    }
  }

  const content = buildTree(entries, options);
  const checked = checkedIndexes.map((i) => (content.nodes[i] as GraphNode).id);
  return { ...content, checked };
}

function unescapeLabel(text: string): string {
  const trimmed = text.trim();
  return trimmed.startsWith('\\') && LEADING_MARKER.test(trimmed.slice(1))
    ? trimmed.slice(1)
    : trimmed;
}
