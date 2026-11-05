import { tasks as taskEngine } from '@pouxis/core';
import type { Task } from '@pouxis/core';
import { CliError, UsageError } from '../errors.ts';
import { removeRecord, resolveRef } from '../records.ts';
import type { Ref } from '../records.ts';
import type { Command } from './shared.ts';

export const done: Command = {
  name: 'done',
  aliases: ['do', 'check'],
  options: {},
  async run(ctx) {
    const { m, out } = ctx;
    const prefixes = ctx.args.positionals;
    if (prefixes.length === 0)
      throw new UsageError(m.errors.missingId, { hint: m.errors.idHint, command: 'done' });

    const report = await ctx.store.transact((data) => {
      const targets = prefixes.map((p) => resolveRef(data, p, m, 'done'));
      for (const ref of targets) {
        if (ref.kind === 'events') throw new CliError(m.done.notATask(ref.record.title));
      }
      const results: { task: Task; already: boolean; unlocked: Task[] }[] = [];
      for (const { record } of targets as Extract<Ref, { kind: 'tasks' }>[]) {
        if (record.status === 'done') {
          results.push({ task: record, already: true, unlocked: [] });
          continue;
        }
        const unlocked = taskEngine.unlockedBy(record.id, data.collections.tasks);
        record.status = 'done';
        record.completedAt = ctx.now;
        record.updatedAt = ctx.now;
        results.push({ task: record, already: false, unlocked });
      }
      return results;
    });

    if (ctx.json) {
      out.json(
        report.map((r) => ({
          id: r.task.id,
          title: r.task.title,
          already: r.already,
          unlocked: r.unlocked.map((u) => u.id),
        })),
      );
      return;
    }
    for (const r of report) {
      const label = r.already ? out.c.dim(m.done.already) : out.c.green(`✓ ${m.done.completed}`);
      out.line(`${label}  ${r.task.title}`);
      for (const u of r.unlocked) out.line(`  ${out.c.cyan('↳')} ${m.done.unlocked}  ${u.title}`);
    }
  },
};

export const rm: Command = {
  name: 'rm',
  aliases: ['remove', 'delete', 'del'],
  options: {},
  async run(ctx) {
    const { m, out } = ctx;
    const prefixes = ctx.args.positionals;
    if (prefixes.length === 0)
      throw new UsageError(m.errors.missingId, { hint: m.errors.idHint, command: 'rm' });
    const removed = await ctx.store.transact((data) => {
      const targets = prefixes.map((p) => resolveRef(data, p, m, 'rm'));
      for (const ref of targets) removeRecord(data, ref.record.id, ctx.now);
      return targets;
    });
    if (ctx.json) {
      out.json(removed.map((r) => ({ id: r.record.id, kind: r.kind, title: r.record.title })));
      return;
    }
    for (const r of removed) out.line(`${out.c.red('✗')} ${m.rm.removed}  ${r.record.title}`);
  },
};
