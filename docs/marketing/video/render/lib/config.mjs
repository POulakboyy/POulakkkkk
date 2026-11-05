// Paths and fixed settings of the render pipeline. Everything is overridable by env vars so the
// pipeline runs the same on a laptop and in CI.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const RENDER_DIR = fileURLToPath(new URL('..', import.meta.url));
export const VIDEO_DIR = join(RENDER_DIR, '..');
export const REPO_DIR = join(VIDEO_DIR, '../../..');
export const OUT_DIR = join(VIDEO_DIR, 'out');
export const SHOTLIST = join(VIDEO_DIR, 'shotlist.json');
export const TOKENS_CSS = join(REPO_DIR, 'apps/pouxis/src/design/tokens.css');
export const BRAND_ASSETS = join(REPO_DIR, 'docs/brand/assets');
/** Intermediate clips and frames; never committed. */
export const WORK_DIR = process.env.VIDEO_WORK_DIR || join(RENDER_DIR, '.work');

export const PORT = Number(process.env.VIDEO_PORT || 4195);
export const APP_URL = `http://localhost:${PORT}/`;
export const APP_PREFS_KEY = 'pouxis:app-prefs:v1';

/** Output frame rate of every deliverable (App Store maximum, enough for UI motion). */
export const FPS = 30;
/** Quality of the final H.264 encodes (files are committed: keep them small). */
export const FINAL_CRF = Number(process.env.VIDEO_CRF || 28);
/** Quality of intermediate clips (re-encoded once more at the end). */
export const CLIP_CRF = 16;
/** Per-file budget checked after encoding. */
export const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Deliverables produced by default: shotlist format id → output basename. Each format is
 * rendered at its first 30 fps deliverable (the 4K masters are out of scope for committed files).
 */
export const OUTPUTS = {
  'hero-16x9': 'pouxis-presentation-16x9',
  'vertical-30-9x16': 'pouxis-presentation-9x16',
  'appstore-iphone': 'pouxis-app-preview-iphone-886x1920',
  'google-play-portrait': 'pouxis-google-play-promo-1080x1920',
  'appstore-mac': 'pouxis-app-preview-mac-1920x1080',
  'cut-30-16x9': 'pouxis-presentation-30s-16x9',
  'vertical-15-9x16': 'pouxis-presentation-15s-9x16',
};

/** Store formats film the bare app: no device frame, no tap halo, no zoom. */
export const STORE_FORMATS = new Set(['appstore-iphone', 'appstore-mac', 'google-play-portrait']);

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);

/** First existing Chromium executable, or undefined to let Playwright use its bundled one. */
export function chromiumPath() {
  return CHROMIUM_CANDIDATES.find((p) => existsSync(p));
}
