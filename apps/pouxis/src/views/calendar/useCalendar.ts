/** View state of the calendar: mode, anchor, overlays and collaborator zones, plus a ticking clock. */
import { useEffect, useMemo, useState } from 'react';
import type { TimeZone } from '@pouxis/core';
import { CALENDAR_MODES, type CalendarMode } from './model/range.ts';
import { useStoredState } from './model/persist.ts';
import { isValidZone } from './model/zones.ts';
import { SPIRAL_SPANS, type SpiralSpan } from './model/spiral.ts';

export type Overlay = 'energy' | 'zones' | 'progress' | 'snapshot';
export const OVERLAYS: readonly Overlay[] = ['energy', 'zones', 'progress', 'snapshot'];
export type Overlays = Record<Overlay, boolean>;

const DEFAULT_OVERLAYS: Overlays = { energy: false, zones: false, progress: true, snapshot: false };

const isMode = (v: unknown) => CALENDAR_MODES.includes(v as CalendarMode);
const isOverlays = (v: unknown) =>
  typeof v === 'object' &&
  v !== null &&
  OVERLAYS.every((k) => typeof (v as Record<string, unknown>)[k] === 'boolean');
const isZoneList = (v: unknown) =>
  Array.isArray(v) && v.length <= 6 && v.every((z) => typeof z === 'string' && isValidZone(z));
const isSpan = (v: unknown) => SPIRAL_SPANS.some((s) => s.span === v);

/** Current time, refreshed every `intervalMs` (the now line and progress bars). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useCalendarPrefs() {
  const [mode, setMode] = useStoredState<CalendarMode>('mode', 'week', isMode);
  const [overlays, setOverlays] = useStoredState<Overlays>(
    'overlays',
    DEFAULT_OVERLAYS,
    isOverlays,
  );
  const [zones, setZones] = useStoredState<TimeZone[]>('zones', [], isZoneList);
  const [spiralSpan, setSpiralSpan] = useStoredState<SpiralSpan>('spiralSpan', 'day', isSpan);

  return useMemo(
    () => ({
      mode,
      setMode,
      overlays,
      toggleOverlay: (key: Overlay, on: boolean) => setOverlays({ ...overlays, [key]: on }),
      zones,
      addZone: (zone: TimeZone) => {
        if (!zones.includes(zone) && isValidZone(zone)) setZones([...zones, zone].slice(0, 6));
      },
      removeZone: (zone: TimeZone) => setZones(zones.filter((z) => z !== zone)),
      spiralSpan,
      setSpiralSpan,
    }),
    [mode, setMode, overlays, setOverlays, zones, setZones, spiralSpan, setSpiralSpan],
  );
}
