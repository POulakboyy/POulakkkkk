import { describe, expect, it } from 'vitest';
import {
  addIdea,
  currentStep,
  finishSession,
  getMethod,
  goToStep,
  isOverdue,
  METHODS,
  nextStep,
  pauseSession,
  previousStep,
  resumeSession,
  SCAMPER,
  sessionProgress,
  SIX_HATS,
  startSession,
  stepElapsed,
  stepRemaining,
  summarizeSession,
} from './methods.ts';

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 4, 9);

describe('method cards', () => {
  it('SCAMPER has the seven steps in order', () => {
    expect(SCAMPER.steps.map((s) => s.letter).join('')).toBe('SCAMPER');
  });

  it('Six Hats covers every hat and opens/closes with blue', () => {
    const hats = SIX_HATS.steps.map((s) => s.hat);
    expect(new Set(hats)).toEqual(new Set(['white', 'red', 'black', 'yellow', 'green', 'blue']));
    expect(hats[0]).toBe('blue');
    expect(hats[hats.length - 1]).toBe('blue');
  });

  it('every step is complete in FR and EN with unique ids', () => {
    for (const card of METHODS) {
      expect(getMethod(card.id)).toBe(card);
      expect(card.source).not.toBe('');
      expect(new Set(card.steps.map((s) => s.id)).size).toBe(card.steps.length);
      for (const s of card.steps) {
        expect(s.minutes).toBeGreaterThan(0);
        for (const locale of ['fr', 'en'] as const) {
          expect(s.title[locale]).not.toBe('');
          expect(s.prompt[locale]).not.toBe('');
          expect(s.questions[locale].length).toBeGreaterThan(0);
        }
        expect(s.questions.fr.length).toBe(s.questions.en.length);
      }
    }
  });
});

describe('method session machine', () => {
  it('starts on the first step with default or overridden timeboxes', () => {
    const s = startSession('scamper', T0, { minutes: { combine: 10, adapt: -3 } });
    expect(s.status).toBe('running');
    expect(currentStep(s).id).toBe('substitute');
    expect(s.minutes[1]).toBe(10);
    expect(s.minutes[2]).toBe(0);
    expect(s.notes).toHaveLength(7);
    expect(sessionProgress(s)).toBe(0);
  });

  it('tracks elapsed and remaining time and flags overdue steps', () => {
    const s = startSession('scamper', T0);
    expect(stepRemaining(s, T0 + MIN)).toBe(3 * MIN);
    expect(isOverdue(s, T0 + 4 * MIN)).toBe(false);
    expect(isOverdue(s, T0 + 4 * MIN + 1)).toBe(true);
  });

  it('banks time per step across navigation', () => {
    let s = startSession('six-hats', T0);
    s = nextStep(s, T0 + 2 * MIN);
    expect(currentStep(s).hat).toBe('white');
    s = previousStep(s, T0 + 3 * MIN);
    expect(stepElapsed(s, T0 + 3 * MIN, 1)).toBe(MIN);
    expect(stepElapsed(s, T0 + 4 * MIN)).toBe(3 * MIN); // 2 banked + 1 running
    s = previousStep(s, T0 + 4 * MIN); // clamped at 0
    expect(s.stepIndex).toBe(0);
    s = goToStep(s, 3, T0 + 5 * MIN);
    expect(currentStep(s).hat).toBe('yellow');
    expect(sessionProgress(s)).toBeCloseTo(3 / 7);
    expect(goToStep(s, Number.NaN, T0 + 6 * MIN)).toBe(s); // invalid index is ignored
  });

  it('does not count paused time', () => {
    let s = startSession('scamper', T0);
    s = pauseSession(s, T0 + MIN);
    expect(s.status).toBe('paused');
    expect(stepElapsed(s, T0 + 10 * MIN)).toBe(MIN);
    expect(pauseSession(s, T0 + 2 * MIN)).toBe(s);
    s = nextStep(s, T0 + 2 * MIN); // navigating while paused keeps the clock stopped
    expect(s.runningSince).toBeNull();
    expect(stepElapsed(s, T0 + 9 * MIN)).toBe(0);
    s = resumeSession(s, T0 + 10 * MIN);
    expect(stepElapsed(s, T0 + 11 * MIN)).toBe(MIN);
    expect(resumeSession(s, T0 + 12 * MIN)).toBe(s);
  });

  it('finishes past the last step and becomes inert', () => {
    let s = startSession('scamper', T0);
    for (let i = 0; i < 7; i++) s = nextStep(s, T0 + (i + 1) * MIN);
    expect(s.status).toBe('done');
    expect(s.finishedAt).toBe(T0 + 7 * MIN);
    expect(sessionProgress(s)).toBe(1);
    expect(isOverdue(s, T0 + 100 * MIN)).toBe(false);
    expect(nextStep(s, T0 + 8 * MIN)).toBe(s);
    expect(finishSession(s, T0 + 8 * MIN)).toBe(s);
    expect(s.spent.every((ms) => ms === MIN)).toBe(true);
  });

  it('can be finished early', () => {
    const s = finishSession(startSession('six-hats', T0), T0 + 30_000);
    expect(s.status).toBe('done');
    expect(s.spent[0]).toBe(30_000);
  });

  it('captures ideas per step and summarises them as Markdown', () => {
    let s = startSession('scamper', T0);
    s = addIdea(s, '  Bois au lieu du plastique ');
    s = addIdea(s, '   ');
    s = nextStep(s, T0 + MIN);
    s = addIdea(s, 'Lampe + enceinte');
    expect(s.notes[0]).toEqual(['Bois au lieu du plastique']);
    expect(summarizeSession(s, 'fr')).toBe(
      '# SCAMPER\n\n## Substituer\n\n- Bois au lieu du plastique\n\n## Combiner\n\n- Lampe + enceinte\n',
    );
    expect(summarizeSession(startSession('six-hats', T0), 'en')).toBe('# Six Thinking Hats\n');
  });

  it('produces JSON-serialisable state', () => {
    const s = addIdea(startSession('six-hats', T0), 'x');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
