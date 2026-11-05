// PNG checks and optimisation. Stores want opaque 24-bit images (Google Play rejects alpha in
// screenshots and the feature graphic), and committed files must stay under the size budget.
import { execFileSync } from 'node:child_process';
import { readFileSync, renameSync, statSync } from 'node:fs';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOR_TYPES = { 0: 'gray', 2: 'rgb', 3: 'palette', 4: 'gray-alpha', 6: 'rgba' };

/** Width, height, bit depth and colour type from the IHDR chunk. */
export function pngInfo(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(SIGNATURE))
    throw new Error('not a PNG file');
  if (buffer.toString('latin1', 12, 16) !== 'IHDR') throw new Error('PNG without IHDR first');
  const colorType = buffer[25];
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: COLOR_TYPES[colorType] ?? `unknown(${colorType})`,
    hasAlpha: colorType === 4 || colorType === 6 || hasTransparencyChunk(buffer),
  };
}

/** A palette image is still "alpha" when it carries a tRNS chunk. */
function hasTransparencyChunk(buffer) {
  let at = 8;
  while (at + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(at);
    const type = buffer.toString('latin1', at + 4, at + 8);
    if (type === 'tRNS') return true;
    if (type === 'IDAT' || type === 'IEND') return false;
    at += 12 + length;
  }
  return false;
}

/** Problems of the file at `path` against its rules (empty when valid); size checked when given. */
export function checkPng(path, { width, height, maxBytes, opaque = true }) {
  const problems = [];
  const info = pngInfo(readFileSync(path));
  if (width !== undefined && (info.width !== width || info.height !== height)) {
    problems.push(`${info.width}×${info.height} instead of ${width}×${height}`);
  }
  if (opaque && info.hasAlpha) problems.push(`has an alpha channel (${info.colorType})`);
  const bytes = statSync(path).size;
  if (bytes > maxBytes)
    problems.push(`${(bytes / 1048576).toFixed(2)} MB > ${(maxBytes / 1048576).toFixed(2)} MB`);
  return problems;
}

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'pipe' });
}

/**
 * Rewrites `path` as an opaque 24-bit PNG (or keeps alpha for web heroes) at maximum
 * compression; when still over `maxBytes`, falls back to a 256-colour palette with error
 * diffusion, which flat UI survives without visible banding.
 */
export function optimisePng(path, { maxBytes, opaque = true }) {
  const tmp = `${path}.tmp.png`;
  ffmpeg([
    '-i',
    path,
    '-pix_fmt',
    opaque ? 'rgb24' : 'rgba',
    '-compression_level',
    '9',
    '-pred',
    'mixed',
    tmp,
  ]);
  renameSync(tmp, path);
  if (statSync(path).size <= maxBytes) return 'truecolor';
  const filter = opaque
    ? 'split[a][b];[a]palettegen=max_colors=256:stats_mode=full:reserve_transparent=0[p];[b][p]paletteuse=dither=sierra2_4a'
    : 'split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:alpha_threshold=64';
  ffmpeg(['-i', path, '-filter_complex', filter, '-compression_level', '9', tmp]);
  renameSync(tmp, path);
  return 'palette';
}
