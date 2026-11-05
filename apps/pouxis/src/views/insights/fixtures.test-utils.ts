import {
  DAY,
  HOUR,
  MINUTE,
  addDays,
  atMinutes,
  startOfDay,
  weekday,
  type CalendarEvent,
  type JournalEntry,
  type Note,
  type Task,
  type Timestamp,
  type TimeZone,
} from '@pouxis/core';

/**
 * A believable month of activity for tests and visual QA: morning creative focus, afternoon
 * admin, meetings, recurring frictions, a dormant note and a long-forgotten task.
 * Deterministic: the same `now` always yields the same records.
 */
export interface DemoRecords {
  tasks: Task[];
  events: CalendarEvent[];
  journal: JournalEntry[];
  notes: Note[];
}

const SKILLS = ['design/typo', 'design/couleur', 'écriture/essai', 'code/rust', 'musique'] as const;
const CREATE_TITLES = [
  'Esquisser la grille éditoriale',
  'Écrire l’introduction de l’essai',
  'Composer la boucle de piano',
  'Prototyper le parseur',
  'Choisir la palette d’automne',
  'Réécrire le chapitre deux',
] as const;
const ORGANIZE_TITLES = [
  'Trier la boîte de réception',
  'Préparer la facture',
  'Mettre à jour le planning',
] as const;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pick<T>(items: readonly T[], r: number): T {
  return items[Math.floor(r * items.length) % items.length] as T;
}

export function demoRecords(now: Timestamp, timeZone: TimeZone): DemoRecords {
  const random = rng(7);
  const today = startOfDay(now, timeZone);
  const tasks: Task[] = [];
  const events: CalendarEvent[] = [];
  let n = 0;
  const id = (prefix: string) => `${prefix}-${++n}`;

  const task = (fields: Partial<Task> & Pick<Task, 'title' | 'mode'>, createdAt: Timestamp): Task => ({
    id: id('t'),
    createdAt,
    updatedAt: fields.completedAt ?? createdAt,
    status: 'done',
    priority: 2,
    tags: [],
    dependsOn: [],
    postponedCount: 0,
    timeLogs: [],
    ...fields,
  });

  for (let d = 27; d >= 0; d--) {
    const day = addDays(today, -d, timeZone);
    const wd = weekday(day, timeZone);
    // Two rest days in the month, one of them covered by a joker.
    if (d === 9 || d === 17 || (wd === 0 && d > 3)) continue;

    const morning = atMinutes(day, (wd === 6 ? 10 : 9) * 60 + Math.round(random() * 30), timeZone);
    if (d === 0 && morning > now) continue;
    const length = (60 + Math.round(random() * 60)) * MINUTE;
    const estimate = 45 + Math.round(random() * 45);
    tasks.push(
      task(
        {
          title: pick(CREATE_TITLES, random()),
          mode: 'create',
          tags: [pick(SKILLS, random())],
          estimateMin: estimate,
          scheduled: { start: morning, end: morning + estimate * MINUTE },
          timeLogs: [{ start: morning, end: morning + length, kind: 'focus' }],
          completedAt: morning + length,
        },
        morning - DAY,
      ),
    );

    if (wd >= 1 && wd <= 5) {
      const afternoon = atMinutes(day, 15 * 60, timeZone);
      if (afternoon + 40 * MINUTE <= now) {
        tasks.push(
          task(
            {
              title: pick(ORGANIZE_TITLES, random()),
              mode: 'organize',
              estimateMin: 30,
              timeLogs: [{ start: afternoon, end: afternoon + 40 * MINUTE, kind: 'focus' }],
              completedAt: afternoon + 40 * MINUTE,
            },
            afternoon - HOUR,
          ),
        );
      }
      if (wd === 2 || wd === 4) {
        const start = atMinutes(day, 11 * 60, timeZone);
        events.push({
          id: id('e'),
          createdAt: start - DAY,
          updatedAt: start - DAY,
          title: 'Point d’équipe',
          start,
          end: start + HOUR,
          timeZone,
          fixed: true,
          kind: 'meeting',
          attendees: [],
          tags: [],
        });
      }
    }
  }

  // One slipped task (deadline missed) and two open ones.
  tasks.push(
    task(
      {
        title: 'Envoyer le devis',
        mode: 'organize',
        status: 'todo',
        deadline: addDays(today, -2, timeZone) + 18 * HOUR,
      },
      addDays(today, -6, timeZone),
    ),
  );

  const friction = (daysAgo: number, text: string, tags: string[]): JournalEntry => {
    const at = addDays(today, -daysAgo, timeZone) + 17 * HOUR;
    return { id: id('j'), createdAt: at, updatedAt: at, kind: 'friction', text, tags };
  };
  const journal: JournalEntry[] = [
    friction(1, 'Les réunions déborde sur la matinée de création', ['réunions']),
    friction(8, 'Encore une réunion qui déborde sur la création', ['réunions']),
    friction(15, 'Réunions trop longues, matinée perdue', ['réunions']),
    friction(2, 'Notifications pendant le focus', ['notifications']),
    friction(12, 'Les notifications cassent le focus', ['notifications']),
    {
      id: id('j'),
      createdAt: addDays(today, -1, timeZone) + 19 * HOUR,
      updatedAt: addDays(today, -1, timeZone) + 19 * HOUR,
      kind: 'win',
      text: 'Premier jet de l’essai terminé',
      tags: [],
    },
  ];

  const old = (days: number) => now - days * DAY;
  const notes: Note[] = [
    {
      id: id('n'),
      createdAt: old(46),
      updatedAt: old(46) + 2 * MINUTE,
      title: 'Idée : une police pour les partitions',
      body: '',
      tags: [],
      links: [],
    },
  ];
  tasks.push(
    task({ title: 'Explorer la gravure sur bois', mode: 'create', status: 'todo' }, old(71)),
    task({ title: 'Ranger les vieux fichiers du NAS', mode: 'organize', status: 'todo' }, old(800)),
  );

  return { tasks, events, journal, notes };
}
