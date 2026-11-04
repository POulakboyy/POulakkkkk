import { describe, expect, it } from 'vitest';
import { at, done, focus, task, TZ } from './fixtures.test-utils.ts';
import { activeDays, streak, type StreakRules } from './streak.ts';

const NO_JOKERS: StreakRules = { jokersPerWeek: 0, maxJokers: 0 };
const ONE_A_WEEK: StreakRules = { jokersPerWeek: 1, maxJokers: 2 };

/** `YYYY-MM-DD` keys for March 2026 days. */
function march(...days: number[]): string[] {
  return days.map((d) => `2026-03-${String(d).padStart(2, '0')}`);
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

describe('streak', () => {
  it('is empty and paused without any activity', () => {
    const s = streak({ activeDays: [], today: '2026-03-10', rules: ONE_A_WEEK });
    expect(s).toEqual({
      current: 0,
      best: 0,
      jokersLeft: 1,
      jokerDays: [],
      status: 'paused',
      pausedSince: null,
      lastActiveDay: null,
    });
  });

  it('counts consecutive active days, ignoring order and duplicates', () => {
    const days = [...march(5, 3, 4), '2026-03-04'];
    const s = streak({ activeDays: days, today: '2026-03-05', rules: NO_JOKERS });
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.status).toBe('active');
    expect(s.lastActiveDay).toBe('2026-03-05');
  });

  it('does not treat today as a miss before the day is over', () => {
    const s = streak({ activeDays: march(3, 4), today: '2026-03-05', rules: NO_JOKERS });
    expect(s.current).toBe(2);
    expect(s.status).toBe('active');
  });

  it('covers a missed day with a joker and keeps the streak alive', () => {
    // Mon 2 → Wed 4 active, Thu 5 missed, Fri 6 active.
    const s = streak({ activeDays: march(2, 3, 4, 6), today: '2026-03-06', rules: ONE_A_WEEK });
    expect(s.current).toBe(4);
    expect(s.jokerDays).toEqual(['2026-03-05']);
    expect(s.jokersLeft).toBe(0);
    expect(s.status).toBe('active');
  });

  it('reports a protected streak while the latest gap is covered', () => {
    const s = streak({ activeDays: march(2, 3), today: '2026-03-05', rules: ONE_A_WEEK });
    expect(s.status).toBe('protected');
    expect(s.jokerDays).toEqual(['2026-03-04']);
    expect(s.current).toBe(2);
  });

  it('pauses instead of resetting when jokers run out, then resumes', () => {
    // 2–3 active, 4 joker, 5 uncovered → paused; back on 7 within the grace period.
    const paused = streak({ activeDays: march(2, 3), today: '2026-03-06', rules: ONE_A_WEEK });
    expect(paused.status).toBe('paused');
    expect(paused.current).toBe(2);
    expect(paused.pausedSince).toBe('2026-03-05');

    const resumed = streak({ activeDays: march(2, 3, 7), today: '2026-03-07', rules: ONE_A_WEEK });
    expect(resumed.status).toBe('active');
    expect(resumed.current).toBe(3);
    expect(resumed.pausedSince).toBeNull();
    expect(resumed.jokerDays).toEqual(['2026-03-04']);
  });

  it('starts over once a pause outlasts resumeWithinDays', () => {
    const rules: StreakRules = { ...NO_JOKERS, resumeWithinDays: 3 };
    // Paused on 4; 5, 6 within grace; on 7 the pause expires.
    const within = streak({ activeDays: march(2, 3, 6), today: '2026-03-06', rules });
    expect(within.current).toBe(3);
    const expired = streak({ activeDays: march(2, 3, 7), today: '2026-03-07', rules });
    expect(expired.current).toBe(1);
    expect(expired.best).toBe(2);
    expect(expired.status).toBe('active');
    const idle = streak({ activeDays: march(2, 3), today: '2026-03-20', rules });
    expect(idle.current).toBe(0);
    expect(idle.best).toBe(2);
    expect(idle.status).toBe('paused');
    expect(idle.pausedSince).toBeNull();
  });

  it('resets immediately when resumeWithinDays is 0', () => {
    const rules: StreakRules = { ...NO_JOKERS, resumeWithinDays: 0 };
    const s = streak({ activeDays: march(2, 3, 5), today: '2026-03-05', rules });
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });

  it('adds the weekly allowance at each week start, capped by maxJokers', () => {
    const rules: StreakRules = { jokersPerWeek: 1, maxJokers: 2 };
    // Active every day from Mon 2 to Sat 21: three week starts (2, 9, 16) → bank 1, 2, 2.
    const s = streak({ activeDays: march(...range(2, 21)), today: '2026-03-21', rules });
    expect(s.jokersLeft).toBe(2);
    expect(s.current).toBe(20);
    // Sunday week start.
    const sunday = streak({
      activeDays: march(...range(2, 8)),
      today: '2026-03-08',
      rules: { ...rules, weekStartsOn: 0 },
    });
    expect(sunday.jokersLeft).toBe(2);
  });

  it('recovers a spent joker after the recovery time', () => {
    const rules: StreakRules = { jokersPerWeek: 0, maxJokers: 1, earnJokerAfterRestDays: 3 };
    // Without a weekly allowance nothing is available at first.
    expect(streak({ activeDays: march(2, 3), today: '2026-03-05', rules }).status).toBe('paused');

    const withStart: StreakRules = { ...rules, jokersPerWeek: 1 };
    // 2 active, 3 joker (recovers on 6), 4–5 active, 6 recovered, 7 missed → joker again.
    const s = streak({ activeDays: march(2, 4, 5, 6, 8), today: '2026-03-08', rules: withStart });
    expect(s.jokerDays).toEqual(['2026-03-03', '2026-03-07']);
    expect(s.current).toBe(5);
    expect(s.status).toBe('active');
    // Without recovery the second miss would pause the streak.
    const none = streak({
      activeDays: march(2, 4, 5, 6, 8),
      today: '2026-03-08',
      rules: { jokersPerWeek: 1, maxJokers: 1 },
    });
    expect(none.jokerDays).toEqual(['2026-03-03']);
    expect(none.current).toBe(5);
    expect(none.status).toBe('active');
    expect(none.best).toBe(5);
  });

  it('keeps the best streak across separate runs', () => {
    const days = [...march(...range(1, 6)), ...march(20, 21)];
    const s = streak({ activeDays: days, today: '2026-03-21', rules: NO_JOKERS });
    expect(s.best).toBe(6);
    expect(s.current).toBe(2);
  });

  it('ignores days after today and validates input', () => {
    const s = streak({ activeDays: march(2, 9), today: '2026-03-02', rules: NO_JOKERS });
    expect(s.current).toBe(1);
    expect(() =>
      streak({ activeDays: ['2026-02-30'], today: '2026-03-02', rules: NO_JOKERS }),
    ).toThrow(RangeError);
    expect(() => streak({ activeDays: [], today: 'tomorrow', rules: NO_JOKERS })).toThrow(
      RangeError,
    );
    const bad = (rules: StreakRules) => () =>
      streak({ activeDays: [], today: '2026-03-02', rules });
    expect(bad({ jokersPerWeek: -1, maxJokers: 1 })).toThrow(RangeError);
    expect(bad({ jokersPerWeek: 1, maxJokers: 1.5 })).toThrow(RangeError);
    expect(bad({ jokersPerWeek: 1, maxJokers: 1, earnJokerAfterRestDays: 0 })).toThrow(RangeError);
    expect(bad({ jokersPerWeek: 1, maxJokers: 1, weekStartsOn: 7 })).toThrow(RangeError);
    expect(bad({ jokersPerWeek: 1, maxJokers: 1, resumeWithinDays: -1 })).toThrow(RangeError);
  });
});

describe('activeDays', () => {
  it('collects local days with creative focus or completions', () => {
    const tasks = [
      task({ mode: 'create', timeLogs: [focus(at(2026, 3, 2, 23, 30), 60)] }), // spans midnight
      done(at(2026, 3, 5, 10), { mode: 'create' }),
      task({ mode: 'organize', timeLogs: [focus(at(2026, 3, 6, 9), 60)] }),
    ];
    expect(activeDays({ tasks, timeZone: TZ })).toEqual(['2026-03-02', '2026-03-03', '2026-03-05']);
    expect(activeDays({ tasks, timeZone: TZ, mode: 'any' })).toContain('2026-03-06');
    expect(activeDays({ tasks, timeZone: TZ, mode: 'organize' })).toEqual(['2026-03-06']);
  });

  it('applies the focus threshold per local day', () => {
    const tasks = [task({ timeLogs: [focus(at(2026, 3, 2, 23, 50), 30)] })];
    expect(activeDays({ tasks, timeZone: TZ, minFocusMin: 15 })).toEqual(['2026-03-03']);
    expect(activeDays({ tasks, timeZone: 'UTC', minFocusMin: 15 })).toEqual(['2026-03-02']);
    expect(() => activeDays({ tasks, timeZone: TZ, minFocusMin: -1 })).toThrow(RangeError);
  });

  it('feeds streak()', () => {
    const tasks = [2, 3, 4].map((d) => done(at(2026, 3, d, 18)));
    const s = streak({
      activeDays: activeDays({ tasks, timeZone: TZ }),
      today: '2026-03-04',
      rules: NO_JOKERS,
    });
    expect(s.current).toBe(3);
  });
});
