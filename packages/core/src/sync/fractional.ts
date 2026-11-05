/**
 * Fractional indexing: order keys are base-62 fractions in (0, 1) written as digit strings
 * ("V" ≈ 0.5). Between any two keys there is always another one, so an item can be inserted
 * or moved by writing only its own key. Digits use ASCII order, so plain string comparison is
 * the numeric order. Keys never end with "0" (which would make two spellings equal).
 *
 * `between` appends random digits (jitter) so two replicas inserting at the same place
 * concurrently almost never pick the same key; equal keys are still ordered by item id.
 */
import { SyncError } from './errors.ts';

export const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = DIGITS.length;
const KEY_RE = /^[0-9A-Za-z]*[1-9A-Za-z]$/;

export interface BetweenOptions {
  /** Random source in [0, 1). Default `Math.random`; pass a seeded one for determinism. */
  random?: () => number;
  /** Random digits appended to the midpoint. Default 2 (3 844 slots); 0 disables jitter. */
  jitter?: number;
}

export function isValidOrderKey(key: unknown): key is string {
  return typeof key === 'string' && key.length <= 1024 && KEY_RE.test(key);
}

/**
 * A key strictly between `a` and `b` (`null` = open end). Throws when `a >= b` or a key is
 * malformed.
 */
export function between(a: string | null, b: string | null, options: BetweenOptions = {}): string {
  if (a !== null && !isValidOrderKey(a)) throw new SyncError('invalid', `invalid order key: ${a}`);
  if (b !== null && !isValidOrderKey(b)) throw new SyncError('invalid', `invalid order key: ${b}`);
  if (a !== null && b !== null && a >= b) {
    throw new SyncError('invalid', `order keys out of order: ${a} >= ${b}`);
  }
  const mid = keyBetween(a, b);
  const jitter = Math.max(0, Math.floor(options.jitter ?? 2));
  if (jitter === 0) return mid;
  const random = options.random ?? Math.random;
  let low = mid;
  // `low + suffix` exceeds `b` only when `b` extends `low`; move `low` up until it does not.
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = low + randomDigits(jitter, random);
    if (b === null || candidate < b) return candidate;
    low = midpoint(low, b);
  }
  return low;
}

/** `count` keys in increasing order between `a` and `b`, evenly spread (no jitter). */
export function spread(a: string | null, b: string | null, count: number): string[] {
  if (count <= 0) return [];
  const middle = Math.floor(count / 2);
  const key = between(a, b, { jitter: 0 });
  return [...spread(a, key, middle), key, ...spread(key, b, count - middle - 1)];
}

/**
 * Appends and prepends step by one digit instead of halving, so keys grow by one character
 * every ~60 consecutive appends (or prepends) rather than every ~6.
 */
function keyBetween(a: string | null, b: string | null): string {
  if (a !== null && b === null) {
    const i = [...a].findIndex((char) => char !== 'z');
    if (i < 0) return `${a}1`;
    return a.slice(0, i) + (DIGITS[digit(a[i] as string) + 1] as string);
  }
  if (a === null && b !== null) {
    const i = [...b].findIndex((char) => char !== '0');
    const d = digit(b[i] as string);
    if (d > 1) return b.slice(0, i) + (DIGITS[d - 1] as string);
    if (b.length > i + 1) return b.slice(0, i + 1);
    return `${b.slice(0, i)}0z`;
  }
  return midpoint(a ?? '', b);
}

/** Midpoint of two digit strings (`a < b`, `b === null` meaning 1), after D. Greenspan. */
function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    let n = 0;
    while ((a[n] ?? '0') === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a ? digit(a[0] as string) : 0;
  const digitB = b !== null ? digit(b[0] as string) : BASE;
  if (digitB - digitA > 1) return DIGITS[Math.round((digitA + digitB) / 2)] as string;
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return (DIGITS[digitA] as string) + midpoint(a.slice(1), null);
}

function digit(char: string): number {
  return DIGITS.indexOf(char);
}

function randomDigits(count: number, random: () => number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    // Last digit is never "0" so the key stays canonical.
    const min = i === count - 1 ? 1 : 0;
    out += DIGITS[min + Math.min(BASE - 1 - min, Math.floor(random() * (BASE - min)))];
  }
  return out;
}
