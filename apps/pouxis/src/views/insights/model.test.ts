import { describe, expect, it } from 'vitest';
import { insights } from '@pouxis/core';
import { translate } from '../../i18n/index.ts';
import { demoRecords } from './fixtures.test-utils.ts';
import {
  STREAK_STRIP_DAYS,
  cellScale,
  computeInsights,
  dayKeyWeekday,
  dayNoon,
  heatLevel,
  isEmpty,
  stackSegments,
  streakStrip,
  suggestionMessage,
  weekdayNames,
} from './model.ts';

const TZ = 'Europe/Paris';
// Thursday 5 November 2026, 18:00 in Paris.
const NOW = Date.UTC(2026, 10, 5, 17);

describe('computeInsights', () => {
  const records = demoRecords(NOW, TZ);
  const model = computeInsights({ ...records, now: NOW, timeZone: TZ, weekOffset: 0 });

  it('frames the current ISO week (Monday to Monday)', () => {
    expect(new Date(model.week.start).toISOString()).toBe('2026-11-01T23:00:00.000Z');
    expect(model.week.end - model.week.start).toBe(7 * 24 * 3600 * 1000);
    expect(model.reviewReady).toBe(false);
  });

  it('feeds every section from the records', () => {
    expect(isEmpty(model)).toBe(false);
    expect(model.energy.peak).not.toBeNull();
    expect(model.balance.create).toBeGreaterThan(0);
    expect(model.streak.current).toBeGreaterThan(0);
    expect(model.strip).toHaveLength(STREAK_STRIP_DAYS);
    expect(model.skills.children.length).toBeGreaterThan(0);
    expect(model.blockers[0]).toMatchObject({
      label: 'Les réunions déborde sur la matinée de création',
      count: 3,
      thisWeek: 1,
    });
  });

  it('lists dormant threads and archive candidates, most idle first', () => {
    expect(model.deadEnds.map((d) => d.title)).toContain('Idée : une police pour les partitions');
    expect(model.archive.map((d) => d.title)).toEqual(['Ranger les vieux fichiers du NAS']);
    const idle = model.deadEnds.map((d) => d.idleDays);
    expect(idle).toEqual([...idle].sort((a, b) => b - a));
  });

  it('never moves into the future and flags Sunday as review day', () => {
    const later = computeInsights({ ...records, now: NOW, timeZone: TZ, weekOffset: 3 });
    expect(later.week.start).toBe(model.week.start);
    const previous = computeInsights({ ...records, now: NOW, timeZone: TZ, weekOffset: -1 });
    expect(model.week.start - previous.week.start).toBe(7 * 24 * 3600 * 1000);
    const sunday = Date.UTC(2026, 10, 8, 18);
    expect(
      computeInsights({ ...records, now: sunday, timeZone: TZ, weekOffset: 0 }).reviewReady,
    ).toBe(true);
  });

  it('is empty without records', () => {
    const empty = computeInsights({
      tasks: [],
      events: [],
      journal: [],
      notes: [],
      now: NOW,
      timeZone: TZ,
      weekOffset: 0,
    });
    expect(isEmpty(empty)).toBe(true);
  });
});

describe('streakStrip', () => {
  it('marks active, joker-covered and rest days, oldest first, today last', () => {
    const streak: insights.Streak = {
      current: 2,
      best: 2,
      jokersLeft: 0,
      jokerDays: ['2026-11-04'],
      status: 'active',
      pausedSince: null,
      lastActiveDay: '2026-11-05',
    };
    const strip = streakStrip(['2026-11-03', '2026-11-05'], streak, NOW, TZ, 4);
    expect(strip.map((d) => [d.day, d.state, d.today])).toEqual([
      ['2026-11-02', 'rest', false],
      ['2026-11-03', 'active', false],
      ['2026-11-04', 'joker', false],
      ['2026-11-05', 'active', true],
    ]);
  });
});

describe('chart helpers', () => {
  it('bins energy into the five heat tokens', () => {
    expect([0, 0.05, 0.2, 0.4, 0.7, 0.95].map(heatLevel)).toEqual([0, 0, 1, 2, 3, 4]);
    expect(heatLevel(Number.NaN)).toBe(0);
  });

  it('grows squares with confidence, never to nothing', () => {
    expect(cellScale(0)).toBeCloseTo(0.42);
    expect(cellScale(1)).toBe(1);
    expect(cellScale(2)).toBe(1);
    expect(cellScale(0.25)).toBeGreaterThan(cellScale(0.1));
  });

  it('stacks segments with gaps between visible ones only', () => {
    expect(stackSegments([1, 0, 1], 102, 2)).toEqual([
      { x: 0, width: 50 },
      { x: 52, width: 0 },
      { x: 52, width: 50 },
    ]);
    expect(stackSegments([0, 0], 100, 2)).toEqual([
      { x: 0, width: 0 },
      { x: 0, width: 0 },
    ]);
  });

  it('reads day keys without the machine zone', () => {
    expect(dayKeyWeekday('2026-11-08')).toBe(0);
    expect(dayKeyWeekday('2026-11-09')).toBe(1);
    expect(new Date(dayNoon('2026-11-05', 'Pacific/Kiritimati')).toISOString()).toBe(
      '2026-11-04T22:00:00.000Z',
    );
  });

  it('names weekdays from Sunday', () => {
    expect(weekdayNames('en', 'short')[0]).toBe('Sun');
    expect(weekdayNames('fr', 'long')[1]).toBe('lundi');
  });
});

describe('suggestionMessage', () => {
  const pct = (r: number) => `${Math.round(r * 100)} %`;
  const all: insights.Suggestion[] = [
    { kind: 'pad-estimates', factor: 1.4 },
    { kind: 'trim-estimates', factor: 0.7 },
    { kind: 'lighten-plan', rate: 0.5 },
    { kind: 'address-blocker', terms: ['réunions'], count: 3 },
    { kind: 'protect-creation', share: 0.2 },
    { kind: 'reschedule-slipped', count: 2 },
  ];

  it('words every suggestion kind in both locales', () => {
    for (const sug of all) {
      const m = suggestionMessage(sug, pct);
      for (const locale of ['fr', 'en'] as const) {
        const text = translate(locale, m.key, m.vars);
        expect(text).not.toContain('{');
        expect(text).not.toBe(m.key);
      }
    }
    expect(translate('fr', ...spread(suggestionMessage(all[0]!, pct)))).toContain('140 %');
  });
});

describe('blocker wording', () => {
  it('names an address-blocker suggestion with the user’s words', () => {
    const blockers = [
      { key: 'reunion|creation', label: 'Réunions trop longues', count: 3, thisWeek: 1 },
    ];
    const m = suggestionMessage(
      { kind: 'address-blocker', terms: ['reunion', 'creation'], count: 3 },
      String,
      blockers,
    );
    expect(m.vars['terms']).toBe('Réunions trop longues');
  });
});

function spread(m: ReturnType<typeof suggestionMessage>) {
  return [m.key, m.vars] as const;
}
