import { describe, expect, it } from 'vitest';
import { buildHierarchy, preorder } from './hierarchy.ts';
import { OpmlError, decodeXmlEntities, escapeXml, fromOPML, toOPML } from './opml.ts';
import { sequentialIds, treeGraph } from './test-utils.ts';
import type { GraphContent } from './types.ts';

function shape(g: GraphContent): string[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n.label]));
  return preorder(buildHierarchy(g)).map((e) => `${e.depth}:${byId.get(e.id)}`);
}

const g = treeGraph([
  ['r', 'a'],
  ['a', 'a1'],
  ['r', 'b'],
]);

describe('toOPML', () => {
  it('writes a well-formed OPML 2.0 document', () => {
    expect(toOPML(g, { title: 'Map & co' })).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<opml version="2.0">',
        '  <head>',
        '    <title>Map &amp; co</title>',
        '  </head>',
        '  <body>',
        '    <outline text="R">',
        '      <outline text="A">',
        '        <outline text="A1"/>',
        '      </outline>',
        '      <outline text="B"/>',
        '    </outline>',
        '  </body>',
        '</opml>',
        '',
      ].join('\n'),
    );
  });

  it('escapes markup, quotes, newlines and drops characters XML cannot carry', () => {
    expect(escapeXml('<a href="x">\'&\'</a>\n\u0001')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;&#10;',
    );
    expect(escapeXml('\uD800 ok 😀')).toBe(' ok 😀');
  });
});

describe('fromOPML', () => {
  it('round-trips toOPML', () => {
    const tricky = {
      ...g,
      nodes: g.nodes.map((n) => (n.id === 'a1' ? { ...n, label: '"<x>" & \'y\'\nz' } : n)),
    };
    const back = fromOPML(toOPML(tricky, { title: 'T' }), { makeId: sequentialIds() });
    expect(back.title).toBe('T');
    expect(shape(back)).toEqual(shape(tricky));
  });

  it('reads text or title attributes, single quotes, comments and CDATA, and skips foreign elements', () => {
    const xml = `<?xml version="1.0"?>
      <!DOCTYPE opml>
      <opml version="1.0"><head><title>Hi &#x1F600;</title></head>
      <body>
        <!-- <outline text="commented"/> -->
        <outline title='One &gt; zero' x="a>b">
          <![CDATA[ <outline text="cdata"/> ]]>
          <extra><outline text="foreign"/></extra>
          <outline text="Two"/>
        </outline>
      </body></opml>`;
    const back = fromOPML(xml, { makeId: sequentialIds(), layout: false });
    expect(back.title).toBe('Hi 😀');
    expect(shape(back)).toEqual(['0:One > zero', '1:Two']);
  });

  it('decodes only predefined and numeric entities', () => {
    expect(decodeXmlEntities('&lt;&amp;&#65;&#x42;&nbsp;&#0;')).toBe('<&AB&nbsp;�');
  });

  it('rejects entity declarations (XXE, billion laughs) and malformed documents', () => {
    const lol = '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol">]><opml><body/></opml>';
    expect(() => fromOPML(lol)).toThrow(OpmlError);
    expect(() => fromOPML('<html><body/></html>')).toThrow(/root must be <opml>/);
    expect(() => fromOPML('plain text')).toThrow(/Not an OPML/);
    expect(() => fromOPML('<opml><body><outline text="a"></body></opml>')).toThrow(/Unexpected/);
    expect(() => fromOPML('<opml><body>')).toThrow(/Unclosed/);
    expect(() => fromOPML('<opml><body><outline text="a')).toThrow(/Unterminated/);
    expect(() => fromOPML('<opml><!-- never closed')).toThrow(/Unterminated comment/);
  });

  it('enforces the node limit', () => {
    const many = `<opml><body>${'<outline text="x"/>'.repeat(11)}</body></opml>`;
    expect(() => fromOPML(many, { maxNodes: 10 })).toThrow(/More than 10/);
    expect(fromOPML(many, { maxNodes: 11 }).nodes.length).toBe(11);
  });

  it('parses a large document in linear time', () => {
    const xml = `<opml><body>${'<outline text="item">'.repeat(2000)}${'</outline>'.repeat(2000)}</body></opml>`;
    const t0 = performance.now();
    const back = fromOPML(xml, { makeId: sequentialIds(), layout: false });
    expect(back.nodes.length).toBe(2000);
    expect(back.nodes[1999]?.parentId).toBe('n1998');
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});
