import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createId } from '@pouxis/core';
import { CanvasController, type ControllerEvents, type Tool } from '../engine/controller.ts';
import type { RenderState } from '../engine/render.ts';
import type { Scene } from '../engine/scene.ts';
import type { Stroke } from '../engine/ink.ts';
import { readTheme, type CanvasTheme } from '../engine/theme.ts';
import s from '../Canvas.module.css';

export interface CanvasStageProps {
  scene: Scene;
  tool: Tool;
  strokes: readonly Stroke[];
  inkStyle: { width: number; color: number };
  timeline: RenderState['timeline'];
  events: ControllerEvents;
  dueLabel: (ts: number) => string;
  label: string;
  describedBy: string;
  roleDescription: string;
  onReady: (controller: CanvasController | null) => void;
  onTheme: (theme: CanvasTheme) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLCanvasElement>) => void;
  onKeyUp?: (e: ReactKeyboardEvent<HTMLCanvasElement>) => void;
}

/**
 * Hosts the `<canvas>` and its imperative controller. Props are pushed into the controller in
 * effects; event handlers go through a ref so the controller never needs to be recreated.
 */
export function CanvasStage(props: CanvasStageProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<CanvasController | null>(null);
  const events = useRef(props.events);
  events.current = props.events;
  const dueLabel = useRef(props.dueLabel);
  dueLabel.current = props.dueLabel;
  const onReady = useRef(props.onReady);
  onReady.current = props.onReady;
  const onTheme = useRef(props.onTheme);
  onTheme.current = props.onTheme;
  const initialScene = useRef(props.scene);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const proxy: ControllerEvents = {
      onMoveNodes: (p) => events.current.onMoveNodes(p),
      onCreateNode: (p) => events.current.onCreateNode(p),
      onEditNode: (id) => events.current.onEditNode(id),
      onConnect: (a, b) => events.current.onConnect(a, b),
      onToggleCollapse: (id) => events.current.onToggleCollapse(id),
      onToggleDone: (id) => events.current.onToggleDone(id),
      onSelectionChange: (n, e) => events.current.onSelectionChange(n, e),
      onViewportChange: (vp) => events.current.onViewportChange(vp),
      onStrokeEnd: (st) => events.current.onStrokeEnd(st),
      onErase: (ids) => events.current.onErase(ids),
    };
    const controller = new CanvasController(canvas, initialScene.current, {
      events: proxy,
      makeId: createId,
      dueLabel: (ts) => dueLabel.current(ts),
    });
    controllerRef.current = controller;

    const host = canvas.parentElement ?? canvas;
    const applyTheme = () => {
      const theme = readTheme(host);
      controller.setTheme(theme);
      onTheme.current(theme);
    };
    applyTheme();
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) controller.resize(r.width, r.height);
    };
    measure();
    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : undefined;
    resizeObserver?.observe(canvas);
    // Theme switches flip `data-theme` on <html> or the OS colour scheme.
    const themeObserver =
      typeof MutationObserver === 'function' ? new MutationObserver(applyTheme) : undefined;
    themeObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });
    const scheme = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    scheme?.addEventListener?.('change', applyTheme);
    const dpr = globalThis.matchMedia?.(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`);
    dpr?.addEventListener?.('change', measure);

    controller.fitReadable();
    onReady.current(controller);
    return () => {
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      scheme?.removeEventListener?.('change', applyTheme);
      dpr?.removeEventListener?.('change', measure);
      controller.destroy();
      controllerRef.current = null;
      onReady.current(null);
    };
  }, []);

  useEffect(() => controllerRef.current?.setScene(props.scene), [props.scene]);
  useEffect(() => controllerRef.current?.setTool(props.tool), [props.tool]);
  useEffect(() => controllerRef.current?.setStrokes(props.strokes), [props.strokes]);
  useEffect(() => controllerRef.current?.setInkStyle(props.inkStyle), [props.inkStyle]);
  useEffect(() => controllerRef.current?.setTimeline(props.timeline), [props.timeline]);

  return (
    <canvas
      ref={ref}
      className={s.canvas}
      data-tool={props.tool}
      tabIndex={0}
      role="application"
      aria-roledescription={props.roleDescription}
      aria-label={props.label}
      aria-describedby={props.describedBy}
      onKeyDown={props.onKeyDown}
      onKeyUp={props.onKeyUp}
    />
  );
}
