/**
 * Shared value types of the graph engine. Coordinates are world units (canvas pixels at zoom 1).
 */
import type { GraphEdge, GraphNode } from '../model.ts';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Axis-aligned rectangle; `x`/`y` is the top-left corner. Width and height are never negative. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Anything with nodes and edges: a full `Graph` record, a visible subgraph or the output of an
 * importer. Engine functions accept this so they work on fragments as well as stored graphs.
 */
export interface GraphLike {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

/** Nodes and edges produced by an importer (`tasksToGraph`, `fromOutline`, `fromOPML`). */
export interface GraphContent {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
