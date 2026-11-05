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

/** Whether any dependency of `task` is still open (duplicates and dangling ids are harmless). */
function hasOpenDependency(task: Task, byId: TaskLookup, except?: Id): boolean {
  for (const id of task.dependsOn) {
    if (id === except) continue;
    const dependency = byId.get(id);
    if (dependency !== undefined && isOpen(dependency)) return true;
  }
  return false;
}

/** Open, unblocked tasks, in input order — what the Today view may show. */
export function actionable(tasks: readonly Task[]): Task[] {
  const byId = indexById(tasks);
  return tasks.filter((task) => isOpen(task) && !hasOpenDependency(task, byId));
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
      !hasOpenDependency(task, byId, doneId),
  );
}

/**
 * The dependency graph on integer indices (compressed sparse rows): `tasks[i]` depends on
 * `targets[offsets[i] .. offsets[i + 1])`, distinct and in declaration order. Tasks are the
 * first occurrence of each id, in input order; dangling ids are dropped. Integer arrays keep
 * graph walks over 100k tasks free of Map lookups and per-node allocations.
 */
interface IndexedGraph {
  tasks: Task[];
  offsets: Int32Array;
  targets: Int32Array;
}

function indexGraph(input: readonly Task[]): IndexedGraph {
  // First occurrence of each id wins, as in `indexById`.
  const tasks: Task[] = [];
  const position = new Map<Id, number>();
  for (const task of input) {
    if (position.has(task.id)) continue;
    position.set(task.id, tasks.length);
    tasks.push(task);
  }
  const offsets = new Int32Array(tasks.length + 1);
  const targets: number[] = [];
  // seen[j] === i + 1 when task i already lists j (dedupe without a Set per task).
  const seen = new Int32Array(tasks.length);
  for (let i = 0; i < tasks.length; i++) {
    for (const id of (tasks[i] as Task).dependsOn) {
      const j = position.get(id);
      if (j === undefined || seen[j] === i + 1) continue;
      seen[j] = i + 1;
      targets.push(j);
    }
    offsets[i + 1] = targets.length;
  }
  return { tasks, offsets, targets: Int32Array.from(targets) };
}

/**
 * Orders tasks so every task comes after the tasks it depends on; independent tasks keep
 * their input order. Best effort on cyclic data: the edge closing a cycle is ignored, so
 * every task is still returned exactly once — use `detectCycles` to report the problem.
 */
export function topoOrder(tasks: readonly Task[]): Task[] {
  const { tasks: nodes, offsets, targets } = indexGraph(tasks);
  const n = nodes.length;
  // 0 = unvisited, 1 = visiting, 2 = done. Iterative DFS: no recursion depth limit.
  const state = new Uint8Array(n);
  const stackNode = new Int32Array(n);
  const stackNext = new Int32Array(n);
  const out: Task[] = [];

  for (let root = 0; root < n; root++) {
    if (state[root] !== 0) continue;
    state[root] = 1;
    let top = 0;
    stackNode[0] = root;
    stackNext[0] = offsets[root] as number;
    while (top >= 0) {
      const node = stackNode[top] as number;
      const next = stackNext[top] as number;
      if (next < (offsets[node + 1] as number)) {
        stackNext[top] = next + 1;
        const dep = targets[next] as number;
        if (state[dep] === 0) {
          state[dep] = 1;
          top++;
          stackNode[top] = dep;
          stackNext[top] = offsets[dep] as number;
        }
        continue;
      }
      top--;
      state[node] = 2;
      out.push(nodes[node] as Task);
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
  const { tasks: nodes, offsets, targets } = indexGraph(tasks);
  const n = nodes.length;

  // Iterative Tarjan on indices: no recursion, so long dependency chains cannot overflow.
  const index = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const onStack = new Uint8Array(n);
  const stack = new Int32Array(n);
  let stackSize = 0;
  const workNode = new Int32Array(n);
  const workNext = new Int32Array(n);
  const groups: number[][] = [];
  let counter = 0;
  let top = -1;

  const visit = (v: number): void => {
    index[v] = counter;
    low[v] = counter;
    counter++;
    stack[stackSize++] = v;
    onStack[v] = 1;
    top++;
    workNode[top] = v;
    workNext[top] = offsets[v] as number;
  };

  for (let root = 0; root < n; root++) {
    if (index[root] !== -1) continue;
    visit(root);
    while (top >= 0) {
      const v = workNode[top] as number;
      const next = workNext[top] as number;
      if (next < (offsets[v + 1] as number)) {
        workNext[top] = next + 1;
        const dep = targets[next] as number;
        if (index[dep] === -1) visit(dep);
        else if (onStack[dep] === 1) low[v] = Math.min(low[v] as number, index[dep] as number);
        continue;
      }
      top--;
      if (top >= 0) {
        const parent = workNode[top] as number;
        low[parent] = Math.min(low[parent] as number, low[v] as number);
      }
      if (low[v] !== index[v]) continue;

      const group: number[] = [];
      let member: number;
      do {
        member = stack[--stackSize] as number;
        onStack[member] = 0;
        group.push(member);
      } while (member !== v);
      if (group.length > 1 || hasSelfLoop(v, offsets, targets)) groups.push(group);
    }
  }

  for (const group of groups) group.sort((a, b) => a - b);
  groups.sort((a, b) => (a[0] as number) - (b[0] as number));
  return groups.map((group) => group.map((i) => (nodes[i] as Task).id));
}

function hasSelfLoop(v: number, offsets: Int32Array, targets: Int32Array): boolean {
  for (let k = offsets[v] as number; k < (offsets[v + 1] as number); k++) {
    if (targets[k] === v) return true;
  }
  return false;
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
