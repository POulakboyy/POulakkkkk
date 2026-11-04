/**
 * Calendar: day / week / spiral views, natural-language event entry, time progress watermark,
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
    spiral: 'Spirale',
    spiralHint: 'Le temps en continu, sans coupure de semaine ni de mois.',
  },

  nav: {
    today: 'Aujourd’hui',
    previousDay: 'Jour précédent',
    nextDay: 'Jour suivant',
    previousWeek: 'Semaine précédente',
    nextWeek: 'Semaine suivante',
    goTo: 'Aller à une date',
    weekNumber: 'Semaine {number}',
    rangeA11y: 'Du {start} au {end}',
  },

  spiral: {
    label: 'Spirale du temps',
    zoomIn: 'Rapprocher',
    zoomOut: 'Éloigner',
    turn: 'Un tour = {span, select, week {une semaine} month {un mois} other {une année}}',
    centerOnNow: 'Recentrer sur maintenant',
    a11y: 'Vue en spirale. Utilisez les flèches pour avancer ou reculer dans le temps.',
  },

  event: {
    new: 'Nouvel événement',
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
  },

  deepLink: {
    copy: 'Copier le lien du créneau',
    copied: 'Lien du créneau copié',
    copiedHint: 'Collez-le dans une note ou sur la toile pour y revenir.',
    openFailed: 'Ce créneau n’existe plus. Il a peut-être été supprimé.',
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
  },
};
