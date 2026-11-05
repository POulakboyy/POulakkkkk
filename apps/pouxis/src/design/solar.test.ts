import { describe, expect, it } from 'vitest';
import { refraction, solarPosition } from './solar.ts';

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const at = (iso: string) => Date.parse(iso);

/** Highest elevation over a UTC day, sampled every minute. */
function dailyPeak(day: string, point: typeof PARIS) {
  const start = at(`${day}T00:00:00Z`);
  let best = { t: start, elevation: -90, azimuth: 0 };
  for (let m = 0; m < 1440; m++) {
    const p = solarPosition(start + m * 60_000, point);
    if (p.elevation > best.elevation) best = { t: start + m * 60_000, ...p };
  }
  return best;
}

describe('solarPosition (NOAA)', () => {
  it('declination is ~0° at the March 2024 equinox (20 Mar 03:06 UTC)', () => {
    expect(Math.abs(solarPosition(at('2024-03-20T03:06:00Z'), PARIS).declination)).toBeLessThan(
      0.05,
    );
  });

  it('declination reaches ±23.44° at the 2024 solstices', () => {
    expect(solarPosition(at('2024-06-20T20:51:00Z'), PARIS).declination).toBeCloseTo(23.44, 1);
    expect(solarPosition(at('2024-12-21T09:21:00Z'), PARIS).declination).toBeCloseTo(-23.44, 1);
  });

  it('equation of time matches its yearly extremes (+16.4 min early Nov, −14.2 min mid Feb)', () => {
    expect(solarPosition(at('2024-11-03T12:00:00Z'), PARIS).equationOfTime).toBeCloseTo(16.4, 0);
    expect(solarPosition(at('2024-02-11T12:00:00Z'), PARIS).equationOfTime).toBeCloseTo(-14.2, 0);
  });

  it('Paris solar noon at the June solstice: elevation 90 − φ + δ, due south', () => {
    const peak = dailyPeak('2024-06-20', PARIS);
    expect(peak.elevation).toBeCloseTo(90 - PARIS.latitude + 23.44, 1);
    expect(peak.azimuth).toBeGreaterThan(178);
    expect(peak.azimuth).toBeLessThan(182);
    // Local solar noon in Paris is ~11:50 UTC in late June (longitude + equation of time).
    expect(new Date(peak.t).toISOString().slice(11, 13)).toBe('11');
  });

  it('the sun is overhead at the equator at equinox noon', () => {
    expect(dailyPeak('2024-03-20', { latitude: 0, longitude: 0 }).elevation).toBeGreaterThan(89.5);
  });

  it('polar night and midnight sun', () => {
    const tromso = { latitude: 69.65, longitude: 18.96 };
    expect(dailyPeak('2024-12-21', tromso).elevation).toBeLessThan(0);
    const midnight = solarPosition(at('2024-06-21T22:40:00Z'), tromso);
    expect(midnight.elevation).toBeGreaterThan(0);
  });

  it('azimuth: east in the morning, west in the evening', () => {
    expect(solarPosition(at('2024-03-20T07:00:00Z'), PARIS).azimuth).toBeLessThan(120);
    expect(solarPosition(at('2024-03-20T17:00:00Z'), PARIS).azimuth).toBeGreaterThan(240);
  });

  it('refraction lifts the horizon by ~0.5° and vanishes overhead', () => {
    expect(refraction(0)).toBeCloseTo(0.48, 1);
    expect(refraction(89)).toBe(0);
  });
});
