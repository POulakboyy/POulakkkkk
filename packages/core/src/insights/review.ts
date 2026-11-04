/**
 * Automated weekly review (feature 7.9): wins, recurring blockers, slipped tasks, planning
 * accuracy and a few gentle, data-driven suggestions. Everything is computed locally.
 *
 * - Wins are completed tasks and `win` journal entries of the week. The list is ordered by
 *   increasing significance so that it ends on the strongest one: retrospective judgements
 *   weigh the peak and the end of an experience heavily (Kahneman, Fredrickson, Schreiber &
 *   Redelmeier, 1993, Psychological Science).
 * - Blockers cluster `friction` journal entries of the look-back window by shared tags and
 *   keywords (single-link clustering on a weighted Jaccard similarity); a cluster is
 *   "recurring" once it holds `minOccurrences` entries and at least one falls in the week.
 * - Slipped tasks: a deadline in the week that passed before completion, or a slot scheduled
 *   in the week that ended without the task being done. Dropped tasks are not slips.
 * - Planning accuracy compares logged focus time to estimates (median ratio — robust to the
 *   long tail of overruns) and counts how many scheduled tasks got done.
 * Suggestions are machine-readable (`kind` + numbers) so the UI words them in the user's
 * language; they are only emitted when the data clearly supports them.
 */
import type { CalendarEvent, Id, JournalEntry, Task, TimeZone, Timestamp } from '../model.ts';
import { addDays } from '../time.ts';
import { balance, type BalanceTotals } from './balance.ts';
import {
  assertFiniteTimestamp,
  completedAt,
  focusMinutes,
  isCompleted,
  isDropped,
  median,
  WEEK,
} from './internal.ts';
import { termWeights, weightedJaccard } from './text.ts';

export interface WeeklyReviewInput {
  tasks: readonly Task[];
  events: readonly CalendarEvent[];
  journal: readonly JournalEntry[];
  /** Start of the reviewed week (local midnight in `timeZone`, e.g. from `startOfWeek`). */
  weekStart: Timestamp;
  timeZone: TimeZone;
  /** Moment of the review; deadlines after it are not slips yet (default: end of the week). */
  now?: Timestamp;
  /** Weeks of journal history scanned for recurring blockers, this week included (default 4). */
  lookbackWeeks?: number;
  /** Entries needed for a blocker to be recurring (default 2). */
  minOccurrences?: number;
  /** Similarity from which two friction entries belong together, 0..1 (default 0.25). */
  similarity?: number;
  /** Maximum number of wins kept (default 10). */
  maxWins?: number;
}

export interface Win {
  kind: 'task' | 'journal';
  id: Id;
  title: string;
  at: Timestamp;
  /** Relative significance used for ordering (higher = bigger win). */
  score: number;
}

export interface Blocker {
  /** Up to three most representative terms, most weighty first. */
  terms: string[];
  /** Ids of the friction entries in the cluster, oldest first. */
  entryIds: Id[];
  count: number;
  /** Entries of the cluster written during the reviewed week. */
  thisWeek: number;
  firstAt: Timestamp;
  lastAt: Timestamp;
}

export interface SlippedTask {
  id: Id;
  title: string;
  reason: 'deadline-missed' | 'not-done-as-scheduled';
  /** The deadline, or the end of the scheduled slot. */
  due: Timestamp;
  /** Completion instant when the task was eventually done late. */
  completedAt?: Timestamp;
  postponedCount: number;
}

export interface PlanningAccuracy {
  /** Logged vs. estimated time of tasks completed this week with both values. */
  estimates: {
    samples: number;
    /** Median of `actual / estimate` (1 = spot on, 1.5 = 50 % longer than planned). */
    medianRatio: number;
    /** Share of tasks within ±25 % of their estimate. */
    withinQuarter: number;
  } | null;
  /** Tasks with a slot scheduled in the week, and how many of those got done in the week. */
  scheduled: { planned: number; done: number; rate: number } | null;
}

export type Suggestion =
  | { kind: 'pad-estimates'; factor: number }
  | { kind: 'trim-estimates'; factor: number }
  | { kind: 'lighten-plan'; rate: number }
  | { kind: 'address-blocker'; terms: string[]; count: number }
  | { kind: 'protect-creation'; share: number }
  | { kind: 'reschedule-slipped'; count: number };

export interface WeeklyReview {
  week: { start: Timestamp; end: Timestamp };
  /** Ascending significance: the last win is the biggest. */
  wins: Win[];
  blockers: Blocker[];
  slipped: SlippedTask[];
  planning: PlanningAccuracy;
  suggestions: Suggestion[];
  stats: BalanceTotals & { completed: number; focusMinutes: number };
}

const MIN_ESTIMATE_SAMPLES = 3;
const MIN_PLANNED = 5;
const MAX_SUGGESTIONS = 3;

function resolve(input: WeeklyReviewInput) {
  assertFiniteTimestamp(input.weekStart, 'weekStart');
  const end = addDays(input.weekStart, 7, input.timeZone);
  const now = input.now ?? end;
  assertFiniteTimestamp(now, 'now');
  const lookbackWeeks = input.lookbackWeeks ?? 4;
  if (!Number.isInteger(lookbackWeeks) || lookbackWeeks < 1) {
    throw new RangeError('lookbackWeeks must be an integer >= 1');
  }
  const minOccurrences = input.minOccurrences ?? 2;
  if (!Number.isInteger(minOccurrences) || minOccurrences < 1) {
    throw new RangeError('minOccurrences must be an integer >= 1');
  }
  const similarity = input.similarity ?? 0.25;
  if (!(similarity > 0 && similarity <= 1)) throw new RangeError('similarity must be in (0, 1]');
  const maxWins = input.maxWins ?? 10;
  if (!Number.isInteger(maxWins) || maxWins < 0) throw new RangeError('maxWins must be >= 0');
  return { start: input.weekStart, end, now, lookbackWeeks, minOccurrences, similarity, maxWins };
}

function inRange(t: Timestamp | undefined, start: Timestamp, end: Timestamp): t is Timestamp {
  return t !== undefined && t >= start && t < end;
}

/** Significance of a completed task: base 1, priority, importance, and invested focus hours. */
function taskScore(task: Task): number {
  const hours = focusMinutes(task) / 60;
  return 1 + task.priority + (task.important ? 1 : 0) + Math.log2(1 + hours);
}

function collectWins(input: WeeklyReviewInput, start: number, end: number, maxWins: number) {
  const wins: Win[] = [];
  for (const task of input.tasks) {
    const at = completedAt(task);
    if (!inRange(at, start, end)) continue;
    wins.push({ kind: 'task', id: task.id, title: task.title, at, score: taskScore(task) });
  }
  for (const entry of input.journal) {
    if (entry.kind !== 'win' || !inRange(entry.createdAt, start, end)) continue;
    // A win the user bothered to write down is worth a medium-priority task.
    wins.push({ kind: 'journal', id: entry.id, title: entry.text, at: entry.createdAt, score: 3 });
  }
  const byStrength = (a: Win, b: Win) =>
    b.score - a.score || b.at - a.at || a.id.localeCompare(b.id);
  return wins.sort(byStrength).slice(0, maxWins).reverse();
}

/** Single-link clusters of friction entries (union–find over similar pairs). */
function clusterBlockers(
  entries: readonly JournalEntry[],
  weekStart: number,
  weekEnd: number,
  similarity: number,
  minOccurrences: number,
): Blocker[] {
  const terms = entries.map((e) => termWeights(e.text, e.tags));
  const parent = entries.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i] as number] as number;
      i = parent[i] as number;
    }
    return i;
  };
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = terms[i] as Map<string, number>;
      const b = terms[j] as Map<string, number>;
      if (weightedJaccard(a, b) >= similarity) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, number[]>();
  entries.forEach((_, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), i]);
  });

  const blockers: Blocker[] = [];
  for (const members of groups.values()) {
    if (members.length < minOccurrences) continue;
    const list = members.map((i) => entries[i] as JournalEntry);
    const thisWeek = list.filter((e) => inRange(e.createdAt, weekStart, weekEnd)).length;
    if (thisWeek === 0) continue;
    list.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    blockers.push({
      terms: topTerms(members.map((i) => terms[i] as Map<string, number>)),
      entryIds: list.map((e) => e.id),
      count: list.length,
      thisWeek,
      firstAt: (list[0] as JournalEntry).createdAt,
      lastAt: (list[list.length - 1] as JournalEntry).createdAt,
    });
  }
  return blockers.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}

/** Terms ranked by how many entries share them, then by total weight, then alphabetically. */
function topTerms(sets: readonly Map<string, number>[]): string[] {
  const stats = new Map<string, { n: number; w: number }>();
  for (const set of sets) {
    for (const [term, w] of set) {
      const s = stats.get(term) ?? { n: 0, w: 0 };
      s.n++;
      s.w += w;
      stats.set(term, s);
    }
  }
  return [...stats]
    .sort(([ta, a], [tb, b]) => b.n - a.n || b.w - a.w || ta.localeCompare(tb))
    .slice(0, 3)
    .map(([term]) => term);
}

function collectSlipped(tasks: readonly Task[], start: number, end: number, now: number) {
  const out: SlippedTask[] = [];
  const horizon = Math.min(end, now);
  for (const task of tasks) {
    if (isDropped(task)) continue;
    const done = completedAt(task);
    const base = { id: task.id, title: task.title, postponedCount: task.postponedCount };
    const late = (due: number) => done === undefined || done > due;
    const withDone = done === undefined ? {} : { completedAt: done };
    if (task.deadline !== undefined && inRange(task.deadline, start, horizon)) {
      if (late(task.deadline)) {
        out.push({ ...base, reason: 'deadline-missed', due: task.deadline, ...withDone });
      }
      continue;
    }
    const slot = task.scheduled;
    // Done later within the same week still counts: the plan held, only the hour moved.
    const doneByWeekEnd = done !== undefined && done < end;
    if (slot && slot.end > start && slot.end <= horizon && !doneByWeekEnd) {
      out.push({ ...base, reason: 'not-done-as-scheduled', due: slot.end, ...withDone });
    }
  }
  return out.sort((a, b) => a.due - b.due || a.id.localeCompare(b.id));
}

function planningAccuracy(tasks: readonly Task[], start: number, end: number): PlanningAccuracy {
  const ratios: number[] = [];
  let planned = 0;
  let done = 0;
  for (const task of tasks) {
    const at = completedAt(task);
    if (inRange(at, start, end) && task.estimateMin !== undefined && task.estimateMin > 0) {
      const actual = focusMinutes(task);
      if (actual > 0) ratios.push(actual / task.estimateMin);
    }
    const slot = task.scheduled;
    if (slot && slot.start >= start && slot.start < end && !isDropped(task)) {
      planned++;
      if (inRange(at, start, end)) done++;
    }
  }
  return {
    estimates:
      ratios.length === 0
        ? null
        : {
            samples: ratios.length,
            medianRatio: median(ratios),
            withinQuarter: ratios.filter((r) => r >= 0.75 && r <= 1.25).length / ratios.length,
          },
    scheduled: planned === 0 ? null : { planned, done, rate: done / planned },
  };
}

function suggest(
  planning: PlanningAccuracy,
  blockers: readonly Blocker[],
  slipped: readonly SlippedTask[],
  totals: BalanceTotals,
): Suggestion[] {
  const out: Suggestion[] = [];
  const top = blockers[0];
  if (top) out.push({ kind: 'address-blocker', terms: top.terms, count: top.count });
  const est = planning.estimates;
  if (est && est.samples >= MIN_ESTIMATE_SAMPLES) {
    const factor = Math.round(est.medianRatio * 10) / 10;
    if (est.medianRatio >= 1.25) out.push({ kind: 'pad-estimates', factor });
    else if (est.medianRatio <= 0.75) out.push({ kind: 'trim-estimates', factor });
  }
  const sched = planning.scheduled;
  if (sched && sched.planned >= MIN_PLANNED && sched.rate < 0.6) {
    out.push({ kind: 'lighten-plan', rate: sched.rate });
  }
  // At least two tracked hours before commenting on the creation share.
  if (totals.ratio !== null && totals.total >= 120 && totals.ratio < 0.2) {
    out.push({ kind: 'protect-creation', share: totals.ratio });
  }
  const pending = slipped.filter((s) => s.completedAt === undefined).length;
  if (pending > 0) out.push({ kind: 'reschedule-slipped', count: pending });
  return out.slice(0, MAX_SUGGESTIONS);
}

/** Weekly review of the week starting at `weekStart`. */
export function weeklyReview(input: WeeklyReviewInput): WeeklyReview {
  const o = resolve(input);
  const { start, end } = o;

  const wins = collectWins(input, start, end, o.maxWins);
  const lookbackStart = Math.min(start, end - o.lookbackWeeks * WEEK);
  const friction = input.journal.filter(
    (e) => e.kind === 'friction' && inRange(e.createdAt, lookbackStart, end),
  );
  const blockers = clusterBlockers(friction, start, end, o.similarity, o.minOccurrences);
  const slipped = collectSlipped(input.tasks, start, end, o.now);
  const planning = planningAccuracy(input.tasks, start, end);
  const bal = balance({
    tasks: input.tasks,
    events: input.events,
    range: { start, end },
    timeZone: input.timeZone,
  });
  const totals: BalanceTotals = {
    create: bal.create,
    organize: bal.organize,
    meetings: bal.meetings,
    total: bal.total,
    ratio: bal.ratio,
  };
  let completed = 0;
  for (const task of input.tasks) {
    if (isCompleted(task) && inRange(completedAt(task), start, end)) completed++;
  }

  return {
    week: { start, end },
    wins,
    blockers,
    slipped,
    planning,
    suggestions: suggest(planning, blockers, slipped, totals),
    // Balance minutes are de-duplicated, so overlapping logs are not counted twice.
    stats: { ...totals, completed, focusMinutes: bal.create + bal.organize },
  };
}
