import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { graph as g } from '@pouxis/core';
import type { CanvasController } from '../engine/controller.ts';
import type { Scene } from '../engine/scene.ts';
import type { Signal } from '../engine/signal.ts';
import type { CanvasTheme } from '../engine/theme.ts';
import { nodesBounds } from '../engine/tour.ts';
import s from '../Canvas.module.css';

export interface MinimapProps {
  controller: CanvasController | null;
  scene: Scene;
  viewport: Signal<g.Viewport>;
  theme: CanvasTheme;
  label: string;
  width: number;
  height: number;
}

/**
 * Radar view (4.13): every node as a dot, the visible area as a frame. Nodes are drawn once per
 * scene into an offscreen bitmap; camera moves only redraw that bitmap and the frame.
 */
export function Minimap({
  controller,
  scene,
  viewport,
  theme,
  label,
  width,
  height,
}: MinimapProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas ? safeContext(canvas) : null;
    if (!canvas || !ctx || !controller) return;
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const content = nodesBounds(scene.nodes) ?? { x: -200, y: -150, width: 400, height: 300 };
    let cache: { key: string; bitmap: HTMLCanvasElement } | undefined;

    const draw = () => {
      const vp = viewport.get();
      const t = g.minimapTransform(content, vp, controller.getSize(), { width, height });
      const key = `${t.scale.toFixed(6)}:${t.world.x.toFixed(1)}:${t.world.y.toFixed(1)}`;
      if (!cache || cache.key !== key)
        cache = { key, bitmap: drawNodes(scene, t, width, height, dpr, theme) };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(cache.bitmap, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const f = t.frame;
      ctx.fillStyle = theme.accentSoft;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(f.x, f.y, f.width, f.height);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.accentStrong;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(f.x, f.y, f.width, f.height, 4);
      ctx.stroke();
    };
    draw();
    return viewport.subscribe(draw);
  }, [controller, scene, viewport, theme, width, height]);

  const navigate = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!controller) return;
    const r = e.currentTarget.getBoundingClientRect();
    const content = nodesBounds(scene.nodes) ?? { x: 0, y: 0, width: 1, height: 1 };
    const vp = controller.getViewport();
    const t = g.minimapTransform(content, vp, controller.getSize(), { width, height });
    const world = t.toWorld({ x: e.clientX - r.left, y: e.clientY - r.top });
    controller.setViewport(
      g.centerOn(world, controller.getSize(), vp.zoom),
      dragging.current ? 0 : 220,
    );
  };

  return (
    <canvas
      ref={ref}
      className={s.minimap}
      style={{ width, height }}
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        dragging.current = false;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointer (tests).
        }
        navigate(e);
        dragging.current = true;
      }}
      onPointerMove={(e) => {
        if (dragging.current && e.buttons > 0) navigate(e);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
    />
  );
}

function safeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

function drawNodes(
  scene: Scene,
  t: g.MinimapTransform,
  width: number,
  height: number,
  dpr: number,
  theme: CanvasTheme,
): HTMLCanvasElement {
  const bitmap = document.createElement('canvas');
  bitmap.width = Math.round(width * dpr);
  bitmap.height = Math.round(height * dpr);
  const ctx = safeContext(bitmap);
  if (!ctx) return bitmap;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const groups = new Map<string, Path2D>();
  for (const n of scene.nodes) {
    const c = n.node.color;
    const color = c !== undefined && c > 0 ? (theme.viz[c - 1] ?? theme.ink3) : theme.ink3;
    let path = groups.get(color);
    if (!path) {
      path = new Path2D();
      groups.set(color, path);
    }
    const p = t.toMinimap({ x: n.x, y: n.y });
    const w = Math.max(2, n.w * t.scale);
    const h = Math.max(2, n.h * t.scale);
    path.rect(p.x - w / 2, p.y - h / 2, w, h);
  }
  for (const [color, path] of groups) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill(path);
  }
  return bitmap;
}
