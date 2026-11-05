#!/usr/bin/env node
/**
 * Bundle report and budget check for a production build.
 *
 *   node perf/bundle.mjs <dist-dir> [--json] [--top=12]
 *
 * Reads `index.html` to find the initial graph (entry + modulepreloads + stylesheets), gzips
 * every chunk, and attributes each JS chunk's minified bytes to its original sources by decoding
 * the source map (no dependency). Exits with code 1 when a budget in `budget.json` is exceeded.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VLQ_VALUES = new Map([...VLQ_CHARS].map((c, i) => [c, i]));

/** Decodes one comma-free VLQ segment into its integer fields. */
export function decodeVlq(segment) {
  const out = [];
  let value = 0;
  let shift = 0;
  for (const char of segment) {
    const digit = VLQ_VALUES.get(char);
    if (digit === undefined) throw new Error(`invalid VLQ character ${char}`);
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
      continue;
    }
    out.push(value & 1 ? -(value >>> 1) : value >>> 1);
    value = 0;
    shift = 0;
  }
  return out;
}

/** Bytes of generated `code` per source path, following the map's segments line by line. */
export function attributeBytes(code, map) {
  const lines = code.split('\n');
  const bytes = new Map();
  const add = (source, n) => bytes.set(source, (bytes.get(source) ?? 0) + n);
  let sourceIndex = 0;
  map.mappings.split(';').forEach((group, lineNo) => {
    const line = lines[lineNo] ?? '';
    let column = 0;
    let lastColumn = 0;
    let lastSource = null;
    for (const segment of group.split(',')) {
      if (!segment) continue;
      const fields = decodeVlq(segment);
      column += fields[0] ?? 0;
      if (lastSource !== null) add(lastSource, column - lastColumn);
      else if (column > 0) add('(unmapped)', column);
      if (fields.length >= 4) {
        sourceIndex += fields[1] ?? 0;
        lastSource = map.sources[sourceIndex] ?? '(unknown)';
      } else lastSource = '(unmapped)';
      lastColumn = column;
    }
    add(lastSource ?? '(unmapped)', line.length - lastColumn + 1);
  });
  return bytes;
}

/** Groups a source path into a readable package/area name. */
export function areaOf(source) {
  const path = source.replace(/\\/g, '/');
  const nm = path.lastIndexOf('node_modules/');
  if (nm >= 0) {
    const rest = path.slice(nm + 'node_modules/'.length).split('/');
    return rest[0]?.startsWith('@') ? `${rest[0]}/${rest[1]}` : (rest[0] ?? path);
  }
  const core = path.match(/packages\/core\/src\/([^/]+)/);
  if (core) return `@pouxis/core/${core[1].replace(/\.ts$/, '')}`;
  const app = path.match(/apps\/pouxis\/src\/([^/]+)(?:\/([^/]+))?/);
  if (app) return app[2] && !app[2].includes('.') ? `src/${app[1]}/${app[2]}` : `src/${app[1]}`;
  return path;
}

function initialAssets(dist) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+)"/g)].map((m) => m[1]);
  return new Set(refs);
}

function chunkReport(dist, file) {
  const code = readFileSync(join(dist, file));
  const entry = { file, bytes: code.length, gzip: gzipSync(code, { level: 9 }).length };
  if (!file.endsWith('.js')) return entry;
  try {
    const map = JSON.parse(readFileSync(join(dist, `${file}.map`), 'utf8'));
    const areas = new Map();
    for (const [source, n] of attributeBytes(code.toString('utf8'), map)) {
      const area = areaOf(source);
      areas.set(area, (areas.get(area) ?? 0) + n);
    }
    entry.areas = [...areas].sort((a, b) => b[1] - a[1]);
  } catch {
    // No source map: sizes only.
  }
  return entry;
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

function main() {
  const args = process.argv.slice(2);
  const dist = resolve(args.find((a) => !a.startsWith('--')) ?? 'dist');
  const top = Number(args.find((a) => a.startsWith('--top='))?.slice(6) ?? 12);
  const budget = JSON.parse(readFileSync(new URL('./budget.json', import.meta.url), 'utf8'));
  const initial = initialAssets(dist);
  const files = readdirSync(join(dist, 'assets'))
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => `assets/${f}`);
  const chunks = files.map((f) => ({ ...chunkReport(dist, f), initial: initial.has(f) }));
  const sum = (list, key) => list.reduce((n, c) => n + c[key], 0);
  const initialJs = chunks.filter((c) => c.initial && c.file.endsWith('.js'));
  const initialCss = chunks.filter((c) => c.initial && c.file.endsWith('.css'));
  const totals = {
    initialJsGzip: sum(initialJs, 'gzip'),
    initialCssGzip: sum(initialCss, 'gzip'),
    largestLazyJsGzip: Math.max(
      0,
      ...chunks.filter((c) => !c.initial && c.file.endsWith('.js')).map((c) => c.gzip),
    ),
    totalJsGzip: sum(
      chunks.filter((c) => c.file.endsWith('.js')),
      'gzip',
    ),
  };

  if (args.includes('--json')) {
    console.log(JSON.stringify({ totals, chunks }, null, 2));
  } else {
    for (const c of chunks.sort((a, b) => b.gzip - a.gzip)) {
      const tag = c.initial ? 'INITIAL' : 'lazy   ';
      console.log(
        `${tag} ${c.file.padEnd(48)} ${kb(c.bytes).padStart(10)} ${kb(c.gzip).padStart(9)} gz`,
      );
      if (c.initial && c.areas) {
        for (const [area, n] of c.areas.slice(0, top)) {
          console.log(`          ${area.padEnd(46)} ${kb(n).padStart(10)}`);
        }
      }
    }
    console.log(
      '\nTotals (gzip):',
      Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, kb(v)])),
    );
  }

  const failures = Object.entries(budget)
    .filter(([key, limitKb]) => key in totals && totals[key] > limitKb * 1024)
    .map(([key, limitKb]) => `${key}: ${kb(totals[key])} > budget ${limitKb} kB`);
  if (failures.length > 0) {
    console.error(`\nBudget exceeded:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  } else console.log('Budget: OK', budget);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
