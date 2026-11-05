// Unit tests of the pure parts of the screenshot pipeline:
//   node --test docs/marketing/stores/render/render.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCaptions, caption } from './lib/captions.mjs';
import { esc, rootTokens } from './lib/compose.mjs';
import { CAPTION_PLAN } from './lib/config.mjs';
import {
  FEATURE_GRAPHIC,
  FORMATS,
  HEROES,
  captureScale,
  deviceGeometry,
  framesOf,
  EYEBROWS,
} from './lib/formats.mjs';
import { messagePattern, translator } from './lib/i18n.mjs';
import { pngInfo } from './lib/png.mjs';
import { SCENES, sceneAlt } from './lib/scenes.mjs';
import { SEED_EN, translateString, translationPatch } from './lib/seed-en.mjs';

const plan = parseCaptions(readFileSync(CAPTION_PLAN, 'utf8'));

test('parseCaptions reads every fenced series of the plan', () => {
  const md = '<!-- field: captions.demo@fr -->\n\n```text\nUn\n\nDeux\n```\n';
  assert.deepEqual(parseCaptions(md), { 'demo@fr': ['Un', 'Deux'] });
  assert.equal(plan['ios-phone@fr']?.[0], 'Votre journée, d’un seul regard');
});

test('every frame has a caption, an eyebrow and an alt text in both languages', () => {
  for (const id of Object.keys(FORMATS)) {
    for (const frame of framesOf(id)) {
      for (const lang of ['fr', 'en']) {
        assert.ok(
          caption(frame.series, lang, frame.captionIndex, plan),
          `${id} #${frame.index} ${lang}`,
        );
        assert.ok(EYEBROWS[frame.eyebrow]?.[lang], `${id} eyebrow ${frame.eyebrow}`);
        assert.ok(SCENES[frame.scene], `${id} scene ${frame.scene}`);
        assert.ok(sceneAlt(frame.scene, lang).length > 20);
      }
    }
  }
  assert.ok(SCENES[FEATURE_GRAPHIC.scene]);
  for (const hero of HEROES) assert.ok(SCENES[hero.scene] && FORMATS[hero.format]);
});

test('French and English series keep the same number of captions', () => {
  for (const key of Object.keys(plan).filter((k) => k.endsWith('@fr'))) {
    assert.equal(plan[key].length, plan[key.replace('@fr', '@en')]?.length, key);
  }
});

test('caption throws on a missing series or line', () => {
  assert.throws(() => caption('nope', 'fr', 0, plan), /no captions\.nope@fr/);
  assert.throws(() => caption('ios-phone', 'fr', 99, plan), /no line 100/);
});

test('each series has 6 to 8 frames', () => {
  for (const id of Object.keys(FORMATS)) {
    const n = framesOf(id).length;
    assert.ok(n >= 6 && n <= 8, `${id}: ${n}`);
  }
});

test('deviceGeometry fits a phone inside its region without upsampling the capture', () => {
  const f = FORMATS['ios-phone'];
  const g = deviceGeometry(f.device, f.region);
  assert.ok(g.box.w <= f.region.w && g.box.h <= f.region.h);
  assert.deepEqual(g.viewport, { width: 440, height: 956 });
  assert.ok(g.captureScale >= g.scale);
  assert.ok(Math.abs(g.screen.w / g.screen.h - 440 / 956) < 0.005);
});

test('deviceGeometry derives a window viewport from the region and title bar', () => {
  const device = { kind: 'window', style: 'mac', logical: { w: 1000 }, titlebar: 30, radius: 10 };
  const g = deviceGeometry(device, { x: 0, y: 0, w: 2000, h: 1260 });
  assert.equal(g.scale, 2);
  assert.equal(g.titlebar, 60);
  assert.deepEqual(g.viewport, { width: 1000, height: 600 });
  assert.equal(
    deviceGeometry(device, { x: 0, y: 0, w: 2000, h: 1260 }, { chrome: false }).viewport.height,
    630,
  );
});

test('captureScale is the smallest integer ≥ scale, between 1 and 3', () => {
  assert.equal(captureScale(0.9), 1);
  assert.equal(captureScale(1), 1);
  assert.equal(captureScale(1.2), 2);
  assert.equal(captureScale(4.5), 3);
});

test('seed translation rewrites text fields and leaves engine fields alone', () => {
  const record = {
    id: 'seed-event-01',
    title: 'Point d’équipe',
    recurrence: 'tous les jours ouvrés à 9h30',
    tags: ['équipe'],
    start: 1,
  };
  assert.deepEqual(translationPatch(record), { title: 'Team check-in', tags: ['team'] });
  assert.equal(translationPatch({ id: 'x', title: 'Untranslated' }), null);
});

test('seed translation handles graph nodes and Markdown bodies line by line', () => {
  const graph = {
    id: 'g',
    nodes: [
      { id: 'n-design', label: 'Design', kind: 'group' },
      { id: 'n', label: 'Recherche', kind: 'group' },
    ],
  };
  assert.deepEqual(translationPatch(graph), {
    nodes: [
      { id: 'n-design', label: 'Design', kind: 'group' },
      { id: 'n', label: 'Research', kind: 'group' },
    ],
  });
  assert.equal(translateString('# Vision du site\n\nInchangé'), '# Website vision\n\nInchangé');
});

test('every French seed string has an English value', () => {
  for (const [fr, en] of Object.entries(SEED_EN)) assert.ok(en && en !== '', fr);
});

test('messagePattern turns placeholders into wildcards', async () => {
  const fr = { today: { focus: { startOn: 'Se concentrer sur « {title} »' } } };
  const re = messagePattern(fr, 'today.focus.startOn');
  assert.ok(re.test('Se concentrer sur « Écrire »'));
  assert.ok(!re.test('Autre chose'));
  const t = await translator('en');
  assert.equal(typeof t('nav.capture'), 'string');
  assert.throws(() => t('nav.doesNotExist'), /missing key/);
});

test('rootTokens reads the light palette from tokens.css', () => {
  const tokens = rootTokens();
  assert.match(tokens['--bg'], /^#[0-9a-f]{6}$/i);
  assert.match(tokens['--accent'], /^#[0-9a-f]{6}$/i);
  assert.equal(esc('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
});

test('pngInfo reads IHDR and detects alpha', () => {
  const png = (colorType) => {
    const b = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
    b.writeUInt32BE(13, 8);
    b.write('IHDR', 12, 'latin1');
    b.writeUInt32BE(1320, 16);
    b.writeUInt32BE(2868, 20);
    b[24] = 8;
    b[25] = colorType;
    return b;
  };
  assert.deepEqual(pngInfo(png(2)), {
    width: 1320,
    height: 2868,
    bitDepth: 8,
    colorType: 'rgb',
    hasAlpha: false,
  });
  assert.equal(pngInfo(png(6)).hasAlpha, true);
  assert.throws(() => pngInfo(Buffer.from('nope')), /not a PNG/);
});
