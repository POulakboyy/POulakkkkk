import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** `npm run bench:vitest`: the same scenarios as `bench/run.ts`, through vitest's runner. */
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    setupFiles: ['./test/setup.ts'],
    benchmark: {
      include: ['bench/**/*.bench.ts'],
      // Module-runner getter overhead is a known vitest caveat; `bench/run.ts` is the
      // reference measurement (plain Node, no module runner).
      suppressExportGetterWarnings: true,
    },
  },
});
