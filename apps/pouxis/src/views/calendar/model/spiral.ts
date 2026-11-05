/**
 * Geometry of the time spiral (1.4): time runs along an Archimedean spiral, clockwise from
 * twelve o'clock, one turn per `turnMs`. Days stack on top of each other turn after turn, so
 * the same hour of every day (or weekday of every week) lines up radially without any cut.
 */
import { DAY, type Timestamp } from '@pouxis/core';

export type SpiralSpan = 'day' | 'week' | 'month' | 'year';

/** Length of one turn for each zoom level, from closest to farthest. */
export const SPIRAL_SPANS: readonly { span: SpiralSpan; turnMs: number }[] = [
  { span: 'day', turnMs: DAY },
  { span: 'week', turnMs: 7 * DAY },
  { span: 'month', turnMs: 30.436875 * DAY },
  { span: 'year', turnMs: 365.2425 * DAY },
];

export interface SpiralGeometry {
  /** Instant at the inner end of the spiral. */
  origin: Timestamp;
  turnMs: number;
  turns: number;
  /** Radius at the origin and radial distance between two turns, in SVG units. */
  innerRadius: number;
  gap: number;
  cx: number;
  cy: number;
}

export interface SpiralPoint {
  x: number;
  y: number;
  /** Radians, 0 at twelve o'clock, clockwise. */
  angle: number;
  radius: number;
}

const TAU = Math.PI * 2;

/** Position of instant `t` (clamped to the spiral's extent). */
export function pointAt(t: Timestamp, g: SpiralGeometry): SpiralPoint {
  const turns = Math.min(g.turns, Math.max(0, (t - g.origin) / g.turnMs));
  const angle = (turns % 1) * TAU;
  const radius = g.innerRadius + g.gap * turns;
  return {
    x: g.cx + radius * Math.sin(angle),
    y: g.cy - radius * Math.cos(angle),
    angle,
    radius,
  };
}

/** Time span covered by the spiral. */
export function extent(g: SpiralGeometry): { start: Timestamp; end: Timestamp } {
  return { start: g.origin, end: g.origin + g.turns * g.turnMs };
}

/** SVG path along the spiral from `start` to `end`, sampled finely enough to look smooth. */
export function arcPath(
  start: Timestamp,
  end: Timestamp,
  g: SpiralGeometry,
  samplesPerTurn = 144,
): string {
  const { start: s0, end: s1 } = extent(g);
  const a = Math.max(start, s0);
  const b = Math.min(end, s1);
  if (!(b > a)) return '';
  const steps = Math.max(2, Math.ceil(((b - a) / g.turnMs) * samplesPerTurn));
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = pointAt(a + ((b - a) * i) / steps, g);
    parts.push(`${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`);
  }
  return parts.join(' ');
}

/**
 * Instant under an SVG point: the angle gives the position within a turn, the radius the
 * nearest turn. `null` outside the spiral (beyond half a gap from its first or last turn).
 */
export function timeAt(x: number, y: number, g: SpiralGeometry): Timestamp | null {
  const dx = x - g.cx;
  const dy = g.cy - y;
  const angle = (Math.atan2(dx, dy) + TAU) % TAU;
  const fraction = angle / TAU;
  const radius = Math.hypot(dx, dy);
  const turn = Math.round((radius - g.innerRadius) / g.gap - fraction);
  const turns = turn + fraction;
  if (turns < 0 || turns > g.turns) return null;
  if (Math.abs(g.innerRadius + g.gap * turns - radius) > g.gap / 2) return null;
  return g.origin + turns * g.turnMs;
}

/**
 * Builds a spiral that fits a square of `size`, with `now` placed `pastTurns` turns from the
 * inner end and `origin` aligned on `alignTo` (e.g. local midnight or the start of the week).
 */
export function fitSpiral(options: {
  size: number;
  turnMs: number;
  alignTo: Timestamp;
  pastTurns: number;
  turns: number;
  innerRadius?: number;
  padding?: number;
}): SpiralGeometry {
  const half = options.size / 2;
  const innerRadius = options.innerRadius ?? options.size * 0.08;
  const outer = half - (options.padding ?? 28);
  return {
    origin: options.alignTo - options.pastTurns * options.turnMs,
    turnMs: options.turnMs,
    turns: options.turns,
    innerRadius,
    gap: (outer - innerRadius) / options.turns,
    cx: half,
    cy: half,
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
