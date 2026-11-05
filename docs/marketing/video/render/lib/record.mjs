// Films one scene of the real app with Playwright: builds the stage, plays the scripted actions
// on the shotlist timing and captures every composited frame through the Chrome DevTools
// screencast (real CSS motion, no frame-by-frame faking). Frames are written with their
// timestamps; plan.frameList() later turns them into constant-frame-rate clips.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_PREFS_KEY, APP_URL } from './config.mjs';
import { directionFor, portableKey } from './directions.mjs';
import { resolveHook } from './hooks.mjs';
import { stageHtml } from './stage.mjs';
import { timeShimSource } from './timeshim.mjs';

const STAGE_PATH = '__video/stage.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

/** Paris wall-clock "YYYY-MM-DDTHH:mm:ss" → Date (the fixture zone is fixed to UTC+1 in November). */
export function parisTime(local) {
  return new Date(`${local}+01:00`);
}

/** Slow-motion factor of the capture (see timeshim.mjs). */
export const SLOW = Number(process.env.VIDEO_SLOW || 3);

/** Every document gets the virtual clock, the app prefs and the render fonts (brief §10.3). */
async function prepareContext(context, { theme, clock }) {
  await context.addInitScript({ content: timeShimSource(parisTime(clock).getTime()) });
  await context.addInitScript(
    ([key, prefs]) => {
      if (location.pathname.startsWith('/__video/')) return;
      if (!sessionStorage.getItem('video:init')) {
        sessionStorage.setItem('video:init', '1');
        localStorage.setItem(key, prefs);
      }
      // Linux has no SF Pro / New York: Inter and Bitstream Charter stand in (both installed).
      const style = document.createElement('style');
      style.textContent =
        ":root:root:root { --font-sans: 'Inter', system-ui, sans-serif; --font-serif: 'Bitstream Charter', 'Charter', Georgia, serif; }";
      document.addEventListener('DOMContentLoaded', () => document.head.append(style));
    },
    [APP_PREFS_KEY, JSON.stringify({ onboarded: true, theme })],
  );
}

function paneFrames(page, count) {
  return Array.from({ length: count }, (_, i) => {
    const frame = page.frame({ name: `pane-${i}` });
    if (!frame) throw new Error(`stage: iframe pane-${i} missing`);
    return frame;
  });
}

async function waitForApp(frame) {
  await frame.getByRole('main').getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 });
}

/** Centre of `loc` in its frame's viewport, for the tap halo. */
async function centreOf(loc) {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
}

/**
 * Scrolls the nearest scrollable ancestor of `loc` (or the document) by `dy` over `ms` of virtual
 * time with the standard easing, driven by requestAnimationFrame so slow motion applies to it.
 */
async function smoothScroll(loc, dy, ms) {
  await loc.evaluate((el, [delta, duration]) => {
    let node = el;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) break;
      node = node.parentElement;
    }
    const target = node && node !== document.body ? node : document.scrollingElement;
    const from = target.scrollTop;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      target.scrollTop = from + delta * ease(t);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [dy, ms]);
}

/**
 * Runs one action (shotlist schema, plus setup-only `clickRole` and `reveal`). `pane` carries
 * the frame, its stage name and whether taps get a halo.
 */
async function runAction(page, pane, action, usage) {
  const { frame } = pane;
  const target = () => resolveHook(frame, action.selector, usage);
  switch (action.type) {
    case 'wait':
      return sleep((action.durationMs ?? 0) * pane.slow);
    case 'click': {
      const loc = await target();
      if (pane.halo) {
        const { x, y } = await centreOf(loc);
        await page.evaluate(([n, px, py]) => window.__stage.halo(n, px, py), [pane.name, x, y]);
      }
      return loc.click({ noWaitAfter: true });
    }
    case 'clickRole':
      return frame.getByRole('main').getByRole(action.role, { name: action.name }).first().click();
    case 'type': {
      const loc = await target();
      const text = action.text[pane.lang] ?? action.text.fr;
      const sceneDelay = (action.durationMs ?? text.length * 60) / text.length;
      const delay = Math.max(15, Math.floor(sceneDelay * pane.slow));
      return loc.pressSequentially(text, { delay });
    }
    case 'press': {
      const key = portableKey(action.key);
      if (action.selector) return (await target()).press(key);
      return page.keyboard.press(key);
    }
    case 'scroll': {
      const loc = await target();
      if ((await loc.getAttribute('role')) === 'application') {
        // The canvas zooms with + / − (animated by the app itself).
        await loc.focus();
        const steps = Math.max(1, Math.round(Math.abs(action.deltaY) / 200));
        for (let i = 0; i < steps; i += 1) {
          await page.keyboard.press(action.deltaY < 0 ? '+' : '-');
          await sleep(450 * pane.slow);
        }
        return undefined;
      }
      return smoothScroll(loc, action.deltaY, action.durationMs ?? 700);
    }
    case 'reveal': {
      const loc = await target();
      return loc.evaluate((el, offset) => {
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
        document.scrollingElement.scrollBy({ top: -(innerHeight - offset), behavior: 'instant' });
      }, action.offset ?? 0);
    }
    default:
      throw new Error(`unknown action type ${action.type}`);
  }
}

/** Starts the CDP screencast; frames are written to `dir` as they arrive. */
async function startScreencast(page, dir, out) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, wall: metadata.timestamp * 1000 });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: out.width,
    maxHeight: out.height,
    everyNthFrame: 1,
  });
  return {
    frames,
    async stop() {
      await cdp.send('Page.stopScreencast').catch(() => {});
      await cdp.detach().catch(() => {});
    },
  };
}

/**
 * Records `scene` for format geometry `geo`, covering scene time [−leadMs, untilMs].
 * Returns frames as [{ file, t }] with t in scene ms, plus hook usage.
 */
export async function recordScene(browser, job) {
  const { scene, geo, devices, tokens, lang, window: win, dir, captionStyle, timing, store } = job;
  const dir0 = direction(scene);
  const slow = job.slow ?? SLOW;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const isMobileScene = ['iphone', 'android'].includes(scene.device) || (scene.device === 'none' && geo.css.height > geo.css.width);
  const context = await browser.newContext({
    viewport: geo.css,
    deviceScaleFactor: geo.dsf,
    locale: lang === 'fr' ? 'fr-FR' : 'en-GB',
    timezoneId: 'Europe/Paris',
    hasTouch: isMobileScene,
    acceptDownloads: true,
    colorScheme: scene.theme === 'dark' ? 'dark' : 'light',
    reducedMotion: 'no-preference',
  });
  const usage = new Map();
  try {
    await prepareContext(context, { theme: scene.theme === 'dark' ? 'dark' : 'light', clock: dir0.clock ?? job.clock });
    const effective = dir0.route ? { ...scene, route: dir0.route } : scene;
    const html = stageHtml({
      scene: effective,
      frame: geo.css,
      devices,
      tokens,
      lang,
      appUrl: APP_URL,
      captionStyle,
      captionText: scene.caption?.[lang] ?? '',
      timing,
      disclaimer: dir0.disclaimer ? job.disclaimer : '',
      endcard: job.endcard,
    });
    await context.route(`${APP_URL}${STAGE_PATH}`, (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${APP_URL}${STAGE_PATH}`);
    const panes = await setupPanes(page, effective, { lang, halo: !store, usage, setup: dir0.setup });
    if (effective.setup?.offline) await context.setOffline(true);
    await page.evaluate(() => document.fonts.ready);
    await sleep(700);

    await setRate(page, 1 / slow);
    const cast = await startScreencast(page, dir, geo.out);
    await sleep((win.leadMs + 400) * slow);
    const t0 = Date.now();
    await page.evaluate(() => window.__stage.start());
    const actions = paneActions(effective, panes, dir0);
    await Promise.all(
      actions.map(async ({ pane, list }) => {
        for (const action of list) {
          await sleep(t0 + action.at * slow - Date.now());
          await runAction(page, { ...pane, slow: slow }, action, usage);
        }
      }),
    );
    await sleep(t0 + (win.untilMs + 250) * slow - Date.now());
    await cast.stop();
    if (errors.length) throw new Error(`${scene.id}: page errors: ${errors.join(' | ')}`);
    const frames = cast.frames
      .map((f) => ({ file: f.file, t: (f.wall - t0) / slow }))
      .sort((a, b) => a.t - b.t);
    return { frames, usage };
  } finally {
    await context.close();
  }
}

/** Slows JS time in every frame and CSS time in the whole page tree, together. */
async function setRate(page, rate) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await Promise.all(page.frames().map((f) => f.evaluate((r) => window.__videoSetRate?.(r), rate)));
  await cdp.send('Animation.setPlaybackRate', { playbackRate: rate });
}

function direction(scene) {
  return directionFor(scene.id);
}

/** Waits for every app iframe, applies per-pane themes and runs the direction's setup. */
async function setupPanes(page, scene, { lang, halo, usage, setup }) {
  const count = scene.kind === 'composite' ? scene.composite.panes.length : scene.kind === 'ui' ? 1 : 0;
  const frames = paneFrames(page, count);
  const panes = frames.map((frame, i) => ({ frame, name: `pane-${i}`, lang, halo }));
  for (const [i, pane] of panes.entries()) {
    await waitForApp(pane.frame);
    const theme = scene.kind === 'composite' ? scene.composite.panes[i].theme : scene.theme;
    await pane.frame.evaluate((t) => {
      document.documentElement.dataset.theme = t;
    }, theme);
  }
  if (panes[0]) {
    // Keyboard shortcuts go to the focused document: give it to the (first) app frame.
    await page.evaluate(() => document.querySelector('iframe')?.focus());
    for (const action of setup ?? []) {
      await runAction(page, { ...panes[0], halo: false, slow: 1 }, action, usage);
    }
  }
  return panes;
}

function paneActions(scene, panes, dir) {
  if (scene.kind === 'composite') {
    return scene.composite.panes.map((p, i) => ({ pane: panes[i], list: sortActions(p.actions) }));
  }
  if (!panes[0]) return [];
  const list = dir.actions ? dir.actions(scene.actions) : scene.actions;
  return [{ pane: panes[0], list: sortActions(list) }];
}

const sortActions = (list) => [...list].sort((a, b) => a.at - b.at);
