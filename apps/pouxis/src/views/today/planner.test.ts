import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, atMinutes, startOfDay, type UserPrefs } from '@pouxis/core';
import { createFakeStore, eventFixture, taskFixture } from '../../features/focus/testing.ts';
import {
  addBuffers,
  applyPlacements,
  applyPropagation,
  moveEvent,
  scheduleTask,
} from './actions.ts';
import {
  energyFor,
  magnetizeDay,
  makerWarning,
  missingBuffers,
  overrunPreview,
  planDay,
  slotInGap,
  tomorrowOf,
  wantsToday,
} from './planner.ts';

const TZ = 'Europe/Paris';
const prefs: UserPrefs = { ...DEFAULT_PREFS, timeZone: TZ };
const DAY0 = startOfDay(Date.UTC(2026, 10, 5, 12), TZ); // Thursday
const at = (h: number, m = 0) => atMinutes(DAY0, h * 60 + m, TZ);

function world() {
  const store = createFakeStore(prefs, () => at(8));
  return store;
}

describe('energyFor', () => {
  it('returns 24 hourly values in 0..1', () => {
    const profile = energyFor([], at(8), prefs, 'morning');
    expect(profile).toHaveLength(24);
    expect(profile.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('wantsToday', () => {
  it('selects floating, in-progress and due-soon tasks only', () => {
    const s = world();
    const base = { title: 'x' };
    const floating = s.create('tasks', taskFixture({ ...base, floatingDay: DAY0 }));
    const doing = s.create('tasks', taskFixture({ ...base, status: 'doing' }));
    const due = s.create('tasks', taskFixture({ ...base, deadline: at(30) }));
    const later = s.create('tasks', taskFixture({ ...base, deadline: at(24 * 5) }));
    const inbox = s.create('tasks', taskFixture({ ...base, status: 'inbox' }));
    const pick = (id: string) => wantsToday(s.get('tasks', id)!, at(8), prefs);
    expect([floating, doing, due].every((t) => pick(t.id))).toBe(true);
    expect(pick(later.id)).toBe(false);
    expect(pick(inbox.id)).toBe(false);
  });
});

describe('planDay', () => {
  it('places today’s tasks around fixed events and applies them in one undo step', () => {
    const s = world();
    s.create('events', eventFixture({ title: 'Meet', start: at(9), end: at(12), fixed: true }));
    const a = s.create('tasks', taskFixture({ title: 'A', floatingDay: DAY0, estimateMin: 60 }));
    const d = s.create('tasks', taskFixture({ title: 'D', status: 'doing', estimateMin: 30 }));
    s.create('tasks', taskFixture({ title: 'Inbox', status: 'inbox' }));
    const result = planDay({ tasks: s.all('tasks'), events: s.all('events'), prefs, now: at(8) });
    expect(result.placements.map((p) => p.taskId).sort()).toEqual([a.id, d.id].sort());
    const slot = result.placements.find((p) => p.taskId === a.id)!;
    const other = result.placements.find((p) => p.taskId === d.id)!;
    expect(other.end <= slot.start || other.start >= slot.end).toBe(true);
    expect(slot.start).toBeGreaterThanOrEqual(at(12));
    expect(slot.end - slot.start).toBe(60 * 60_000);

    expect(applyPlacements(s, result.placements)).toBe(2);
    expect(s.batches).toBe(1);
    expect(s.get('tasks', a.id)?.scheduled).toEqual({ start: slot.start, end: slot.end });
  });
});

describe('magnetizeDay and slotInGap', () => {
  it('suggests a slot for floating tasks without moving anything', () => {
    const s = world();
    const a = s.create('tasks', taskFixture({ title: 'A', floatingDay: DAY0, estimateMin: 30 }));
    const suggestions = magnetizeDay({ tasks: s.all('tasks'), events: [], prefs, now: at(8) });
    expect(suggestions.map((p) => p.taskId)).toEqual([a.id]);
    scheduleTask(s, a.id, suggestions[0]!);
    expect(s.get('tasks', a.id)?.scheduled?.start).toBe(suggestions[0]!.start);
  });

  it('fits a task at the start of a gap only when its estimate fits', () => {
    const t = {
      ...taskFixture({ title: 'A', estimateMin: 45 }),
      id: 'a',
      createdAt: 0,
      updatedAt: 0,
    };
    expect(slotInGap(t, { start: at(9), end: at(10) })).toEqual({ start: at(9), end: at(9, 45) });
    expect(slotInGap(t, { start: at(9), end: at(9, 30) })).toBeUndefined();
  });
});

describe('missingBuffers', () => {
  it('suggests breathers between back-to-back meetings, minus those already stored', () => {
    const s = world();
    s.create('events', eventFixture({ title: 'A', start: at(10), end: at(11) }));
    s.create('events', eventFixture({ title: 'B', start: at(11), end: at(12) }));
    s.create('events', eventFixture({ title: 'C', start: at(12), end: at(13) }));
    const drafts = missingBuffers(s.all('events'), prefs);
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every((d) => d.kind === 'buffer')).toBe(true);

    expect(addBuffers(s, drafts.slice(0, 1))).toBe(1);
    expect(missingBuffers(s.all('events'), prefs)).toHaveLength(drafts.length - 1);
  });
});

describe('makerWarning', () => {
  it('flags a meeting that splits the deep-work block and offers another slot', () => {
    const s = world();
    const meeting = s.create(
      'events',
      eventFixture({ title: 'Sync', start: at(12, 45), end: at(14, 15), fixed: false }),
    );
    const warning = makerWarning(s.all('events'), prefs, at(8));
    expect(warning?.event.id).toBe(meeting.id);
    expect(warning?.check.code).toBe('fragments-maker-block');
    const alt = warning?.alternatives[0];
    expect(alt).toBeDefined();
    moveEvent(s, meeting.id, alt!);
    expect(makerWarning(s.all('events'), prefs, at(8))).toBeUndefined();
  });

  it('stays quiet when the meeting keeps a long block', () => {
    const s = world();
    s.create('events', eventFixture({ title: 'Early', start: at(9), end: at(9, 30) }));
    expect(makerWarning(s.all('events'), prefs, at(8))).toBeUndefined();
  });
});

describe('overrunPreview and applyPropagation', () => {
  it('shifts what follows, keeps fixed events, and sends overflow to tomorrow', () => {
    const s = world();
    const a = s.create(
      'tasks',
      taskFixture({ title: 'A', scheduled: { start: at(9), end: at(10) } }),
    );
    const b = s.create(
      'tasks',
      taskFixture({ title: 'B', scheduled: { start: at(10), end: at(11) } }),
    );
    const fixed = s.create(
      'events',
      eventFixture({ title: 'Lunch', start: at(12), end: at(13), fixed: true }),
    );
    const preview = overrunPreview(s.all('tasks'), s.all('events'), a.id, at(10, 30), prefs);
    const moveB = preview.moves.find((m) => m.id === b.id);
    expect(moveB).toMatchObject({ start: at(10, 30), end: at(11, 30) });
    expect(preview.moves.some((m) => m.id === fixed.id)).toBe(false);

    const moved = applyPropagation(s, a.id, preview.moves, [], tomorrowOf(at(10), prefs));
    expect(moved).toBe(preview.moves.filter((m) => m.id !== a.id).length);
    expect(s.get('tasks', b.id)?.scheduled).toEqual({ start: at(10, 30), end: at(11, 30) });

    applyPropagation(s, a.id, [{ id: b.id, kind: 'task', start: 0, end: 0 }], [b.id], at(24));
    expect(s.get('tasks', b.id)).toMatchObject({ floatingDay: at(24) });
    expect(s.get('tasks', b.id)?.scheduled).toBeUndefined();
  });
});
