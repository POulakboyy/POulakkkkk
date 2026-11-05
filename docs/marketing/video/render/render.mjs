#!/usr/bin/env node
// Renders the POuxis presentation films from shotlist.json: films each scene of the real app
// (Vite dev server, demo seed, onboarding skipped), then assembles every format with ffmpeg.
//
// Usage (from the repo root):
//   node docs/marketing/video/render/render.mjs                    # every format in OUTPUTS
//   node docs/marketing/video/render/render.mjs --formats hero-16x9,appstore-iphone
//   node docs/marketing/video/render/render.mjs --check-hooks      # resolve every hook, no video
// Options: --lang fr|en (UI language of the capture, default fr), --keep (keep .work/).
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { encodeClip, encodePaper, encodeProgramme, posterFrame, probe } from './lib/assemble.mjs';
import {
  APP_URL, MAX_BYTES, OUT_DIR, OUTPUTS, PORT, REPO_DIR, SHOTLIST, STORE_FORMATS, VIDEO_DIR, WORK_DIR, chromiumPath,
} from './lib/config.mjs';
import { directionFor } from './lib/directions.mjs';
import { captionTiming, clipPlan, recordWindow, segments, stageGeometry } from './lib/plan.mjs';
import { recordScene } from './lib/record.mjs';
import { parseSrt, toAss } from './lib/subtitles.mjs';
import { themeTokens } from './lib/tokens.mjs';
import { loadShotlist, validate } from '../validate-shotlist.mjs';

/** Poster frame of each format (ms): a frame that shows the product working. */
const POSTER_MS = {
  'hero-16x9': 20_000,
  'cut-30-16x9': 8_000,
  'vertical-15-9x16': 5_000,
  'vertical-30-9x16': 5_000,
};

function args(argv) {
  const get = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  return {
    formats: get('--formats')?.split(',') ?? Object.keys(OUTPUTS),
    lang: get('--lang') ?? 'fr',
    keep: argv.includes('--keep'),
    checkHooks: argv.includes('--check-hooks'),
  };
}

async function reachable(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

/** Uses a dev server already on PORT, or starts one for the duration of the render. */
async function ensureServer() {
  if (await reachable(APP_URL)) return () => {};
  const child = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: join(REPO_DIR, 'apps/pouxis'),
    stdio: 'ignore',
    detached: true,
  });
  for (let i = 0; i < 120; i += 1) {
    if (await reachable(APP_URL)) return () => process.kill(-child.pid, 'SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
  process.kill(-child.pid, 'SIGTERM');
  throw new Error(`dev server did not start on ${APP_URL}`);
}

function captionStyle(format) {
  if (format.viewport && format.viewport.height > format.viewport.width) return 'burned-in-top';
  return format.captions;
}

function endcardFor(scene, lang) {
  if (scene.kind !== 'endcard') return null;
  const file = scene.theme === 'dark' ? scene.endcard.logoReversed : scene.endcard.logo;
  return { logoSvg: readFileSync(join(REPO_DIR, file), 'utf8'), lines: scene.endcard.lines[lang] };
}

/** Films every scene a format needs (once per scene, covering all its clips). */
async function filmFormat(browser, doc, plan, ctx) {
  const geo = stageGeometry(plan.format);
  const byScene = Map.groupBy(plan.clips, (c) => c.sceneId);
  const recordings = new Map();
  for (const [sceneId, clips] of byScene) {
    const scene = clips[0].scene;
    const win = recordWindow(clips);
    const t = Date.now();
    const rec = await recordScene(browser, {
      scene,
      geo,
      devices: doc.devices,
      tokens: ctx.tokens,
      lang: ctx.lang,
      window: win,
      dir: join(ctx.work, plan.format.id, sceneId),
      captionStyle: captionStyle(plan.format),
      timing: { durationMs: scene.durationMs, easing: doc.easings[scene.camera.easing], ...captionTiming(clips[0]) },
      clock: doc.fixtures.clock.now,
      store: STORE_FORMATS.has(plan.format.id),
      disclaimer: doc.fixtures.disclaimer[ctx.lang],
      endcard: endcardFor(scene, ctx.lang),
    });
    for (const [hook, how] of rec.usage) ctx.hooks.set(hook, how);
    recordings.set(sceneId, rec.frames);
    console.log(`  ✓ ${sceneId}: ${rec.frames.length} frames (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  }
  return { geo, recordings };
}

async function renderFormat(browser, doc, formatId, ctx) {
  const plan = clipPlan(doc, formatId);
  const base = OUTPUTS[formatId] ?? formatId;
  console.log(`▶ ${formatId} → ${base}.mp4 (${plan.totalMs / 1000} s)`);
  const { geo, recordings } = await filmFormat(browser, doc, plan, ctx);
  const dir = join(ctx.work, formatId);
  const out = { ...geo.out, fps: 30 };
  const segs = segments(plan);
  const files = segs.map((seg, i) => {
    const file = join(dir, `seg-${String(i).padStart(2, '0')}.mp4`);
    if (seg.type === 'paper') encodePaper(ctx.tokens.light['--bg'], seg.lengthMs, file, out);
    else encodeClip(recordings.get(seg.clip.sceneId), seg.clip, file, out, join(dir, `seg-${i}.ffconcat`));
    return file;
  });
  const srt = join(VIDEO_DIR, 'subtitles', `${formatId}.${ctx.lang}.srt`);
  let assPath;
  if (plan.format.captions === 'lower-third' && existsSync(srt)) {
    assPath = join(dir, 'subtitles.ass');
    const light = ctx.tokens.light;
    writeFileSync(assPath, toAss(parseSrt(readFileSync(srt, 'utf8')), { ...out, ink: light['--ink'], paper: light['--bg'] }));
  }
  const video = join(OUT_DIR, `${base}.mp4`);
  encodeProgramme(segs, files, video, { fps: out.fps, assPath });
  posterFrame(video, plan.format.posterFrameMs ?? POSTER_MS[formatId] ?? 5000, join(OUT_DIR, `${base}.poster.png`));
  for (const lang of ['fr', 'en']) {
    const file = join(VIDEO_DIR, 'subtitles', `${formatId}.${lang}.srt`);
    if (plan.format.voScenes.length && existsSync(file)) copyFileSync(file, join(OUT_DIR, `${base}.${lang}.srt`));
  }
  return check(formatId, video, plan, out);
}

/** ffprobe the result against the shotlist: duration ±0.1 s, exact size, 30 fps, file budget. */
function check(formatId, video, plan, out) {
  const p = probe(video);
  const problems = [];
  if (Math.abs(p.durationS * 1000 - plan.totalMs) > 100) problems.push(`duration ${p.durationS} s ≠ ${plan.totalMs / 1000} s`);
  if (p.width !== out.width || p.height !== out.height) problems.push(`size ${p.width}×${p.height} ≠ ${out.width}×${out.height}`);
  if (p.fps !== out.fps) problems.push(`fps ${p.fps} ≠ ${out.fps}`);
  if (p.bytes > MAX_BYTES) problems.push(`${(p.bytes / 1e6).toFixed(1)} MB > 25 MB`);
  const line = `${p.width}×${p.height} · ${p.durationS} s · ${p.fps} i/s · ${(p.bytes / 1e6).toFixed(1)} Mo`;
  console.log(`  ${problems.length ? '✗' : '✓'} ${formatId}: ${line}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
  return { format: formatId, file: video.slice(REPO_DIR.length + 1), ...p, expectedS: plan.totalMs / 1000, problems };
}

/** Opens each scene's route and resolves every hook its actions use (no recording). */
async function checkHooks(browser, doc, ctx) {
  let failures = 0;
  for (const format of doc.formats.filter((f) => OUTPUTS[f.id])) {
    const plan = clipPlan(doc, format.id);
    for (const clip of plan.clips.filter((c, i, a) => a.findIndex((x) => x.sceneId === c.sceneId) === i)) {
      if (!['ui', 'composite'].includes(clip.scene.kind)) continue;
      try {
        const rec = await recordScene(browser, {
          scene: clip.scene,
          slow: 1,
          geo: { ...stageGeometry(format), dsf: 1 },
          devices: doc.devices,
          tokens: ctx.tokens,
          lang: ctx.lang,
          window: { leadMs: 0, untilMs: clip.scene.durationMs },
          dir: join(ctx.work, 'hooks', clip.sceneId),
          captionStyle: captionStyle(format),
          timing: { durationMs: 1, easing: 'linear' },
          clock: doc.fixtures.clock.now,
          store: true,
          disclaimer: '',
          endcard: null,
        });
        console.log(`  ✓ ${format.id}/${clip.sceneId} ${[...rec.usage].map(([h, w]) => `${h}:${w}`).join(' ')}`);
      } catch (error) {
        failures += 1;
        console.error(`  ✗ ${format.id}/${clip.sceneId}: ${error.message.split('\n')[0]}`);
      }
    }
  }
  return failures;
}

async function main() {
  const opts = args(process.argv.slice(2));
  const doc = loadShotlist(new URL(`file://${SHOTLIST}`));
  const errors = validate(doc);
  if (errors.length) throw new Error(`shotlist.json is invalid:\n${errors.join('\n')}`);
  const unknown = opts.formats.filter((f) => !doc.formats.some((x) => x.id === f));
  if (unknown.length) throw new Error(`unknown format(s): ${unknown.join(', ')}`);
  mkdirSync(OUT_DIR, { recursive: true });
  const stopServer = await ensureServer();
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const ctx = { tokens: themeTokens(), lang: opts.lang, work: WORK_DIR, hooks: new Map() };
  try {
    if (opts.checkHooks) {
      const failures = await checkHooks(browser, doc, ctx);
      process.exitCode = failures ? 1 : 0;
      return;
    }
    const results = [];
    for (const id of opts.formats) results.push(await renderFormat(browser, doc, id, ctx));
    writeLog(results, ctx, doc, opts);
    if (results.some((r) => r.problems.length)) process.exitCode = 1;
  } finally {
    await browser.close();
    stopServer();
    if (!opts.keep && !opts.checkHooks) rmSync(WORK_DIR, { recursive: true, force: true });
  }
}

/** Merges this run into out/render-log.json (one entry per format, latest run wins). */
function writeLog(results, ctx, doc, opts) {
  const path = join(OUT_DIR, 'render-log.json');
  const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { formats: {} };
  for (const r of results) previous.formats[r.format] = { ...r, renderedAt: new Date().toISOString(), lang: opts.lang };
  previous.hooks = { ...previous.hooks, ...Object.fromEntries(ctx.hooks) };
  previous.directions = Object.fromEntries(
    doc.scenes.filter((s) => directionFor(s.id).why).map((s) => [s.id, directionFor(s.id).why]),
  );
  writeFileSync(path, `${JSON.stringify(previous, null, 2)}\n`);
}

await main();
