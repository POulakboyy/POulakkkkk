/**
 * Minimal, dependency-free ZIP writer: every entry is STOREd (no compression), names are
 * UTF-8 with the language-encoding flag set, sizes and CRC-32 are known up front so no data
 * descriptors are needed. Output opens with `unzip`, Finder, Windows Explorer and 7-Zip.
 */
import { crc32 } from './crc32.ts';
import {
  CENTRAL_HEADER_SIZE,
  END_OF_CENTRAL_DIR_SIZE,
  FLAG_UTF8,
  LOCAL_HEADER_SIZE,
  MAX_UINT16,
  MAX_UINT32,
  METHOD_STORE,
  SIG_CENTRAL_HEADER,
  SIG_END_OF_CENTRAL_DIR,
  SIG_LOCAL_HEADER,
  VERSION_MADE_BY,
  VERSION_NEEDED,
  ZipError,
  assertSafeEntryName,
  toDosDateTime,
} from './format.ts';

export interface ZipEntryInput {
  /** Path inside the archive, `/`-separated. A trailing `/` makes a directory entry. */
  name: string;
  /** File contents; strings are encoded as UTF-8. Ignored for directories. */
  data?: Uint8Array | string;
  /** Modification time; defaults to the archive-level `modified`. */
  modified?: Date;
}

export interface ZipWriteOptions {
  /** Default modification time for entries (default: now). */
  modified?: Date;
  /** Archive comment (UTF-8). */
  comment?: string;
}

const encoder = new TextEncoder();

/** Unix mode bits stored in the high 16 bits of the external attributes. */
const FILE_MODE = 0o100644;
const DIR_MODE = 0o040755;
const MSDOS_DIRECTORY = 0x10;

interface Prepared {
  name: Uint8Array;
  data: Uint8Array;
  crc: number;
  dos: { date: number; time: number };
  isDirectory: boolean;
  offset: number;
}

/** Builds a complete ZIP archive in memory. */
export function createZip(entries: readonly ZipEntryInput[], options: ZipWriteOptions = {}): Uint8Array {
  if (entries.length > MAX_UINT16) {
    throw new ZipError('ZIP_TOO_LARGE', `Too many entries (${entries.length}); ZIP64 is not supported`);
  }
  const defaultModified = options.modified ?? new Date();
  const seen = new Set<string>();
  const prepared: Prepared[] = [];
  let offset = 0;

  for (const entry of entries) {
    assertSafeEntryName(entry.name);
    if (seen.has(entry.name)) throw new ZipError('ZIP_DUPLICATE_NAME', `Duplicate entry ${entry.name}`);
    seen.add(entry.name);
    const isDirectory = entry.name.endsWith('/');
    const name = encoder.encode(entry.name);
    if (name.length > MAX_UINT16) throw new ZipError('ZIP_TOO_LARGE', `Entry name too long: ${entry.name}`);
    const data =
      isDirectory || entry.data === undefined
        ? new Uint8Array(0)
        : typeof entry.data === 'string'
          ? encoder.encode(entry.data)
          : entry.data;
    if (data.length > MAX_UINT32 - 1) throw new ZipError('ZIP_TOO_LARGE', `Entry too large: ${entry.name}`);
    prepared.push({
      name,
      data,
      crc: crc32(data),
      dos: toDosDateTime(entry.modified ?? defaultModified),
      isDirectory,
      offset,
    });
    offset += LOCAL_HEADER_SIZE + name.length + data.length;
  }

  const comment = encoder.encode(options.comment ?? '');
  if (comment.length > MAX_UINT16) throw new ZipError('ZIP_TOO_LARGE', 'Archive comment too long');
  const centralStart = offset;
  const centralSize = prepared.reduce((sum, p) => sum + CENTRAL_HEADER_SIZE + p.name.length, 0);
  const total = centralStart + centralSize + END_OF_CENTRAL_DIR_SIZE + comment.length;
  if (centralStart > MAX_UINT32 - 1 || total > MAX_UINT32) {
    throw new ZipError('ZIP_TOO_LARGE', 'Archive larger than 4 GiB; ZIP64 is not supported');
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let pos = 0;

  for (const p of prepared) {
    view.setUint32(pos, SIG_LOCAL_HEADER, true);
    view.setUint16(pos + 4, VERSION_NEEDED, true);
    view.setUint16(pos + 6, FLAG_UTF8, true);
    view.setUint16(pos + 8, METHOD_STORE, true);
    view.setUint16(pos + 10, p.dos.time, true);
    view.setUint16(pos + 12, p.dos.date, true);
    view.setUint32(pos + 14, p.crc, true);
    view.setUint32(pos + 18, p.data.length, true); // compressed size
    view.setUint32(pos + 22, p.data.length, true); // uncompressed size
    view.setUint16(pos + 26, p.name.length, true);
    view.setUint16(pos + 28, 0, true); // extra field length
    pos += LOCAL_HEADER_SIZE;
    out.set(p.name, pos);
    pos += p.name.length;
    out.set(p.data, pos);
    pos += p.data.length;
  }

  for (const p of prepared) {
    const external = p.isDirectory ? ((DIR_MODE << 16) | MSDOS_DIRECTORY) >>> 0 : (FILE_MODE << 16) >>> 0;
    view.setUint32(pos, SIG_CENTRAL_HEADER, true);
    view.setUint16(pos + 4, VERSION_MADE_BY, true);
    view.setUint16(pos + 6, VERSION_NEEDED, true);
    view.setUint16(pos + 8, FLAG_UTF8, true);
    view.setUint16(pos + 10, METHOD_STORE, true);
    view.setUint16(pos + 12, p.dos.time, true);
    view.setUint16(pos + 14, p.dos.date, true);
    view.setUint32(pos + 16, p.crc, true);
    view.setUint32(pos + 20, p.data.length, true);
    view.setUint32(pos + 24, p.data.length, true);
    view.setUint16(pos + 28, p.name.length, true);
    view.setUint16(pos + 30, 0, true); // extra field length
    view.setUint16(pos + 32, 0, true); // file comment length
    view.setUint16(pos + 34, 0, true); // disk number start
    view.setUint16(pos + 36, 0, true); // internal attributes
    view.setUint32(pos + 38, external, true);
    view.setUint32(pos + 42, p.offset, true);
    pos += CENTRAL_HEADER_SIZE;
    out.set(p.name, pos);
    pos += p.name.length;
  }

  view.setUint32(pos, SIG_END_OF_CENTRAL_DIR, true);
  view.setUint16(pos + 4, 0, true); // this disk
  view.setUint16(pos + 6, 0, true); // disk with the central directory
  view.setUint16(pos + 8, prepared.length, true);
  view.setUint16(pos + 10, prepared.length, true);
  view.setUint32(pos + 12, centralSize, true);
  view.setUint32(pos + 16, centralStart, true);
  view.setUint16(pos + 20, comment.length, true);
  out.set(comment, pos + END_OF_CENTRAL_DIR_SIZE);

  return out;
}
