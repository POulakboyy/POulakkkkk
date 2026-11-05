/**
 * Crash-safe file replacement: write a temporary sibling, flush it to disk, then `rename` it
 * over the target. Readers see either the old or the new content, never a torn file.
 */
import { randomBytes } from 'node:crypto';
import { open, rename, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export interface AtomicWriteOptions {
  /** Permission bits for a newly created file (default 0o600: personal data). */
  mode?: number;
}

export async function writeFileAtomic(
  file: string,
  content: string | Uint8Array,
  options: AtomicWriteOptions = {},
): Promise<void> {
  const dir = dirname(file);
  const tmp = join(dir, `.${basename(file)}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`);
  const handle = await open(tmp, 'wx', options.mode ?? 0o600);
  try {
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmp, file);
  } catch (error) {
    await rm(tmp, { force: true });
    throw error;
  }
  await syncDirectory(dir);
}

/** Persists the directory entry created by `rename` (POSIX); a no-op where unsupported. */
async function syncDirectory(dir: string): Promise<void> {
  if (process.platform === 'win32') return;
  try {
    const handle = await open(dir, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch {
    // Some filesystems refuse fsync on directories; the rename itself is still atomic.
  }
}
