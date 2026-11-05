// Captures one scene of the real app (dev server, demo seed) at a device's logical viewport.
// Each capture gets a fresh browser context, so every frame starts from the same seeded week.
import { APP_PREFS_KEY, APP_URL, DEMO_ZONE, demoTime } from './config.mjs';
import { scene as sceneById } from './scenes.mjs';
import { translationPatch } from './seed-en.mjs';
import { translator } from './i18n.mjs';

/**
 * Fonts and safe areas injected before the app's scripts. Linux has no SF Pro / New York: Inter
 * and Bitstream Charter stand in (the token stacks end on the same families of shapes). Safe-area
 * insets are what the native shell reports on the device, so the app lays out exactly as there.
 */
function initScript({ key, prefs, safe }) {
  if (!sessionStorage.getItem('shots:init')) {
    sessionStorage.setItem('shots:init', '1');
    localStorage.setItem(key, prefs);
  }
  const style = document.createElement('style');
  style.textContent = `:root:root:root {
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-serif: 'Bitstream Charter', 'Charter', Georgia, serif;
    --safe-top: ${safe.top}px; --safe-bottom: ${safe.bottom}px;
  }
  *, *::before, *::after { caret-color: transparent !important; }
  /* The skip link's off-screen offset ignores --safe-top, so it peeks out under a notch
     (reported to the shell owner); hide it while it is not focused. */
  a[href="#main"]:not(:focus-visible) { visibility: hidden !important; }`;
  document.addEventListener('DOMContentLoaded', () => document.head.append(style));
}

async function waitForApp(page, bare) {
  if (bare) await page.locator('#root *').first().waitFor({ timeout: 20_000 });
  else await page.getByRole('main').getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Switches the UI to English and rewrites the seeded records with their English mirror. */
async function switchToEnglish(page) {
  const records = await page.evaluate(() => {
    const store = globalThis.__pouxis?.store;
    if (!store) throw new Error('store handle missing: start Vite with VITE_POUXIS_PERF=1');
    const names = ['tasks', 'events', 'notes', 'journal', 'graphs'];
    return names.flatMap((name) => store.all(name).map((record) => ({ name, record })));
  });
  const patches = records
    .map(({ name, record }) => ({ name, id: record.id, patch: translationPatch(record) }))
    .filter((p) => p.patch);
  await page.evaluate((list) => {
    const store = globalThis.__pouxis.store;
    store.batch(() => {
      for (const { name, id, patch } of list) store.update(name, id, patch);
    }, 'shots:en');
    store.setPrefs({ locale: 'en' });
  }, patches);
}

/**
 * Screenshot of `sceneId` → PNG buffer. `device` = { viewport: {width, height}, scale, touch,
 * safe: {top, bottom} }; `lang` = 'fr' | 'en'; `theme` = 'light' | 'dark'.
 */
export async function captureScene(browser, { sceneId, device, lang, theme = 'light', userAgent }) {
  const scene = sceneById(sceneId);
  const t = await translator(lang);
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.scale,
    isMobile: Boolean(device.touch),
    hasTouch: Boolean(device.touch),
    locale: lang === 'fr' ? 'fr-FR' : 'en-GB',
    timezoneId: DEMO_ZONE,
    colorScheme: theme,
    reducedMotion: 'reduce',
    ...(userAgent ? { userAgent } : {}),
  });
  try {
    await context.addInitScript(initScript, {
      key: APP_PREFS_KEY,
      prefs: JSON.stringify({ onboarded: true, theme: scene.theme ?? theme }),
      safe: device.safe ?? { top: 0, bottom: 0 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install({ time: demoTime(scene.clock, scene.day) });
    // Boot on the home view so the seed and the language switch happen before the scene route.
    await page.goto(`${APP_URL}#/today`);
    await waitForApp(page, false);
    if (lang === 'en') await switchToEnglish(page);
    await page.evaluate((hash) => (location.hash = hash), scene.route);
    if (scene.route === '#/capture') await page.reload();
    await waitForApp(page, Boolean(scene.bare));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    if (scene.run) await scene.run(page, { t, lang });
    await page.mouse.move(-10, -10);
    // Route changes focus the skip link; a screenshot shows the app at rest, not mid-tab.
    await page.evaluate(() => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && !el.closest('[role="dialog"]')) el.blur();
    });
    await page.waitForTimeout(350);
    if (errors.length > 0) throw new Error(`scene ${sceneId}: page errors: ${errors.join(' | ')}`);
    if (scene.element) return await page.locator(scene.element).first().screenshot({ type: 'png' });
    return await page.screenshot({ type: 'png' });
  } finally {
    await context.close();
  }
}
