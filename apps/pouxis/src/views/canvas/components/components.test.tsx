import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Graph, GraphNode } from '@pouxis/core';
import { navigate } from '../../../app/router.ts';
import { store } from '../../../store/index.ts';
import CanvasView from '../index.tsx';
import { buildScene } from '../engine/scene.ts';
import { OutlineView } from './OutlineView.tsx';
import { Presenter } from './Presenter.tsx';
import { SelectionBar } from './SelectionBar.tsx';
import type { OutlineRow } from '../model.ts';

const flush = () => act(async () => await new Promise((r) => setTimeout(r, 0)));

function node(id: string, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, label: id, kind: 'idea', x: 0, y: 0, ...extra };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CanvasView', () => {
  let graph: Graph;

  beforeEach(async () => {
    store.setPrefs({ locale: 'fr' });
    graph = store.create('graphs', {
      title: 'Atelier',
      nodes: [
        node('root', { label: 'Racine' }),
        node('kid', { label: 'Branche', parentId: 'root', x: 260 }),
      ],
      edges: [{ id: 'e1', from: 'root', to: 'kid', condition: 'always' }],
    });
    navigate('canvas', { graph: graph.id });
    await flush();
  });

  it('renders the canvas as a labelled, keyboard-focusable application', async () => {
    render(<CanvasView />);
    await flush();
    const canvas = screen.getByRole('application');
    expect(canvas.getAttribute('aria-label')).toContain('Atelier');
    expect(canvas.getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('toolbar', { name: 'Outils' })).toBeTruthy();
    expect(screen.getByLabelText('Titre de la toile')).toHaveProperty('value', 'Atelier');
  });

  it('switches tools with single-key shortcuts', async () => {
    render(<CanvasView />);
    await flush();
    const canvas = screen.getByRole('application');
    fireEvent.keyDown(canvas, { key: 'p' });
    expect(screen.getByRole('button', { name: 'Crayon' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('group', { name: 'Encre' })).toBeTruthy();
    fireEvent.keyDown(canvas, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Sélection' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('creates a node from the keyboard and saves its label', async () => {
    render(<CanvasView />);
    await flush();
    fireEvent.keyDown(screen.getByRole('application'), { key: 'Enter' });
    await flush();
    const input = screen.getByLabelText('Texte du nœud');
    fireEvent.change(input, { target: { value: 'Nouvelle piste' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(store.get('graphs', graph.id)?.nodes.some((n) => n.label === 'Nouvelle piste')).toBe(
      true,
    );
  });

  it('drops an untouched new node instead of keeping an empty box', async () => {
    render(<CanvasView />);
    await flush();
    fireEvent.keyDown(screen.getByRole('application'), { key: 'Enter' });
    await flush();
    fireEvent.keyDown(screen.getByLabelText('Texte du nœud'), { key: 'Escape' });
    await flush();
    expect(store.get('graphs', graph.id)?.nodes).toHaveLength(2);
  });

  it('offers an outline view that collapses branches from the keyboard', async () => {
    render(<CanvasView />);
    await flush();
    fireEvent.click(screen.getByRole('radio', { name: 'Plan' }));
    await flush();
    const tree = screen.getByRole('tree', { name: 'Plan de la toile' });
    const items = within(tree).getAllByRole('treeitem');
    expect(items.map((i) => i.getAttribute('aria-level'))).toEqual(['1', '2']);
    expect(items[0]?.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(items[0]!, { key: 'ArrowLeft' });
    await flush();
    expect(store.get('graphs', graph.id)?.nodes.find((n) => n.id === 'root')?.collapsed).toBe(true);
  });

  it('renames the canvas from its title field', async () => {
    render(<CanvasView />);
    await flush();
    const title = screen.getByLabelText('Titre de la toile');
    fireEvent.change(title, { target: { value: 'Atelier v2' } });
    fireEvent.blur(title);
    await flush();
    expect(store.get('graphs', graph.id)?.title).toBe('Atelier v2');
  });
});

describe('OutlineView', () => {
  const rows: OutlineRow[] = [
    {
      id: 'a',
      label: 'A',
      depth: 0,
      kind: 'idea',
      childCount: 1,
      collapsed: false,
      locked: false,
      done: false,
      index: 1,
      siblings: 1,
    },
    {
      id: 'b',
      label: 'B',
      depth: 1,
      kind: 'task',
      childCount: 0,
      collapsed: false,
      locked: false,
      done: false,
      index: 1,
      siblings: 1,
    },
  ];

  it('moves focus with arrows, checks tasks with Space and edits with Enter', async () => {
    const onToggleDone = vi.fn();
    const onRename = vi.fn();
    render(
      <OutlineView
        rows={rows}
        onToggleCollapse={vi.fn()}
        onRename={onRename}
        onToggleDone={onToggleDone}
        onDelete={vi.fn()}
      />,
    );
    const [a, b] = screen.getAllByRole('treeitem');
    a!.focus();
    fireEvent.keyDown(a!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(b);
    fireEvent.keyDown(b!, { key: ' ' });
    expect(onToggleDone).toHaveBeenCalledWith('b');
    fireEvent.keyDown(b!, { key: 'Enter' });
    const input = screen.getByLabelText('Texte du nœud');
    fireEvent.change(input, { target: { value: 'B2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('b', 'B2');
  });
});

describe('SelectionBar', () => {
  it('toggles a conditional link and deletes it', () => {
    const onEdgeCondition = vi.fn();
    const onDeleteEdge = vi.fn();
    render(
      <SelectionBar
        nodes={[]}
        edge={{ id: 'e', from: 'a', to: 'b', condition: 'always' }}
        onAddChild={vi.fn()}
        onEdit={vi.fn()}
        onToggleCollapse={vi.fn()}
        onColor={vi.fn()}
        onTask={vi.fn()}
        onDelete={vi.fn()}
        onEdgeCondition={onEdgeCondition}
        onDeleteEdge={onDeleteEdge}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Débloquer/ }));
    expect(onEdgeCondition).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le lien' }));
    expect(onDeleteEdge).toHaveBeenCalled();
  });

  it('shows node actions, including convert to task', () => {
    const scene = buildScene({ nodes: [node('n')], edges: [] }, { measure: (t) => t.length * 8 });
    const onTask = vi.fn();
    render(
      <SelectionBar
        nodes={scene.nodes}
        edge={undefined}
        onAddChild={vi.fn()}
        onEdit={vi.fn()}
        onToggleCollapse={vi.fn()}
        onColor={vi.fn()}
        onTask={onTask}
        onDelete={vi.fn()}
        onEdgeCondition={vi.fn()}
        onDeleteEdge={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Transformer en tâche' }));
    expect(onTask).toHaveBeenCalled();
  });
});

describe('Presenter', () => {
  it('steps through waypoints with the keyboard and exits with Escape', () => {
    const onGo = vi.fn();
    const onExit = vi.fn();
    render(<Presenter index={1} total={3} onGo={onGo} onExit={onExit} />);
    expect(screen.getByText('Étape 2 sur 3')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onGo).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onGo).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onExit).toHaveBeenCalled();
  });
});
