/**
 * Everything the CLI needs from its host, injected so the whole program runs in-process in
 * tests (fake streams, fixed clock, temporary home) exactly as it does from `bin.ts`.
 */

export interface OutputStream {
  write(chunk: string): unknown;
  /** Set when the stream is an interactive terminal. */
  isTTY?: boolean;
  /** Terminal width in columns, when known. */
  columns?: number;
}

export interface Runtime {
  env: Readonly<Record<string, string | undefined>>;
  stdout: OutputStream;
  stderr: OutputStream;
  cwd: string;
  /** Current time in epoch milliseconds. */
  now(): number;
  /** The user's home directory, used for the default `~/.pouxis`. */
  homedir: string;
}

/**
 * Current time, honouring `POUXIS_NOW` (ISO 8601 or epoch milliseconds) so scripts and tests
 * can replay a given day deterministically.
 */
export function clockFromEnv(env: Runtime['env'], fallback: () => number = Date.now): () => number {
  const raw = env.POUXIS_NOW?.trim();
  if (!raw) return fallback;
  const value = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
  if (!Number.isFinite(value)) return fallback;
  return () => value;
}
