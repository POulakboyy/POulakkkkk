/** Everything a command needs: runtime, messages, output, data store and parsed options. */
import { homedir as osHomedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ParsedArgs } from './args.ts';
import type { Lang, Messages } from './i18n/index.ts';
import type { Output } from './output.ts';
import type { Runtime } from './runtime.ts';
import { DataStore } from './store/store.ts';

export interface Context {
  rt: Runtime;
  lang: Lang;
  m: Messages;
  out: Output;
  store: DataStore;
  /** `$POUXIS_HOME` resolved. */
  home: string;
  /** Frozen for the whole invocation so every command sees one consistent instant. */
  now: number;
  args: ParsedArgs;
  json: boolean;
}

/** `--home` > `$POUXIS_HOME` > `~/.pouxis`. */
export function resolveHome(rt: Runtime, flag: string | undefined): string {
  const raw = flag ?? rt.env.POUXIS_HOME;
  if (raw && raw.trim() !== '') return resolve(rt.cwd, expandTilde(raw.trim(), rt.homedir));
  return join(rt.homedir || osHomedir(), '.pouxis');
}

function expandTilde(path: string, home: string): string {
  if (path === '~') return home;
  if (path.startsWith('~/')) return join(home, path.slice(2));
  return path;
}

/** The host's IANA zone, used only to seed the preferences of a brand-new store. */
export function hostTimeZone(env: Runtime['env']): string | undefined {
  const tz = env.TZ?.trim();
  if (tz && !tz.startsWith(':')) return tz;
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
