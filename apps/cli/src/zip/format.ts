/**
 * Constants and helpers shared by the ZIP writer and reader (PKWARE APPNOTE 6.3.x).
 * Only the classic (non-ZIP64) format is supported: < 4 GiB per archive, < 65 535 entries.
 */

export const SIG_LOCAL_HEADER = 0x04034b50;
export const SIG_CENTRAL_HEADER = 0x02014b50;
export const SIG_END_OF_CENTRAL_DIR = 0x06054b50;
export const SIG_ZIP64_END_LOCATOR = 0x07064b50;

export const LOCAL_HEADER_SIZE = 30;
export const CENTRAL_HEADER_SIZE = 46;
export const END_OF_CENTRAL_DIR_SIZE = 22;

/** General purpose flag bit 0: the entry is encrypted. */
export const FLAG_ENCRYPTED = 0x0001;
/** General purpose flag bit 11: names and comments are UTF-8 (language encoding flag). */
export const FLAG_UTF8 = 0x0800;

export const METHOD_STORE = 0;
export const METHOD_DEFLATE = 8;

/** "Version needed to extract": 2.0 covers stored entries, directories and deflate. */
export const VERSION_NEEDED = 20;
/** "Version made by": host system 3 (Unix) in the high byte so external attributes carry modes. */
export const VERSION_MADE_BY = (3 << 8) | VERSION_NEEDED;

export const MAX_UINT16 = 0xffff;
export const MAX_UINT32 = 0xffffffff;

export type ZipErrorCode =
  | 'ZIP_NOT_FOUND'
  | 'ZIP_CORRUPT'
  | 'ZIP_UNSUPPORTED'
  | 'ZIP_CRC_MISMATCH'
  | 'ZIP_UNSAFE_NAME'
  | 'ZIP_DUPLICATE_NAME'
  | 'ZIP_TOO_LARGE';

export class ZipError extends Error {
  override name = 'ZipError';
  readonly code: ZipErrorCode;

  constructor(code: ZipErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Rejects names that could escape an extraction directory or that other tools mangle:
 * absolute paths, drive letters, `..` segments, backslashes, control characters.
 */
export function assertSafeEntryName(name: string): void {
  const reason = unsafeNameReason(name);
  if (reason) throw new ZipError('ZIP_UNSAFE_NAME', `Unsafe entry name ${JSON.stringify(name)}: ${reason}`);
}

function unsafeNameReason(name: string): string | undefined {
  if (name.length === 0) return 'empty name';
  if (/[\u0000-\u001f\u007f]/.test(name)) return 'control character';
  if (name.includes('\\')) return 'backslash (use "/" as separator)';
  if (name.startsWith('/')) return 'absolute path';
  if (/^[A-Za-z]:/.test(name)) return 'drive letter';
  const segments = name.replace(/\/$/, '').split('/');
  if (segments.some((s) => s === '..' || s === '.' || s === '')) return 'empty, "." or ".." segment';
  return undefined;
}

/** MS-DOS date/time (local wall-clock, 2-second resolution, years 1980–2107). */
export function toDosDateTime(date: Date): { date: number; time: number } {
  let d = date;
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1980) d = new Date(1980, 0, 1, 0, 0, 0);
  if (d.getFullYear() > 2107) d = new Date(2107, 11, 31, 23, 59, 58);
  return {
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  };
}

export function fromDosDateTime(date: number, time: number): Date {
  return new Date(
    ((date >> 9) & 0x7f) + 1980,
    ((date >> 5) & 0x0f) - 1,
    date & 0x1f,
    (time >> 11) & 0x1f,
    (time >> 5) & 0x3f,
    (time & 0x1f) * 2,
  );
}
