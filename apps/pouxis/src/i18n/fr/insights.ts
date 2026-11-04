/**
 * Insights (« Bilan »): energy heatmap, create/organize balance, guilt-free streaks with jokers,
 * weekly review, dead ends, personal skill tree. All figures describe, never judge.
 */
export const insights = {
  title: 'Bilan',

  period: {
    label: 'Période',
    week: 'Cette semaine',
    month: 'Ce mois-ci',
    quarter: 'Ce trimestre',
    custom: 'Personnalisée',
  },

  energy: {
    title: 'Vos heures d’énergie',
    hint: 'D’après les tâches terminées ces dernières semaines.',
    peak: 'Vous avancez le plus souvent {range}',
    legendLow: 'Moins',
    legendHigh: 'Plus',
    cellA11y:
      '{day} à {hour} : {count, plural, =0 {aucune tâche terminée} one {# tâche terminée} other {# tâches terminées}}',
    useForPlanning: 'Placer le travail de création sur ces heures',
    notEnough: 'Encore quelques jours d’usage et la carte se dessinera.',
  },

  balance: {
    title: 'Création et organisation',
    hint: 'Le temps passé à produire, comparé au temps passé à faire tourner.',
    create: 'Création · {percent}',
    organize: 'Organisation · {percent}',
    a11y: '{create} de création, {organize} d’organisation',
    goal: 'Votre équilibre visé : {percent} de création',
    setGoal: 'Choisir un équilibre visé',
    noData: 'Pas encore assez de temps enregistré.',
  },

  /** Streaks without guilt: jokers cover rest days; a break is never framed as failure. */
  streak: {
    title: 'Série de création',
    days: '{count, plural, =0 {Pas de série en cours} one {# jour} other {# jours}}',
    best: 'Plus longue série : {count, plural, one {# jour} other {# jours}}',
    jokers:
      '{count, plural, =0 {Aucun joker} one {# joker disponible} other {# jokers disponibles}}',
    jokerHint:
      'Un joker couvre un jour de repos sans interrompre la série. Vous en gagnez un tous les {days} jours.',
    jokerUsed: 'Joker utilisé {when} : le repos fait partie du travail.',
    restarted: 'Nouvelle série. Ce qui a été fait reste fait.',
    paused: 'Série en pause',
    hide: 'Masquer les séries',
  },

  weekly: {
    title: 'Point de la semaine',
    subtitle: 'Semaine du {date}',
    ready: 'Votre point de la semaine est prêt',
    wins: 'Victoires de la semaine',
    winsEmpty: 'Rien de coché ? Une semaine de réflexion ou de repos compte aussi.',
    blockers: 'Points de blocage récurrents',
    blockersEmpty: 'Aucun blocage récurrent.',
    focusTime: '{duration} de focus',
    completed:
      '{count, plural, =0 {Aucune tâche terminée} one {# tâche terminée} other {# tâches terminées}}',
    planned: 'Prévu {planned} · réalisé {actual}',
    reflect: 'Une chose à garder pour la semaine prochaine ?',
    reflectPlaceholder: 'Facultatif',
    close: 'Clore la semaine',
  },

  deadEnds: {
    title: 'Pistes en sommeil',
    count:
      '{count, plural, =0 {Aucune piste en sommeil} one {# piste en sommeil} other {# pistes en sommeil}}',
    open: 'Les passer en revue',
  },

  skills: {
    title: 'Arbre de compétences',
    hint: 'Les branches poussent avec les projets que vous terminez.',
    branch: '{name} · {count, plural, one {# projet} other {# projets}}',
    rename: 'Renommer la branche',
    empty: 'Terminez un premier projet pour voir pousser la première branche.',
  },

  privacy: 'Calculé sur cet appareil. Rien n’en sort.',

  empty: {
    title: 'Le bilan se construit avec le temps',
    body: 'Utilisez POuxis quelques jours : vos tendances apparaîtront ici, calculées sur votre appareil.',
  },
};
