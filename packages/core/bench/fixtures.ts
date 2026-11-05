/**
 * Deterministic data generators for the benchmarks. Every generator takes a seed so a run is
 * reproducible across machines; sizes are chosen by the scenarios, not here.
 */
import type {
  CalendarEvent,
  Graph,
  GraphEdge,
  GraphNode,
  JournalEntry,
  Priority,
  Task,
  TaskStatus,
  TimeLog,
  Timestamp,
} from '../src/model.ts';
import { DAY, HOUR, MINUTE, fromZoned } from '../src/time.ts';
import type { SearchDoc } from '../src/search/index.ts';

/** Mulberry32: small, fast, good enough for synthetic data. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)] as T;
}

/** Reference "now" of every scenario: Monday 2 November 2026, 08:00 UTC. */
export const NOW: Timestamp = fromZoned({ year: 2026, month: 11, day: 2, hour: 8 }, 'UTC');
export const ZONE = 'Europe/Paris';

const STATUSES: readonly TaskStatus[] = ['inbox', 'todo', 'todo', 'todo', 'doing', 'done'];
const TAGS = ['travail', 'perso', 'urgent', 'important', 'écriture', 'design', 'admin', 'sport'];

export function baseTask(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    createdAt: NOW - 30 * DAY,
    updatedAt: NOW - 30 * DAY,
    title: id,
    status: 'todo',
    priority: 0,
    tags: [],
    dependsOn: [],
    mode: 'organize',
    postponedCount: 0,
    timeLogs: [],
    ...patch,
  };
}

export interface TaskSetOptions {
  seed?: number;
  /** Average number of dependencies per task (each points to an earlier task). */
  depsPerTask?: number;
  /** Dependencies only reach back this many positions, which keeps chains realistic. */
  depWindow?: number;
}

/**
 * `n` tasks forming a DAG (dependencies always point to earlier tasks), with a realistic mix
 * of statuses, priorities, tags, floating days and slots spread around `NOW`.
 */
export function makeTasks(n: number, options: TaskSetOptions = {}): Task[] {
  const rand = rng(options.seed ?? 1);
  const depsPerTask = options.depsPerTask ?? 1.5;
  const depWindow = options.depWindow ?? 200;
  const tasks: Task[] = [];
  for (let i = 0; i < n; i++) {
    const dependsOn: string[] = [];
    const deps = i === 0 ? 0 : Math.floor(rand() * (2 * depsPerTask + 1));
    for (let d = 0; d < deps; d++) {
      const back = 1 + Math.floor(rand() * Math.min(i, depWindow));
      dependsOn.push(`t${i - back}`);
    }
    const status = pick(rand, STATUSES);
    const createdAt = NOW - Math.floor(rand() * 120) * DAY;
    const task = baseTask(`t${i}`, {
      createdAt,
      updatedAt: createdAt,
      title: `Tâche ${i}`,
      status,
      priority: Math.floor(rand() * 4) as Priority,
      tags: [pick(rand, TAGS)],
      dependsOn,
      mode: rand() < 0.4 ? 'create' : 'organize',
      postponedCount: Math.floor(rand() * 6),
      estimateMin: 15 + 15 * Math.floor(rand() * 8),
    });
    const plan = rand();
    if (plan < 0.15) task.floatingDay = NOW + Math.floor(rand() * 14 - 7) * DAY;
    else if (plan < 0.3) {
      const start = NOW + Math.floor(rand() * 14 * 24 - 7 * 24) * HOUR;
      task.scheduled = { start, end: start + 30 * MINUTE };
    }
    if (status === 'done') task.completedAt = createdAt + DAY;
    tasks.push(task);
  }
  return tasks;
}

/** `count` events spread over the working hours of `days` days starting at `start`. */
export function makeEvents(
  count: number,
  start: Timestamp,
  days: number,
  seed = 2,
): CalendarEvent[] {
  const rand = rng(seed);
  const events: CalendarEvent[] = [];
  for (let i = 0; i < count; i++) {
    const day = Math.floor(rand() * days);
    const begin =
      start +
      day * DAY +
      (8 + Math.floor(rand() * 9)) * HOUR +
      15 * MINUTE * Math.floor(rand() * 4);
    const length = 15 * MINUTE * (1 + Math.floor(rand() * 6));
    events.push({
      id: `e${i}`,
      createdAt: NOW,
      updatedAt: NOW,
      title: `Réunion ${i}`,
      start: begin,
      end: begin + length,
      timeZone: ZONE,
      fixed: rand() < 0.7,
      kind: rand() < 0.8 ? 'meeting' : 'focus',
      attendees: [],
      tags: [],
    });
  }
  return events;
}

/** Tasks to route: open, unscheduled, some with deadlines and dependencies. */
export function makeRoutableTasks(n: number, seed = 3): Task[] {
  const rand = rng(seed);
  const tasks: Task[] = [];
  for (let i = 0; i < n; i++) {
    const task = baseTask(`r${i}`, {
      priority: Math.floor(rand() * 4) as Priority,
      estimateMin: 15 + 15 * Math.floor(rand() * 8),
      mode: rand() < 0.4 ? 'create' : 'organize',
      dependsOn: i > 0 && rand() < 0.2 ? [`r${Math.floor(rand() * i)}`] : [],
    });
    if (rand() < 0.3) task.deadline = NOW + Math.floor(1 + rand() * 30) * DAY;
    if (rand() < 0.3) task.energy = pick(rand, ['low', 'medium', 'high'] as const);
    tasks.push(task);
  }
  return tasks;
}

/** Hand-written realistic French and English capture lines. */
export const CAPTURE_LINES: readonly string[] = [
  'Appeler Marie demain à 14h #perso',
  'Réunion avec Paul et Léa jeudi de 10h à 11h30 au bureau',
  'Rendre le rapport trimestriel avant vendredi 18h !!',
  'Courir 30 min tous les lundis à 7h',
  'Écrire le chapitre 3 la semaine prochaine pendant 2h #écriture',
  'Payer le loyer le 5 de chaque mois',
  'Déjeuner avec Camille le 12/03 à midi',
  'Préparer la présentation pour le client dans 3 jours',
  'Call with John tomorrow at 3pm for 45 minutes',
  'Finish the design review by Friday #design !!!',
  'Dentist appointment next Tuesday at 9:30am',
  'Water the plants every other day',
  'Brainstorm new product ideas this evening',
  'Send the invoice to ACME before the end of the month',
  'Lire 20 pages ce soir',
  'Planifier les vacances en juillet',
];

const WORDS = [
  'projet',
  'réunion',
  'client',
  'rapport',
  'idée',
  'design',
  'tâche',
  'calendrier',
  'note',
  'graphe',
  'écriture',
  'chapitre',
  'roman',
  'budget',
  'facture',
  'voyage',
  'sport',
  'lecture',
  'musique',
  'recherche',
  'créativité',
  'concentration',
  'énergie',
  'matin',
  'soir',
  'semaine',
  'objectif',
  'habitude',
  'journal',
  'brouillon',
  'synthèse',
  'priorité',
  'équipe',
  'produit',
  'meeting',
  'draft',
  'review',
  'focus',
  'deadline',
  'planning',
  'sketch',
  'outline',
  'garden',
  'kitchen',
  'invoice',
  'travel',
  'family',
  'health',
  'reading',
  'writing',
  'music',
  'growth',
];

/** A word drawn from a Zipf-like distribution over a synthetic vocabulary of `vocab` words. */
function zipfWord(rand: () => number, vocab: number): string {
  const rank = Math.floor(Math.pow(vocab, rand()));
  const base = WORDS[rank % WORDS.length] as string;
  return rank < WORDS.length ? base : `${base}${Math.floor(rank / WORDS.length)}`;
}

/** `n` search documents with Zipf-distributed vocabulary (`vocab` distinct words). */
export function makeSearchDocs(n: number, seed = 4, vocab = 20_000): SearchDoc[] {
  const rand = rng(seed);
  const collections = ['tasks', 'notes', 'events', 'journal'] as const;
  const docs: SearchDoc[] = [];
  for (let i = 0; i < n; i++) {
    const title = Array.from({ length: 3 + Math.floor(rand() * 5) }, () => zipfWord(rand, vocab));
    const body = Array.from({ length: 20 + Math.floor(rand() * 80) }, () => zipfWord(rand, vocab));
    docs.push({
      id: `d${i}`,
      collection: pick(rand, collections),
      title: title.join(' '),
      body: body.join(' '),
      tags: [pick(rand, TAGS)],
      updatedAt: NOW - i * MINUTE,
    });
  }
  return docs;
}

/** A connected-ish random graph: a spanning tree plus `extraEdgeRatio · n` random edges. */
export function makeGraph(n: number, seed = 5, extraEdgeRatio = 0.5): Graph {
  const rand = rng(seed);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: `n${i}`,
      label: `Idée ${i}`,
      kind: 'idea',
      x: rand() * 2000,
      y: rand() * 2000,
    });
    if (i > 0) edges.push({ id: `te${i}`, from: `n${Math.floor(rand() * i)}`, to: `n${i}` });
  }
  const extra = Math.floor(n * extraEdgeRatio);
  for (let i = 0; i < extra; i++) {
    const from = Math.floor(rand() * n);
    const to = Math.floor(rand() * n);
    if (from !== to) edges.push({ id: `xe${i}`, from: `n${from}`, to: `n${to}` });
  }
  return { id: 'g', createdAt: NOW, updatedAt: NOW, title: 'Bench', nodes, edges };
}

/**
 * One year of activity ending at `NOW`: ~`perDay` tasks created per day, most completed with
 * one to three focus logs inside waking hours, plus one journal entry per day.
 */
export function makeYearOfLogs(
  perDay = 8,
  seed = 6,
): { tasks: Task[]; journal: JournalEntry[]; events: CalendarEvent[] } {
  const rand = rng(seed);
  const tasks: Task[] = [];
  const journal: JournalEntry[] = [];
  const start = NOW - 365 * DAY;
  for (let d = 0; d < 365; d++) {
    const dayStart = start + d * DAY;
    for (let k = 0; k < perDay; k++) {
      const timeLogs: TimeLog[] = [];
      const logs = 1 + Math.floor(rand() * 3);
      for (let l = 0; l < logs; l++) {
        const begin = dayStart + (7 + Math.floor(rand() * 14)) * HOUR;
        timeLogs.push({
          start: begin,
          end: begin + (10 + Math.floor(rand() * 50)) * MINUTE,
          kind: 'focus',
        });
      }
      const done = rand() < 0.75;
      const id = `y${d}-${k}`;
      const task = baseTask(id, {
        createdAt: dayStart,
        updatedAt: dayStart,
        title: `Tâche ${id}`,
        status: done ? 'done' : pick(rand, ['todo', 'doing', 'inbox'] as const),
        tags: [pick(rand, TAGS)],
        mode: rand() < 0.45 ? 'create' : 'organize',
        projectId: `p${Math.floor(rand() * 12)}`,
        estimateMin: 15 + 15 * Math.floor(rand() * 6),
        timeLogs,
      });
      if (done) task.completedAt = dayStart + 20 * HOUR;
      if (rand() < 0.2) task.deadline = dayStart + Math.floor(rand() * 5) * DAY;
      tasks.push(task);
    }
    journal.push({
      id: `j${d}`,
      createdAt: dayStart + 21 * HOUR,
      updatedAt: dayStart + 21 * HOUR,
      kind: pick(rand, ['friction', 'win', 'dump'] as const),
      text: `${pick(rand, WORDS)} ${pick(rand, WORDS)} ${pick(rand, WORDS)} bloqué par ${pick(rand, WORDS)}`,
      tags: [],
    });
  }
  const events = makeEvents(365 * 3, start, 365, seed + 1);
  return { tasks, journal, events };
}
