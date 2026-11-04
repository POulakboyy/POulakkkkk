/**
 * OPML 2.0 export and import (4.11), the outline format understood by mind-mapping and outliner
 * apps.
 *
 * The importer is a deliberately minimal, non-validating XML reader that only looks at
 * `<head><title>` and the `<outline>` elements of `<body>`. It is safe on untrusted files:
 * no external resources, no custom entities (a DOCTYPE with an internal subset is rejected, so
 * "billion laughs" and XXE payloads cannot work), linear time, no recursion, and a node limit.
 */
import type { GraphNode, Id } from '../model.ts';
import { buildHierarchy, preorder } from './hierarchy.ts';
import type { HierarchyOptions } from './hierarchy.ts';
import { buildTree } from './import-tree.ts';
import type { ImportEntry, TreeImportOptions } from './import-tree.ts';
import { indexNodes } from './positions.ts';
import { visibleSubgraph } from './collapse.ts';
import type { GraphContent, GraphLike } from './types.ts';

export interface OpmlExportOptions extends HierarchyOptions {
  /** `<head><title>`. */
  title?: string;
  /** Export only this node and its descendants. */
  rootId?: Id;
  /** Leave out what collapsed nodes hide (default false). */
  respectCollapsed?: boolean;
}

export interface OpmlImportOptions extends TreeImportOptions {
  /** Maximum number of outlines accepted before failing (default 50 000). */
  maxNodes?: number;
}

export interface OpmlImport extends GraphContent {
  title?: string;
}

export class OpmlError extends Error {
  override name = 'OpmlError';
}

const INVALID_XML_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Escapes a string for a double-quoted XML attribute or text node. */
export function escapeXml(value: string): string {
  return value.replace(INVALID_XML_CHARS, '').replace(/[&<>"'\t\n\r]/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return `&#${c.charCodeAt(0)};`;
    }
  });
}

export function toOPML(graph: GraphLike, options: OpmlExportOptions = {}): string {
  const source = options.respectCollapsed ? visibleSubgraph(graph, options) : graph;
  const hierarchy = buildHierarchy(source, options);
  const byId = indexNodes(source.nodes);
  const roots =
    options.rootId === undefined
      ? hierarchy.roots
      : byId.has(options.rootId)
        ? [options.rootId]
        : [];
  const entries = preorder(hierarchy, roots);

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<opml version="2.0">', '  <head>'];
  if (options.title !== undefined) lines.push(`    <title>${escapeXml(options.title)}</title>`);
  lines.push('  </head>', '  <body>');
  for (let i = 0; i < entries.length; i++) {
    const { id, depth } = entries[i] as { id: Id; depth: number };
    const nextDepth = entries[i + 1]?.depth ?? 0;
    const pad = '  '.repeat(depth + 2);
    const text = escapeXml((byId.get(id) as GraphNode).label);
    if (nextDepth > depth) {
      lines.push(`${pad}<outline text="${text}">`);
      continue;
    }
    lines.push(`${pad}<outline text="${text}"/>`);
    for (let d = depth - 1; d >= nextDepth; d--) lines.push(`${'  '.repeat(d + 2)}</outline>`);
  }
  lines.push('  </body>', '</opml>');
  return `${lines.join('\n')}\n`;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

/** Decodes the five predefined entities and numeric references; unknown ones stay verbatim. */
export function decodeXmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z]+);/g, (match, ref: string) => {
    if (ref.startsWith('#')) {
      const code = ref[1] === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      const valid =
        code === 0x9 ||
        code === 0xa ||
        code === 0xd ||
        (code >= 0x20 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        (code >= 0x10000 && code <= 0x10ffff);
      return valid ? String.fromCodePoint(code) : '�';
    }
    return NAMED_ENTITIES[ref] ?? match;
  });
}

const ATTRIBUTE = /([A-Za-z_:][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function parseAttributes(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of source.matchAll(ATTRIBUTE)) {
    const name = m[1] as string;
    if (!out.has(name)) out.set(name, decodeXmlEntities(m[2] ?? m[3] ?? ''));
  }
  return out;
}

/** Index of the `>` closing the tag that starts at `start`, skipping quoted attribute values. */
function tagEnd(xml: string, start: number): number {
  let quote = '';
  for (let i = start; i < xml.length; i++) {
    const c = xml[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i;
  }
  return -1;
}

function skipPast(xml: string, from: number, terminator: string, what: string): number {
  const end = xml.indexOf(terminator, from);
  if (end < 0) throw new OpmlError(`Unterminated ${what}`);
  return end + terminator.length;
}

/** Parses an OPML document into a tree of `idea` nodes (`text` attribute, else `title`). */
export function fromOPML(xml: string, options: OpmlImportOptions = {}): OpmlImport {
  const maxNodes = options.maxNodes ?? 50_000;
  const entries: ImportEntry[] = [];
  /** Open elements; `counted` marks the outlines that add a level. */
  const stack: Array<{ name: string; counted: boolean }> = [];
  let outlineDepth = 0;
  let title: string | undefined;
  let titleStart = -1;
  let sawOpml = false;

  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf('<', i);
    if (lt < 0) break;
    if (xml.startsWith('<?', lt)) {
      i = skipPast(xml, lt + 2, '?>', 'processing instruction');
    } else if (xml.startsWith('<!--', lt)) {
      i = skipPast(xml, lt + 4, '-->', 'comment');
    } else if (xml.startsWith('<![CDATA[', lt)) {
      i = skipPast(xml, lt + 9, ']]>', 'CDATA section');
    } else if (xml.startsWith('<!', lt)) {
      const end = tagEnd(xml, lt + 2);
      if (end < 0) throw new OpmlError('Unterminated declaration');
      const declaration = xml.slice(lt, end);
      if (declaration.includes('[') || /<!ENTITY/i.test(declaration)) {
        throw new OpmlError('DOCTYPE internal subsets and entity declarations are not supported');
      }
      i = end + 1;
    } else if (xml[lt + 1] === '/') {
      const end = xml.indexOf('>', lt);
      if (end < 0) throw new OpmlError('Unterminated closing tag');
      const name = xml.slice(lt + 2, end).trim();
      const open = stack.pop();
      if (open?.name !== name) throw new OpmlError(`Unexpected </${name}>`);
      if (open.counted) outlineDepth--;
      if (name === 'title' && titleStart >= 0) {
        title = decodeXmlEntities(xml.slice(titleStart, lt)).trim();
        titleStart = -1;
      }
      i = end + 1;
    } else {
      const end = tagEnd(xml, lt + 1);
      if (end < 0) throw new OpmlError('Unterminated tag');
      const selfClosing = xml[end - 1] === '/';
      const body = xml.slice(lt + 1, selfClosing ? end - 1 : end);
      const name = /^[^\s/>]+/.exec(body)?.[0] ?? '';
      if (!name) throw new OpmlError('Empty tag name');
      if (stack.length === 0) {
        if (name !== 'opml' || sawOpml) throw new OpmlError('The document root must be <opml>');
        sawOpml = true;
      }
      const parent = stack[stack.length - 1];
      const accepted = name === 'outline' && (parent?.name === 'body' || parent?.counted === true);
      if (accepted) {
        if (entries.length >= maxNodes) throw new OpmlError(`More than ${maxNodes} outlines`);
        const attrs = parseAttributes(body.slice(name.length));
        entries.push({
          label: (attrs.get('text') ?? attrs.get('title') ?? '').trim(),
          depth: outlineDepth,
        });
      }
      if (name === 'title' && parent?.name === 'head' && !selfClosing) titleStart = end + 1;
      if (!selfClosing) {
        stack.push({ name, counted: accepted });
        if (accepted) outlineDepth++;
      }
      i = end + 1;
    }
  }
  if (!sawOpml) throw new OpmlError('Not an OPML document');
  if (stack.length > 0) throw new OpmlError(`Unclosed <${stack[stack.length - 1]?.name}>`);

  const content: OpmlImport = buildTree(entries, options);
  if (title) content.title = title;
  return content;
}
