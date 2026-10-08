/**
 * Token bucket: holds up to `capacity` tokens, refilled continuously at `refillPerSecond`.
 */
export class TokenBucket {
  readonly capacity: number;
  readonly refillPerSecond: number;
  private tokens: number;
  private last: number;
  private readonly now: () => number;

  /** `now` returns milliseconds from a monotonic clock. */
  constructor(capacity: number, refillPerSecond: number, now: () => number = monotonicMs) {
    if (!(capacity > 0) || !(refillPerSecond > 0)) {
      throw new RangeError('capacity and refillPerSecond must be positive');
    }
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.tokens = capacity;
    this.now = now;
    this.last = now();
  }

  /** Takes `cost` tokens if available. Returns false (and takes nothing) otherwise. */
  tryRemove(cost = 1): boolean {
    this.refill();
    if (cost > this.tokens) return false;
    this.tokens -= cost;
    return true;
  }

  /** Tokens currently available (after refill). */
  available(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = this.now();
    const elapsed = now - this.last;
    if (elapsed <= 0) return;
    this.last = now;
    this.tokens = Math.min(this.capacity, this.tokens + (elapsed / 1000) * this.refillPerSecond);
  }
}

function monotonicMs(): number {
  return performance.now();
}
