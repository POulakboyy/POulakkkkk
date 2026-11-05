import { describe, expect, it } from 'vitest';
import { dayKey, type Note } from '@pouxis/core';
import { NOW, TZ, makeEntry } from '../shared/fixtures.test-utils.ts';
import {
  INCUBATION_TAG,
  INTERVALS_DAYS,
  MAX_CANDIDATES,
  dueAt,
  excerpt,
  incubating,
  incubationCandidates,
  incubationTags,
  nextStage,
  splitDue,
  stageOf,
} from './incubation.ts';

const DAY = 86_400_000;

function note(id: string, patch: Partial<Note> = {}): Note {
  return {
    id,
    createdAt: NOW - 10 * DAY,
    updatedAt: NOW - DAY,
    title: `Note ${id}`,
    body: '',
    tags: [],
    links: [],
    ...patch,
  };
}

describe('stages', () => {
  it('reads the stage and caps the next one', () => {
    expect(stageOf(makeEntry({ tags: incubationTags('n', 2, NOW, TZ) }))).toBe(2);
    expect(stageOf(makeEntry({ tags: [INCUBATION_TAG, 'lab:stage:99'] }))).toBe(
      INTERVALS_DAYS.length - 1,
    );
    expect(stageOf(makeEntry({ tags: [INCUBATION_TAG, 'lab:stage:x'] }))).toBe(0);
    expect(nextStage(0)).toBe(1);
    expect(nextStage(INTERVALS_DAYS.length - 1)).toBe(INTERVALS_DAYS.length - 1);
  });

  it('is due the interval after the review day, at local midnight', () => {
    const entry = makeEntry({ tags: incubationTags('n', 1, NOW, TZ) });
    expect(dayKey(dueAt(entry, TZ), TZ)).toBe('2026-11-08');
    // Without a date tag, falls back to the creation day.
    const legacy = makeEntry({ tags: [INCUBATION_TAG, 'lab:note:n'], createdAt: NOW });
    expect(dayKey(dueAt(legacy, TZ), TZ)).toBe('2026-11-06');
  });
});

describe('incubating', () => {
  it('joins entries to existing eligible notes, newest entry per note, soonest first', () => {
    const notes = [note('a'), note('b'), note('c', { sandbox: true })];
    const journal = [
      makeEntry({ tags: incubationTags('a', 3, NOW - 30 * DAY, TZ), createdAt: NOW - 30 * DAY }),
      makeEntry({ tags: incubationTags('a', 0, NOW, TZ), createdAt: NOW }),
      makeEntry({ tags: incubationTags('b', 0, NOW - 5 * DAY, TZ), createdAt: NOW - 5 * DAY }),
      makeEntry({ tags: incubationTags('c', 0, NOW, TZ) }),
      makeEntry({ tags: incubationTags('gone', 0, NOW, TZ) }),
    ];
    const list = incubating(journal, notes, TZ);
    expect(list.map((i) => [i.note.id, i.stage])).toEqual([
      ['b', 0],
      ['a', 0],
    ]);
    const { due, waiting } = splitDue(list, NOW);
    expect(due.map((i) => i.note.id)).toEqual(['b']);
    expect(waiting.map((i) => i.note.id)).toEqual(['a']);
  });
});

describe('incubationCandidates', () => {
  it('offers recent visible notes not already parked', () => {
    const notes = [
      note('old', { updatedAt: NOW - 9 * DAY }),
      note('new', { updatedAt: NOW }),
      note('parked'),
      note('vault', { vaultId: 'v' }),
      note('archived', { tags: ['archived'] }),
      note('untitled', { title: '  ' }),
    ];
    const parked = incubating([makeEntry({ tags: incubationTags('parked', 0, NOW, TZ) })], notes, TZ);
    expect(incubationCandidates(notes, parked).map((n) => n.id)).toEqual(['new', 'old']);
    const many = Array.from({ length: 10 }, (_, i) => note(`m${i}`));
    expect(incubationCandidates(many, [])).toHaveLength(MAX_CANDIDATES);
  });
});

describe('excerpt', () => {
  it('takes the first meaningful line without markdown markers, truncated', () => {
    expect(excerpt(note('x', { body: '\n# Titre\n- point' }))).toBe('Titre');
    expect(excerpt(note('x', { body: 'a'.repeat(200) }), 10)).toBe(`${'a'.repeat(9)}…`);
    expect(excerpt(note('x'))).toBe('');
  });
});
