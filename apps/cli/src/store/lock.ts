/**
 * Advisory inter-process lock based on exclusive file creation (`O_CREAT | O_EXCL`), which is
 * atomic on every local filesystem. The lock file records its owner so a lock left behind by a
 * crashed process (dead pid on this host, or older than `staleMs`) is broken automatically.
 */
import { randomBytes } from 'node:crypto';
import { open, readFile, stat, unlink } from 'node:fs/promises';
import { hostname } from 'node:os';

export interface LockOptions {
  /** Give up after this long (default 5 s). */
  timeoutMs?: number;
  /** A lock older than this is considered abandoned (default 30 s). */
  staleMs?: number;
  /** Delay between attempts (default 25 ms, grows to 200 ms). */
  retryDelayMs?: number;
  now?: () => number;
}

export interface LockInfo {
  pid: number;
  hostname: string;
  token: string;
  createdAt: number;
}

export class LockTimeoutError extends Error {
  override name = 'LockTimeoutError';
  readonly holder: LockInfo | undefined;

  constructor(file: string, holder: LockInfo | undefined) {
    super(`Timed out waiting for lock ${file}${holder ? ` held by pid ${holder.pid}` : ''}`);
    this.holder = holder;
  }
}

export type ReleaseLock = () => Promise<void>;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function acquireLock(file: string, options: LockOptions = {}): Promise<ReleaseLock> {
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const staleMs = options.staleMs ?? 30_000;
  let delay = options.retryDelayMs ?? 25;
  const deadline = Date.now() + timeoutMs;
  const info: LockInfo = {
    pid: process.pid,
    hostname: hostname(),
    token: randomBytes(12).toString('hex'),
    createdAt: now(),
  };

  for (;;) {
    if (await tryCreate(file, info)) return () => release(file, info.token);

    const holder = await readLock(file);
    if (holder === 'missing') continue; // released between our attempt and the read
    if (holder === 'unreadable') {
      // An owner that crashed between creating and writing the file leaves it empty.
      if (await olderThan(file, staleMs)) {
        await unlink(file).catch(ignoreMissing);
        continue;
      }
    } else if (isStale(holder, now(), staleMs)) {
      // Re-read right before deleting so we never remove a lock that was just re-acquired.
      const again = await readLock(file);
      if (typeof again === 'object' && again.token === holder.token) {
        await unlink(file).catch(ignoreMissing);
      }
      continue;
    }
    if (Date.now() >= deadline) {
      throw new LockTimeoutError(file, typeof holder === 'object' ? holder : undefined);
    }
    await sleep(delay);
    delay = Math.min(delay * 2, 200);
  }
}

async function tryCreate(file: string, info: LockInfo): Promise<boolean> {
  try {
    const handle = await open(file, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(info));
    } finally {
      await handle.close();
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}

async function readLock(file: string): Promise<LockInfo | 'missing' | 'unreadable'> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
    throw error;
  }
  try {
    const value = JSON.parse(text) as Partial<LockInfo>;
    if (
      typeof value.pid === 'number' &&
      typeof value.hostname === 'string' &&
      typeof value.token === 'string' &&
      typeof value.createdAt === 'number'
    ) {
      return value as LockInfo;
    }
  } catch {
    // Being written right now by its owner, or garbage: treat as held until the timeout.
  }
  return 'unreadable';
}

export function isStale(holder: LockInfo, now: number, staleMs: number): boolean {
  if (now - holder.createdAt > staleMs) return true;
  return holder.hostname === hostname() && !isProcessAlive(holder.pid);
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to another user.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function olderThan(file: string, ms: number): Promise<boolean> {
  try {
    return Date.now() - (await stat(file)).mtimeMs > ms;
  } catch {
    return false;
  }
}

async function release(file: string, token: string): Promise<void> {
  const holder = await readLock(file);
  if (typeof holder === 'object' && holder.token === token) await unlink(file).catch(ignoreMissing);
}

function ignoreMissing(error: unknown): void {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
