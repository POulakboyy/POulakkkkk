/** Process exit codes. Scripts can rely on them. */
export const EXIT_OK = 0;
/** Runtime failure: missing record, unreadable file, lock timeout… */
export const EXIT_ERROR = 1;
/** Bad invocation: unknown command or option, missing or invalid argument. */
export const EXIT_USAGE = 2;

export interface CliErrorOptions {
  /** One actionable sentence printed under the message ("Essayez : …"). */
  hint?: string;
  cause?: unknown;
}

/** An expected failure with a user-facing (already translated) message. */
export class CliError extends Error {
  override name = 'CliError';
  readonly exitCode: number = EXIT_ERROR;
  readonly hint: string | undefined;

  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.hint = options.hint;
  }
}

/** The command line itself is wrong; exits with code 2 and points to the relevant help. */
export class UsageError extends CliError {
  override name = 'UsageError';
  override readonly exitCode: number = EXIT_USAGE;
  /** Command whose help is relevant, when known. */
  readonly command: string | undefined;

  constructor(message: string, options: CliErrorOptions & { command?: string } = {}) {
    super(message, options);
    this.command = options.command;
  }
}
