import { startOfDay } from '@pouxis/core';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  groupTasks,
  matchesFilters,
  nextPlanDay,
  parseViewMode,
  taskFromCapture,
  topTags,
} from '../model.ts';
import { DAY, NOW, TZ, task } from './fixtures.ts';

const today = startOfDay(NOW, TZ);

describe('groupTasks', () => {
  it('sorts top-level tasks into decision groups in a fixed order', () => {
    const blocker = task({ title: 'blocker' });
    const all = [
      task({ title: 'done', status: 'done', completedAt: NOW }),
      task({ title: 'inbox', status: 'inbox' }),
      task({ title: 'waiting', dependsOn: [blocker.id] }),
      task({ title: 'today', floatingDay: today }),
      task({ title: 'late', deadline: today - DAY }),
      task({ title: 'later', floatingDay: today + 3 * DAY }),
      blocker,
      task({ title: 'archived', status: 'archived' }),
    ];
    const sub = task({ title: 'sub', parentId: all[3]!.id });
    const groups = groupTasks([...all, sub], [...all, sub], NOW, TZ);
    expect(groups.map((g) => [g.id, g.tasks.map((t) => t.title)])).toEqual([
      ['inbox', ['inbox']],
      ['today', ['today']],
      ['toReschedule', ['late']],
      ['upcoming', ['later']],
      ['noDate', ['blocker']],
      ['waiting', ['waiting']],
      ['done', ['done']],
    ]);
  });

  it('orders a group by date, then priority', () => {
    const a = task({ title: 'a', floatingDay: today + 2 * DAY });
    const b = task({ title: 'b', floatingDay: today + DAY });
    const c = task({ title: 'c', priority: 3 });
    const d = task({ title: 'd', priority: 1 });
    const groups = groupTasks([a, b, c, d], [a, b, c, d], NOW, TZ);
    expect(groups.find((g) => g.id === 'upcoming')!.tasks.map((t) => t.title)).toEqual(['b', 'a']);
    expect(groups.find((g) => g.id === 'noDate')!.tasks.map((t) => t.title)).toEqual(['c', 'd']);
  });
});

describe('filters', () => {
  const ctx = (all: ReturnType<typeof task>[]) => ({
    byId: new Map(all.map((t) => [t.id, t])),
    todayStart: today,
    timeZone: TZ,
  });

  it('matches every query word against title, notes and tags, accent-insensitively', () => {
    const t = task({ title: 'Écrire l’intro', notes: 'chapitre deux', tags: ['livre'] });
    const c = ctx([t]);
    expect(matchesFilters(t, { ...EMPTY_FILTERS, query: 'ecrire #livre' }, c)).toBe(true);
    expect(matchesFilters(t, { ...EMPTY_FILTERS, query: 'chapitre trois' }, c)).toBe(false);
  });

  it('combines pills and tags with AND', () => {
    const quick = task({ estimateMin: 10, priority: 3, tags: ['Admin'] });
    const slow = task({ estimateMin: 60, priority: 3, tags: ['admin'] });
    const c = ctx([quick, slow]);
    const f = { query: '', pills: ['quick', 'priority'] as const, tags: ['admin'] };
    expect(matchesFilters(quick, f, c)).toBe(true);
    expect(matchesFilters(slow, f, c)).toBe(false);
  });

  it('finds blocked tasks', () => {
    const blocker = task();
    const blocked = task({ dependsOn: [blocker.id] });
    const c = ctx([blocker, blocked]);
    const f = { ...EMPTY_FILTERS, pills: ['blocked' as const] };
    expect(matchesFilters(blocked, f, c)).toBe(true);
    expect(matchesFilters(blocker, f, c)).toBe(false);
  });

  it('ranks tags of open tasks by use', () => {
    const tasks = [
      task({ tags: ['b', 'a'] }),
      task({ tags: ['b'] }),
      task({ tags: ['z'], status: 'done' }),
    ];
    expect(topTags(tasks)).toEqual(['b', 'a']);
  });
});

describe('taskFromCapture', () => {
  const ctx = { now: NOW, timeZone: TZ, locale: 'fr' as const };

  it('returns null for blank input', () => {
    expect(taskFromCapture('   ', ctx)).toBeNull();
  });

  it('keeps an undated capture in the inbox', () => {
    const r = taskFromCapture('Lire un article', ctx)!;
    expect(r.status).toBe('inbox');
    expect(r.title).toBe('Lire un article');
  });

  it('triages a dated capture with tags', () => {
    const r = taskFromCapture('Appeler Léa demain 15h #perso', ctx)!;
    expect(r.status).toBe('todo');
    expect(r.tags).toEqual(['perso']);
    expect(r.scheduled?.start).toBeGreaterThan(today + DAY);
    expect(r.title).not.toMatch(/demain|#perso/);
  });
});

describe('nextPlanDay and parseViewMode', () => {
  it('plans today, or tomorrow when already planned today', () => {
    expect(nextPlanDay(task(), NOW, TZ)).toBe(today);
    expect(nextPlanDay(task({ floatingDay: today }), NOW, TZ)).toBe(today + DAY);
  });

  it('falls back to the list for unknown views', () => {
    expect(parseViewMode('kanban')).toBe('kanban');
    expect(parseViewMode('nope')).toBe('list');
    expect(parseViewMode(null)).toBe('list');
  });
});
