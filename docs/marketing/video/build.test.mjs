// Run: node --test docs/marketing/video/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCues, packCues, shortTime, srtTime, toCues, twoLines } from './build.mjs';
import { loadShotlist, validate } from './validate-shotlist.mjs';

const shotlist = () => loadShotlist(new URL('./shotlist.json', import.meta.url));

test('time formats', () => {
  assert.equal(srtTime(65_432), '00:01:05,432');
  assert.equal(srtTime(3_600_000), '01:00:00,000');
  assert.equal(shortTime(65_432), '01:05.43');
});

test('twoLines prefers a break after punctuation and respects the line limit', () => {
  assert.deepEqual(twoLines('Short line.'), ['Short line.']);
  const lines = twoLines('Alors on commence par la vider. Une phrase, telle qu’on la dirait.');
  assert.deepEqual(lines, [
    'Alors on commence par la vider.',
    'Une phrase, telle qu’on la dirait.',
  ]);
  assert.equal(twoLines('x'.repeat(90)), null);
});

test('packCues splits long lines into readable cues', () => {
  const text =
    'Le reste se range autour : chaque tâche trouve sa place, avec de l’air entre les rendez-vous.';
  const cues = packCues(text);
  assert.ok(cues.length >= 2);
  for (const cue of cues) assert.ok(twoLines(cue), `cue fits on two lines: ${cue}`);
  assert.equal(cues.join(' '), text);
});

test('toCues covers the whole VO window without gaps', () => {
  const cues = toCues(
    'One. Two words here, and a few more words to force a second cue please.',
    1000,
    4000,
  );
  assert.equal(cues[0].start, 1000);
  assert.equal(cues.at(-1).end, 5000);
  for (let i = 1; i < cues.length; i += 1) assert.equal(cues[i].start, cues[i - 1].end);
});

test('the committed shotlist is valid', () => {
  assert.deepEqual(validate(shotlist()), []);
});

test('validate catches store, timing and selector problems', () => {
  const doc = shotlist();
  const preview = doc.formats.find((f) => f.id === 'appstore-iphone');
  preview.deliverables[0].fps = 60;
  preview.durationMs = 40_000;
  doc.scenes.find((s) => s.id === 'ap01-capture').camera.to.scale = 1.5;
  doc.scenes.find((s) => s.id === 'h02-capture').actions[0].selector = '[data-demo="nope"]';
  const errors = validate(doc).join('\n');
  assert.match(errors, /max 30 fps/);
  assert.match(errors, /15–30 s/);
  assert.match(errors, /must not zoom/);
  assert.match(errors, /"nope" missing from selectorContract/);
});

test('hero subtitles start with the opening line and stay in programme order', () => {
  const doc = shotlist();
  const byId = new Map(doc.scenes.map((s) => [s.id, s]));
  const hero = doc.formats.find((f) => f.id === 'hero-16x9');
  const cues = formatCues(hero, byId, 'fr');
  assert.equal(cues[0].start, 600);
  for (let i = 1; i < cues.length; i += 1) assert.ok(cues[i].start >= cues[i - 1].end);
  assert.ok(cues.at(-1).end <= hero.durationMs);
});
