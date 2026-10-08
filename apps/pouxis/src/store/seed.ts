import { atMinutes, startOfDay } from '@pouxis/core';
import type { Store } from './types.ts';

/** First-run content so a new user sees how a day looks instead of an empty screen. */
export function seedDemo(store: Store): void {
  const { timeZone } = store.prefs();
  const today = startOfDay(Date.now(), timeZone);
  const at = (h: number, m = 0) => atMinutes(today, h * 60 + m, timeZone);

  store.create('events', {
    title: 'Revue produit',
    start: at(10),
    end: at(11),
    timeZone,
    fixed: true,
    kind: 'meeting',
    attendees: [],
    tags: ['équipe'],
    icon: '💬',
    color: 4,
  });
  store.create('events', {
    title: 'Déjeuner',
    start: at(12, 30),
    end: at(13, 30),
    timeZone,
    fixed: true,
    kind: 'personal',
    attendees: [],
    tags: [],
    icon: '🥗',
    color: 3,
  });

  const base = { tags: [] as string[], dependsOn: [] as string[], timeLogs: [], postponedCount: 0 };
  store.create('tasks', {
    ...base,
    title: 'Esquisser la nouvelle page d’accueil',
    status: 'todo',
    priority: 3,
    mode: 'create',
    estimateMin: 90,
    scheduled: { start: at(8, 30), end: at(10) },
    icon: '✏️',
    color: 1,
  });
  store.create('tasks', {
    ...base,
    title: 'Répondre aux retours clients',
    status: 'todo',
    priority: 2,
    mode: 'organize',
    estimateMin: 30,
    floatingDay: today,
    icon: '📮',
    color: 2,
  });
  store.create('tasks', {
    ...base,
    title: 'Enregistrer la voix-off de la vidéo',
    status: 'todo',
    priority: 2,
    mode: 'create',
    estimateMin: 60,
    scheduled: { start: at(14), end: at(15) },
    icon: '🎙️',
    color: 5,
  });
  store.create('tasks', {
    ...base,
    title: 'Préparer la facture du mois',
    status: 'inbox',
    priority: 1,
    mode: 'organize',
    estimateMin: 20,
    tags: ['admin'],
    icon: '🧾',
    color: 8,
  });
}
