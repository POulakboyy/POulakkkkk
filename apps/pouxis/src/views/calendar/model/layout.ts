/** Placement of instances inside a day column: vertical position and side-by-side lanes. */
import { MINUTE, minutesOfDay, type TimeZone, type Timestamp } from '@pouxis/core';
import type { EventInstance } from './expand.ts';

export const DAY_MINUTES = 24 * 60;

export interface PlacedInstance {
  instance: EventInstance;
  /** Minutes from local midnight (wall clock), clipped to the day. */
  top: number;
  /** Minutes, clipped to the day. */
  height: number;
  /** Lane index within its overlap cluster and the cluster's lane count. */
  lane: number;
  lanes: number;
  /** Lanes the instance spans: it widens to the right over lanes that are free beside it. */
  span: number;
  /** The instance starts before / ends after this day. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

/** Wall-clock span of `[start, end)` within the local day starting at `dayStart`. */
export function daySpan(
  start: Timestamp,
  end: Timestamp,
  dayStart: Timestamp,
  dayEnd: Timestamp,
  timeZone: TimeZone,
): { top: number; bottom: number } | null {
  if (!(start < dayEnd && end > dayStart)) return null;
  const top = start <= dayStart ? 0 : minutesOfDay(start, timeZone);
  const bottom = end >= dayEnd ? DAY_MINUTES : top + (end - Math.max(start, dayStart)) / MINUTE;
  return { top, bottom: Math.min(DAY_MINUTES, bottom) };
}

/**
 * Lays out the instances touching one local day. Overlapping instances form a cluster and
 * share its width in lanes (first free lane, longest first on equal starts).
 */
export function layoutDay(
  instances: readonly EventInstance[],
  dayStart: Timestamp,
  dayEnd: Timestamp,
  timeZone: TimeZone,
  minHeight = 15,
): PlacedInstance[] {
  const items: PlacedInstance[] = [];
  for (const instance of instances) {
    const span = daySpan(instance.start, instance.end, dayStart, dayEnd, timeZone);
    if (!span) continue;
    items.push({
      instance,
      top: span.top,
      height: Math.max(minHeight, span.bottom - span.top),
      lane: 0,
      lanes: 1,
      span: 1,
      clippedStart: instance.start < dayStart,
      clippedEnd: instance.end > dayEnd,
    });
  }
  items.sort((a, b) => a.top - b.top || b.height - a.height);

  let cluster: PlacedInstance[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const close = () => {
    for (const item of cluster) {
      item.lanes = laneEnds.length;
      item.span = freeSpan(item, cluster, item.lanes);
    }
    cluster = [];
    laneEnds = [];
  };
  for (const item of items) {
    if (item.top >= clusterEnd) close();
    let lane = laneEnds.findIndex((end) => end <= item.top);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = item.top + item.height;
    item.lane = lane;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.top + item.height);
  }
  close();
  return items;
}

/** 1 + the lanes right of `item` that hold nothing overlapping it in time. */
function freeSpan(item: PlacedInstance, cluster: readonly PlacedInstance[], lanes: number): number {
  const bottom = item.top + item.height;
  let span = 1;
  for (let lane = item.lane + 1; lane < lanes; lane++) {
    const blocked = cluster.some(
      (other) => other.lane === lane && other.top < bottom && other.top + other.height > item.top,
    );
    if (blocked) break;
    span++;
  }
  return span;
}
