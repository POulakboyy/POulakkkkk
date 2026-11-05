import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { createId, graph as g } from '@pouxis/core';
import type { Graph, Id } from '@pouxis/core';
import { navigate } from '../../app/router.ts';
import { useFormat, useT } from '../../i18n/index.ts';
import { store, useCollection } from '../../store/index.ts';
import { DESKTOP_QUERY, toast, useMediaQuery, useReducedMotion } from '../../ui/index.ts';
import {
  commit,
  createStressGraph,
  deleteSelection,
  exportCanvas,
  importTasks,
  importTree,
  moveNodes,
  setColor,
  setConditional,
  starterContent,
  taskAction,
  toggleDone,
  type ActionContext,
} from './actions.ts';
import { useAnnotations } from './annotations.ts';
import { CanvasStage } from './components/CanvasStage.tsx';
import { Minimap } from './components/Minimap.tsx';
import { NodeEditor, type EditNext } from './components/NodeEditor.tsx';
import { OutlineView } from './components/OutlineView.tsx';
import { Presenter } from './components/Presenter.tsx';
import { SelectionBar } from './components/SelectionBar.tsx';
import { TOOLS, Toolbar } from './components/Toolbar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { ZoomControls } from './components/ZoomControls.tsx';
import {
  runForceLayout,
  tweenNodes,
  withHiddenFollowing,
  type RunningAnimation,
} from './engine/animate.ts';
import type { Waypoint } from './engine/camera.ts';
import type { CanvasController, ControllerEvents, Tool } from './engine/controller.ts';
import { addChild, addNode, addSibling, connect, makeNode, updateNode } from './engine/edit.ts';
import { parseTreeText, type ExportFormat } from './engine/export.ts';
import type { RenderState } from './engine/render.ts';
import { buildScene, nodeInDirection, type Direction } from './engine/scene.ts';
import { createSignal } from './engine/signal.ts';
import { FALLBACK_THEME, type CanvasTheme } from './engine/theme.ts';
import { autoTour, waypointFromView } from './engine/tour.ts';
import { DAY_WIDTH, createMeasure, doneTaskIds, outlineRows, timelineScale } from './model.ts';
import s from './Canvas.module.css';

export type ViewMode = 'canvas' | 'outline';

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const HELP_ID = 'canvas-keyboard-help';

/** One open canvas: the Canvas2D stage plus its chrome, outline and presentation mode. */
export function CanvasWorkspace({ graph, graphs }: { graph: Graph; graphs: readonly Graph[] }) {
  const t = useT();
  const f = useFormat();
  const tasks = useCollection('tasks');
  const reduced = useReducedMotion();
  const desktop = useMediaQuery(DESKTOP_QUERY);

  const [controller, setController] = useState<CanvasController | null>(null);
  const [theme, setTheme] = useState<CanvasTheme>(FALLBACK_THEME);
  const [tool, setTool] = useState<Tool>('select');
  const [ink, setInk] = useState({ width: 3.5, color: 0 });
  const [mode, setMode] = useState<ViewMode>('canvas');
  const [timelineOn, setTimelineOn] = useState(false);
  const [editing, setEditing] = useState<Id | undefined>();
  const [selection, setSelection] = useState<{ nodes: Id[]; edge: Id | undefined }>({
    nodes: [],
    edge: undefined,
  });
  const [presenting, setPresenting] = useState<{ tour: Waypoint[]; index: number } | null>(null);
  const [layoutRun, setLayoutRun] = useState<RunningAnimation | null>(null);
  const [minimapOn, setMinimapOn] = useState(true);
  const [stats, setStats] = useState<string | undefined>();
  const viewport = useMemo(() => createSignal<g.Viewport>({ x: 0, y: 0, zoom: 1 }), []);
  const [annotations, setAnnotations] = useAnnotations(graph.id);

  const measure = useMemo(() => createMeasure(`600 14px ${theme.font}`), [theme.font]);
  const doneIds = useMemo(() => doneTaskIds(tasks), [tasks]);
  const scene = useMemo(() => buildScene(graph, { measure, doneIds }), [graph, measure, doneIds]);
  const scale = useMemo(
    () => (timelineOn ? timelineScale(Date.now(), f.timeZone) : undefined),
    [timelineOn, f.timeZone],
  );
  const timeline = useMemo<RenderState['timeline']>(
    () =>
      scale && {
        scale,
        today: Date.now(),
        // Below the floating header (one row on desktop, two on phones).
        top: desktop ? 84 : 132,
        label: (tick) =>
          tick.unit === 'month' || tick.unit === 'year'
            ? f.date(tick.ts, 'monthYear')
            : tick.unit === 'day' || tick.unit === 'week'
              ? f.date(tick.ts, 'dayMonthShort')
              : f.time(tick.ts),
      },
    [scale, f, desktop],
  );

  const ctx: ActionContext = { store, graph, t, doneIds };
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const dur = reduced ? 0 : theme.durSlow;

  /* ------------------------------------------------------------ editing helpers */

  const select = useCallback(
    (ids: Id[]) => {
      controller?.select(ids, undefined);
      if (ids[0]) controller?.revealNode(ids[0], dur);
    },
    [controller, dur],
  );

  // A freshly created node is selected once it appears in the scene.
  useEffect(() => {
    if (editing && scene.byId.has(editing) && !controller?.getSelection().has(editing)) {
      controller?.select([editing], undefined);
      controller?.revealNode(editing, dur);
    }
  }, [editing, scene, controller, dur]);

  const createAt = (at: g.Point) => {
    let node = makeNode('', at.x, at.y);
    if (scale) node = g.dragToDue(node, at.x, scale, { snap: 'day' });
    commit(ctxRef.current, addNode(graph, node));
    setEditing(node.id);
  };

  const addRelative = (kind: 'child' | 'sibling', id: Id) => {
    const added = kind === 'child' ? addChild(graph, id) : addSibling(graph, id);
    if (!added) return;
    commit(ctxRef.current, added.content);
    setEditing(added.node.id);
  };

  const finishEdit = (id: Id, label: string, next: EditNext) => {
    setEditing(undefined);
    const current = ctxRef.current.graph;
    const node = current.nodes.find((n) => n.id === id);
    if (!node) return;
    const clean = label.replace(/\s+/g, ' ').trim();
    if (!clean && !node.label) {
      // An untouched new node disappears instead of leaving an empty box behind.
      commit(ctxRef.current, {
        nodes: current.nodes.filter((n) => n.id !== id),
        edges: current.edges.filter((e) => e.from !== id && e.to !== id),
      });
      return;
    }
    const content = clean !== node.label ? updateNode(current, id, { label: clean }) : current;
    if (next === 'child') {
      const added = addChild(content, id);
      if (added) {
        commit(ctxRef.current, added.content);
        setEditing(added.node.id);
        return;
      }
    }
    commit(ctxRef.current, content);
    controller?.canvas.focus({ preventScroll: true });
  };

  /* ------------------------------------------------------------ controller events */

  const events: ControllerEvents = {
    onMoveNodes: (positions) => {
      const followers = withHiddenFollowing(graph, positions, scene.hidden);
      for (const id of positions.keys()) followers.delete(id);
      moveNodes(ctxRef.current, positions, followers, scale, (ts) => f.date(ts, 'dayMonth'));
    },
    onCreateNode: createAt,
    onEditNode: (id) => setEditing(id),
    onConnect: (from, to) => commit(ctxRef.current, connect(graph, from, to)),
    onToggleCollapse: (id) => commit(ctxRef.current, g.toggleCollapsed(graph, id)),
    onToggleDone: (id) => toggleDone(ctxRef.current, id),
    onSelectionChange: (nodes, edge) => setSelection({ nodes: [...nodes], edge }),
    onViewportChange: (vp) => viewport.set(vp),
    onStrokeEnd: (stroke) => setAnnotations((a) => ({ ...a, strokes: [...a.strokes, stroke] })),
    onErase: (ids) => {
      const gone = new Set(ids);
      setAnnotations((a) => ({ ...a, strokes: a.strokes.filter((st) => !gone.has(st.id)) }));
    },
  };

  /* ------------------------------------------------------------ layouts */

  const stopLayout = () => layoutRun?.stop();

  const untangle = () => {
    if (!controller || layoutRun) return;
    const run = runForceLayout(controller, {
      animate: !reduced,
      onDone: (positions) => {
        setLayoutRun(null);
        const current = ctxRef.current.graph;
        commit(
          ctxRef.current,
          g.applyPositions(current, withHiddenFollowing(current, positions, scene.hidden)),
          t('canvas.layout.force'),
        );
        controller.fitReadable(0.55, dur * 2);
      },
    });
    setLayoutRun(run);
  };

  const arrange = (orientation: g.TreeOrientation) => {
    if (!controller) return;
    const targets = g.treePositions(graph, { orientation });
    tweenNodes(controller, targets, reduced ? 0 : theme.durSlower, () => {
      commit(
        ctxRef.current,
        g.applyPositions(ctxRef.current.graph, targets),
        t('canvas.layout.tree'),
      );
      controller.fitReadable(0.55, dur * 2);
    });
  };

  const toggleTimeline = () => {
    const next = !timelineOn;
    setTimelineOn(next);
    toast({ id: 'canvas-timeline', title: t(next ? 'canvas.timeline.on' : 'canvas.timeline.off') });
    if (next && controller) {
      const dated = g.placeOnTimeline(graph, timelineScale(Date.now(), f.timeZone));
      if (dated !== graph) {
        tweenNodes(controller, g.positionsOf(dated), reduced ? 0 : theme.durSlower, () =>
          commit(ctxRef.current, g.applyPositions(ctxRef.current.graph, g.positionsOf(dated))),
        );
      }
      // Bring today (x = 0) into view, keeping the current vertical position.
      const size = controller.getSize();
      const middle = controller.screenToWorld({ x: 0, y: size.height / 2 }).y;
      const zoom = Math.min(1, controller.getViewport().zoom);
      controller.setViewport(g.centerOn({ x: DAY_WIDTH * 2, y: middle }, size, zoom), dur);
    }
  };

  /* ------------------------------------------------------------ presentation */

  const startPresenting = () => {
    if (!controller) return;
    const tour =
      annotations.waypoints.length > 0 ? [...annotations.waypoints] : autoTour(scene, graph);
    if (tour.length === 0) {
      toast({ title: t('canvas.present.empty') });
      return;
    }
    controller.select([], undefined);
    setEditing(undefined);
    setPresenting({ tour, index: 0 });
  };

  const goTo = useCallback(
    (index: number) =>
      setPresenting((p) =>
        p ? { ...p, index: Math.max(0, Math.min(p.tour.length - 1, index)) } : p,
      ),
    [],
  );
  const exitPresenting = useCallback(() => setPresenting(null), []);

  useEffect(() => {
    const step = presenting?.tour[presenting.index];
    if (step && controller) controller.frameRect(step.rect, reduced ? 0 : theme.durSlower * 2, 96);
  }, [presenting, controller, reduced, theme.durSlower]);

  const addWaypoint = () => {
    if (!controller) return;
    const point = waypointFromView(createId(), controller.getViewport(), controller.getSize());
    setAnnotations((a) => ({ ...a, waypoints: [...a.waypoints, point] }));
    toast({
      title: t('canvas.present.waypointAdded', { count: annotations.waypoints.length + 1 }),
      tone: 'success',
    });
  };

  /* ------------------------------------------------------------ import / export / dev */

  const viewCenter = () =>
    controller?.screenToWorld({
      x: controller.getSize().width / 2,
      y: controller.getSize().height / 2,
    }) ?? {
      x: 0,
      y: 0,
    };

  const onExport = (format: ExportFormat) =>
    void exportCanvas(format, { graph, scene, strokes: annotations.strokes, theme, doneIds, t });

  const onTasks = () => {
    if (importTasks(ctxRef.current, store.all('tasks'), viewCenter()) > 0) {
      requestAnimationFrame(() => controller?.fitReadable(0.55, dur * 2));
    }
  };

  const onStress = () => {
    const created = createStressGraph(store, t);
    navigate('canvas', { graph: created.id });
  };

  const onNewCanvas = () => {
    const created = store.create('graphs', { title: t('canvas.untitled'), ...starterContent(t) });
    navigate('canvas', { graph: created.id });
  };

  // Dev overlay: what the renderer drew in the last frame.
  useEffect(() => {
    if (!import.meta.env.DEV || !controller) return;
    return viewport.subscribe(() =>
      setStats(
        t('canvas.dev.stats', {
          nodes: controller.lastStats.nodes,
          ms: controller.lastFrameMs.toFixed(1),
        }),
      ),
    );
  }, [controller, viewport, t]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    const text = e.dataTransfer.getData('text/plain');
    const file = e.dataTransfer.files[0];
    const at = controller?.screenToWorld(localPoint(e)) ?? viewCenter();
    if (!text && !file) return;
    e.preventDefault();
    const handle = (raw: string) => {
      try {
        const tree = parseTreeText(raw);
        if (tree) importTree(ctxRef.current, tree, at);
      } catch {
        toast({ title: t('canvas.import.failed'), tone: 'danger' });
      }
    };
    if (text) handle(text);
    else if (file && file.size < 5_000_000) void file.text().then(handle);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (document.activeElement !== controller?.canvas) return;
      let tree: ReturnType<typeof parseTreeText> = null;
      try {
        tree = parseTreeText(e.clipboardData?.getData('text/plain') ?? '');
      } catch {
        // Malformed OPML: let the paste fall through untouched.
      }
      if (!tree) return;
      e.preventDefault();
      importTree(ctxRef.current, tree, viewCenter());
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  });

  /* ------------------------------------------------------------ keyboard */

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (!controller || editing) return;
    const mod = e.metaKey || e.ctrlKey;
    const only = selection.nodes.length === 1 ? selection.nodes[0] : undefined;
    const key = e.key;
    const handled = (() => {
      if (mod && key.toLowerCase() === 'z') return e.shiftKey ? store.redo() : store.undo();
      if (mod && key.toLowerCase() === 'y') return store.redo();
      if (mod && key.toLowerCase() === 'a') {
        controller.select(
          scene.nodes.map((n) => n.id),
          undefined,
        );
        return true;
      }
      if (mod || e.altKey) return false;
      const toolHit = TOOLS.find((x) => x.key.toLowerCase() === key.toLowerCase());
      if (toolHit) {
        setTool(toolHit.id);
        return true;
      }
      const dir = ARROWS[key];
      if (dir) {
        const from = only ? scene.byId.get(only) : undefined;
        if (from && !e.shiftKey) {
          const next = nodeInDirection(scene, from, dir);
          if (next) select([next.id]);
        } else {
          // Arrows move the view, so the content slides the opposite way.
          const step = 96;
          const d = { up: [0, step], down: [0, -step], left: [step, 0], right: [-step, 0] }[dir];
          controller.panBy(d[0] as number, d[1] as number, reduced ? 0 : theme.durBase);
        }
        return true;
      }
      switch (key) {
        case ' ':
          controller.setSpaceHeld(true);
          return true;
        case 'Tab':
          if (!only || e.shiftKey) return false;
          addRelative('child', only);
          return true;
        case 'Enter':
          if (only) addRelative('sibling', only);
          else createAt(viewCenter());
          return true;
        case 'F2':
          if (only) setEditing(only);
          return Boolean(only);
        case 'Delete':
        case 'Backspace':
          deleteSelection(ctxRef.current, selection.nodes, selection.edge);
          return true;
        case '+':
        case '=':
          controller.zoomBy(1.25, undefined, dur);
          return true;
        case '-':
        case '_':
          controller.zoomBy(0.8, undefined, dur);
          return true;
        case '0':
          controller.fit(dur * 1.5);
          return true;
        case 'Escape':
          controller.cancelGesture();
          controller.select([], undefined);
          setTool('select');
          return true;
        default:
          return false;
      }
    })();
    if (handled) e.preventDefault();
  };

  const onKeyUp = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === ' ') controller?.setSpaceHeld(false);
  };

  /* ------------------------------------------------------------ render */

  const selectedNodes = selection.nodes
    .map((id) => scene.byId.get(id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined);
  const selectedEdge = selection.edge
    ? graph.edges.find((e) => e.id === selection.edge)
    : undefined;
  const editingNode = editing ? graph.nodes.find((n) => n.id === editing) : undefined;
  const rows = useMemo(
    () => (mode === 'outline' ? outlineRows(graph, doneIds) : []),
    [mode, graph, doneIds],
  );
  const chrome = !presenting;
  const empty = graph.nodes.length === 0;

  return (
    <>
      {/* In-flow filler: the stage itself is fixed, so without it the shell would stretch its header. */}
      <div className={s.flowSpacer} aria-hidden="true" />
      <div
        className={s.root}
        data-mode={mode}
        data-timeline={timelineOn ? 'true' : 'false'}
        data-presenting={presenting ? 'true' : 'false'}
        onDragOver={(e) => {
          if (
            e.dataTransfer.types.includes('text/plain') ||
            e.dataTransfer.types.includes('Files')
          ) {
            e.preventDefault();
          }
        }}
        onDrop={onDrop}
      >
        <h1 className={s.srOnly}>{graph.title || t('canvas.untitled')}</h1>
        <p id={HELP_ID} className={s.srOnly}>
          {t('canvas.view.keyboardHelp')}
        </p>
        {mode === 'canvas' && (
          <p className={s.srOnly} aria-live="polite" aria-atomic="true">
            {describeSelection(t, selectedNodes)}
          </p>
        )}
        {mode === 'canvas' && (
          <CanvasStage
            scene={scene}
            tool={tool}
            strokes={annotations.strokes}
            inkStyle={ink}
            timeline={timeline}
            events={events}
            dueLabel={(ts) => f.date(ts, 'dayMonth')}
            label={t('canvas.view.canvasA11y', {
              title: graph.title || t('canvas.untitled'),
              count: graph.nodes.length,
            })}
            describedBy={HELP_ID}
            roleDescription={t('canvas.view.roleDescription')}
            onReady={setController}
            onTheme={(next) => setTheme((prev) => (sameTheme(prev, next) ? prev : next))}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
          />
        )}
        {mode === 'outline' && (
          <div className={s.outlineScroll}>
            <OutlineView
              rows={rows}
              onToggleCollapse={(id) => commit(ctxRef.current, g.toggleCollapsed(graph, id))}
              onRename={(id, label) => commit(ctxRef.current, updateNode(graph, id, { label }))}
              onToggleDone={(id) => toggleDone(ctxRef.current, id)}
              onDelete={(id) => deleteSelection(ctxRef.current, [id], undefined)}
            />
          </div>
        )}

        {chrome && (
          <TopBar
            graph={graph}
            graphs={graphs}
            mode={mode}
            compact={!desktop}
            onMode={setMode}
            timeline={timelineOn}
            layoutRunning={layoutRun !== null}
            minimap={minimapOn}
            onRename={(title) => store.update('graphs', graph.id, { title })}
            onOpen={(id) => navigate('canvas', { graph: id })}
            onNew={onNewCanvas}
            onUntangle={untangle}
            onStopLayout={stopLayout}
            onTree={() => arrange('vertical')}
            onMindMap={() => arrange('horizontal')}
            onCollapseAll={() => commit(ctxRef.current, g.collapseToDepth(graph, 1))}
            onExpandAll={() => commit(ctxRef.current, g.expandAll(graph))}
            onTimeline={toggleTimeline}
            onPresent={startPresenting}
            onAddWaypoint={addWaypoint}
            waypointCount={annotations.waypoints.length}
            onClearWaypoints={() => setAnnotations((a) => ({ ...a, waypoints: [] }))}
            onExport={onExport}
            onTasks={onTasks}
            onMinimap={setMinimapOn}
            onStress={import.meta.env.DEV ? onStress : undefined}
          />
        )}

        {mode === 'canvas' &&
          chrome &&
          (tool === 'select' || tool === 'node' || tool === 'edge') &&
          (selectedNodes.length > 0 || selectedEdge) &&
          !editing && (
            <SelectionBar
              nodes={selectedNodes}
              edge={selectedEdge}
              onAddChild={() => selectedNodes[0] && addRelative('child', selectedNodes[0].id)}
              onEdit={() => selectedNodes[0] && setEditing(selectedNodes[0].id)}
              onToggleCollapse={() =>
                selectedNodes[0] &&
                commit(ctxRef.current, g.toggleCollapsed(graph, selectedNodes[0].id))
              }
              onColor={(color) => setColor(ctxRef.current, selection.nodes, color)}
              onTask={() => selectedNodes[0] && taskAction(ctxRef.current, selectedNodes[0].id)}
              onDelete={() => deleteSelection(ctxRef.current, selection.nodes, undefined)}
              onEdgeCondition={(on) =>
                selection.edge && setConditional(ctxRef.current, selection.edge, on)
              }
              onDeleteEdge={() => deleteSelection(ctxRef.current, [], selection.edge)}
            />
          )}

        {mode === 'canvas' && empty && chrome && (
          <div className={s.emptyHint}>
            <p className={s.emptyTitle}>{t('canvas.empty.title')}</p>
            <p className={s.emptyBody}>{t('canvas.empty.body')}</p>
            <div className={s.emptyActions}>
              <button
                type="button"
                className={s.pillButton}
                onClick={() => commit(ctxRef.current, starterContent(t))}
              >
                {t('canvas.empty.action')}
              </button>
              <button type="button" className={s.pillGhost} onClick={onTasks}>
                {t('canvas.empty.tasks')}
              </button>
            </div>
          </div>
        )}

        {mode === 'canvas' && controller && editingNode && (
          <NodeEditor
            key={editingNode.id}
            controller={controller}
            scene={scene}
            viewport={viewport}
            nodeId={editingNode.id}
            initial={editingNode.label}
            label={t('canvas.node.editLabel')}
            placeholder={t('canvas.node.newIdea')}
            onCommit={(label, next) => finishEdit(editingNode.id, label, next)}
            onCancel={() => finishEdit(editingNode.id, editingNode.label, undefined)}
          />
        )}

        {mode === 'canvas' && chrome && (
          <Toolbar tool={tool} onTool={setTool} ink={ink} onInk={setInk} />
        )}

        {mode === 'canvas' && chrome && (
          <div className={s.corner}>
            {minimapOn && !empty && (
              <Minimap
                controller={controller}
                scene={scene}
                viewport={viewport}
                theme={theme}
                label={t('canvas.view.minimapA11y')}
                width={desktop ? 208 : 132}
                height={desktop ? 136 : 88}
              />
            )}
            <ZoomControls controller={controller} viewport={viewport} duration={dur} />
          </div>
        )}

        {layoutRun && (
          <p className={s.status} role="status">
            {t('canvas.layout.running')}
          </p>
        )}
        {import.meta.env.DEV && stats && chrome && mode === 'canvas' && (
          <p className={s.devStats} aria-hidden="true">
            {stats}
          </p>
        )}

        {presenting && (
          <Presenter
            index={presenting.index}
            total={presenting.tour.length}
            onGo={goTo}
            onExit={exitPresenting}
          />
        )}
      </div>
    </>
  );
}

function localPoint(e: DragEvent<HTMLElement>): g.Point {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function sameTheme(a: CanvasTheme, b: CanvasTheme): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
