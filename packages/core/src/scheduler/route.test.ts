import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Interval, Task, UserPrefs } from '../model.ts';
import { HOUR, MINUTE, fromZoned, overlaps, zonedParts } from '../time.ts';
import { route } from './route.ts';
import type { RouteInput } from './types.ts';
import { UTC_PREFS, at, event, rng, task } from './fixtures.test-utils.ts';

const WEEK: Interval = { start: at(2, 0), end: at(7, 0) };
const NOW = at(2, 8);

function run(tasks: Task[], events: CalendarEvent[] = [], extra: Partial<RouteInput> = {}) {
  return route({ tasks, events, prefs: UTC_PREFS, range: WEEK, now: NOW, ...extra });
}

/** Peak at 15:00–16:00, trough at 9:00–10:00. */
const ENERGY = Array.from({ length: 24 }, (_, h) => (h === 15 ? 1 : h === 9 ? 0 : 0.5));

describe('route — basics', () => {
  it('places a task at the start of working hours with the default 30 min estimate', () => {
    const r = run([task('a')]);
    expect(r.placements).toEqual([
      { taskId: 'a', start: at(2, 9), end: at(2, 9, 30), reason: 'earliest' },
    ]);
    expect(r.unplaced).toEqual([]);
  });

  it('never places in the past', () => {
    const r = run([task('a')], [], { now: at(2, 10, 7) });
    expect(r.placements[0]?.start).toBe(at(2, 10, 10));
  });

  it('avoids events and slots of pinned or already-scheduled tasks', () => {
    const r = run(
      [
        task('pinned', { pinned: true, scheduled: { start: at(2, 10), end: at(2, 11) } }),
        task('a', { estimateMin: 60 }),
      ],
      [event('m', at(2, 9), at(2, 10))],
    );
    expect(r.placements).toEqual([
      { taskId: 'a', start: at(2, 11), end: at(2, 12), reason: 'earliest' },
    ]);
  });

  it('skips inbox, done, pinned, floating, time-blocked and parent tasks', () => {
    const r = run(
      [
        task('inbox', { status: 'inbox' }),
        task('done', { status: 'done' }),
        task('pinned', { pinned: true }),
        task('floating', { floatingDay: at(3, 0) }),
        task('blocked-by-event'),
        task('parent'),
        task('child', { parentId: 'parent' }),
      ],
      [event('block', at(4, 9), at(4, 10), { taskId: 'blocked-by-event', kind: 'focus' })],
    );
    expect(r.placements.map((p) => p.taskId)).toEqual(['child']);
  });

  it('orders by deadline, then priority, then age', () => {
    const r = run([
      task('old-low', { createdAt: 1 }),
      task('young-low', { createdAt: 2 }),
      task('high', { priority: 3, createdAt: 3 }),
      task('due', { deadline: at(6, 18), createdAt: 4 }),
    ]);
    expect(r.placements.map((p) => p.taskId)).toEqual(['due', 'high', 'old-low', 'young-low']);
  });

  it('reports tasks with open dependencies as blocked and routes them once done', () => {
    const dep = task('dep');
    const t = task('t', { dependsOn: ['dep'] });
    expect(run([dep, t]).unplaced).toEqual([{ taskId: 't', reason: 'blocked' }]);
    const r = run([{ ...dep, status: 'done', completedAt: NOW }, t]);
    expect(r.placements.map((p) => p.taskId)).toEqual(['t']);
  });

  it('distinguishes too-long from no-slot', () => {
    const r = run([task('huge', { estimateMin: 10 * 60 })]);
    expect(r.unplaced).toEqual([{ taskId: 'huge', reason: 'too-long' }]);
    const busy = [event('all', WEEK.start, WEEK.end)];
    expect(run([task('a')], busy).unplaced).toEqual([{ taskId: 'a', reason: 'no-slot' }]);
  });

  it('warns when working hours are empty', () => {
    const prefs: UserPrefs = { ...UTC_PREFS, workingHours: { start: 540, end: 540, days: [1] } };
    const r = run([task('a')], [], { prefs });
    expect(r.warnings).toContainEqual({ kind: 'no-working-hours' });
    expect(r.unplaced).toEqual([{ taskId: 'a', reason: 'no-slot' }]);
  });
});

describe('route — deadlines and splitting', () => {
  it('splits a task too long for any gap into chunks of at least 25 min', () => {
    const events = [event('m1', at(2, 11), at(2, 12)), event('m2', at(2, 14), at(2, 15))];
    const r = run([task('big', { estimateMin: 9 * 60 - 120 })], events, {
      options: { split: true },
      range: { start: at(2, 0), end: at(3, 0) },
    });
    expect(r.placements.map((p) => [p.start, p.end, p.reason, p.chunk])).toEqual([
      [at(2, 9), at(2, 11), 'split', { index: 0, count: 3 }],
      [at(2, 12), at(2, 14), 'split', { index: 1, count: 3 }],
      [at(2, 15), at(2, 18), 'split', { index: 2, count: 3 }],
    ]);
  });

  it('never leaves a chunk shorter than the minimum', () => {
    const events = [event('m', at(2, 9, 20), at(2, 10))];
    const r = run([task('t', { estimateMin: 60 })], events, {
      options: { split: true },
      range: { start: at(2, 0), end: at(3, 0) },
    });
    // The 20 min gap before the meeting is too short: the task goes whole after it.
    expect(r.placements).toEqual([
      { taskId: 't', start: at(2, 10), end: at(2, 11), reason: 'earliest' },
    ]);
  });

  it('splits to meet a deadline that the whole task would miss', () => {
    const events = [event('m', at(2, 10), at(2, 11))];
    const t = task('t', { estimateMin: 120, deadline: at(2, 12) });
    const r = run([t], events, { options: { split: true } });
    expect(r.placements.map((p) => [p.start, p.end])).toEqual([
      [at(2, 9), at(2, 10)],
      [at(2, 11), at(2, 12)],
    ]);
    expect(r.warnings).toEqual([]);
  });

  it('flags a placement that ends after the deadline', () => {
    const t = task('t', { estimateMin: 60, deadline: at(2, 9, 30) });
    const r = run([t]);
    expect(r.placements[0]?.reason).toBe('deadline');
    expect(r.warnings).toContainEqual({
      kind: 'deadline-missed',
      taskId: 't',
      deadline: at(2, 9, 30),
      end: at(2, 10),
    });
  });
});

describe('route — energy matching', () => {
  it('sends high-energy and creative tasks to peak hours of the earliest day', () => {
    const r = run([task('deep', { energy: 'high' }), task('idea', { mode: 'create' })], [], {
      energyProfile: ENERGY,
    });
    expect(r.placements.map((p) => [p.taskId, p.start, p.reason])).toEqual([
      ['deep', at(2, 15), 'energy'],
      ['idea', at(2, 15, 30), 'energy'],
    ]);
  });

  it('sends low-energy tasks to the trough and leaves neutral tasks earliest', () => {
    const r = run([task('admin', { energy: 'low' }), task('plain')], [], {
      energyProfile: ENERGY,
      now: at(2, 8),
    });
    expect(r.placements.map((p) => [p.taskId, p.start, p.reason])).toEqual([
      ['admin', at(2, 9), 'energy'],
      ['plain', at(2, 9, 30), 'earliest'],
    ]);
  });

  it('sends insight work off-peak when opted in', () => {
    const r = run([task('idea', { mode: 'create' })], [], {
      energyProfile: ENERGY,
      options: { insightOffPeak: true },
      now: at(2, 12),
    });
    // Without the option the task would take the 15:00 peak; off-peak, every remaining hour
    // but the peak scores 0.5 and the earliest wins.
    expect(r.placements[0]).toMatchObject({ start: at(2, 12), reason: 'insight-off-peak' });
  });

  it('ignores an invalid energy profile with a warning', () => {
    const r = run([task('deep', { energy: 'high' })], [], { energyProfile: [1, 2] });
    expect(r.warnings).toContainEqual({ kind: 'invalid-energy-profile' });
    expect(r.placements[0]?.reason).toBe('earliest');
  });

  it('keeps the deadline when energy would push past it', () => {
    const t = task('deep', { energy: 'high', deadline: at(2, 12) });
    const r = run([t], [], { energyProfile: ENERGY });
    expect(r.placements[0]?.end).toBeLessThanOrEqual(at(2, 12));
  });
});

describe('route — daily cap', () => {
  it('moves work to the next day once the cap is reached', () => {
    const tasks = [
      task('a', { estimateMin: 120, createdAt: 1 }),
      task('b', { estimateMin: 120, createdAt: 2 }),
    ];
    const r = run(tasks, [], { options: { dailyCapMin: 180 } });
    expect(r.placements.map((p) => [p.taskId, p.start])).toEqual([
      ['a', at(2, 9)],
      ['b', at(3, 9)],
    ]);
  });

  it('reports over-capacity and overloaded days', () => {
    const focus = event('focus', at(2, 9), at(2, 17), { kind: 'focus' });
    const r = run([task('a')], [focus], {
      options: { dailyCapMin: 360 },
      range: { start: at(2, 0), end: at(3, 0) },
    });
    expect(r.unplaced).toEqual([{ taskId: 'a', reason: 'over-capacity' }]);
    expect(r.warnings).toContainEqual({
      kind: 'overload',
      day: '2026-11-02',
      loadMin: 480,
      capMin: 360,
    });
  });
});

describe('route — local step grid', () => {
  it('snaps starts to the local clock in zones with a non-hour offset', () => {
    const tz = 'Asia/Kolkata';
    const prefs: UserPrefs = { ...UTC_PREFS, timeZone: tz };
    const input = (events: CalendarEvent[]): RouteInput => ({
      tasks: [task('a'), task('b', { createdAt: 1 })],
      events,
      prefs,
      range: { start: at(2, 0, 0, tz), end: at(3, 0, 0, tz) },
      now: at(2, 8, 50, tz),
      options: { granularityMin: 60 },
    });
    const starts = (events: CalendarEvent[]) => route(input(events)).placements.map((p) => p.start);
    expect(starts([])).toEqual([at(2, 9, 0, tz), at(2, 10, 0, tz)]);
    const busy = event('m', at(2, 9, 0, tz), at(2, 9, 10, tz));
    expect(starts([busy])).toEqual([at(2, 10, 0, tz), at(2, 11, 0, tz)]);
  });
});

describe('route — DST', () => {
  const paris: UserPrefs = {
    ...UTC_PREFS,
    timeZone: 'Europe/Paris',
    workingHours: { start: 60, end: 5 * 60, days: [0, 1, 2, 3, 4, 5, 6] },
  };
  const day = (d: number, h: number, m = 0) =>
    fromZoned({ year: 2026, month: 3, day: d, hour: h, minute: m }, 'Europe/Paris');

  it('uses the real length of a spring-forward window (01:00–05:00 is 3 h)', () => {
    const tasks = [1, 2, 3, 4].map((i) => task(`t${i}`, { estimateMin: 60, createdAt: i }));
    const r = route({
      tasks,
      events: [],
      prefs: paris,
      range: { start: day(29, 0), end: day(30, 0) },
      now: day(28, 0),
    });
    expect(r.placements).toHaveLength(3);
    expect(r.placements.map((p) => zonedParts(p.start, 'Europe/Paris').hour)).toEqual([1, 3, 4]);
    expect(r.unplaced).toEqual([{ taskId: 't4', reason: 'no-slot' }]);
  });

  it('uses the real length of a fall-back window (01:00–05:00 is 5 h)', () => {
    const fall = (h: number) =>
      fromZoned({ year: 2026, month: 10, day: 25, hour: h }, 'Europe/Paris');
    const tasks = [1, 2, 3, 4, 5].map((i) => task(`t${i}`, { estimateMin: 60, createdAt: i }));
    const r = route({
      tasks,
      events: [],
      prefs: paris,
      range: { start: fall(0), end: fall(0) + 25 * HOUR },
      now: fall(0) - HOUR,
    });
    expect(r.placements).toHaveLength(5);
    expect(r.placements.at(-1)?.end).toBe(fall(5));
  });
});

/* ------------------------------------------------------------------------------------------ */
/* Seeded properties                                                                           */
/* ------------------------------------------------------------------------------------------ */

function randomCase(seed: number): RouteInput {
  const rand = rng(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;
  const events: CalendarEvent[] = [];
  for (let i = 0; i < 12; i++) {
    const start = at(
      2 + Math.floor(rand() * 5),
      7 + Math.floor(rand() * 12),
      pick([0, 15, 30, 45]),
    );
    events.push(event(`e${i}`, start, start + pick([15, 30, 60, 90, 120]) * MINUTE));
  }
  const tasks: Task[] = [];
  for (let i = 0; i < 25; i++) {
    const patch: Partial<Task> = {
      createdAt: Math.floor(rand() * 1000),
      priority: pick([0, 1, 2, 3] as const),
      mode: pick(['create', 'organize'] as const),
      estimateMin: pick([undefined, 15, 25, 45, 60, 90, 180, 300]),
      energy: pick([undefined, 'low', 'medium', 'high'] as const),
    };
    if (rand() < 0.3) patch.deadline = at(2 + Math.floor(rand() * 5), 9 + Math.floor(rand() * 9));
    if (rand() < 0.15 && i > 0) patch.dependsOn = [`t${Math.floor(rand() * i)}`];
    if (rand() < 0.1) {
      const s = at(2 + Math.floor(rand() * 5), 9 + Math.floor(rand() * 8));
      patch.scheduled = { start: s, end: s + HOUR };
      patch.pinned = true;
    }
    tasks.push(task(`t${i}`, stripUndefined(patch)));
  }
  return {
    tasks,
    events,
    prefs: UTC_PREFS,
    range: WEEK,
    now: at(2, 7) + Math.floor(rand() * 8) * HOUR,
    energyProfile: rand() < 0.5 ? ENERGY : undefined,
    options: { split: rand() < 0.5, dailyCapMin: pick([undefined, 240, 360]) },
  } as RouteInput;
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

describe('route — seeded properties', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

  it.each(seeds)('seed %i: no overlap, inside working hours, after now, deterministic', (seed) => {
    const input = randomCase(seed);
    const r = route(input);
    const fixed: Interval[] = [
      ...input.events,
      ...input.tasks.flatMap((t) => (t.scheduled ? [t.scheduled] : [])),
    ];
    const sorted = [...r.placements].sort((a, b) => a.start - b.start);
    sorted.forEach((p, i) => {
      expect(p.end).toBeGreaterThan(p.start);
      expect(p.start).toBeGreaterThanOrEqual(input.now);
      expect(fixed.some((f) => overlaps(f, p))).toBe(false);
      const next = sorted[i + 1];
      if (next) expect(next.start).toBeGreaterThanOrEqual(p.end);
      const s = zonedParts(p.start, 'UTC');
      const e = zonedParts(p.end - 1, 'UTC');
      expect(s.day).toBe(e.day);
      expect([1, 2, 3, 4, 5]).toContain(s.weekday);
      expect(s.hour * 60 + s.minute).toBeGreaterThanOrEqual(9 * 60);
      expect(e.hour * 60 + e.minute).toBeLessThan(18 * 60);
    });
    for (const p of r.placements.filter((x) => x.reason === 'split')) {
      expect(p.end - p.start).toBeGreaterThanOrEqual(25 * MINUTE);
    }
    expect(route(input)).toEqual(r);
  });

  it.each(seeds)('seed %i: re-routing the result is idempotent', (seed) => {
    const input = randomCase(seed);
    const r = route(input);
    const whole = r.placements.filter((p) => p.chunk === undefined);
    const applied = input.tasks.map((t) => {
      const p = whole.find((x) => x.taskId === t.id);
      return p ? { ...t, scheduled: { start: p.start, end: p.end } } : t;
    });
    const again = route({ ...input, tasks: applied });
    expect(again.placements.filter((p) => whole.some((w) => w.taskId === p.taskId))).toEqual([]);
    const replanned = route({
      ...input,
      tasks: applied,
      options: { ...input.options, replan: true },
    });
    expect(replanned.placements).toEqual(r.placements);
  });
});
