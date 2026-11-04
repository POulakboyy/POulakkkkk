/**
 * Insights (« Bilan »): weekly review, energy heatmap, create/organize balance, guilt-free
 * streaks with jokers, personal skill tree, dormant threads and archive suggestions.
 * All figures describe, never judge. Everything is computed on the device.
 */
export const insights = {
  title: 'Bilan',
  subtitle: 'Vos tendances, calculées à partir de ce que vous faites — sans jugement.',
  privacy: 'Calculé sur cet appareil. Rien n’en sort.',
  showTable: 'Afficher en tableau',

  week: {
    label: 'Semaine affichée',
    previous: 'Semaine précédente',
    next: 'Semaine suivante',
    current: 'Cette semaine',
  },

  energy: {
    title: 'Vos heures d’énergie',
    hint: 'D’après vos sessions de focus et vos tâches terminées ces 4 dernières semaines.',
    peak: 'Vous avancez le plus souvent le {day} vers {hour}',
    legendLow: 'Moins',
    legendHigh: 'Plus',
    legendConfidence: 'Carré plein : estimation sûre. Petit carré : encore peu de données.',
    a11ySummary:
      'Carte de chaleur de l’énergie, 7 jours sur 24 heures. {peak}. Utilisez les flèches pour parcourir les créneaux.',
    cell: '{day} {hour} · énergie {value} · {confidence}',
    confident: 'estimation sûre',
    tentative: 'encore peu de données',
    readoutHint: 'Survolez ou parcourez la carte pour lire un créneau.',
    hourColumn: 'Heure',
    notEnough: 'Encore quelques jours d’usage et la carte se précisera.',
    priorNote:
      'En attendant vos données, la carte part d’un profil horaire moyen et s’ajuste à chaque session.',
  },

  balance: {
    title: 'Création et organisation',
    hint: 'Le temps passé à produire, comparé au temps passé à faire tourner les choses.',
    create: 'Création',
    organize: 'Organisation',
    meetings: 'Réunions',
    share: '{label} · {percent}',
    a11y: '{create} de création, {organize} d’organisation, {meetings} de réunions',
    total: '{duration} suivies cette semaine',
    dayColumn: 'Jour',
    totalColumn: 'Total',
    noData: 'Pas encore de temps suivi cette semaine. Lancez une session de focus pour commencer.',
  },

  /** Streaks without guilt: jokers cover rest days; a break is never framed as failure. */
  streak: {
    title: 'Série de création',
    days: '{count, plural, =0 {Pas de série en cours} one {# jour} other {# jours}}',
    best: 'Plus longue série : {count, plural, one {# jour} other {# jours}}',
    jokers:
      '{count, plural, =0 {Aucun joker en réserve} one {# joker en réserve} other {# jokers en réserve}}',
    jokerHint:
      'Un joker couvre un jour de repos sans interrompre la série. Vous en recevez {count, plural, one {un} other {#}} chaque semaine.',
    status: {
      active: 'Série en cours',
      protected: 'Hier était un jour de repos, couvert par un joker.',
      paused: 'Série en pause : elle reprend dès votre prochaine journée de création.',
      none: 'Une journée de création suffit pour lancer une série.',
    },
    restarted: 'Nouvelle série. Ce qui a été fait reste fait.',
    calendar: 'Les {count} derniers jours',
    dayActive: '{date} : journée de création',
    dayJoker: '{date} : repos couvert par un joker',
    dayRest: '{date} : repos',
    dayToday: '{date} : aujourd’hui',
    legendActive: 'Création',
    legendJoker: 'Joker',
    legendRest: 'Repos',
  },

  weekly: {
    title: 'Point de la semaine',
    subtitle: 'Semaine du {date}',
    ready: 'Votre point de la semaine est prêt',
    wins: 'Victoires de la semaine',
    winsEmpty: 'Rien de coché ? Une semaine de réflexion ou de repos compte aussi.',
    biggestWin: 'La plus marquante',
    blockers: 'Points de blocage récurrents',
    blockersEmpty: 'Aucun blocage récurrent.',
    blockerCount: '{count, plural, one {# mention} other {# mentions}}, dont {week} cette semaine',
    focusTime: 'Focus',
    completed: 'Terminées',
    creationShare: 'Création',
    planning: 'Justesse du plan',
    planningEstimates:
      'Durées : médiane à {ratio} de l’estimation, {within} des tâches à ±25 % près',
    planningScheduled: 'Créneaux : {done} sur {planned} tâches planifiées terminées',
    planningEmpty: 'Pas encore assez d’estimations pour mesurer la justesse du plan.',
    slipped: '{count, plural, one {# tâche à replanifier} other {# tâches à replanifier}}',
    suggestions: 'Pistes pour la semaine prochaine',
    suggestion: {
      padEstimates:
        'Vos tâches prennent en général {factor} du temps prévu : essayez d’élargir vos estimations d’autant.',
      trimEstimates:
        'Vous finissez souvent plus vite que prévu : des estimations à {factor} suffiraient.',
      lightenPlan:
        '{rate} des créneaux planifiés ont abouti : un plan un peu plus léger laisserait de la marge.',
      addressBlocker:
        '« {terms} » revient {count} fois : un moment dédié pourrait le débloquer.',
      protectCreation:
        'La création a représenté {share} du temps suivi : bloquer une plage de création pourrait aider.',
      rescheduleSlipped:
        '{count, plural, one {Une tâche attend} other {# tâches attendent}} un nouveau créneau.',
    },
    share: 'Partager en image',
    shareTitle: 'Mon point de la semaine',
    shared: 'Image prête',
    sharedBody: 'Le point de la semaine a été enregistré en image.',
    shareFailed: 'L’image n’a pas pu être créée. Réessayez dans un instant.',
    imageFooter: 'POuxis · calculé sur l’appareil',
  },

  skills: {
    title: 'Arbre de compétences',
    hint: 'Chaque branche pousse avec les tâches que vous terminez, d’après leurs étiquettes.',
    node: '{name} · niveau {level} · {count, plural, one {# tâche} other {# tâches}}',
    a11y: 'Arbre de compétences : {count, plural, one {# branche} other {# branches}}. {top}',
    top: 'Branche principale : {name}.',
    empty: 'Terminez une tâche étiquetée (par exemple « design/typo ») pour voir pousser la première branche.',
    skillColumn: 'Compétence',
    levelColumn: 'Niveau',
    tasksColumn: 'Tâches',
  },

  deadEnds: {
    title: 'Pistes en sommeil',
    hint: 'Des idées et tâches restées telles quelles depuis leur création.',
    count:
      '{count, plural, =0 {Aucune piste en sommeil} one {# piste en sommeil} other {# pistes en sommeil}}',
    idle: 'Intacte depuis {count, plural, one {# jour} other {# jours}}',
    keep: 'Garder',
    kept: 'Piste gardée',
    empty: 'Aucune piste en sommeil : chaque idée a été reprise au moins une fois.',
  },

  archive: {
    title: 'À archiver ?',
    hint: 'Sans activité depuis plus de deux ans. Rien n’est archivé sans votre accord.',
    idle: 'Sans activité depuis {count, plural, one {# jour} other {# jours}}',
    archive: 'Archiver',
    archived: 'Tâche archivée',
    keep: 'Garder',
    kept: 'Gardée en l’état',
    empty: 'Rien à archiver pour l’instant.',
  },

  kind: {
    task: 'Tâche',
    note: 'Note',
  },

  untitled: 'Sans titre',

  empty: {
    title: 'Le bilan se construit avec le temps',
    body: 'Utilisez POuxis quelques jours : vos tendances apparaîtront ici, calculées sur votre appareil.',
  },
};
