import { describe, expect, it } from 'vitest';
import { byImportance, completedOn, isPlannedOn } from './day.ts';
import { dayTag, isLabEntry, linkedTaskId, taskTag, withTags } from './journal.ts';
import { NOW, TZ, makeEntry, makeTask } from './fixtures.test-utils.ts';

const HOUR = 3_600_000;

describe('lab journal tags', () => {
  it('builds namespaced tags and reads linked task ids back', () => {
    expect(dayTag(NOW, TZ)).toBe('lab:day:2026-11-05');
    const entry = makeEntry({ tags: ['lab:intention', taskTag('abc')] });
    expect(linkedTaskId(entry)).toBe('abc');
    expect(linkedTaskId(makeEntry())).toBeUndefined();
    expect(isLabEntry(entry)).toBe(true);
    expect(isLabEntry(makeEntry({ tags: ['work'] }))).toBe(false);
  });

  it('filters by every tag, newest first', () => {
    const old = makeEntry({ tags: ['a', 'b'], createdAt: NOW - HOUR });
    const fresh = makeEntry({ tags: ['a', 'b'], createdAt: NOW });
    const other = makeEntry({ tags: ['a'] });
    expect(withTags([old, other, fresh], 'a', 'b')).toEqual([fresh, old]);
  });
});

describe('lab day helpers', () => {
  it('uses the local day of the zone, not UTC', () => {
    // 23:30 in Paris on 5 Nov is 22:30 UTC: same local day.
    const late = Date.UTC(2026, 10, 5, 22, 30);
    expect(isPlannedOn(makeTask({ floatingDay: late }), NOW, TZ)).toBe(true);
    const nextLocal = Date.UTC(2026, 10, 5, 23, 30);
    expect(isPlannedOn(makeTask({ floatingDay: nextLocal }), NOW, TZ)).toBe(false);
  });

  it('counts only tasks completed today', () => {
    expect(completedOn(makeTask({ status: 'done', completedAt: NOW - HOUR }), NOW, TZ)).toBe(true);
    expect(completedOn(makeTask({ status: 'done', completedAt: NOW - 30 * HOUR }), NOW, TZ)).toBe(
      false,
    );
    expect(completedOn(makeTask({ status: 'todo', completedAt: NOW }), NOW, TZ)).toBe(false);
  });

  it('orders important, then priority, then oldest', () => {
    const a = makeTask({ priority: 3, createdAt: 2 });
    const b = makeTask({ important: true, priority: 0 });
    const c = makeTask({ priority: 3, createdAt: 1 });
    expect([a, b, c].sort(byImportance)).toEqual([b, c, a]);
  });
});
