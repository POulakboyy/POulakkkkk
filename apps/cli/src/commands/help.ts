import type { CommandHelp, HelpRow, Messages } from '../i18n/index.ts';
import type { Palette } from '../output.ts';
import type { Command } from './shared.ts';

export type HelpTopic = keyof Messages['commands'];

function rows(list: readonly HelpRow[], c: Palette): string[] {
  const width = Math.max(...list.map(([flag]) => flag.length));
  return list.map(([flag, text]) => `  ${c.cyan(flag.padEnd(width))}  ${text}`);
}

/** General help: every command with its summary, global options, environment. */
export function generalHelp(
  m: Messages,
  c: Palette,
  commands: readonly Command[],
  dataFile: string,
): string[] {
  const h = m.help;
  const commandRows: HelpRow[] = commands.map((cmd) => [
    cmd.name,
    m.commands[cmd.name as HelpTopic].summary,
  ]);
  return [
    `${c.bold('pouxis')} — ${h.tagline}`,
    '',
    c.bold(h.usage),
    `  ${h.synopsis}`,
    '',
    c.bold(h.commands),
    ...rows(commandRows, c),
    '',
    c.bold(h.globalOptions),
    ...rows(h.global, c),
    '',
    c.bold(h.environment),
    ...rows(h.env, c),
    '',
    c.dim(h.data(dataFile)),
    c.dim(h.exitCodes),
    c.dim(h.footer),
  ];
}

/** Help of one command, its aliases included. */
export function commandHelp(m: Messages, c: Palette, command: Command): string[] {
  const help: CommandHelp = m.commands[command.name as HelpTopic];
  const lines = [
    `${c.bold(`pouxis ${command.name}`)} — ${help.summary}`,
    '',
    c.bold(m.help.usage),
    `  ${help.usage}`,
  ];
  if (help.description) lines.push('', ...help.description.split('\n').map((l) => `  ${l}`));
  if (help.options.length > 0) lines.push('', c.bold(m.help.options), ...rows(help.options, c));
  if (command.aliases && command.aliases.length > 0) {
    lines.push('', c.bold(m.help.aliases), `  ${command.aliases.join(', ')}`);
  }
  if (help.examples.length > 0)
    lines.push('', c.bold(m.help.examples), ...help.examples.map((e) => `  ${c.dim('$')} ${e}`));
  lines.push('', c.bold(m.help.globalOptions), ...rows(m.help.global, c));
  return lines;
}
