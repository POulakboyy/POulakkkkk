/** Energy heatmap overlay (1.3): quantises `insights.energyHeatmap` onto the `--heat-0…4` ramp. */
import type { insights } from '@pouxis/core';

export const HEAT_LEVELS = 5;

/** Level 0–4 of a value in 0..1 (equal-width bins; out-of-range values are clamped). */
export function heatLevel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(HEAT_LEVELS - 1, Math.max(0, Math.floor(value * HEAT_LEVELS)));
}

export interface HeatHour {
  hour: number;
  level: number;
  value: number;
  /** The cell is backed by enough of the user's own history. */
  reliable: boolean;
}

/** The 24 hourly cells of one weekday (0 = Sunday). */
export function heatForWeekday(heatmap: insights.EnergyHeatmap, weekday: number): HeatHour[] {
  const row = heatmap.cells[weekday] ?? [];
  return Array.from({ length: 24 }, (_, hour) => {
    const cell = row[hour];
    const value = cell?.value ?? 0;
    return { hour, level: heatLevel(value), value, reliable: cell?.enoughData ?? false };
  });
}
