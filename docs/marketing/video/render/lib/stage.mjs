// Builds the HTML "stage" a scene is filmed on: brand-token background, generic device frames
// drawn in CSS (no manufacturer artwork), the app in same-origin iframes, the camera, captions and
// title cards. Pure string building: no browser APIs here, so it is unit-tested.
import { cssVars } from './tokens.mjs';

/**
 * Generic device frames, sized in CSS px around the shotlist viewports. `top`/`bottom` are system
 * bars drawn by the frame (the app gets the remaining height, like a real safe area).
 */
export const FRAMES = {
  iphone: {
    bezel: 14,
    radius: 64,
    screenRadius: 50,
    top: 54,
    bottom: 0,
    kind: 'phone',
    cutout: 'island',
  },
  android: {
    bezel: 12,
    radius: 46,
    screenRadius: 36,
    top: 36,
    bottom: 0,
    kind: 'phone',
    cutout: 'hole',
  },
  macbook: {
    bezel: 18,
    radius: 22,
    screenRadius: 8,
    top: 32,
    bottom: 0,
    kind: 'laptop',
    cutout: 'notch',
  },
  'windows-laptop': {
    bezel: 12,
    radius: 14,
    screenRadius: 4,
    top: 0,
    bottom: 40,
    kind: 'laptop',
    cutout: 'none',
  },
};

/** Share of the frame height the device screen fills at camera scale 1 (shotlist convention). */
export const SCREEN_FILL = 0.8;

const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * World transform that holds screen point (x, y) (0–1) at the frame centre at camera scale `s`.
 * `box` is the screen rectangle in world px; `k` the world px per screen px at scale 1.
 */
export function cameraTransform({ x, y, scale }, { width, height }, box, k) {
  const px = box.left + x * box.width;
  const py = box.top + y * box.height;
  const z = (scale * k).toFixed(5);
  return `translate(${width / 2}px, ${height / 2}px) scale(${z}) translate(${(-px).toFixed(2)}px, ${(-py).toFixed(2)}px)`;
}

/** Outer size of a framed device, and where its screen sits inside it. */
export function deviceBox(device, viewport) {
  const f = FRAMES[device];
  if (!f) throw new Error(`unknown device frame: ${device}`);
  const base = f.kind === 'laptop' ? Math.round(viewport.height * 0.035) : 0;
  return {
    width: viewport.width + 2 * f.bezel,
    height: viewport.height + 2 * f.bezel + base,
    screen: { left: f.bezel, top: f.bezel, width: viewport.width, height: viewport.height },
    base,
  };
}

function statusBar(device, f, lang) {
  if (f.top === 0) return '';
  const time = '<span class="sb-time">09:41</span>';
  const icons =
    '<span class="sb-icons"><i class="sig"><b></b><b></b><b></b><b></b></i><i class="bat"><b></b></i></span>';
  if (device === 'macbook') {
    const menu = lang === 'fr' ? 'jeu. 5 nov. 09:41' : 'Thu 5 Nov 09:41';
    return `<div class="sb sb-desktop" style="height:${f.top}px"><span class="sb-dot"></span><span class="sb-menu">${menu}</span></div>`;
  }
  return `<div class="sb sb-${device}" style="height:${f.top}px">${time}${icons}</div>`;
}

function cutout(f) {
  if (f.cutout === 'island') return '<div class="island"></div>';
  if (f.cutout === 'hole') return '<div class="hole"></div>';
  if (f.cutout === 'notch') return '<div class="notch"></div>';
  return '';
}

/** One framed device with its app iframe. `x`/`y` place it in world px. */
export function deviceHtml({ device, viewport, src, name, theme, x, y, scale = 1, lang, colors }) {
  const f = FRAMES[device];
  const box = deviceBox(device, viewport);
  const appH = viewport.height - f.top - f.bottom;
  const taskbar =
    f.bottom > 0
      ? `<div class="taskbar" style="height:${f.bottom}px"><span></span><span></span><span></span><em>09:41</em></div>`
      : '';
  const home = f.kind === 'phone' ? '<div class="home"></div>' : '';
  return `<div class="device ${f.kind} ${device}" data-theme="${theme}" style="--app-bg:${colors.bg};--app-ink:${colors.ink};left:${x}px;top:${y}px;width:${box.width}px;height:${box.height}px;transform:scale(${scale});border-radius:${f.radius}px">
  <div class="screen" style="left:${f.bezel}px;top:${f.bezel}px;width:${viewport.width}px;height:${viewport.height}px;border-radius:${f.screenRadius}px">
    ${statusBar(device, f, lang)}
    <iframe name="${name}" src="${esc(src)}" style="top:${f.top}px;width:${viewport.width}px;height:${appH}px" scrolling="no"></iframe>
    ${taskbar}${home}${cutout(f)}
    <div class="halo-layer" data-pane="${name}" style="top:${f.top}px"></div>
  </div>
  ${box.base ? `<div class="base" style="height:${box.base}px"></div>` : ''}
</div>`;
}

/**
 * Lays out the scene's devices in world px (frame size at scale 1) and returns the screen box
 * the camera refers to, with its px-per-screen-px factor `k`.
 */
export function layout(scene, frame, devices) {
  if (scene.kind === 'composite') {
    const panes = scene.composite.panes;
    const cellW = frame.width / 2;
    const cellH = frame.height / 2;
    const placed = panes.map((p, i) => {
      const box = deviceBox(p.device, devices[p.device].viewport);
      const s = Math.min((cellW * 0.86) / box.width, (cellH * 0.86) / box.height);
      const cx = (i % 2) * cellW + cellW / 2;
      const cy = Math.floor(i / 2) * cellH + cellH / 2;
      return {
        ...p,
        viewport: devices[p.device].viewport,
        scale: s,
        x: cx - (box.width * s) / 2,
        y: cy - (box.height * s) / 2,
      };
    });
    return { placed, box: { left: 0, top: 0, width: frame.width, height: frame.height }, k: 1 };
  }
  if (scene.device === 'none' || scene.kind !== 'ui') {
    return { placed: [], box: { left: 0, top: 0, width: frame.width, height: frame.height }, k: 1 };
  }
  const viewport = devices[scene.device].viewport;
  const box = deviceBox(scene.device, viewport);
  const k = (frame.height * SCREEN_FILL) / viewport.height;
  // Placed at the world origin; the camera transform positions it.
  return {
    placed: [
      {
        device: scene.device,
        route: scene.route,
        theme: scene.theme,
        viewport,
        x: 0,
        y: 0,
        scale: 1,
      },
    ],
    box: { ...box.screen },
    k,
  };
}

/** Caption placement by format style; sizes follow the brief (≥ 4.5 % / 7 % of frame height). */
function captionHtml(text, style, frame) {
  if (!text) return '';
  const size = Math.round(frame.height * (style === 'card' ? 0.07 : 0.046));
  return `<div class="caption cap-${style}" style="font-size:${size}px">${esc(text)}</div>`;
}

const BASE_CSS = `
* { box-sizing: border-box; margin: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; background: var(--bg); color: var(--ink); }
body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
#world { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.device { position: absolute; transform-origin: 0 0; background: #1b1a18;
  box-shadow: 0 0 0 1.5px #3a3833 inset, 0 40px 80px -30px rgb(var(--shadow-color) / 0.35), 0 12px 24px -12px rgb(var(--shadow-color) / 0.25); }
.device.laptop { background: linear-gradient(#22211e, #171614); }
.screen { position: absolute; overflow: hidden; background: var(--app-bg); }
.screen iframe { position: absolute; left: 0; border: 0; background: var(--app-bg); }
.base { position: absolute; left: -6%; right: -6%; bottom: 0; border-radius: 0 0 18px 18px;
  background: linear-gradient(#cfccc5, #a9a59d 70%, #8d8a83); }
.base::before { content: ''; position: absolute; left: 42%; right: 42%; top: 0; height: 32%; border-radius: 0 0 10px 10px; background: rgb(0 0 0 / 0.14); }
.sb { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; font: 600 16px/1 'Inter', sans-serif; color: var(--app-ink); background: var(--app-bg); z-index: 2; }
.sb-android { padding: 0 20px; font-size: 14px; }
.sb-desktop { justify-content: flex-end; gap: 12px; padding: 0 18px; font-size: 13px; font-weight: 500;
  background: color-mix(in srgb, var(--app-bg) 88%, var(--app-ink)); }
.sb-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); margin-right: auto; }
.sb-icons { display: flex; gap: 6px; align-items: center; }
.sig { display: flex; gap: 2px; align-items: flex-end; height: 12px; }
.sig b { width: 3px; background: currentColor; border-radius: 1px; }
.sig b:nth-child(1) { height: 4px; } .sig b:nth-child(2) { height: 6px; } .sig b:nth-child(3) { height: 9px; } .sig b:nth-child(4) { height: 12px; }
.bat { width: 25px; height: 12px; border: 1.5px solid currentColor; border-radius: 4px; padding: 1.5px; opacity: 0.9; }
.bat b { display: block; height: 100%; background: currentColor; border-radius: 1.5px; }
.island { position: absolute; top: 11px; left: 50%; width: 124px; height: 35px; margin-left: -62px; border-radius: 20px; background: #050505; z-index: 3; }
.hole { position: absolute; top: 12px; left: 50%; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: #050505; z-index: 3; }
.notch { position: absolute; top: 0; left: 50%; width: 190px; height: 30px; margin-left: -95px; border-radius: 0 0 12px 12px; background: #1b1a18; z-index: 3; }
.home { position: absolute; bottom: 8px; left: 50%; width: 140px; height: 5px; margin-left: -70px; border-radius: 3px; background: var(--app-ink); opacity: 0.55; z-index: 3; }
.taskbar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; gap: 8px; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--app-bg) 86%, var(--app-ink)); border-top: 1px solid var(--line); z-index: 2; }
.taskbar span { width: 22px; height: 22px; border-radius: 6px; background: color-mix(in srgb, var(--app-ink) 18%, transparent); }
.taskbar span:first-child { background: var(--accent); }
.taskbar em { position: absolute; right: 16px; font: 500 12px 'Inter', sans-serif; font-style: normal; color: var(--app-ink); }
.halo-layer { position: absolute; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 4; }
.halo { position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
  border: 2.5px solid var(--accent); background: color-mix(in srgb, var(--accent) 22%, transparent);
  animation: halo var(--dur-slower) var(--ease-out) forwards; }
@keyframes halo { from { transform: scale(0.55); opacity: 0.9; } to { transform: scale(1.35); opacity: 0; } }
.caption { position: absolute; font-family: 'Bitstream Charter', 'Charter', Georgia, serif; font-weight: 400; line-height: 1.15;
  letter-spacing: -0.01em; color: var(--ink); opacity: 0; z-index: 10; }
.cap-lower-third { left: 6%; bottom: 17%; max-width: 70%; text-wrap: balance; padding: 0.32em 0.6em 0.38em; border-radius: 0.36em;
  background: color-mix(in srgb, var(--bg) 94%, transparent); box-shadow: 0 10px 30px -14px rgb(var(--shadow-color) / 0.35); }
.cap-burned-in { left: 50%; bottom: 7%; max-width: 84%; padding: 0.3em 0.7em 0.36em; border-radius: 0.5em; text-align: center;
  background: color-mix(in srgb, var(--bg) 95%, transparent); box-shadow: 0 10px 30px -14px rgb(var(--shadow-color) / 0.35); translate: -50% 0; }
.cap-burned-in-top { left: 50%; top: 4.5%; width: max-content; max-width: 88%; padding: 0.3em 0.7em 0.36em; border-radius: 0.5em; text-align: center;
  background: color-mix(in srgb, var(--bg) 95%, transparent); box-shadow: 0 12px 34px -14px rgb(var(--shadow-color) / 0.45); translate: -50% 0; }
.cap-burned-in-safe-zone { left: 50%; top: 13.5%; width: max-content; max-width: calc(100% - 180px); text-align: center; translate: -50% 0; }
.cap-card { left: 50%; top: 50%; width: 84%; text-align: center; translate: -50% -50%; font-size: inherit; }
.disclaimer { position: absolute; right: 3%; bottom: 3%; font: 500 max(13px, 1.4vh) 'Inter', sans-serif; color: var(--ink-2); opacity: 0; z-index: 10; }
.endcard { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4.5vh; opacity: 0; }
.endcard img { width: var(--logo-w); height: auto; }
.endcard .tagline { font-family: 'Bitstream Charter', 'Charter', Georgia, serif; line-height: 1.1; letter-spacing: -0.01em; text-align: center; }
.endcard .lines { display: flex; flex-direction: column; gap: 1.2vh; align-items: center; font: 500 2.4vh/1.3 'Inter', sans-serif; color: var(--ink-2); text-align: center; }
/* Started by window.__stage.start(): CSS-only motion, so the browser animates it on the compositor. */
.run .caption { animation: cap-in var(--dur-slower) var(--ease-out) var(--cap-delay) forwards, cap-out var(--dur-slow) var(--ease-in) var(--cap-out) forwards; }
.run .cap-card { animation: cap-in calc(var(--dur-slower) * 2) var(--ease-out) 120ms forwards; }
.run .disclaimer { animation: cap-in var(--dur-slower) var(--ease-out) 300ms forwards; }
.run .endcard { animation: cap-in calc(var(--dur-slower) * 2) var(--ease-out) 150ms forwards; }
.run .endcard .lines { animation: lines-in var(--dur-slower) var(--ease-out) 900ms both; }
@keyframes cap-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes cap-out { to { opacity: 0; } }
@keyframes lines-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
`;

const STAGE_JS = `
window.__stage = {
  start() { document.body.classList.add('run'); const w = document.getElementById('world');
    w.style.transform = w.dataset.to; },
  halo(name, x, y) { const layer = document.querySelector('.halo-layer[data-pane="' + name + '"]'); if (!layer) return;
    const h = document.createElement('div'); h.className = 'halo'; h.style.left = x + 'px'; h.style.top = y + 'px';
    layer.appendChild(h); setTimeout(() => h.remove(), 900); },
};`;

/**
 * Full stage document. `opts`: { scene, frame, devices, tokens: {light, dark}, lang, appUrl,
 * captionStyle, captionText, timing: { durationMs, easing }, disclaimer, endcard: { logoSvg, lines } }.
 */
export function stageHtml(opts) {
  const { scene, frame, devices, tokens, lang, appUrl, captionStyle, timing } = opts;
  const theme = scene.theme === 'dark' ? 'dark' : 'light';
  const t = tokens[theme];
  const { placed, box, k } = layout(scene, frame, devices);
  const from = cameraTransform(scene.camera.from, frame, box, k);
  const to = cameraTransform(scene.camera.to, frame, box, k);
  const devicesHtml = placed
    .map((p, i) => {
      const pt = tokens[p.theme === 'dark' ? 'dark' : 'light'];
      return deviceHtml({
        ...p,
        name: `pane-${i}`,
        src: `${appUrl}${p.route}`,
        lang,
        colors: { bg: pt['--bg'], ink: pt['--ink'] },
      });
    })
    .join('\n');
  const bare = scene.kind === 'ui' && scene.device === 'none';
  const bareHtml = bare
    ? `<iframe name="pane-0" src="${esc(appUrl + scene.route)}" style="position:absolute;inset:0;width:${frame.width}px;height:${frame.height}px;border:0"></iframe><div class="halo-layer" data-pane="pane-0" style="top:0"></div>`
    : '';
  const isCard = scene.kind === 'card';
  const endcard = scene.kind === 'endcard' ? endcardHtml(opts, frame) : '';
  const caption = isCard
    ? captionHtml(opts.captionText, 'card', frame)
    : scene.kind === 'endcard'
      ? ''
      : captionHtml(opts.captionText, captionStyle, frame);
  const capOut = Math.max(0, timing.captionOutMs ?? timing.durationMs - 450);
  return `<!doctype html><html lang="${lang}" data-theme="${theme}"><head><meta charset="utf-8"><title>${esc(scene.id)}</title>
<style>:root { ${cssVars(t)} --app-bg: ${t['--bg']}; --app-ink: ${t['--ink']}; --cap-delay: ${timing.captionInMs ?? 250}ms; --cap-out: ${capOut}ms; }
${BASE_CSS}
#world { transform: ${from}; transition: transform ${timing.durationMs}ms ${timing.easing}; }
</style></head><body>
<div id="world" data-to="${to}" style="width:${frame.width}px;height:${frame.height}px">${devicesHtml}${isCard ? caption : ''}</div>
${bareHtml}${endcard}${isCard ? '' : caption}
${opts.disclaimer ? `<div class="disclaimer">${esc(opts.disclaimer)}</div>` : ''}
<script>${STAGE_JS}</script></body></html>`;
}

function endcardHtml(opts, frame) {
  const size = Math.round(frame.height * 0.07);
  const portrait = frame.height > frame.width;
  const logoW = Math.round(frame.width * (portrait ? 0.62 : 0.34));
  const logo = `data:image/svg+xml;base64,${Buffer.from(opts.endcard.logoSvg).toString('base64')}`;
  const lines = opts.endcard.lines.map((l) => `<span>${esc(l)}</span>`).join('');
  return `<div class="endcard" style="--logo-w:${logoW}px"><img alt="POuxis" src="${logo}">
<div class="tagline" style="font-size:${size}px">${esc(opts.captionText)}</div>
<div class="lines">${lines}</div></div>`;
}
