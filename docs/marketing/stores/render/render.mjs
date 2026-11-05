#!/usr/bin/env node
// Renders the store screenshot sets from the real app.
//
//   VITE_POUXIS_PERF=1 npx vite --port 4196 --strictPort     (from apps/pouxis, in another shell)
//   node docs/marketing/stores/render/render.mjs [--formats ios-phone,mac] [--langs fr,en]
//        [--no-feature] [--no-heroes]
//
// Each frame: capture the scene in a fresh seeded browser context at the device's logical
// viewport, compose the marketing frame (caption + CSS device) as HTML, screenshot it at the
// store's exact pixel size, then flatten and optimise the PNG. `validate.mjs` checks the result.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { caption } from './lib/captions.mjs';
import { captureScene } from './lib/capture.mjs';
import { featureHtml, frameHtml, heroHtml, rootTokens } from './lib/compose.mjs';
import {
  APP_URL,
  DEMO_DAY,
  DEMO_ZONE,
  HERO_DIR,
  MAX_BYTES,
  OUT_DIR,
  WORK_DIR,
  chromiumPath,
  demoTime,
} from './lib/config.mjs';
import {
  EYEBROWS,
  FEATURE_GRAPHIC,
  FORMATS,
  HEROES,
  deviceGeometry,
  framesOf,
} from './lib/formats.mjs';
import { optimisePng, pngInfo } from './lib/png.mjs';
import { SCENES, sceneAlt } from './lib/scenes.mjs';

function parseArgs(argv) {
  const opts = { formats: Object.keys(FORMATS), langs: ['fr', 'en'], feature: true, heroes: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--formats') opts.formats = argv[++i].split(',');
    else if (a === '--langs') opts.langs = argv[++i].split(',');
    else if (a === '--no-feature') opts.feature = false;
    else if (a === '--no-heroes') opts.heroes = false;
    else throw new Error(`unknown argument ${a}`);
  }
  for (const f of opts.formats) if (!FORMATS[f]) throw new Error(`unknown format ${f}`);
  return opts;
}

/** Status-bar clock of a scene: its own time and day, in the frame's language. */
function clockOf(sceneId, lang) {
  const s = SCENES[sceneId];
  const date = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: DEMO_ZONE,
  }).format(demoTime(s.clock, s.day ?? DEMO_DAY));
  return { time: s.clock, date };
}

/** Raw captures are shared between frames that show the same state at the same viewport. */
function captureCache(browser) {
  const cache = new Map();
  return async ({ sceneId, device, geo, lang, userAgent }) => {
    const viewport = SCENES[sceneId].viewport ?? geo.viewport;
    const key = JSON.stringify([sceneId, viewport, geo.captureScale, lang, userAgent ?? '']);
    if (!cache.has(key)) {
      const png = await captureScene(browser, {
        sceneId,
        lang,
        userAgent,
        device: { viewport, scale: geo.captureScale, touch: device.touch, safe: device.safe },
      });
      const info = pngInfo(png);
      const file = join(
        WORK_DIR,
        'captures',
        `${cache.size.toString().padStart(3, '0')}-${sceneId}-${lang}.png`,
      );
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, png);
      cache.set(key, {
        url: pathToFileURL(file).href,
        size: { w: info.width / geo.captureScale, h: info.height / geo.captureScale },
      });
    }
    return cache.get(key);
  };
}

/** Screenshots a composed document at its exact size; `transparent` keeps the alpha channel. */
async function shoot(browser, html, size, out, { transparent = false } = {}) {
  const doc = join(
    WORK_DIR,
    'docs',
    relative(OUT_DIR, out)
      .replaceAll('/', '_')
      .replace(/\.png$/, '.html'),
  );
  mkdirSync(dirname(doc), { recursive: true });
  writeFileSync(doc, html);
  const page = await browser.newPage({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 1,
  });
  try {
    await page.goto(pathToFileURL(doc).href);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() =>
      Promise.all([...document.images].map((img) => img.decode().catch(() => {}))),
    );
    mkdirSync(dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: transparent });
  } finally {
    await page.close();
  }
  return optimisePng(out, { maxBytes: MAX_BYTES, opaque: !transparent });
}

const pad2 = (n) => String(n + 1).padStart(2, '0');

async function renderFormat(browser, capture, tokens, formatId, lang, manifest) {
  const format = FORMATS[formatId];
  for (const frame of framesOf(formatId)) {
    const geo = deviceGeometry(format.device, format.region, frame.options);
    const shot = await capture({
      sceneId: frame.scene,
      device: format.device,
      geo,
      lang,
      userAgent: format.userAgent,
    });
    const text = caption(frame.series, lang, frame.captionIndex);
    const html = frameHtml({
      format,
      tokens,
      lang,
      eyebrow: EYEBROWS[frame.eyebrow][lang],
      caption: text,
      device: format.device,
      geo,
      img: shot.url,
      imgSize: shot.size,
      clock: clockOf(frame.scene, lang),
      options: frame.options,
    });
    const out = join(OUT_DIR, lang, formatId, `${pad2(frame.index)}-${frame.scene}.png`);
    const mode = await shoot(browser, html, format.size, out);
    manifest.push({
      file: relative(OUT_DIR, out),
      format: formatId,
      lang,
      size: `${format.size.w}x${format.size.h}`,
      caption: text,
      alt: `${text}. ${sceneAlt(frame.scene, lang)}`,
      encoding: mode,
    });
    console.log(`  ${relative(OUT_DIR, out)}  (${mode})`);
  }
}

async function renderFeature(browser, capture, tokens, lang, manifest) {
  const spec = FEATURE_GRAPHIC;
  const geo = deviceGeometry(spec.device, spec.region);
  const shot = await capture({ sceneId: spec.scene, device: spec.device, geo, lang });
  const text = caption(spec.series, lang, 0);
  const out = join(OUT_DIR, lang, 'android-phone', 'feature-graphic-1024x500.png');
  const mode = await shoot(
    browser,
    featureHtml({ spec, tokens, lang, caption: text, geo, img: shot.url }),
    spec.size,
    out,
  );
  manifest.push({
    file: relative(OUT_DIR, out),
    format: 'google-play-feature',
    lang,
    size: '1024x500',
    caption: text,
    alt: text,
    encoding: mode,
  });
  console.log(`  ${relative(OUT_DIR, out)}  (${mode})`);
}

async function renderHero(browser, capture, tokens, hero, lang) {
  const format = FORMATS[hero.format];
  const geo = deviceGeometry(format.device, { x: 0, y: 0, ...hero.region });
  const shot = await capture({
    sceneId: hero.scene,
    device: format.device,
    geo,
    lang,
    userAgent: format.userAgent,
  });
  const { html, size } = heroHtml({
    tokens,
    lang,
    device: format.device,
    geo: { ...geo, box: { ...geo.box, x: 0, y: 0 } },
    img: shot.url,
    imgSize: shot.size,
    clock: clockOf(hero.scene, lang),
    pad: Math.round(Math.max(geo.box.w, geo.box.h) * 0.06),
  });
  const out = join(HERO_DIR, lang, `${hero.id}.png`);
  const mode = await shoot(browser, html, size, out, { transparent: true });
  console.log(`  ${relative(HERO_DIR, out)}  ${size.w}x${size.h} (${mode})`);
  return { file: `${lang}/${hero.id}.png`, width: size.w, height: size.h };
}

async function assertAppReachable() {
  try {
    const res = await fetch(APP_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    throw new Error(`app not reachable at ${APP_URL} (${e.message}); start Vite first, see README`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await assertAppReachable();
  rmSync(join(WORK_DIR, 'captures'), { recursive: true, force: true });
  const tokens = rootTokens();
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  try {
    const capture = captureCache(browser);
    for (const lang of opts.langs) {
      const manifest = [];
      for (const formatId of opts.formats) {
        console.log(`${lang} · ${formatId}`);
        await renderFormat(browser, capture, tokens, formatId, lang, manifest);
      }
      if (opts.feature && opts.formats.includes('android-phone'))
        await renderFeature(browser, capture, tokens, lang, manifest);
      writeFileSync(join(OUT_DIR, lang, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
      if (opts.heroes) {
        console.log(`${lang} · heroes`);
        const heroes = [];
        for (const hero of HEROES)
          heroes.push(await renderHero(browser, capture, tokens, hero, lang));
        writeFileSync(
          join(HERO_DIR, lang, 'manifest.json'),
          `${JSON.stringify(heroes, null, 2)}\n`,
        );
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
