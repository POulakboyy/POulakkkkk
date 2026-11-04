/** Error codes raised by the replication layer. */
export type SyncErrorCode =
  /** A value, operation or snapshot does not match the expected shape. */
  | 'invalid'
  /** An HLC string or node id is malformed. */
  | 'invalid-hlc'
  /** A remote clock is further ahead of the local physical clock than the tolerated drift. */
  | 'clock-drift'
  /** A wire frame or batch cannot be decoded. */
  | 'decode'
  /** A text patch does not apply to the given base text. */
  | 'patch-mismatch';

export class SyncError extends Error {
  override readonly name = 'SyncError';
  readonly code: SyncErrorCode;

  constructor(code: SyncErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
  }
}

export function isSyncError(error: unknown, code?: SyncErrorCode): error is SyncError {
  return error instanceof SyncError && (code === undefined || error.code === code);
}
