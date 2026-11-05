import { graph as g } from '@pouxis/core';
import type { Graph, Id, Task } from '@pouxis/core';
import type { MessageKey, MessageVars } from '../../i18n/index.ts';
import type { Store } from '../../store/index.ts';
import { toast } from '../../ui/index.ts';
import type { Stroke } from './engine/ink.ts';
import { renderScene } from './engine/render.ts';
import type { Scene } from './engine/scene.ts';
import type { CanvasTheme } from './engine/theme.ts';
import { nodesBounds } from './engine/tour.ts';
import {
  download,
  exportMarkdown,
  exportOpml,
  exportSvg,
  fileName,
  pngFrame,
  type ExportFormat,
} from './engine/export.ts';
import {
  mergeContent,
  removeEdge,
  removeNodes,
  setEdgeCondition,
  starterMindMap,
  updateNode,
  type Content,
} from './engine/edit.ts';
import { stressGraph } from './engine/stress.ts';
import { applyMove, taskFromNode, type DueChange } from './model.ts';

type T = (key: MessageKey, vars?: MessageVars) => string;

/** Everything a canvas action needs: the record, the store and the translator. */
export interface ActionContext {
  store: Store;
  graph: Graph;
  t: T;
  doneIds: ReadonlySet<Id>;
}

export function commit(ctx: ActionContext, content: Content, label?: string): void {
  if (content.nodes === ctx.graph.nodes && content.edges === ctx.graph.edges) return;
  const write = () =>
    ctx.store.update('graphs', ctx.graph.id, { nodes: content.nodes, edges: content.edges });
  if (label) ctx.store.batch(write, label);
  else write();
}

/** Drop of dragged nodes; in timeline mode also moves due dates and mirrored task deadlines. */
export function moveNodes(
  ctx: ActionContext,
  dragged: ReadonlyMap<Id, g.Point>,
  followers: ReadonlyMap<Id, g.Point>,
  scale: g.TimeScale | undefined,
  formatDate: (ts: number) => string,
): void {
  const first = applyMove(ctx.graph, dragged, scale);
  const second = applyMove(first.content, followers);
  ctx.store.batch(() => {
    commit(ctx, second.content);
    applyDueToTasks(ctx, first.due);
  });
  announceDue(ctx.t, first.due, formatDate);
}

function applyDueToTasks(ctx: ActionContext, changes: readonly DueChange[]): void {
  for (const change of changes) {
    if (change.taskId && ctx.store.get('tasks', change.taskId)) {
      ctx.store.update('tasks', change.taskId, { deadline: change.due });
    }
  }
}

function announceDue(t: T, changes: readonly DueChange[], formatDate: (ts: number) => string) {
  const only = changes[0];
  if (!only) return;
  toast({
    id: 'canvas-due',
    title:
      changes.length === 1
        ? t('canvas.timeline.dueChanged', { date: formatDate(only.due) })
        : t('canvas.timeline.duesChanged', { count: changes.length }),
    tone: 'success',
  });
}

/** Deletes nodes or one edge, with an Undo toast (act first, no confirmation). */
export function deleteSelection(ctx: ActionContext, nodes: readonly Id[], edge: Id | undefined) {
  if (nodes.length > 0) {
    commit(ctx, removeNodes(ctx.graph, nodes));
    toast({
      title: ctx.t('canvas.toast.deleted', { count: nodes.length }),
      action: { label: ctx.t('common.undo'), onClick: () => ctx.store.undo() },
    });
  } else if (edge) {
    commit(ctx, removeEdge(ctx.graph, edge));
  }
}

export function setColor(ctx: ActionContext, ids: readonly Id[], color: number | undefined) {
  const targets = new Set(ids);
  let changed = false;
  const nodes = ctx.graph.nodes.map((node) => {
    if (!targets.has(node.id) || node.color === color) return node;
    changed = true;
    if (color !== undefined) return { ...node, color };
    const { color: _removed, ...rest } = node;
    return rest;
  });
  if (changed) commit(ctx, { nodes, edges: ctx.graph.edges });
}

export function setConditional(ctx: ActionContext, edgeId: Id, conditional: boolean) {
  commit(ctx, setEdgeCondition(ctx.graph, edgeId, conditional ? 'on-complete' : 'always'));
}

/**
 * Checks or unchecks a task node. Nodes mirror tasks through `refId`; a task node without one
 * gets a real task so its state syncs with the Tasks view. Announces steps it unlocks (4.7).
 */
export function toggleDone(ctx: ActionContext, nodeId: Id): void {
  const node = ctx.graph.nodes.find((n) => n.id === nodeId);
  if (!node || g.lockedReason(ctx.graph, nodeId, ctx.doneIds)) return;
  const wasDone = g.isNodeDone(node, ctx.doneIds);
  const taskId = node.refId && ctx.store.get('tasks', node.refId) ? node.refId : undefined;
  const unlocked = wasDone ? [] : g.unlockedBy(ctx.graph, taskId ?? nodeId, ctx.doneIds);
  ctx.store.batch(() => {
    if (taskId) {
      ctx.store.update(
        'tasks',
        taskId,
        wasDone
          ? { status: 'todo', completedAt: undefined }
          : { status: 'done', completedAt: Date.now() },
      );
    } else {
      const task = ctx.store.create('tasks', taskFromNode(node, true));
      commit(ctx, updateNode(ctx.graph, nodeId, { kind: 'task', refId: task.id }));
    }
  });
  if (unlocked.length > 0) {
    toast({ title: ctx.t('canvas.edge.unlocked', { count: unlocked.length }), tone: 'success' });
  }
}

/** Turns an idea into a task (or toggles it when it already is one). */
export function taskAction(ctx: ActionContext, nodeId: Id): void {
  const node = ctx.graph.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  if (node.kind === 'task') {
    toggleDone(ctx, nodeId);
    return;
  }
  ctx.store.batch(() => {
    const task = ctx.store.create('tasks', taskFromNode(node));
    commit(ctx, updateNode(ctx.graph, nodeId, { kind: 'task', refId: task.id }));
  });
  toast({ title: ctx.t('canvas.toast.converted'), tone: 'success' });
}

/** Tasks → tree transmutation (4.3): subtasks become branches, dependencies conditional links. */
export function importTasks(ctx: ActionContext, tasks: readonly Task[], at: g.Point): number {
  const list = tasks.filter((task) => task.status !== 'archived');
  if (list.length === 0) {
    toast({ title: ctx.t('canvas.import.noTasks') });
    return 0;
  }
  const tree = g.tasksToGraph(list, { layout: { orientation: 'horizontal' } });
  commit(ctx, mergeContent(ctx.graph, tree, at), ctx.t('canvas.import.tasks'));
  toast({ title: ctx.t('canvas.import.tasksDone', { count: list.length }), tone: 'success' });
  return list.length;
}

/** Pasted / dropped outline or OPML (4.15 import) merged at `at`. */
export function importTree(ctx: ActionContext, tree: g.GraphContent, at: g.Point): void {
  if (tree.nodes.length === 0) return;
  commit(ctx, mergeContent(ctx.graph, tree, at));
  toast({ title: ctx.t('canvas.import.pasted', { count: tree.nodes.length }), tone: 'success' });
}

export function starterContent(t: T): g.GraphContent {
  return starterMindMap({
    root: t('canvas.starter.root'),
    branches: [
      t('canvas.starter.b1'),
      t('canvas.starter.b2'),
      t('canvas.starter.b3'),
      t('canvas.starter.b4'),
    ],
  });
}

/** Dev load test: a new canvas with 10 000 nodes. */
export function createStressGraph(store: Store, t: T): Graph {
  const content = stressGraph(10_000);
  return store.create('graphs', { title: t('canvas.dev.stress'), ...content });
}

export interface ExportInput {
  graph: Graph;
  scene: Scene;
  strokes: readonly Stroke[];
  theme: CanvasTheme;
  doneIds: ReadonlySet<Id>;
  t: T;
}

/** Exports the canvas (4.11 / 4.15) and offers the file as a download. */
export async function exportCanvas(format: ExportFormat, input: ExportInput): Promise<void> {
  const { graph, t } = input;
  const name = fileName(graph.title || t('canvas.untitled'), format);
  try {
    const blob = await exportBlob(format, input);
    download(blob, name);
    toast({ title: t('canvas.export.done', { file: name }), tone: 'success' });
  } catch {
    toast({ title: t('canvas.export.failed'), tone: 'danger' });
  }
}

async function exportBlob(format: ExportFormat, input: ExportInput): Promise<Blob> {
  const { graph } = input;
  switch (format) {
    case 'svg':
      return new Blob([exportSvg(graph, input.strokes)], { type: 'image/svg+xml' });
    case 'markdown':
      return new Blob([exportMarkdown(graph, input.doneIds)], {
        type: 'text/markdown;charset=utf-8',
      });
    case 'opml':
      return new Blob([exportOpml(graph)], { type: 'text/x-opml;charset=utf-8' });
    case 'png':
      return renderPng(input);
  }
}

/** Transparent PNG of the whole canvas, drawn by the same renderer as the screen. */
function renderPng({ scene, strokes, theme }: ExportInput): Promise<Blob> {
  const bounds = nodesBounds(scene.nodes) ?? { x: 0, y: 0, width: 1, height: 1 };
  const frame = pngFrame(bounds);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(frame.width * frame.dpr);
  canvas.height = Math.round(frame.height * frame.dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('2D context unavailable'));
  renderScene(
    ctx,
    scene,
    {
      vp: frame.vp,
      width: frame.width,
      height: frame.height,
      dpr: frame.dpr,
      selection: new Set(),
      strokes,
      background: false,
    },
    theme,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
      'image/png',
    ),
  );
}
