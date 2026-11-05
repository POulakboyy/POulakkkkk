import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Markdown, parseBlocks, safeHttpUrl } from '../markdown.tsx';

afterEach(cleanup);

describe('parseBlocks', () => {
  it('reads headings, lists, checkboxes, quotes and paragraphs', () => {
    expect(parseBlocks('# Titre\n- [x] fait\n- reste\n1. un\n> cité\nligne\nsuite')).toEqual([
      { type: 'heading', level: 1, text: 'Titre' },
      { type: 'list', ordered: false, items: [{ text: 'fait', checked: true }, { text: 'reste' }] },
      { type: 'list', ordered: true, items: [{ text: 'un' }] },
      { type: 'quote', text: 'cité' },
      { type: 'paragraph', text: 'ligne suite' },
    ]);
  });
});

describe('Markdown', () => {
  it('renders inline styles and only http(s) links', () => {
    const { container } = render(
      <Markdown
        source={'**gras** _it_ `code` [ok](https://a.fr) [ko](javascript:alert(1)) <b>x</b>'}
      />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('gras');
    expect(container.querySelector('em')?.textContent).toBe('it');
    expect(container.querySelector('code')?.textContent).toBe('code');
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute('rel')).toBe('noopener noreferrer');
    expect(container.querySelector('b')).toBeNull();
  });
});

describe('safeHttpUrl', () => {
  it('accepts only absolute http(s) addresses', () => {
    expect(safeHttpUrl('https://example.org/a?b=1')).toBe('https://example.org/a?b=1');
    expect(safeHttpUrl('HTTP://Example.org')).toBe('http://example.org/');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,<b>x</b>')).toBeNull();
    expect(safeHttpUrl('/relative')).toBeNull();
  });
});
