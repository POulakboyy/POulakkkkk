// Unit tests of the pure parts of the render pipeline (no browser, no ffmpeg).
// Run: node --test docs/marketing/video/render/
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SHOTLIST } from './lib/config.mjs';
import { DIRECTIONS, directionFor, portableKey } from './lib/directions.mjs';
import { FALLBACKS, hookName } from './lib/hooks.mjs';
import {
  captionTiming, clipPlan, deliverable, frameList, joinGraph, recordWindow, segments, stageGeometry, xfadeKind,
} from './lib/plan.mjs';
import { cameraTransform, deviceBox, layout, stageHtml } from './lib/stage.mjs';
import { assColour, assTime, parseSrt, parseSrtTime, toAss } from './lib/subtitles.mjs';
import { blockVars, themeTokens } from './lib/tokens.mjs';
import { timeShimSource } from './lib/timeshim.mjs';

const doc = JSON.parse(readFileSync(SHOTLIST, 'utf8'));

test('every format plans to exactly its declared duration', () => {
  for (const format of doc.formats) {
    const plan = clipPlan(doc, format.id);
    assert.equal(plan.totalMs, format.durationMs, format.id);
    const segs = segments(plan);
    assert.equal(joinGraph(segs, { fps: 30 }).lengthMs, format.durationMs, `${format.id} joined`);
  }
});

test('a dissolve pre-rolls the next clip by its duration', () => {
  const plan = clipPlan(doc, 'hero-16x9');
  const sync = plan.clips.find((c) => c.sceneId === 'h03-sync');
  const plan4 = plan.clips[sync.index + 1];
  assert.deepEqual(sync.transitionOut, { kind: 'fade', durationMs: 500, type: 'dissolve' });
  assert.equal(plan4.preMs, 500);
  assert.equal(plan4.fromMs, -500);
});

test('fade-to-paper splits around a paper segment', () => {
  const plan = clipPlan(doc, 'hero-16x9');
  const done = plan.clips.find((c) => c.sceneId === 'h06-done');
  assert.equal(done.toMs, done.durationMs - 250);
  const segs = segments(plan);
  const paper = segs.findIndex((s) => s.type === 'paper');
  assert.equal(segs[paper - 1].clip.sceneId, 'h06-done');
  assert.deepEqual(segs[paper].join, { kind: 'fade', durationMs: 250 });
  assert.equal(segs[paper + 1].clip.preMs, 250);
});

test('trimmed clips keep their in-point', () => {
  const plan = clipPlan(doc, 'cut-30-16x9');
  const plan2 = plan.clips[1];
  assert.equal(plan2.inMs, 1250);
  assert.equal(plan2.fromMs, 1250);
  assert.deepEqual(captionTiming(plan2), { captionInMs: 1500, captionOutMs: 1250 + 5000 - 450 });
});

test('recordWindow covers pre-roll and the latest out-point', () => {
  assert.deepEqual(recordWindow([{ fromMs: -500, toMs: 3000 }, { fromMs: 1000, toMs: 6000 }]), {
    leadMs: 500,
    untilMs: 6000,
  });
});

test('xfadeKind maps transitions and treats zero-length ones as cuts', () => {
  assert.equal(xfadeKind({ type: 'dissolve', durationMs: 300 }), 'fade');
  assert.equal(xfadeKind({ type: 'push-left', durationMs: 400 }), 'slideleft');
  assert.equal(xfadeKind({ type: 'dissolve', durationMs: 0 }), null);
  assert.equal(xfadeKind({ type: 'match-cut', durationMs: 0 }), null);
});

test('joinGraph uses concat for cuts and xfade offsets for overlaps', () => {
  const { graph, lengthMs, label } = joinGraph(
    [
      { lengthMs: 2000, join: { kind: 'cut', durationMs: 0 } },
      { lengthMs: 3000, join: { kind: 'fade', durationMs: 500 } },
      { lengthMs: 1000, join: { kind: 'cut', durationMs: 0 } },
    ],
    { fps: 30 },
  );
  assert.match(graph, /\[s0\]\[s1\]xfade=transition=fade:duration=0\.500:offset=1\.500\[j1\]/);
  assert.match(graph, /\[j1\]\[s2\]concat=n=2:v=1:a=0\[j2\]/);
  assert.equal(lengthMs, 5500);
  assert.equal(label, 'j2');
});

test('frameList holds the last frame before the window and ends on the out-point', () => {
  const frames = [
    { file: 'a.jpg', t: -300 },
    { file: 'b.jpg', t: 100 },
    { file: 'c.jpg', t: 900 },
    { file: 'd.jpg', t: 1600 },
  ];
  const list = frameList(frames, 0, 1000);
  assert.equal(
    list,
    "ffconcat version 1.0\nfile 'a.jpg'\nduration 0.100\nfile 'b.jpg'\nduration 0.800\nfile 'c.jpg'\nduration 0.100\nfile 'c.jpg'\n",
  );
});

test('stage geometry: framed formats at 2x, store formats at native density', () => {
  const hero = stageGeometry(doc.formats.find((f) => f.id === 'hero-16x9'));
  assert.deepEqual(hero, { css: { width: 1920, height: 1080 }, dsf: 2, out: { width: 1920, height: 1080, fps: 30 } });
  const iphone = stageGeometry(doc.formats.find((f) => f.id === 'appstore-iphone'));
  assert.deepEqual(iphone.css, { width: 443, height: 960 });
  assert.equal(iphone.dsf, 2);
  assert.deepEqual(deliverable(doc.formats.find((f) => f.id === 'hero-16x9')), { width: 1920, height: 1080, fps: 30 });
});

test('camera holds the requested screen point at the frame centre', () => {
  const frame = { width: 1920, height: 1080 };
  const box = { left: 10, top: 20, width: 400, height: 800 };
  const t = cameraTransform({ x: 0.5, y: 0.25, scale: 2 }, frame, box, 1.5);
  assert.equal(t, 'translate(960px, 540px) scale(3.00000) translate(-210.00px, -220.00px)');
});

test('a framed device screen fills 80 % of the frame height at scale 1', () => {
  const scene = doc.scenes.find((s) => s.id === 'h02-capture');
  const { k, box } = layout(scene, { width: 1920, height: 1080 }, doc.devices);
  assert.equal(Math.round(box.height * k), 864);
  assert.equal(deviceBox('iphone', { width: 402, height: 874 }).width, 430);
});

test('composite layouts place one device per quadrant', () => {
  const scene = doc.scenes.find((s) => s.kind === 'composite');
  const { placed, k } = layout(scene, { width: 1920, height: 1080 }, doc.devices);
  assert.equal(placed.length, 4);
  assert.equal(k, 1);
  assert.ok(placed.every((p) => p.scale > 0 && p.scale < 1));
});

test('stageHtml frames the app, the caption and the camera move', () => {
  const tokens = themeTokens();
  const scene = doc.scenes.find((s) => s.id === 'h04-plan');
  const html = stageHtml({
    scene,
    frame: { width: 1920, height: 1080 },
    devices: doc.devices,
    tokens,
    lang: 'fr',
    appUrl: 'http://localhost:4195/',
    captionStyle: 'lower-third',
    captionText: 'Planification <auto>',
    timing: { durationMs: 7500, easing: 'ease' },
    disclaimer: '',
  });
  assert.match(html, /<iframe name="pane-0" src="http:\/\/localhost:4195\/#\/today"/);
  assert.match(html, /cap-lower-third/);
  assert.match(html, /Planification &lt;auto&gt;/);
  assert.match(html, /transition: transform 7500ms ease/);
  assert.match(html, new RegExp(`--bg: ${tokens.light['--bg']}`));
});

test('tokens: dark overrides light and keeps the rest', () => {
  const css = ":root {\n  --bg: #fff;\n  --ink: #000;\n}\n:root[data-theme='dark'],\n.x {\n  --bg: #111;\n}";
  assert.deepEqual(blockVars(css, ':root'), { '--bg': '#fff', '--ink': '#000' });
  const real = themeTokens();
  assert.notEqual(real.light['--bg'], real.dark['--bg']);
  assert.equal(real.dark['--radius-md'], real.light['--radius-md']);
});

test('subtitles: SRT round trip into a brand-styled ASS', () => {
  assert.equal(parseSrtTime('00:01:05,432'), 65432);
  assert.equal(assTime(65432), '0:01:05.43');
  assert.equal(assColour('#f6f4ef', 0x14), '&H14EFF4F6');
  const cues = parseSrt('1\n00:00:00,600 --> 00:00:04,900\nLigne un\nligne deux\n\n2\n00:00:05,000 --> 00:00:06,000\nFin\n');
  assert.deepEqual(cues[0], { start: 600, end: 4900, text: 'Ligne un\nligne deux' });
  const ass = toAss(cues, { width: 1920, height: 1080, ink: '#1c1b18', paper: '#f6f4ef' });
  assert.match(ass, /PlayResY: 1080/);
  assert.match(ass, /Dialogue: 0,0:00:00.60,0:00:04.90,Default,,0,0,0,,Ligne un\\Nligne deux/);
});

test('every hook used by the shotlist has a fallback, and directions only name real scenes', () => {
  const used = new Set();
  for (const s of doc.scenes) {
    const actions = [...(s.actions ?? []), ...(s.composite?.panes.flatMap((p) => p.actions) ?? [])];
    for (const a of actions) if (a.selector) used.add(hookName(a.selector));
  }
  for (const hook of used) assert.ok(FALLBACKS[hook], `fallback for ${hook}`);
  const ids = new Set(doc.scenes.map((s) => s.id));
  for (const id of Object.keys(DIRECTIONS)) assert.ok(ids.has(id), id);
  assert.deepEqual(directionFor('nope'), {});
  assert.equal(hookName('.x'), null);
});

test('canvas direction swaps the two beats but keeps their times', () => {
  const scene = doc.scenes.find((s) => s.id === 'h11-canvas');
  const [a, b] = directionFor('h11-canvas').actions(scene.actions);
  assert.equal(a.at, 600);
  assert.equal(hookName(a.selector), 'canvas-node');
  assert.equal(b.at, 2600);
  assert.equal(hookName(b.selector), 'canvas-surface');
});

test('portableKey maps ⌘ shortcuts to the platform modifier', () => {
  assert.equal(portableKey('Meta+k'), 'ControlOrMeta+k');
  assert.equal(portableKey('Enter'), 'Enter');
});

test('time shim: starts at the fixture epoch and can be slowed', () => {
  const src = timeShimSource(1_762_330_320_000);
  assert.match(src, /const offset = 1762330320000 - realAnchor/);
  assert.match(src, /window\.__videoSetRate/);
});
