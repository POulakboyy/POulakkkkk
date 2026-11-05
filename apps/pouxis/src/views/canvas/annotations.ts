import { useCallback, useSyncExternalStore } from 'react';
import type { Id } from '@pouxis/core';
import type { Waypoint } from './engine/camera.ts';
import type { InkPoint, Stroke } from './engine/ink.ts';

/**
 * Freehand strokes and presentation waypoints of each canvas.
 *
 * The shared `Graph` model has no field for them yet, so they live here, persisted per device
 * in `localStorage`. The API is the one a synced field would need, so moving them into the
 * graph record later only changes this file.
 */
export interface Annotations {
  strokes: readonly Stroke[];
  waypoints: readonly Waypoint[];
}

const EMPTY: Annotations = { strokes: [], waypoints: [] };
const KEY = 'pouxis.canvas.annotations.';
const cache = new Map<Id, Annotations>();
const listeners = new Set<() => void>();

function isPoint(v: unknown): v is InkPoint {
  const p = v as InkPoint;
  return (
    typeof p === 'object' &&
    p !== null &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    Number.isFinite(p.p)
  );
}

/** Validates stored JSON: anything malformed is dropped rather than crashing the canvas. */
export function parseAnnotations(raw: string | null): Annotations {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof Annotations, unknown>>;
    const strokes = Array.isArray(data.strokes)
      ? data.strokes.filter(
          (s): s is Stroke =>
            typeof s?.id === 'string' &&
            Array.isArray(s.points) &&
            s.points.every(isPoint) &&
            Number.isFinite(s.width) &&
            Number.isInteger(s.color),
        )
      : [];
    const waypoints = Array.isArray(data.waypoints)
      ? data.waypoints.filter(
          (w): w is Waypoint =>
            typeof w?.id === 'string' &&
            ['x', 'y', 'width', 'height'].every((k) => Number.isFinite(w.rect?.[k])),
        )
      : [];
    return { strokes, waypoints };
  } catch {
    return EMPTY;
  }
}

export function getAnnotations(graphId: Id): Annotations {
  const hit = cache.get(graphId);
  if (hit) return hit;
  let raw: string | null = null;
  try {
    raw = globalThis.localStorage?.getItem(KEY + graphId) ?? null;
  } catch {
    // Storage blocked (private mode, sandbox): annotations stay in memory.
  }
  const value = parseAnnotations(raw);
  cache.set(graphId, value);
  return value;
}

export function setAnnotations(graphId: Id, update: (current: Annotations) => Annotations): void {
  const next = update(getAnnotations(graphId));
  cache.set(graphId, next);
  try {
    if (next.strokes.length === 0 && next.waypoints.length === 0) {
      globalThis.localStorage?.removeItem(KEY + graphId);
    } else {
      globalThis.localStorage?.setItem(KEY + graphId, JSON.stringify(next));
    }
  } catch {
    // Quota or blocked storage: keep the in-memory value.
  }
  for (const l of [...listeners]) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAnnotations(
  graphId: Id | undefined,
): [Annotations, (update: (current: Annotations) => Annotations) => void] {
  const value = useSyncExternalStore(subscribe, () => (graphId ? getAnnotations(graphId) : EMPTY));
  const set = useCallback(
    (update: (current: Annotations) => Annotations) => {
      if (graphId) setAnnotations(graphId, update);
    },
    [graphId],
  );
  return [value, set];
}

/** Test helper: forget cached values. */
export function resetAnnotationsCache(): void {
  cache.clear();
}
