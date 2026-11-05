import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 1, timezoneId: 'Europe/Paris', locale: 'fr-FR', hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { localStorage.setItem('pouxis:app-prefs:v1', JSON.stringify({ onboarded: true, theme: 'light' })); });
const page = await ctx.newPage();
await page.clock.setFixedTime(new Date('2026-11-05T10:20:00+01:00'));
page.on('pageerror', (e) => console.log('ERR', e.message));
for (const v of ['today','tasks','calendar','canvas','ideas','insights','settings']) {
  await page.goto(`http://localhost:4196/#/${v}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${v}.png` });
}
console.log(await page.evaluate(() => typeof globalThis.__pouxis));
await browser.close();
