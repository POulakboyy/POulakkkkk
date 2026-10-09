/**
 * The CLI's local, single-file data store.
 *
 * - Reads take no lock: writes replace the file atomically, so a reader always sees a
 *   complete revision.
 * - Writes go through `transact()`: take the inter-process lock, read the latest revision,
 *   apply the mutation, check that nobody bypassing the lock changed the file meanwhile
 *   (optimistic revision check), keep the previous file as `data.json.bak`, then replace
 *   `data.json` atomically.
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { UserPrefs } from '@pouxis/core';
import { writeFileAtomic } from './atomic.ts';
import { LockTimeoutError, acquireLock } from './lock.ts';
import type { LockOptions } from './lock.ts';
import { SchemaError, emptyData, normalizeData } from './schema.ts';
import type { DataFile } from './schema.ts';

export const DATA_FILE = 'data.json';

export type StoreErrorCode = 'corrupt' | 'too-new' | 'locked' | 'conflict';

/** A store failure the CLI explains to the user (see `main.ts`). */
export class StoreError extends Error {
  override name = 'StoreError';
  readonly code: StoreErrorCode;
  readonly file: string;
  /** Extra information: parse error, holder pid, schema version… */
  readonly detail: string;

  constructor(code: StoreErrorCode, file: string, detail: string, cause?: unknown) {
    super(`${code}: ${file}: ${detail}`, cause === undefined ? undefined : { cause });
    this.code = code;
    this.file = file;
    this.detail = detail;
  }
}

export interface DataStoreOptions {
  /** Directory holding `data.json` (`$POUXIS_HOME`). */
  home: string;
  now?: () => number;
  /** Preferences for a store that does not exist yet (e.g. the host's time zone). */
  initialPrefs?: Partial<UserPrefs>;
  lock?: LockOptions;
}

export class DataStore {
  readonly home: string;
  readonly file: string;
  readonly lockFile: string;
  readonly backupFile: string;
  private readonly now: () => number;
  private readonly initialPrefs: Partial<UserPrefs>;
  private readonly lockOptions: LockOptions;

  constructor(options: DataStoreOptions) {
    this.home = options.home;
    this.file = join(options.home, DATA_FILE);
    this.lockFile = `${this.file}.lock`;
    this.backupFile = `${this.file}.bak`;
    this.now = options.now ?? Date.now;
    this.initialPrefs = options.initialPrefs ?? {};
    this.lockOptions = options.lock ?? {};
  }

  /** The current data; a store that was never written reads as empty. */
  async load(): Promise<DataFile> {
    const text = await this.readText();
    if (text === undefined) return emptyData(this.initialPrefs);
    return this.parse(text);
  }

  /**
   * Runs `mutate` on the latest data under the lock and persists the result if it changed.
   * If `mutate` throws, nothing is written.
   */
  async transact<T>(mutate: (data: DataFile) => T | Promise<T>): Promise<T> {
    await mkdir(this.home, { recursive: true, mode: 0o700 });
    let release: () => Promise<void>;
    try {
      release = await acquireLock(this.lockFile, { now: this.now, ...this.lockOptions });
    } catch (error) {
      if (error instanceof LockTimeoutError) {
        throw new StoreError('locked', this.lockFile, String(error.holder?.pid ?? '?'), error);
      }
      throw error;
    }
    try {
      const data = await this.load();
      const baseRevision = data.revision;
      const before = JSON.stringify(data);
      const result = await mutate(data);
      if (JSON.stringify(data) !== before) await this.commit(data, baseRevision);
      return result;
    } finally {
      await release();
    }
  }

  private async commit(data: DataFile, baseRevision: number): Promise<void> {
    const onDisk = await this.readText();
    const currentRevision = onDisk === undefined ? 0 : this.parse(onDisk).revision;
    if (currentRevision !== baseRevision) {
      throw new StoreError('conflict', this.file, `expected revision ${baseRevision}, found ${currentRevision}`);
    }
    data.revision = baseRevision + 1;
    data.savedAt = this.now();
    if (onDisk !== undefined) await copyFile(this.file, this.backupFile);
    await writeFileAtomic(this.file, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  }

  private async readText(): Promise<string | undefined> {
    try {
      return await readFile(this.file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  private parse(text: string): DataFile {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      throw new StoreError('corrupt', this.file, (error as Error).message, error);
    }
    try {
      return normalizeData(raw);
    } catch (error) {
      if (error instanceof SchemaError) {
        if (error.problem.kind === 'too-new') {
          throw new StoreError('too-new', this.file, String(error.problem.version), error);
        }
        throw new StoreError('corrupt', this.file, error.problem.detail, error);
      }
      throw error;
    }
  }
}
