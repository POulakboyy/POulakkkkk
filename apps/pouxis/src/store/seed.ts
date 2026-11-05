import { addDays, atMinutes, DAY, MINUTE, startOfDay, startOfWeek, weekday } from '@pouxis/core';
import type { CalendarEvent, Graph, Task, TimeLog, TimeZone } from '@pouxis/core';
import type { NewRecord, Store } from './types.ts';

/**
 * First-run demo content: one lived-in week so every view (today, calendar, tasks, ideas,
 * canvas, insights) looks real in demos and screenshots. Ids are deterministic, so two devices
 * seeded separately converge to one copy once they sync, and a deletion on one wins everywhere.
 * Times are relative to the current week in the user's zone.
 */
export function seedDemo(store: Store, now: number = Date.now()): void {
  const { timeZone } = store.prefs();
  const ctx = context(now, timeZone);
  store.batch(() => {
    seedEvents(store, ctx);
    seedTasks(store, ctx);
    seedNotes(store, ctx);
    seedJournal(store, ctx);
    seedGraph(store);
  }, 'seed');
}

interface SeedContext {
  timeZone: TimeZone;
  now: number;
  today: number;
  monday: number;
  /** Instant at `h:m` on `day` (start of a local day). */
  at(day: number, h: number, m?: number): number;
  /** Start of the local day `offset` days from today. */
  day(offset: number): number;
  /** Start of the local day of the current week, 0 = Monday. */
  weekDay(index: number): number;
}

function context(now: number, timeZone: TimeZone): SeedContext {
  const today = startOfDay(now, timeZone);
  const monday = startOfWeek(now, timeZone, 1);
  return {
    timeZone,
    now,
    today,
    monday,
    at: (day, h, m = 0) => atMinutes(day, h * 60 + m, timeZone),
    day: (offset) => addDays(today, offset, timeZone),
    weekDay: (index) => addDays(monday, index, timeZone),
  };
}

const id = (kind: string, n: number): string => `seed-${kind}-${String(n).padStart(2, '0')}`;

/* ------------------------------------------------------------------------------------------ */
/* Calendar                                                                                    */
/* ------------------------------------------------------------------------------------------ */

type EventSeed = Omit<NewRecord<'events'>, 'timeZone' | 'fixed' | 'attendees' | 'tags'> &
  Partial<Pick<CalendarEvent, 'fixed' | 'attendees' | 'tags'>>;

function seedEvents(store: Store, c: SeedContext): void {
  const events: EventSeed[] = [];
  const add = (e: EventSeed): void => void events.push(e);

  // A recurring series is stored once; the calendar expands its occurrences.
  add({
    title: 'Point d’équipe',
    start: c.at(c.weekDay(0), 9, 30),
    end: c.at(c.weekDay(0), 9, 45),
    kind: 'meeting',
    attendees: ['Inès', 'Malo', 'Sacha'],
    tags: ['équipe'],
    recurrence: 'tous les jours ouvrés à 9h30',
    icon: '☀️',
    color: 4,
  });
  for (let d = 0; d < 5; d++) {
    const day = c.weekDay(d);
    add({
      title: 'Déjeuner',
      start: c.at(day, 12, 30),
      end: c.at(day, 13, 30),
      kind: 'personal',
      icon: '🥗',
      color: 3,
      fixed: false,
    });
  }
  const mon = c.weekDay(0);
  const tue = c.weekDay(1);
  const wed = c.weekDay(2);
  const thu = c.weekDay(3);
  const fri = c.weekDay(4);
  const sat = c.weekDay(5);
  add({
    title: 'Revue produit',
    start: c.at(mon, 14),
    end: c.at(mon, 15),
    kind: 'meeting',
    attendees: ['Inès', 'Léa'],
    tags: ['produit'],
    location: 'Salle Lumière',
    icon: '💬',
    color: 4,
    notes: 'Arbitrer le périmètre de la v1 de l’onboarding.',
  });
  add({
    title: 'Bloc création — maquettes',
    start: c.at(tue, 8, 30),
    end: c.at(tue, 11, 30),
    kind: 'focus',
    icon: '🎨',
    color: 1,
    fixed: false,
  });
  add({
    title: 'Appel client — Atelier Nord',
    start: c.at(tue, 15),
    end: c.at(tue, 15, 45),
    kind: 'meeting',
    attendees: ['Camille Roux'],
    tags: ['client'],
    location: 'Visio',
    icon: '📞',
    color: 6,
  });
  add({
    title: 'Trajet vers le studio',
    start: c.at(wed, 8, 15),
    end: c.at(wed, 8, 50),
    kind: 'travel',
    icon: '🚲',
    color: 7,
  });
  add({
    title: 'Atelier d’idéation',
    start: c.at(wed, 10),
    end: c.at(wed, 12),
    kind: 'meeting',
    attendees: ['Malo', 'Sacha', 'Léa'],
    tags: ['idées'],
    location: 'Studio',
    icon: '💡',
    color: 2,
  });
  add({
    title: 'Tampon',
    start: c.at(wed, 12),
    end: c.at(wed, 12, 15),
    kind: 'buffer',
    fixed: false,
  });
  add({
    title: 'Entretien — designer produit',
    start: c.at(thu, 11),
    end: c.at(thu, 12),
    kind: 'meeting',
    attendees: ['Noé Martin'],
    tags: ['recrutement'],
    icon: '🤝',
    color: 5,
  });
  add({
    title: 'Deep work — écriture',
    start: c.at(thu, 14),
    end: c.at(thu, 17),
    kind: 'focus',
    icon: '✍️',
    color: 1,
    fixed: false,
  });
  add({
    title: 'Rétrospective de la semaine',
    start: c.at(fri, 16),
    end: c.at(fri, 16, 45),
    kind: 'meeting',
    attendees: ['Inès', 'Malo', 'Sacha', 'Léa'],
    tags: ['équipe'],
    recurrence: 'chaque vendredi à 16h',
    icon: '🔁',
    color: 4,
  });
  add({
    title: 'Course au parc',
    start: c.at(sat, 9),
    end: c.at(sat, 10),
    kind: 'personal',
    recurrence: 'tous les samedis à 9h',
    icon: '🏃',
    color: 3,
    fixed: false,
  });
  add({
    title: 'Concert — Philharmonie',
    start: c.at(sat, 20),
    end: c.at(sat, 22, 30),
    kind: 'personal',
    location: 'Philharmonie de Paris',
    icon: '🎻',
    color: 8,
  });

  events.forEach((e, i) =>
    store.create('events', {
      fixed: true,
      attendees: [],
      tags: [],
      ...e,
      timeZone: c.timeZone,
      id: id('event', i + 1),
      createdAt: c.monday - 3 * DAY + i * MINUTE,
    }),
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Tasks                                                                                       */
/* ------------------------------------------------------------------------------------------ */

type TaskSeed = Partial<NewRecord<'tasks'>> & Pick<Task, 'title' | 'mode'>;

/** Deterministic PRNG (mulberry32): the demo looks the same on every run. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Typical focus hours: a morning peak, a post-lunch dip, a late-afternoon rebound. */
const FOCUS_HOURS = [8, 9, 9, 10, 10, 10, 11, 14, 15, 16, 16, 17];

/** Four weeks of focus sessions, oldest first, at plausible hours. */
export function focusSessions(c: Pick<SeedContext, 'day' | 'at' | 'timeZone'>): TimeLog[] {
  const random = prng(7);
  const out: TimeLog[] = [];
  for (let offset = 28; offset >= 1; offset--) {
    const day = c.day(-offset);
    const dow = weekday(day, c.timeZone);
    const count = dow === 0 || dow === 6 ? Math.floor(random() * 2) : 2 + Math.floor(random() * 3);
    const hours = new Set<number>();
    for (let s = 0; s < count; s++) {
      hours.add(FOCUS_HOURS[Math.floor(random() * FOCUS_HOURS.length)] ?? 10);
    }
    for (const hour of [...hours].sort((a, b) => a - b)) {
      const start = c.at(day, hour, Math.floor(random() * 4) * 5);
      const length = (25 + Math.floor(random() * 5) * 10) * MINUTE;
      out.push({ start, end: start + length, kind: 'focus' });
    }
  }
  return out;
}

/**
 * Spreads the focus sessions over tasks: each finished task receives sessions before its
 * completion worth about its estimate (so estimate accuracy looks realistic), the rest goes
 * round-robin to the open tasks in `fallback`. Each session is followed by a 5-minute break.
 */
export function assignSessions(
  tasks: readonly TaskSeed[],
  sessions: readonly TimeLog[],
  fallback: readonly number[],
): TimeLog[][] {
  const out: TimeLog[][] = tasks.map(() => []);
  const free = [...sessions];
  const finished = tasks
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.status === 'done' && t.completedAt !== undefined)
    .sort((a, b) => (a.t.completedAt ?? 0) - (b.t.completedAt ?? 0));
  for (const { t, i } of finished) {
    let budget = (t.estimateMin ?? 30) * MINUTE * 1.15;
    for (let k = free.length - 1; k >= 0 && budget > 0; k--) {
      const session = free[k];
      if (!session || session.end > (t.completedAt ?? 0)) continue;
      const length = session.end - session.start;
      // Avoid overshooting the estimate by a long session once some time is logged.
      if (out[i]?.length && length > budget + 15 * MINUTE) continue;
      out[i]?.push(session);
      budget -= length;
      free.splice(k, 1);
    }
  }
  free.forEach((session, k) => out[fallback[k % fallback.length] ?? 0]?.push(session));
  return out.map((logs) =>
    logs
      .sort((a, b) => a.start - b.start)
      .flatMap((l) => [l, { start: l.end, end: l.end + 5 * MINUTE, kind: 'break' as const }]),
  );
}

function seedTasks(store: Store, c: SeedContext): void {
  const T = (n: number): string => id('task', n);
  const tasks: TaskSeed[] = [
    // Today
    {
      title: 'Esquisser la nouvelle page d’accueil',
      status: 'doing',
      priority: 3,
      mode: 'create',
      estimateMin: 90,
      energy: 'high',
      important: true,
      tags: ['design'],
      projectId: 'seed-project-site',
      scheduled: { start: c.at(c.today, 10), end: c.at(c.today, 11, 30) },
      icon: '✏️',
      color: 1,
    },
    {
      title: 'Répondre aux retours clients',
      priority: 2,
      mode: 'organize',
      estimateMin: 30,
      energy: 'low',
      floatingDay: c.today,
      tags: ['client'],
      icon: '📮',
      color: 2,
    },
    {
      title: 'Enregistrer la voix-off de la vidéo',
      priority: 2,
      mode: 'create',
      estimateMin: 60,
      energy: 'medium',
      tags: ['vidéo'],
      dependsOn: [T(4)],
      scheduled: { start: c.at(c.today, 14), end: c.at(c.today, 15) },
      icon: '🎙️',
      color: 5,
    },
    {
      title: 'Finaliser le script de la vidéo',
      priority: 3,
      mode: 'create',
      estimateMin: 45,
      deadline: c.at(c.today, 13),
      tags: ['vidéo'],
      icon: '📝',
      color: 5,
    },
    {
      title: 'Préparer la facture du mois',
      status: 'inbox',
      priority: 1,
      mode: 'organize',
      estimateMin: 20,
      tags: ['admin'],
      icon: '🧾',
      color: 8,
    },
    // This week
    {
      title: 'Prototype interactif de l’onboarding',
      priority: 3,
      mode: 'create',
      estimateMin: 180,
      energy: 'high',
      important: true,
      projectId: 'seed-project-site',
      dependsOn: [T(1)],
      deadline: c.at(c.weekDay(4), 18),
      tags: ['design'],
      icon: '🧩',
      color: 1,
    },
    {
      title: 'Test utilisateur avec cinq personnes',
      priority: 2,
      mode: 'organize',
      estimateMin: 120,
      projectId: 'seed-project-site',
      dependsOn: [T(6)],
      floatingDay: c.weekDay(4),
      tags: ['recherche'],
      icon: '🔍',
      color: 6,
    },
    {
      title: 'Écrire l’article « Créer sans s’épuiser »',
      priority: 2,
      mode: 'create',
      estimateMin: 120,
      energy: 'high',
      tags: ['écriture'],
      floatingDay: c.weekDay(3),
      icon: '✍️',
      color: 1,
      postponedCount: 2,
    },
    {
      title: 'Relire le contrat de l’Atelier Nord',
      priority: 3,
      mode: 'organize',
      estimateMin: 40,
      deadline: c.at(c.weekDay(2), 17),
      important: true,
      tags: ['client', 'admin'],
      icon: '📑',
      color: 6,
    },
    {
      title: 'Choisir la palette de la marque',
      priority: 1,
      mode: 'create',
      estimateMin: 45,
      projectId: 'seed-project-site',
      tags: ['design'],
      icon: '🎨',
      color: 1,
    },
    {
      title: 'Mettre à jour le planning de production',
      priority: 1,
      mode: 'organize',
      estimateMin: 25,
      energy: 'low',
      floatingDay: c.weekDay(0),
      icon: '🗓️',
      color: 7,
    },
    {
      title: 'Envoyer le devis à Atelier Nord',
      priority: 2,
      mode: 'organize',
      estimateMin: 15,
      dependsOn: [T(9)],
      tags: ['client'],
      icon: '✉️',
      color: 6,
    },
    // Recurring
    {
      title: 'Revue hebdomadaire',
      priority: 2,
      mode: 'organize',
      estimateMin: 30,
      recurrence: 'chaque vendredi à 16h',
      icon: '🧭',
      color: 7,
    },
    {
      title: 'Pages du matin',
      priority: 1,
      mode: 'create',
      estimateMin: 20,
      recurrence: 'tous les jours à 8h',
      energy: 'medium',
      icon: '📓',
      color: 2,
    },
    {
      title: 'Payer le loyer de l’atelier',
      priority: 3,
      mode: 'organize',
      estimateMin: 5,
      recurrence: 'le premier lundi de chaque mois à 10h',
      tags: ['admin'],
      icon: '🏠',
      color: 8,
    },
    {
      title: 'Arroser les plantes',
      priority: 0,
      mode: 'organize',
      estimateMin: 5,
      recurrence: 'chaque mardi et jeudi à 9h',
      icon: '🪴',
      color: 3,
      geo: { lat: 48.8662, lng: 2.3622, radiusM: 120, label: 'Studio' },
    },
    // Inbox / someday
    {
      title: 'Idée : série de podcasts sur la créativité',
      status: 'inbox',
      priority: 0,
      mode: 'create',
      tags: ['idées'],
      icon: '🎧',
      color: 2,
    },
    {
      title: 'Trier les photos du voyage',
      status: 'inbox',
      priority: 0,
      mode: 'organize',
      estimateMin: 60,
      energy: 'low',
      icon: '🖼️',
      color: 3,
    },
    {
      title: 'Lire « Deep Work » — chapitre 3',
      status: 'inbox',
      priority: 1,
      mode: 'create',
      estimateMin: 40,
      tags: ['lecture'],
      icon: '📚',
      color: 2,
    },
    {
      title: 'Renouveler l’assurance du matériel',
      priority: 2,
      mode: 'organize',
      estimateMin: 20,
      deadline: c.at(c.day(9), 12),
      tags: ['admin'],
      icon: '🛡️',
      color: 8,
      postponedCount: 4,
    },
    // Done (carry the focus history)
    {
      title: 'Moodboard de la nouvelle identité',
      status: 'done',
      priority: 2,
      mode: 'create',
      estimateMin: 90,
      projectId: 'seed-project-site',
      completedAt: c.at(c.day(-2), 17),
      tags: ['design'],
      icon: '🌈',
      color: 1,
    },
    {
      title: 'Entretiens exploratoires — synthèse',
      status: 'done',
      priority: 3,
      mode: 'create',
      estimateMin: 120,
      completedAt: c.at(c.day(-5), 16),
      tags: ['recherche'],
      icon: '🗂️',
      color: 6,
    },
    {
      title: 'Déclarer la TVA du trimestre',
      status: 'done',
      priority: 3,
      mode: 'organize',
      estimateMin: 45,
      completedAt: c.at(c.day(-8), 11),
      tags: ['admin'],
      icon: '💶',
      color: 8,
    },
    {
      title: 'Storyboard de la vidéo de lancement',
      status: 'done',
      priority: 2,
      mode: 'create',
      estimateMin: 150,
      completedAt: c.at(c.day(-1), 12),
      tags: ['vidéo'],
      icon: '🎬',
      color: 5,
    },
    {
      title: 'Ranger le dossier « Clients 2025 »',
      status: 'done',
      priority: 1,
      mode: 'organize',
      estimateMin: 30,
      completedAt: c.at(c.day(-12), 15),
      icon: '🗄️',
      color: 7,
    },
    {
      title: 'Écrire la newsletter d’octobre',
      status: 'done',
      priority: 2,
      mode: 'create',
      estimateMin: 60,
      completedAt: c.at(c.day(-20), 10),
      tags: ['écriture'],
      icon: '💌',
      color: 2,
    },
  ];

  // Open, long-running tasks that absorb the rest of the focus history.
  const ongoing = [0, 5, 7, 13].filter((i) => tasks[i]?.status !== 'done');
  const logs = assignSessions(tasks, focusSessions(c), ongoing);
  tasks.forEach((t, i) => {
    store.create('tasks', {
      status: 'todo',
      priority: 0,
      tags: [],
      dependsOn: [],
      postponedCount: 0,
      timeLogs: logs[i] ?? [],
      ...t,
      id: T(i + 1),
      createdAt:
        t.completedAt !== undefined ? t.completedAt - 7 * DAY : c.now - ((i % 7) + 1) * DAY,
    } as NewRecord<'tasks'>);
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Notes and journal                                                                           */
/* ------------------------------------------------------------------------------------------ */

function seedNotes(store: Store, c: SeedContext): void {
  const N = (n: number): string => id('note', n);
  const notes: { title: string; body: string; tags: string[]; links: string[] }[] = [
    {
      title: 'Vision du site',
      tags: ['produit'],
      links: [N(2), N(3), id('task', 1)],
      body: [
        '# Vision du site',
        '',
        'Un site **calme**, éditorial, qui donne envie d’essayer sans rien promettre de magique.',
        '',
        '- Une promesse claire en une phrase',
        '- Trois captures, pas plus',
        '- Un seul appel à l’action',
        '',
        'Voir [[Principes de design]] et [[Notes d’entretiens]].',
      ].join('\n'),
    },
    {
      title: 'Principes de design',
      tags: ['design'],
      links: [N(1)],
      body: [
        '# Principes de design',
        '',
        '1. Le contenu d’abord, l’interface ensuite.',
        '2. Une animation doit expliquer un changement, jamais décorer.',
        '3. Chaque écran a une action principale.',
        '',
        '> La simplicité est la sophistication suprême.',
        '',
        'Appliqués dans [[Vision du site]].',
      ].join('\n'),
    },
    {
      title: 'Notes d’entretiens',
      tags: ['recherche'],
      links: [N(1), id('task', 22)],
      body: [
        '# Notes d’entretiens',
        '',
        '## Ce qui revient',
        '- « Je planifie trop, puis je ne fais rien. »',
        '- Les rappels culpabilisants font fuir.',
        '- Le besoin d’un mode « juste aujourd’hui ».',
        '',
        '## À creuser',
        '- [ ] Tester une vue jour sans heures',
        '- [x] Regrouper les retours par thème',
      ].join('\n'),
    },
    {
      title: 'Idées de vidéos',
      tags: ['vidéo', 'idées'],
      links: [id('task', 3), id('task', 24)],
      body: [
        '# Idées de vidéos',
        '',
        '- Une journée avec le minuteur de focus',
        '- Avant / après : une semaine replanifiée',
        '- Le canvas pour structurer un projet',
        '',
        'Lié au [[Script de lancement]].',
      ].join('\n'),
    },
    {
      title: 'Script de lancement',
      tags: ['vidéo'],
      links: [N(4)],
      body: [
        '# Script de lancement',
        '',
        '**Ouverture** — un bureau en désordre, une notification de trop.',
        '',
        '**Bascule** — tout se range dans une seule journée lisible.',
        '',
        '**Fin** — « Moins d’outils. Plus de temps. »',
      ].join('\n'),
    },
    {
      title: 'Lectures du mois',
      tags: ['lecture'],
      links: [id('task', 19)],
      body: [
        '# Lectures du mois',
        '',
        '- *Deep Work*, Cal Newport',
        '- *Steal Like an Artist*, Austin Kleon',
        '- *Make Time*, Jake Knapp et John Zeratsky',
      ].join('\n'),
    },
    {
      title: 'Brouillon — article créativité',
      tags: ['écriture'],
      links: [N(6), id('task', 8)],
      body: [
        '# Créer sans s’épuiser',
        '',
        'Protéger deux heures le matin change plus qu’une nouvelle application.',
        '',
        'Références : [[Lectures du mois]].',
      ].join('\n'),
    },
  ];
  notes.forEach((n, i) =>
    store.create('notes', { ...n, id: N(i + 1), createdAt: c.now - (14 - i * 2) * DAY }),
  );
}

function seedJournal(store: Store, c: SeedContext): void {
  const entries: {
    kind: 'win' | 'friction' | 'dump';
    text: string;
    tags: string[];
    ago: number;
  }[] = [
    { kind: 'win', text: 'Storyboard bouclé en une matinée, sans interruption.', tags: [], ago: 1 },
    {
      kind: 'friction',
      text: 'Export vidéo bloqué : le codec n’est pas reconnu.',
      tags: ['technical'],
      ago: 1,
    },
    { kind: 'win', text: 'Premier retour client très positif sur le moodboard.', tags: [], ago: 2 },
    {
      kind: 'friction',
      text: 'Trois réunions d’affilée, impossible d’écrire ensuite.',
      tags: ['external'],
      ago: 3,
    },
    {
      kind: 'dump',
      text: 'Penser à demander les accès au serveur de démo. Acheter des piles pour le micro.',
      tags: [],
      ago: 3,
    },
    {
      kind: 'friction',
      text: 'Page blanche sur l’introduction de l’article.',
      tags: ['creative'],
      ago: 4,
    },
    { kind: 'win', text: 'Synthèse des entretiens partagée avec l’équipe.', tags: [], ago: 5 },
    {
      kind: 'friction',
      text: 'Réunions qui débordent sur le bloc de création.',
      tags: ['external', 'resolved'],
      ago: 8,
    },
    {
      kind: 'friction',
      text: 'Le build échoue à cause d’une dépendance.',
      tags: ['technical', 'resolved'],
      ago: 9,
    },
    { kind: 'win', text: 'TVA déclarée deux jours avant l’échéance.', tags: [], ago: 8 },
    {
      kind: 'dump',
      text: 'Une idée : un mode « une seule tâche » plein écran, sans horloge.',
      tags: [],
      ago: 10,
    },
    { kind: 'win', text: 'Newsletter envoyée : 41 réponses en deux jours.', tags: [], ago: 20 },
  ];
  entries.forEach((e, i) =>
    store.create('journal', {
      kind: e.kind,
      text: e.text,
      tags: e.tags,
      id: id('journal', i + 1),
      createdAt: c.at(c.day(-e.ago), 18, i),
    }),
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Canvas                                                                                      */
/* ------------------------------------------------------------------------------------------ */

function seedGraph(store: Store): void {
  const graph: Pick<Graph, 'title' | 'nodes' | 'edges'> = {
    title: 'Lancement du nouveau site',
    nodes: [
      { id: 'n-goal', label: 'Lancer le nouveau site', kind: 'idea', x: 0, y: 0, color: 1 },
      { id: 'n-research', label: 'Recherche', kind: 'group', x: -320, y: 180, color: 6 },
      { id: 'n-design', label: 'Design', kind: 'group', x: 0, y: 200, color: 1 },
      { id: 'n-content', label: 'Contenu', kind: 'group', x: 320, y: 180, color: 5 },
      {
        id: 'n-interviews',
        label: 'Synthèse des entretiens',
        kind: 'task',
        refId: id('task', 22),
        parentId: 'n-research',
        x: -380,
        y: 340,
      },
      {
        id: 'n-notes',
        label: 'Notes d’entretiens',
        kind: 'note',
        refId: id('note', 3),
        parentId: 'n-research',
        x: -260,
        y: 440,
      },
      {
        id: 'n-sketch',
        label: 'Esquisse de la page d’accueil',
        kind: 'task',
        refId: id('task', 1),
        parentId: 'n-design',
        x: -60,
        y: 360,
      },
      {
        id: 'n-proto',
        label: 'Prototype de l’onboarding',
        kind: 'task',
        refId: id('task', 6),
        parentId: 'n-design',
        x: 60,
        y: 470,
      },
      {
        id: 'n-test',
        label: 'Test utilisateur',
        kind: 'task',
        refId: id('task', 7),
        parentId: 'n-design',
        x: 0,
        y: 590,
      },
      {
        id: 'n-script',
        label: 'Script de lancement',
        kind: 'note',
        refId: id('note', 5),
        parentId: 'n-content',
        x: 300,
        y: 340,
      },
      {
        id: 'n-voice',
        label: 'Voix-off',
        kind: 'task',
        refId: id('task', 3),
        parentId: 'n-content',
        x: 380,
        y: 460,
      },
      { id: 'n-idea', label: 'Mode « une seule tâche »', kind: 'idea', x: 560, y: 40, color: 2 },
    ],
    edges: [
      { id: 'e-1', from: 'n-goal', to: 'n-research' },
      { id: 'e-2', from: 'n-goal', to: 'n-design' },
      { id: 'e-3', from: 'n-goal', to: 'n-content' },
      { id: 'e-4', from: 'n-interviews', to: 'n-sketch', label: 'nourrit' },
      { id: 'e-5', from: 'n-sketch', to: 'n-proto', condition: 'on-complete' },
      { id: 'e-6', from: 'n-proto', to: 'n-test', condition: 'on-complete' },
      { id: 'e-7', from: 'n-script', to: 'n-voice', condition: 'on-complete' },
      { id: 'e-8', from: 'n-idea', to: 'n-goal', label: 'plus tard' },
    ],
  };
  store.create('graphs', { ...graph, id: id('graph', 1) });
}
