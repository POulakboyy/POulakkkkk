// Marketing frame documents: paper background from the design tokens, an eyebrow and a serif
// caption, and the captured screen inside a device frame drawn in CSS (generic shapes only: no
// manufacturer artwork, no trademarked device silhouette or window buttons).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_DIR, TOKENS_CSS } from './config.mjs';

const BRAND = join(REPO_DIR, 'docs/brand/assets');
const assetUrl = (name) => pathToFileURL(join(BRAND, name)).href;

/** Custom properties declared directly in the first `:root {` block of tokens.css. */
export function rootTokens(css = readFileSync(TOKENS_CSS, 'utf8')) {
  const start = css.indexOf(':root {');
  if (start === -1) throw new Error('tokens.css: no :root block');
  const body = css.slice(start + 7, css.indexOf('\n}', start));
  const vars = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
    vars[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  for (const name of [
    '--bg',
    '--bg-elevated',
    '--surface-2',
    '--ink',
    '--ink-3',
    '--accent',
    '--line',
  ]) {
    if (!vars[name]) throw new Error(`tokens.css: ${name} not found`);
  }
  return vars;
}

export const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

const px = (n) => `${Math.round(n * 100) / 100}px`;

function baseCss(tokens, size, transparent) {
  const vars = Object.entries(tokens)
    .filter(([k]) => !k.startsWith('--font'))
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
  return `
  :root { ${vars}
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-serif: 'Bitstream Charter', 'Charter', Georgia, serif; }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${size.w}px; height: ${size.h}px; overflow: hidden; }
  body { position: relative; font-family: var(--font-sans); color: var(--ink);
    background: ${transparent ? 'transparent' : 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg) 46%, var(--surface-2) 100%)'};
    -webkit-font-smoothing: antialiased; }
  .eyebrow { display: flex; align-items: center; gap: 0.55em; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--ink-3); }
  .eyebrow::before { content: ''; width: 0.5em; height: 0.5em; border-radius: 50%; background: var(--accent); }
  .headline { font-family: var(--font-serif); font-weight: 400; line-height: 1.06; letter-spacing: -0.015em;
    color: var(--ink); text-wrap: balance; }
  .device { position: absolute; }
  .screen { position: absolute; overflow: hidden; background: var(--bg); }
  .screen > img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
  .shadow { box-shadow: 0 ${px(size.w * 0.02)} ${px(size.w * 0.07)} rgb(var(--shadow-color) / 0.16),
    0 ${px(size.w * 0.004)} ${px(size.w * 0.012)} rgb(var(--shadow-color) / 0.10); }`;
}

/* ------------------------------------------------------------------------------------------ */
/* Device frames                                                                               */
/* ------------------------------------------------------------------------------------------ */

function statusIcons(h) {
  const s = h;
  return `<svg width="${px(s * 3.6)}" height="${px(s)}" viewBox="0 0 72 20" fill="currentColor" aria-hidden="true">
    <rect x="0" y="12" width="3.6" height="6" rx="1"/><rect x="5.4" y="9" width="3.6" height="9" rx="1"/>
    <rect x="10.8" y="5.5" width="3.6" height="12.5" rx="1"/><rect x="16.2" y="2" width="3.6" height="16" rx="1"/>
    <path d="M33 18.2l-2.6-3a3.6 3.6 0 0 1 5.2 0zM27.3 11.9l1.7 1.9a5.9 5.9 0 0 1 8 0l1.7-1.9a8.5 8.5 0 0 0-11.4 0zM24.2 8.5l1.7 1.9a10.4 10.4 0 0 1 14.2 0l1.7-1.9a13 13 0 0 0-17.6 0z"/>
    <rect x="47" y="3" width="21" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.45"/>
    <rect x="49.2" y="5.2" width="16.6" height="9.6" rx="2.2"/><rect x="69.2" y="7.6" width="1.8" height="4.8" rx="0.9" opacity="0.45"/>
  </svg>`;
}

function phoneFrame(geo, device, img, clock) {
  const { box, screen, scale } = geo;
  const inner = device.radius - device.bezel;
  const bar = device.safe.top * scale;
  const font = 17 * scale;
  const pill =
    device.kind === 'phone'
      ? `<div style="position:absolute;left:50%;top:${px(11 * scale)};width:${px(120 * scale)};height:${px(34 * scale)};transform:translateX(-50%);border-radius:${px(17 * scale)};background:#1c1b18"></div>`
      : '';
  const home = `<div style="position:absolute;left:50%;bottom:${px(8 * scale)};width:${px((device.kind === 'phone' ? 140 : 320) * scale)};height:${px(5 * scale)};transform:translateX(-50%);border-radius:99px;background:var(--ink);opacity:.85"></div>`;
  const time = device.kind === 'phone' ? clock.time : `${clock.time}  ${clock.date}`;
  const timeX = device.kind === 'phone' ? 50 * scale : 22 * scale;
  return `<div class="device shadow" style="left:${px(box.x)};top:${px(box.y)};width:${px(box.w)};height:${px(box.h)};border-radius:${px(device.radius)};background:#1c1b18;box-shadow:inset 0 0 0 ${px(3)} #3b3934, 0 40px 120px rgb(28 27 24 / .2), 0 10px 30px rgb(28 27 24 / .12)">
    <div class="screen" style="left:${px(screen.x)};top:${px(screen.y)};width:${px(screen.w)};height:${px(screen.h)};border-radius:${px(inner)}">
      <img src="${img}" alt="">
      <div style="position:absolute;inset:0 0 auto 0;height:${px(bar)};background:var(--bg);display:flex;align-items:center;justify-content:space-between;padding:0 ${px(timeX)};font:600 ${px(font * (device.kind === 'phone' ? 1 : 0.8))}/1 var(--font-sans);color:var(--ink);white-space:pre">
        <span>${esc(time)}</span>${statusIcons(font * (device.kind === 'phone' ? 0.72 : 0.62))}
      </div>
      ${pill}${home}
    </div>
  </div>`;
}

function windowFrame(geo, device, img, { lang }) {
  const { box, screen, titlebar, scale } = geo;
  const r = device.radius * scale;
  let bar = '';
  if (titlebar > 0) {
    const dot = 12 * scale;
    const title = `<span style="font:600 ${px(13 * scale)}/1 var(--font-sans);color:var(--ink-2)">POuxis</span>`;
    bar =
      device.style === 'mac'
        ? `<div style="position:absolute;inset:0 0 auto 0;height:${px(titlebar)};display:flex;align-items:center;gap:${px(8 * scale)};padding:0 ${px(14 * scale)};background:var(--bg-elevated);border-bottom:1px solid var(--line)">
            ${'<i style="display:block;width:DOT;height:DOT;border-radius:50%;background:var(--line-strong)"></i>'.replaceAll('DOT', px(dot)).repeat(3)}
            <span style="position:absolute;left:50%;transform:translateX(-50%)">${title}</span></div>`
        : `<div style="position:absolute;inset:0 0 auto 0;height:${px(titlebar)};display:flex;align-items:center;gap:${px(10 * scale)};padding-left:${px(12 * scale)};background:var(--bg-elevated);border-bottom:1px solid var(--line)">
            <img src="${assetUrl('symbol-small.svg')}" alt="" style="width:${px(16 * scale)};height:${px(16 * scale)}">${title}
            <span style="margin-left:auto;display:flex;height:100%">${winButtons(scale)}</span></div>`;
  }
  return `<div class="device shadow" style="left:${px(box.x)};top:${px(box.y)};width:${px(box.w)};height:${px(box.h)};border-radius:${px(r)};overflow:hidden;background:var(--bg);outline:1px solid rgb(28 27 24 / .10)" lang="${lang}">
    ${bar}
    <div class="screen" style="left:${px(screen.x)};top:${px(screen.y)};width:${px(screen.w)};height:${px(screen.h)}"><img src="${img}" alt=""></div>
  </div>`;
}

/** Minimise, maximise, close: plain strokes, as on any desktop toolkit. */
function winButtons(scale) {
  const w = px(46 * scale);
  const stroke = `stroke="currentColor" stroke-width="1" fill="none"`;
  const glyph = (d) =>
    `<span style="width:${w};display:grid;place-items:center;color:var(--ink-2)"><svg width="${px(10 * scale)}" height="${px(10 * scale)}" viewBox="0 0 10 10" ${stroke}>${d}</svg></span>`;
  return (
    glyph('<path d="M0 5.5h10"/>') +
    glyph('<rect x=".5" y=".5" width="9" height="9"/>') +
    glyph('<path d="M0 0l10 10M10 0L0 10"/>')
  );
}

function cardFrame(geo, device, img) {
  const { box } = geo;
  return `<div class="device shadow" style="left:${px(box.x)};top:${px(box.y)};width:${px(box.w)};height:${px(box.h)};border-radius:${px(device.radius)};overflow:hidden;outline:1px solid rgb(28 27 24 / .08)">
    <div class="screen" style="inset:0"><img src="${img}" alt=""></div>
  </div>`;
}

/**
 * A neutral document window (grey placeholder lines, no identifiable app) with the capture
 * window floating above it: "capture from any app".
 */
function floatingFrame(geo, device, img, imgSize) {
  const { box, scale } = geo;
  const lines = Array.from({ length: 9 }, (_, i) => {
    const w = [62, 88, 80, 92, 54, 0, 86, 74, 40][i];
    return w === 0
      ? `<div style="height:${px(28 * scale)}"></div>`
      : `<div style="height:${px(10 * scale)};width:${w}%;border-radius:99px;background:var(--surface-3);margin-bottom:${px(18 * scale)}"></div>`;
  }).join('');
  const backdrop = `<div class="device shadow" style="left:${px(box.x)};top:${px(box.y + 70 * scale)};width:${px(box.w * 0.9)};height:${px(box.h - 70 * scale)};border-radius:${px(device.radius * scale)};background:var(--surface);overflow:hidden;outline:1px solid rgb(28 27 24 / .08)">
      <div style="height:${px(device.titlebar * scale)};background:var(--bg-elevated);border-bottom:1px solid var(--line)"></div>
      <div style="padding:${px(56 * scale)} ${px(72 * scale)}">
        <div style="height:${px(22 * scale)};width:38%;border-radius:99px;background:var(--line-strong);margin-bottom:${px(40 * scale)}"></div>${lines}
      </div></div>`;
  const w = Math.min(box.w * 0.78, imgSize.w * scale);
  const h = (imgSize.h / imgSize.w) * w;
  const capture = `<div class="device" style="left:${px(box.x + (box.w - w) / 2 + box.w * 0.05)};top:${px(box.y + box.h * 0.2)};width:${px(w)};height:${px(h)};border-radius:${px(16 * scale)};overflow:hidden;box-shadow:0 30px 90px rgb(28 27 24 / .28), 0 8px 24px rgb(28 27 24 / .14);outline:1px solid rgb(28 27 24 / .10)">
      <img src="${img}" alt="" style="display:block;width:100%;height:100%"></div>`;
  return backdrop + capture;
}

/** Device markup for `geo` (from formats.deviceGeometry), placed at `origin`. */
export function deviceMarkup({ device, geo, img, imgSize, clock, lang, options = {} }) {
  if (options.composition === 'floating') return floatingFrame(geo, device, img, imgSize);
  if (device.kind === 'phone' || device.kind === 'tablet')
    return phoneFrame(geo, device, img, clock);
  if (device.kind === 'window') return windowFrame(geo, device, img, { lang });
  return cardFrame(geo, device, img);
}

/* ------------------------------------------------------------------------------------------ */
/* Documents                                                                                   */
/* ------------------------------------------------------------------------------------------ */

function captionMarkup(format, { eyebrow, caption }) {
  const c = format.caption;
  const block = `<div class="eyebrow" style="font-size:${px(c.eyebrow)}">${esc(eyebrow)}</div>
    <h1 class="headline" style="font-size:${px(c.size)};margin-top:${px(c.eyebrow * 0.7)}">${esc(caption)}</h1>`;
  if (format.layout === 'landscape') {
    return `<div style="position:absolute;left:${px(c.x)};top:0;bottom:0;width:${px(c.w)};display:flex;flex-direction:column;justify-content:center">${block}</div>`;
  }
  return `<div style="position:absolute;left:${px(c.x)};top:${px(c.y)};width:${px(c.w)};text-align:center;display:flex;flex-direction:column;align-items:center">${block}</div>`;
}

/** Full store frame document. */
export function frameHtml({
  format,
  tokens,
  lang,
  eyebrow,
  caption,
  device,
  geo,
  img,
  imgSize,
  clock,
  options,
}) {
  const r = format.region;
  const shifted = { ...geo, box: { ...geo.box, x: geo.box.x + r.x, y: geo.box.y + r.y } };
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${baseCss(tokens, format.size, false)}</style></head>
  <body>${captionMarkup(format, { eyebrow, caption })}
  ${deviceMarkup({ device, geo: shifted, img, imgSize, clock, lang, options })}</body></html>`;
}

/** Device alone on a transparent page with room for its shadow (landing-page heroes). */
export function heroHtml({ tokens, lang, device, geo, img, imgSize, clock, pad }) {
  const size = { w: geo.box.w + 2 * pad, h: geo.box.h + 2 * pad };
  const shifted = { ...geo, box: { ...geo.box, x: pad, y: pad } };
  return {
    size,
    html: `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${baseCss(tokens, size, true)}</style></head>
    <body>${deviceMarkup({ device, geo: shifted, img, imgSize, clock, lang })}</body></html>`,
  };
}

/** Google Play feature graphic (1024 × 500): lockup and caption left, Today crop right. */
export function featureHtml({ spec, tokens, lang, caption, geo, img }) {
  const r = spec.region;
  const shifted = { ...geo, box: { ...geo.box, x: r.x, y: r.y } };
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${baseCss(tokens, spec.size, false)}</style></head>
  <body>
    <div style="position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center;gap:28px">
      <img src="${assetUrl('lockup-horizontal.svg')}" alt="POuxis" style="height:52px;width:auto;align-self:flex-start">
      <h1 class="headline" style="font-size:54px">${esc(caption)}</h1>
    </div>
    ${cardFrame(shifted, spec.device, img)}
  </body></html>`;
}
