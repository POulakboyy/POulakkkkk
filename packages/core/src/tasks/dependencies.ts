/**
 * Dependency graph between tasks (2.1): a task listing ids in `dependsOn` only becomes
 * actionable — and only shows in the Today view — once all of them are resolved.
 *
 * A dependency is resolved when the blocking task is done, archived (it can no longer be
 * completed, so it must not block forever) or missing from the data set (dangling id).
 */
import type { Id, Task } from '../model.ts';
import { indexById, isOpen } from './common.ts';
import type { TaskLookup } from './common.ts';

function isResolved(dependency: Task | undefined): boolean {
  return dependency === undefined || !isOpen(dependency);
}

/** Distinct dependency ids of `task`, in declaration order. */
function dependencyIds(task: Task): Id[] {
  return [...new Set(task.dependsOn)];
}

/** Open tasks that `task` is still waiting for, in `dependsOn` order. */
export function blockers(task: Task, byId: TaskLookup): Task[] {
  const out: Task[] = [];
  for (const id of dependencyIds(task)) {
    const dependency = byId.get(id);
    if (dependency && !isResolved(dependency)) out.push(dependency);
  }
  return out;
}

/** An open task whose dependencies are all resolved. */
export function isActionable(task: Task, byId: TaskLookup): boolean {
  return isOpen(task) && blockers(task, byId).length === 0;
}

/** Open, unblocked tasks, in input order — what the Today view may show. */
export function actionable(tasks: readonly Task[]): Task[] {
  const byId = indexById(tasks);
  return tasks.filter((task) => isActionable(task, byId));
}

/**
 * Open tasks that become actionable once `doneId` is completed — drives the "unlocked"
 * animation. Computed as if `doneId` were done, so it can be called before or after the
 * status change is saved.
 */
export function unlockedBy(doneId: Id, tasks: readonly Task[]): Task[] {
  const byId = indexById(tasks);
  if (!byId.has(doneId)) return [];
  return tasks.filter(
    (task) =>
      task.id !== doneId &&
      isOpen(task) &&
      task.dependsOn.includes(doneId) &&
      blockers(task, byId).every((blocker) => blocker.id === doneId),
  );
}

/** Adjacency list restricted to tasks present in the set (dangling ids are ignored). */
function adjacency(byId: TaskLookup): Map<Id, Id[]> {
  const edges = new Map<Id, Id[]>();
  for (const task of byId.values()) {
    edges.set(
      task.id,
      dependencyIds(task).filter((id) => byId.has(id)),
    );
  }
  return edges;
}

/**
 * Orders tasks so every task comes after the tasks it depends on; independent tasks keep
 * their input order. Best effort on cyclic data: the edge closing a cycle is ignored, so
 * every task is still returned exactly once — use `detectCycles` to report the problem.
 */
export function topoOrder(tasks: readonly Task[]): Task[] {
  const byId = indexById(tasks);
  const edges = adjacency(byId);
  const state = new Map<Id, 'visiting' | 'done'>();
  const out: Task[] = [];

  for (const root of byId.values()) {
    if (state.has(root.id)) continue;
    state.set(root.id, 'visiting');
    const stack: { id: Id; next: number }[] = [{ id: root.id, next: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1] as { id: Id; next: number };
      const deps = edges.get(frame.id) ?? [];
      const dep = deps[frame.next];
      if (dep !== undefined) {
        frame.next++;
        if (!state.has(dep)) {
          state.set(dep, 'visiting');
          stack.push({ id: dep, next: 0 });
        }
        continue;
      }
      stack.pop();
      state.set(frame.id, 'done');
      const task = byId.get(frame.id);
      if (task) out.push(task);
    }
  }
  return out;
}

/**
 * Groups of tasks that depend on each other circularly (strongly connected components of
 * size > 1, or a task depending on itself). Each group lists ids in input order; groups are
 * ordered by their first member. An empty array means the graph is acyclic.
 */
export function detectCycles(tasks: readonly Task[]): Id[][] {
  const byId = indexById(tasks);
  const edges = adjacency(byId);
  const position = new Map<Id, number>();
  [...byId.keys()].forEach((id, i) => position.set(id, i));

  // Iterative Tarjan: no recursion, so long dependency chains cannot overflow the stack.
  const index = new Map<Id, number>();
  const low = new Map<Id, number>();
  const onStack = new Set<Id>();
  const stack: Id[] = [];
  const groups: Id[][] = [];
  let counter = 0;

  const visit = (id: Id, work: { id: Id; next: number }[]): void => {
    index.set(id, counter);
    low.set(id, counter);
    counter++;
    stack.push(id);
    onStack.add(id);
    work.push({ id, next: 0 });
  };

  for (const rootId of byId.keys()) {
    if (index.has(rootId)) continue;
    const work: { id: Id; next: number }[] = [];
    visit(rootId, work);
    while (work.length > 0) {
      const frame = work[work.length - 1] as { id: Id; next: number };
      const dep = (edges.get(frame.id) ?? [])[frame.next];
      if (dep !== undefined) {
        frame.next++;
        if (!index.has(dep)) visit(dep, work);
        else if (onStack.has(dep)) lower(low, frame.id, index.get(dep));
        continue;
      }
      work.pop();
      const parent = work[work.length - 1];
      if (parent) lower(low, parent.id, low.get(frame.id));
      if (low.get(frame.id) !== index.get(frame.id)) continue;

      const group: Id[] = [];
      let member: Id | undefined;
      do {
        member = stack.pop();
        if (member === undefined) break;
        onStack.delete(member);
        group.push(member);
      } while (member !== frame.id);
      const selfLoop = (edges.get(frame.id) ?? []).includes(frame.id);
      if (group.length > 1 || selfLoop) groups.push(group);
    }
  }

  const byPosition = (a: Id, b: Id): number => (position.get(a) ?? 0) - (position.get(b) ?? 0);
  for (const group of groups) group.sort(byPosition);
  return groups.sort((a, b) => byPosition(a[0] as Id, b[0] as Id));
}

function lower(low: Map<Id, number>, id: Id, candidate: number | undefined): void {
  const current = low.get(id);
  if (candidate !== undefined && current !== undefined && candidate < current) {
    low.set(id, candidate);
  }
}

/**
 * Whether making `fromId` depend on `toId` (adding `toId` to its `dependsOn`) would create a
 * cycle — true when `toId` is `fromId` itself or already (transitively) depends on it.
 * Call it before accepting a new dependency link in the UI.
 */
export function wouldCreateCycle(tasks: readonly Task[], fromId: Id, toId: Id): boolean {
  if (fromId === toId) return true;
  const byId = indexById(tasks);
  const seen = new Set<Id>([toId]);
  const queue: Id[] = [toId];
  for (let i = 0; i < queue.length; i++) {
    const task = byId.get(queue[i] as Id);
    if (!task) continue;
    for (const dep of task.dependsOn) {
      if (dep === fromId) return true;
      if (!seen.has(dep)) {
        seen.add(dep);
        queue.push(dep);
      }
    }
  }
  return false;
}
