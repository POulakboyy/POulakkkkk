/**
 * Data transmutation (4.3): a list of tasks dropped on the canvas becomes a functional tree.
 * Subtasks (`parentId`) become tree edges, dependencies (`dependsOn`) become `on-complete` flow
 * edges, and the result is laid out as a tidy tree.
 *
 * Ids are derived from task ids, so converting the same tasks twice yields the same nodes and
 * edges (callers can merge idempotently instead of duplicating).
 */
import type { GraphEdge, GraphNode, Id, Task } from '../model.ts';
import { treePositions } from './tree.ts';
import type { TreeLayoutOptions } from './tree.ts';
import type { GraphContent } from './types.ts';

export interface TasksToGraphOptions {
  /** Add an `on-complete` edge for each dependency inside the list (default true). */
  includeDependencies?: boolean;
  /** Tidy-tree options, or `false` to leave every node at (0, 0). Default: vertical tree at the origin. */
  layout?: TreeLayoutOptions | false;
}

/** Node id used for a task (the task id itself, so a node maps back to its task). */
export function taskNodeId(taskId: Id): Id {
  return taskId;
}

export function treeEdgeId(parentId: Id, childId: Id): Id {
  return `tree:${parentId}>${childId}`;
}

export function dependencyEdgeId(fromId: Id, toId: Id): Id {
  return `dep:${fromId}>${toId}`;
}

export function tasksToGraph(
  tasks: readonly Task[],
  options: TasksToGraphOptions = {},
): GraphContent {
  const list: Task[] = [];
  const ids = new Set<Id>();
  for (const task of tasks) {
    if (ids.has(task.id)) continue;
    ids.add(task.id);
    list.push(task);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeIds = new Set<Id>();
  const addEdge = (edge: GraphEdge): void => {
    if (edgeIds.has(edge.id)) return;
    edgeIds.add(edge.id);
    edges.push(edge);
  };

  for (const task of list) {
    const node: GraphNode = {
      id: taskNodeId(task.id),
      label: task.title,
      kind: 'task',
      x: 0,
      y: 0,
      refId: task.id,
    };
    const hasParent = task.parentId !== undefined && task.parentId !== task.id && ids.has(task.parentId);
    if (hasParent) node.parentId = taskNodeId(task.parentId as Id);
    if (task.color !== undefined) node.color = task.color;
    if (task.deadline !== undefined) node.due = task.deadline;
    nodes.push(node);
    if (hasParent) {
      addEdge({
        id: treeEdgeId(task.parentId as Id, task.id),
        from: taskNodeId(task.parentId as Id),
        to: node.id,
        condition: 'always',
      });
    }
  }

  if (options.includeDependencies ?? true) {
    for (const task of list) {
      for (const dep of task.dependsOn) {
        if (dep === task.id || !ids.has(dep)) continue;
        addEdge({
          id: dependencyEdgeId(dep, task.id),
          from: taskNodeId(dep),
          to: taskNodeId(task.id),
          condition: 'on-complete',
        });
      }
    }
  }

  const content: GraphContent = { nodes, edges };
  if (options.layout === false) return content;
  const positions = treePositions(content, { origin: { x: 0, y: 0 }, ...options.layout });
  for (const node of nodes) {
    const p = positions.get(node.id);
    if (p) {
      node.x = p.x;
      node.y = p.y;
    }
  }
  return content;
}
