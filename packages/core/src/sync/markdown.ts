/**
 * Markdown import/export of block lists (3.3). Supports the block types of the editor:
 * paragraphs, ATX headings, bullet / numbered / to-do list items (with nesting by indent),
 * quotes, fenced code and dividers. Inline Markdown is kept verbatim inside `text`.
 *
 * Round trip: `fromMarkdown(toMarkdown(blocks))` returns the normalized blocks, except that a
 * blank line inside a paragraph, quote or list item splits it, and line breaks in headings
 * become spaces.
 */

export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bullet',
  'numbered',
  'todo',
  'quote',
  'code',
  'divider',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface BlockContent {
  readonly type: BlockType;
  readonly text: string;
  /** Heading level 1–6 (headings only). */
  readonly level?: number;
  /** To-do state (to-do items only). */
  readonly checked?: boolean;
  /** Code language (code blocks only, omitted when empty). */
  readonly lang?: string;
  /** Nesting depth ≥ 1 (list items only, omitted at depth 0). */
  readonly indent?: number;
}

export interface BlockInput {
  readonly type?: string;
  readonly text?: string;
  readonly level?: number;
  readonly checked?: boolean;
  readonly lang?: string;
  readonly indent?: number;
}

const LIST_TYPES: ReadonlySet<BlockType> = new Set(['bullet', 'numbered', 'todo']);
const MAX_INDENT = 8;

export function isBlockType(value: unknown): value is BlockType {
  return typeof value === 'string' && (BLOCK_TYPES as readonly string[]).includes(value);
}

/** Canonical form of a block: unknown types become paragraphs, irrelevant attributes drop. */
export function normalizeBlock(input: BlockInput): BlockContent {
  const type: BlockType = isBlockType(input.type) ? input.type : 'paragraph';
  const text = type === 'divider' ? '' : (input.text ?? '').replace(/\r\n?/g, '\n');
  switch (type) {
    case 'heading':
      return { type, text: text.replace(/\n/g, ' '), level: clampInt(input.level, 1, 6, 1) };
    case 'todo':
      return withIndent({ type, text, checked: input.checked === true }, input.indent);
    case 'bullet':
    case 'numbered':
      return withIndent({ type, text }, input.indent);
    case 'code':
      return input.lang ? { type, text, lang: input.lang.replace(/[\s`]/g, '') } : { type, text };
    default:
      return { type, text };
  }
}

function withIndent(block: BlockContent, indent: number | undefined): BlockContent {
  const depth = clampInt(indent, 0, MAX_INDENT, 0);
  return depth > 0 ? { ...block, indent: depth } : block;
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/* ------------------------------------------------------------------------------------------ */
/* Export                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export function toMarkdown(blocks: readonly BlockInput[]): string {
  let out = '';
  let previous: BlockContent | undefined;
  const counters: number[] = [];
  for (const input of blocks) {
    const block = normalizeBlock(input);
    const isList = LIST_TYPES.has(block.type);
    if (previous) out += isList && LIST_TYPES.has(previous.type) ? '\n' : '\n\n';
    if (block.type === 'numbered') {
      const depth = block.indent ?? 0;
      counters.length = depth + 1;
      counters[depth] = (counters[depth] ?? 0) + 1;
    } else if (!isList) counters.length = 0;
    out += renderBlock(block, counters[block.indent ?? 0] ?? 1);
    previous = block;
  }
  return out.length > 0 ? `${out}\n` : '';
}

function renderBlock(block: BlockContent, number: number): string {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level ?? 1)} ${block.text}`;
    case 'divider':
      return '---';
    case 'quote':
      return block.text
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n');
    case 'code': {
      const fence = '`'.repeat(Math.max(3, longestFence(block.text) + 1));
      return `${fence}${block.lang ?? ''}\n${block.text}\n${fence}`;
    }
    case 'bullet':
    case 'numbered':
    case 'todo': {
      const pad = '  '.repeat(block.indent ?? 0);
      const marker =
        block.type === 'bullet'
          ? '- '
          : block.type === 'numbered'
            ? `${number}. `
            : block.checked
              ? '- [x] '
              : '- [ ] ';
      const continuation = ' '.repeat(pad.length + marker.length);
      const [first = '', ...rest] = block.text.split('\n');
      const needsEscape =
        /^(?:\s|\[[ xX]\]|\\)/.test(first) || DIVIDER_RE.test(pad + marker + first);
      const head = needsEscape ? `\\${first}` : first;
      return [pad + marker + head, ...rest.map((line) => continuation + escapeLine(line))].join(
        '\n',
      );
    }
    default:
      return block.text.split('\n').map(escapeLine).join('\n');
  }
}

/** Longest run of backticks that starts a line (a code fence must be longer). */
function longestFence(text: string): number {
  let longest = 0;
  for (const match of text.matchAll(/^\s*(`+)/gm))
    longest = Math.max(longest, match[1]?.length ?? 0);
  return longest;
}

/** Paragraph lines that would read as block syntax (or start with `\`) get a `\` prefix. */
function escapeLine(line: string): string {
  if (!isBlockStart(line) && !/^\s*\\/.test(line)) return line;
  const lead = /^\s*/.exec(line)?.[0] ?? '';
  return `${lead}\\${line.slice(lead.length)}`;
}

function unescapeLine(line: string): string {
  return line.replace(/^(\s*)\\/, '$1');
}

/* ------------------------------------------------------------------------------------------ */
/* Import                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const FENCE_RE = /^(`{3,})\s*([^`\s]*)\s*$/;
const HEADING_RE = /^(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const DIVIDER_RE = /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const QUOTE_RE = /^ {0,3}>/;
const TODO_RE = /^(\s*)([-*+])[ \t]+\[([ xX])\](?:[ \t]+(.*))?$/;
const BULLET_RE = /^(\s*)([-*+])(?:[ \t]+(.*))?$/;
const NUMBERED_RE = /^(\s*)(\d{1,9})[.)](?:[ \t]+(.*))?$/;

function isBlockStart(line: string): boolean {
  return (
    FENCE_RE.test(line) ||
    HEADING_RE.test(line) ||
    DIVIDER_RE.test(line) ||
    QUOTE_RE.test(line) ||
    BULLET_RE.test(line) ||
    NUMBERED_RE.test(line)
  );
}

export function fromMarkdown(markdown: string): BlockContent[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: BlockContent[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] as string;
    if (line.trim() === '') {
      i++;
      continue;
    }
    const parsed = parseBlock(lines, i);
    blocks.push(normalizeBlock(parsed.block));
    i = parsed.next;
  }
  return blocks;
}

interface Parsed {
  block: BlockInput;
  next: number;
}

function parseBlock(lines: readonly string[], start: number): Parsed {
  const line = lines[start] as string;
  const fence = FENCE_RE.exec(line);
  if (fence) return parseCode(lines, start, (fence[1] as string).length, fence[2] ?? '');
  const heading = HEADING_RE.exec(line);
  if (heading) {
    const block = { type: 'heading', level: (heading[1] as string).length, text: heading[2] ?? '' };
    return { block, next: start + 1 };
  }
  if (DIVIDER_RE.test(line)) return { block: { type: 'divider' }, next: start + 1 };
  if (QUOTE_RE.test(line)) {
    const text: string[] = [];
    let i = start;
    while (i < lines.length && QUOTE_RE.test(lines[i] as string)) {
      text.push((lines[i] as string).replace(/^ {0,3}> ?/, ''));
      i++;
    }
    return { block: { type: 'quote', text: text.join('\n') }, next: i };
  }
  const item = parseListItem(line);
  if (item) return collectContinuation(lines, start, item);
  return parseParagraph(lines, start);
}

function parseCode(lines: readonly string[], start: number, width: number, lang: string): Parsed {
  const body: string[] = [];
  let i = start + 1;
  const close = new RegExp(`^\`{${width},}\\s*$`);
  while (i < lines.length && !close.test(lines[i] as string)) body.push(lines[i++] as string);
  return { block: { type: 'code', lang, text: body.join('\n') }, next: i + 1 };
}

interface ListItem {
  block: BlockInput;
  /** Column where the item's text starts (continuation lines are dedented up to it). */
  column: number;
}

function parseListItem(line: string): ListItem | undefined {
  const todo = TODO_RE.exec(line);
  const bullet = todo ? null : BULLET_RE.exec(line);
  const numbered = todo || bullet ? null : NUMBERED_RE.exec(line);
  const match = todo ?? bullet ?? numbered;
  if (!match) return undefined;
  const lead = (match[1] as string).replace(/\t/g, '  ').length;
  const indent = Math.floor(lead / 2);
  const raw = (todo ? todo[4] : match[3]) ?? '';
  const column = line.length - raw.length;
  const text = raw.startsWith('\\') ? raw.slice(1) : raw;
  if (todo) {
    return { block: { type: 'todo', indent, text, checked: todo[3] !== ' ' }, column };
  }
  return { block: { type: bullet ? 'bullet' : 'numbered', indent, text }, column };
}

function collectContinuation(lines: readonly string[], start: number, item: ListItem): Parsed {
  const text = [item.block.text ?? ''];
  let i = start + 1;
  while (i < lines.length) {
    const line = lines[i] as string;
    if (line.trim() === '' || !/^\s/.test(line) || isBlockStart(line)) break;
    const lead = (/^\s*/.exec(line)?.[0] ?? '').length;
    text.push(unescapeLine(line.slice(Math.min(lead, item.column))));
    i++;
  }
  return { block: { ...item.block, text: text.join('\n') }, next: i };
}

function parseParagraph(lines: readonly string[], start: number): Parsed {
  const text: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i] as string;
    if (line.trim() === '' || (i > start && isBlockStart(line))) break;
    text.push(unescapeLine(line));
    i++;
  }
  return { block: { type: 'paragraph', text: text.join('\n') }, next: i };
}
