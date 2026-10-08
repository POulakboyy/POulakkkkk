/**
 * Minimal, dependency-free ZIP reader. Reads the central directory (the authoritative index),
 * then each entry's local header. Supports STORE natively and DEFLATE through an injected
 * `inflateRaw` (Node passes `zlib.inflateRawSync`), so archives re-zipped by other tools
 * still import. Every entry's size and CRC-32 are verified.
 *
 * Not supported (clear `ZIP_UNSUPPORTED` errors): ZIP64, encryption, multi-disk archives,
 * other compression methods.
 */
import { crc32 } from './crc32.ts';
import {
  CENTRAL_HEADER_SIZE,
  END_OF_CENTRAL_DIR_SIZE,
  FLAG_ENCRYPTED,
  LOCAL_HEADER_SIZE,
  MAX_UINT16,
  MAX_UINT32,
  METHOD_DEFLATE,
  METHOD_STORE,
  SIG_CENTRAL_HEADER,
  SIG_END_OF_CENTRAL_DIR,
  SIG_LOCAL_HEADER,
  SIG_ZIP64_END_LOCATOR,
  ZipError,
  assertSafeEntryName,
  fromDosDateTime,
} from './format.ts';

export interface ZipEntry {
  name: string;
  isDirectory: boolean;
  data: Uint8Array;
  modified: Date;
  method: number;
  crc32: number;
}

export interface ZipReadOptions {
  /** Raw DEFLATE decoder; without it, deflated entries are rejected as unsupported. */
  inflateRaw?: (data: Uint8Array, expectedSize: number) => Uint8Array;
  /** Upper bound for one decompressed entry, in bytes (default 256 MiB). */
  maxEntrySize?: number;
  /** Upper bound for all decompressed entries together (default 1 GiB). */
  maxTotalSize?: number;
}

const DEFAULT_MAX_ENTRY = 256 * 1024 * 1024;
const DEFAULT_MAX_TOTAL = 1024 * 1024 * 1024;
const utf8 = new TextDecoder('utf-8');

/** Parses a whole archive held in memory. Names are validated against path traversal. */
export function readZip(bytes: Uint8Array, options: ZipReadOptions = {}): ZipEntry[] {
  const maxEntry = options.maxEntrySize ?? DEFAULT_MAX_ENTRY;
  const maxTotal = options.maxTotalSize ?? DEFAULT_MAX_TOTAL;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(bytes, view);

  const disk = view.getUint16(eocd + 4, true);
  const cdDisk = view.getUint16(eocd + 6, true);
  const entriesOnDisk = view.getUint16(eocd + 8, true);
  const totalEntries = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);

  if (
    totalEntries === MAX_UINT16 ||
    cdSize === MAX_UINT32 ||
    cdOffset === MAX_UINT32 ||
    (eocd >= 20 && view.getUint32(eocd - 20, true) === SIG_ZIP64_END_LOCATOR)
  ) {
    throw new ZipError('ZIP_UNSUPPORTED', 'ZIP64 archives are not supported');
  }
  if (disk !== 0 || cdDisk !== 0 || entriesOnDisk !== totalEntries) {
    throw new ZipError('ZIP_UNSUPPORTED', 'Multi-disk archives are not supported');
  }
  if (cdOffset + cdSize > eocd) {
    throw new ZipError('ZIP_CORRUPT', 'Central directory extends past the end of the archive');
  }

  const entries: ZipEntry[] = [];
  const names = new Set<string>();
  let total = 0;
  let pos = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (pos + CENTRAL_HEADER_SIZE > cdOffset + cdSize || view.getUint32(pos, true) !== SIG_CENTRAL_HEADER) {
      throw new ZipError('ZIP_CORRUPT', `Bad central directory header for entry #${i + 1}`);
    }
    const flags = view.getUint16(pos + 8, true);
    const method = view.getUint16(pos + 10, true);
    const time = view.getUint16(pos + 12, true);
    const date = view.getUint16(pos + 14, true);
    const crc = view.getUint32(pos + 16, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const size = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const nameStart = pos + CENTRAL_HEADER_SIZE;
    if (nameStart + nameLength > bytes.length) {
      throw new ZipError('ZIP_CORRUPT', `Truncated name for entry #${i + 1}`);
    }
    const name = utf8.decode(bytes.subarray(nameStart, nameStart + nameLength));
    pos = nameStart + nameLength + extraLength + commentLength;

    assertSafeEntryName(name);
    if (names.has(name)) throw new ZipError('ZIP_DUPLICATE_NAME', `Duplicate entry ${name}`);
    names.add(name);
    if (flags & FLAG_ENCRYPTED) throw new ZipError('ZIP_UNSUPPORTED', `Encrypted entry ${name}`);
    if (compressedSize === MAX_UINT32 || size === MAX_UINT32 || localOffset === MAX_UINT32) {
      throw new ZipError('ZIP_UNSUPPORTED', 'ZIP64 archives are not supported');
    }
    if (size > maxEntry) throw new ZipError('ZIP_TOO_LARGE', `Entry ${name} is too large (${size} bytes)`);
    total += size;
    if (total > maxTotal) throw new ZipError('ZIP_TOO_LARGE', 'Archive contents are too large');

    const dataStart = localDataStart(bytes, view, localOffset, name);
    if (dataStart + compressedSize > cdOffset) {
      throw new ZipError('ZIP_CORRUPT', `Entry ${name} overlaps the central directory`);
    }
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);

    let data: Uint8Array;
    if (method === METHOD_STORE) {
      data = raw;
    } else if (method === METHOD_DEFLATE && options.inflateRaw) {
      try {
        data = options.inflateRaw(raw, size);
      } catch (error) {
        throw new ZipError('ZIP_CORRUPT', `Cannot inflate ${name}: ${(error as Error).message}`);
      }
    } else {
      throw new ZipError('ZIP_UNSUPPORTED', `Compression method ${method} is not supported (${name})`);
    }
    if (data.length !== size) {
      throw new ZipError('ZIP_CORRUPT', `Size mismatch for ${name}: ${data.length} ≠ ${size}`);
    }
    if (crc32(data) !== crc) throw new ZipError('ZIP_CRC_MISMATCH', `CRC-32 mismatch for ${name}`);

    entries.push({
      name,
      isDirectory: name.endsWith('/'),
      data,
      modified: fromDosDateTime(date, time),
      method,
      crc32: crc,
    });
  }
  return entries;
}

function findEndOfCentralDirectory(bytes: Uint8Array, view: DataView): number {
  const last = bytes.length - END_OF_CENTRAL_DIR_SIZE;
  const first = Math.max(0, last - MAX_UINT16);
  for (let i = last; i >= first; i--) {
    if (view.getUint32(i, true) !== SIG_END_OF_CENTRAL_DIR) continue;
    const commentLength = view.getUint16(i + 20, true);
    if (i + END_OF_CENTRAL_DIR_SIZE + commentLength <= bytes.length) return i;
  }
  throw new ZipError('ZIP_NOT_FOUND', 'Not a ZIP archive (end of central directory not found)');
}

function localDataStart(bytes: Uint8Array, view: DataView, offset: number, name: string): number {
  if (offset + LOCAL_HEADER_SIZE > bytes.length || view.getUint32(offset, true) !== SIG_LOCAL_HEADER) {
    throw new ZipError('ZIP_CORRUPT', `Bad local header for ${name}`);
  }
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const start = offset + LOCAL_HEADER_SIZE + nameLength + extraLength;
  if (start > bytes.length) throw new ZipError('ZIP_CORRUPT', `Truncated local header for ${name}`);
  return start;
}
