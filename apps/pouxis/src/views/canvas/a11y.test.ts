import { describe, expect, it } from 'vitest';
import { translate, type MessageKey, type MessageVars } from '../../i18n/index.ts';
import { describeNode, describeSelection } from './a11y.ts';
import type { SceneNode } from './engine/scene.ts';

const t = (key: MessageKey, vars?: MessageVars) => translate('fr', key, vars);

function node(over: Partial<SceneNode> & { label?: string } = {}): SceneNode {
  const { label = 'Design', ...rest } = over;
  return {
    id: 'n1',
    node: { id: 'n1', label, kind: 'idea', x: 0, y: 0 },
    x: 0,
    y: 0,
    w: 100,
    h: 32,
    text: label,
    locked: false,
    done: false,
    hasChildren: false,
    hiddenCount: 0,
    order: 0,
    ...rest,
  };
}

describe('describeNode', () => {
  it('reads the label alone for a plain node', () => {
    expect(describeNode(t, node())).toBe('Design');
  });

  it('adds done, locked and collapsed states in reading order', () => {
    expect(describeNode(t, node({ done: true, locked: true, hiddenCount: 3 }))).toBe(
      'Design, terminée, verrouillée, 3 éléments repliés',
    );
  });

  it('names empty nodes instead of reading nothing', () => {
    expect(describeNode(t, node({ label: '  ' }))).toBe('Nœud sans texte');
  });
});

describe('describeSelection', () => {
  it('is silent without a selection and counts multiple nodes', () => {
    expect(describeSelection(t, [])).toBe('');
    expect(describeSelection(t, [node(), node({ id: 'n2' })])).toBe('2 nœuds sélectionnés');
  });
});
