/** Helpers shared by several commands. */
import type { OptionsSpec } from '../args.ts';
import type { Context } from '../context.ts';
import { UsageError } from '../errors.ts';
import { dateFormatter, parseDateInput } from '../format/dates.ts';
import type { DateFormatter, DateInput } from '../format/dates.ts';
import type { RenderContext } from '../format/records.ts';
import { allRefIds, shortIds } from '../records.ts';
import type { DataFile } from '../store/schema.ts';

export interface Command {
  name: string;
  aliases?: readonly string[];
  options: OptionsSpec;
  run(ctx: Context): Promise<void>;
}

export function formatterFor(ctx: Context, data: DataFile): DateFormatter {
  return dateFormatter(ctx.m, data.prefs.timeZone, ctx.now);
}

export function renderContext(ctx: Context, data: DataFile): RenderContext {
  return {
    m: ctx.m,
    c: ctx.out.c,
    dates: formatterFor(ctx, data),
    now: ctx.now,
    ids: shortIds(allRefIds(data)),
    width: ctx.out.width,
  };
}

/** Parses a date option, throwing a usage error with the accepted formats on failure. */
export function dateOption(
  ctx: Context,
  value: string,
  timeZone: string,
  command: string,
): DateInput {
  const parsed = parseDateInput(value, ctx.now, timeZone);
  if (parsed === undefined) {
    throw new UsageError(ctx.m.errors.invalidDate(value), { hint: ctx.m.errors.dateHint, command });
  }
  return parsed;
}

export function rejectExtraArgs(ctx: Context, command: string, max: number): void {
  const extra = ctx.args.positionals.slice(max);
  if (extra.length > 0) {
    throw new UsageError(ctx.m.errors.unexpectedArgs(extra.join(' ')), {
      hint: ctx.m.errors.seeHelp(command),
      command,
    });
  }
}

/** A strictly positive integer option, or `fallback` when absent. */
export function intOption(ctx: Context, name: string, fallback: number, command: string): number {
  const raw = ctx.args.string(name);
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new UsageError(ctx.m.errors.invalidNumber(`--${name}`, raw), { command });
  }
  return Number(raw);
}
