#!/usr/bin/env node
import { homedir } from 'node:os';
import { run } from './main.ts';
import { clockFromEnv } from './runtime.ts';

// `pouxis ls | head`: a closed pipe ends the program quietly, as Unix tools do.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE') process.exit(process.exitCode ?? 0);
    throw error;
  });
}

const code = await run(process.argv.slice(2), {
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  cwd: process.cwd(),
  now: clockFromEnv(process.env),
  homedir: homedir(),
});
process.exitCode = code;
