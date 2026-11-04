/**
 * Personal skill tree (feature 7.5): a weighted hierarchy grown from completed work.
 *
 * - Each tag of a completed task is a skill path: `design/typography` (or `design:typography`)
 *   nests `typography` under `design`. A task feeds every node on each of its paths once,
 *   even when several of its tags share an ancestor.
 * - A completed task without tags feeds its project branch (`project:<id>`, labelled with
 *   `projectNames` when given); a task with neither only counts at the root.
 * - `weight` is the number of completed tasks (default) or of focus minutes behind a node;
 *   `level` grows logarithmically with the task count (`⌊log2(1 + tasks)⌋`), so each new
 *   level of a branch takes about twice the work of the previous one.
 */
import type { Id, Task, Timestamp } from '../model.ts';
import { completedAt, focusMinutes, isCompleted } from './internal.ts';
import { normalizeTag } from './text.ts';

export interface SkillTreeOptions {
  /** What `weight` measures (default `'tasks'`). */
  weightBy?: 'tasks' | 'minutes';
  /** Display names of projects, by id. */
  projectNames?: Readonly<{ [id: Id]: string }>;
}

export interface SkillNode {
  /** Stable path id: `''` for the root, `design/typography`, `project:<id>`. */
  id: string;
  /** Display label: the tag segment as first written by the user, or the project name. */
  label: string;
  kind: 'root' | 'skill' | 'project';
  depth: number;
  /** Completed tasks under this node. */
  tasks: number;
  /** Focus minutes logged on those tasks. */
  minutes: number;
  /** `tasks` or `minutes`, per `weightBy`. */
  weight: number;
  /** `weight / root.weight` (0..1), 0 when the root is empty. */
  share: number;
  level: number;
  /** Distinct projects that contributed. */
  projects: number;
  /** Latest completion under this node, `null` when unknown. */
  lastCompletedAt: Timestamp | null;
  /** Heaviest first, then alphabetical. */
  children: SkillNode[];
}

interface Builder {
  id: string;
  label: string;
  kind: SkillNode['kind'];
  depth: number;
  tasks: number;
  minutes: number;
  projects: Set<Id>;
  last: Timestamp | null;
  children: Map<string, Builder>;
}

function builder(id: string, label: string, kind: SkillNode['kind'], depth: number): Builder {
  return {
    id,
    label,
    kind,
    depth,
    tasks: 0,
    minutes: 0,
    projects: new Set(),
    last: null,
    children: new Map(),
  };
}

/** `[key, label]` segments of a tag path; empty segments are dropped. */
function segments(tag: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const raw of tag.trim().replace(/^#+/, '').split(/[/:]/)) {
    const label = raw.trim().replace(/\s+/g, ' ');
    const key = normalizeTag(label);
    if (key) out.push([key, label]);
  }
  return out;
}

function credit(node: Builder, task: Task, minutes: number, at: Timestamp | undefined): void {
  node.tasks++;
  node.minutes += minutes;
  if (task.projectId !== undefined) node.projects.add(task.projectId);
  if (at !== undefined && (node.last === null || at > node.last)) node.last = at;
}

function finish(b: Builder, weightBy: 'tasks' | 'minutes', total: number): SkillNode {
  const weight = weightBy === 'tasks' ? b.tasks : b.minutes;
  const children = [...b.children.values()]
    .map((c) => finish(c, weightBy, total))
    .sort(
      (x, y) => y.weight - x.weight || x.label.localeCompare(y.label) || x.id.localeCompare(y.id),
    );
  return {
    id: b.id,
    label: b.label,
    kind: b.kind,
    depth: b.depth,
    tasks: b.tasks,
    minutes: b.minutes,
    weight,
    share: total > 0 ? weight / total : 0,
    level: Math.floor(Math.log2(1 + b.tasks)),
    projects: b.projects.size,
    lastCompletedAt: b.last,
    children,
  };
}

/** Builds the skill tree of the completed tasks among `tasks`. */
export function skillTree(tasks: readonly Task[], options: SkillTreeOptions = {}): SkillNode {
  const weightBy = options.weightBy ?? 'tasks';
  const root = builder('', '', 'root', 0);

  for (const task of tasks) {
    if (!isCompleted(task)) continue;
    const minutes = focusMinutes(task);
    const at = completedAt(task);
    credit(root, task, minutes, at);

    const touched = new Set<Builder>();
    for (const tag of task.tags) {
      let node = root;
      for (const [key, label] of segments(tag)) {
        const id = node === root ? key : `${node.id}/${key}`;
        let child = node.children.get(key);
        if (!child) {
          child = builder(id, label, 'skill', node.depth + 1);
          node.children.set(key, child);
        }
        touched.add(child);
        node = child;
      }
    }
    if (touched.size === 0 && task.projectId !== undefined) {
      const key = `project:${task.projectId}`;
      let child = root.children.get(key);
      if (!child) {
        const label = options.projectNames?.[task.projectId] ?? task.projectId;
        child = builder(key, label, 'project', 1);
        root.children.set(key, child);
      }
      touched.add(child);
    }
    for (const node of touched) credit(node, task, minutes, at);
  }

  const total = weightBy === 'tasks' ? root.tasks : root.minutes;
  return finish(root, weightBy, total);
}

/** Depth-first list of every node of a tree (root first), handy for search and tests. */
export function flattenSkills(tree: SkillNode): SkillNode[] {
  const out: SkillNode[] = [tree];
  for (const child of tree.children) out.push(...flattenSkills(child));
  return out;
}
