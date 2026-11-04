/**
 * Conditional flows (4.7): an `on-complete` edge A → B means "B unlocks once A is done".
 *
 * A node is locked while at least one source of its incoming `on-complete` edges is not done.
 * `always` edges never lock anything. Locks are not transitive on purpose: if A → B → C and the
 * user marks B done by hand, C unlocks even though A is still open (the user's explicit action
 * wins over the drawing).
 *
 * "Done" ids may be node ids or the ids of the records they mirror (`refId`), so callers can pass
 * the completed task ids straight from the store.
 */
import type { GraphNode, Id } from '../model.ts';
import { indexNodes } from './positions.ts';
import type { GraphLike } from './types.ts';

export interface Blocker {
  id: Id;
  label: string;
}

export interface LockedReason {
  nodeId: Id;
  /** Unfinished sources of the incoming `on-complete` edges, in edge order, without duplicates. */
  blockers: Blocker[];
}

/** Whether `node` counts as done for `done` (matched on its id or on its `refId`). */
export function isNodeDone(node: GraphNode, done: ReadonlySet<Id>): boolean {
  return done.has(node.id) || (node.refId !== undefined && done.has(node.refId));
}

/** Unfinished blockers of every locked node, keyed by node id, in graph order. */
export function lockedNodes(graph: GraphLike, doneIds: Iterable<Id>): Map<Id, Id[]> {
  const done = toSet(doneIds);
  const byId = indexNodes(graph.nodes);
  const blockers = new Map<Id, Id[]>();
  for (const edge of graph.edges) {
    if (edge.condition !== 'on-complete' || edge.from === edge.to) continue;
    const source = byId.get(edge.from);
    if (!source || !byId.has(edge.to) || isNodeDone(source, done)) continue;
    const list = blockers.get(edge.to);
    if (!list) blockers.set(edge.to, [source.id]);
    else if (!list.includes(source.id)) list.push(source.id);
  }
  const ordered = new Map<Id, Id[]>();
  for (const id of byId.keys()) {
    const list = blockers.get(id);
    if (list) ordered.set(id, list);
  }
  return ordered;
}

/** Ids of the nodes that are not locked, in graph order (nodes without conditions included). */
export function unlockedNodes(graph: GraphLike, doneIds: Iterable<Id>): Set<Id> {
  const locked = lockedNodes(graph, doneIds);
  const out = new Set<Id>();
  for (const node of graph.nodes) if (!locked.has(node.id)) out.add(node.id);
  return out;
}

/** Why `nodeId` is locked, or `null` when it is unlocked or unknown. */
export function lockedReason(
  graph: GraphLike,
  nodeId: Id,
  doneIds: Iterable<Id>,
): LockedReason | null {
  const ids = lockedNodes(graph, doneIds).get(nodeId);
  if (!ids) return null;
  const byId = indexNodes(graph.nodes);
  return {
    nodeId,
    blockers: ids.map((id) => ({ id, label: byId.get(id)?.label ?? '' })),
  };
}

/**
 * Nodes that become unlocked when `completedId` is done on top of `doneIds` — what the app
 * announces ("2 steps unlocked") right after a completion.
 */
export function unlockedBy(graph: GraphLike, completedId: Id, doneIds: Iterable<Id>): Id[] {
  const done = toSet(doneIds);
  const before = lockedNodes(graph, done);
  const after = lockedNodes(graph, new Set(done).add(completedId));
  const out: Id[] = [];
  for (const id of before.keys()) if (!after.has(id)) out.push(id);
  return out;
}

function toSet(ids: Iterable<Id>): ReadonlySet<Id> {
  return ids instanceof Set ? (ids as ReadonlySet<Id>) : new Set(ids);
}
