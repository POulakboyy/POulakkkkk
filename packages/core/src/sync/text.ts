/**
 * Compact text patches (3.11, low bandwidth): common prefix and suffix are trimmed, then the
 * middle is diffed with Myers' O(ND) algorithm, bounded to `maxEdits` so a pathological input
 * degrades to "replace the middle" instead of quadratic work.
 *
 * A patch is a list of steps over UTF-16 code units that consumes the whole base text:
 * a positive integer retains that many units, a negative integer deletes that many, a string
 * is inserted.
 */
import { SyncError } from './errors.ts';

export type TextPatch = readonly (number | string)[];

export interface DiffOptions {
  /** Maximum number of single-unit insertions + deletions searched for. Default 512. */
  maxEdits?: number;
}

const DEFAULT_MAX_EDITS = 512;

export function diffText(base: string, target: string, options: DiffOptions = {}): TextPatch {
  if (base === target) return base.length === 0 ? [] : [base.length];
  let prefix = 0;
  const limit = Math.min(base.length, target.length);
  while (prefix < limit && base.charCodeAt(prefix) === target.charCodeAt(prefix)) prefix++;
  let suffix = 0;
  while (
    suffix < limit - prefix &&
    base.charCodeAt(base.length - 1 - suffix) === target.charCodeAt(target.length - 1 - suffix)
  ) {
    suffix++;
  }
  const a = base.slice(prefix, base.length - suffix);
  const b = target.slice(prefix, target.length - suffix);
  const builder = new PatchBuilder();
  builder.retain(prefix);
  const maxEdits = Math.max(0, Math.floor(options.maxEdits ?? DEFAULT_MAX_EDITS));
  const script = myers(a, b, maxEdits);
  if (script) for (const step of script) builder.push(step);
  else {
    builder.remove(a.length);
    builder.insert(b);
  }
  builder.retain(suffix);
  return builder.build();
}

export function applyTextPatch(base: string, patch: TextPatch): string {
  if (!Array.isArray(patch)) throw mismatch('patch must be an array');
  let pos = 0;
  let out = '';
  for (const step of patch) {
    if (typeof step === 'string') {
      out += step;
    } else if (Number.isInteger(step) && step !== 0) {
      const n = Math.abs(step);
      if (pos + n > base.length) throw mismatch('patch runs past the end of the base text');
      if (step > 0) out += base.slice(pos, pos + n);
      pos += n;
    } else {
      throw mismatch('invalid patch step');
    }
  }
  if (pos !== base.length) throw mismatch('patch does not cover the base text');
  return out;
}

function mismatch(message: string): SyncError {
  return new SyncError('patch-mismatch', message);
}

type Step = { kind: 'retain' | 'remove'; n: number } | { kind: 'insert'; text: string };

/** Merges adjacent steps of the same kind. */
class PatchBuilder {
  private readonly steps: (number | string)[] = [];

  push(step: Step): void {
    if (step.kind === 'insert') this.insert(step.text);
    else if (step.kind === 'retain') this.retain(step.n);
    else this.remove(step.n);
  }

  retain(n: number): void {
    if (n <= 0) return;
    const last = this.steps[this.steps.length - 1];
    if (typeof last === 'number' && last > 0) this.steps[this.steps.length - 1] = last + n;
    else this.steps.push(n);
  }

  remove(n: number): void {
    if (n <= 0) return;
    const last = this.steps[this.steps.length - 1];
    if (typeof last === 'number' && last < 0) this.steps[this.steps.length - 1] = last - n;
    else this.steps.push(-n);
  }

  insert(text: string): void {
    if (text.length === 0) return;
    const last = this.steps[this.steps.length - 1];
    if (typeof last === 'string') this.steps[this.steps.length - 1] = last + text;
    else this.steps.push(text);
  }

  build(): TextPatch {
    return Object.freeze([...this.steps]);
  }
}

/**
 * Shortest edit script from `a` to `b` (Myers 1986, greedy forward search with a trace of the
 * furthest-reaching paths for backtracking). Returns `undefined` beyond `maxEdits` edits.
 */
function myers(a: string, b: string, maxEdits: number): Step[] | undefined {
  const n = a.length;
  const m = b.length;
  const bound = Math.min(n + m, maxEdits);
  const offset = bound + 1;
  const v = new Int32Array(2 * bound + 3);
  const trace: Int32Array[] = [];
  for (let d = 0; d <= bound; d++) {
    for (let k = -d; k <= d; k += 2) {
      const down =
        k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number));
      let x = down ? (v[offset + k + 1] as number) : (v[offset + k - 1] as number) + 1;
      let y = x - k;
      while (x < n && y < m && a.charCodeAt(x) === b.charCodeAt(y)) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        trace.push(v.slice(offset - d, offset + d + 1));
        return backtrack(a, b, trace);
      }
    }
    trace.push(v.slice(offset - d, offset + d + 1));
  }
  return undefined;
}

function backtrack(a: string, b: string, trace: readonly Int32Array[]): Step[] {
  const reversed: Step[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d > 0; d--) {
    const prev = trace[d - 1] as Int32Array;
    const at = (k: number): number => prev[k + d - 1] as number;
    const k = x - y;
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const prevK = down ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    const startX = down ? prevX : prevX + 1;
    if (x > startX) reversed.push({ kind: 'retain', n: x - startX });
    if (down) reversed.push({ kind: 'insert', text: b.charAt(prevY) });
    else reversed.push({ kind: 'remove', n: 1 });
    x = prevX;
    y = prevY;
  }
  if (x > 0) reversed.push({ kind: 'retain', n: x });
  return reversed.reverse();
}
