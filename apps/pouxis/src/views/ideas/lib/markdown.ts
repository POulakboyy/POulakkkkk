/**
 * Minimal Markdown model for the hybrid editor (5.11). Each line is one block; inline spans are
 * parsed on demand. Only what notes need: headings, lists, tasks, quotes, rules, emphasis,
 * inline code, links and `[[wiki links]]`.
 */

export type BlockKind =
  | 'blank'
  | 'heading'
  | 'bullet'
  | 'ordered'
  | 'task'
  | 'quote'
  | 'rule'
  | 'paragraph';

export interface Block {
  kind: BlockKind;
  /** Source text before the content (`## `, `  - [ ] `, `> `…). */
  marker: string;
  content: string;
  /** Heading level (1–3; deeper headings render as level 3). */
  level?: 1 | 2 | 3;
  /** Nesting depth of list items (two spaces or one tab per level). */
  depth?: number;
  checked?: boolean;
  /** Number of an ordered list item. */
  number?: number;
}

const HEADING_RE = /^(#{1,6})\s(.*)$/;
const RULE_RE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const TASK_RE = /^(\s*)([-*+])\s\[( |x|X)\]\s(.*)$/;
const BULLET_RE = /^(\s*)([-*+])\s(.*)$/;
const ORDERED_RE = /^(\s*)(\d{1,9})([.)])\s(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;

function depthOf(indent: string): number {
  return indent.replace(/\t/g, '  ').length >> 1;
}

export function parseLine(line: string): Block {
  if (line.trim() === '') return { kind: 'blank', marker: '', content: line };
  const heading = HEADING_RE.exec(line);
  if (heading) {
    const hashes = heading[1] ?? '#';
    const content = heading[2] ?? '';
    const level = Math.min(hashes.length, 3) as 1 | 2 | 3;
    return { kind: 'heading', level, marker: line.slice(0, line.length - content.length), content };
  }
  if (RULE_RE.test(line)) return { kind: 'rule', marker: line, content: '' };
  const task = TASK_RE.exec(line);
  if (task) {
    const content = task[4] ?? '';
    return {
      kind: 'task',
      marker: line.slice(0, line.length - content.length),
      content,
      depth: depthOf(task[1] ?? ''),
      checked: task[3] !== ' ',
    };
  }
  const bullet = BULLET_RE.exec(line);
  if (bullet) {
    const content = bullet[3] ?? '';
    return {
      kind: 'bullet',
      marker: line.slice(0, line.length - content.length),
      content,
      depth: depthOf(bullet[1] ?? ''),
    };
  }
  const ordered = ORDERED_RE.exec(line);
  if (ordered) {
    const content = ordered[4] ?? '';
    return {
      kind: 'ordered',
      marker: line.slice(0, line.length - content.length),
      content,
      depth: depthOf(ordered[1] ?? ''),
      number: Number(ordered[2]),
    };
  }
  const quote = QUOTE_RE.exec(line);
  if (quote) {
    const content = quote[1] ?? '';
    return { kind: 'quote', marker: line.slice(0, line.length - content.length), content };
  }
  return { kind: 'paragraph', marker: '', content: line };
}

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong' | 'em' | 'strike'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'wiki'; target: string; label: string; embed: boolean };

// Order matters: earlier alternatives win when two start at the same index.
const INLINE_RE = new RegExp(
  [
    '(?<code>`[^`\\n]+`)',
    '(?<wiki>!?\\[\\[[^[\\]\\n]+?\\]\\])',
    '(?<link>\\[[^\\]\\n]+\\]\\([^)\\s]+\\))',
    '(?<url>https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?])',
    '(?<strong>\\*\\*(?=\\S)[^\\n]*?\\S\\*\\*|__(?=\\S)[^\\n]*?\\S__)',
    '(?<strike>~~(?=\\S)[^\\n]*?\\S~~)',
    '(?<em>\\*(?=[^\\s*])[^*\\n]*?[^\\s*]\\*|\\*[^\\s*]\\*|(?<![\\p{L}\\d_])_(?=\\S)[^_\\n]*?\\S_(?![\\p{L}\\d_]))',
  ].join('|'),
  'gu',
);

/** Only these URL schemes become clickable links; anything else stays plain text. */
export function safeHref(href: string): string | null {
  return /^(https?:|mailto:)/i.test(href.trim()) ? href.trim() : null;
}

function parseWiki(raw: string): Inline {
  const embed = raw.startsWith('!');
  const inner = raw.slice(embed ? 3 : 2, -2);
  const [targetPart = '', alias] = inner.split('|');
  const [target = '', heading] = targetPart.split('#');
  const cleanTarget = target.trim();
  const label = alias?.trim() || (heading ? `${cleanTarget} › ${heading.trim()}` : cleanTarget);
  return { type: 'wiki', target: cleanTarget, label, embed };
}

function token(groups: Record<string, string | undefined>, raw: string): Inline {
  if (groups.code) return { type: 'code', text: raw.slice(1, -1) };
  if (groups.wiki) return parseWiki(raw);
  if (groups.link) {
    const close = raw.indexOf('](');
    const label = raw.slice(1, close);
    const href = safeHref(raw.slice(close + 2, -1));
    return href ? { type: 'link', label, href } : { type: 'text', text: label };
  }
  if (groups.url) return { type: 'link', label: raw, href: raw };
  if (groups.strong) return { type: 'strong', children: parseInline(raw.slice(2, -2)) };
  if (groups.strike) return { type: 'strike', children: parseInline(raw.slice(2, -2)) };
  return { type: 'em', children: parseInline(raw.slice(1, -1)) };
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index;
    if (index > last) out.push({ type: 'text', text: text.slice(last, index) });
    out.push(token(match.groups ?? {}, match[0]));
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** Plain text of a Markdown line, without markers or emphasis (for excerpts). */
export function plainText(line: string): string {
  const flatten = (nodes: Inline[]): string =>
    nodes
      .map((n) => {
        if (n.type === 'text' || n.type === 'code') return n.text;
        if (n.type === 'link' || n.type === 'wiki') return n.label;
        return flatten(n.children);
      })
      .join('');
  return flatten(parseInline(parseLine(line).content)).trim();
}
