import { DAY, addDays, graph as g, startOfDay } from '@pouxis/core';
import type { Graph, GraphNode, Id, Task, Timestamp, TimeZone } from '@pouxis/core';
import type { NewRecord } from '../../store/index.ts';
import type { Content } from './engine/edit.ts';
import type { Measure } from './engine/scene.ts';

/** World units per day on the timeline axis (4.5). */
export const DAY_WIDTH = 180;

/** Ids of completed tasks: they check task nodes and unlock `on-complete` edges (4.7). */
export function doneTaskIds(tasks: readonly Task[]): Set<Id> {
  const out = new Set<Id>();
  for (const task of tasks) if (task.status === 'done') out.add(task.id);
  return out;
}

/** Timeline axis: today's local midnight at x = 0, one day every {@link DAY_WIDTH} units. */
export function timelineScale(now: Timestamp, timeZone: TimeZone): g.TimeScale {
  const start = startOfDay(now, timeZone);
  return g.createTimeScale({
    start,
    end: addDays(start, 1, timeZone),
    x0: 0,
    x1: DAY_WIDTH,
    timeZone,
  });
}

/** Task deadline changes implied by moving nodes on the timeline. */
export interface DueChange {
  nodeId: Id;
  taskId: Id | undefined;
  due: Timestamp;
}

/**
 * Commits dragged positions. In timeline mode the x position is also a due date, snapped to
 * whole days: nodes get a new `due`, and tasks they mirror get the matching deadline.
 */
export function applyMove(
  content: Content,
  positions: ReadonlyMap<Id, g.Point>,
  scale?: g.TimeScale,
): { content: Content; due: DueChange[] } {
  const due: DueChange[] = [];
  let changed = false;
  const nodes = content.nodes.map((node) => {
    const p = positions.get(node.id);
    if (!p) return node;
    changed = true;
    if (!scale) return { ...node, x: p.x, y: p.y };
    const moved = g.dragToDue(node, p.x, scale, { snap: 'day' });
    if (moved.due !== undefined && moved.due !== node.due) {
      due.push({ nodeId: node.id, taskId: node.refId, due: moved.due });
    }
    return { ...moved, y: p.y };
  });
  return { content: changed ? { nodes, edges: content.edges } : content, due };
}

/** One row of the accessible outline (the graph read as a nested list). */
export interface OutlineRow {
  id: Id;
  label: string;
  depth: number;
  kind: GraphNode['kind'];
  childCount: number;
  collapsed: boolean;
  locked: boolean;
  done: boolean;
  /** 1-based position among siblings and their count, for `aria-posinset` / `aria-setsize`. */
  index: number;
  siblings: number;
}

/** Depth-first rows of the visible forest, in reading order (roots by y, then x). */
export function outlineRows(graph: g.GraphLike, doneIds: ReadonlySet<Id>): OutlineRow[] {
  const hierarchy = g.buildHierarchy(graph);
  const byId = g.indexNodes(graph.nodes);
  const locks = g.lockedNodes(graph, doneIds);
  const reading = (a: Id, b: Id) => {
    const na = byId.get(a);
    const nb = byId.get(b);
    return (na?.y ?? 0) - (nb?.y ?? 0) || (na?.x ?? 0) - (nb?.x ?? 0);
  };
  const rows: OutlineRow[] = [];
  const stack: { id: Id; depth: number; index: number; siblings: number }[] = [];
  const roots = [...hierarchy.roots].sort(reading);
  for (let i = roots.length - 1; i >= 0; i--) {
    stack.push({ id: roots[i] as Id, depth: 0, index: i + 1, siblings: roots.length });
  }
  while (stack.length > 0) {
    const item = stack.pop() as (typeof stack)[number];
    const node = byId.get(item.id);
    if (!node) continue;
    const children = [...(hierarchy.children.get(item.id) ?? [])].sort(reading);
    rows.push({
      id: node.id,
      label: node.label,
      depth: item.depth,
      kind: node.kind,
      childCount: children.length,
      collapsed: node.collapsed === true && children.length > 0,
      locked: locks.has(node.id),
      done: g.isNodeDone(node, doneIds),
      index: item.index,
      siblings: item.siblings,
    });
    if (node.collapsed) continue;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push({
        id: children[i] as Id,
        depth: item.depth + 1,
        index: i + 1,
        siblings: children.length,
      });
    }
  }
  return rows;
}

/** New task mirroring a canvas node (4.3 / "convert to task"). */
export function taskFromNode(node: GraphNode, done = false): NewRecord<'tasks'> {
  const record: NewRecord<'tasks'> = {
    title: node.label.trim() || '…',
    status: done ? 'done' : 'todo',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'create',
    postponedCount: 0,
    timeLogs: [],
  };
  if (node.due !== undefined) record.deadline = node.due;
  if (node.color !== undefined) record.color = node.color;
  if (done) record.completedAt = Date.now();
  return record;
}

/**
 * Text measurement for node labels. Uses a detached 2D context when available (browsers,
 * webviews) and an average glyph width otherwise (jsdom), so layout logic stays testable.
 */
export function createMeasure(font: string): Measure {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = globalThis.document?.createElement('canvas').getContext('2d') ?? null;
  } catch {
    ctx = null;
  }
  if (!ctx) return (text) => text.length * 7.4;
  ctx.font = font;
  const cache = new Map<string, number>();
  const context = ctx;
  return (text) => {
    const hit = cache.get(text);
    if (hit !== undefined) return hit;
    const width = context.measureText(text).width;
    if (cache.size > 50_000) cache.clear();
    cache.set(text, width);
    return width;
  };
}

/** Most recently edited canvas, used when the route names none. */
export function latestGraph(graphs: readonly Graph[]): Graph | undefined {
  let best: Graph | undefined;
  for (const graph of graphs) if (!best || graph.updatedAt > best.updatedAt) best = graph;
  return best;
}

/** Whole days between two instants on the axis, for the "due moved" toast. */
export function daysBetween(a: Timestamp, b: Timestamp): number {
  return Math.round((b - a) / DAY);
}
