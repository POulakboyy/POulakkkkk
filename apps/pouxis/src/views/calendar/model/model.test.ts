import { describe, expect, it, beforeEach } from 'vitest';
import {
  DAY,
  DEFAULT_PREFS,
  HOUR,
  MINUTE,
  fromZoned,
  scheduler,
  type CalendarEvent,
  type Task,
} from '@pouxis/core';
import { applyGesture, drawSlot, keyCommand, minutesAt, snap } from './drag.ts';
import { asEvent, expandEvents } from './expand.ts';
import { eventLink, parseEventLink } from './deepLink.ts';
import { buffersAround, reviewMeeting } from './guard.ts';
import { heatLevel } from './heat.ts';
import { daySpan, layoutDay } from './layout.ts';
import { readStored, writeStored } from './persist.ts';
import { inMonth, isoWeek, spanOf, stepAnchor, visibleDays } from './range.ts';
import { loadSnapshot, planItems, saveSnapshot, summarize } from './snapshots.ts';
import { arcPath, fitSpiral, pointAt, timeAt } from './spiral.ts';
import { formatOffset, offsetFrom, sharedWindow, zoneCity, zoneHours } from './zones.ts';

const TZ = 'Europe/Paris';
const at = (day: number, hour: number, minute = 0, month = 11) =>
  fromZoned({ year: 2026, month, day, hour, minute }, TZ);

function event(id: string, start: number, end: number, extra: Partial<CalendarEvent> = {}) {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    title: id,
    start,
    end,
    timeZone: TZ,
    fixed: false,
    kind: 'meeting',
    attendees: [],
    tags: [],
    ...extra,
  } satisfies CalendarEvent;
}

describe('range', () => {
  it('lists the days of each mode, weeks starting on Monday', () => {
    const wed = at(4, 15);
    expect(visibleDays(wed, 'day', TZ)).toEqual([at(4, 0)]);
    const week = visibleDays(wed, 'week', TZ);
    expect(week).toHaveLength(7);
    expect(week[0]).toBe(at(2, 0));
    const month = visibleDays(wed, 'month', TZ);
    expect(month).toHaveLength(42);
    expect(month[0]).toBe(at(26, 0, 0, 10));
  });

  it('keeps 24 h steps across the end of daylight saving time', () => {
    const days = visibleDays(at(28, 12, 0, 10), 'week', TZ);
    const span = spanOf(days, TZ);
    // Week of 26 October 2026 holds no DST change; the one of 25 October does.
    expect(span.end - span.start).toBe(7 * DAY);
    const dstWeek = spanOf(visibleDays(at(21, 12, 0, 10), 'week', TZ), TZ);
    expect(dstWeek.end - dstWeek.start).toBe(7 * DAY + HOUR);
  });

  it('steps by day, week and month, clamping the day of month', () => {
    expect(stepAnchor(at(4, 9), 'day', 1, TZ)).toBe(at(5, 9));
    expect(stepAnchor(at(4, 9), 'week', -1, TZ)).toBe(at(28, 9, 0, 10));
    const jan31 = fromZoned({ year: 2026, month: 1, day: 31 }, TZ);
    expect(stepAnchor(jan31, 'month', 1, TZ)).toBe(
      fromZoned({ year: 2026, month: 2, day: 28 }, TZ),
    );
  });

  it('computes ISO week numbers and month membership', () => {
    expect(isoWeek(at(4, 12), TZ)).toBe(45);
    expect(isoWeek(fromZoned({ year: 2027, month: 1, day: 1 }, TZ), TZ)).toBe(53);
    expect(inMonth(at(30, 0, 0, 10), at(4, 0), TZ)).toBe(false);
  });
});

describe('expandEvents', () => {
  const range = { start: at(2, 0), end: at(9, 0) };

  it('keeps single events overlapping the range', () => {
    const inside = event('a', at(3, 10), at(3, 11));
    const outside = event('b', at(10, 10), at(10, 11));
    expect(expandEvents([inside, outside], range, 'fr').map((i) => i.key)).toEqual(['a']);
  });

  it('expands a recurrence rule from the event start, keeping its duration', () => {
    const standup = event('s', at(2, 9, 30), at(2, 9, 45), { recurrence: 'tous les jours ouvrés' });
    const instances = expandEvents([standup], range, 'fr');
    expect(instances).toHaveLength(5);
    expect(instances[4]?.start).toBe(at(6, 9, 30));
    expect(instances.every((i) => i.end - i.start === 15 * MINUTE && i.recurring)).toBe(true);
    expect(new Set(instances.map((i) => i.key)).size).toBe(5);
    expect(asEvent(instances[1]!).start).toBe(at(3, 9, 30));
  });

  it('includes an occurrence that started before the range and still runs', () => {
    const night = event('n', at(1, 23), at(2, 1), { recurrence: 'FREQ=DAILY' });
    expect(expandEvents([night], range, 'fr')[0]?.start).toBe(at(1, 23));
  });

  it('shows an event with an unparsable rule once', () => {
    const odd = event('o', at(4, 10), at(4, 11), { recurrence: 'quand ça me chante' });
    expect(expandEvents([odd], range, 'fr').map((i) => i.key)).toEqual(['o']);
  });
});

describe('layoutDay', () => {
  const day = { start: at(4, 0), end: at(5, 0) };
  const instance = (id: string, s: number, e: number) => ({
    key: id,
    event: event(id, s, e),
    start: s,
    end: e,
    recurring: false,
  });

  it('places side-by-side lanes for overlaps and resets lanes per cluster', () => {
    const placed = layoutDay(
      [
        instance('a', at(4, 9), at(4, 11)),
        instance('b', at(4, 10), at(4, 12)),
        instance('c', at(4, 14), at(4, 15)),
      ],
      day.start,
      day.end,
      TZ,
    );
    const byId = Object.fromEntries(placed.map((p) => [p.instance.key, p]));
    expect(byId.a).toMatchObject({ top: 540, height: 120, lane: 0, lanes: 2 });
    expect(byId.b).toMatchObject({ lane: 1, lanes: 2 });
    expect(byId.c).toMatchObject({ lane: 0, lanes: 1 });
  });

  it('widens an event over free lanes to its right', () => {
    const placed = layoutDay(
      [
        instance('long', at(4, 8), at(4, 12)),
        instance('x', at(4, 9), at(4, 10)),
        instance('y', at(4, 9), at(4, 10)),
        instance('late', at(4, 11), at(4, 12)),
      ],
      day.start,
      day.end,
      TZ,
    );
    const byId = Object.fromEntries(placed.map((p) => [p.instance.key, p]));
    expect(byId.long).toMatchObject({ lane: 0, lanes: 3, span: 1 });
    expect(byId.x).toMatchObject({ lane: 1, span: 1 });
    expect(byId.y).toMatchObject({ lane: 2, span: 1 });
    expect(byId.late).toMatchObject({ lane: 1, span: 2 });
  });

  it('clips events crossing midnight', () => {
    expect(daySpan(at(3, 22), at(4, 2), day.start, day.end, TZ)).toEqual({ top: 0, bottom: 120 });
    const [late] = layoutDay([instance('x', at(4, 23), at(5, 1))], day.start, day.end, TZ);
    expect(late).toMatchObject({ top: 1380, height: 60, clippedEnd: true });
  });
});

describe('drag geometry', () => {
  it('snaps and converts pixels to minutes', () => {
    expect(snap(52)).toBe(45);
    expect(minutesAt(90, 60)).toBe(90);
    expect(minutesAt(-10, 60)).toBe(0);
  });

  it('moves within the day and the visible columns', () => {
    const slot = { day: 1, startMin: 600, endMin: 660 };
    expect(applyGesture('move', slot, 37, 1, 7)).toEqual({ day: 2, startMin: 630, endMin: 690 });
    expect(applyGesture('move', slot, 2000, 9, 7)).toEqual({
      day: 6,
      startMin: 1380,
      endMin: 1440,
    });
  });

  it('resizes without going under 15 minutes', () => {
    const slot = { day: 0, startMin: 600, endMin: 660 };
    expect(applyGesture('resize-end', slot, -120, 0, 1).endMin).toBe(615);
    expect(applyGesture('resize-start', slot, -30, 0, 1).startMin).toBe(570);
    expect(applyGesture('resize-start', slot, 90, 0, 1).startMin).toBe(645);
  });

  it('draws a slot in both directions', () => {
    expect(drawSlot(0, 600, 540)).toEqual({ day: 0, startMin: 540, endMin: 600 });
    expect(drawSlot(0, 600, 602)).toEqual({ day: 0, startMin: 600, endMin: 615 });
    expect(drawSlot(0, 1439, 1440)).toEqual({ day: 0, startMin: 1425, endMin: 1440 });
  });

  it('maps keys to gestures', () => {
    const none = { shiftKey: false, altKey: false };
    expect(keyCommand('ArrowDown', none)).toEqual({ gesture: 'move', deltaMin: 15, deltaDay: 0 });
    expect(keyCommand('ArrowUp', { shiftKey: true, altKey: false })?.gesture).toBe('resize-end');
    expect(keyCommand('ArrowUp', { shiftKey: true, altKey: true })?.gesture).toBe('resize-start');
    expect(keyCommand('ArrowRight', none)).toEqual({ gesture: 'move', deltaMin: 0, deltaDay: 1 });
    expect(keyCommand('Enter', none)).toBeNull();
  });
});

describe('spiral', () => {
  const g = fitSpiral({ size: 400, turnMs: DAY, alignTo: at(4, 0), pastTurns: 2, turns: 5 });

  it('starts at twelve o’clock and runs clockwise', () => {
    const origin = pointAt(g.origin, g);
    expect(origin.x).toBeCloseTo(200);
    expect(origin.y).toBeLessThan(200);
    const quarter = pointAt(g.origin + DAY / 4, g);
    expect(quarter.x).toBeGreaterThan(200);
    expect(quarter.y).toBeCloseTo(200);
  });

  it('inverts positions back to instants', () => {
    const t = at(4, 15, 30);
    const p = pointAt(t, g);
    expect(timeAt(p.x, p.y, g)).toBeCloseTo(t, -3);
    expect(timeAt(200, 200, g)).toBeNull();
  });

  it('draws arcs clipped to the spiral', () => {
    expect(arcPath(at(4, 10), at(4, 11), g)).toMatch(/^M[\d.]+ [\d.]+( L[\d.]+ [\d.]+)+$/);
    expect(arcPath(at(20, 10), at(20, 11), g)).toBe('');
  });
});

describe('zones', () => {
  const hours = DEFAULT_PREFS.workingHours;

  it('names, offsets and formats zones', () => {
    expect(zoneCity('America/New_York')).toBe('New York');
    expect(offsetFrom('America/New_York', TZ, at(4, 12))).toBe(-360);
    expect(offsetFrom('Asia/Kolkata', TZ, at(4, 12))).toBe(270);
    expect(formatOffset(-360)).toBe('−6 h');
    expect(formatOffset(270)).toBe('+4 h 30');
    expect(formatOffset(0)).toBe('');
  });

  it('aligns a zone hour by hour on the local day', () => {
    const cells = zoneHours(at(4, 0), TZ, 'America/New_York', hours);
    expect(cells).toHaveLength(24);
    expect(cells[15]).toMatchObject({ hour: 9, kind: 'work' });
    expect(cells[3]).toMatchObject({ hour: 21, kind: 'day' });
    expect(cells[6]).toMatchObject({ hour: 0, newDate: true, kind: 'night' });
  });

  it('intersects working hours across zones', () => {
    const day = { start: at(4, 0), end: at(5, 0) };
    expect(sharedWindow(day, [TZ, 'America/New_York'], hours)).toEqual({
      start: at(4, 15),
      end: at(4, 18),
    });
    expect(sharedWindow(day, [TZ, 'America/Los_Angeles', 'Asia/Tokyo'], hours)).toBeNull();
    const saturday = { start: at(7, 0), end: at(8, 0) };
    expect(sharedWindow(saturday, [TZ], hours)).toBeNull();
  });
});

describe('heatLevel', () => {
  it('bins values onto five levels', () => {
    expect([0, 0.19, 0.2, 0.55, 0.99, 1, 7, Number.NaN].map(heatLevel)).toEqual([
      0, 0, 1, 2, 4, 4, 4, 0,
    ]);
  });
});

describe('deep links', () => {
  it('round-trips ids', () => {
    expect(eventLink('ab c')).toBe('pouxis://event/ab%20c');
    expect(parseEventLink(eventLink('ab c'))).toBe('ab c');
    expect(parseEventLink('POUXIS://event/x?y=1')).toBe('x');
    expect(parseEventLink('https://example.com')).toBeNull();
    expect(parseEventLink('pouxis://event/')).toBeNull();
    expect(parseEventLink('pouxis://event/%E0%A4%A')).toBeNull();
  });
});

describe('meeting review', () => {
  const prefs = { ...DEFAULT_PREFS, timeZone: TZ };

  it('flags a meeting that splits the only maker block and suggests alternatives', () => {
    const events = [event('am', at(4, 9), at(4, 10)), event('pm', at(4, 15), at(4, 18))];
    const review = reviewMeeting({
      candidate: { start: at(4, 12), end: at(4, 13) },
      kind: 'meeting',
      events,
      prefs,
      now: at(1, 0),
    });
    expect(review.maker?.ok).toBe(false);
    expect(review.maker?.code).toBe('fragments-maker-block');
    expect(review.alternatives.length).toBeGreaterThan(0);
  });

  it('never flags non-meetings', () => {
    const review = reviewMeeting({
      candidate: { start: at(4, 12), end: at(4, 13) },
      kind: 'focus',
      events: [],
      prefs,
      now: 0,
    });
    expect(review).toEqual({ maker: null, alternatives: [], buffers: [] });
  });

  it('proposes buffers between back-to-back meetings', () => {
    const before = event('before', at(4, 10), at(4, 11));
    const drafts = buffersAround({ start: at(4, 11), end: at(4, 12) }, [before], prefs);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ kind: 'buffer', start: at(4, 11) });
    const after = buffersAround({ start: at(4, 9), end: at(4, 10) }, [before], prefs);
    expect(after[0]?.start).toBe(at(4, 10));
  });
});

describe('snapshots', () => {
  beforeEach(() => localStorage.clear());

  it('persists per week and survives malformed storage', () => {
    const snap = scheduler.snapshot([event('a', at(4, 9), at(4, 10))], at(2, 8));
    saveSnapshot(at(2, 0), snap);
    expect(loadSnapshot(at(2, 0))).toEqual(snap);
    expect(loadSnapshot(at(9, 0))).toBeNull();
    localStorage.setItem('pouxis.calendar.broken', '{nope');
    expect(readStored('broken', 1, () => true)).toBe(1);
    writeStored('n', 3);
    expect(readStored('n', 0, (v) => typeof v === 'number')).toBe(3);
  });

  it('summarises a planned vs actual comparison', () => {
    const range = { start: at(2, 0), end: at(9, 0) };
    const task: Task = {
      id: 't',
      createdAt: 0,
      updatedAt: 0,
      title: 'Write',
      status: 'todo',
      priority: 1,
      tags: [],
      dependsOn: [],
      mode: 'create',
      postponedCount: 0,
      timeLogs: [],
      scheduled: { start: at(3, 9), end: at(3, 10) },
    };
    const series = event('s', at(2, 9), at(2, 9, 30), { recurrence: 'FREQ=DAILY;COUNT=2' });
    const single = event('x', at(4, 14), at(4, 15));
    const plannedItems = planItems(expandEvents([series, single], range, 'fr'), [task], range, TZ);
    expect(plannedItems.map((i) => i.id)).toContain('s@2026-11-03');
    const planned = scheduler.snapshot(plannedItems, at(2, 8));

    const moved = { ...single, start: at(4, 16), end: at(4, 17) };
    const actualItems = planItems(
      expandEvents([series, moved, event('new', at(5, 9), at(5, 10))], range, 'fr'),
      [],
      range,
      TZ,
    );
    const actual = scheduler.snapshot(actualItems, at(6, 20));
    const summary = summarize(planned, scheduler.compareSnapshots(planned, actual));
    expect(summary).toMatchObject({ kept: 2, moved: 1, added: 1, removed: 1 });
  });
});
