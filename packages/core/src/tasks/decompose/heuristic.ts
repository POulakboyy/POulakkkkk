/**
 * Offline goal decomposition (2.2): picks a domain template from keywords, else a plan from
 * the goal's leading verb, else a generic plan, and turns its steps into sequential drafts.
 */
import type { Locale } from '../../model.ts';
import { foldText } from '../common.ts';
import { cleanTitle, sanitizeDrafts, scaleToBudget } from './drafts.ts';
import { GENERIC_STEPS, GOAL_TEMPLATES, VERB_CLASSES } from './templates.ts';
import type { Step } from './templates.ts';
import { DEFAULT_MAX_SUBTASKS } from './types.ts';
import type { DecomposeContext, Decomposer, SubtaskDraft } from './types.ts';

export type PlanSource =
  { kind: 'template'; id: string } | { kind: 'verb'; id: string } | { kind: 'generic' };

export interface Plan {
  source: PlanSource;
  steps: readonly Step[];
}

/** Words skipped before reading the leading verb: « Je dois rédiger… », "I need to write…". */
const FILLER_WORDS: ReadonlySet<string> = new Set([
  'je',
  'j',
  'tu',
  'on',
  'nous',
  'il',
  'faut',
  'dois',
  'doit',
  'devons',
  'veux',
  'voudrais',
  'aimerais',
  'vais',
  'va',
  'besoin',
  'de',
  'd',
  'i',
  'we',
  'need',
  'must',
  'want',
  'should',
  'have',
  'has',
  'to',
  'will',
  'let',
  's',
  'please',
]);

/** Chooses the plan for `goal`: best-scoring template, then verb class, then generic. */
export function choosePlan(goal: string): Plan {
  const folded = foldText(goal);
  const template = bestTemplate(folded);
  if (template) return { source: { kind: 'template', id: template.id }, steps: template.steps };
  const verb = leadingVerbClass(folded);
  if (verb) return { source: { kind: 'verb', id: verb.id }, steps: verb.steps };
  return { source: { kind: 'generic' }, steps: GENERIC_STEPS };
}

/** Template matching the most patterns; ties go to the earlier template. */
function bestTemplate(folded: string): (typeof GOAL_TEMPLATES)[number] | undefined {
  let best: (typeof GOAL_TEMPLATES)[number] | undefined;
  let bestScore = 0;
  for (const template of GOAL_TEMPLATES) {
    const score = template.patterns.filter((re) => re.test(folded)).length;
    if (score > bestScore) {
      best = template;
      bestScore = score;
    }
  }
  return best;
}

function leadingVerbClass(folded: string): (typeof VERB_CLASSES)[number] | undefined {
  const words = folded.split(/[^\p{L}\p{N}]+/u).filter((w) => w !== '');
  const verb = words.find((w) => !FILLER_WORDS.has(w));
  if (verb === undefined) return undefined;
  return VERB_CLASSES.find((c) => c.stems.some((stem) => stemMatches(stem, verb)));
}

function stemMatches(stem: string, word: string): boolean {
  return stem.endsWith('$') ? word === stem.slice(0, -1) : word.startsWith(stem);
}

/** Drafts of a plan, each step depending on the previous one. */
export function stepsToDrafts(
  steps: readonly Step[],
  goal: string,
  locale: Locale,
): SubtaskDraft[] {
  const goalText = cleanTitle(goal);
  return steps.map(([fr, en, min, mode, energy], i) => {
    const template = locale === 'fr' ? fr : en;
    const draft: SubtaskDraft = {
      title: cleanTitle(template.replaceAll('{goal}', goalText)),
      estimateMin: min,
      mode,
      dependsOn: i === 0 ? [] : [i - 1],
    };
    if (energy !== undefined) draft.energy = energy;
    return draft;
  });
}

/** Synchronous core of the heuristic decomposer. */
export function decomposeOffline(goal: string, ctx: DecomposeContext): SubtaskDraft[] {
  const max = ctx.maxSubtasks ?? DEFAULT_MAX_SUBTASKS;
  const limit = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : DEFAULT_MAX_SUBTASKS;
  const drafts = stepsToDrafts(choosePlan(goal).steps, goal, ctx.locale).slice(0, limit);
  return ctx.budgetMin === undefined ? drafts : scaleToBudget(drafts, ctx.budgetMin);
}

/** Offline, deterministic decomposer: works without network nor AI provider. */
export const heuristicDecomposer: Decomposer = {
  id: 'heuristic',
  decompose: (goal, ctx) => Promise.resolve(decomposeOffline(goal, ctx)),
};

/**
 * Asks `primary` (typically an AI provider), validates its untrusted output and falls back
 * to `fallback` when it fails, times out at the provider level, or yields nothing usable.
 */
export function withFallback(
  primary: Decomposer,
  fallback: Decomposer = heuristicDecomposer,
): Decomposer {
  return {
    id: `${primary.id}+${fallback.id}`,
    async decompose(goal, ctx) {
      try {
        const drafts = sanitizeProviderOutput(await primary.decompose(goal, ctx), ctx);
        if (drafts.length > 0) return drafts;
      } catch {
        // A provider failure must never block the user: use the offline plan instead.
      }
      return fallback.decompose(goal, ctx);
    },
  };
}

function sanitizeProviderOutput(raw: unknown, ctx: DecomposeContext): SubtaskDraft[] {
  const opts = ctx.maxSubtasks === undefined ? {} : { maxSubtasks: ctx.maxSubtasks };
  const drafts = sanitizeDrafts(raw, opts);
  return ctx.budgetMin === undefined ? drafts : scaleToBudget(drafts, ctx.budgetMin);
}
