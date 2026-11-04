import { describe, expect, it } from 'vitest';
import {
  fromMarkdown,
  normalizeBlock,
  toMarkdown,
  type BlockContent,
  type BlockType,
} from './markdown.ts';
import { int, pick, prng } from './test-utils.ts';

describe('Markdown blocks', () => {
  it('parses every block type', () => {
    const md = [
      '# Titre',
      '',
      'Un paragraphe',
      'sur deux lignes.',
      '',
      '- puce',
      '  - imbriquée',
      '- [x] fait',
      '- [ ] à faire',
      '1. premier',
      '2. second',
      '',
      '> citation',
      '> suite',
      '',
      '```ts',
      'const a = 1;',
      '',
      '```',
      '',
      '---',
    ].join('\n');
    expect(fromMarkdown(md)).toEqual([
      { type: 'heading', level: 1, text: 'Titre' },
      { type: 'paragraph', text: 'Un paragraphe\nsur deux lignes.' },
      { type: 'bullet', text: 'puce' },
      { type: 'bullet', text: 'imbriquée', indent: 1 },
      { type: 'todo', text: 'fait', checked: true },
      { type: 'todo', text: 'à faire', checked: false },
      { type: 'numbered', text: 'premier' },
      { type: 'numbered', text: 'second' },
      { type: 'quote', text: 'citation\nsuite' },
      { type: 'code', lang: 'ts', text: 'const a = 1;\n' },
      { type: 'divider', text: '' },
    ]);
  });

  it('renders lists tightly, numbers ordered items and fences code safely', () => {
    const md = toMarkdown([
      { type: 'numbered', text: 'a' },
      { type: 'numbered', text: 'b' },
      { type: 'bullet', text: 'c' },
      { type: 'code', text: '```\nnested fence\n```' },
    ]);
    expect(md).toBe('1. a\n2. b\n- c\n\n````\n```\nnested fence\n```\n````\n');
  });

  it('escapes paragraph lines that would read as block syntax', () => {
    const blocks: BlockContent[] = [
      { type: 'paragraph', text: '# pas un titre\n- pas une puce\n1. pas une liste\n\\antislash' },
      { type: 'bullet', text: '[ ] pas une case' },
      { type: 'bullet', text: '--' },
    ];
    expect(fromMarkdown(toMarkdown(blocks))).toEqual(blocks);
  });

  it('round-trips random documents', () => {
    const random = prng(17);
    const types: BlockType[] = [
      'paragraph',
      'heading',
      'bullet',
      'numbered',
      'todo',
      'quote',
      'code',
      'divider',
    ];
    const words = [
      'alpha',
      '# x',
      '- y',
      '> z',
      '1. n',
      '`code`',
      '**gras**',
      '\\',
      '[ ]',
      'é🙂',
      '---',
    ];
    const line = () =>
      Array.from({ length: 1 + int(random, 4) }, () => pick(random, words)).join(' ');
    for (let doc = 0; doc < 200; doc++) {
      const blocks = Array.from({ length: 1 + int(random, 8) }, () => {
        const type = pick(random, types);
        const lines = type === 'heading' ? 1 : 1 + int(random, 3);
        return normalizeBlock({
          type,
          text: Array.from({ length: lines }, line).join('\n'),
          level: 1 + int(random, 6),
          checked: random() < 0.5,
          indent: int(random, 3),
          lang: random() < 0.5 ? 'ts' : '',
        });
      });
      expect(fromMarkdown(toMarkdown(blocks))).toEqual(blocks);
    }
  });

  it('normalizes unknown types and irrelevant attributes', () => {
    expect(normalizeBlock({ type: 'video', text: 'x', level: 3 })).toEqual({
      type: 'paragraph',
      text: 'x',
    });
    expect(normalizeBlock({ type: 'heading', text: 'a\nb', level: 9 })).toEqual({
      type: 'heading',
      text: 'a b',
      level: 6,
    });
    expect(toMarkdown([])).toBe('');
  });
});
