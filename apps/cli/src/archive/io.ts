/** Writing an export bundle to a ZIP file or a directory, and reading one back. */
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { writeFileAtomic } from '../store/atomic.ts';
import { createZip, readZip } from '../zip/index.ts';
import type { BundleFile } from './bundle.ts';

export async function writeZipBundle(
  file: string,
  files: readonly BundleFile[],
  modified: Date,
): Promise<void> {
  const bytes = createZip(
    files.map((f) => ({ name: f.name, data: f.content })),
    { modified },
  );
  await mkdir(dirname(file), { recursive: true });
  await writeFileAtomic(file, bytes, { mode: 0o600 });
}

export async function writeDirBundle(dir: string, files: readonly BundleFile[]): Promise<void> {
  for (const f of files) {
    const target = join(dir, ...f.name.split('/'));
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, f.content, { mode: 0o600 });
  }
}

/** Reads every file of a ZIP archive or a directory into a name → text map. */
export async function readBundleFiles(path: string): Promise<Map<string, string>> {
  const info = await stat(path);
  const files = new Map<string, string>();
  const utf8 = new TextDecoder('utf-8');
  if (info.isDirectory()) {
    for (const name of await listFiles(path)) {
      if (name.endsWith('.json')) files.set(name, await readFile(join(path, name), 'utf8'));
    }
    return files;
  }
  const entries = readZip(new Uint8Array(await readFile(path)), {
    inflateRaw: (data, size) => inflateRawSync(data, { maxOutputLength: Math.max(size, 1) }),
  });
  for (const entry of entries) {
    if (!entry.isDirectory && entry.name.endsWith('.json'))
      files.set(entry.name, utf8.decode(entry.data));
  }
  return files;
}

/** Relative `/`-separated paths of the files under `root` (two levels are enough here). */
async function listFiles(root: string, dir = root, depth = 0): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isFile()) out.push(relative(root, full).split(sep).join('/'));
    else if (entry.isDirectory() && depth < 1)
      out.push(...(await listFiles(root, full, depth + 1)));
  }
  return out;
}
