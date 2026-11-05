import { describe, expect, it } from 'vitest';
import * as tasks from '../index.ts';

describe('tasks public API', () => {
  it('exposes every feature entry point', () => {
    const expected = [
      'actionable',
      'isActionable',
      'blockers',
      'topoOrder',
      'detectCycles',
      'wouldCreateCycle',
      'unlockedBy',

      'decomposeOffline',
      'withFallback',
      'subtaskRecords',
      'decay',
      'postponePatch',
      'quadrant',
      'matrix',
      'quadrantPatch',
      'pomodoroPlan',
      'logTimePatch',
      'focusMinutes',
      'estimateAccuracy',
      'compileFormula',
      'evaluateFormula',
      'evaluateTaskFormula',
      'toBoard',
      'hierarchyBoard',
      'moveCardPatch',
      'wipStatus',
      'canAddPriorityTask',
    ];
    for (const name of expected)
      expect(typeof (tasks as Record<string, unknown>)[name]).toBe('function');
    expect(typeof tasks.heuristicDecomposer.decompose).toBe('function');
  });
});
