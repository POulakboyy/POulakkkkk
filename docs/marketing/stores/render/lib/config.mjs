// Paths and fixed settings of the screenshot pipeline; overridable by env vars.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const RENDER_DIR = fileURLToPath(new URL('..', import.meta.url));
export const STORES_DIR = join(RENDER_DIR, '..');
export const REPO_DIR = join(STORES_DIR, '../../..');
export const OUT_DIR = process.env.SHOTS_OUT_DIR || join(STORES_DIR, 'screenshots');
export const HERO_DIR = process.env.SHOTS_HERO_DIR || join(REPO_DIR, 'website/assets/screens');
/** Raw captures and composed HTML; never committed. */
export const WORK_DIR = process.env.SHOTS_WORK_DIR || join(RENDER_DIR, '.work');
export const CAPTION_PLAN = join(STORES_DIR, 'screenshots.md');
export const TOKENS_CSS = join(REPO_DIR, 'apps/pouxis/src/design/tokens.css');
export const I18N_DIR = join(REPO_DIR, 'apps/pouxis/src/i18n');

export const PORT = Number(process.env.SHOTS_PORT || 4196);
export const APP_URL = process.env.SHOTS_APP_URL || `http://localhost:${PORT}/`;
export const APP_PREFS_KEY = 'pouxis:app-prefs:v1';

/** The fictional week of every set: Thursday 5 November 2026, Paris. */
export const DEMO_DAY = '2026-11-05';
export const DEMO_ZONE = 'Europe/Paris';
/** Paris is UTC+1 on the demo day. */
export const DEMO_OFFSET = '+01:00';

/** Per-file budget of every exported PNG. */
export const MAX_BYTES = 1.5 * 1024 * 1024;

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);

/** First existing Chromium executable, or undefined to let Playwright use its bundled one. */
export function chromiumPath() {
  return CHROMIUM_CANDIDATES.find((p) => existsSync(p));
}

/** Demo-day wall-clock time "HH:MM" in Paris → Date. */
export function demoTime(hhmm, day = DEMO_DAY) {
  return new Date(`${day}T${hhmm}:00${DEMO_OFFSET}`);
}
