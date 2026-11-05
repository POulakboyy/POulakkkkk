import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS,
  HOUR,
  MINUTE,
  atMinutes,
  endOfDay,
  startOfDay,
  type CalendarEvent,
  type Task,
} from '@pouxis/core';
import {
  bufferItems,
  categorySlot,
  currentItem,
  dayItems,
  dayWindow,
  energyWord,
  findOverrun,
  floatingTasks,
  focusMinutes,
  freeGaps,
  greetingPeriod,
  heatLevel,
  hourMarks,
  layoutLanes,
  overrunEnd,
  workingInterval,
  type TimelineItem,
} from './model.ts';

const TZ = 'Europe/Paris';
const prefs = { ...DEFAULT_PREFS, timeZone: TZ };
// Thursday 5 November 2026, Paris (UTC+1).
const DAY0 = startOfDay(Date.UTC(2026, 10, 5, 12), TZ);
const day = { start: DAY0, end: endOfDay(DAY0, TZ) };
const at = (h: number, m = 0) => atMinutes(DAY0, h * 60 + m, TZ);

function task(id: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    title: id,
    status: 'todo',
    priority: 2,
    tags: [],
    dependsOn: [],
    mode: 'organize',
    postponedCount: 0,
    timeLogs: [],
    ...extra,
  };
}

function event(id: string, start: number, end: number, extra: Partial<CalendarEvent> = {}) {
  const e: CalendarEvent = {
    id,
    createdAt: 0,
    updatedAt: 0,
    title: id,
    start,
    end,
    timeZone: TZ,
    fixed: true,
    kind: 'meeting',
    attendees: [],
    tags: [],
    ...extra,
  };
  return e;
}

describe('categorySlot', () => {
  it('wraps any number onto the 8 slots and falls back when missing', () => {
    expect(categorySlot(undefined, 3)).toBe(3);
    expect(categorySlot(9, 1)).toBe(1);
    expect(categorySlot(0, 1)).toBe(8);
    expect(categorySlot(Number.NaN, 2)).toBe(2);
  });
});

describe('dayItems', () => {
  it('lists events and scheduled tasks of the day, chronologically', () => {
    const items = dayItems(
      [
        task('late', { scheduled: { start: at(15), end: at(16) } }),
        task('tomorrow', { scheduled: { start: at(33), end: at(34) } }),
        task('archived', { status: 'archived', scheduled: { start: at(9), end: at(10) } }),
      ],
      [event('standup', at(9), at(9, 15))],
      day,
    );
    expect(items.map((i) => i.id)).toEqual(['standup', 'late']);
    expect(items[0]).toMatchObject({ kind: 'event', icon: '💬', color: 4, fixed: true });
  });

  it('shows a time-blocked task once, as its event, carrying the task', () => {
    const t = task('write', { status: 'done', scheduled: { start: at(10), end: at(11) } });
    const items = dayItems(
      [t],
      [event('block', at(10), at(11), { kind: 'focus', taskId: 'write' })],
      day,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'block', done: true, task: t });
  });
});

describe('floatingTasks', () => {
  it('keeps open unscheduled tasks of the day, by priority', () => {
    const tasks = [
      task('low', { floatingDay: DAY0, priority: 1 }),
      task('high', { floatingDay: DAY0, priority: 3 }),
      task('done', { floatingDay: DAY0, status: 'done' }),
      task('placed', { floatingDay: DAY0, scheduled: { start: at(9), end: at(10) } }),
      task('tomorrow', { floatingDay: DAY0 + 24 * HOUR }),
    ];
    expect(floatingTasks(tasks, day).map((t) => t.id)).toEqual(['high', 'low']);
  });
});

describe('layoutLanes', () => {
  it('puts overlapping items side by side and resets after a cluster', () => {
    const items = [
      { id: 'a', start: at(9), end: at(10) },
      { id: 'b', start: at(9, 30), end: at(11) },
      { id: 'c', start: at(10), end: at(10, 30) },
      { id: 'd', start: at(12), end: at(13) },
    ] as TimelineItem[];
    const lanes = layoutLanes(items);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get('c')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('d')).toEqual({ lane: 0, lanes: 1 });
  });
});

describe('dayWindow and hours', () => {
  it('spans working hours widened to items and now, on whole hours', () => {
    const w = dayWindow(day, [{ start: at(8, 30), end: at(9) }], prefs, TZ, at(19, 10));
    expect(w).toEqual({ start: at(8), end: at(20), work: { start: at(9), end: at(18) } });
    expect(hourMarks(w, TZ)).toHaveLength(13);
  });

  it('has no working interval on a day off', () => {
    const saturday = DAY0 + 2 * 24 * HOUR;
    expect(workingInterval(saturday, prefs, TZ)).toBeUndefined();
    const w = dayWindow({ start: saturday, end: saturday + 24 * HOUR }, [], prefs, TZ);
    expect(w.work).toBeUndefined();
    expect(freeGaps(w, [], saturday)).toEqual([]);
  });
});

describe('freeGaps', () => {
  it('returns working gaps of 30 min or more after now', () => {
    const w = dayWindow(day, [], prefs, TZ);
    const busy = [
      { start: at(10), end: at(11) },
      { start: at(11, 15), end: at(17) },
    ];
    expect(freeGaps(w, busy, at(9, 30))).toEqual([
      { start: at(9, 30), end: at(10) },
      { start: at(17), end: at(18) },
    ]);
  });
});

describe('overrun', () => {
  const items = dayItems(
    [
      task('a', { scheduled: { start: at(9), end: at(10) } }),
      task('b', { scheduled: { start: at(10), end: at(11) }, status: 'done' }),
    ],
    [],
    day,
  );

  it('finds the open task whose slot just ended', () => {
    expect(findOverrun(items, at(10, 20))?.id).toBe('a');
    expect(findOverrun(items, at(9, 50))).toBeUndefined();
    expect(findOverrun(items, at(12))).toBeUndefined();
    expect(findOverrun(items, at(10, 20), new Set(['a']))).toBeUndefined();
  });

  it('proposes a new end on a 5-minute grid', () => {
    expect(overrunEnd(at(10, 2), 15)).toBe(at(10, 20));
  });
});

describe('small helpers', () => {
  it('buckets energy and names it', () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(0.99)).toBe(4);
    expect(heatLevel(Number.NaN)).toBe(0);
    expect(energyWord(4)).toBe('high');
    expect(energyWord(2)).toBe('medium');
    expect(energyWord(0)).toBe('low');
  });

  it('greets by part of the day', () => {
    expect(greetingPeriod(at(8), TZ)).toBe('morning');
    expect(greetingPeriod(at(14), TZ)).toBe('afternoon');
    expect(greetingPeriod(at(21), TZ)).toBe('evening');
  });

  it('counts focus minutes and finds the current item', () => {
    const items = [
      ...dayItems([task('t', { scheduled: { start: at(9), end: at(10) } })], [], day),
      ...bufferItems([
        {
          title: 'Pause',
          start: at(10),
          end: at(10, 10),
          timeZone: TZ,
          fixed: false,
          kind: 'buffer',
          attendees: [],
          tags: [],
        },
      ]),
    ];
    expect(focusMinutes(items)).toBe(60);
    expect(currentItem(items, at(9, 30))?.id).toBe('t');
    expect(currentItem(items, at(10, 5))).toBeUndefined();
    expect(items[1]).toMatchObject({ virtual: true, kind: 'buffer', id: `buffer:${at(10)}` });
    expect(MINUTE).toBe(60_000);
  });
});
