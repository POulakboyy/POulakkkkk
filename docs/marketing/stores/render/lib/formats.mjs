// Store formats: canvas size, caption placement, device frame, and the ordered frames of each
// series (one benefit per frame, following screenshots.md). All sizes are output pixels.

/** Eyebrow above each caption: the app area the frame shows, in the app's vocabulary. */
export const EYEBROWS = {
  today: { fr: 'Aujourd’hui', en: 'Today' },
  capture: { fr: 'Capture rapide', en: 'Quick capture' },
  schedule: { fr: 'Planification', en: 'Scheduling' },
  focus: { fr: 'Focus', en: 'Focus' },
  ideas: { fr: 'Idées', en: 'Ideas' },
  canvas: { fr: 'Toile', en: 'Canvas' },
  insights: { fr: 'Bilan', en: 'Insights' },
  privacy: { fr: 'Confidentialité', en: 'Privacy' },
  calendar: { fr: 'Calendrier', en: 'Calendar' },
  tasks: { fr: 'Tâches', en: 'Tasks' },
  studio: { fr: 'Atelier', en: 'Studio' },
  keyboard: { fr: 'Clavier', en: 'Keyboard' },
  deepWork: { fr: 'Travail profond', en: 'Deep work' },
  data: { fr: 'Vos données', en: 'Your data' },
};

const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const WINDOWS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/**
 * `frames`: [scene, eyebrow, captionIndex?, options?]. The caption index defaults to the frame's
 * position in the series; `options.series` borrows a caption from another series.
 */
export const FORMATS = {
  'ios-phone': {
    title: 'iPhone 6,9 pouces',
    size: { w: 1320, h: 2868 },
    layout: 'portrait',
    caption: { x: 100, y: 210, w: 1120, eyebrow: 40, size: 124 },
    region: { x: 100, y: 660, w: 1120, h: 2088 },
    device: { kind: 'phone', logical: { w: 440, h: 956 }, bezel: 24, radius: 150, safe: { top: 54, bottom: 34 }, touch: true },
    frames: [
      ['today', 'today'],
      ['capture-nlp', 'capture'],
      ['overrun', 'schedule'],
      ['focus', 'focus'],
      ['ideas', 'ideas'],
      ['canvas', 'canvas'],
      ['insights-energy', 'insights'],
      ['privacy', 'privacy'],
    ],
  },
  ipad: {
    title: 'iPad 13 pouces',
    size: { w: 2064, h: 2752 },
    layout: 'portrait',
    caption: { x: 140, y: 200, w: 1784, eyebrow: 42, size: 128 },
    region: { x: 140, y: 640, w: 1784, h: 1972 },
    device: { kind: 'tablet', logical: { w: 1032, h: 1376 }, bezel: 30, radius: 80, safe: { top: 24, bottom: 20 }, touch: true },
    frames: [
      ['week', 'calendar'],
      ['capture-week', 'capture'],
      ['canvas', 'canvas'],
      ['kanban', 'tasks'],
      ['focus', 'focus'],
      ['serendipity', 'studio'],
      ['insights-balance', 'insights'],
      ['data', 'data'],
    ],
  },
  mac: {
    title: 'Mac',
    size: { w: 2880, h: 1800 },
    layout: 'landscape',
    caption: { x: 170, w: 760, eyebrow: 38, size: 136 },
    region: { x: 1010, y: 170, w: 1720, h: 1460 },
    device: { kind: 'window', style: 'mac', logical: { w: 1440 }, titlebar: 32, radius: 12 },
    userAgent: MAC_UA,
    frames: [
      ['today', 'today'],
      ['capture-window', 'capture', 1, { composition: 'floating' }],
      ['palette', 'keyboard'],
      ['week', 'calendar'],
      ['maker', 'deepWork'],
      ['canvas', 'canvas'],
      ['focus', 'focus', 6, { chrome: false }],
      ['insights-week', 'insights'],
    ],
  },
  windows: {
    title: 'Windows (Microsoft Store)',
    size: { w: 1920, h: 1080 },
    layout: 'landscape',
    caption: { x: 100, w: 500, eyebrow: 24, size: 82 },
    region: { x: 650, y: 100, w: 1170, h: 880 },
    device: { kind: 'window', style: 'windows', logical: { w: 1170 }, titlebar: 32, radius: 8 },
    userAgent: WINDOWS_UA,
    frames: [
      ['today', 'today'],
      ['capture-window', 'capture', 1, { composition: 'floating' }],
      ['capture-nlp', 'capture'],
      ['overrun', 'schedule'],
      ['focus', 'focus', 4, { chrome: false }],
      ['canvas', 'canvas'],
      ['insights-energy', 'insights'],
      ['data', 'data'],
    ],
  },
  'android-phone': {
    title: 'Google Play — téléphone',
    size: { w: 1080, h: 1920 },
    layout: 'portrait',
    // Google Play: caption text ≤ 20 % of the image, no device frame, no hands.
    caption: { x: 90, y: 118, w: 900, eyebrow: 28, size: 74 },
    region: { x: 150, y: 420, w: 780, h: 1386 },
    device: { kind: 'card', logical: { w: 412 }, radius: 44 },
    frames: [
      ['today', 'today'],
      ['capture-nlp', 'capture'],
      ['overrun', 'schedule'],
      ['focus', 'focus'],
      // The plan's frame 5 shows Android's share sheet, not shipped yet (claims register C19):
      // the ideas inbox and its iPhone caption take its place.
      ['ideas', 'ideas', 4, { series: 'ios-phone' }],
      ['canvas', 'canvas'],
      ['insights-energy', 'insights'],
      ['privacy', 'privacy'],
    ],
  },
};

/** Google Play feature graphic: brand lockup, first caption, a crop of the Today screen. */
export const FEATURE_GRAPHIC = {
  size: { w: 1024, h: 500 },
  series: 'android-phone',
  scene: 'today',
  region: { x: 600, y: 56, w: 340, h: 520 },
  device: { kind: 'card', logical: { w: 390 }, radius: 28 },
};

/** Landing-page heroes: one framed device each, transparent background, 2× density. */
export const HEROES = [
  { id: 'today-iphone', scene: 'today', format: 'ios-phone', region: { w: 720, h: 1500 } },
  { id: 'capture-iphone', scene: 'capture-nlp', format: 'ios-phone', region: { w: 720, h: 1500 } },
  { id: 'canvas-mac', scene: 'canvas', format: 'mac', region: { w: 2000, h: 1300 } },
  { id: 'insights-ipad', scene: 'insights-week', format: 'ipad', region: { w: 1400, h: 1800 } },
];

/**
 * Device box inside `region`, screen rectangle inside the box, px-per-logical-pixel `scale`,
 * the logical `viewport` to capture and the capture's device scale factor.
 */
export function deviceGeometry(device, region, { chrome = true } = {}) {
  if (device.kind === 'phone' || device.kind === 'tablet') {
    const { w: lw, h: lh } = device.logical;
    const b = device.bezel;
    const scale = Math.min((region.w - 2 * b) / lw, (region.h - 2 * b) / lh);
    const w = Math.round(lw * scale + 2 * b);
    const h = Math.round(lh * scale + 2 * b);
    return {
      box: { x: Math.round((region.w - w) / 2), y: Math.round((region.h - h) / 2), w, h },
      screen: { x: b, y: b, w: w - 2 * b, h: h - 2 * b },
      scale,
      viewport: { width: lw, height: lh },
      captureScale: captureScale(scale),
    };
  }
  const scale = region.w / device.logical.w;
  const bar = device.kind === 'window' && chrome ? Math.round(device.titlebar * scale) : 0;
  const height = Math.round((region.h - bar) / scale);
  return {
    box: { x: 0, y: 0, w: region.w, h: region.h },
    screen: { x: 0, y: bar, w: region.w, h: region.h - bar },
    titlebar: bar,
    scale,
    viewport: { width: device.logical.w, height },
    captureScale: captureScale(scale),
  };
}

/** Smallest integer device scale factor that never upsamples the capture (max 3). */
export function captureScale(scale) {
  return Math.min(3, Math.max(1, Math.ceil(scale - 1e-6)));
}

/** Normalised frame list of a format: { index, scene, eyebrow, series, captionIndex, options }. */
export function framesOf(id) {
  const format = FORMATS[id];
  if (!format) throw new Error(`unknown format "${id}"`);
  return format.frames.map(([scene, eyebrow, captionIndex, options = {}], index) => ({
    index,
    scene,
    eyebrow,
    series: options.series ?? id,
    captionIndex: captionIndex ?? index,
    options,
  }));
}
