// Scene-by-scene adaptations of the shotlist to the build being filmed. The shotlist stays the
// creative source of truth (timing, camera, captions, VO); these entries only record where the
// real app differs from what the storyboard assumed, with the reason, so every deviation is
// reviewable. Each feature shown still exists in the build: nothing is mocked.

/** Delay propagation is offered in Today when a scheduled task runs past its slot. */
const OVERRUN = {
  route: '#/today',
  clock: '2026-11-05T11:38:00',
  why: 'La propagation des retards est proposée dans Aujourd’hui quand une tâche dépasse son créneau (10:00–11:30 dans le jeu de démo) ; l’horloge est avancée à 11:38.',
};

/** "Start focus" is the play button of a task in Today (the Tasks list has no focus button). */
const FOCUS_FROM_TODAY = {
  route: '#/today',
  why: 'Le démarrage du focus se fait depuis les tâches d’Aujourd’hui dans ce build.',
};

const MINI_PLAYER = {
  why: 'Une session de focus est lancée puis réduite avant la prise, pour filmer le mini-lecteur.',
  setup: [
    { type: 'click', selector: '[data-demo="focus-start"]' },
    { type: 'wait', durationMs: 900 },
    { type: 'clickRole', role: 'button', name: 'Réduire le lecteur' },
    { type: 'wait', durationMs: 900 },
  ],
};

const SERENDIPITY = {
  why: 'La rencontre fortuite est dans l’onglet « Atelier » des Idées.',
  setup: [
    { type: 'clickRole', role: 'tab', name: 'Atelier' },
    { type: 'wait', durationMs: 500 },
  ],
};

/** The map in Plan (outline) view first; switching to Toile turns the list into a map. */
const CANVAS = {
  why: 'La toile est un <canvas> sans nœud DOM : on part de la vue « Plan » (liste) et on bascule sur « Toile » (carte), ce que décrit la voix off ; le zoom passe par le clavier (+).',
  setup: [
    { type: 'clickRole', role: 'radio', name: 'Plan' },
    { type: 'wait', durationMs: 700 },
  ],
  /** Same beats, swapped order: switch to the map first, then zoom into it. */
  actions: (original) => {
    const [first, second] = [...original].sort((a, b) => a.at - b.at);
    return [
      { ...second, at: first.at },
      { ...first, at: second.at },
    ];
  },
};

const OFFLINE = {
  why: 'La barre de commande est ouverte une fois avant de couper le réseau, pour que le serveur de développement ait servi ses modules.',
  setup: [
    { type: 'click', selector: '[data-demo="capture-button"]' },
    { type: 'wait', durationMs: 600 },
    { type: 'press', key: 'Escape' },
    { type: 'wait', durationMs: 600 },
  ],
};

export const DIRECTIONS = {
  'h05-propagation': OVERRUN,
  'v06-propagation': OVERRUN,
  'ap03-propagation': OVERRUN,
  'h08-focus': FOCUS_FROM_TODAY,
  'v03-focus': FOCUS_FROM_TODAY,
  'ap04-focus': FOCUS_FROM_TODAY,
  'apm03-focus': FOCUS_FROM_TODAY,
  'h09-miniplayer': MINI_PLAYER,
  'v07-miniplayer': MINI_PLAYER,
  'h11-canvas': CANVAS,
  'apm04-canvas': CANVAS,
  'h12-serendipity': SERENDIPITY,
  'v04-serendipity': SERENDIPITY,
  'ap05-ideas': SERENDIPITY,
  'h14-insights': { disclaimer: true, why: 'Chiffres du bilan : mention « données fictives ».' },
  'apm05-insights': { disclaimer: true, why: 'Chiffres du bilan : mention « données fictives ».' },
  'h15-offline': OFFLINE,
  'v08-offline': OFFLINE,
  'h17-export': {
    why: 'La section Données est en bas des Réglages : elle est amenée en bas d’écran avant la prise.',
    setup: [{ type: 'reveal', selector: '[data-demo="settings-data"]', offset: 320 }],
  },
};

export function directionFor(sceneId) {
  return DIRECTIONS[sceneId] ?? {};
}

/** Shotlist keys use macOS ⌘; the Linux capture maps them to Ctrl like the app's keymap does. */
export function portableKey(key) {
  return key.replace(/^Meta\+/, 'ControlOrMeta+');
}
