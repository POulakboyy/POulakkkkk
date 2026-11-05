/**
 * Large, deterministic data set for the UI stress test. `buildDataset` is pure so it can be
 * unit-tested in Node and serialised into the page, where `seedInPage` writes it through the
 * real store API (one undoable batch per collection).
 */

export const DEFAULT_COUNTS = { tasks: 5000, events: 2000, notes: 1000, nodes: 2000 };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Mulberry32: small, fast, seedable PRNG so every run builds the same records. */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  'plan',
  'review',
  'draft',
  'call',
  'design',
  'budget',
  'roadmap',
  'client',
  'launch',
  'notes',
  'sprint',
  'audit',
  'invoice',
  'research',
  'prototype',
  'meeting',
  'essay',
  'sketch',
  'deploy',
  'interview',
  'workshop',
  'outline',
  'refactor',
  'podcast',
  'poster',
];
const TAGS = ['work', 'home', 'deep', 'admin', 'creative', 'health', 'study'];
// No `doing`: only one task runs at a time in the app.
const STATUSES = ['inbox', 'todo', 'todo', 'todo', 'done', 'done'];
const MODES = ['create', 'organize'];
const KINDS = ['meeting', 'focus', 'personal', 'travel'];

function words(rand, n) {
  return Array.from({ length: n }, () => WORDS[Math.floor(rand() * WORDS.length)]).join(' ');
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

function task(rand, i, now) {
  const status = pick(rand, STATUSES);
  const record = {
    title: `${words(rand, 3)} #${i}`,
    status,
    priority: Math.floor(rand() * 4),
    tags: [pick(rand, TAGS)],
    dependsOn: [],
    mode: pick(rand, MODES),
    postponedCount: Math.floor(rand() * 3),
    timeLogs: [],
    estimateMin: 15 * (1 + Math.floor(rand() * 8)),
  };
  if (rand() < 0.3) record.deadline = now + Math.floor((rand() * 60 - 10) * DAY);
  if (status === 'done') record.completedAt = now - Math.floor(rand() * 90 * DAY);
  return record;
}

function event(rand, now, timeZone) {
  // Spread over ± 6 months, aligned on quarter hours inside the day.
  const day = Math.floor((rand() * 365 - 182) * DAY);
  const start = Math.floor((now + day) / (15 * MINUTE)) * 15 * MINUTE;
  return {
    title: words(rand, 2),
    start,
    end: start + 15 * MINUTE * (2 + Math.floor(rand() * 8)),
    timeZone,
    fixed: rand() < 0.5,
    kind: pick(rand, KINDS),
    attendees: [],
    tags: [pick(rand, TAGS)],
  };
}

function note(rand, i) {
  const paragraphs = Array.from({ length: 3 }, () => `${words(rand, 18)}.`).join('\n\n');
  return {
    title: `${words(rand, 2)} ${i}`,
    body: `# ${words(rand, 3)}\n\n${paragraphs}\n\n- ${words(rand, 4)}\n- ${words(rand, 4)}`,
    tags: [pick(rand, TAGS)],
    links: [],
  };
}

/** A 2k-node mind map: a grid of clusters, each cluster a hub linked to its children. */
function graph(rand, count) {
  const nodes = [];
  const edges = [];
  const perCluster = 20;
  const columns = Math.ceil(Math.sqrt(count / perCluster));
  for (let i = 0; i < count; i++) {
    const cluster = Math.floor(i / perCluster);
    const hub = cluster * perCluster;
    const angle = ((i % perCluster) / perCluster) * Math.PI * 2;
    const cx = (cluster % columns) * 900;
    const cy = Math.floor(cluster / columns) * 900;
    const isHub = i === hub;
    nodes.push({
      id: `perf-n${i}`,
      label: isHub ? `Cluster ${cluster}` : words(rand, 2),
      kind: isHub ? 'group' : 'idea',
      x: isHub ? cx : cx + Math.cos(angle) * 320,
      y: isHub ? cy : cy + Math.sin(angle) * 320,
    });
    if (!isHub) edges.push({ id: `perf-e${i}`, from: `perf-n${hub}`, to: `perf-n${i}` });
  }
  return { title: 'Perf · 2k nodes', nodes, edges };
}

/** Plain-data records for every collection, ready for `store.create`. */
export function buildDataset(counts = DEFAULT_COUNTS, now = Date.now(), timeZone = 'Europe/Paris') {
  const rand = prng(42);
  return {
    tasks: Array.from({ length: counts.tasks }, (_, i) => task(rand, i, now)),
    events: Array.from({ length: counts.events }, () => event(rand, now, timeZone)),
    notes: Array.from({ length: counts.notes }, (_, i) => note(rand, i)),
    graph: graph(rand, counts.nodes),
  };
}

/**
 * Runs in the page (serialised by Playwright): writes the data set through the store exposed by
 * perf builds and returns the time each collection took, in milliseconds.
 */
export async function seedInPage(data) {
  const handle = globalThis.__pouxis;
  if (!handle) throw new Error('Perf hook missing: build with VITE_POUXIS_PERF=1');
  const { store } = handle;
  while (!store.isReady()) await new Promise((r) => setTimeout(r, 20));
  const timings = {};
  const time = (name, fn) => {
    const t0 = performance.now();
    store.batch(fn, `perf:${name}`);
    timings[name] = Math.round(performance.now() - t0);
  };
  time('tasks', () => data.tasks.forEach((r) => store.create('tasks', r)));
  time('events', () => data.events.forEach((r) => store.create('events', r)));
  time('notes', () => data.notes.forEach((r) => store.create('notes', r)));
  let graphId = '';
  time('graph', () => {
    graphId = store.create('graphs', data.graph).id;
  });
  return { timings, graphId };
}
