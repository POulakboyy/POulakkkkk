import { graph as g } from '@pouxis/core';
import type { Id } from '@pouxis/core';
import type { Waypoint } from './camera.ts';
import type { Scene, SceneNode } from './scene.ts';

/** World rectangle covering scene nodes (boxes included); `undefined` for none. */
export function nodesBounds(nodes: Iterable<SceneNode>): g.Rect | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.w / 2);
    maxX = Math.max(maxX, n.x + n.w / 2);
    minY = Math.min(minY, n.y - n.h / 2);
    maxY = Math.max(maxY, n.y + n.h / 2);
  }
  if (minX === Infinity) return undefined;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Default presentation when the user has not defined waypoints (4.10): the overview, then each
 * main branch (children of the first root) with its visible descendants, in reading order.
 */
export function autoTour(scene: Scene, content: g.GraphLike, limit = 12): Waypoint[] {
  const overview = nodesBounds(scene.nodes);
  if (!overview) return [];
  const tour: Waypoint[] = [{ id: 'overview', rect: overview }];
  const hierarchy = g.buildHierarchy(content);
  const root = [...hierarchy.roots].sort(
    (a, b) => (hierarchy.children.get(b)?.length ?? 0) - (hierarchy.children.get(a)?.length ?? 0),
  )[0];
  if (root === undefined) return tour;
  const branches = [...(hierarchy.children.get(root) ?? [])]
    .map((id) => scene.byId.get(id))
    .filter((n): n is SceneNode => n !== undefined)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, limit);
  for (const branch of branches) {
    const members: SceneNode[] = [branch];
    for (const id of g.descendantsOf(hierarchy, branch.id)) {
      const n = scene.byId.get(id);
      if (n) members.push(n);
    }
    const rect = nodesBounds(members);
    if (rect) tour.push({ id: `branch:${branch.id}`, rect });
  }
  return tour;
}

/** The current view as a waypoint (what "add this view to the tour" stores). */
export function waypointFromView(id: Id, vp: g.Viewport, size: g.Size): Waypoint {
  return { id, rect: g.visibleWorldRect(vp, size) };
}
