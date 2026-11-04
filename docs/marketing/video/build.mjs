#!/usr/bin/env node
// Builds derived files from shotlist.json so they never drift from it:
//  - subtitles/<format>.<lang>.srt for every format with voice-over;
//  - the shot tables of STORYBOARD.md, between <!-- shots:<format>:begin/end --> markers.
// Usage: node docs/marketing/video/build.mjs [--check]   (--check: fail if files are stale)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadShotlist, validate } from './validate-shotlist.mjs';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const LANGS = ['fr', 'en'];
const MAX_LINE = 42;

/** 65_432 → "00:01:05,432" (SRT). */
export function srtTime(ms) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

/** 65_432 → "01:05.43" (storyboard). */
export function shortTime(ms) {
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(2).padStart(5, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}

/** Splits text into clauses, keeping the punctuation (and French spacing) with each clause. */
export function clauses(text) {
  return text.match(/[^.?!:;,…]+(?:\s?[.?!:;,…]+)?\s*/g)?.map((c) => c.trim()) ?? [text];
}

/**
 * Breaks a cue into at most two lines of ≤ `max` characters, preferring a break after
 * punctuation, then the most balanced split. Returns null when two lines cannot hold it.
 */
export function twoLines(text, max = MAX_LINE) {
  if (text.length <= max) return [text];
  let best = null;
  let bestScore = Infinity;
  for (let i = text.indexOf(' '); i !== -1; i = text.indexOf(' ', i + 1)) {
    const a = text.slice(0, i);
    const b = text.slice(i + 1);
    if (a.length > max || b.length > max) continue;
    const score = Math.abs(a.length - b.length) - (/[.?!:;,…]$/.test(a) ? 30 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }
  return best;
}

/** Packs clauses greedily into cues that each fit on two lines. */
export function packCues(text, max = MAX_LINE) {
  const cues = [];
  let current = '';
  for (const clause of clauses(text)) {
    const candidate = current ? `${current} ${clause}` : clause;
    if (twoLines(candidate, max)) current = candidate;
    else {
      if (current) cues.push(current);
      current = clause;
    }
  }
  if (current) cues.push(current);
  return cues;
}

/** Splits one VO line into subtitle cues, timing each by its share of characters. */
export function toCues(text, startMs, durationMs) {
  const groups = packCues(text);
  const total = groups.reduce((n, g) => n + g.length, 0);
  let t = startMs;
  return groups.map((g, i) => {
    const last = i === groups.length - 1;
    const end = last ? startMs + durationMs : Math.round(t + (durationMs * g.length) / total);
    const lines = twoLines(g) ?? [g];
    const cue = { start: t, end, text: lines.join('\n') };
    t = end;
    return cue;
  });
}

/** VO cues of a format in programme time, clipped to each scene's window. */
export function formatCues(format, sceneById, lang) {
  const cues = [];
  let offset = 0;
  for (const item of format.sequence) {
    const scene = sceneById.get(item.scene);
    const vo = scene?.vo;
    const winEnd = item.inMs + item.durationMs;
    if (vo && format.voScenes.includes(scene.id) && vo.atMs >= item.inMs) {
      if (vo.atMs + vo.durationMs <= winEnd) {
        cues.push(...toCues(vo[lang], offset + vo.atMs - item.inMs, vo.durationMs));
      }
    }
    offset += item.durationMs;
  }
  return cues;
}

export function toSrt(cues) {
  return cues
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join('\n');
}

const DEVICE_LABEL = {
  iphone: 'iPhone',
  android: 'Android',
  macbook: 'MacBook',
  'windows-laptop': 'PC Windows',
  none: '—',
};

const cell = (s) =>
  String(s ?? '—')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ⏎ ');

function cameraLabel(c) {
  const f = c.from;
  const t = c.to;
  if (f.scale === t.scale && f.x === t.x && f.y === t.y) return `fixe ×${f.scale}`;
  return `×${f.scale} (${f.x}, ${f.y}) → ×${t.scale} (${t.x}, ${t.y}), ${c.easing}`;
}

/** Markdown shot table for one format. */
export function storyboardTable(format, sceneById) {
  const head =
    '| TC | Durée | Plan | Appareil · route · thème | Interaction scriptée | Caméra | Texte à l’écran FR / EN | Voix off (FR) | Musique / SFX | Transition |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';
  let t = 0;
  const rows = format.sequence.map((item) => {
    const s = sceneById.get(item.scene);
    const device =
      s.kind === 'composite'
        ? s.composite.panes.map((p) => DEVICE_LABEL[p.device]).join(' + ')
        : DEVICE_LABEL[s.device];
    const where = s.route
      ? `${device} · \`${s.route}\` · ${s.theme}`
      : `${device} · carton · ${s.theme}`;
    const trim = item.inMs ? ` (in ${item.inMs} ms)` : '';
    const voice = format.voScenes.includes(s.id) && s.vo ? s.vo.fr : '—';
    const row = [
      shortTime(t),
      `${(item.durationMs / 1000).toFixed(2)} s${trim}`,
      `\`${s.id}\``,
      where,
      s.notes?.interaction,
      cameraLabel(s.camera),
      `${s.caption.fr} / ${s.caption.en}`,
      voice,
      s.notes?.sound,
      `${s.transition.type}${s.transition.durationMs ? ` ${s.transition.durationMs} ms` : ''}`,
    ];
    t += item.durationMs;
    return `| ${row.map(cell).join(' | ')} |`;
  });
  return [head, ...rows].join('\n');
}

function replaceBetween(source, id, body) {
  const begin = `<!-- shots:${id}:begin -->`;
  const end = `<!-- shots:${id}:end -->`;
  const i = source.indexOf(begin);
  const j = source.indexOf(end);
  if (i === -1 || j === -1) return source;
  return `${source.slice(0, i + begin.length)}\n${body}\n${source.slice(j)}`;
}

/** Formats markdown with the repo's Prettier config when available, so --check stays stable. */
async function formatMarkdown(md, filepath) {
  try {
    const prettier = await import('prettier');
    const config = (await prettier.resolveConfig(filepath)) ?? {};
    return await prettier.format(md, { ...config, filepath });
  } catch {
    return md;
  }
}

async function main() {
  const check = process.argv.includes('--check');
  const doc = loadShotlist(new URL('./shotlist.json', import.meta.url));
  const errors = validate(doc);
  if (errors.length > 0) {
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  const sceneById = new Map(doc.scenes.map((s) => [s.id, s]));
  const outputs = new Map();
  for (const format of doc.formats) {
    if (format.voScenes.length === 0) continue;
    for (const lang of LANGS) {
      const cues = formatCues(format, sceneById, lang);
      outputs.set(`${DIR}subtitles/${format.id}.${lang}.srt`, toSrt(cues));
    }
  }
  const storyboardPath = `${DIR}STORYBOARD.md`;
  if (existsSync(storyboardPath)) {
    let md = readFileSync(storyboardPath, 'utf8');
    for (const format of doc.formats)
      md = replaceBetween(md, format.id, storyboardTable(format, sceneById));
    outputs.set(storyboardPath, await formatMarkdown(md, storyboardPath));
  }
  let stale = 0;
  for (const [path, content] of outputs) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (current === content) continue;
    stale += 1;
    if (check) console.error(`✗ stale: ${path}`);
    else writeFileSync(path, content);
  }
  if (check && stale > 0) process.exit(1);
  console.log(check ? '✓ derived files up to date' : `✓ wrote ${stale} file(s)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
