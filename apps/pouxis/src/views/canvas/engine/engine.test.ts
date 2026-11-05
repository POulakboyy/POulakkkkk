import { describe, expect, it, vi } from 'vitest';
import { graph as g } from '@pouxis/core';
import type { GraphEdge, GraphNode } from '@pouxis/core';
import { runForceLayout, tweenNodes, withHiddenFollowing, type Animator } from './animate.ts';
import { easeInOut, interpolateViewport, sameViewport, tweenAt } from './camera.ts';
import {
  addChild,
  addSibling,
  connect,
  mergeContent,
  removeNodes,
  setEdgeCondition,
  starterMindMap,
  updateNode,
} from './edit.ts';
import { exportSvg, fileName, parseTreeText, pngFrame, PNG_MAX_SIDE } from './export.ts';
import {
  addInkPoint,
  hitStroke,
  normalisePressure,
  simplify,
  strokeOutline,
  type InkPoint,
  type Stroke,
} from './ink.ts';
import { lodFor, visibleNodes } from './render.ts';
import {
  NODE_MAX_WIDTH,
  buildScene,
  edgeAnchors,
  fitLabel,
  hitEdge,
  hitNode,
  hitToggle,
  nodeInDirection,
  type Measure,
} from './scene.ts';
import { stressGraph } from './stress.ts';
import { isDarkColor, parseDuration } from './theme.ts';
import { autoTour, nodesBounds } from './tour.ts';
import type { FrameTask } from './controller.ts';

const measure: Measure = (text) => text.length * 8;

function node(id: string, x: number, y: number, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, label: id, kind: 'idea', x, y, ...extra };
}

function edge(from: string, to: string, extra: Partial<GraphEdge> = {}): GraphEdge {
  return { id: `${from}>${to}`, from, to, ...extra };
}

/** root → a, b ; a → a1 (a collapsed) ; b ⇢ c (on-complete) */
function sample() {
  return {
    nodes: [
      node('root', 0, 0),
      node('a', 260, -60, { parentId: 'root', collapsed: true }),
      node('a1', 520, -60, { parentId: 'a' }),
      node('b', 260, 60, { parentId: 'root', kind: 'task' }),
      node('c', 520, 60),
    ],
    edges: [
      edge('root', 'a'),
      edge('a', 'a1'),
      edge('root', 'b'),
      edge('b', 'c', { condition: 'on-complete' }),
    ],
  };
}

describe('scene', () => {
  it('hides collapsed descendants, counts them and flags locked nodes', () => {
    const scene = buildScene(sample(), { measure });
    expect(scene.byId.has('a1')).toBe(false);
    expect(scene.hidden.has('a1')).toBe(true);
    expect(scene.byId.get('a')?.hiddenCount).toBe(1);
    expect(scene.byId.get('c')?.locked).toBe(true);
    expect(scene.edges.some((e) => e.edge.to === 'a1')).toBe(false);
    expect(scene.edges.find((e) => e.edge.to === 'c')?.conditional).toBe(true);
  });

  it('unlocks a conditional target once its source task is done', () => {
    const scene = buildScene(sample(), { measure, doneIds: new Set(['b']) });
    expect(scene.byId.get('c')?.locked).toBe(false);
    expect(scene.byId.get('b')?.done).toBe(true);
  });

  it('fits long labels with an ellipsis inside the maximum width', () => {
    const text = fitLabel('x'.repeat(200), 100, measure);
    expect(text.endsWith('…')).toBe(true);
    expect(measure(text)).toBeLessThanOrEqual(100);
    expect(fitLabel('  short   label ', 100, measure)).toBe('short label');
    const scene = buildScene(
      { nodes: [node('long', 0, 0, { label: 'y'.repeat(300) })], edges: [] },
      { measure },
    );
    expect(scene.byId.get('long')?.w).toBeLessThanOrEqual(NODE_MAX_WIDTH);
    expect(scene.byId.get('long')?.w).toBeGreaterThan(NODE_MAX_WIDTH - 10);
  });

  it('skips nodes with non-finite coordinates', () => {
    const scene = buildScene(
      { nodes: [node('bad', Number.NaN, 0), node('ok', 0, 0)], edges: [] },
      { measure },
    );
    expect(scene.nodes.map((n) => n.id)).toEqual(['ok']);
  });

  it('hit-tests nodes, the collapse toggle and edges', () => {
    const scene = buildScene(sample(), { measure });
    expect(hitNode(scene, 2, 3)?.id).toBe('root');
    expect(hitNode(scene, 130, 300)).toBeUndefined();
    const a = scene.byId.get('a');
    expect(a && hitToggle(a, a.x + a.w / 2 - 5, a.y)).toBe(true);
    expect(a && hitToggle(a, a.x - a.w / 2 + 5, a.y)).toBe(false);
    // Edge root → b: horizontal, from the right side of root to the left side of b.
    const anchors = edgeAnchors(scene.byId.get('root')!, scene.byId.get('b')!);
    const midX = (anchors.ax + anchors.bx) / 2;
    const midY = (anchors.ay + anchors.by) / 2;
    expect(hitEdge(scene, midX, midY, 6)?.edge.to).toBe('b');
    expect(hitEdge(scene, midX, midY + 200, 6)).toBeUndefined();
  });

  it('finds the nearest node in a direction', () => {
    const scene = buildScene(sample(), { measure });
    const root = scene.byId.get('root')!;
    expect(nodeInDirection(scene, root, 'right')?.id).toMatch(/^[ab]$/);
    expect(nodeInDirection(scene, root, 'left')).toBeUndefined();
    const b = scene.byId.get('b')!;
    expect(nodeInDirection(scene, b, 'up')?.id).toBe('a');
    expect(nodeInDirection(scene, b, 'right')?.id).toBe('c');
  });

  it('culls through the quadtree and picks a level of detail from the zoom', () => {
    const scene = buildScene(stressGraph(2_000), { measure });
    const view = { x: -200, y: -200, width: 400, height: 400 };
    const visible = visibleNodes(scene, view);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(scene.nodes.length);
    for (let i = 1; i < visible.length; i++) {
      expect(visible[i]!.order).toBeGreaterThan(visible[i - 1]!.order);
    }
    expect(lodFor(1)).toBe('full');
    expect(lodFor(0.2)).toBe('block');
    expect(lodFor(0.05)).toBe('dot');
  });
});

describe('ink', () => {
  it('normalises pressure: mouse and finger draw at mid pressure', () => {
    expect(normalisePressure(0, 'mouse')).toBe(0.5);
    expect(normalisePressure(0.9, 'touch')).toBe(0.5);
    expect(normalisePressure(0.8, 'pen')).toBe(0.8);
    expect(normalisePressure(0, 'pen')).toBe(0.5);
  });

  it('smooths samples towards the previous point and drops jitter', () => {
    const points: InkPoint[] = [];
    addInkPoint(points, { x: 0, y: 0, p: 0.5 });
    expect(addInkPoint(points, { x: 0.2, y: 0, p: 0.5 })).toBe(false);
    addInkPoint(points, { x: 10, y: 0, p: 0.5 }, 0.5);
    expect(points[1]?.x).toBeCloseTo(5);
  });

  it('simplifies a straight line to its end points and keeps corners', () => {
    const line = Array.from({ length: 50 }, (_, i) => ({ x: i, y: 0, p: 0.5 }));
    expect(simplify(line, 0.5)).toHaveLength(2);
    const corner = [
      ...line,
      ...Array.from({ length: 50 }, (_, i) => ({ x: 49, y: i + 1, p: 0.5 })),
    ];
    expect(simplify(corner, 0.5)).toHaveLength(3);
  });

  it('builds a closed outline whose width follows pressure and hit-tests strokes', () => {
    const outline = strokeOutline(
      [
        { x: 0, y: 0, p: 0 },
        { x: 10, y: 0, p: 1 },
      ],
      4,
    );
    expect(outline).toHaveLength(4);
    const thin = Math.abs(outline[0]!.y - outline[3]!.y);
    const thick = Math.abs(outline[1]!.y - outline[2]!.y);
    expect(thick).toBeGreaterThan(thin);
    const stroke: Stroke = {
      id: 's',
      points: [
        { x: 0, y: 0, p: 0.5 },
        { x: 100, y: 0, p: 0.5 },
      ],
      width: 2,
      color: 0,
    };
    expect(hitStroke(stroke, 50, 3, 2)).toBe(true);
    expect(hitStroke(stroke, 50, 30, 2)).toBe(false);
  });
});

describe('edit', () => {
  it('adds children below the last child and expands a collapsed parent', () => {
    const first = addChild(sample(), 'a', 'second');
    expect(first?.node.parentId).toBe('a');
    expect(first?.node.y).toBe(-60 + 64);
    expect(first?.content.nodes.find((n) => n.id === 'a')?.collapsed).toBe(false);
    expect(first?.content.edges.some((e) => e.from === 'a' && e.to === first.node.id)).toBe(true);
    expect(addChild(sample(), 'missing')).toBeUndefined();
  });

  it('adds siblings under the same parent, or a new root', () => {
    expect(addSibling(sample(), 'b')?.node.parentId).toBe('root');
    expect(addSibling(sample(), 'root')?.node.parentId).toBeUndefined();
  });

  it('removes nodes and re-attaches orphans to the nearest surviving ancestor', () => {
    const next = removeNodes(sample(), ['a']);
    expect(next.nodes.find((n) => n.id === 'a1')?.parentId).toBe('root');
    expect(next.edges.some((e) => e.from === 'a' || e.to === 'a')).toBe(false);
    const same = sample();
    expect(removeNodes(same, [])).toBe(same);
  });

  it('connects once, never to itself, and toggles conditions', () => {
    const base = sample();
    expect(connect(base, 'root', 'root')).toBe(base);
    expect(connect(base, 'root', 'a')).toBe(base);
    const linked = connect(base, 'a1', 'c');
    expect(linked.edges).toHaveLength(base.edges.length + 1);
    const id = linked.edges[linked.edges.length - 1]!.id;
    const conditional = setEdgeCondition(linked, id, 'on-complete');
    expect(conditional.edges.find((e) => e.id === id)?.condition).toBe('on-complete');
    expect(setEdgeCondition(conditional, id, 'on-complete')).toBe(conditional);
    expect(updateNode(base, 'nope', { label: 'x' })).toBe(base);
  });

  it('merges imported content with fresh ids around a point', () => {
    const tree = g.fromOutline('- A\n  - B');
    const once = mergeContent({ nodes: [], edges: [] }, tree, { x: 1000, y: 0 });
    const twice = mergeContent(once, tree, { x: 1000, y: 0 });
    expect(new Set(twice.nodes.map((n) => n.id)).size).toBe(4);
    const child = once.nodes.find((n) => n.label === 'B');
    expect(once.nodes.some((n) => n.id === child?.parentId)).toBe(true);
    const bounds = g.graphBounds(once);
    expect(bounds.x + bounds.width / 2).toBeCloseTo(1000);
  });

  it('builds a laid-out starter mind map', () => {
    const map = starterMindMap({ root: 'R', branches: ['A', 'B', 'C'] });
    expect(map.nodes).toHaveLength(4);
    expect(map.edges).toHaveLength(3);
    const root = map.nodes.find((n) => n.label === 'R')!;
    expect(map.nodes.filter((n) => n.parentId === root.id).every((n) => n.x > root.x)).toBe(true);
  });
});

describe('camera', () => {
  const size = { width: 800, height: 600 };
  it('eases and interpolates zoom geometrically', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    const a = { x: 0, y: 0, zoom: 1 };
    const b = { x: 100, y: 100, zoom: 4 };
    expect(sameViewport(interpolateViewport(a, b, 0, size), a)).toBe(true);
    expect(sameViewport(interpolateViewport(a, b, 1, size), b)).toBe(true);
    expect(interpolateViewport(a, b, 0.5, size).zoom).toBeCloseTo(2);
  });

  it('finishes tweens at their target', () => {
    const tween = {
      from: { x: 0, y: 0, zoom: 1 },
      to: { x: 50, y: 0, zoom: 1 },
      start: 0,
      duration: 100,
    };
    expect(tweenAt(tween, 50, size).done).toBe(false);
    expect(tweenAt(tween, 100, size)).toEqual({ vp: tween.to, done: true });
    expect(tweenAt({ ...tween, duration: 0 }, 0, size).done).toBe(true);
  });
});

describe('export', () => {
  it('makes safe file names', () => {
    expect(fileName('Plan: Q3 / 2026?', 'svg')).toBe('Plan-Q3-2026.svg');
    expect(fileName('***', 'markdown')).toBe('toile.md');
    expect(fileName('Idées été', 'opml')).toBe('Idées-été.opml');
  });

  it('caps PNG size and keeps a 2× density when it fits', () => {
    expect(pngFrame({ x: 0, y: 0, width: 100, height: 50 }).dpr).toBe(2);
    const huge = pngFrame({ x: 0, y: 0, width: 20_000, height: 100 });
    expect(huge.width * huge.dpr).toBeLessThanOrEqual(PNG_MAX_SIDE + 1);
  });

  it('reads outlines and OPML, ignores plain text', () => {
    expect(parseTreeText('just a sentence')).toBeNull();
    expect(parseTreeText('- a\n  - b')?.nodes).toHaveLength(2);
    const opml = '<?xml version="1.0"?><opml version="2.0"><body><outline text="x"/></body></opml>';
    expect(parseTreeText(opml)?.nodes[0]?.label).toBe('x');
  });

  it('adds freehand strokes to the SVG export', () => {
    const graph = { id: 'g', title: 'T', createdAt: 0, updatedAt: 0, ...sample() };
    const stroke: Stroke = {
      id: 's',
      points: [
        { x: 0, y: 0, p: 0.5 },
        { x: 40, y: 10, p: 0.5 },
      ],
      width: 3,
      color: 2,
    };
    const svg = exportSvg(graph, [stroke]);
    expect(svg).toContain('<path d="M');
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });
});

describe('theme', () => {
  it('parses durations and detects dark backgrounds', () => {
    expect(parseDuration('220ms', 0)).toBe(220);
    expect(parseDuration('0.3s', 0)).toBe(300);
    expect(parseDuration('fast', 9)).toBe(9);
    expect(isDarkColor('#141414')).toBe(true);
    expect(isDarkColor('#f6f4ef')).toBe(false);
  });
});

describe('tour', () => {
  it('starts with the overview, then one stop per main branch', () => {
    const content = sample();
    const scene = buildScene(content, { measure });
    const tour = autoTour(scene, content);
    expect(tour[0]?.id).toBe('overview');
    expect(tour).toHaveLength(3);
    expect(nodesBounds([])).toBeUndefined();
  });
});

describe('animations', () => {
  function fakeAnimator(scene: ReturnType<typeof buildScene>) {
    const tasks = new Set<FrameTask>();
    const animator: Animator = {
      getScene: () => scene,
      addFrameTask: (task) => {
        tasks.add(task);
        return () => tasks.delete(task);
      },
    };
    const run = async (frames: number) => {
      for (let i = 0; i < frames && tasks.size > 0; i++) {
        for (const task of [...tasks]) if (!task(i * 16)) tasks.delete(task);
        await Promise.resolve();
      }
      await Promise.resolve();
    };
    return { animator, run };
  }

  it('tweens visible nodes to their targets, then calls back', async () => {
    const scene = buildScene(sample(), { measure });
    const { animator, run } = fakeAnimator(scene);
    const onDone = vi.fn();
    tweenNodes(animator, new Map([['root', { x: 100, y: 100 }]]), 64, onDone);
    await run(10);
    expect(onDone).toHaveBeenCalledOnce();
    expect(scene.byId.get('root')).toMatchObject({ x: 100, y: 100 });
  });

  it('applies a zero-duration tween at once', () => {
    const scene = buildScene(sample(), { measure });
    const onDone = vi.fn();
    tweenNodes(fakeAnimator(scene).animator, new Map([['b', { x: 0, y: 500 }]]), 0, onDone);
    expect(onDone).toHaveBeenCalledOnce();
    expect(scene.byId.get('b')?.y).toBe(500);
  });

  it('runs the force layout across frames and reports final positions', async () => {
    const scene = buildScene(sample(), { measure });
    const { animator, run } = fakeAnimator(scene);
    const onDone = vi.fn();
    const handle = runForceLayout(animator, { animate: true, onDone });
    await run(3);
    handle.stop();
    expect(onDone).toHaveBeenCalledOnce();
    const positions = onDone.mock.calls[0]![0] as Map<string, g.Point>;
    expect([...positions.keys()].sort()).toEqual(['b', 'c', 'a', 'root'].sort());
  });

  it('moves hidden descendants with their visible ancestor only', () => {
    const content = sample();
    const scene = buildScene(content, { measure });
    const moved = withHiddenFollowing(content, new Map([['a', { x: 300, y: 0 }]]), scene.hidden);
    expect(moved.get('a1')).toEqual({ x: 560, y: 0 });
    expect(moved.has('b')).toBe(false);
  });
});
