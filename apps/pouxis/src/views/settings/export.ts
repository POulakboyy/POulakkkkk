import { COLLECTIONS } from '@pouxis/core';
import type { CollectionName, Collections, UserPrefs } from '@pouxis/core';
import type { Store } from '../../store/index.ts';
import { createZip, type ZipEntry } from './zip.ts';

/**
 * Full data export (portability, 7.x): every collection as readable JSON, either as one file or
 * as a .zip with one file per collection. Secrets (sync token, passphrase) are never included:
 * they are not part of the store's records or preferences.
 */

export type ExportFormat = 'zip' | 'json';

export const EXPORT_SCHEMA = 'pouxis-export';
export const EXPORT_VERSION = 1;

export interface ExportSnapshot {
  schema: typeof EXPORT_SCHEMA;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  prefs: UserPrefs;
  collections: { [K in CollectionName]: readonly Collections[K][] };
}

type Readable = Pick<Store, 'all' | 'prefs'>;

export function snapshot(store: Readable, now: Date = new Date()): ExportSnapshot {
  const collections = {} as { [K in CollectionName]: readonly Collections[K][] };
  for (const name of COLLECTIONS) {
    (collections as Record<CollectionName, readonly unknown[]>)[name] = store.all(name);
  }
  return {
    schema: EXPORT_SCHEMA,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    prefs: store.prefs(),
    collections,
  };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** `pouxis-2026-11-05` — the date part is UTC so the name never depends on the machine zone. */
export function exportBaseName(now: Date): string {
  return `pouxis-${now.toISOString().slice(0, 10)}`;
}

export function zipEntries(snap: ExportSnapshot, now: Date): ZipEntry[] {
  const counts = Object.fromEntries(COLLECTIONS.map((c) => [c, snap.collections[c].length]));
  const manifest = {
    schema: snap.schema,
    version: snap.version,
    exportedAt: snap.exportedAt,
    files: COLLECTIONS.map((c) => `${c}.json`),
    counts,
  };
  return [
    { name: 'manifest.json', data: json(manifest), date: now },
    { name: 'prefs.json', data: json(snap.prefs), date: now },
    ...COLLECTIONS.map((c) => ({ name: `${c}.json`, data: json(snap.collections[c]), date: now })),
  ];
}

export interface ExportFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export function buildExport(
  store: Readable,
  format: ExportFormat,
  now: Date = new Date(),
): ExportFile {
  const snap = snapshot(store, now);
  const base = exportBaseName(now);
  if (format === 'json') {
    return {
      name: `${base}.json`,
      type: 'application/json',
      bytes: new TextEncoder().encode(json(snap)),
    };
  }
  return { name: `${base}.zip`, type: 'application/zip', bytes: createZip(zipEntries(snap, now)) };
}

/** Saves bytes through a temporary object URL and `<a download>`. */
export function downloadFile(file: ExportFile, doc: Document = document): void {
  const blob = new Blob([file.bytes as BlobPart], { type: file.type });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  a.style.display = 'none';
  doc.body.append(a);
  a.click();
  a.remove();
  // Let the navigation start before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Builds and downloads the export; returns the file name for the confirmation toast. */
export function exportAll(store: Readable, format: ExportFormat = 'zip'): string {
  const file = buildExport(store, format);
  downloadFile(file);
  return file.name;
}
