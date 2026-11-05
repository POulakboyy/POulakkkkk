#!/usr/bin/env node
// Checks every exported set: exact pixel size per format, opaque 24-bit (or palette) PNGs for the
// stores, file budget, frame count per series, and the landing-page heroes.
//
//   node docs/marketing/stores/render/validate.mjs
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { HERO_DIR, MAX_BYTES, OUT_DIR } from './lib/config.mjs';
import { FEATURE_GRAPHIC, FORMATS, HEROES, framesOf } from './lib/formats.mjs';
import { checkPng } from './lib/png.mjs';

const LANGS = ['fr', 'en'];
/** Apple accepts up to 10 per size, Google Play shows 8 per device type. */
const FRAME_RANGE = { min: 6, max: 8 };

/** Every expected file with its rules: [path, { width, height, maxBytes, opaque }]. */
export function expectedFiles(outDir = OUT_DIR, heroDir = HERO_DIR) {
  const files = [];
  for (const lang of LANGS) {
    for (const [id, format] of Object.entries(FORMATS)) {
      for (const frame of framesOf(id)) {
        const name = `${String(frame.index + 1).padStart(2, '0')}-${frame.scene}.png`;
        files.push([
          join(outDir, lang, id, name),
          { width: format.size.w, height: format.size.h, maxBytes: MAX_BYTES, opaque: true },
        ]);
      }
    }
    const { w, h } = FEATURE_GRAPHIC.size;
    files.push([
      join(outDir, lang, 'android-phone', `feature-graphic-${w}x${h}.png`),
      { width: w, height: h, maxBytes: MAX_BYTES, opaque: true },
    ]);
    for (const hero of HEROES)
      files.push([join(heroDir, lang, `${hero.id}.png`), { maxBytes: MAX_BYTES, opaque: false }]);
  }
  return files;
}

function validate() {
  const errors = [];
  for (const id of Object.keys(FORMATS)) {
    const n = framesOf(id).length;
    if (n < FRAME_RANGE.min || n > FRAME_RANGE.max)
      errors.push(`${id}: ${n} frames, expected ${FRAME_RANGE.min}–${FRAME_RANGE.max}`);
  }
  let checked = 0;
  for (const [path, rules] of expectedFiles()) {
    if (!existsSync(path)) {
      errors.push(`${path}: missing`);
      continue;
    }
    checked++;
    // Heroes have no fixed size: only their budget is checked.
    for (const p of checkPng(path, rules)) errors.push(`${path}: ${p}`);
  }
  // Stray files usually mean a renamed scene whose old export was left behind.
  const known = new Set(expectedFiles().map(([p]) => p));
  for (const lang of LANGS) {
    for (const id of Object.keys(FORMATS)) {
      const dir = join(OUT_DIR, lang, id);
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir))
        if (!known.has(join(dir, f)))
          errors.push(`${join(dir, f)}: not produced by the current plan`);
    }
  }
  return { errors, checked };
}

const { errors, checked } = validate();
if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `✓ ${checked} PNG files: sizes, opacity and ≤ ${(MAX_BYTES / 1048576).toFixed(1)} MB budget verified`,
);
