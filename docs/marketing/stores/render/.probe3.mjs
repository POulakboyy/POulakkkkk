import { chromium } from 'playwright';
const { APP_PREFS_KEY } = await import('./lib/config.mjs');
const { translator } = await import('./lib/i18n.mjs');
const t = await translator('fr');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const day of ['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06']) for (const hm of ['08:30','12:00']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(([k]) => localStorage.setItem(k, JSON.stringify({ onboarded: true })), [APP_PREFS_KEY]);
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(`${day}T${hm}:00+01:00`) });
  await page.goto('http://localhost:4196/#/today');
  await page.getByRole('main').getByRole('heading', { level: 1 }).first().waitFor();
  await page.waitForTimeout(800);
  const maker = await page.getByText(t('today.maker.title')).count();
  const buffers = await page.getByText(t('today.buffers.label'), { exact: false }).count().catch(() => -1);
  console.log(day, hm, 'maker', maker, 'buffers', buffers);
  await ctx.close();
}
await browser.close();
