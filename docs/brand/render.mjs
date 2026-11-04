/**
 * Renders the brand SVG sources to PNG (app icons, PWA icons, social images).
 * Usage (from the repo root): node docs/brand/render.mjs
 * Requires the Playwright package already installed in the workspace and a Chromium build;
 * set CHROMIUM_PATH to override the browser executable.
 */
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, 'assets');
const publicDir = join(here, '../../apps/pouxis/public');

/** [source SVG in assets/, output path, square size in px, transparent background?] */
const jobs = [
  ['app-icon-1024.svg', join(assets, 'app-icon-1024.png'), 1024, false],
  ['app-icon-macos-1024.svg', join(here, 'png/app-icon-macos-1024.png'), 1024, true],
  ['app-icon-rounded-1024.svg', join(here, 'png/app-icon-rounded-1024.png'), 1024, true],
  ['app-icon-ios-dark-1024.svg', join(here, 'png/app-icon-ios-dark-1024.png'), 1024, true],
  ['app-icon-ios-tinted-1024.svg', join(here, 'png/app-icon-ios-tinted-1024.png'), 1024, false],
  ['android-adaptive-foreground.svg', join(here, 'png/android-foreground-432.png'), 432, true],
  ['android-adaptive-background.svg', join(here, 'png/android-background-432.png'), 432, false],
  ['android-adaptive-monochrome.svg', join(here, 'png/android-monochrome-432.png'), 432, true],
  ['app-icon-1024.svg', join(publicDir, 'icon-512.png'), 512, false],
  ['app-icon-1024.svg', join(publicDir, 'icon-192.png'), 192, false],
  ['app-icon-1024.svg', join(publicDir, 'apple-touch-icon.png'), 180, false],
  ['app-icon-maskable-512.svg', join(publicDir, 'icon-maskable-512.png'), 512, false],
];

/** Wide formats keep their own aspect ratio: [source, output, width, height]. */
const social = [
  ['social-og-1200x630.svg', join(here, 'png/social-og-1200x630.png'), 1200, 630],
  ['social-square-1080.svg', join(here, 'png/social-square-1080.png'), 1080, 1080],
  ['social-story-1080x1920.svg', join(here, 'png/social-story-1080x1920.png'), 1080, 1920],
];

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ].filter(Boolean);
  return candidates.find((path) => existsSync(path));
}

function pageFor(svgFile, width, height) {
  const svg = readFileSync(join(assets, svgFile), 'utf8').replace(/<\?xml[^>]*\?>/, '');
  const fitted = svg.replace('<svg ', `<svg width="${width}" height="${height}" `);
  return `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${fitted}</body></html>`;
}

async function render(page, [src, out, width, height, transparent]) {
  await page.setViewportSize({ width, height });
  await page.setContent(pageFor(src, width, height));
  await page.screenshot({
    path: out,
    omitBackground: transparent,
    clip: { x: 0, y: 0, width, height },
  });
  console.log(`${out.replace(join(here, '../..') + '/', '')}  ${width}×${height}`);
}

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [src, out, size, transparent] of jobs)
  await render(page, [src, out, size, size, transparent]);
for (const [src, out, width, height] of social)
  await render(page, [src, out, width, height, false]);
await browser.close();
