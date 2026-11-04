/**
 * Calendar: day / week / month / spiral views, natural-language event entry, time progress watermark,
 * multiple time zones, planning snapshots (planned vs actual), deep links, travel time.
 * `{time}` comes from `formatTime`, `{range}` from `formatTimeRange`, `{when}` from
 * `formatRelativeDay`, `{date}` from `formatDate`, `{duration}` from `formatDuration`.
 */
export const calendar = {
  title: 'Calendrier',

  views: {
    label: 'Affichage',
    day: 'Jour',
    week: 'Semaine',
    month: 'Mois',
    spiral: 'Spirale',
    spiralHint: 'Le temps en continu, sans coupure de semaine ni de mois.',
  },

  nav: {
    today: 'Aujourd’hui',
    previousDay: 'Jour précédent',
    nextDay: 'Jour suivant',
    previousWeek: 'Semaine précédente',
    nextWeek: 'Semaine suivante',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    goTo: 'Aller à une date',
    weekNumber: 'Semaine {number}',
    rangeA11y: 'Du {start} au {end}',
  },

  spiral: {
    label: 'Spirale du temps',
    zoomIn: 'Rapprocher',
    zoomOut: 'Éloigner',
    turn: 'Un tour = {span, select, day {un jour} week {une semaine} month {un mois} other {une année}}',
    centerOnNow: 'Recentrer sur maintenant',
    a11y: 'Vue en spirale. Utilisez les flèches pour avancer ou reculer dans le temps.',
    keys: '← → : avancer ou reculer · + − : zoomer',
    now: 'Maintenant',
    legend: 'Le centre est le passé, l’extérieur l’avenir. Chaque tour se superpose au précédent.',
    upcoming: 'À venir sur la spirale',
    nothingUpcoming: 'Rien de prévu sur cette portion de la spirale.',
  },

  grid: {
    label: 'Grille horaire',
    column: '{date}. Flèches haut et bas pour choisir une heure, Entrée pour créer un événement.',
    cursor: 'Nouveau créneau à {time}',
    now: 'Maintenant, {time}',
    eventKeys:
      'Flèches : déplacer de 15 minutes ou d’un jour. Maj + flèches : ajuster la fin. Entrée : modifier. Suppr : supprimer.',
    resize: 'Ajuster la durée',
    draft: 'Nouvel événement, {range}',
  },

  month: {
    label: 'Vue du mois',
    more: '{count, plural, one {# autre} other {# autres}}',
    day: '{date}, {count, plural, =0 {aucun événement} one {# événement} other {# événements}}',
  },

  overlays: {
    label: 'Afficher',
    energy: 'Énergie',
    zones: 'Fuseaux',
    progress: 'Avancement',
    snapshot: 'Prévu et réalisé',
  },

  energy: {
    title: 'Énergie habituelle',
    low: 'Basse',
    high: 'Haute',
    peak: 'Pic habituel : {day} vers {hour}',
    learning:
      'Estimation encore générale : elle s’affine à mesure que vous enregistrez des sessions de concentration.',
    cell: '{hour} : énergie {level, select, 0 {très basse} 1 {basse} 2 {moyenne} 3 {haute} other {très haute}}',
  },

  event: {
    new: 'Nouvel événement',
    create: 'Créer l’événement',
    title: 'Titre',
    day: 'Jour',
    recurrence: 'Répétition',
    recurrenceHint: 'Ex. « tous les lundis », « le 3e mardi ouvré de chaque mois ».',
    recurrenceInvalid: 'Règle non reconnue. Essayez « chaque lundi » ou « tous les 2 jours ».',
    recurrenceParsed: 'Se répète {rule}',
    series: 'Les changements s’appliquent à toute la série.',
    untitled: 'Sans titre',
    more: 'Actions de l’événement',
    titlePlaceholder: 'Titre de l’événement',
    quickPlaceholder: 'Ex. Réunion projet X mardi 14h-16h avec @paul',
    quickHint: 'Écrivez naturellement : date, heure, durée et participants sont reconnus.',
    parsed: 'Compris : {summary}',
    parsedNothing: 'Aucune date reconnue : l’événement sera créé aujourd’hui.',
    kind: 'Type',
    allDay: 'Toute la journée',
    starts: 'Début',
    ends: 'Fin',
    timeZone: 'Fuseau horaire',
    location: 'Lieu',
    attendees: 'Participants',
    addAttendee: 'Ajouter un participant',
    fixed: 'Rendez-vous fixe',
    fixedHint: 'Ne bouge jamais quand la journée se réorganise.',
    notes: 'Notes',
    a11y: '{title}, {range}',
    a11yAllDay: '{title}, toute la journée',
    edit: 'Modifier l’événement',
    delete: 'Supprimer l’événement',
    duplicate: 'Dupliquer l’événement',
    endBeforeStart: 'La fin doit venir après le début.',
  },

  travel: {
    label: 'Trajet',
    estimate: '{duration} de trajet',
    leaveAt: 'Partir à {time}',
    add: 'Ajouter le temps de trajet',
    unavailable: 'Estimation de trajet indisponible pour l’instant.',
  },

  /** Watermark showing progress through the year, quarter or sprint. */
  progress: {
    label: 'Avancement',
    year: '{percent} de l’année',
    quarter: '{percent} du trimestre',
    sprint: '{percent} du sprint',
    month: '{percent} du mois',
    week: '{percent} de la semaine',
    choose: 'Afficher l’avancement de',
    hide: 'Masquer l’avancement',
  },

  zones: {
    title: 'Fuseaux horaires',
    add: 'Ajouter un fuseau',
    remove: 'Retirer ce fuseau',
    search: 'Ville ou fuseau',
    local: 'Votre fuseau',
    offset: '{offset} par rapport à vous',
    sameTime: 'Même heure que vous',
    overlap: 'Créneau commun : {range}',
    noOverlap: 'Aucun créneau commun dans les heures de travail.',
    nightThere: 'C’est la nuit pour {name}',
    empty: 'Ajoutez le fuseau d’un collaborateur pour aligner vos journées.',
    timeThere: '{time} à {name}',
    assumption: 'Heures de travail supposées identiques aux vôtres.',
    pick: 'Choisir un fuseau',
  },

  /** Maker-schedule guard (1.15) and transition buffers (1.6) when planning a meeting. */
  guard: {
    title: 'Ce créneau coupe votre bloc de création',
    alternatives: 'Créneaux qui le préservent',
    keep: 'Garder ce créneau',
    buffers:
      '{count, plural, one {Ajouter un temps de transition} other {Ajouter # temps de transition}} de {duration}',
    buffersHint: 'Une respiration entre deux réunions rapprochées.',
  },

  /** Planning snapshots: what was planned at the start of the week vs what happened. */
  snapshot: {
    title: 'Prévu et réalisé',
    take: 'Garder une photo du planning',
    taken: 'Photo du planning gardée',
    auto: 'Une photo est prise automatiquement chaque lundi matin.',
    compare: 'Comparer avec la semaine prévue',
    planned: 'Prévu',
    actual: 'Réalisé',
    added: 'Ajouté en cours de route',
    moved: 'Déplacé',
    dropped: 'Retiré',
    summary:
      '{kept, plural, one {# bloc tenu} other {# blocs tenus}} · {moved, plural, one {# déplacé} other {# déplacés}}',
    note: 'Un plan sert à décider, pas à être tenu à la lettre.',
    empty: 'Pas encore de photo pour cette semaine.',
    takenAt: 'Photo du {date} à {time}',
    retake: 'Mettre à jour la photo',
    kept: 'Tenus',
    onTime: 'Terminés à temps',
    slipped: 'Glissés',
    accuracy: 'Estimations : {percent} du temps réel',
    ghosts: 'Les contours pointillés montrent la place prévue.',
  },

  deepLink: {
    copy: 'Copier le lien du créneau',
    copied: 'Lien du créneau copié',
    copiedHint: 'Collez-le dans une note ou sur la toile pour y revenir.',
    openFailed: 'Ce créneau n’existe plus. Il a peut-être été supprimé.',
    copyFailed: 'Copie impossible. Voici le lien : {link}',
  },

  conflict: {
    title: 'Chevauchement',
    body: '« {title} » chevauche « {other} ».',
    keepBoth: 'Garder les deux',
    move: 'Déplacer',
  },

  toast: {
    created: 'Événement ajouté {when}',
    moved: 'Déplacé à {time}',
    deleted: 'Événement supprimé',
    resized: 'Durée ajustée · {duration}',
    updated: 'Événement mis à jour',
    buffers: '{count, plural, one {Temps de transition ajouté} other {# temps de transition ajoutés}}',
  },

  empty: {
    day: {
      title: 'Journée libre',
      body: 'Aucun événement. Glissez une tâche ou écrivez « déjeuner demain 12h30 ».',
      action: 'Ajouter un événement',
    },
    week: {
      title: 'Semaine dégagée',
      body: 'Rien n’est prévu cette semaine. Un bon moment pour protéger des plages de création.',
      action: 'Ajouter un événement',
    },
    month: {
      title: 'Mois dégagé',
      body: 'Aucun événement ce mois-ci.',
    },
  },
};
