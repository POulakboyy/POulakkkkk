import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ZipError, crc32, createZip, readZip } from './index.ts';

const hasTool = (cmd: string, arg: string) =>
  spawnSync(cmd, [arg], { stdio: 'ignore' }).status === 0;
const HAS_UNZIP = hasTool('unzip', '-v');
const HAS_PYTHON = hasTool('python3', '--version');
const decode = (b: Uint8Array) => new TextDecoder().decode(b);

const SAMPLE = [
  { name: 'manifest.json', data: '{"format":"pouxis-export"}\n' },
  { name: 'notes/' },
  { name: 'notes/été-à-paris.md', data: '# Été\n\nCafé ☕ et crème brûlée.\n' },
  { name: 'empty.txt', data: '' },
  { name: 'binary.bin', data: new Uint8Array([0, 1, 2, 255, 254, 0]) },
];

describe('crc32', () => {
  it('matches the reference check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('can be computed chunk by chunk', () => {
    const all = new TextEncoder().encode('hello, world');
    expect(crc32(all.subarray(5), crc32(all.subarray(0, 5)))).toBe(crc32(all));
  });
});

describe('createZip / readZip', () => {
  it('round-trips names, contents and directories', () => {
    const modified = new Date(2026, 9, 8, 14, 30, 10);
    const entries = readZip(createZip(SAMPLE, { modified }));
    expect(entries.map((e) => e.name)).toEqual(SAMPLE.map((e) => e.name));
    expect(decode(entries[2]!.data)).toBe(SAMPLE[2]!.data);
    expect([...entries[4]!.data]).toEqual([0, 1, 2, 255, 254, 0]);
    expect(entries[1]!.isDirectory).toBe(true);
    expect(entries[0]!.modified.getTime()).toBe(modified.getTime());
  });

  it('sets the UTF-8 flag on every header', () => {
    const bytes = createZip(SAMPLE);
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800); // first local header
  });

  it('detects corrupted contents through the CRC', () => {
    const bytes = createZip([{ name: 'a.txt', data: 'abcdef' }]);
    const first = 30 + 'a.txt'.length; // local header + name: first data byte
    bytes[first] = (bytes[first] ?? 0) ^ 0xff;
    expect(() => readZip(bytes)).toThrow(expect.objectContaining({ code: 'ZIP_CRC_MISMATCH' }));
  });

  it('rejects garbage, traversal and duplicate names', () => {
    expect(() => readZip(new Uint8Array([1, 2, 3]))).toThrow(ZipError);
    for (const name of ['../evil', '/abs', 'a\\b', 'C:x', 'a//b']) {
      expect(() => createZip([{ name, data: 'x' }])).toThrow(
        expect.objectContaining({ code: 'ZIP_UNSAFE_NAME' }),
      );
    }
    expect(() => createZip([{ name: 'a' }, { name: 'a' }])).toThrow(
      expect.objectContaining({ code: 'ZIP_DUPLICATE_NAME' }),
    );
  });

  it.skipIf(!HAS_UNZIP)('produces archives the system unzip accepts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pouxis-zip-'));
    const file = join(dir, 'out.zip');
    writeFileSync(file, createZip(SAMPLE));
    const test = spawnSync('unzip', ['-t', file], { encoding: 'utf8' });
    expect(test.status, test.stdout + test.stderr).toBe(0);
    expect(test.stdout).toContain('No errors detected');
    execFileSync('unzip', ['-q', file, '-d', join(dir, 'x')]);
    expect(readFileSync(join(dir, 'x', 'notes', 'été-à-paris.md'), 'utf8')).toBe(SAMPLE[2]!.data);
  });

  it.skipIf(!HAS_PYTHON)('reads deflated archives written by another tool', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pouxis-zip-'));
    const file = join(dir, 'py.zip');
    const script = [
      'import sys, zipfile',
      'with zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as z:',
      '    z.writestr("tâches.json", "[" + ",".join(["1"] * 500) + "]")',
    ].join('\n');
    execFileSync('python3', ['-I', '-c', script, file]);
    const bytes = new Uint8Array(readFileSync(file));
    expect(() => readZip(bytes)).toThrow(expect.objectContaining({ code: 'ZIP_UNSUPPORTED' }));
    const [entry] = readZip(bytes, { inflateRaw: (d) => inflateRawSync(d) });
    expect(entry!.name).toBe('tâches.json');
    expect(JSON.parse(decode(entry!.data))).toHaveLength(500);
  });
});
