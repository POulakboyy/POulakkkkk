/**
 * File-backed storage: one append-only JSONL file per space.
 *
 * Layout: `<dataDir>/spaces/<sha256(space)>.jsonl`, one record per line:
 * `{"seq":1,"id":"…","hlc":"…","node":"…","payload":"…"}`. Hashing the space id gives fixed,
 * path-safe file names (no traversal, no case-folding collisions).
 *
 * Durability:
 * - records of one append are written with a single positional write at the end of the
 *   file, then `fdatasync`ed according to the fsync policy (`always` = before the append
 *   resolves, i.e. before the client is acked);
 * - a failed write is rolled back by truncating to the previous size; if that fails, or if
 *   an fsync fails (the page cache state is then unknown), the log refuses further appends
 *   until it is re-opened, which re-runs recovery;
 * - recovery on open re-reads the file, validates every record (dense seq, unique ids) and
 *   truncates a torn or invalid *last* line. Any other invalid line is reported as
 *   {@link StorageCorruptError}: the operator decides, nothing is silently dropped.
 *
 * Memory: the id set and line offsets of open logs are kept in memory; payloads are read
 * from disk on demand.
 */
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { mkdir, open, stat, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import type { FsyncPolicy } from '../config.ts';
import type { Logger } from '../logger.ts';
import { silentLogger, tag } from '../logger.ts';
import type { Envelope, StoredEnvelope } from '../protocol.ts';
import {
  QuotaExceededError,
  StorageCorruptError,
  parseRecord,
  serializeRecord,
  type AppendOptions,
  type AppendOutcome,
  type SpaceLog,
  type Storage,
} from './types.ts';

export interface FileStorageOptions {
  dataDir: string;
  fsync: FsyncPolicy;
  /** Period of background fsync when `fsync` is `interval`. */
  fsyncIntervalMs?: number;
  logger?: Logger;
}

const READ_CHUNK_BYTES = 1024 * 1024;
/** Lines longer than this are invalid (far above any accepted envelope). */
const MAX_LINE_BYTES = 256 * 1024 * 1024;
const NEWLINE = 0x0a;

export class StorageUnavailableError extends Error {
  readonly code = 'storage_unavailable';
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageUnavailableError';
  }
}

export class FileStorage implements Storage {
  private readonly dir: string;
  private readonly options: FileStorageOptions;
  private readonly logger: Logger;
  private readonly logs = new Map<string, FileSpaceLog>();
  private readonly opening = new Set<string>();
  private readonly closing = new Map<string, Promise<void>>();
  private ready: Promise<void> | null = null;

  constructor(options: FileStorageOptions) {
    this.options = options;
    this.dir = path.join(options.dataDir, 'spaces');
    this.logger = options.logger ?? silentLogger;
  }

  /** Absolute path of the log file of a space. */
  pathFor(space: string): string {
    const name = createHash('sha256').update(space, 'utf8').digest('hex');
    return path.join(this.dir, `${name}.jsonl`);
  }

  async open(space: string): Promise<SpaceLog> {
    await this.init();
    await this.closing.get(space);
    if (this.logs.has(space) || this.opening.has(space)) {
      throw new Error('space log is already open');
    }
    this.opening.add(space);
    try {
      const log = await FileSpaceLog.open({
        file: this.pathFor(space),
        dir: this.dir,
        fsync: this.options.fsync,
        fsyncIntervalMs: this.options.fsyncIntervalMs ?? 1000,
        logger: this.logger.child({ space: tag(space) }),
        onClose: (closing) => {
          this.logs.delete(space);
          this.closing.set(space, closing);
          void closing.finally(() => {
            if (this.closing.get(space) === closing) this.closing.delete(space);
          });
        },
      });
      this.logs.set(space, log);
      return log;
    } finally {
      this.opening.delete(space);
    }
  }

  async close(): Promise<void> {
    await Promise.allSettled([...this.logs.values()].map((log) => log.close()));
    await Promise.allSettled([...this.closing.values()]);
  }

  private init(): Promise<void> {
    this.ready ??= mkdir(this.dir, { recursive: true, mode: 0o700 }).then(() => undefined);
    return this.ready;
  }
}

interface OpenOptions {
  file: string;
  dir: string;
  fsync: FsyncPolicy;
  fsyncIntervalMs: number;
  logger: Logger;
  onClose: (closing: Promise<void>) => void;
}

class FileSpaceLog implements SpaceLog {
  private readonly fh: FileHandle;
  private readonly options: OpenOptions;
  private readonly ids: Set<string>;
  /** `offsets[s]` = end offset (exclusive) of the record with seq `s`; `offsets[0]` = 0. */
  private readonly offsets: number[];
  private size: number;
  private queue: Promise<unknown> = Promise.resolve();
  private dirty = false;
  private broken: Error | null = null;
  private closed: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;

  private constructor(fh: FileHandle, options: OpenOptions, recovered: Recovered) {
    this.fh = fh;
    this.options = options;
    this.ids = recovered.ids;
    this.offsets = recovered.offsets;
    this.size = recovered.size;
    if (options.fsync === 'interval') {
      this.timer = setInterval(() => void this.backgroundFlush(), options.fsyncIntervalMs);
      this.timer.unref();
    }
  }

  static async open(options: OpenOptions): Promise<FileSpaceLog> {
    const existed = await stat(options.file).then(
      () => true,
      () => false,
    );
    const fh = await open(options.file, fsConstants.O_RDWR | fsConstants.O_CREAT, 0o600);
    try {
      if (!existed) await syncDirectory(options.dir);
      const recovered = await recover(fh, options.file);
      if (recovered.truncatedBytes > 0) {
        options.logger.warn('storage.recovered_torn_tail', {
          truncatedBytes: recovered.truncatedBytes,
          head: recovered.offsets.length - 1,
        });
      }
      return new FileSpaceLog(fh, options, recovered);
    } catch (error) {
      await fh.close().catch(() => {});
      throw error;
    }
  }

  get head(): number {
    return this.offsets.length - 1;
  }

  get bytes(): number {
    return this.size;
  }

  append(envelopes: readonly Envelope[], options: AppendOptions = {}): Promise<AppendOutcome> {
    if (this.closed) return Promise.reject(new Error('space log is closed'));
    // Appends already queued when close() is called still complete before the file closes.
    return this.serialize(() => this.doAppend(envelopes, options));
  }

  private async doAppend(
    envelopes: readonly Envelope[],
    options: AppendOptions,
  ): Promise<AppendOutcome> {
    if (this.broken) throw new StorageUnavailableError('space log is unavailable', { cause: this.broken });

    const stored: StoredEnvelope[] = [];
    const duplicates: string[] = [];
    const batchIds = new Set<string>();
    const lines: string[] = [];
    for (const envelope of envelopes) {
      if (this.ids.has(envelope.id) || batchIds.has(envelope.id)) {
        duplicates.push(envelope.id);
        continue;
      }
      batchIds.add(envelope.id);
      const entry: StoredEnvelope = {
        id: envelope.id,
        hlc: envelope.hlc,
        node: envelope.node,
        payload: envelope.payload,
        seq: this.head + stored.length + 1,
      };
      stored.push(entry);
      lines.push(serializeRecord(entry) + '\n');
    }
    if (stored.length === 0) return { stored, duplicates, head: this.head };

    const sizes = lines.map((line) => Buffer.byteLength(line, 'utf8'));
    const total = sizes.reduce((sum, size) => sum + size, 0);
    const maxBytes = options.maxBytes ?? 0;
    if (maxBytes > 0 && this.size + total > maxBytes) throw new QuotaExceededError();

    const buffer = Buffer.from(lines.join(''), 'utf8');
    const start = this.size;
    try {
      await writeFully(this.fh, buffer, start);
    } catch (error) {
      await this.rollback(start, error);
      throw new StorageUnavailableError('append failed', { cause: error });
    }
    if (this.options.fsync === 'always') {
      try {
        await this.fh.datasync();
      } catch (error) {
        // After a failed fsync the kernel may have dropped the dirty pages: the on-disk
        // state is unknown. Undo, and refuse further writes until recovery re-runs.
        await this.rollback(start, error);
        this.markBroken(error);
        throw new StorageUnavailableError('fsync failed', { cause: error });
      }
    } else {
      this.dirty = true;
    }

    let offset = start;
    for (let i = 0; i < stored.length; i++) {
      offset += sizes[i] ?? 0;
      this.offsets.push(offset);
      const entry = stored[i];
      if (entry) this.ids.add(entry.id);
    }
    this.size = offset;
    return { stored, duplicates, head: this.head };
  }

  async read(afterSeq: number, limit: number, maxBytes: number): Promise<StoredEnvelope[]> {
    if (this.closed) throw new Error('space log is closed');
    const head = this.head;
    if (afterSeq < 0 || afterSeq >= head || limit < 1) return [];
    const end = Math.min(head, afterSeq + limit);
    const startOffset = offsetAt(this.offsets, afterSeq);
    let last = afterSeq + 1;
    while (last < end && offsetAt(this.offsets, last + 1) - startOffset <= maxBytes) last++;
    const endOffset = offsetAt(this.offsets, last);

    const buffer = Buffer.allocUnsafe(endOffset - startOffset);
    await readFully(this.fh, buffer, startOffset);
    const out: StoredEnvelope[] = [];
    let lineStart = 0;
    for (let seq = afterSeq + 1; seq <= last; seq++) {
      const lineEnd = offsetAt(this.offsets, seq) - startOffset - 1;
      const record = parseRecord(buffer.toString('utf8', lineStart, lineEnd));
      if (!record || record.seq !== seq) {
        throw new StorageCorruptError(`${this.options.file}: unreadable record seq ${seq}`);
      }
      out.push(record);
      lineStart = lineEnd + 1;
    }
    return out;
  }

  close(): Promise<void> {
    if (!this.closed) {
      this.closed = this.doClose();
      this.options.onClose(this.closed);
    }
    return this.closed;
  }

  private async doClose(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.queue;
    try {
      if (this.dirty && !this.broken) await this.fh.datasync();
    } catch (error) {
      this.options.logger.error('storage.fsync_failed', { err: error });
    } finally {
      await this.fh.close();
    }
  }

  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => {});
    return run;
  }

  private backgroundFlush(): Promise<void> {
    return this.serialize(async () => {
      if (!this.dirty || this.broken || this.closed) return;
      this.dirty = false;
      try {
        await this.fh.datasync();
      } catch (error) {
        this.markBroken(error);
      }
    });
  }

  private async rollback(size: number, cause: unknown): Promise<void> {
    try {
      await this.fh.truncate(size);
    } catch {
      this.markBroken(cause);
    }
  }

  private markBroken(error: unknown): void {
    if (this.broken) return;
    this.broken = error instanceof Error ? error : new Error(String(error));
    this.options.logger.error('storage.log_unavailable', { err: this.broken });
  }
}

function offsetAt(offsets: readonly number[], seq: number): number {
  const value = offsets[seq];
  if (value === undefined) throw new RangeError(`no offset for seq ${seq}`);
  return value;
}

interface Recovered {
  ids: Set<string>;
  offsets: number[];
  size: number;
  truncatedBytes: number;
}

/**
 * Scans the whole file, rebuilding the id set and line offsets. A torn or invalid last
 * line is truncated; an invalid line followed by another complete line is corruption.
 */
async function recover(fh: FileHandle, file: string): Promise<Recovered> {
  const { size: fileSize } = await fh.stat();
  const ids = new Set<string>();
  const offsets: number[] = [0];
  let invalidAt = -1;
  let lineStart = 0;
  let carry: Buffer[] = [];
  let carryBytes = 0;
  let position = 0;

  const processLine = (line: Buffer | null, lineEnd: number): void => {
    if (invalidAt >= 0) {
      throw new StorageCorruptError(
        `${file}: invalid record at byte ${invalidAt} followed by more records`,
      );
    }
    const record = line ? parseRecord(line.toString('utf8')) : null;
    if (!record || record.seq !== offsets.length || ids.has(record.id)) {
      invalidAt = lineStart;
      return;
    }
    ids.add(record.id);
    offsets.push(lineEnd);
  };

  while (position < fileSize) {
    const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, fileSize - position));
    const { bytesRead } = await fh.read(chunk, 0, chunk.length, position);
    if (bytesRead === 0) break;
    let from = 0;
    for (;;) {
      const nl = chunk.indexOf(NEWLINE, from);
      if (nl === -1 || nl >= bytesRead) break;
      const piece = chunk.subarray(from, nl);
      const overlong = carryBytes + piece.length > MAX_LINE_BYTES;
      const line = overlong ? null : carry.length > 0 ? Buffer.concat([...carry, piece]) : piece;
      const lineEnd = position + nl + 1;
      processLine(line, lineEnd);
      carry = [];
      carryBytes = 0;
      lineStart = lineEnd;
      from = nl + 1;
    }
    if (from < bytesRead) {
      const rest = chunk.subarray(from, bytesRead);
      carryBytes += rest.length;
      // Keep only what can still form a valid line; an overlong line is invalid anyway.
      if (carryBytes <= MAX_LINE_BYTES) carry.push(rest);
      else carry = [];
    }
    position += bytesRead;
  }

  const goodEnd = offsets[offsets.length - 1] ?? 0;
  const truncatedBytes = fileSize - goodEnd;
  if (truncatedBytes > 0) {
    await fh.truncate(goodEnd);
    await fh.datasync();
  }
  return { ids, offsets, size: goodEnd, truncatedBytes };
}

async function writeFully(fh: FileHandle, buffer: Buffer, position: number): Promise<void> {
  let written = 0;
  while (written < buffer.length) {
    const { bytesWritten } = await fh.write(
      buffer,
      written,
      buffer.length - written,
      position + written,
    );
    if (bytesWritten <= 0) throw new Error('short write');
    written += bytesWritten;
  }
}

async function readFully(fh: FileHandle, buffer: Buffer, position: number): Promise<void> {
  let read = 0;
  while (read < buffer.length) {
    const { bytesRead } = await fh.read(buffer, read, buffer.length - read, position + read);
    if (bytesRead <= 0) throw new StorageCorruptError('unexpected end of file');
    read += bytesRead;
  }
}

/** Persists a directory entry (new file). Best effort: unsupported on some platforms. */
async function syncDirectory(dir: string): Promise<void> {
  let handle: FileHandle | null = null;
  try {
    handle = await open(dir, 'r');
    await handle.sync();
  } catch {
    // EISDIR/EPERM/EINVAL on platforms that cannot fsync directories (Windows).
  } finally {
    await handle?.close().catch(() => {});
  }
}
