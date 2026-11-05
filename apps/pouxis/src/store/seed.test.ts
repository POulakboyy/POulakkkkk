import { describe, expect, it } from 'vitest';
import { DAY, recurrence, startOfWeek } from '@pouxis/core';
import { createLocalStore } from './local.ts';
import { createMemoryDisk, createMemoryPersistence } from './persistence.ts';
import { seedDemo } from './seed.ts';

const NOW = Date.UTC(2026, 10, 5, 9, 0); // Thursday 5 November 2026, 10:00 in Paris

function seeded() {
  const store = createLocalStore({
    persistence: createMemoryPersistence(createMemoryDisk()),
    channel: null,
    locks: null,
    legacyStorage: null,
    seed: (s) => {
      s.setPrefs({ timeZone: 'Europe/Paris' });
      seedDemo(s, NOW);
    },
  });
  return store;
}

describe('seedDemo', () => {
  it('fills every collection with a lived-in week', () => {
    const store = seeded();
    const tasks = store.all('tasks');
    expect(tasks.length).toBeGreaterThanOrEqual(25);
    expect(new Set(tasks.map((t) => t.mode))).toEqual(new Set(['create', 'organize']));
    expect(new Set(tasks.map((t) => t.priority))).toEqual(new Set([0, 1, 2, 3]));
    expect(new Set(tasks.map((t) => t.status))).toEqual(
      new Set(['inbox', 'todo', 'doing', 'done']),
    );
    expect(store.all('notes').length).toBeGreaterThanOrEqual(5);
    expect(store.all('graphs')).toHaveLength(1);
    const kinds = new Set(store.all('journal').map((j) => j.kind));
    expect(kinds).toEqual(new Set(['win', 'friction', 'dump']));
    expect(store.history().canUndo).toBe(false);
  });

  it('places the events in the current week', () => {
    const store = seeded();
    const monday = startOfWeek(NOW, 'Europe/Paris', 1);
    const events = store.all('events');
    expect(events.length).toBeGreaterThanOrEqual(15);
    for (const e of events) {
      expect(e.start).toBeGreaterThanOrEqual(monday);
      expect(e.start).toBeLessThan(monday + 7 * DAY);
      expect(e.end).toBeGreaterThan(e.start);
      expect(e.timeZone).toBe('Europe/Paris');
    }
  });

  it('only references records that exist', () => {
    const store = seeded();
    const ids = new Set(
      (['tasks', 'events', 'notes', 'journal', 'graphs'] as const).flatMap((c) =>
        store.all(c).map((r) => r.id),
      ),
    );
    for (const t of store.all('tasks')) for (const dep of t.dependsOn) expect(ids).toContain(dep);
    for (const n of store.all('notes')) for (const link of n.links) expect(ids).toContain(link);
    const [graph] = store.all('graphs');
    const nodes = new Set(graph?.nodes.map((n) => n.id));
    for (const node of graph?.nodes ?? []) if (node.refId) expect(ids).toContain(node.refId);
    for (const edge of graph?.edges ?? []) {
      expect(nodes).toContain(edge.from);
      expect(nodes).toContain(edge.to);
    }
  });

  it('uses recurrence rules the engine understands', () => {
    const store = seeded();
    const rules = [...store.all('tasks'), ...store.all('events')]
      .map((r) => r.recurrence)
      .filter((r): r is string => r !== undefined);
    expect(rules.length).toBeGreaterThanOrEqual(5);
    for (const rule of rules) expect(recurrence.parseRule(rule), rule).not.toBeNull();
  });

  it('logs four weeks of focus sessions, finished tasks close to their estimate', () => {
    const store = seeded();
    const logs = store.all('tasks').flatMap((t) => t.timeLogs);
    const focus = logs.filter((l) => l.kind === 'focus');
    expect(focus.length).toBeGreaterThan(40);
    const first = Math.min(...focus.map((l) => l.start));
    expect(NOW - first).toBeGreaterThan(21 * DAY);
    expect(Math.max(...logs.map((l) => l.end))).toBeLessThan(NOW);
    for (const l of logs) expect(l.end).toBeGreaterThan(l.start);
    for (const t of store.all('tasks').filter((x) => x.status === 'done')) {
      const spent = t.timeLogs
        .filter((l) => l.kind === 'focus')
        .reduce((sum, l) => sum + (l.end - l.start), 0);
      const ratio = spent / ((t.estimateMin ?? 0) * 60_000);
      expect(ratio, t.title).toBeGreaterThan(0.7);
      expect(ratio, t.title).toBeLessThan(2);
      for (const l of t.timeLogs) expect(l.end).toBeLessThanOrEqual((t.completedAt ?? 0) + 300_000);
    }
  });

  it('is deterministic, so devices seeded apart converge', () => {
    const a = seeded().all('tasks');
    const b = seeded().all('tasks');
    expect(a.map((t) => [t.id, t.title, t.timeLogs.length])).toEqual(
      b.map((t) => [t.id, t.title, t.timeLogs.length]),
    );
  });
});
