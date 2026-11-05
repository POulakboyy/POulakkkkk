/**
 * Command bar / universal capture (⌘K, ⌘⇧Espace): natural-language entry, recognised tokens,
 * actions and keyboard hints.
 */
export const command = {
  a11y: 'Barre de commande',
  /** Accessible name of the composer field. */
  input: 'Capturer, chercher ou taper une commande',
  placeholder: {
    default: 'Capturer une tâche, chercher, ou taper / pour une commande',
    capture: 'Ex. Appeler Léa demain 15h #perso !haute',
    search: 'Chercher dans les tâches, notes et événements…',
    commands: 'Taper une commande…',
    mobile: 'Capturer ou chercher…',
  },

  modes: {
    capture: 'Capturer',
    search: 'Chercher',
    commands: 'Commandes',
  },

  /** Chips shown under the input for each token the parser recognised. */
  tokens: {
    a11y: 'Éléments reconnus',
    date: 'Date · {value}',
    time: 'Heure · {value}',
    duration: 'Durée · {value}',
    deadline: 'Échéance · {value}',
    tag: 'Étiquette · {value}',
    person: 'Personne · {value}',
    project: 'Projet · {value}',
    priority: 'Priorité · {value}',
    recurrence: 'Répétition · {value}',
    location: 'Lieu · {value}',
    remove: 'Retirer « {value} »',
  },

  /** Card previewing the record Enter will create. */
  preview: {
    a11y: 'Ce qui sera créé',
    task: 'Tâche',
    event: 'Événement',
    inbox: 'Boîte de réception',
    asEvent: 'En faire un événement',
    asTask: 'En faire une tâche',
    estimate: 'Environ {duration}',
    deadline: 'Avant le {date}',
    with: 'Avec {people}',
    repeats: 'Se répète · {rule}',
    pinned: 'Heure fixée',
    many: '{count, plural, one {# élément sera créé} other {# éléments seront créés}}',
    empty: 'Écrivez une tâche, un rendez-vous ou une idée, comme il vient.',
  },

  /** What Enter will create. */
  intent: {
    task: 'Créer la tâche',
    event: 'Créer l’événement',
    note: 'Créer la note',
    idea: 'Envoyer dans la boîte de réception',
    many: '{count, plural, one {Créer # élément} other {Créer # éléments}}',
  },

  actions: {
    newTask: 'Nouvelle tâche',
    newEvent: 'Nouvel événement',
    newNote: 'Nouvelle note',
    newCanvas: 'Nouvelle toile',
    brainDump: 'Vider sa tête',
    startFocus: 'Commencer un focus',
    triageInbox: 'Trier la boîte de réception',
    reroute: 'Réorganiser la journée',
    goTo: 'Aller à {view}',
    toggleTheme: 'Changer de thème',
    setTheme: 'Thème · {theme}',
    toggleZen: 'Interface zen',
    openSettings: 'Ouvrir les réglages',
    shortcuts: 'Raccourcis clavier',
    exportData: 'Exporter mes données',
    replayOnboarding: 'Revoir l’introduction',
    openGallery: 'Bibliothèque de composants',
    language: 'Langue · {language}',
  },

  sections: {
    create: 'Créer',
    suggestions: 'Suggestions',
    recent: 'Récents',
    actions: 'Actions',
    commands: 'Commandes',
    tasks: 'Tâches',
    notes: 'Notes',
    events: 'Événements',
    canvases: 'Toiles',
    journal: 'Journal',
  },

  hints: {
    select: '{key} pour valider',
    navigate: '↑ ↓ pour naviguer',
    close: '{key} pour fermer',
    commands: '{key} pour les commandes',
    newLine: '{key} pour une nouvelle ligne',
    complete: '{key} pour compléter',
    syntax: '#étiquette · @personne · p1 · demain 14 h',
  },

  /** Inline completion offered for `#tag` / `@person`; Tab accepts it. */
  suggestion: 'Suggestion : {value}',

  result: {
    created:
      '{kind, select, task {Tâche créée} event {Événement créé} note {Note créée} other {Envoyé dans la boîte de réception}}',
    createdMany: '{count, plural, one {# élément créé} other {# éléments créés}}',
    open: 'Ouvrir',
  },

  empty: 'Aucune commande ne correspond. Entrée pour en faire une tâche.',
  noMatch: 'Aucune commande ne correspond à « {query} »',

  voice: {
    start: 'Dicter',
    stop: 'Arrêter la dictée',
    listening: 'À l’écoute…',
    unsupported: 'La dictée n’est pas disponible sur ce navigateur.',
    denied:
      'Le micro n’est pas autorisé. Vous pouvez l’activer dans les réglages du système ou du navigateur.',
    failed: 'La dictée s’est interrompue. Vous pouvez réessayer.',
  },

  /** Default titles of records created from a command. */
  newNoteTitle: 'Nouvelle note',
  newCanvasTitle: 'Nouvelle toile',

  /** Minimal window opened by the global shortcut (desktop). */
  quick: {
    title: 'Capture rapide',
    saved: 'Capturé · {title}',
    hint: 'Entrée pour garder, Échap pour fermer',
  },
};
