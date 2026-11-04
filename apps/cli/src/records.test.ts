import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Task } from '@pouxis/core';
import { messages } from './i18n/index.ts';
import { findByPrefix, removeRecord, resolveRef, shortIds } from './records.ts';
import { emptyData } from './store/schema.ts';

const m = messages('en');
const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  createdAt: 0,
  updatedAt: 0,
  title: id,
  status: 'todo',
  priority: 0,
  tags: [],
  dependsOn: [],
  mode: 'organize',
  postponedCount: 0,
  timeLogs: [],
  ...extra,
});
const event = (id: string): CalendarEvent => ({
  id,
  createdAt: 0,
  updatedAt: 0,
  title: id,
  start: 0,
  end: 1,
  timeZone: 'UTC',
  fixed: true,
  kind: 'personal',
  attendees: [],
  tags: [],
});

describe('shortIds', () => {
  it('uses the minimum length unless prefixes collide', () => {
    const ids = shortIds(['abcdef123', 'abcdef456', 'zzzzzzzzz'], 4);
    expect([...ids.values()]).toEqual(['abcdef1', 'abcdef4', 'zzzz']);
  });
});

describe('resolveRef', () => {
  const data = emptyData();
  data.collections.tasks.push(task('aa11'), task('aa22'), task('bb'));
  data.collections.events.push(event('cc33'));

  it('resolves unique prefixes case-insensitively across tasks and events', () => {
    expect(resolveRef(data, 'AA1', m, 'done').record.id).toBe('aa11');
    expect(resolveRef(data, 'cc', m, 'done').kind).toBe('events');
  });

  it('explains missing and ambiguous ids', () => {
    expect(() => resolveRef(data, 'zz', m, 'done')).toThrow(/zz/);
    expect(() => resolveRef(data, 'aa', m, 'done')).toThrow(/ambiguous[\s\S]*aa11[\s\S]*aa22/);
    expect(() => resolveRef(data, ' ', m, 'done')).toThrow(
      expect.objectContaining({ exitCode: 2 }),
    );
  });

  it('prefers an exact id over longer ids sharing it as prefix', () => {
    const d = emptyData();
    d.collections.tasks.push(task('ab'), task('abc'));
    expect(findByPrefix(d, 'ab').map((r) => r.record.id)).toEqual(['ab']);
  });
});

describe('removeRecord', () => {
  it('removes the record and every reference to it', () => {
    const data = emptyData();
    data.collections.tasks.push(task('a'), task('b', { dependsOn: ['a', 'x'], parentId: 'a' }));
    data.collections.notes.push({
      id: 'n',
      createdAt: 0,
      updatedAt: 0,
      title: '',
      body: '',
      tags: [],
      links: ['a'],
    });
    data.collections.graphs.push({
      id: 'g',
      createdAt: 0,
      updatedAt: 0,
      title: '',
      edges: [],
      nodes: [{ id: 'k', label: '', kind: 'task', x: 0, y: 0, refId: 'a' }],
    });
    removeRecord(data, 'a', 9);
    const b = data.collections.tasks[0]!;
    expect(data.collections.tasks.map((t) => t.id)).toEqual(['b']);
    expect(b).toMatchObject({ dependsOn: ['x'], updatedAt: 9 });
    expect(b.parentId).toBeUndefined();
    expect(data.collections.notes[0]!.links).toEqual([]);
    expect(data.collections.graphs[0]!.nodes[0]!.refId).toBeUndefined();
  });
});
