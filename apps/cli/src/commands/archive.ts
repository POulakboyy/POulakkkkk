import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { COLLECTIONS } from '@pouxis/core';
import {
  BundleError,
  applyBundle,
  buildBundle,
  defaultExportName,
  parseBundle,
} from '../archive/bundle.ts';
import type { Bundle, ImportStats } from '../archive/bundle.ts';
import { readBundleFiles, writeDirBundle, writeZipBundle } from '../archive/io.ts';
import type { Context } from '../context.ts';
import { CliError, UsageError } from '../errors.ts';
import { SCHEMA_VERSION } from '../store/schema.ts';
import { ZipError } from '../zip/index.ts';
import { VERSION } from '../version.ts';
import { rejectExtraArgs } from './shared.ts';
import type { Command } from './shared.ts';

export const exportCommand: Command = {
  name: 'export',
  aliases: ['backup'],
  options: {
    zip: { type: 'string' },
    dir: { type: 'string' },
    force: { type: 'boolean', short: 'f' },
  },
  async run(ctx) {
    rejectExtraArgs(ctx, 'export', 0);
    const { m, out, args } = ctx;
    const zip = args.string('zip');
    const dir = args.string('dir');
    if (zip !== undefined && dir !== undefined)
      throw new UsageError(m.export.both, { command: 'export' });

    const data = await ctx.store.load();
    const files = buildBundle(data, ctx.now, `pouxis-cli ${VERSION}`, m.export.readmeTitle);
    const force = args.bool('force');
    let target: string;
    if (dir !== undefined) {
      target = resolve(ctx.rt.cwd, dir);
      await ensureWritableDir(ctx, target, force);
      await writeDirBundle(target, files);
    } else {
      target = resolve(ctx.rt.cwd, zip ?? `${defaultExportName(ctx.now, data.prefs.timeZone)}.zip`);
      if (!force && (await exists(target)))
        throw new CliError(m.export.exists(target), { hint: m.export.existsHint });
      await writeZipBundle(target, files, new Date(ctx.now));
    }

    const counts = Object.fromEntries(COLLECTIONS.map((n) => [n, data.collections[n].length]));
    const markdown = files.filter((f) => f.name.startsWith('notes/')).length;
    if (ctx.json) {
      out.json({
        path: target,
        format: dir !== undefined ? 'dir' : 'zip',
        schemaVersion: SCHEMA_VERSION,
        counts,
        files: files.map((f) => f.name),
      });
      return;
    }
    out.line(`${out.c.green('✓')} ${m.export.done(target)}`);
    const summary = COLLECTIONS.map((n) => `${m.collections[n]} ${data.collections[n].length}`);
    out.line(out.c.dim(`  ${[...summary, m.export.markdown(markdown)].join(' · ')}`));
  },
};

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureWritableDir(ctx: Context, dir: string, force: boolean): Promise<void> {
  let entries: string[];
  try {
    const info = await stat(dir);
    if (!info.isDirectory())
      throw new CliError(ctx.m.export.exists(dir), { hint: ctx.m.export.existsHint });
    entries = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  if (entries.length > 0 && !force)
    throw new CliError(ctx.m.export.notEmpty(dir), { hint: ctx.m.export.existsHint });
}

export const importCommand: Command = {
  name: 'import',
  aliases: ['restore'],
  options: { replace: { type: 'boolean' }, 'dry-run': { type: 'boolean', short: 'n' } },
  async run(ctx) {
    rejectExtraArgs(ctx, 'import', 1);
    const { m, out, args } = ctx;
    const source = args.positionals[0];
    if (source === undefined)
      throw new UsageError(m.import.missingSource, {
        hint: m.errors.seeHelp('import'),
        command: 'import',
      });
    const path = resolve(ctx.rt.cwd, source);
    const bundle = await loadBundle(ctx, path);
    const mode = args.bool('replace') ? 'replace' : 'merge';
    const dryRun = args.bool('dry-run');

    let stats: ImportStats;
    if (dryRun) stats = applyBundle(await ctx.store.load(), bundle, mode);
    else stats = await ctx.store.transact((data) => applyBundle(data, bundle, mode));

    if (ctx.json) {
      out.json({
        source: path,
        mode,
        dryRun,
        stats,
        backup: dryRun ? undefined : ctx.store.backupFile,
      });
      return;
    }
    const modeLabel = mode === 'replace' ? m.import.replace : m.import.merge;
    out.line(
      dryRun
        ? out.c.yellow(m.import.dryRun(path, modeLabel))
        : `${out.c.green('✓')} ${m.import.done(path, modeLabel)}`,
    );
    const width = Math.max(...COLLECTIONS.map((n) => m.collections[n].length));
    for (const name of COLLECTIONS) {
      const s = stats[name];
      const removed = s.removed > 0 ? ` · ${m.import.removedRow(s.removed)}` : '';
      out.line(
        `  ${m.collections[name].padEnd(width)}  ${m.import.row(s.added, s.updated, s.unchanged)}${removed}`,
      );
    }
    if (mode === 'replace' && bundle.prefs) out.line(`  ${m.import.prefsReplaced}`);
    if (!dryRun) out.line(out.c.dim(m.import.backup(ctx.store.backupFile)));
  },
};

async function loadBundle(ctx: Context, path: string): Promise<Bundle> {
  const { m } = ctx;
  let files: Map<string, string>;
  try {
    files = await readBundleFiles(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new CliError(m.import.notFound(path));
    if (error instanceof ZipError) throw new CliError(m.import.badZip(path, error.message));
    throw error;
  }
  try {
    return parseBundle((name) => files.get(name));
  } catch (error) {
    if (!(error instanceof BundleError)) throw error;
    const p = error.problem;
    switch (p.kind) {
      case 'not-export':
        throw new CliError(m.import.notExport(path));
      case 'bad-manifest':
        throw new CliError(m.import.badManifest(p.detail));
      case 'too-new':
        throw new CliError(m.import.tooNew(p.version, SCHEMA_VERSION), {
          hint: m.import.tooNewHint,
        });
      case 'bad-file':
        throw new CliError(m.import.badFile(p.file, p.detail));
      case 'bad-records':
        throw new CliError(m.import.badRecords(p.file, p.count));
    }
  }
}
