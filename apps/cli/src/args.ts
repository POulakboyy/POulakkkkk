/**
 * Command-line parsing on top of `node:util` `parseArgs`, with translated errors and
 * "did you mean" suggestions for mistyped commands and options.
 */
import { parseArgs } from 'node:util';
import { UsageError } from './errors.ts';
import type { Messages } from './i18n/index.ts';

export interface OptionSpec {
  type: 'string' | 'boolean';
  short?: string;
  multiple?: boolean;
}

export type OptionsSpec = Readonly<Record<string, OptionSpec>>;

/** Options every command accepts. */
export const GLOBAL_OPTIONS = {
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'V' },
  json: { type: 'boolean' },
  lang: { type: 'string' },
  home: { type: 'string' },
  color: { type: 'boolean' },
} as const satisfies OptionsSpec;

/** Global options that take a value, so their value is not mistaken for the command name. */
const GLOBAL_WITH_VALUE = new Set(['--lang', '--home']);

/** Splits `argv` into the command name (first positional) and everything else. */
export function splitCommand(argv: readonly string[]): { command?: string; rest: string[] } {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;
    if (token === '--') break;
    if (token.startsWith('-') && token.length > 1) {
      if (GLOBAL_WITH_VALUE.has(token)) i++;
      continue;
    }
    return { command: token, rest: [...argv.slice(0, i), ...argv.slice(i + 1)] };
  }
  return { rest: [...argv] };
}

/**
 * Value of a global option found anywhere in `argv`, before full parsing (the language and
 * colour settings are needed to report parsing errors themselves).
 */
export function peekOption(argv: readonly string[], name: string): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;
    if (token === '--') break;
    if (token === `--${name}`) return argv[i + 1];
    if (token.startsWith(`--${name}=`)) return token.slice(name.length + 3);
  }
  return undefined;
}

/** `true` for `--color`, `false` for `--no-color`, `undefined` when absent (last one wins). */
export function peekColorFlag(argv: readonly string[]): boolean | undefined {
  let flag: boolean | undefined;
  for (const token of argv) {
    if (token === '--') break;
    if (token === '--color') flag = true;
    if (token === '--no-color') flag = false;
  }
  return flag;
}

export class ParsedArgs {
  readonly positionals: string[];
  private readonly values: Record<string, string | boolean | (string | boolean)[] | undefined>;

  constructor(
    values: Record<string, string | boolean | (string | boolean)[] | undefined>,
    positionals: string[],
  ) {
    this.values = values;
    this.positionals = positionals;
  }

  string(name: string): string | undefined {
    const v = this.values[name];
    if (Array.isArray(v)) {
      const last = v[v.length - 1];
      return typeof last === 'string' ? last : undefined;
    }
    return typeof v === 'string' ? v : undefined;
  }

  bool(name: string): boolean {
    return this.values[name] === true;
  }

  /** Optional boolean: `undefined` when the flag was not given at all. */
  flag(name: string): boolean | undefined {
    const v = this.values[name];
    return typeof v === 'boolean' ? v : undefined;
  }

  list(name: string): string[] {
    const v = this.values[name];
    if (v === undefined) return [];
    return (Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === 'string');
  }

  has(name: string): boolean {
    return this.values[name] !== undefined;
  }
}

/** Parses the arguments of `command` (global options included); throws `UsageError`. */
export function parseCommandArgs(
  args: readonly string[],
  options: OptionsSpec,
  m: Messages,
  command?: string,
): ParsedArgs {
  const spec = { ...GLOBAL_OPTIONS, ...options };
  try {
    const { values, positionals } = parseArgs({
      args: [...args],
      options: spec,
      allowPositionals: true,
      allowNegative: true,
      strict: true,
    });
    return new ParsedArgs({ ...values }, positionals);
  } catch (error) {
    throw translateParseError(error, spec, m, command);
  }
}

function translateParseError(error: unknown, spec: OptionsSpec, m: Messages, command?: string): Error {
  const err = error as { code?: string; message?: string };
  const message = err.message ?? String(error);
  const quoted = /'([^']+)'/.exec(message)?.[1] ?? '';
  const flag = quoted.split(' ')[0] ?? quoted;
  switch (err.code) {
    case 'ERR_PARSE_ARGS_UNKNOWN_OPTION': {
      const known = Object.entries(spec).flatMap(([name, o]) => [
        `--${name}`,
        ...(o.short ? [`-${o.short}`] : []),
        ...(o.type === 'boolean' ? [`--no-${name}`] : []),
      ]);
      const guess = suggest(flag.split('=')[0] ?? flag, known);
      return new UsageError(m.errors.unknownOption(flag), {
        hint: guess ? m.errors.didYouMean(guess) : m.errors.seeHelp(command),
        command,
      });
    }
    case 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE':
      return new UsageError(
        /does not take an argument/.test(message) ? m.errors.noValue(flag) : m.errors.missingValue(flag),
        { hint: m.errors.seeHelp(command), command },
      );
    default:
      return new UsageError(m.errors.badArgs(message), { hint: m.errors.seeHelp(command), command });
  }
}

/** Optimal string alignment distance (Levenshtein with transpositions). */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[] = new Array<number>(rows * cols).fill(0);
  const at = (i: number, j: number): number => d[i * cols + j] as number;
  for (let i = 0; i < rows; i++) d[i * cols] = i;
  for (let j = 0; j < cols; j++) d[j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + 1);
      }
      d[i * cols + j] = best;
    }
  }
  return at(a.length, b.length);
}

/** The closest candidate within a typo-sized distance, or `undefined`. */
export function suggest(input: string, candidates: readonly string[]): string | undefined {
  const needle = input.toLowerCase();
  const limit = Math.max(1, Math.floor(needle.length / 3));
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = editDistance(needle, candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  if (best !== undefined && bestDistance <= limit) return best;
  // A unique candidate starting with the input ("exp" → "export") is a good guess too.
  const prefixed = candidates.filter((c) => needle.length >= 2 && c.toLowerCase().startsWith(needle));
  return prefixed.length === 1 ? prefixed[0] : undefined;
}
