/**
 * Command bar / universal capture (⌘K, ⌘⇧Espace): natural-language entry, recognised tokens,
 * actions and keyboard hints.
 */
export const command = {
  a11y: 'Barre de commande',
  placeholder: {
    default: 'Capturer une tâche, chercher, ou taper / pour une commande',
    capture: 'Ex. Appeler Léa demain 15h #perso !haute',
    search: 'Chercher dans les tâches, notes et événements…',
    commands: 'Taper une commande…',
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
    tag: 'Étiquette · {value}',
    person: 'Personne · {value}',
    project: 'Projet · {value}',
    priority: 'Priorité · {value}',
    recurrence: 'Répétition · {value}',
    location: 'Lieu · {value}',
    remove: 'Retirer « {value} »',
  },

  /** What Enter will create. */
  intent: {
    task: 'Créer la tâche',
    event: 'Créer l’événement',
    note: 'Créer la note',
    idea: 'Envoyer dans la boîte de réception',
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
    toggleZen: 'Interface zen',
    openSettings: 'Ouvrir les réglages',
    shortcuts: 'Raccourcis clavier',
  },

  sections: {
    suggestions: 'Suggestions',
    recent: 'Récents',
    actions: 'Actions',
    tasks: 'Tâches',
    notes: 'Notes',
    events: 'Événements',
    canvases: 'Toiles',
  },

  hints: {
    select: '{key} pour valider',
    navigate: '↑ ↓ pour naviguer',
    close: '{key} pour fermer',
    commands: '/ pour les commandes',
    newLine: '{key} pour une nouvelle ligne',
    syntax: '#étiquette · @personne · !priorité · +projet',
  },

  result: {
    created:
      '{kind, select, task {Tâche créée} event {Événement créé} note {Note créée} other {Envoyé dans la boîte de réception}}',
    open: 'Ouvrir',
  },

  empty: 'Aucune commande ne correspond. Entrée pour en faire une tâche.',
};
