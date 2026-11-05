import { describe, expect, it } from 'vitest';
import { NOW, PREFS, makeEntry, makeTask } from '../shared/fixtures.test-utils.ts';
import {
  INTENTION_TAG,
  cleanFragment,
  intentionCandidates,
  intentionTags,
  isComplete,
  suggestSlot,
  todaysIntention,
} from './intention.ts';

const HOUR = 3_600_000;
// 10:00 in Paris on Thursday 5 Nov 2026, inside default working hours.
const MORNING = Date.UTC(2026, 10, 5, 9, 0);

describe('intention drafts', () => {
  it('cleans fragments so they compose into one sentence', () => {
    expect(cleanFragment('  Écrire   l’intro.  ')).toBe('Écrire l’intro');
    expect(cleanFragment('Vraiment ?!')).toBe('Vraiment');
  });

  it('needs an action and a cue, not a place', () => {
    expect(isComplete({ action: 'Écrire', when: 'après mon café', where: '' })).toBe(true);
    expect(isComplete({ action: 'Écrire', when: ' . ', where: 'Bureau' })).toBe(false);
  });

  it('tags the day and the linked task', () => {
    expect(intentionTags({ action: 'a', when: 'b', where: '', taskId: 'x' }, NOW, PREFS)).toEqual([
      INTENTION_TAG,
      'lab:day:2026-11-05',
      'lab:task:x',
    ]);
  });
});

describe('intentionCandidates', () => {
  it('lists today first, then important open tasks, skipping subtasks and done ones', () => {
    const today = makeTask({ floatingDay: NOW });
    const important = makeTask({ important: true });
    const low = makeTask({ priority: 0 });
    const done = makeTask({ status: 'done', floatingDay: NOW });
    const sub = makeTask({ parentId: today.id, floatingDay: NOW });
    expect(intentionCandidates([low, important, done, sub, today], NOW, PREFS)).toEqual([
      today,
      important,
    ]);
  });
});

describe('todaysIntention', () => {
  it('returns the latest entry of the local day only', () => {
    const yesterday = makeEntry({ tags: [INTENTION_TAG, 'lab:day:2026-11-04'] });
    const first = makeEntry({ tags: [INTENTION_TAG, 'lab:day:2026-11-05'], createdAt: NOW - HOUR });
    const latest = makeEntry({ tags: [INTENTION_TAG, 'lab:day:2026-11-05'], createdAt: NOW });
    expect(todaysIntention([yesterday, first, latest], NOW, PREFS)).toBe(latest);
    expect(todaysIntention([yesterday], NOW, PREFS)).toBeUndefined();
  });
});

describe('suggestSlot', () => {
  it('finds the first free gap after now, around events', () => {
    const task = makeTask({ estimateMin: 30 });
    const meeting = {
      id: 'e1',
      createdAt: 0,
      updatedAt: 0,
      title: 'Point',
      start: MORNING,
      end: MORNING + HOUR,
      timeZone: PREFS.timeZone,
      fixed: true,
      kind: 'meeting' as const,
      attendees: [],
      tags: [],
    };
    const slot = suggestSlot(task, [task], [meeting], PREFS, MORNING);
    expect(slot).toBeDefined();
    expect(slot!.start).toBeGreaterThanOrEqual(MORNING + HOUR);
    expect(slot!.end - slot!.start).toBe(30 * 60_000);
  });

  it('keeps an upcoming scheduled slot as is', () => {
    const scheduled = { start: MORNING + 2 * HOUR, end: MORNING + 3 * HOUR };
    const task = makeTask({ scheduled });
    expect(suggestSlot(task, [task], [], PREFS, MORNING)).toEqual(scheduled);
  });

  it('returns nothing once the working day is over', () => {
    const task = makeTask({ estimateMin: 30 });
    expect(suggestSlot(task, [task], [], PREFS, Date.UTC(2026, 10, 5, 20, 0))).toBeUndefined();
  });
});
