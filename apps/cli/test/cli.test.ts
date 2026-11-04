/**
 * End-to-end: spawns `node src/bin.ts` exactly as a user would, with a temporary
 * POUXIS_HOME and a fixed clock (Thursday 8 October 2026, 09:00 in Paris).
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { VERSION } from '../src/version.ts';

const BIN = fileURLToPath(new URL('../src/bin.ts', import.meta.url));
const HAS_UNZIP = spawnSync('unzip', ['-v'], { stdio: 'ignore' }).status === 0;

let home: string;
let cwd: string;

function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const {
    NO_COLOR: _n,
    FORCE_COLOR: _f,
    LANG: _l,
    LC_ALL: _a,
    LC_MESSAGES: _m,
    ...rest
  } = process.env;
  return {
    ...rest,
    POUXIS_HOME: home,
    POUXIS_NOW: '2026-10-08T07:00:00Z',
    TZ: 'Europe/Paris',
    ...extra,
  };
}

function cli(args: string[], extra: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd, env: env(extra), encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function json<T = unknown>(args: string[]): T {
  const r = cli([...args, '--json']);
  expect(r.code, r.err).toBe(0);
  return JSON.parse(r.out) as T;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'pouxis-home-'));
  cwd = mkdtempSync(join(tmpdir(), 'pouxis-cwd-'));
});

type Row = { id: string; title: string; status: string; tags: string[] };

describe('pouxis CLI', () => {
  it('prints its version and help, in French by default and in English on request', () => {
    expect(cli(['--version']).out.trim()).toBe(`pouxis ${VERSION} (schéma de données 1)`);
    const fr = cli(['help']);
    expect(fr.code).toBe(0);
    expect(fr.out).toContain('Commandes');
    const en = cli(['help', 'plan', '--lang', 'en']);
    expect(en.out).toContain('Plan a day and print it as a timeline');
    expect(cli(['ls', '--help'], { LANG: 'en_US.UTF-8' }).out).toContain('List tasks');
    expect(cli([]).code).toBe(2);
  });

  it('adds, lists, edits, completes and removes tasks', () => {
    const added = json<{ kind: string; record: Row }>([
      'add',
      'Appeler le plombier demain #maison',
    ]);
    expect(added).toMatchObject({
      kind: 'task',
      record: { title: 'Appeler le plombier', tags: ['maison'] },
    });
    json(['add', 'Réunion projet X mardi prochain 14h-16h avec @paul']);
    json(['add', 'Lire un livre #perso']);
    expect(json<Row[]>(['ls']).map((t) => t.title)).toEqual([
      'Appeler le plombier',
      'Lire un livre',
    ]);
    expect(json<Row[]>(['ls', '--tag', 'maison'])).toHaveLength(1);
    expect(json<unknown[]>(['ls', '--events'])).toHaveLength(1);

    const id = added.record.id.slice(0, 6);
    const edited = json<{ record: Row & { priority: number } }>([
      'edit',
      id,
      '--priority',
      'haute',
      '--tag',
      'urgent',
    ]);
    expect(edited.record).toMatchObject({ priority: 3, tags: ['maison', 'urgent'] });

    const human = cli(['done', id]);
    expect(human.code).toBe(0);
    expect(human.out).toContain('Terminée');
    expect(json<Row[]>(['ls', '--status', 'done']).map((t) => t.title)).toEqual([
      'Appeler le plombier',
    ]);

    expect(cli(['rm', id]).code).toBe(0);
    expect(json<Row[]>(['ls', '--all'])).toHaveLength(1);
  });

  it('plans a day as a timeline and saves the slots', () => {
    cli(['add', 'Point équipe 10h-11h']);
    cli(['add', 'Écrire le rapport pendant 1h30']);
    const preview = cli(['plan']);
    expect(preview.code).toBe(0);
    expect(preview.out).toMatch(/10:00 │ ## Point équipe 10:00–11:00/);
    // The task does not fit before the meeting, so it goes right after it.
    expect(preview.out).toMatch(/11:00 │ == Écrire le rapport 11:00–12:30/);
    expect(json<Row[]>(['ls'])[0]).not.toHaveProperty('scheduled');

    const saved = json<{ proposals: unknown[]; saved: boolean }>(['plan', '--save']);
    expect(saved).toMatchObject({ saved: true });
    expect(saved.proposals).toHaveLength(1);
    expect(json<Row[]>(['ls', '--today'])[0]).toHaveProperty('scheduled');
    expect(cli(['plan', '--step', '7']).code).toBe(2);
  });

  it('searches every collection', () => {
    cli(['add', 'Appeler le plombier pour la fuite']);
    const hits = json<{ title: string }[]>(['search', 'plombier']);
    expect(hits.map((h) => h.title)).toEqual(['Appeler le plombier pour la fuite']);
    expect(cli(['search', 'introuvable']).out).toContain('Aucun résultat');
  });

  it.skipIf(!HAS_UNZIP)('exports to a ZIP that unzip accepts and imports it back', () => {
    cli(['add', 'Tâche à sauvegarder #été']);
    const exported = json<{ path: string; files: string[] }>(['export', '--zip', 'backup.zip']);
    expect(exported.files).toContain('manifest.json');
    const test = spawnSync('unzip', ['-t', exported.path], { encoding: 'utf8' });
    expect(test.stdout).toContain('No errors detected');
    expect(cli(['export', '--zip', 'backup.zip']).code).toBe(1); // exists, no --force

    const fresh = mkdtempSync(join(tmpdir(), 'pouxis-home-'));
    const r = spawnSync(process.execPath, [BIN, 'import', exported.path, '--json'], {
      cwd,
      env: env({ POUXIS_HOME: fresh }),
      encoding: 'utf8',
    });
    expect(JSON.parse(r.stdout).stats.tasks).toEqual({
      added: 1,
      updated: 0,
      unchanged: 0,
      removed: 0,
    });
    const data = JSON.parse(readFileSync(join(fresh, 'data.json'), 'utf8'));
    expect(data.collections.tasks[0].title).toBe('Tâche à sauvegarder');
  });

  it('exports to a directory with one JSON per collection', () => {
    cli(['add', 'Une tâche']);
    expect(cli(['export', '--dir', 'out']).code).toBe(0);
    const files = readdirSync(join(cwd, 'out')).sort();
    expect(files).toEqual([
      'README.md',
      'events.json',
      'graphs.json',
      'journal.json',
      'manifest.json',
      'notes.json',
      'prefs.json',
      'tasks.json',
    ]);
    const merged = json<{ stats: { tasks: { unchanged: number } } }>([
      'import',
      'out',
      '--dry-run',
    ]);
    expect(merged.stats.tasks.unchanged).toBe(1);
  });

  it('reads and writes preferences', () => {
    expect(cli(['config', 'set', 'timeZone', 'America/Montreal']).code).toBe(0);
    expect(cli(['config', 'get', 'timeZone']).out.trim()).toBe('America/Montreal');
    expect(cli(['config', 'set', 'workingHours.start', '25:00']).code).toBe(2);
    expect(cli(['config', 'set', 'nope', '1']).code).toBe(2);
    expect(cli(['config', 'path']).out.trim()).toBe(join(home, 'data.json'));
  });

  it('fails helpfully with the right exit codes', () => {
    const unknown = cli(['lsit']);
    expect(unknown).toMatchObject({ code: 2 });
    expect(unknown.err).toContain('Vouliez-vous dire « list » ?');
    expect(cli(['done', 'zzzz']).code).toBe(1);
    expect(cli(['ls', '--bogus']).code).toBe(2);
    expect(cli(['add']).code).toBe(2);
    writeFileSync(join(home, 'data.json'), '{oops');
    const corrupt = cli(['ls']);
    expect(corrupt.code).toBe(1);
    expect(corrupt.err).toContain('illisible');
  });

  it('never colours piped output, and honours NO_COLOR with --color', () => {
    cli(['add', 'Couleur #test']);
    expect(cli(['ls']).out).not.toContain('\u001b[');
    expect(cli(['ls', '--color']).out).toContain('\u001b[');
    expect(cli(['ls', '--color'], { NO_COLOR: '1' }).out).not.toContain('\u001b[');
  });

  it('keeps every write when several processes add at once', async () => {
    const runs = Array.from(
      { length: 8 },
      (_, i) =>
        new Promise<number | null>((resolve) => {
          const child = spawn(process.execPath, [BIN, 'add', `Tâche ${i}`], {
            cwd,
            env: env(),
            stdio: 'ignore',
          });
          child.on('exit', resolve);
        }),
    );
    expect(await Promise.all(runs)).toEqual(Array(8).fill(0));
    const data = JSON.parse(readFileSync(join(home, 'data.json'), 'utf8'));
    expect(data.collections.tasks).toHaveLength(8);
    expect(data.revision).toBe(8);
  });
});

describe('package', () => {
  it('declares the same version as the binary', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.version).toBe(VERSION);
  });
});
