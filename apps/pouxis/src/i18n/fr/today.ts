/**
 * Today view: timeline, now line, floating tasks tray, focus mini-player, delay propagation,
 * buffers and maker-time guard. `{duration}` comes from `formatDuration`, `{time}` from
 * `formatTime`, `{when}` from `formatRelativeDay`.
 */
export const today = {
  title: 'Aujourd’hui',

  greeting: {
    morning: 'Bonjour',
    afternoon: 'Bon après-midi',
    evening: 'Bonsoir',
  },

  summary: {
    a11y: 'Résumé de la journée',
    planned: '{count, plural, =0 {Rien de prévu} one {# chose prévue} other {# choses prévues}}',
    free: '{duration} de libre',
    focus: '{duration} de focus',
  },

  timeline: {
    label: 'Frise de la journée',
    now: 'Maintenant',
    nowA11y: 'Il est {time}',
    jumpToNow: 'Revenir à maintenant',
    zoomIn: 'Zoomer',
    zoomOut: 'Dézoomer',
    allDay: 'Toute la journée',
    outsideHours: 'Hors de vos heures de travail',
    dayStart: 'Début de journée · {time}',
    dayEnd: 'Fin de journée · {time}',
    freeSlot: 'Libre · {duration}',
    freeSlotHint: 'Glissez une tâche ici, ou touchez pour en ajouter une',
    addAt: 'Ajouter à {time}',
    fixed: 'Rendez-vous fixe',
    fixedHint: 'Ne bouge pas quand le planning se décale',
    pinned: 'Horaire épinglé',
    pinnedHint: 'Le placement automatique n’y touche pas',
    travel: 'Trajet · {duration}',
    leaveAt: 'Partir à {time}',
    blockA11y: '{title}, de {start} à {end}',
    blockDone: 'Terminée',
    move: 'Déplacer le bloc',
    resize: 'Ajuster la durée',
    reroute: 'Réorganiser la journée',
    rerouteHint: 'Replace les tâches dans les créneaux libres, sans toucher aux rendez-vous fixes',
    rerouted: 'Journée réorganisée',
  },

  floating: {
    title: 'Tâches flottantes',
    hint: 'Prévues aujourd’hui, sans heure fixe : elles se glissent dans les créneaux libres.',
    count:
      '{count, plural, =0 {Aucune tâche flottante} one {# tâche flottante} other {# tâches flottantes}}',
    expand: 'Afficher les tâches flottantes',
    collapse: 'Masquer les tâches flottantes',
    place: 'Trouver un créneau',
    placeAll: 'Tout placer',
    placed: 'Placée à {time}',
    placedMany: '{count, plural, one {# tâche placée} other {# tâches placées}}',
    noRoom: 'Plus de créneau libre aujourd’hui. Elle reste ici, sans pression.',
    noRoomMany: 'La journée est pleine. Les autres restent ici ; vous pourrez les reprendre demain.',
    dragHint: 'Glissez une tâche sur la frise pour lui donner une heure.',
    empty: 'Rien n’attend de créneau.',
  },

  /** Focus mini-player (Pomodoro + Hyperfocus). `{time}` here is a timer (`formatTimer`). */
  focus: {
    a11y: 'Lecteur de focus',
    start: 'Commencer le focus',
    startOn: 'Se concentrer sur « {title} »',
    pause: 'Mettre en pause',
    resume: 'Reprendre',
    stop: 'Terminer la session',
    skipBreak: 'Passer la pause',
    extend: 'Encore {duration}',
    expand: 'Agrandir le lecteur',
    collapse: 'Réduire le lecteur',
    focusing: 'Focus',
    onBreak: 'Pause',
    paused: 'En pause',
    remaining: 'Reste {time}',
    remainingA11y: 'Il reste {duration}',
    session: 'Session {current} sur {total}',
    pickTask: 'Choisissez une tâche pour commencer',
    dndOn: 'Ne pas déranger est activé',
    dndOff: 'Ne pas déranger est désactivé',
    dndUnavailable:
      'Ne pas déranger n’est pas disponible ici. Coupez les notifications à la main si besoin.',
    sessionDone: 'Session terminée · {duration} de focus',
    breakDone: 'Fin de la pause',
    breakIdeas: {
      look: 'Regardez au loin quelques secondes.',
      stretch: 'Levez-vous et étirez-vous.',
      water: 'Un verre d’eau ?',
      breathe: 'Trois respirations lentes.',
      walk: 'Quelques pas, loin de l’écran.',
    },
  },

  /** Toast when a dependency is completed and the next task appears in Today. */
  unlocked: {
    title: '« {title} » peut commencer',
    body: '« {blocker} » est terminée : la suite est débloquée.',
    many: '{count, plural, one {# tâche débloquée} other {# tâches débloquées}}',
    view: 'Voir la tâche',
    addToToday: 'L’ajouter à aujourd’hui',
  },

  /** A scheduled task runs past its slot → propose to shift what follows (fixed events stay). */
  overrun: {
    title: '« {title} » déborde',
    body: 'Elle dépasse son créneau de {duration}. Décaler la suite ?',
    propagate: 'Décaler la suite',
    propagateBy: 'Décaler de {duration}',
    extend: 'Prolonger de {duration}',
    wrapUp: 'Terminer maintenant',
    keep: 'Laisser tel quel',
    fixedNote: 'Les rendez-vous fixes ne bougent pas.',
    propagated: '{count, plural, one {# tâche décalée} other {# tâches décalées}} de {duration}',
    overflow:
      '{count, plural, one {# tâche ne rentre plus aujourd’hui} other {# tâches ne rentrent plus aujourd’hui}}',
    overflowHint: 'Elles passent dans les tâches flottantes de demain, sauf si vous choisissez autre chose.',
    toTomorrow: 'Les prévoir demain',
    choose: 'Choisir pour chacune',
  },

  buffers: {
    label: 'Transition',
    a11y: 'Transition de {duration}',
    hint: 'Un temps pour souffler entre deux réunions',
    remove: 'Retirer cette transition',
    removed: 'Transition retirée',
    added:
      '{count, plural, one {# transition ajoutée} other {# transitions ajoutées}} entre vos réunions',
  },

  /** Maker-schedule guard: a meeting would split a continuous deep-work stretch. */
  maker: {
    title: 'Cette réunion coupe une plage de création',
    body: 'Il resterait {before} avant et {after} après. Le travail profond a besoin de longues plages sans interruption.',
    suggest: 'Proposer un autre horaire',
    suggestion: '{time} conviendrait, sans couper la plage',
    keep: 'Garder cet horaire',
    protected: 'Plage de création protégée',
    protectedA11y: 'Plage de création protégée de {start} à {end}',
  },

  /** Tasks planned on a previous day and not done. Never « en retard » / « manqué ». */
  carryOver: {
    title: '{count, plural, one {Une tâche d’hier attend encore} other {# tâches d’hier attendent encore}}',
    body: 'Les journées ne se déroulent pas toujours comme prévu. Que voulez-vous en faire ?',
    toToday: 'Les prévoir aujourd’hui',
    toInbox: 'Les renvoyer à trier',
    oneByOne: 'Choisir une par une',
    done: 'C’est réglé.',
  },

  allDone: {
    title: 'Tout est fait',
    body: 'Le reste de la journée vous appartient.',
    action: 'Faire le point sur la journée',
  },

  wrapUp: {
    title: 'Fin de journée',
    completed:
      '{count, plural, =0 {Aucune case cochée aujourd’hui : réfléchir et se reposer comptent aussi.} one {# tâche terminée aujourd’hui.} other {# tâches terminées aujourd’hui.}}',
    leftover: 'Ce qui reste peut attendre demain.',
    planTomorrow: 'Préparer demain',
    close: 'Clore la journée',
  },

  dayOff: {
    title: 'Jour de repos',
    body: 'Pas d’heures de travail aujourd’hui. Les notifications restent discrètes.',
  },

  empty: {
    title: 'Une journée ouverte',
    body: 'Rien n’est prévu pour l’instant. Ajoutez une tâche, ou gardez de l’espace : c’est aussi un choix.',
    action: 'Ajouter une tâche',
    secondary: 'Ouvrir la boîte de réception',
  },
};
