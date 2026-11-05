/**
 * Plain Node benchmark runner (no vitest): `node bench/run.ts [options]`.
 *
 *   --filter <text>     only scenarios whose name contains <text> (repeatable)
 *   --group <group>     only one group (tasks, scheduler, recurrence, nlp, search, graph, sync, insights)
 *   --json <file>       write the results as JSON
 *   --compare <file>    print the speed-up against a previous JSON result file
 *   --check-budgets     exit with code 1 when a median exceeds its budget
 *   --quick             fewer samples (smoke run, e.g. in CI)
 *
 * Each scenario is set up once, warmed up, then sampled until a time budget is spent. The
 * median is the headline figure: it is robust to GC pauses and JIT tier-ups.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { SCENARIOS, type Scenario } from './scenarios.ts';

interface Result {
  group: string;
  name: string;
  samples: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  meanMs: number;
  budgetMs?: number;
}

interface Report {
  date: string;
  machine: Record<string, string | number>;
  results: Result[];
}

interface Args {
  filters: string[];
  group?: string;
  json?: string;
  compare?: string;
  checkBudgets: boolean;
  quick: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { filters: [], checkBudgets: false, quick: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === '--filter') args.filters.push(value());
    else if (flag === '--group') args.group = value();
    else if (flag === '--json') args.json = value();
    else if (flag === '--compare') args.compare = value();
    else if (flag === '--check-budgets') args.checkBudgets = true;
    else if (flag === '--quick') args.quick = true;
    else throw new Error(`unknown option ${flag}`);
  }
  return args;
}

function quantile(sorted: readonly number[], q: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i] as number;
}

/** Keeps the result alive so the JIT cannot drop the timed call as dead code. */
let sink: unknown;

function measure(scenario: Scenario, quick: boolean): Result {
  const fn = scenario.setup();
  const heavy = scenario.heavy === true;
  const warmup = quick || heavy ? 1 : 5;
  for (let i = 0; i < warmup; i++) sink = fn();

  const minSamples = quick ? 3 : heavy ? 5 : 10;
  const maxSamples = quick ? 10 : heavy ? 15 : 200;
  const timeBudgetMs = quick ? 300 : heavy ? 5_000 : 1_500;
  const times: number[] = [];
  const started = performance.now();
  while (
    times.length < minSamples ||
    (times.length < maxSamples && performance.now() - started < timeBudgetMs)
  ) {
    const t0 = performance.now();
    sink = fn();
    times.push(performance.now() - t0);
  }
  const sorted = [...times].sort((a, b) => a - b);
  const result: Result = {
    group: scenario.group,
    name: scenario.name,
    samples: times.length,
    medianMs: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
    minMs: sorted[0] as number,
    meanMs: times.reduce((a, b) => a + b, 0) / times.length,
  };
  if (scenario.budgetMs !== undefined) result.budgetMs = scenario.budgetMs;
  return result;
}

function machine(): Record<string, string | number> {
  const cpus = os.cpus();
  return {
    node: process.version,
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    cpu: cpus[0]?.model.trim() ?? 'unknown',
    cores: cpus.length,
    memoryGiB: Math.round(os.totalmem() / 2 ** 30),
  };
}

const ms = (v: number): string => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(3));

function printTable(results: readonly Result[], baseline?: Report): void {
  const before = new Map(baseline?.results.map((r) => [r.name, r]) ?? []);
  const header = ['scénario', 'médiane ms', 'p95 ms', 'budget ms', 'statut'];
  if (baseline) header.push('avant ms', 'gain');
  console.log(`| ${header.join(' | ')} |`);
  console.log(`|${header.map(() => '---').join('|')}|`);
  for (const r of results) {
    const status = r.budgetMs === undefined ? '' : r.medianMs <= r.budgetMs ? 'OK' : 'DÉPASSÉ';
    const row = [r.name, ms(r.medianMs), ms(r.p95Ms), r.budgetMs?.toString() ?? '', status];
    if (baseline) {
      const old = before.get(r.name);
      row.push(
        old ? ms(old.medianMs) : '',
        old ? `×${(old.medianMs / r.medianMs).toFixed(1)}` : '',
      );
    }
    console.log(`| ${row.join(' | ')} |`);
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const selected = SCENARIOS.filter(
    (s) =>
      (args.group === undefined || s.group === args.group) &&
      (args.filters.length === 0 || args.filters.some((f) => s.name.includes(f))),
  );
  if (selected.length === 0) throw new Error('no scenario matches the filters');

  const results: Result[] = [];
  for (const scenario of selected) {
    const result = measure(scenario, args.quick);
    results.push(result);
    process.stderr.write(`${scenario.name}: ${ms(result.medianMs)} ms (n=${result.samples})\n`);
  }
  void sink;

  const baseline = args.compare
    ? (JSON.parse(readFileSync(args.compare, 'utf8')) as Report)
    : undefined;
  const report: Report = { date: new Date().toISOString(), machine: machine(), results };
  console.log(`\n${JSON.stringify(report.machine)}\n`);
  printTable(results, baseline);
  if (args.json) writeFileSync(args.json, `${JSON.stringify(report, null, 2)}\n`);

  const over = results.filter((r) => r.budgetMs !== undefined && r.medianMs > r.budgetMs);
  if (args.checkBudgets && over.length > 0) {
    console.error(`\n${over.length} budget(s) dépassé(s) : ${over.map((r) => r.name).join(', ')}`);
    process.exitCode = 1;
  }
}

main();
