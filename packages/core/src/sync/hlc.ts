/**
 * Hybrid Logical Clock (Kulkarni et al., "Logical Physical Clocks", 2014).
 *
 * A timestamp is `(wall, counter, node)`: `wall` tracks physical time in epoch milliseconds,
 * `counter` orders events within the same millisecond (or while the physical clock lags behind
 * a clock received from a peer), `node` breaks the remaining ties. Encoded as a fixed-width
 * string, plain string comparison is the total order of timestamps:
 *
 *   wwwwwwwww-ccccc-<node>      (wall: 9 base-36 digits, counter: 5 base-36 digits)
 */
import { SyncError } from './errors.ts';

export interface HlcTimestamp {
  /** Epoch milliseconds (logical: never decreases, may run ahead of the physical clock). */
  readonly wall: number;
  readonly counter: number;
  readonly node: string;
}

export interface HlcOptions {
  /** Physical clock in epoch milliseconds. Defaults to `Date.now`. */
  now?: () => number;
  /**
   * Largest tolerated lead of a remote clock over the local physical clock, in ms. `receive`
   * throws a `clock-drift` error beyond it so one device with a wildly wrong clock cannot drag
   * every replica into the future. Default: 24 hours.
   */
  maxDriftMs?: number;
  /** Last timestamp issued by this node (restored from a snapshot): keeps the clock monotonic. */
  last?: string;
}

export interface HybridClock {
  readonly node: string;
  /** A new timestamp for a local event, strictly greater than every timestamp seen so far. */
  tick(): string;
  /**
   * Merges a remote timestamp and returns a new local timestamp strictly greater than both the
   * remote one and every timestamp issued before. Throws `clock-drift` (state unchanged) when
   * the remote wall clock is more than `maxDriftMs` ahead of the local physical clock.
   */
  receive(remote: string): string;
  /** The last timestamp issued, without advancing the clock. */
  peek(): string;
}

const WALL_DIGITS = 9;
const COUNTER_DIGITS = 5;
export const MAX_WALL = 36 ** WALL_DIGITS - 1;
export const MAX_COUNTER = 36 ** COUNTER_DIGITS - 1;
/** Node ids: 1–64 printable ASCII characters without spaces (safe on the wire and in logs). */
const NODE_RE = /^[\x21-\x7e]{1,64}$/;
const HLC_RE = /^([0-9a-z]{9})-([0-9a-z]{5})-([\x21-\x7e]{1,64})$/;
export const DEFAULT_MAX_DRIFT_MS = 24 * 60 * 60 * 1000;

export function isValidNodeId(node: unknown): node is string {
  return typeof node === 'string' && NODE_RE.test(node);
}

export function encodeHlc(ts: HlcTimestamp): string {
  if (!isValidNodeId(ts.node)) throw new SyncError('invalid-hlc', 'invalid node id');
  if (!Number.isInteger(ts.wall) || ts.wall < 0 || ts.wall > MAX_WALL) {
    throw new SyncError('invalid-hlc', `wall out of range: ${ts.wall}`);
  }
  if (!Number.isInteger(ts.counter) || ts.counter < 0 || ts.counter > MAX_COUNTER) {
    throw new SyncError('invalid-hlc', `counter out of range: ${ts.counter}`);
  }
  const wall = ts.wall.toString(36).padStart(WALL_DIGITS, '0');
  const counter = ts.counter.toString(36).padStart(COUNTER_DIGITS, '0');
  return `${wall}-${counter}-${ts.node}`;
}

export function decodeHlc(value: string): HlcTimestamp {
  const match = typeof value === 'string' ? HLC_RE.exec(value) : null;
  if (!match) throw new SyncError('invalid-hlc', 'malformed HLC timestamp');
  return {
    wall: parseInt(match[1] as string, 36),
    counter: parseInt(match[2] as string, 36),
    node: match[3] as string,
  };
}

export function isValidHlc(value: unknown): value is string {
  return typeof value === 'string' && HLC_RE.test(value);
}

/** Node that issued an encoded timestamp (no full decode). */
export function hlcNode(value: string): string {
  return value.slice(WALL_DIGITS + COUNTER_DIGITS + 2);
}

/** Wall-clock component of an encoded timestamp, in epoch milliseconds. */
export function hlcWall(value: string): number {
  return parseInt(value.slice(0, WALL_DIGITS), 36);
}

export function compareHlc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The larger of two encoded timestamps (`undefined` counts as the smallest). */
export function maxHlc(a: string | undefined, b: string | undefined): string | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a > b ? a : b;
}

export function createHlc(
  node: string,
  now: () => number = Date.now,
  options: Omit<HlcOptions, 'now'> = {},
): HybridClock {
  if (!isValidNodeId(node)) throw new SyncError('invalid-hlc', 'invalid node id');
  const maxDrift = options.maxDriftMs ?? DEFAULT_MAX_DRIFT_MS;
  let wall = 0;
  let counter = 0;
  if (options.last !== undefined) {
    const last = decodeHlc(options.last);
    wall = last.wall;
    counter = last.counter;
  }

  const physical = (): number => {
    const t = Math.floor(now());
    return Number.isFinite(t) && t > 0 ? Math.min(t, MAX_WALL) : 0;
  };
  const set = (w: number, c: number): string => {
    // Counter overflow (sustained burst or a long physical lag): borrow the next millisecond.
    if (c > MAX_COUNTER) {
      w += 1;
      c = 0;
    }
    if (w > MAX_WALL) throw new SyncError('invalid-hlc', 'HLC wall clock exhausted');
    wall = w;
    counter = c;
    return encodeHlc({ wall, counter, node });
  };

  return {
    node,
    tick() {
      const pt = physical();
      return pt > wall ? set(pt, 0) : set(wall, counter + 1);
    },
    receive(remote) {
      const r = decodeHlc(remote);
      const pt = physical();
      if (r.wall - pt > maxDrift) {
        throw new SyncError(
          'clock-drift',
          `remote clock of ${r.node} is ${r.wall - pt} ms ahead (tolerance ${maxDrift} ms)`,
        );
      }
      const w = Math.max(wall, r.wall, pt);
      if (w === wall && w === r.wall) return set(w, Math.max(counter, r.counter) + 1);
      if (w === wall) return set(w, counter + 1);
      if (w === r.wall) return set(w, r.counter + 1);
      return set(w, 0);
    },
    peek() {
      return encodeHlc({ wall, counter, node });
    },
  };
}
