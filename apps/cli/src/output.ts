/**
 * Terminal output: ANSI colours only on an interactive terminal, never when `NO_COLOR` is set
 * (https://no-color.org), with `TERM=dumb`, or with `--no-color`. JSON output never carries
 * escape codes.
 */
import type { OutputStream, Runtime } from './runtime.ts';

export interface Palette {
  bold(s: string): string;
  dim(s: string): string;
  italic(s: string): string;
  red(s: string): string;
  green(s: string): string;
  yellow(s: string): string;
  blue(s: string): string;
  magenta(s: string): string;
  cyan(s: string): string;
}

function sgr(open: number, close: number): (s: string) => string {
  return (s) => (s === '' ? s : `\u001b[${open}m${s}\u001b[${close}m`);
}

const identity = (s: string): string => s;

export const ANSI: Palette = {
  bold: sgr(1, 22),
  dim: sgr(2, 22),
  italic: sgr(3, 23),
  red: sgr(31, 39),
  green: sgr(32, 39),
  yellow: sgr(33, 39),
  blue: sgr(34, 39),
  magenta: sgr(35, 39),
  cyan: sgr(36, 39),
};

export const PLAIN: Palette = {
  bold: identity,
  dim: identity,
  italic: identity,
  red: identity,
  green: identity,
  yellow: identity,
  blue: identity,
  magenta: identity,
  cyan: identity,
};

/** Whether colours should be used on `stream`. `flag` is `--color` / `--no-color` when given. */
export function shouldUseColor(stream: OutputStream, env: Runtime['env'], flag?: boolean): boolean {
  if (flag === false) return false;
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  if (flag === true) return true;
  if (env.TERM === 'dumb') return false;
  return stream.isTTY === true;
}

// Matches CSI escape sequences such as colours.
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_PATTERN, '');
}

export interface Output {
  /** Colours for stdout. */
  c: Palette;
  /** Colours for stderr. */
  ce: Palette;
  /** Writes one line (or several) to stdout. */
  line(text?: string): void;
  /** Writes one line to stderr. */
  err(text?: string): void;
  /** Pretty JSON to stdout, newline-terminated. */
  json(value: unknown): void;
  /** Usable width for one stdout line; `Infinity` when piped (never truncate scripts' input). */
  width: number;
}

export function createOutput(rt: Runtime, colorFlag?: boolean): Output {
  const c = shouldUseColor(rt.stdout, rt.env, colorFlag) ? ANSI : PLAIN;
  const ce = shouldUseColor(rt.stderr, rt.env, colorFlag) ? ANSI : PLAIN;
  return {
    c,
    ce,
    line: (text = '') => void rt.stdout.write(`${text}\n`),
    err: (text = '') => void rt.stderr.write(`${text}\n`),
    json: (value) => void rt.stdout.write(`${JSON.stringify(value, null, 2)}\n`),
    width: rt.stdout.isTTY ? Math.max(40, rt.stdout.columns ?? 80) : Number.POSITIVE_INFINITY,
  };
}
