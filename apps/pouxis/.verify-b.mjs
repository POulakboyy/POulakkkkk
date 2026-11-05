import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-POulakkkkk/ee49bbd1-4c3c-5fee-a27a-55658d38480a/scratchpad/shots';
const B = 'http://localhost:4192/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function ctx(w, h, scheme, onboarded = true) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: scheme, reducedMotion: 'reduce' });
  if (onboarded) await c.addInitScript(() => { if (!localStorage.getItem('pouxis:app-prefs:v1')) localStorage.setItem('pouxis:app-prefs:v1', JSON.stringify({ onboarded: true })); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs; return p;
}
// Onboarding phone
let p = await ctx(390, 844, 'dark', false);
await p.goto(B); await p.waitForTimeout(1500);
for (let i = 0; i < 3; i++) {
  await p.screenshot({ path: `${OUT}/onb-${i}.png` });
  const btn = p.getByRole('button', { name: /Continuer|Suivant|Commencer/ }).last();
  if (await btn.count()) await btn.click(); await p.waitForTimeout(400);
}
await p.screenshot({ path: `${OUT}/onb-3.png` });
const open = p.getByRole('button', { name: /Ouvrir ma journée/ });
console.log('open btn in viewport:', await open.count() ? await open.evaluate(e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; }) : 'missing');
console.log('onb errs', p.errs);
// Reflow 320
p = await ctx(320, 640, 'light', false); await p.goto(B); await p.waitForTimeout(1200);
console.log('onb 320 overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
for (const v of ['canvas', 'ideas', 'insights', 'settings']) {
  p = await ctx(320, 640, 'light'); await p.goto(B + '#/' + v); await p.waitForTimeout(1500);
  console.log(v, '320 overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), p.errs);
}
// Canvas keyboard
p = await ctx(1440, 900, 'light'); await p.goto(B + '#/canvas'); await p.waitForTimeout(2000);
const app = p.locator('[role="application"]').first();
await app.focus(); await p.waitForTimeout(300);
for (const k of ['ArrowRight', 'ArrowDown', 'ArrowDown']) { await p.keyboard.press(k); await p.waitForTimeout(200);
  console.log(k, '->', await p.locator('p[aria-live="polite"]').first().textContent()); }
await p.keyboard.press('Escape'); await p.keyboard.press('Tab');
console.log('after Esc+Tab focus:', await p.evaluate(() => document.activeElement?.getAttribute('role') + ' ' + document.activeElement?.tagName + ' ' + (document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.slice(0,30))));
await p.screenshot({ path: `${OUT}/canvas.png` });
// Settings aria-current
p = await ctx(1440, 900, 'dark'); await p.goto(B + '#/settings'); await p.waitForTimeout(1500);
console.log('settings current', await p.locator('nav a[aria-current]').allTextContents());
await p.mouse.wheel(0, 2500); await p.waitForTimeout(600);
console.log('settings current after scroll', await p.locator('nav a[aria-current]').allTextContents());
await p.screenshot({ path: `${OUT}/settings.png` });
// Insights
for (const [w,h,sc] of [[1440,900,'dark'],[390,844,'light']]) { p = await ctx(w,h,sc); await p.goto(B + '#/insights'); await p.waitForTimeout(2000); await p.screenshot({ path: `${OUT}/insights-${w}-${sc}.png`, fullPage: true }); console.log('insights errs', p.errs); }
await browser.close();
