/**
 * Entry point of the CLI, independent of `process`: `run(argv, runtime)` returns the exit
 * code, so tests drive the whole program in-process and `bin.ts` only wires the real host.
 */
import { parseCommandArgs, peekColorFlag, peekOption, splitCommand, suggest } from './args.ts';
import { add } from './commands/add.ts';
import { exportCommand, importCommand } from './commands/archive.ts';
import { config } from './commands/config.ts';
import { done, rm } from './commands/done.ts';
import { edit } from './commands/edit.ts';
import { commandHelp, generalHelp } from './commands/help.ts';
import { ls } from './commands/ls.ts';
import { plan } from './commands/plan.ts';
import { search } from './commands/search.ts';
import type { Command } from './commands/shared.ts';
import { hostTimeZone, resolveHome } from './context.ts';
import type { Context } from './context.ts';
import { CliError, EXIT_ERROR, EXIT_OK, EXIT_USAGE, UsageError } from './errors.ts';
import { langFromEnv, langFromTag, messages } from './i18n/index.ts';
import type { Lang, Messages } from './i18n/index.ts';
import { createOutput } from './output.ts';
import type { Output } from './output.ts';
import type { Runtime } from './runtime.ts';
import { SCHEMA_VERSION } from './store/schema.ts';
import { DataStore, StoreError } from './store/store.ts';
import { VERSION } from './version.ts';

export const COMMANDS: readonly Command[] = [
  add,
  ls,
  done,
  edit,
  rm,
  plan,
  search,
  exportCommand,
  importCommand,
  config,
];

const HELP: Command = { name: 'help', aliases: [], options: {}, run: async () => {} };

export function findCommand(name: string): Command | undefined {
  const lower = name.toLowerCase();
  return [...COMMANDS, HELP].find((c) => c.name === lower || c.aliases?.includes(lower));
}

export async function run(argv: readonly string[], rt: Runtime): Promise<number> {
  const langFlag = peekOption(argv, 'lang');
  const lang: Lang = langFromTag(langFlag) ?? langFromEnv(rt.env);
  const m = messages(lang);
  const out = createOutput(rt, peekColorFlag(argv));
  try {
    if (langFlag !== undefined && langFromTag(langFlag) === undefined) {
      throw new UsageError(m.errors.invalidLang(langFlag));
    }
    return await dispatch(argv, rt, lang, m, out);
  } catch (error) {
    return report(error, m, out, rt);
  }
}

async function dispatch(
  argv: readonly string[],
  rt: Runtime,
  lang: Lang,
  m: Messages,
  out: Output,
): Promise<number> {
  const { command: name, rest } = splitCommand(argv);
  const homeFlag = peekOption(argv, 'home');
  const home = resolveHome(rt, homeFlag);
  const store = new DataStore({
    home,
    now: rt.now,
    initialPrefs: { timeZone: hostTimeZone(rt.env) ?? 'UTC', locale: lang },
  });

  if (name === undefined) {
    const args = parseCommandArgs(rest, {}, m);
    if (args.bool('version')) return printVersion(out, m, args.bool('json'));
    for (const line of generalHelp(m, out.c, COMMANDS, store.file)) out.line(line);
    return args.bool('help') ? EXIT_OK : EXIT_USAGE;
  }

  const command = findCommand(name);
  if (!command) {
    const names = [...COMMANDS, HELP].flatMap((c) => [c.name, ...(c.aliases ?? [])]);
    const guess = suggest(name, names);
    throw new UsageError(m.errors.unknownCommand(name), {
      hint: guess ? m.errors.didYouMean(guess) : m.errors.seeHelp(),
    });
  }
  const args = parseCommandArgs(rest, command.options, m, command.name);
  if (args.bool('version')) return printVersion(out, m, args.bool('json'));
  if (command === HELP) return printHelp(args.positionals[0], m, out, store.file);
  if (args.bool('help')) {
    for (const line of commandHelp(m, out.c, command)) out.line(line);
    return EXIT_OK;
  }
  const ctx: Context = {
    rt,
    lang,
    m,
    out,
    store,
    home,
    now: rt.now(),
    args,
    json: args.bool('json'),
  };
  await command.run(ctx);
  return EXIT_OK;
}

function printVersion(out: Output, m: Messages, json: boolean): number {
  if (json) out.json({ version: VERSION, schemaVersion: SCHEMA_VERSION });
  else out.line(m.version(VERSION, SCHEMA_VERSION));
  return EXIT_OK;
}

function printHelp(topic: string | undefined, m: Messages, out: Output, dataFile: string): number {
  if (topic === undefined) {
    for (const line of generalHelp(m, out.c, COMMANDS, dataFile)) out.line(line);
    return EXIT_OK;
  }
  const command = findCommand(topic);
  if (!command || command === HELP) {
    if (command === HELP) {
      for (const line of commandHelp(m, out.c, HELP)) out.line(line);
      return EXIT_OK;
    }
    const guess = suggest(
      topic,
      COMMANDS.map((c) => c.name),
    );
    throw new UsageError(m.errors.unknownCommand(topic), {
      hint: guess ? m.errors.didYouMean(guess) : m.errors.seeHelp(),
    });
  }
  for (const line of commandHelp(m, out.c, command)) out.line(line);
  return EXIT_OK;
}

/** Prints an error for humans (stderr) and returns the exit code. */
export function report(error: unknown, m: Messages, out: Output, rt: Runtime): number {
  const { ce } = out;
  const print = (message: string, hint?: string) => {
    out.err(`${ce.red(ce.bold(m.errors.prefix))} ${message}`);
    if (hint) out.err(ce.dim(hint));
  };
  if (error instanceof CliError) {
    print(error.message, error.hint);
    return error.exitCode;
  }
  if (error instanceof StoreError) {
    const e = m.errors;
    switch (error.code) {
      case 'corrupt':
        print(e.dataCorrupt(error.file, error.detail), e.dataCorruptHint(`${error.file}.bak`));
        break;
      case 'too-new':
        print(e.dataTooNew(error.file, Number(error.detail)), m.import.tooNewHint);
        break;
      case 'locked':
        print(e.locked(error.detail), e.lockedHint);
        break;
      case 'conflict':
        print(e.conflict, e.conflictHint);
        break;
    }
    return EXIT_ERROR;
  }
  const err = error as NodeJS.ErrnoException;
  if (typeof err?.code === 'string' && typeof err.syscall === 'string') {
    print(m.errors.io(err.message));
  } else {
    print(m.errors.unexpected(err?.message ?? String(error)), m.errors.debugHint);
  }
  if (rt.env.POUXIS_DEBUG) out.err(String(err?.stack ?? error));
  return EXIT_ERROR;
}
