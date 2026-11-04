/**
 * Daylight theme (7.6): the palette follows the sun. The solar elevation is mapped to a
 * level in 0..1 (1 = full day, 0 = night), smoothed across civil twilight, and written to
 * `--daylight` on <html>; tokens.css blends paper colours from it with `color-mix()`.
 *
 * Weather is opt-in and only described by an interface: no network access happens here.
 */
import { useEffect } from 'react';
import { solarPosition, type GeoPoint } from './solar.ts';

/** Civil twilight ends when the sun's centre is 6° below the horizon. */
export const CIVIL_TWILIGHT = -6;
/** Above this elevation the light is treated as full day. */
export const FULL_DAY = 6;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Maps a solar elevation (°) to a daylight level. Symmetric around the horizon: 0.5 at
 * 0°, 0 below civil twilight, 1 from 6° up. Smoothstep keeps the change imperceptible
 * minute to minute.
 */
export function daylightLevel(elevation: number): number {
  return smoothstep(CIVIL_TWILIGHT, FULL_DAY, elevation);
}

export function daylightAt(instant: Date | number, at: GeoPoint): number {
  const ms = typeof instant === 'number' ? instant : instant.getTime();
  return daylightLevel(solarPosition(ms, at).elevation);
}

export type DaylightPhase = 'day' | 'night';

export function daylightPhase(level: number): DaylightPhase {
  return level < 0.5 ? 'night' : 'day';
}

/* ------------------------------------------------------------------------------------------ */
/* Weather (opt-in)                                                                            */
/* ------------------------------------------------------------------------------------------ */

export interface WeatherSample {
  /** Cloud cover, 0 (clear) .. 1 (overcast). */
  cloudCover: number;
}

/** Implemented by an opt-in feature (e.g. a user-configured provider). Never called by default. */
export interface WeatherProvider {
  current(at: GeoPoint, signal?: AbortSignal): Promise<WeatherSample | null>;
}

/** Share of the day level an overcast sky removes. */
export const OVERCAST_DIMMING = 0.3;

/**
 * Clouds deepen the daytime dimming but never flip the phase: a grey afternoon looks like
 * late afternoon, not like night. Night levels are left untouched.
 */
export function adjustForWeather(level: number, sample: WeatherSample | null): number {
  if (!sample || level < 0.5) return level;
  const cover = Math.min(1, Math.max(0, sample.cloudCover));
  return Math.max(0.5, level * (1 - OVERCAST_DIMMING * cover));
}

/* ------------------------------------------------------------------------------------------ */
/* DOM                                                                                         */
/* ------------------------------------------------------------------------------------------ */

/** Writes the level to <html>. A forced `data-theme` still wins (see tokens.css). */
export function applyDaylight(level: number, root: HTMLElement = document.documentElement): void {
  const d = Math.min(1, Math.max(0, level));
  root.style.setProperty('--daylight', String(Math.round(d * 1000) / 1000));
  root.dataset.themeAuto = 'daylight';
  root.dataset.daylightPhase = daylightPhase(d);
}

export function clearDaylight(root: HTMLElement = document.documentElement): void {
  root.style.removeProperty('--daylight');
  delete root.dataset.themeAuto;
  delete root.dataset.daylightPhase;
}

export interface UseDaylightOptions {
  enabled: boolean;
  /** Where the user is. Without a location the theme is not driven. */
  at: GeoPoint | null;
  /** Opt-in weather source, polled at most every `weatherEveryMs`. */
  weather?: WeatherProvider;
  intervalMs?: number;
  weatherEveryMs?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

/** Keeps `--daylight` in sync with the sun while enabled; cleans up when disabled. */
export function useDaylight({
  enabled,
  at,
  weather,
  intervalMs = 60_000,
  weatherEveryMs = 30 * 60_000,
  now = Date.now,
}: UseDaylightOptions): void {
  const lat = at?.latitude;
  const lon = at?.longitude;
  useEffect(() => {
    if (!enabled || lat === undefined || lon === undefined) return;
    const point = { latitude: lat, longitude: lon };
    const abort = new AbortController();
    let sample: WeatherSample | null = null;
    let lastWeather = -Infinity;

    const tick = () => {
      const t = now();
      applyDaylight(adjustForWeather(daylightAt(t, point), sample));
      if (weather && t - lastWeather >= weatherEveryMs) {
        lastWeather = t;
        weather
          .current(point, abort.signal)
          .then((s) => {
            if (abort.signal.aborted) return;
            sample = s;
            applyDaylight(adjustForWeather(daylightAt(now(), point), sample));
          })
          .catch(() => {
            // Weather is cosmetic: a failed fetch keeps the pure solar level.
          });
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      abort.abort();
      clearInterval(id);
      clearDaylight();
    };
  }, [enabled, lat, lon, weather, intervalMs, weatherEveryMs, now]);
}
