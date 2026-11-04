import { describe, expect, it } from 'vitest';
import { clipToBox, toSVG } from './svg.ts';
import { edge, node } from './test-utils.ts';

describe('toSVG', () => {
  const g = {
    nodes: [
      node('a', 0, 0, { color: 2 }),
      node('b', 300, 0, { label: '</text><script>alert(1)</script>' }),
      node('c', 300, 200),
    ],
    edges: [edge('a', 'b', undefined, 'R&D'), edge('b', 'c', 'on-complete'), edge('a', 'ghost')],
  };

  it('produces a self-contained, transparent SVG sized to the content', () => {
    const svg = toSVG(g, { padding: 10, title: 'Map' });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>Map</title>');
    expect(svg).toContain('viewBox="-46 -29.25 472.06 258.5"');
    // Three node boxes and no background rectangle.
    expect((svg.match(/<rect /g) ?? []).length).toBe(3);
    expect((svg.match(/<line /g) ?? []).length).toBe(2);
    expect(svg).toContain('stroke-dasharray="6 4"');
  });

  it('escapes labels, edge labels and colours', () => {
    const svg = toSVG(g, { palette: ['red', '"><script>'], background: 'url("x")' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;/text&gt;&lt;script&gt;');
    expect(svg).toContain('R&amp;D');
    expect(svg).toContain('fill="&quot;&gt;&lt;script&gt;"');
    expect(svg).toContain('fill="url(&quot;x&quot;)"');
  });

  it('uses the palette by 1-based colour index and falls back to the node fill', () => {
    const svg = toSVG(g, { palette: ['#111111', '#222222'], nodeFill: '#fafafa' });
    expect(svg).toContain('fill="#222222"');
    expect(svg).toContain('fill="#fafafa"');
    expect(svg).not.toContain('fill="#111111"');
  });

  it('truncates long labels without splitting emoji', () => {
    const long = { nodes: [node('a', 0, 0, { label: '😀'.repeat(100) })], edges: [] };
    const svg = toSVG(long, { maxNodeWidth: 120 });
    const text = /dominant-baseline="central">([^<]*)<\/text>/.exec(svg)?.[1] ?? '';
    expect(text.endsWith('…')).toBe(true);
    expect(text).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  it('hides collapsed branches with a "+N" badge unless asked otherwise', () => {
    const tree = {
      nodes: [node('r', 0, 0, { collapsed: true }), node('k', 0, 100, { parentId: 'r' })],
      edges: [],
    };
    expect(toSVG(tree)).toContain('>+1</text>');
    expect(toSVG(tree)).not.toContain('>K</text>');
    expect(toSVG(tree, { respectCollapsed: false })).toContain('>K</text>');
  });

  it('renders an empty graph', () => {
    expect(toSVG({ nodes: [], edges: [] })).toContain('viewBox="-32 -32 64 64"');
  });
});

describe('clipToBox', () => {
  it('returns the border point towards the target', () => {
    const box = { x: -10, y: -5, width: 20, height: 10 };
    expect(clipToBox(box, { x: 100, y: 0 })).toEqual({ x: 10, y: 0 });
    expect(clipToBox(box, { x: 0, y: -100 })).toEqual({ x: 0, y: -5 });
    expect(clipToBox(box, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(clipToBox(box, { x: 2, y: 1 })).toEqual({ x: 2, y: 1 });
  });
});
