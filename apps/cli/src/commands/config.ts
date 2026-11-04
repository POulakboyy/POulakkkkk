import { DEFAULT_PREFS } from '@pouxis/core';
import type { UserPrefs } from '@pouxis/core';
import type { Context } from '../context.ts';
import { UsageError } from '../errors.ts';
import { parseTimeOfDay } from '../format/dates.ts';
import type { Messages } from '../i18n/index.ts';
import { isValidTimeZone } from '../store/schema.ts';
import type { Command } from './shared.ts';

/** A preference addressable from the command line. */
interface Key {
  get(p: UserPrefs): string;
  /** Applies a textual value; returns an "expected …" description when invalid. */
  set(p: UserPrefs, value: string, m: Messages): string | undefined;
  reset(p: UserPrefs): void;
}

const DAY_NAMES: Readonly<Record<string, number>> = {
  dim: 0, sun: 0, lun: 1, mon: 1, mar: 2, tue: 2, mer: 3, wed: 3, jeu: 4, thu: 4, ven: 5,
  fri: 5, sam: 6, sat: 6,
}; // prettier-ignore

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function intKey(
  name: 'bufferMin' | 'makerBlockMin' | 'wipLimit' | 'decayThreshold',
  min: number,
): Key {
  return {
    get: (p) => String(p[name]),
    set: (p, value, m) => {
      if (!/^\d+$/.test(value.trim()) || Number(value) < min) return m.config.expected.int(min);
      p[name] = Number(value);
      return undefined;
    },
    reset: (p) => void (p[name] = DEFAULT_PREFS[name]),
  };
}

function hoursKey(edge: 'start' | 'end'): Key {
  return {
    get: (p) => hhmm(p.workingHours[edge]),
    set: (p, value, m) => {
      const minutes = value.trim() === '24:00' && edge === 'end' ? 24 * 60 : parseTimeOfDay(value);
      if (minutes === undefined) return m.config.expected.time;
      const next = { ...p.workingHours, [edge]: minutes };
      if (next.start >= next.end) return m.config.expected.hoursOrder;
      p.workingHours = next;
      return undefined;
    },
    reset: (p) =>
      void (p.workingHours = { ...p.workingHours, [edge]: DEFAULT_PREFS.workingHours[edge] }),
  };
}

export const KEYS: Readonly<Record<string, Key>> = {
  timeZone: {
    get: (p) => p.timeZone,
    set: (p, value, m) => {
      if (!isValidTimeZone(value.trim()) || value.trim() === '') return m.config.expected.timeZone;
      p.timeZone = value.trim();
      return undefined;
    },
    reset: (p) => void (p.timeZone = DEFAULT_PREFS.timeZone),
  },
  locale: {
    get: (p) => p.locale,
    set: (p, value, m) => {
      const v = value.trim().toLowerCase();
      if (v !== 'fr' && v !== 'en') return m.config.expected.locale;
      p.locale = v;
      return undefined;
    },
    reset: (p) => void (p.locale = DEFAULT_PREFS.locale),
  },
  'workingHours.start': hoursKey('start'),
  'workingHours.end': hoursKey('end'),
  'workingHours.days': {
    get: (p) => p.workingHours.days.join(','),
    set: (p, value, m) => {
      const days = parseDays(value);
      if (!days) return m.config.expected.days;
      p.workingHours = { ...p.workingHours, days };
      return undefined;
    },
    reset: (p) =>
      void (p.workingHours = { ...p.workingHours, days: [...DEFAULT_PREFS.workingHours.days] }),
  },
  bufferMin: intKey('bufferMin', 0),
  makerBlockMin: intKey('makerBlockMin', 0),
  wipLimit: intKey('wipLimit', 1),
  decayThreshold: intKey('decayThreshold', 0),
};

/** `1,2,3`, `lun,mar`, `mon-fri` → sorted unique weekday numbers (0 = Sunday). */
export function parseDays(value: string): number[] | undefined {
  const out = new Set<number>();
  for (const part of value
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean)) {
    const range = /^(\w+)-(\w+)$/.exec(part);
    const one = (s: string) => (/^[0-6]$/.test(s) ? Number(s) : DAY_NAMES[s.slice(0, 3)]);
    if (range) {
      const a = one(range[1] as string);
      const b = one(range[2] as string);
      if (a === undefined || b === undefined) return undefined;
      for (let d = a; ; d = (d + 1) % 7) {
        out.add(d);
        if (d === b) break;
      }
      continue;
    }
    const d = one(part);
    if (d === undefined) return undefined;
    out.add(d);
  }
  return out.size > 0 ? [...out].sort((a, b) => a - b) : undefined;
}

export const config: Command = {
  name: 'config',
  aliases: ['conf', 'prefs'],
  options: {},
  async run(ctx) {
    const { m, out } = ctx;
    const [sub, key, ...rest] = ctx.args.positionals;
    switch (sub) {
      case undefined:
      case 'get':
      case 'list': {
        const prefs = (await ctx.store.load()).prefs;
        if (key !== undefined) {
          const k = lookup(ctx, key);
          return ctx.json ? out.json({ [key]: k.get(prefs) }) : out.line(k.get(prefs));
        }
        if (ctx.json) return out.json(prefs);
        const width = Math.max(...Object.keys(KEYS).map((k) => k.length));
        for (const [name, k] of Object.entries(KEYS))
          out.line(`${out.c.cyan(name.padEnd(width))}  ${k.get(prefs)}`);
        return;
      }
      case 'set': {
        if (key === undefined || rest.length === 0) {
          throw new UsageError(m.config.subcommand, {
            hint: m.errors.seeHelp('config'),
            command: 'config',
          });
        }
        const value = rest.join(' ');
        const k = lookup(ctx, key);
        const shown = await ctx.store.transact((data) => {
          const problem = k.set(data.prefs, value, m);
          if (problem)
            throw new UsageError(m.config.invalid(key, value, problem), { command: 'config' });
          return k.get(data.prefs);
        });
        return ctx.json
          ? out.json({ [key]: shown })
          : out.line(`${out.c.green('✓')} ${m.config.set(key, shown)}`);
      }
      case 'unset': {
        if (key === undefined) throw new UsageError(m.config.subcommand, { command: 'config' });
        const k = lookup(ctx, key);
        const shown = await ctx.store.transact((data) => {
          k.reset(data.prefs);
          return k.get(data.prefs);
        });
        return ctx.json
          ? out.json({ [key]: shown })
          : out.line(`${out.c.green('✓')} ${m.config.unset(key, shown)}`);
      }
      case 'path':
        return ctx.json
          ? out.json({ home: ctx.home, file: ctx.store.file })
          : out.line(ctx.store.file);
      default:
        throw new UsageError(m.config.subcommand, {
          hint: m.errors.seeHelp('config'),
          command: 'config',
        });
    }
  },
};

function lookup(ctx: Context, key: string): Key {
  const k =
    KEYS[key] ??
    Object.entries(KEYS).find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
  if (!k)
    throw new UsageError(ctx.m.config.unknownKey(key), {
      hint: ctx.m.config.keys(Object.keys(KEYS).join(', ')),
    });
  return k;
}
