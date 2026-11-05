/**
 * Graph & canvas engine (module 4): spatial index, layouts, timeline axis, conditional flows,
 * collapsing, viewport maths and import/export. Pure functions over `Graph` values; nothing here
 * touches the DOM, so the same code runs in the app, the CLI and the sync server.
 */
export type { GraphContent, GraphLike, Point, Rect, Size } from './types.ts';

export {
  EMPTY_RECT,
  boundsOfPoints,
  distanceSqToRect,
  inflateRect,
  rectCenter,
  rectContainsPoint,
  rectsIntersect,
  unionRect,
} from './geometry.ts';
export { applyPositions, indexNodes, positionsOf } from './positions.ts';
export { createRandom } from './random.ts';
export type { Random } from './random.ts';

export { QuadTree } from './quadtree.ts';
export type { QuadItem, QuadTreeOptions } from './quadtree.ts';

export { createLayout, layout } from './force.ts';
export type { ForceLayout, ForceLayoutOptions } from './force.ts';

export { ancestorsOf, buildHierarchy, descendantsOf, preorder } from './hierarchy.ts';
export type { Hierarchy, HierarchyEntry, HierarchyOptions } from './hierarchy.ts';
export { buchheim, treeLayout, treePositions } from './tree.ts';
export type { TreeLayoutOptions, TreeOrientation } from './tree.ts';
export { dependencyEdgeId, taskNodeId, tasksToGraph, treeEdgeId } from './from-tasks.ts';
export type { TasksToGraphOptions } from './from-tasks.ts';

export { createTimeScale, dragToDue, placeOnTimeline, timeTicks } from './timeline.ts';
export type {
  DragToDueOptions,
  TickUnit,
  TimeScale,
  TimeScaleOptions,
  TimeTick,
} from './timeline.ts';

export { isNodeDone, lockedNodes, lockedReason, unlockedBy, unlockedNodes } from './flow.ts';
export type { Blocker, LockedReason } from './flow.ts';

export {
  collapseToDepth,
  expandAll,
  setCollapsed,
  toggleCollapsed,
  visibleSubgraph,
} from './collapse.ts';
export type { VisibleSubgraph } from './collapse.ts';

export {
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
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
export type {
  FitViewOptions,
  GraphBoundsOptions,
  MinimapTransform,
  Viewport,
  ZoomLimits,
} from './viewport.ts';

export type { TreeImportOptions } from './import-tree.ts';
export { fromOutline, outlineLabel, toOutline } from './outline.ts';
export type { OutlineExportOptions, OutlineImport } from './outline.ts';
export { OpmlError, decodeXmlEntities, escapeXml, fromOPML, toOPML } from './opml.ts';
export type { OpmlExportOptions, OpmlImport, OpmlImportOptions } from './opml.ts';
export { DEFAULT_PALETTE, clipToBox, toSVG } from './svg.ts';
export type { SvgExportOptions } from './svg.ts';
