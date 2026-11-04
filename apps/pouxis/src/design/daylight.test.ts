import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adjustForWeather,
  applyDaylight,
  clearDaylight,
  daylightAt,
  daylightLevel,
  daylightPhase,
  useDaylight,
  type WeatherProvider,
} from './daylight.ts';

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const root = document.documentElement;

afterEach(() => {
  clearDaylight();
  vi.useRealTimers();
});

describe('daylightLevel', () => {
  it('is 0 below civil twilight, 0.5 at the horizon, 1 from 6°', () => {
    expect(daylightLevel(-18)).toBe(0);
    expect(daylightLevel(-6)).toBe(0);
    expect(daylightLevel(0)).toBeCloseTo(0.5, 10);
    expect(daylightLevel(6)).toBe(1);
    expect(daylightLevel(60)).toBe(1);
  });

  it('is monotonic and smooth through twilight', () => {
    let prev = -1;
    for (let e = -8; e <= 8; e += 0.25) {
      const l = daylightLevel(e);
      expect(l).toBeGreaterThanOrEqual(prev);
      expect(l - Math.max(prev, 0)).toBeLessThan(0.05);
      prev = l;
    }
  });

  it('follows the sun in Paris', () => {
    expect(daylightAt(Date.parse('2024-06-21T12:00:00Z'), PARIS)).toBe(1);
    expect(daylightAt(new Date('2024-06-21T00:00:00Z'), PARIS)).toBe(0);
    const dusk = daylightAt(Date.parse('2024-06-21T20:15:00Z'), PARIS);
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(0.5);
  });

  it('phase switches at the horizon', () => {
    expect(daylightPhase(0.5)).toBe('day');
    expect(daylightPhase(0.49)).toBe('night');
  });
});

describe('adjustForWeather', () => {
  it('dims daytime but never crosses into night', () => {
    expect(adjustForWeather(1, { cloudCover: 1 })).toBeCloseTo(0.7, 10);
    expect(adjustForWeather(0.6, { cloudCover: 1 })).toBe(0.5);
    expect(adjustForWeather(1, { cloudCover: 0 })).toBe(1);
  });

  it('leaves night and missing samples untouched', () => {
    expect(adjustForWeather(0.2, { cloudCover: 1 })).toBe(0.2);
    expect(adjustForWeather(0.8, null)).toBe(0.8);
  });
});

describe('applyDaylight / clearDaylight', () => {
  it('writes the level, the auto flag and the phase on <html>', () => {
    applyDaylight(0.3141);
    expect(root.style.getPropertyValue('--daylight')).toBe('0.314');
    expect(root.dataset.themeAuto).toBe('daylight');
    expect(root.dataset.daylightPhase).toBe('night');
    applyDaylight(2);
    expect(root.style.getPropertyValue('--daylight')).toBe('1');
    clearDaylight();
    expect(root.dataset.themeAuto).toBeUndefined();
    expect(root.style.getPropertyValue('--daylight')).toBe('');
  });
});

describe('useDaylight', () => {
  it('applies on mount, ticks on interval and cleans up', () => {
    vi.useFakeTimers();
    let t = Date.parse('2024-06-21T12:00:00Z');
    const { rerender, unmount } = renderHook(
      (p: { enabled: boolean }) =>
        useDaylight({ enabled: p.enabled, at: PARIS, now: () => t, intervalMs: 1000 }),
      { initialProps: { enabled: true } },
    );
    expect(root.dataset.daylightPhase).toBe('day');
    t = Date.parse('2024-06-21T23:00:00Z');
    act(() => vi.advanceTimersByTime(1000));
    expect(root.dataset.daylightPhase).toBe('night');
    rerender({ enabled: false });
    expect(root.dataset.themeAuto).toBeUndefined();
    unmount();
  });

  it('does nothing without a location', () => {
    renderHook(() => useDaylight({ enabled: true, at: null }));
    expect(root.dataset.themeAuto).toBeUndefined();
  });

  it('folds in an opt-in weather sample', async () => {
    const weather: WeatherProvider = { current: vi.fn(async () => ({ cloudCover: 1 })) };
    const now = () => Date.parse('2024-06-21T12:00:00Z');
    renderHook(() => useDaylight({ enabled: true, at: PARIS, weather, now }));
    await act(async () => {});
    expect(weather.current).toHaveBeenCalledOnce();
    expect(root.style.getPropertyValue('--daylight')).toBe('0.7');
  });
});
