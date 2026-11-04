import { describe, expect, it } from 'vitest';
import {
  GENERIC_STEPS,
  GOAL_TEMPLATES,
  MAX_ESTIMATE_MIN,
  MAX_TITLE_LENGTH,
  VERB_CLASSES,
  choosePlan,
  decomposeOffline,
  heuristicDecomposer,
  sanitizeDrafts,
  scaleToBudget,
  subtaskRecords,
  withFallback,
} from '../decompose/index.ts';
import type { Decomposer, SubtaskDraft } from '../decompose/index.ts';
import { detectCycles } from '../dependencies.ts';
import { task } from './fixtures.ts';

const sourceOf = (goal: string) => choosePlan(goal).source;

describe('choosePlan', () => {
  it.each([
    ['Lancer le MVP de mon appli', 'mvp'],
    ['Faire une vidéo YouTube sur le café', 'video'],
    ['Write a blog article about focus', 'article'],
    ['Lancement du produit', 'launch'],
    ['Préparer le déménagement', 'moving'],
    ['Organiser un événement pour les 10 ans', 'event'],
    ['Enregistrer un épisode de podcast', 'podcast'],
    ['Préparer la présentation du pitch', 'presentation'],
    ['Book the summer holiday trip', 'trip'],
  ])('%s → template %s', (goal, id) => {
    expect(sourceOf(goal)).toEqual({ kind: 'template', id });
  });

  it('is accent- and case-insensitive', () => {
    expect(sourceOf('VIDEO')).toEqual(sourceOf('vidéo'));
  });

  it('falls back to the leading verb, skipping filler words', () => {
    expect(sourceOf('Rédiger le rapport annuel')).toEqual({ kind: 'verb', id: 'write' });
    expect(sourceOf('Je dois réparer le vélo')).toEqual({ kind: 'verb', id: 'fix' });
    expect(sourceOf('I need to learn Spanish')).toEqual({ kind: 'verb', id: 'learn' });
    expect(sourceOf('Sort the garage')).toEqual({ kind: 'verb', id: 'tidy' });
    expect(sourceOf('Sortir le chien')).toEqual({ kind: 'generic' });
  });

  it('uses the generic plan otherwise', () => {
    expect(choosePlan('Jardin').steps).toBe(GENERIC_STEPS);
    expect(sourceOf('')).toEqual({ kind: 'generic' });
  });
});

describe('templates', () => {
  const plans = [
    ...GOAL_TEMPLATES.map((t) => t.steps),
    ...VERB_CLASSES.map((c) => c.steps),
    GENERIC_STEPS,
  ];

  it('have unique ids and well-formed bilingual steps', () => {
    const allIds = [...GOAL_TEMPLATES, ...VERB_CLASSES].map((t) => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const steps of plans) {
      expect(steps.length).toBeGreaterThanOrEqual(3);
      for (const [fr, en, min, mode] of steps) {
        expect(fr.trim()).not.toBe('');
        expect(en.trim()).not.toBe('');
        expect(min).toBeGreaterThan(0);
        expect(min).toBeLessThanOrEqual(MAX_ESTIMATE_MIN);
        expect(['create', 'organize']).toContain(mode);
      }
    }
  });
});

describe('decomposeOffline', () => {
  it('produces ordered drafts with estimates and sequential dependencies', () => {
    const drafts = decomposeOffline('Faire une vidéo YouTube', { locale: 'fr' });
    expect(drafts[0]).toMatchObject({ title: 'Choisir le sujet et l’angle', dependsOn: [] });
    drafts.forEach((d, i) => {
      expect(d.dependsOn).toEqual(i === 0 ? [] : [i - 1]);
      expect(d.estimateMin).toBeGreaterThan(0);
    });
  });

  it('writes titles in the requested locale and injects the goal in generic plans', () => {
    expect(decomposeOffline('YouTube video', { locale: 'en' })[0]?.title).toBe(
      'Pick the topic and angle',
    );
    const generic = decomposeOffline('  Jardin\npotager ', { locale: 'fr' });
    expect(generic.map((d) => d.title)).toContain('Avancer sur : Jardin potager');
  });

  it('honours maxSubtasks and the budget', () => {
    expect(decomposeOffline('MVP', { locale: 'fr', maxSubtasks: 3 })).toHaveLength(3);
    expect(decomposeOffline('MVP', { locale: 'fr', maxSubtasks: -1 })).toEqual([]);
    const budgeted = decomposeOffline('MVP', { locale: 'fr', budgetMin: 600 });
    const total = budgeted.reduce((s, d) => s + (d.estimateMin ?? 0), 0);
    expect(Math.abs(total - 600)).toBeLessThanOrEqual(5 * budgeted.length);
    for (const d of budgeted) expect((d.estimateMin ?? 0) % 5).toBe(0);
  });

  it('is exposed as an async Decomposer', async () => {
    expect(heuristicDecomposer.id).toBe('heuristic');
    await expect(heuristicDecomposer.decompose('MVP', { locale: 'en' })).resolves.toEqual(
      decomposeOffline('MVP', { locale: 'en' }),
    );
  });
});

describe('sanitizeDrafts', () => {
  it('returns [] for non-arrays', () => {
    expect(sanitizeDrafts(null)).toEqual([]);
    expect(sanitizeDrafts({ title: 'x' })).toEqual([]);
  });

  it('cleans untrusted provider output', () => {
    const drafts = sanitizeDrafts([
      { title: '  First\n\tstep ', estimateMin: 12.6, mode: 'create', energy: 'high' },
      { title: '' },
      'garbage',
      { title: 'Second', estimateMin: -3, mode: 'bogus', dependsOn: [0, 1, 0, 5, 'x', 1.5] },
      { title: 'x'.repeat(500), estimateMin: 1e9, energy: 'extreme', dependsOn: [3, 3] },
    ]);
    expect(drafts).toEqual([
      { title: 'First step', estimateMin: 13, mode: 'create', energy: 'high', dependsOn: [] },
      { title: 'Second', mode: 'organize', dependsOn: [0] },
      {
        title: 'x'.repeat(MAX_TITLE_LENGTH),
        estimateMin: MAX_ESTIMATE_MIN,
        mode: 'organize',
        dependsOn: [1],
      },
    ]);
  });

  it('bounds the count and never produces cycles', () => {
    const raw = Array.from({ length: 50 }, (_, i) => ({
      title: `s${i}`,
      dependsOn: [i, i + 1, i - 1],
    }));
    const drafts = sanitizeDrafts(raw, { maxSubtasks: 10, fallbackMode: 'create' });
    expect(drafts).toHaveLength(10);
    expect(drafts.every((d, i) => d.dependsOn.every((dep) => dep < i))).toBe(true);
    expect(drafts[0]?.mode).toBe('create');
  });
});

describe('scaleToBudget', () => {
  const drafts: SubtaskDraft[] = [
    { title: 'a', estimateMin: 30, mode: 'create', dependsOn: [] },
    { title: 'b', estimateMin: 90, mode: 'create', dependsOn: [0] },
    { title: 'c', mode: 'create', dependsOn: [1] },
  ];

  it('scales proportionally to 5-minute steps, leaving unestimated drafts alone', () => {
    const scaled = scaleToBudget(drafts, 60);
    expect(scaled.map((d) => d.estimateMin)).toEqual([15, 45, undefined]);
    expect(scaled[1]?.dependsOn).not.toBe(drafts[1]?.dependsOn);
  });

  it('keeps at least 5 minutes and ignores invalid budgets', () => {
    expect(scaleToBudget(drafts, 1).map((d) => d.estimateMin)).toEqual([5, 5, undefined]);
    expect(scaleToBudget(drafts, 0).map((d) => d.estimateMin)).toEqual([30, 90, undefined]);
    expect(scaleToBudget(drafts, Number.NaN)[0]).not.toBe(drafts[0]);
  });
});

describe('subtaskRecords', () => {
  it('builds acyclic task records linked to the parent', () => {
    let n = 0;
    const parent = task('goal', { projectId: 'p', priority: 3 });
    const drafts = decomposeOffline('Article de blog', { locale: 'fr' });
    const records = subtaskRecords(drafts, { parent, createId: () => `id${n++}` });
    expect(records).toHaveLength(drafts.length);
    expect(records[0]).toMatchObject({
      id: 'id0',
      parentId: 'goal',
      projectId: 'p',
      status: 'todo',
      priority: 0,
    });
    expect(records[1]?.dependsOn).toEqual(['id0']);
    const asTasks = records.map((r) => ({ ...r, createdAt: 0, updatedAt: 0 }));
    expect(detectCycles(asTasks)).toEqual([]);
  });

  it('drops forward and out-of-range references', () => {
    const records = subtaskRecords(
      [
        { title: 'a', mode: 'create', dependsOn: [0, 1] },
        { title: 'b', mode: 'create', dependsOn: [0, -1, 0.5] },
      ],
      {
        createId: (() => {
          let i = 0;
          return () => `t${i++}`;
        })(),
      },
    );
    expect(records.map((r) => r.dependsOn)).toEqual([[], ['t0']]);
    expect(records[0]).not.toHaveProperty('parentId');
  });
});

describe('withFallback', () => {
  const ctx = { locale: 'en' as const };
  const provider = (impl: Decomposer['decompose']): Decomposer => ({ id: 'ai', decompose: impl });

  it('uses sanitized provider output when usable', async () => {
    const d = withFallback(
      provider(async () => [{ title: ' Plan ', mode: 'create', dependsOn: [] }] as never),
    );
    expect(d.id).toBe('ai+heuristic');
    await expect(d.decompose('x', ctx)).resolves.toEqual([
      { title: 'Plan', mode: 'create', dependsOn: [] },
    ]);
  });

  it('falls back when the provider throws or returns nothing usable', async () => {
    const offline = decomposeOffline('MVP', ctx);
    await expect(
      withFallback(provider(() => Promise.reject(new Error('offline')))).decompose('MVP', ctx),
    ).resolves.toEqual(offline);
    await expect(withFallback(provider(async () => [])).decompose('MVP', ctx)).resolves.toEqual(
      offline,
    );
    await expect(
      withFallback(provider(async () => 'nope' as never)).decompose('MVP', ctx),
    ).resolves.toEqual(offline);
  });

  it('applies the budget to provider output', async () => {
    const d = withFallback(
      provider(async () => [
        { title: 'a', estimateMin: 10, mode: 'create', dependsOn: [] },
        { title: 'b', estimateMin: 30, mode: 'create', dependsOn: [0] },
      ]),
    );
    const out = await d.decompose('x', { ...ctx, budgetMin: 80 });
    expect(out.map((s) => s.estimateMin)).toEqual([20, 60]);
  });
});
