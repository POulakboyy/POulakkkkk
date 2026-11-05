import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = '/home/user/POulakkkkk/docs/marketing/stores/render/lib/';
const { captureScene } = await import(base + 'capture.mjs');
const { SCENES } = await import(base + 'scenes.mjs');
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const [w, h, scale, touch, lang] = process.argv.slice(3);
const only = process.argv[8]?.split(',');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const id of Object.keys(SCENES)) {
  if (only && !only.includes(id)) continue;
  try {
    const png = await captureScene(browser, { sceneId: id, lang, device: { viewport: { width: +w, height: +h }, scale: +scale, touch: touch === '1', safe: touch==='1' ? {top:54,bottom:34} : {top:0,bottom:0} } });
    writeFileSync(`${out}/${id}.png`, png); console.log('ok', id);
  } catch (e) { console.log('FAIL', id, e.message.split('\n')[0]); }
}
await browser.close();
