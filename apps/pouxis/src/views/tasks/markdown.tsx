/**
 * Minimal, safe Markdown renderer for task notes: headings, paragraphs, bullet and numbered
 * lists, task checkboxes, quotes, inline code, bold, italic and http(s) links. It builds React
 * elements directly — never HTML strings — so notes cannot inject markup or scripts.
 */
import type { ReactNode } from 'react';

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; ordered: boolean; items: { text: string; checked?: boolean }[] };

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*+]\s+(?:\[([ xX])\]\s+)?(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line) {
      flush();
    } else if (heading) {
      flush();
      const level = heading[1]!.length as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, text: heading[2] ?? '' });
    } else if (line.startsWith('>')) {
      flush();
      blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') });
    } else if (bullet || numbered) {
      flush();
      const ordered = !bullet;
      const item = bullet
        ? {
            text: bullet[2] ?? '',
            ...(bullet[1] !== undefined && { checked: bullet[1].toLowerCase() === 'x' }),
          }
        : { text: numbered?.[1] ?? '' };
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list' && last.ordered === ordered) last.items.push(item);
      else blocks.push({ type: 'list', ordered, items: [item] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)|(\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const index = m.index;
    if (index > last) out.push(text.slice(last, index));
    const token = m[0];
    const key = `${index}`;
    if (m[1]) out.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (m[3]) out.push(<em key={key}>{token.slice(1, -1)}</em>);
    else out.push(renderLink(token, key));
    last = index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderLink(token: string, key: string): ReactNode {
  const [, label = '', href = ''] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token) ?? [];
  if (!/^https?:\/\//i.test(href)) return token;
  return (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={className}>
      {parseBlocks(source).map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const Tag = (['h3', 'h4', 'h5'] as const)[block.level - 1] ?? 'h5';
            return <Tag key={i}>{renderInline(block.text)}</Tag>;
          }
          case 'quote':
            return <blockquote key={i}>{renderInline(block.text)}</blockquote>;
          case 'paragraph':
            return <p key={i}>{renderInline(block.text)}</p>;
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
              <Tag key={i}>
                {block.items.map((item, j) => (
                  <li key={j} data-checked={item.checked}>
                    {item.checked !== undefined && (
                      <span>{item.checked ? '☑ ' : '☐ '}</span>
                    )}
                    {renderInline(item.text)}
                  </li>
                ))}
              </Tag>
            );
          }
        }
      })}
    </div>
  );
}
