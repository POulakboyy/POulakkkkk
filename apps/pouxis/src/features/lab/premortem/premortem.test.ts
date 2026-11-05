import { describe, expect, it } from 'vitest';
import { dayKey } from '@pouxis/core';
import { NOW, TZ, makeEntry, makeTask } from '../shared/fixtures.test-utils.ts';
import {
  MAX_CANDIDATES,
  MAX_RISKS,
  PREMORTEM_TAG,
  cleanRisks,
  failureDate,
  lastPremortem,
  paradeRecords,
  parsePremortem,
  premortemCandidates,
  premortemTags,
  premortemText,
} from './premortem.ts';

describe('premortemCandidates', () => {
  it('keeps open top-level tasks, important first', () => {
    const important = makeTask({ title: 'A', important: true });
    const high = makeTask({ title: 'B', priority: 3 });
    const sub = makeTask({ title: 'C', parentId: important.id, important: true });
    const done = makeTask({ title: 'D', status: 'done', important: true });
    expect(premortemCandidates([high, sub, done, important]).map((t) => t.title)).toEqual([
      'A',
      'B',
    ]);
    const many = Array.from({ length: 9 }, () => makeTask());
    expect(premortemCandidates(many)).toHaveLength(MAX_CANDIDATES);
  });
});

describe('failureDate', () => {
  it('uses a future deadline, else a month from today', () => {
    const deadline = NOW + 5 * 86_400_000;
    expect(failureDate(makeTask({ deadline }), NOW, TZ)).toBe(deadline);
    expect(dayKey(failureDate(makeTask({ deadline: NOW - 1 }), NOW, TZ), TZ)).toBe('2026-12-05');
  });
});

describe('risks', () => {
  it('cleans, drops empty causes and caps', () => {
    const risks = [
      { cause: '  Trop   long ', parade: ' Couper ' },
      { cause: ' ', parade: 'orphan' },
      ...Array.from({ length: 6 }, (_, i) => ({ cause: `c${i}`, parade: '' })),
    ];
    const cleaned = cleanRisks(risks);
    expect(cleaned[0]).toEqual({ cause: 'Trop long', parade: 'Couper' });
    expect(cleaned).toHaveLength(MAX_RISKS);
  });

  it('round-trips through the journal text', () => {
    const risks = [
      { cause: 'Pas de relecture', parade: 'Demander à Léa' },
      { cause: 'Fatigue', parade: '' },
    ];
    const text = premortemText(risks);
    expect(text).toBe('Pas de relecture → Demander à Léa\nFatigue');
    expect(parsePremortem(text)).toEqual(risks);
  });

  it('creates one subtask per parade', () => {
    const target = makeTask({ projectId: 'p', priority: 2, mode: 'create' });
    const records = paradeRecords(target, [
      { cause: 'a', parade: 'Bloquer un créneau' },
      { cause: 'b', parade: '' },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      title: 'Bloquer un créneau',
      parentId: target.id,
      projectId: 'p',
      priority: 2,
      mode: 'create',
      status: 'todo',
    });
  });

  it('finds the latest pre-mortem of a task', () => {
    const old = makeEntry({ tags: premortemTags('t'), createdAt: NOW - 1000 });
    const recent = makeEntry({ tags: premortemTags('t') });
    const other = makeEntry({ tags: [PREMORTEM_TAG, 'lab:task:x'] });
    expect(lastPremortem([old, other, recent], 't')).toBe(recent);
    expect(lastPremortem([other], 't')).toBeUndefined();
  });
});
