/**
 * Shared back end of the text importers (outline, OPML): a flat list of `(label, depth)` entries
 * in pre-order becomes nodes with `parentId`, tree edges and a tidy-tree layout.
 */
import { createId } from '../id.ts';
import type { GraphEdge, GraphNode, GraphNodeKind, Id } from '../model.ts';
import { treeEdgeId } from './from-tasks.ts';
import { treePositions } from './tree.ts';
import type { TreeLayoutOptions } from './tree.ts';
import type { GraphContent } from './types.ts';

export interface TreeImportOptions {
  /** Id of the `index`-th imported node (default: random ids from `createId`). */
  makeId?: (index: number) => Id;
  /** Kind of the created nodes (default `idea`). */
  kind?: GraphNodeKind;
  /** Tidy-tree options, or `false` to leave every node at (0, 0). Default: horizontal mind map. */
  layout?: TreeLayoutOptions | false;
}

export interface ImportEntry {
  label: string;
  /** 0 for roots; a jump of more than one level is clamped to "child of the previous entry". */
  depth: number;
}

export function buildTree(
  entries: readonly ImportEntry[],
  options: TreeImportOptions = {},
): GraphContent {
  const makeId = options.makeId ?? (() => createId());
  const kind = options.kind ?? 'idea';
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  /** `path[d]` is the id of the latest node at depth `d`. */
  const path: Id[] = [];
  for (const entry of entries) {
    const depth = Math.max(0, Math.min(Math.floor(entry.depth), path.length));
    const id = makeId(nodes.length);
    const node: GraphNode = { id, label: entry.label, kind, x: 0, y: 0 };
    const parentId = depth > 0 ? path[depth - 1] : undefined;
    if (parentId !== undefined) {
      node.parentId = parentId;
      edges.push({ id: treeEdgeId(parentId, id), from: parentId, to: id, condition: 'always' });
    }
    nodes.push(node);
    path.length = depth;
    path.push(id);
  }
  const content: GraphContent = { nodes, edges };
  if (options.layout !== false && nodes.length > 0) {
    const positions = treePositions(content, {
      orientation: 'horizontal',
      origin: { x: 0, y: 0 },
      ...options.layout,
    });
    for (const node of nodes) {
      const p = positions.get(node.id);
      if (p) {
        node.x = p.x;
        node.y = p.y;
      }
    }
  }
  return content;
}
