#!/usr/bin/env node
/**
 * UI stress test: seeds a large data set through the store, then measures every view.
 *
 *   node perf/runtime.mjs [--url=http://localhost:4194] [--cpu=4] [--out=perf-report.json]
 *                         [--counts=tasks:5000,events:2000,notes:1000,nodes:2000]
 *
 * Needs a perf build (VITE_POUXIS_PERF=1) served on --url; see docs/performance/UI.md.
 * Per view: time to interactive after navigation, long tasks, FPS while scrolling, heap after
 * GC. Plus boot time with the data set, FPS during canvas pan and node drag, and input latency
 * (Event Timing, like INP) while typing in the command bar.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { buildDataset, DEFAULT_COUNTS, seedInPage } from './seed.mjs';
import { summariseFrames, summariseLatency } from './stats.mjs';

const APP_PREFS_KEY = 'pouxis:app-prefs:v1';
const FIXED_NOW = new Date('2026-11-05T07:30:00+01:00');
// Today last: the app boots on it (its chunk is loaded) and it serves as the in-between view.
const VIEWS = ['tasks', 'calendar', 'canvas', 'ideas', 'insights', 'settings', 'lab', 'today'];
/** Capture latency is measured over a heavy view (5k tasks behind) and a light one. */
const CAPTURE_VIEWS = ['tasks', 'insights'];
const DEFAULT_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function parseArgs(argv) {
  const get = (name, fallback) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const counts = { ...DEFAULT_COUNTS };
  for (const pair of get('counts', '').split(',').filter(Boolean)) {
    const [key, value] = pair.split(':');
    if (key in counts) counts[key] = Number(value);
  }
  return {
    url: get('url', 'http://localhost:4194'),
    cpu: Number(get('cpu', '1')),
    out: get('out', ''),
    chromium: get('chromium', process.env.PW_CHROMIUM_PATH || DEFAULT_CHROMIUM),
    counts,
  };
}

/** Installed before any app script: collects long tasks and event timings into `__perf`. */
function installObservers() {
  const perf = { longTasks: [], events: [] };
  globalThis.__perf = perf;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) perf.longTasks.push({ start: e.startTime, duration: e.duration });
  }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      perf.events.push({ name: e.name, start: e.startTime, duration: e.duration, id: e.interactionId });
    }
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
}

/** In page: resolves when a level-1 heading is in <main> and no skeleton is busy, after paint. */
async function waitForView() {
  const settled = () =>
    document.querySelector('main h1') && !document.querySelector('main [aria-busy="true"]');
  while (!settled()) await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/** In page: clicks the sidebar link and times navigation until the view settles. */
async function navigateAndTime(view) {
  const link = document.querySelector(`nav a[href="#/${view}"]`);
  if (!link) throw new Error(`No nav link for ${view}`);
  const t0 = performance.now();
  const longBefore = globalThis.__perf.longTasks.length;
  link.click();
  const settled = () =>
    location.hash.startsWith(`#/${view}`) &&
    document.querySelector('main h1') &&
    !document.querySelector('main [aria-busy="true"]');
  while (!settled()) await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const tti = performance.now() - t0;
  // Let trailing effects run, then count long tasks since the click.
  await new Promise((r) => setTimeout(r, 300));
  const longTasks = globalThis.__perf.longTasks.slice(longBefore);
  return {
    tti: Math.round(tti),
    longTasks: longTasks.length,
    longTaskMs: Math.round(longTasks.reduce((n, t) => n + t.duration, 0)),
    maxLongTask: Math.round(Math.max(0, ...longTasks.map((t) => t.duration))),
    domNodes: document.querySelectorAll('*').length,
  };
}

/** In page: starts recording requestAnimationFrame timestamps until `__stopFrames()`. */
function startFrames() {
  const frames = [];
  let running = true;
  const tick = (t) => {
    frames.push(t);
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  globalThis.__stopFrames = () => {
    running = false;
    return frames;
  };
}

/** In page: the element that actually scrolls in the current view (largest overflow). */
function markScroller() {
  let best = document.scrollingElement;
  let bestOverflow = best.scrollHeight - best.clientHeight;
  for (const el of document.querySelectorAll('main, main *')) {
    const style = getComputedStyle(el);
    if (!/(auto|scroll)/.test(style.overflowY)) continue;
    const overflow = el.scrollHeight - el.clientHeight;
    if (overflow > bestOverflow) {
      best = el;
      bestOverflow = overflow;
    }
  }
  best.setAttribute('data-perf-scroller', '');
  const r = best.getBoundingClientRect();
  return { overflow: bestOverflow, x: r.left + r.width / 2, y: r.top + Math.min(r.height, 600) / 2 };
}

async function sampleFrames(page, action) {
  await page.evaluate(startFrames);
  await action();
  const frames = await page.evaluate(() => globalThis.__stopFrames());
  return summariseFrames(frames);
}

async function scrollFps(page) {
  const target = await page.evaluate(markScroller);
  if (target.overflow < 200) return { skipped: 'no scrollable content' };
  await page.mouse.move(target.x, target.y);
  const result = await sampleFrames(page, async () => {
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, i < 20 ? 240 : -240);
      await page.waitForTimeout(30);
    }
  });
  await page.evaluate(() => document.querySelector('[data-perf-scroller]')?.removeAttribute('data-perf-scroller'));
  return result;
}

async function drag(page, from, to, button, steps = 60) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(16);
  }
  await page.mouse.up({ button });
}

async function canvasInteractions(page) {
  const box = await page.locator('main canvas[role="application"]').boundingBox();
  if (!box) return { skipped: 'no canvas' };
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const pan = await sampleFrames(page, () =>
    drag(page, centre, { x: centre.x - 400, y: centre.y - 250 }, 'middle'),
  );
  const zoom = await sampleFrames(page, async () => {
    await page.mouse.move(centre.x, centre.y);
    await page.keyboard.down('Control');
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, i < 10 ? -120 : 120);
      await page.waitForTimeout(30);
    }
    await page.keyboard.up('Control');
  });
  // A left-drag from the centre moves a node when one is there, else pans: both redraw the scene.
  const dragLeft = await sampleFrames(page, () =>
    drag(page, centre, { x: centre.x + 250, y: centre.y + 120 }, 'left'),
  );
  return { pan, zoom, dragLeft };
}

async function captureLatency(page) {
  await page.evaluate(() => (globalThis.__perf.events.length = 0));
  const t0 = Date.now();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog').first().waitFor();
  const openMs = Date.now() - t0;
  await page.keyboard.type('Appeler le client demain à 15h #work !2 pour le devis', { delay: 40 });
  await page.waitForTimeout(500);
  const events = await page.evaluate(() => globalThis.__perf.events);
  await page.keyboard.press('Escape');
  return { openMs, ...summariseLatency(events) };
}

async function heapMb(cdp) {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const used = metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0;
  return Math.round((used / 1024 / 1024) * 10) / 10;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch({ executablePath: opts.chromium });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.clock.setFixedTime(FIXED_NOW);
  await page.addInitScript(
    ([key]) => localStorage.setItem(key, JSON.stringify({ onboarded: true })),
    [APP_PREFS_KEY],
  );
  await page.addInitScript(installObservers);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (opts.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.cpu });

  // Clean profile: empty database, then the demo seed, then the large data set on top.
  await page.goto(`${opts.url}/#/today`);
  await page.evaluate(waitForView);
  const report = { url: opts.url, cpuThrottle: opts.cpu, counts: opts.counts, views: {} };
  report.heapEmptyMb = await heapMb(cdp);

  const data = buildDataset(opts.counts, FIXED_NOW.getTime());
  const seeded = await page.evaluate(seedInPage, data);
  report.seedMs = seeded.timings;
  await page.waitForTimeout(3000); // asynchronous IndexedDB persistence

  const bootStart = Date.now();
  await page.reload();
  await page.evaluate(waitForView);
  report.bootWithDataMs = Date.now() - bootStart;
  report.bootLongTasks = await page.evaluate(() =>
    globalThis.__perf.longTasks.map((t) => Math.round(t.duration)),
  );

  for (const view of VIEWS) {
    const nav = await page.evaluate(navigateAndTime, view);
    // Second visit: chunk cached, measures render cost alone.
    await page.evaluate(navigateAndTime, view === 'today' ? 'settings' : 'today');
    const warm = await page.evaluate(navigateAndTime, view);
    const entry = { ...nav, warmTti: warm.tti, warmLongTaskMs: warm.longTaskMs };
    entry.scroll = await scrollFps(page);
    entry.heapMb = await heapMb(cdp);
    report.views[view] = entry;
    console.log(view.padEnd(9), JSON.stringify(entry));
  }

  await page.goto(`${opts.url}/#/canvas?graph=${seeded.graphId}`);
  await page.evaluate(waitForView);
  report.canvas2k = await canvasInteractions(page);
  console.log('canvas2k ', JSON.stringify(report.canvas2k));

  report.capture = {};
  for (const view of CAPTURE_VIEWS) {
    await page.evaluate(navigateAndTime, view);
    report.capture[view] = await captureLatency(page);
    console.log(`capture@${view}`, JSON.stringify(report.capture[view]));
  }

  report.errors = errors;
  if (opts.out) writeFileSync(opts.out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ seedMs: report.seedMs, bootWithDataMs: report.bootWithDataMs, heapEmptyMb: report.heapEmptyMb, errors: errors.slice(0, 5) }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
