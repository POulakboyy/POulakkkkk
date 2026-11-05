import { graph as g } from '@pouxis/core';
import type { Id } from '@pouxis/core';
import { easeInOut } from './camera.ts';
import type { FrameTask } from './controller.ts';
import { moveSceneNode, scenePositions, type Scene } from './scene.ts';

type Point = g.Point;

/** What the animations need from the canvas controller (kept narrow for tests). */
export interface Animator {
  addFrameTask(task: FrameTask): () => void;
  getScene(): Scene;
}

export interface RunningAnimation {
  /** Stops now and commits the positions reached so far. */
  stop(): void;
}

/** Per-frame time budget for force steps; keeps input responsive at 10 000 nodes. */
const STEP_BUDGET_MS = 12;

/**
 * Force-directed "untangle" (4.2): one or more `createLayout` steps per frame, written into the
 * scene so the renderer shows the graph relaxing. With `animate: false` (reduced motion) the
 * simulation still runs across frames, but nodes jump once to the final positions.
 */
export function runForceLayout(
  animator: Animator,
  options: { animate: boolean; seed?: number; onDone: (positions: Map<Id, Point>) => void },
): RunningAnimation {
  const scene = animator.getScene();
  const content: g.GraphLike = {
    nodes: scene.nodes.map((n) => ({ ...n.node, x: n.x, y: n.y })),
    edges: scene.edges.map((e) => e.edge),
  };
  // Boxes are ~150 units wide: longer springs and a firmer pull keep islands close by.
  const sim = g.createLayout(content, { seed: options.seed ?? 1, edgeLength: 160, gravity: 0.4 });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancel();
    writePositions(scene, sim.positions);
    options.onDone(scenePositions(scene.nodes));
  };
  const cancel = animator.addFrameTask(() => {
    if (finished) return false;
    const start = performance.now();
    do sim.step();
    while (!sim.settled && performance.now() - start < STEP_BUDGET_MS);
    if (options.animate) writePositions(scene, sim.positions);
    if (sim.settled) {
      // Deferred: `finish` cancels this task, which must not happen while it runs.
      queueMicrotask(finish);
      return false;
    }
    return true;
  });
  return { stop: finish };
}

function writePositions(scene: Scene, positions: ReadonlyMap<Id, Readonly<Point>>): void {
  for (const [id, p] of positions) {
    const node = scene.byId.get(id);
    if (node) moveSceneNode(scene, node, p.x, p.y);
  }
}

/**
 * Glides visible scene nodes to `targets` (tree layout, timeline placement), then calls
 * `onDone`. A zero duration applies the move at once.
 */
export function tweenNodes(
  animator: Animator,
  targets: ReadonlyMap<Id, Point>,
  duration: number,
  onDone: () => void,
): RunningAnimation {
  const scene = animator.getScene();
  const moves: { id: Id; from: Point; to: Point }[] = [];
  for (const node of scene.nodes) {
    const to = targets.get(node.id);
    if (to) moves.push({ id: node.id, from: { x: node.x, y: node.y }, to });
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    cancel();
    place(1);
    onDone();
  };
  const place = (t: number) => {
    const k = easeInOut(t);
    for (const m of moves) {
      const node = scene.byId.get(m.id);
      if (!node) continue;
      moveSceneNode(
        scene,
        node,
        m.from.x + (m.to.x - m.from.x) * k,
        m.from.y + (m.to.y - m.from.y) * k,
      );
    }
  };
  let start = -1;
  const cancel = animator.addFrameTask((now) => {
    if (done) return false;
    if (start < 0) start = now;
    const t = duration <= 0 ? 1 : (now - start) / duration;
    if (t >= 1) {
      queueMicrotask(finish);
      return false;
    }
    place(t);
    return true;
  });
  if (duration <= 0) finish();
  return { stop: finish };
}

/**
 * Positions to commit after moving visible nodes: `hidden` descendants of collapsed nodes
 * follow their nearest visible ancestor, so expanding later shows them in place.
 */
export function withHiddenFollowing(
  content: g.GraphLike,
  visible: ReadonlyMap<Id, Point>,
  hidden: ReadonlySet<Id>,
): Map<Id, Point> {
  const out = new Map(visible);
  if (hidden.size === 0) return out;
  const hierarchy = g.buildHierarchy(content);
  const byId = g.indexNodes(content.nodes);
  for (const node of content.nodes) {
    if (!hidden.has(node.id) || out.has(node.id)) continue;
    let ancestor = hierarchy.parent.get(node.id);
    while (ancestor !== undefined && hidden.has(ancestor))
      ancestor = hierarchy.parent.get(ancestor);
    if (ancestor === undefined || !visible.has(ancestor)) continue;
    const before = byId.get(ancestor);
    const after = visible.get(ancestor);
    if (!before || !after) continue;
    out.set(node.id, { x: node.x + after.x - before.x, y: node.y + after.y - before.y });
  }
  return out;
}
