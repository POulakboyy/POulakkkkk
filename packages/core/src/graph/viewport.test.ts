import { describe, expect, it } from 'vitest';
import { node } from './test-utils.ts';
import {
  centerOn,
  clampZoom,
  fitView,
  graphBounds,
  minimapTransform,
  panBy,
  screenToWorld,
  visibleWorldRect,
  worldToScreen,
  zoomAround,
} from './viewport.ts';

const screen = { width: 800, height: 600 };

describe('viewport', () => {
  it('converts between world and screen coordinates', () => {
    const vp = { x: 100, y: 50, zoom: 2 };
    expect(worldToScreen({ x: 110, y: 60 }, vp)).toEqual({ x: 20, y: 20 });
    expect(screenToWorld({ x: 20, y: 20 }, vp)).toEqual({ x: 110, y: 60 });
    expect(visibleWorldRect(vp, screen)).toEqual({ x: 100, y: 50, width: 400, height: 300 });
    expect(visibleWorldRect(vp, screen, 20)).toEqual({ x: 90, y: 40, width: 420, height: 320 });
  });

  it('zooms around the pointer, keeping the world point under it fixed', () => {
    const vp = { x: 0, y: 0, zoom: 1 };
    const pointer = { x: 300, y: 200 };
    const before = screenToWorld(pointer, vp);
    const zoomed = zoomAround(vp, pointer, 2.5);
    expect(zoomed.zoom).toBe(2.5);
    const after = screenToWorld(pointer, zoomed);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomAround(vp, pointer, 1000, { maxZoom: 4 }).zoom).toBe(4);
    const capped = { x: 0, y: 0, zoom: 4 };
    expect(zoomAround(capped, pointer, 2, { maxZoom: 4 })).toBe(capped);
  });

  it('clamps zoom', () => {
    expect(clampZoom(0)).toBe(0.02);
    expect(clampZoom(100)).toBe(8);
    expect(clampZoom(Infinity)).toBe(8);
    expect(clampZoom(Number.NaN)).toBe(0.02);
    expect(clampZoom(3, { minZoom: 5, maxZoom: 1 })).toBe(5);
  });

  it('pans by screen deltas and centres on a point', () => {
    expect(panBy({ x: 0, y: 0, zoom: 2 }, 100, -50)).toEqual({ x: -50, y: 25, zoom: 2 });
    const centred = centerOn({ x: 10, y: 20 }, screen, 2);
    expect(worldToScreen({ x: 10, y: 20 }, centred)).toEqual({ x: 400, y: 300 });
  });

  it('computes bounds with node boxes', () => {
    const g = { nodes: [node('a', 0, 0), node('b', 100, 50)], edges: [] };
    expect(graphBounds(g)).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    expect(graphBounds(g, { nodeSize: { width: 20, height: 10 } })).toEqual({
      x: -10,
      y: -5,
      width: 120,
      height: 60,
    });
    expect(graphBounds({ nodes: [], edges: [] })).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('fits content inside the padded screen, centred', () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 100 };
    const vp = fitView(bounds, screen, { padding: 50 });
    expect(vp.zoom).toBeCloseTo(0.7);
    const left = worldToScreen({ x: 0, y: 50 }, vp);
    expect(left.x).toBeCloseTo(50);
    expect(left.y).toBeCloseTo(300);
    expect(fitView({ x: 5, y: 5, width: 0, height: 0 }, screen).zoom).toBe(1);
    expect(fitView({ x: 0, y: 0, width: 1, height: 1 }, screen, { maxZoom: 3 }).zoom).toBe(3);
  });

  it('maps the content and the current view into the minimap', () => {
    const content = { x: 0, y: 0, width: 2000, height: 1000 };
    const vp = { x: 0, y: 0, zoom: 1 };
    const map = minimapTransform(content, vp, screen, { width: 208, height: 108 }, 4);
    expect(map.scale).toBeCloseTo(0.1);
    expect(map.frame).toEqual({ x: 4, y: 4, width: 80, height: 60 });
    const world = map.toWorld(map.toMinimap({ x: 1234, y: 567 }));
    expect(world.x).toBeCloseTo(1234);
    expect(world.y).toBeCloseTo(567);
    // A view outside the content is still inside the minimap.
    const away = minimapTransform(content, { x: 5000, y: 0, zoom: 1 }, screen, {
      width: 200,
      height: 100,
    });
    expect(away.frame.x + away.frame.width).toBeLessThanOrEqual(200 + 1e-9);
    expect(away.world.width).toBe(5800);
  });
});
