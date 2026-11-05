import { describe, expect, it } from 'vitest';
import { NOW, TZ, makeEntry, makeTask } from '../shared/fixtures.test-utils.ts';
import {
  SETTLE_SECONDS,
  leavingCandidates,
  nextCandidates,
  parseResume,
  resumeNoteFor,
  settleProgress,
  statusChanges,
  transitionTags,
  transitionText,
} from './transition.ts';

const HOUR = 3_600_000;

describe('candidates', () => {
  const doing = makeTask({ title: 'doing', status: 'doing' });
  const logged = makeTask({
    title: 'logged',
    timeLogs: [{ start: NOW - 2 * HOUR, end: NOW - HOUR, kind: 'focus' }],
  });
  const planned = makeTask({ title: 'planned', floatingDay: NOW });
  const other = makeTask({ title: 'other', important: true });
  const yesterday = makeTask({
    title: 'yesterday',
    timeLogs: [{ start: NOW - 30 * HOUR, end: NOW - 29 * HOUR, kind: 'focus' }],
  });
  const all = [other, yesterday, planned, logged, doing];

  it('leaving: in progress, then worked on today, then planned today', () => {
    expect(leavingCandidates(all, NOW, TZ).map((t) => t.title)).toEqual([
      'doing',
      'logged',
      'planned',
    ]);
  });

  it('next: any open task but the one left, today first', () => {
    expect(nextCandidates(all, doing.id, NOW, TZ).map((t) => t.title)).toEqual([
      'logged',
      'planned',
      'other',
      'yesterday',
    ]);
  });
});

describe('resume note', () => {
  it('round-trips and finds the latest per task', () => {
    const text = transitionText({ where: '  Plan  fait ', next: 'Partie 3' });
    expect(text).toBe('Plan fait\nPartie 3');
    expect(parseResume(text)).toEqual({ where: 'Plan fait', next: 'Partie 3' });
    expect(parseResume('Seule ligne')).toEqual({ where: 'Seule ligne', next: '' });

    const old = makeEntry({ tags: transitionTags('t'), createdAt: NOW - 10 });
    const recent = makeEntry({ tags: transitionTags('t') });
    expect(resumeNoteFor([recent, old], 't')).toBe(recent);
    expect(resumeNoteFor([recent], 'u')).toBeUndefined();
  });
});

describe('statusChanges', () => {
  it('moves the left task back to todo and starts the next', () => {
    const leaving = makeTask({ status: 'doing' });
    const next = makeTask({ status: 'inbox' });
    expect(statusChanges(leaving, next)).toEqual([
      { id: leaving.id, patch: { status: 'todo' }, before: { status: 'doing' } },
      { id: next.id, patch: { status: 'doing' }, before: { status: 'inbox' } },
    ]);
    expect(statusChanges(makeTask(), undefined)).toEqual([]);
  });
});

describe('settleProgress', () => {
  it('clamps between 0 and 1', () => {
    expect(settleProgress(NOW, NOW - 5)).toBe(0);
    expect(settleProgress(NOW, NOW + (SETTLE_SECONDS * 1000) / 2)).toBe(0.5);
    expect(settleProgress(NOW, NOW + SETTLE_SECONDS * 2000)).toBe(1);
  });
});
