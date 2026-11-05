/**
 * Registers the scenarios of one group as vitest benchmarks (`npx vitest bench`). Vitest 5
 * exposes `bench` as a test-context fixture; each scenario is one test that sets up its data
 * (untimed) and then runs the measurement. Heavy scenarios get a handful of iterations.
 */
import { test } from 'vitest';
import { scenariosOf, type Group } from './scenarios.ts';

export function benchGroup(group: Group): void {
  for (const scenario of scenariosOf(group)) {
    test(scenario.name, { timeout: 300_000 }, async ({ bench }) => {
      const fn = scenario.setup();
      const options = scenario.heavy
        ? { iterations: 5, time: 0, warmupIterations: 1, warmupTime: 0 }
        : { time: 1_000 };
      await bench(scenario.name, () => void fn()).run(options);
    });
  }
}
