import { describe, expect, it } from 'vitest';
import type { GraphContent } from './types.ts';
import { buildHierarchy, preorder } from './hierarchy.ts';
import { fromOutline, outlineLabel, toOutline } from './outline.ts';
import { node, sequentialIds, treeGraph } from './test-utils.ts';

function shape(g: GraphContent): string[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n.label]));
  return preorder(buildHierarchy(g)).map((e) => `${e.depth}:${byId.get(e.id)}`);
}

describe('toOutline', () => {
  const g = treeGraph([
    ['r', 'a'],
    ['a', 'a1'],
    ['r', 'b'],
  ]);

  it('writes a nested Markdown list in tree order', () => {
    expect(toOutline(g)).toBe('- R\n  - A\n    - A1\n  - B\n');
  });

  it('supports a title, a sub-tree, checkboxes and custom indentation', () => {
    const tasks: GraphContent = {
      nodes: [
        node('t', 0, 0, { kind: 'task', refId: 'x' }),
        node('u', 0, 0, { kind: 'task', parentId: 't' }),
      ],
      edges: [],
    };
    expect(toOutline(tasks, { title: 'Plan', doneIds: ['x'], indent: '\t' })).toBe(
      '# Plan\n\n- [x] T\n\t- [ ] U\n',
    );
    expect(toOutline(g, { rootId: 'a' })).toBe('- A\n  - A1\n');
    expect(toOutline(g, { rootId: 'missing' })).toBe('');
    expect(toOutline({ nodes: [], edges: [] })).toBe('');
  });

  it('can skip collapsed branches', () => {
    const collapsed = {
      ...g,
      nodes: g.nodes.map((n) => (n.id === 'a' ? { ...n, collapsed: true } : n)),
    };
    expect(toOutline(collapsed, { respectCollapsed: true })).toBe('- R\n  - A\n  - B\n');
    expect(toOutline(collapsed)).toContain('A1');
  });

  it('flattens and escapes labels', () => {
    expect(outlineLabel('  two\nlines ')).toBe('two lines');
    expect(outlineLabel('- dash')).toBe('\\- dash');
    expect(outlineLabel('1. first')).toBe('\\1. first');
    expect(outlineLabel('[x] box')).toBe('\\[x] box');
  });
});

describe('fromOutline', () => {
  it('parses nested bullets of any marker and indentation', () => {
    const md = '- Root\n    * Child\n        + Grandchild\n    1. Second child\n- Other root\n';
    const g = fromOutline(md, { makeId: sequentialIds(), layout: false });
    expect(shape(g)).toEqual([
      '0:Root',
      '1:Child',
      '2:Grandchild',
      '1:Second child',
      '0:Other root',
    ]);
    expect(g.nodes[1]).toMatchObject({ id: 'n1', parentId: 'n0', kind: 'idea', x: 0, y: 0 });
    expect(g.edges[0]).toEqual({ id: 'tree:n0>n1', from: 'n0', to: 'n1', condition: 'always' });
  });

  it('nests bullets under headings, joins continuation lines and skips code and rules', () => {
    const md = [
      '# Project',
      '## Phase 1',
      '- [x] Kick-off',
      '  meeting',
      '- [ ] Spec',
      '```',
      '- not an item',
      '```',
      '---',
      '## Phase 2 ##',
      'Loose paragraph',
      '# Annex',
    ].join('\r\n');
    const g = fromOutline(md, { makeId: sequentialIds(), layout: false });
    expect(shape(g)).toEqual([
      '0:Project',
      '1:Phase 1',
      '2:Kick-off meeting',
      '2:Spec',
      '1:Phase 2',
      '2:Loose paragraph',
      '0:Annex',
    ]);
    expect(g.checked).toEqual(['n2']);
  });

  it('round-trips toOutline, escaped markers included', () => {
    const g = treeGraph([
      ['r', 'a'],
      ['a', 'a1'],
      ['r', 'b'],
    ]);
    const tricky = {
      ...g,
      nodes: g.nodes.map((n) => (n.id === 'b' ? { ...n, label: '- [x] # not markup' } : n)),
    };
    const back = fromOutline(toOutline(tricky), { makeId: sequentialIds() });
    expect(shape(back)).toEqual(shape(tricky));
    expect(back.checked).toEqual([]);
  });

  it('lays the result out as a horizontal mind map by default', () => {
    const g = fromOutline('- a\n  - b\n  - c', { makeId: sequentialIds() });
    const [a, b, c] = g.nodes;
    expect(b?.x).toBeGreaterThan(a?.x ?? 0);
    expect(b?.y).not.toBe(c?.y);
  });

  it('clamps depth jumps and ignores empty documents', () => {
    const g = fromOutline('- a\n        - b', { makeId: sequentialIds(), layout: false });
    expect(shape(g)).toEqual(['0:a', '1:b']);
    expect(fromOutline('\n\n').nodes).toEqual([]);
  });
});
