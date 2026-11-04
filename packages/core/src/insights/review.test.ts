import { describe, expect, it } from 'vitest';
import { HOUR } from '../time.ts';
import { at, done, focus, journal, meeting, task, TZ } from './fixtures.test-utils.ts';
import { weeklyReview, type WeeklyReviewInput } from './review.ts';

const WEEK_START = at(2026, 3, 2); // Monday
const WEEK_END = at(2026, 3, 9);

function review(overrides: Partial<WeeklyReviewInput> = {}) {
  return weeklyReview({
    tasks: [],
    events: [],
    journal: [],
    weekStart: WEEK_START,
    timeZone: TZ,
    ...overrides,
  });
}

describe('weeklyReview — empty week', () => {
  it('returns an empty, well-formed review', () => {
    const r = review();
    expect(r.week).toEqual({ start: WEEK_START, end: WEEK_END });
    expect(r.wins).toEqual([]);
    expect(r.blockers).toEqual([]);
    expect(r.slipped).toEqual([]);
    expect(r.planning).toEqual({ estimates: null, scheduled: null });
    expect(r.suggestions).toEqual([]);
    expect(r.stats).toMatchObject({ completed: 0, focusMinutes: 0, total: 0, ratio: null });
  });
});

describe('weeklyReview — wins', () => {
  it('lists completed tasks and win entries of the week, ending on the biggest', () => {
    const small = done(at(2026, 3, 6, 10), { title: 'small' });
    const big = done(at(2026, 3, 3, 10), {
      title: 'big',
      priority: 3,
      important: true,
      timeLogs: [focus(at(2026, 3, 2, 9), 180)],
    });
    const outside = done(at(2026, 3, 10, 10), { title: 'next week' });
    const dropped = task({ status: 'archived', title: 'dropped' });
    const note = journal('win', at(2026, 3, 4, 20), 'Shipped the prototype');
    const r = review({ tasks: [small, big, outside, dropped], journal: [note] });
    expect(r.wins.map((w) => w.title)).toEqual(['small', 'Shipped the prototype', 'big']);
    expect(r.wins.map((w) => w.kind)).toEqual(['task', 'journal', 'task']);
    const scores = r.wins.map((w) => w.score);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
    expect(r.stats.completed).toBe(2);
  });

  it('keeps the strongest wins when capped', () => {
    const tasks = [0, 1, 2, 3].map((p) =>
      done(at(2026, 3, 3, 9 + p), { title: `p${p}`, priority: p as 0 | 1 | 2 | 3 }),
    );
    const r = review({ tasks, maxWins: 2 });
    expect(r.wins.map((w) => w.title)).toEqual(['p2', 'p3']);
    expect(review({ tasks, maxWins: 0 }).wins).toEqual([]);
  });

  it('counts archived-with-completion tasks as wins', () => {
    const t = task({ status: 'archived', completedAt: at(2026, 3, 3, 9), title: 'kept' });
    expect(review({ tasks: [t] }).wins.map((w) => w.title)).toEqual(['kept']);
  });
});

describe('weeklyReview — blockers', () => {
  const entries = [
    journal('friction', at(2026, 2, 16, 18), 'Interrupted by email notifications again'),
    journal('friction', at(2026, 3, 3, 18), 'Email notifications broke my focus', ['#email']),
    journal('friction', at(2026, 3, 5, 18), 'Too many emails before lunch', ['email']),
    journal('friction', at(2026, 3, 4, 18), 'Printer jammed'),
    journal('friction', at(2026, 2, 5, 18), 'Email overload'), // outside the 4-week window
    journal('win', at(2026, 3, 4, 19), 'Email inbox zero'),
  ];

  it('clusters similar friction entries by tags and keywords', () => {
    const r = review({ journal: entries });
    expect(r.blockers).toHaveLength(1);
    const b = r.blockers[0];
    expect(b?.terms[0]).toBe('email');
    expect(b?.count).toBe(3);
    expect(b?.thisWeek).toBe(2);
    expect(b?.entryIds).toEqual([entries[0]?.id, entries[1]?.id, entries[2]?.id]);
    expect(b?.firstAt).toBe(entries[0]?.createdAt);
    expect(b?.lastAt).toBe(entries[2]?.createdAt);
  });

  it('honours minOccurrences, lookbackWeeks and similarity', () => {
    expect(review({ journal: entries, minOccurrences: 4 }).blockers).toEqual([]);
    expect(review({ journal: entries, lookbackWeeks: 1 }).blockers[0]?.count).toBe(2);
    expect(review({ journal: entries, minOccurrences: 1 }).blockers).toHaveLength(2);
    expect(review({ journal: entries, similarity: 1 }).blockers).toEqual([]);
  });

  it('ignores clusters with nothing written this week', () => {
    const old = [
      journal('friction', at(2026, 2, 16, 18), 'Slow laptop compile'),
      journal('friction', at(2026, 2, 17, 18), 'Slow laptop compile times'),
    ];
    expect(review({ journal: old }).blockers).toEqual([]);
  });
});

describe('weeklyReview — slipped tasks', () => {
  it('reports missed deadlines and scheduled slots that were not honoured', () => {
    const missed = task({ title: 'missed', deadline: at(2026, 3, 4, 18), postponedCount: 2 });
    const late = done(at(2026, 3, 5, 9), { title: 'late', deadline: at(2026, 3, 4, 18) });
    const onTime = done(at(2026, 3, 4, 9), { deadline: at(2026, 3, 4, 18) });
    const slot = { start: at(2026, 3, 3, 9), end: at(2026, 3, 3, 10) };
    const skipped = task({ title: 'skipped', scheduled: slot });
    const movedWithinWeek = done(at(2026, 3, 6, 9), { scheduled: slot });
    const dropped = task({ status: 'archived', deadline: at(2026, 3, 4, 18) });
    const future = task({ deadline: at(2026, 3, 20) });
    const r = review({ tasks: [missed, late, onTime, skipped, movedWithinWeek, dropped, future] });
    expect(r.slipped.map((s) => [s.title, s.reason])).toEqual([
      ['skipped', 'not-done-as-scheduled'],
      ['missed', 'deadline-missed'],
      ['late', 'deadline-missed'],
    ]);
    expect(r.slipped[1]?.postponedCount).toBe(2);
    expect(r.slipped[2]?.completedAt).toBe(at(2026, 3, 5, 9));
    expect(r.slipped[1]).not.toHaveProperty('completedAt');
  });

  it('does not count deadlines after now', () => {
    const t = task({ deadline: at(2026, 3, 6, 18) });
    expect(review({ tasks: [t], now: at(2026, 3, 5) }).slipped).toEqual([]);
    expect(review({ tasks: [t], now: at(2026, 3, 7) }).slipped).toHaveLength(1);
  });
});

describe('weeklyReview — planning accuracy and suggestions', () => {
  function estimated(estimateMin: number, actualMin: number, day: number) {
    return done(at(2026, 3, day, 17), {
      estimateMin,
      timeLogs: [focus(at(2026, 3, day, 9), actualMin)],
    });
  }

  it('summarises estimate ratios with the median', () => {
    const tasks = [estimated(60, 60, 2), estimated(60, 90, 3), estimated(60, 120, 4)];
    const r = review({ tasks });
    expect(r.planning.estimates).toEqual({ samples: 3, medianRatio: 1.5, withinQuarter: 1 / 3 });
    expect(r.suggestions).toContainEqual({ kind: 'pad-estimates', factor: 1.5 });
  });

  it('suggests trimming estimates when work is consistently faster', () => {
    const tasks = [estimated(120, 30, 2), estimated(120, 60, 3), estimated(120, 40, 4)];
    expect(review({ tasks }).suggestions).toContainEqual({ kind: 'trim-estimates', factor: 0.3 });
  });

  it('needs enough samples before suggesting anything about estimates', () => {
    const r = review({ tasks: [estimated(60, 180, 2)] });
    expect(r.planning.estimates?.samples).toBe(1);
    expect(r.suggestions.some((s) => s.kind === 'pad-estimates')).toBe(false);
  });

  it('tracks the scheduled completion rate and suggests a lighter plan', () => {
    const slot = (d: number) => ({ start: at(2026, 3, d, 9), end: at(2026, 3, d, 10) });
    const tasks = [
      done(at(2026, 3, 2, 10), { scheduled: slot(2) }),
      ...[3, 4, 5, 6].map((d) => task({ scheduled: slot(d) })),
    ];
    const r = review({ tasks });
    expect(r.planning.scheduled).toEqual({ planned: 5, done: 1, rate: 0.2 });
    expect(r.suggestions).toContainEqual({ kind: 'lighten-plan', rate: 0.2 });
    expect(r.suggestions).toContainEqual({ kind: 'reschedule-slipped', count: 4 });
  });

  it('suggests protecting creative time when organisation dominates', () => {
    const tasks = [task({ mode: 'organize', timeLogs: [focus(at(2026, 3, 3, 9), 180)] })];
    const events = [meeting(at(2026, 3, 4, 9), 120)];
    const r = review({ tasks, events });
    expect(r.stats).toMatchObject({ organize: 180, meetings: 120, create: 0, focusMinutes: 180 });
    expect(r.suggestions).toContainEqual({ kind: 'protect-creation', share: 0 });
  });

  it('caps suggestions at three, blocker first', () => {
    const slot = (d: number) => ({ start: at(2026, 3, d, 9), end: at(2026, 3, d, 10) });
    const tasks = [
      estimated(60, 120, 2),
      estimated(60, 120, 3),
      estimated(60, 120, 4),
      ...[2, 3, 4, 5, 6].map((d) => task({ mode: 'organize', scheduled: slot(d) })),
      task({ mode: 'organize', timeLogs: [focus(at(2026, 3, 5, 13), 600)] }),
    ];
    const friction = [
      journal('friction', at(2026, 3, 3, 18), 'Noisy open space'),
      journal('friction', at(2026, 3, 4, 18), 'Noisy open space again'),
    ];
    const r = review({ tasks, journal: friction });
    expect(r.suggestions).toHaveLength(3);
    expect(r.suggestions[0]?.kind).toBe('address-blocker');
  });

  it('counts overlapping focus once in stats', () => {
    const start = at(2026, 3, 3, 9);
    const tasks = [
      task({ timeLogs: [focus(start, 60)] }),
      task({ timeLogs: [focus(start + HOUR / 2, 60)] }),
    ];
    expect(review({ tasks }).stats.focusMinutes).toBe(90);
  });
});

describe('weeklyReview — validation', () => {
  it('rejects invalid options', () => {
    expect(() => review({ weekStart: Number.NaN })).toThrow(RangeError);
    expect(() => review({ lookbackWeeks: 0 })).toThrow(RangeError);
    expect(() => review({ minOccurrences: 0 })).toThrow(RangeError);
    expect(() => review({ similarity: 0 })).toThrow(RangeError);
    expect(() => review({ maxWins: -1 })).toThrow(RangeError);
  });
});
