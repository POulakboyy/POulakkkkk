import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await browser.newContext({ viewport: { width: 320, height: 640 }, locale: 'fr-FR', reducedMotion: 'reduce' });
await c.addInitScript(() => localStorage.setItem('pouxis:app-prefs:v1', JSON.stringify({ onboarded: true })));
const p = await c.newPage(); await p.goto('http://localhost:4192/#/settings'); await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const out = []; for (const el of document.querySelectorAll('body *')) { const b = el.getBoundingClientRect(); if (b.right > innerWidth + 1 && b.width > 0) out.push([el.tagName, el.className.toString().slice(0,60), Math.round(b.left), Math.round(b.right), (el.textContent||'').slice(0,40)]); } return out.slice(0, 15); });
console.log(r.map(x => x.join(' | ')).join('\n'));
await p.screenshot({ path: '/tmp/claude-0/-home-user-POulakkkkk/ee49bbd1-4c3c-5fee-a27a-55658d38480a/scratchpad/shots/settings-320.png', fullPage: false });
await browser.close();
