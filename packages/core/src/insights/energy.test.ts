import { describe, expect, it } from 'vitest';
import { HOUR, zonedParts } from '../time.ts';
import {
  chronotypeFromMeq,
  circadianPrior,
  energyByHour,
  energyHeatmap,
  energyProfile,
  meqCategory,
  PRIOR_FLOOR,
} from './energy.ts';
import { at, done, focus, task, TZ } from './fixtures.test-utils.ts';
import { WEEK } from './internal.ts';

const NOW = at(2026, 3, 2); // Monday 2 March 2026, 00:00 Paris
const SINCE = NOW - 4 * WEEK;

function argmax(values: readonly number[]): number {
  return values.indexOf(Math.max(...values));
}

/** A task carrying one focus block of `minutes` at local `hour` on each listed day offset. */
function weeklyFocus(dayOffsets: number[], hour: number, minutes: number) {
  const logs = dayOffsets.map((d) => {
    const p = zonedParts(NOW - d * 24 * HOUR, TZ);
    return focus(at(p.year, p.month, p.day, hour), minutes);
  });
  return task({ createdAt: SINCE, timeLogs: logs });
}

describe('meqCategory / chronotypeFromMeq', () => {
  it('applies the Horne & Östberg cut-offs', () => {
    expect(meqCategory(86)).toBe('definite-morning');
    expect(meqCategory(70)).toBe('definite-morning');
    expect(meqCategory(69)).toBe('moderate-morning');
    expect(meqCategory(59)).toBe('moderate-morning');
    expect(meqCategory(58)).toBe('neither');
    expect(meqCategory(42)).toBe('neither');
    expect(meqCategory(41)).toBe('moderate-evening');
    expect(meqCategory(31)).toBe('moderate-evening');
    expect(meqCategory(30)).toBe('definite-evening');
    expect(meqCategory(16)).toBe('definite-evening');
  });

  it('rejects scores outside 16–86', () => {
    expect(() => meqCategory(15)).toThrow(RangeError);
    expect(() => meqCategory(87)).toThrow(RangeError);
    expect(() => meqCategory(Number.NaN)).toThrow(RangeError);
  });

  it('collapses categories onto three priors', () => {
    expect(chronotypeFromMeq(75)).toBe('morning');
    expect(chronotypeFromMeq(60)).toBe('morning');
    expect(chronotypeFromMeq(50)).toBe('intermediate');
    expect(chronotypeFromMeq(35)).toBe('evening');
    expect(chronotypeFromMeq(20)).toBe('evening');
  });
});

describe('circadianPrior', () => {
  it('returns 24 values in [floor, 1] with a peak of 1', () => {
    for (const c of ['morning', 'intermediate', 'evening'] as const) {
      const p = circadianPrior(c);
      expect(p).toHaveLength(24);
      expect(Math.max(...p)).toBeCloseTo(1, 10);
      expect(Math.min(...p)).toBeGreaterThanOrEqual(PRIOR_FLOOR);
    }
  });

  it('orders the peaks morning < intermediate < evening and keeps nights low', () => {
    const m = argmax(circadianPrior('morning'));
    const i = argmax(circadianPrior('intermediate'));
    const e = argmax(circadianPrior('evening'));
    expect(m).toBeLessThan(i);
    expect(i).toBeLessThan(e);
    for (const c of ['morning', 'intermediate', 'evening'] as const) {
      expect(circadianPrior(c)[3] as number).toBeLessThan(0.15);
    }
  });

  it('defaults to the intermediate curve and rejects unknown chronotypes', () => {
    expect(circadianPrior()).toEqual(circadianPrior('intermediate'));
    expect(() => circadianPrior('owl' as never)).toThrow(RangeError);
  });
});

describe('energyHeatmap', () => {
  it('falls back to the prior with zero confidence when there is no history', () => {
    const map = energyHeatmap({ tasks: [], now: NOW, timeZone: TZ, chronotype: 'morning' });
    const prior = circadianPrior('morning');
    expect(map.cells).toHaveLength(7);
    for (const row of map.values) expect(row).toEqual(prior);
    expect(map.cells.flat().every((c) => c.confidence === 0 && !c.enoughData)).toBe(true);
    expect(map.cells.flat().every((c) => c.observed === null && c.samples === 0)).toBe(true);
    expect(map.dataWeight).toBe(0);
    expect(map.enoughData).toBe(false);
    expect(map.observed).toBeNull();
    expect(map.peak).toEqual({ weekday: 0, hour: argmax(prior) });
  });

  it('finds a consistent personal peak and gains confidence there', () => {
    // Every Tuesday 14:00–16:00 for four weeks (Tuesdays are 6, 13, 20, 27 days before NOW).
    const t = weeklyFocus([6, 13, 20, 27], 14, 120);
    const map = energyHeatmap({ tasks: [t], now: NOW, timeZone: TZ });
    expect(map.peak?.weekday).toBe(2);
    expect([14, 15]).toContain(map.peak?.hour);
    const cell = map.cells[2]?.[14];
    expect(cell?.value).toBeCloseTo(1, 1);
    expect(cell?.samples).toBe(4);
    expect(cell?.exposure).toBeCloseTo(4, 10);
    expect(map.focusMinutes).toBe(480);
    // Eight hours in a month is still sparse: the estimate is flagged as not yet reliable.
    expect(cell?.confidence).toBeGreaterThan(0);
    expect(map.enoughData).toBe(false);
    // Unobserved-by-activity cells are pulled toward zero, not left at the prior.
    expect(map.cells[2]?.[10]?.value as number).toBeLessThan(0.2);
  });

  it('becomes confident once the history is substantial', () => {
    const weekdays = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28];
    const t = weeklyFocus(weekdays, 9, 180);
    const sparse = energyHeatmap({ tasks: [weeklyFocus([6], 9, 180)], now: NOW, timeZone: TZ });
    const map = energyHeatmap({ tasks: [t], now: NOW, timeZone: TZ });
    expect(map.dataWeight).toBeGreaterThan(0.5);
    expect(map.enoughData).toBe(true);
    const cell = map.cells[2]?.[10];
    expect(cell?.enoughData).toBe(true);
    expect(cell?.confidence as number).toBeGreaterThan(sparse.cells[2]?.[10]?.confidence as number);
    // With uniform exposure, cell credibility equals the global shrinkage weight.
    expect(cell?.confidence).toBeCloseTo(map.dataWeight, 6);
  });

  it('keeps the prior shape when the evidence is a single short block', () => {
    const t = weeklyFocus([6], 20, 30);
    const map = energyHeatmap({ tasks: [t], now: NOW, timeZone: TZ, chronotype: 'morning' });
    expect(map.dataWeight).toBeLessThan(0.1);
    expect(map.enoughData).toBe(false);
    // The shrunk estimate still ranks morning above late evening on an unrelated day.
    const thursday = map.values[4] as number[];
    expect(thursday[9] as number).toBeGreaterThan(thursday[20] as number);
  });

  it('weights recent weeks more than old ones', () => {
    // Same amount at 9:00 three/four weeks ago and at 15:00 last week and the week before.
    const old = weeklyFocus([20, 27], 9, 60);
    const recent = weeklyFocus([6, 13], 15, 60);
    const map = energyHeatmap({
      tasks: [old, recent],
      now: NOW,
      timeZone: TZ,
      priorStrength: 0.01,
    });
    expect(map.peak).toEqual({ weekday: 2, hour: 15 });
    expect(map.cells[2]?.[15]?.value as number).toBeGreaterThan(map.cells[2]?.[9]?.value as number);
  });

  it('counts overlapping logs of different tasks once and ignores breaks', () => {
    const start = at(2026, 2, 24, 10);
    const a = task({ createdAt: SINCE, timeLogs: [focus(start, 60)] });
    const b = task({
      createdAt: SINCE,
      timeLogs: [focus(start + 0.5 * HOUR, 60), { start, end: start + HOUR, kind: 'break' }],
    });
    const map = energyHeatmap({ tasks: [a, b], now: NOW, timeZone: TZ });
    expect(map.focusMinutes).toBe(90);
  });

  it('credits completions in the hour they happened', () => {
    const tasks = [6, 13, 20].map((d) => {
      const p = zonedParts(NOW - d * 24 * HOUR, TZ);
      return done(at(p.year, p.month, p.day, 8, 30), { createdAt: SINCE });
    });
    const map = energyHeatmap({ tasks, now: NOW, timeZone: TZ, completionWeight: 1 });
    expect(map.completions).toBe(3);
    expect(map.cells[2]?.[8]?.samples).toBe(3);
    expect(map.peak).toEqual({ weekday: 2, hour: 8 });
  });

  it('ignores completions outside the window and dropped tasks', () => {
    const tasks = [
      done(NOW - 5 * WEEK, { createdAt: SINCE - 6 * WEEK }),
      task({ createdAt: SINCE, status: 'archived' }),
    ];
    expect(energyHeatmap({ tasks, now: NOW, timeZone: TZ }).completions).toBe(0);
  });

  it('treats slots before tracking started as unobserved', () => {
    const since = NOW - WEEK;
    const t = weeklyFocus([6], 14, 60);
    const map = energyHeatmap({ tasks: [t], now: NOW, timeZone: TZ, since });
    expect(map.observed).toEqual({ start: since, end: NOW });
    for (const row of map.cells) for (const c of row) expect(c.exposure).toBeCloseTo(1, 10);
  });

  it('accounts every observed hour exactly once across a DST change', () => {
    // Window spanning the spring-forward night of 29 March 2026 in Paris.
    const now = at(2026, 4, 6);
    const map = energyHeatmap({ tasks: [], now, timeZone: TZ, since: now - 2 * WEEK });
    expect(map.observed).toEqual({ start: now - 2 * WEEK, end: now });
    // No history: every cell is still at the prior, the call is well-defined.
    expect(map.peak).not.toBeNull();
    const t = task({ createdAt: now - 2 * WEEK, timeLogs: [focus(at(2026, 3, 30, 9), 60)] });
    const withData = energyHeatmap({ tasks: [t], now, timeZone: TZ });
    const exposure = withData.cells.flat().reduce((s, c) => s + c.exposure, 0);
    expect(exposure).toBeCloseTo((now - (now - 2 * WEEK)) / HOUR, 6);
  });

  it('uses a custom prior when provided', () => {
    const prior = Array.from({ length: 24 }, (_, h) => (h === 22 ? 4 : 1));
    const map = energyHeatmap({ tasks: [], now: NOW, timeZone: TZ, prior });
    expect(map.prior[22]).toBe(1);
    expect(map.prior[0]).toBe(0.25);
    expect(map.peak?.hour).toBe(22);
  });

  it('validates its options', () => {
    const base = { tasks: [], now: NOW, timeZone: TZ };
    expect(() => energyHeatmap({ ...base, weeks: 0 })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, weeks: 1.5 })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, priorStrength: 0 })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, halfLifeWeeks: 0 })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, completionWeight: -1 })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, minConfidence: 2 })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, prior: [1, 2] })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, prior: new Array(24).fill(0) })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, prior: new Array(24).fill(-1) })).toThrow(RangeError);
    expect(() => energyHeatmap({ ...base, now: Number.NaN })).toThrow(RangeError);
  });
});

describe('energyByHour / energyProfile', () => {
  it('pools weekdays and returns 24 values', () => {
    const t = weeklyFocus([6, 5, 4, 3, 13, 12], 11, 60);
    const profile = energyByHour({ tasks: [t], now: NOW, timeZone: TZ });
    expect(profile.cells).toHaveLength(24);
    expect(profile.peak).toBe(11);
    expect(profile.cells[11]?.samples).toBe(6);
    expect(energyProfile({ tasks: [t], now: NOW, timeZone: TZ })).toEqual(profile.values);
  });

  it('restricts evidence to the requested weekdays', () => {
    const weekend = weeklyFocus([1, 8, 15], 21, 120); // Sundays
    const profile = energyByHour({
      tasks: [weekend],
      now: NOW,
      timeZone: TZ,
      days: [1, 2, 3, 4, 5],
      chronotype: 'morning',
    });
    expect(profile.samples).toBe(0);
    expect(profile.focusMinutes).toBe(360);
    expect(profile.peak).toBe(argmax(circadianPrior('morning')));
  });

  it('rejects invalid weekdays', () => {
    expect(() => energyByHour({ tasks: [], now: NOW, timeZone: TZ, days: [7] })).toThrow(
      RangeError,
    );
  });

  it('is the chronotype prior without history', () => {
    expect(energyProfile({ tasks: [], now: NOW, timeZone: TZ, chronotype: 'evening' })).toEqual(
      circadianPrior('evening'),
    );
  });
});
