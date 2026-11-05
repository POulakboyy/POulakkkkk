#!/usr/bin/env node
// Validates shotlist.json: structure, timing, store limits and caption readability.
// Usage: node docs/marketing/video/validate-shotlist.mjs [path/to/shotlist.json]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DEVICES = ['iphone', 'android', 'macbook', 'windows-laptop', 'none'];
export const ROUTES = [
  '#/today',
  '#/tasks',
  '#/calendar',
  '#/canvas',
  '#/ideas',
  '#/insights',
  '#/settings',
];
export const KINDS = ['ui', 'card', 'endcard', 'composite'];
export const ACTION_TYPES = ['type', 'click', 'press', 'scroll', 'wait'];
export const TRANSITIONS = ['cut', 'dissolve', 'match-cut', 'push-left', 'fade-to-paper'];
export const THEMES = ['light', 'dark'];

/** Max speaking/reading rate for VO and subtitles (characters per second, house rule). */
export const MAX_CPS = 17;
/** Minimum time an on-screen caption stays readable. */
export const MIN_CAPTION_MS = 1500;
/** Max camera zoom speed (scale units per second), for vestibular comfort. */
export const MAX_ZOOM_PER_S = 1;

// Apple App Store Connect, "App preview specifications" (checked 2026-11-04).
const APPLE_PREVIEW = {
  minMs: 15000,
  maxMs: 30000,
  maxFps: 30,
  accepted: {
    'app-store-ios': ['886x1920', '1920x886', '1080x1920', '1920x1080', '750x1334', '1334x750'],
    'app-store-macos': ['1920x1080'],
  },
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isBilingual = (v) => v && typeof v.fr === 'string' && typeof v.en === 'string';

function checkCamera(camera, durationMs, where, errors) {
  if (!camera || typeof camera.easing !== 'string') {
    errors.push(`${where}: camera.easing missing`);
    return;
  }
  for (const end of ['from', 'to']) {
    const p = camera[end];
    if (!p || !isNum(p.x) || !isNum(p.y) || !isNum(p.scale) || p.scale <= 0) {
      errors.push(`${where}: camera.${end} needs numeric x, y and scale > 0`);
      return;
    }
  }
  const speed = Math.abs(camera.to.scale - camera.from.scale) / (durationMs / 1000);
  if (speed > MAX_ZOOM_PER_S) errors.push(`${where}: camera zoom too fast (${speed.toFixed(2)}/s)`);
}

function checkAction(action, scene, where, errors) {
  if (!ACTION_TYPES.includes(action.type)) errors.push(`${where}: unknown type ${action.type}`);
  if (!isNum(action.at) || action.at < 0 || action.at >= scene.durationMs) {
    errors.push(`${where}: at must be within [0, ${scene.durationMs})`);
  }
  const needs = {
    type: ['selector', 'text'],
    click: ['selector'],
    press: ['key'],
    scroll: ['selector'],
    wait: ['durationMs'],
  }[action.type];
  for (const field of needs ?? []) {
    if (action[field] === undefined) errors.push(`${where}: ${action.type} needs ${field}`);
  }
  if (action.type === 'type' && !isBilingual(action.text)) {
    errors.push(`${where}: text must be { fr, en }`);
  }
  const end = action.at + (action.durationMs ?? 0);
  if (end > scene.durationMs) errors.push(`${where}: ends at ${end} ms, after scene end`);
}

function checkActions(actions, scene, where, errors) {
  if (!Array.isArray(actions)) {
    errors.push(`${where}: actions must be an array`);
    return;
  }
  let last = -1;
  actions.forEach((a, i) => {
    checkAction(a, scene, `${where}.actions[${i}]`, errors);
    if (a.at < last) errors.push(`${where}.actions[${i}]: not sorted by at`);
    last = a.at;
  });
}

function checkScene(scene, contract, errors) {
  const where = `scene ${scene.id}`;
  if (!KINDS.includes(scene.kind)) errors.push(`${where}: unknown kind ${scene.kind}`);
  if (!isNum(scene.durationMs) || scene.durationMs <= 0) errors.push(`${where}: bad durationMs`);
  if (!DEVICES.includes(scene.device)) errors.push(`${where}: unknown device ${scene.device}`);
  if (scene.route !== null && !ROUTES.includes(scene.route)) {
    errors.push(`${where}: unknown route ${scene.route}`);
  }
  if (scene.kind === 'ui' && scene.route === null) errors.push(`${where}: ui scene needs a route`);
  if (!THEMES.includes(scene.theme)) errors.push(`${where}: unknown theme ${scene.theme}`);
  if (!isBilingual(scene.caption)) errors.push(`${where}: caption needs fr and en`);
  if (!scene.transition || !TRANSITIONS.includes(scene.transition.type)) {
    errors.push(`${where}: unknown transition`);
  } else if (scene.transition.durationMs >= scene.durationMs) {
    errors.push(`${where}: transition longer than scene`);
  }
  checkCamera(scene.camera, scene.durationMs, where, errors);
  checkActions(scene.actions, scene, where, errors);
  for (const pane of scene.composite?.panes ?? []) {
    if (!DEVICES.includes(pane.device) || pane.device === 'none') {
      errors.push(`${where}: composite pane needs a real device`);
    }
    checkActions(pane.actions, scene, `${where}.pane(${pane.device})`, errors);
  }
  if (scene.kind === 'composite' && !scene.composite?.panes?.length) {
    errors.push(`${where}: composite scene needs panes`);
  }
  for (const a of [...scene.actions, ...(scene.composite?.panes ?? []).flatMap((p) => p.actions)]) {
    if (a.selector === undefined) continue;
    const hook = /^\[data-demo="([^"]+)"\]$/.exec(a.selector)?.[1];
    if (!hook) errors.push(`${where}: selector ${a.selector} must be [data-demo="<hook>"]`);
    else if (!contract.includes(hook)) {
      errors.push(`${where}: selector hook "${hook}" missing from selectorContract`);
    }
  }
  if (scene.vo) {
    const { atMs, durationMs, fr, en } = scene.vo;
    if (!isNum(atMs) || !isNum(durationMs) || atMs + durationMs > scene.durationMs) {
      errors.push(`${where}: vo must fit inside the scene`);
    }
    for (const [lang, text] of [
      ['fr', fr],
      ['en', en],
    ]) {
      const cps = (text?.length ?? 0) / (durationMs / 1000);
      if (cps > MAX_CPS) errors.push(`${where}: vo.${lang} too fast (${cps.toFixed(1)} cps)`);
    }
  }
}

function checkStoreLimits(format, errors) {
  const where = `format ${format.id}`;
  const stores = format.platforms.filter((p) => p in APPLE_PREVIEW.accepted);
  for (const store of stores) {
    if (format.durationMs < APPLE_PREVIEW.minMs || format.durationMs > APPLE_PREVIEW.maxMs) {
      errors.push(`${where}: Apple previews must last 15–30 s`);
    }
    for (const d of format.deliverables) {
      if (d.fps > APPLE_PREVIEW.maxFps) errors.push(`${where}: Apple previews max 30 fps`);
      if (!APPLE_PREVIEW.accepted[store].includes(`${d.width}x${d.height}`)) {
        errors.push(`${where}: ${d.width}x${d.height} not accepted for ${store}`);
      }
    }
  }
}

function checkFormat(format, sceneById, errors) {
  const where = `format ${format.id}`;
  let total = 0;
  for (const item of format.sequence) {
    const scene = sceneById.get(item.scene);
    if (!scene) {
      errors.push(`${where}: unknown scene ${item.scene}`);
      continue;
    }
    if (item.inMs + item.durationMs > scene.durationMs) {
      errors.push(`${where}: ${item.scene} window exceeds scene duration`);
    }
    if (item.durationMs < MIN_CAPTION_MS) errors.push(`${where}: ${item.scene} too short to read`);
    if (format.platforms.some((p) => p.startsWith('app-store') || p === 'google-play')) {
      if (scene.device !== 'none' || scene.kind !== 'ui') {
        errors.push(`${where}: store previews use full-bleed app capture only`);
      }
      if (scene.camera.from.scale !== 1 || scene.camera.to.scale !== 1) {
        errors.push(`${where}: store previews must not zoom (${scene.id})`);
      }
    }
    total += item.durationMs;
  }
  if (total !== format.durationMs) {
    errors.push(`${where}: sequence sums to ${total} ms, expected ${format.durationMs}`);
  }
  for (const id of format.voScenes) {
    const vo = sceneById.get(id)?.vo;
    if (!vo) {
      errors.push(`${where}: voScenes ${id} has no vo`);
      continue;
    }
    const item = format.sequence.find((s) => s.scene === id);
    const fits =
      item && vo.atMs >= item.inMs && vo.atMs + vo.durationMs <= item.inMs + item.durationMs;
    if (!fits) errors.push(`${where}: vo of ${id} falls outside its sequence window`);
  }
  checkStoreLimits(format, errors);
}

/** Returns the list of problems found in a parsed shotlist (empty when valid). */
export function validate(doc) {
  const errors = [];
  const contract = Object.keys(doc.selectorContract?.hooks ?? {});
  const sceneById = new Map();
  for (const scene of doc.scenes) {
    if (sceneById.has(scene.id)) errors.push(`duplicate scene id ${scene.id}`);
    sceneById.set(scene.id, scene);
    checkScene(scene, contract, errors);
  }
  for (const format of doc.formats) checkFormat(format, sceneById, errors);
  return errors;
}

export function loadShotlist(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ?? new URL('./shotlist.json', import.meta.url);
  const doc = loadShotlist(path);
  const errors = validate(doc);
  if (errors.length > 0) {
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  console.log(`✓ shotlist valid: ${doc.scenes.length} scenes, ${doc.formats.length} formats`);
  for (const f of doc.formats) console.log(`  ${f.id.padEnd(22)} ${f.durationMs / 1000} s`);
}
