/**
 * Tasks: list / kanban / Eisenhower matrix, inbox triage (Spark-like), dependencies, decay,
 * WIP limit, subtasks, pomodoro, formula fields, recurrence, swipe actions.
 */
export const tasks = {
  title: 'Tâches',

  add: {
    placeholder: 'Ajouter une tâche…',
    button: 'Ajouter une tâche',
    hint: 'Astuce : « Appeler Léa demain 15h #perso » remplit la date et l’étiquette.',
    added: 'Tâche ajoutée',
    addedTo: 'Ajoutée à {list}',
  },

  views: {
    label: 'Affichage',
    list: 'Liste',
    kanban: 'Tableau',
    matrix: 'Matrice',
  },

  groups: {
    inbox: 'À trier',
    today: 'Aujourd’hui',
    upcoming: 'À venir',
    someday: 'Un jour',
    noDate: 'Sans date',
    /** Past deadline or past scheduled day. Never « en retard ». */
    toReschedule: 'À replanifier',
    toRescheduleHint: 'Leur date est passée. Choisissez un nouveau moment, ou laissez-les partir.',
    waiting: 'En attente',
    done: 'Terminées',
    showDone: 'Afficher les terminées',
    hideDone: 'Masquer les terminées',
  },

  fields: {
    title: 'Titre',
    titlePlaceholder: 'Que faut-il faire ?',
    notes: 'Notes',
    notesPlaceholder: 'Détails, liens, contexte…',
    project: 'Projet',
    noProject: 'Sans projet',
    tags: 'Étiquettes',
    addTag: 'Ajouter une étiquette',
    priority: 'Priorité',
    important: 'Important',
    estimate: 'Durée estimée',
    noEstimate: 'Sans estimation',
    deadline: 'Échéance',
    scheduled: 'Créneau',
    floatingDay: 'Jour, sans heure',
    energy: 'Énergie demandée',
    mode: 'Type de travail',
    recurrence: 'Répétition',
    location: 'Lieu',
    dependsOn: 'Attend',
    subtasks: 'Sous-tâches',
    timeSpent: 'Temps passé',
    createdAt: 'Créée {when}',
    completedAt: 'Terminée {when}',
  },

  detail: {
    a11y: 'Détails de la tâche',
    markDone: 'Marquer comme terminée',
    markTodo: 'Marquer comme à faire',
    schedule: 'Planifier',
    unschedule: 'Retirer du calendrier',
    makeFloating: 'Garder sans heure',
    focus: 'Focus unique',
    copyLink: 'Copier le lien de la tâche',
    delete: 'Supprimer la tâche',
    noNotes: 'Pas encore de notes',
  },

  /** Inbox triage, one card at a time. Swipe / keys map to `actions`. */
  inbox: {
    title: 'Boîte de réception',
    hint: 'Tout ce que vous capturez arrive ici. Triez quand vous avez un moment.',
    triage: 'Trier',
    triageA11y: 'Tri de la boîte de réception',
    progress: '{current} sur {total}',
    actions: {
      today: 'Aujourd’hui',
      tomorrow: 'Demain',
      schedule: 'Choisir une date',
      someday: 'Un jour',
      project: 'Ranger dans un projet',
      delegate: 'Déléguer',
      done: 'Déjà fait',
      delete: 'Supprimer',
    },
    fromEmail: 'Reçue par e-mail',
    fromVoice: 'Dictée',
    emailAddress: 'Transférez un e-mail à {address} pour en faire une tâche.',
    zero: {
      title: 'Tout est trié',
      body: 'Rien n’attend votre décision. Les prochaines captures arriveront ici.',
    },
  },

  kanban: {
    columns: {
      todo: 'À faire',
      doing: 'En cours',
      done: 'Terminé',
    },
    groupBy: 'Grouper par',
    groupByOptions: {
      status: 'Statut',
      project: 'Projet',
      priority: 'Priorité',
      tag: 'Étiquette',
    },
    addCard: 'Ajouter une carte',
    dropHere: 'Déposer ici',
    columnEmpty: 'Aucune carte',
    wip: '{count} sur {limit}',
    wipA11y: '{count} tâches en cours, pour une limite de {limit}',
  },

  /** Eisenhower matrix. Placement is computed from deadline, priority and tags. */
  matrix: {
    title: 'Matrice d’Eisenhower',
    hint: 'Les tâches s’y placent d’après leur échéance, leur priorité et leurs étiquettes. Déplacez-les si vous voyez les choses autrement.',
    urgent: 'Urgent',
    notUrgent: 'Pas urgent',
    important: 'Important',
    notImportant: 'Pas important',
    quadrants: {
      do: { title: 'Faire maintenant', hint: 'Urgent et important' },
      schedule: {
        title: 'Planifier',
        hint: 'Important, pas urgent : c’est ici que se construit l’essentiel',
      },
      delegate: {
        title: 'Déléguer',
        hint: 'Urgent, pas important : quelqu’un d’autre peut-il s’en charger ?',
      },
      drop: { title: 'Mettre de côté', hint: 'Ni urgent ni important : à alléger sans regret' },
    },
    autoPlaced: 'Placée automatiquement',
    whyHere: 'Pourquoi ici ?',
    reasons: {
      deadline: 'Échéance {when}',
      priority: 'Priorité haute',
      tag: 'Étiquette « {tag} »',
      manual: 'Placée par vous',
    },
    empty: 'Rien dans ce quadrant',
  },

  dependencies: {
    title: 'Dépendances',
    waitingOn: 'Attend « {title} »',
    waitingOnMany: '{count, plural, one {Attend # tâche} other {Attend # tâches}}',
    unlocks: '{count, plural, one {Débloque # tâche} other {Débloque # tâches}}',
    hiddenUntil: 'Apparaîtra dans Aujourd’hui quand « {title} » sera terminée.',
    add: 'Ajouter une tâche préalable',
    remove: 'Retirer la dépendance',
    cycle: 'Impossible : « {title} » attend déjà cette tâche, cela créerait une boucle.',
    a11y: 'En attente d’une autre tâche',
  },

  /** Task decay (postponed ≥ threshold). Informational, never a reproach. */
  decay: {
    postponed: '{count, plural, one {Reportée # fois} other {Reportée # fois}}',
    hint: 'Une tâche souvent repoussée est peut-être trop grosse, floue, ou moins utile qu’avant. Rien de grave : il suffit de décider.',
    split: 'La découper',
    reschedule: 'Lui réserver un créneau',
    someday: 'La garder pour un jour',
    letGo: 'La laisser partir',
    keep: 'La garder telle quelle',
    letGoDone: 'Tâche archivée. Vous pourrez toujours la retrouver.',
    a11y: 'Reportée plusieurs fois',
  },

  /** WIP limit dialog: adding one more high-priority task than `prefs.wipLimit`. */
  wip: {
    title: 'Votre journée compte déjà {limit} priorités',
    body: 'C’est la limite que vous avez choisie. En ajouter une disperse souvent l’attention : voulez-vous plutôt en échanger une ?',
    swap: 'Échanger avec une autre',
    swapPick: 'Laquelle garder pour plus tard ?',
    tomorrow: 'La prévoir demain',
    withoutPriority: 'L’ajouter sans priorité',
    changeLimit: 'Modifier la limite',
    counter: '{count} sur {limit} priorités',
    counterA11y: '{count} priorités sur {limit} aujourd’hui',
  },

  subtasks: {
    title: 'Sous-tâches',
    add: 'Ajouter une sous-tâche',
    placeholder: 'Étape suivante…',
    progress: '{done} sur {total}',
    progressA11y: '{done} sous-tâches terminées sur {total}',
    split: 'Découper en étapes',
    splitting: 'Découpage en cours…',
    proposed: '{count, plural, one {# étape proposée} other {# étapes proposées}}',
    review: 'Relisez et gardez ce qui vous sert.',
    keepAll: 'Tout garder',
    keepSelected: 'Garder la sélection',
    regenerate: 'Proposer autre chose',
    splitFailed: 'Le découpage n’a pas abouti. Vous pouvez ajouter les étapes à la main.',
    empty: 'Pas de sous-tâche. Découpez-la si elle vous paraît grosse.',
  },

  pomodoro: {
    start: 'Lancer un pomodoro',
    focus: 'Focus',
    shortBreak: 'Petite pause',
    longBreak: 'Longue pause',
    logged: '+{duration} sur cette tâche',
    total: 'Temps passé : {duration}',
    estimateVsActual: 'Estimé {estimate} · réel {actual}',
    sessions: '{count, plural, one {# session} other {# sessions}}',
    noLogs: 'Aucun temps enregistré pour l’instant',
  },

  /** Programmable fields; formula errors explain where and how to fix. */
  formulas: {
    title: 'Champs personnalisés',
    add: 'Ajouter un champ',
    name: 'Nom du champ',
    type: 'Type',
    types: {
      number: 'Nombre',
      text: 'Texte',
      checkbox: 'Case à cocher',
      date: 'Date',
      formula: 'Formule',
    },
    formula: 'Formule',
    placeholder: 'Ex. estimation * taux_horaire',
    help: 'Utilisez les noms des champs, des nombres et + - * / ( ).',
    preview: 'Résultat : {value}',
    errors: {
      syntax: 'La formule ne se lit pas, près de « {near} ».',
      unknownField: 'Aucun champ ne s’appelle « {name} ». Vérifiez l’orthographe.',
      divideByZero: 'Division par zéro : « {name} » vaut 0.',
      cycle: 'Ce champ se calcule à partir de lui-même.',
      notANumber: '« {name} » n’est pas un nombre.',
    },
  },

  recurrence: {
    label: 'Répétition',
    none: 'Ne se répète pas',
    placeholder: 'Ex. le 3e mardi ouvré de chaque mois',
    presets: {
      daily: 'Chaque jour',
      weekdays: 'Chaque jour ouvré',
      weekly: 'Chaque semaine',
      monthly: 'Chaque mois',
      yearly: 'Chaque année',
      custom: 'Personnaliser…',
    },
    next: 'Prochaines : {dates}',
    invalid: 'Règle non reconnue. Essayez « chaque lundi » ou « le 1er de chaque mois ».',
  },

  geo: {
    title: 'Rappel de lieu',
    when: 'En arrivant à {place}',
    radius: 'Rayon : {distance}',
    add: 'Ajouter un lieu',
    remove: 'Retirer le lieu',
    needsPermission: 'Pour vous le rappeler sur place, POuxis a besoin de votre position.',
  },

  delegate: {
    title: 'Déléguer',
    to: 'Déléguer à',
    placeholder: 'Nom ou e-mail',
    webhook: 'Prévenir via un webhook',
    sent: 'Envoyé à {name}',
    failed: 'Impossible de prévenir {name} pour l’instant. Nouvel essai automatique dans quelques minutes.',
  },

  focusMode: {
    enter: 'Focus unique',
    exit: 'Quitter le focus unique',
    hint: 'Seule cette tâche reste à l’écran. Échap pour revenir.',
  },

  voice: {
    record: 'Dicter une tâche',
    recording: 'Écoute…',
    stop: 'Arrêter la dictée',
    transcribing: 'Transcription…',
    result: 'Compris : « {text} »',
    edit: 'Corriger',
    failed: 'La transcription n’a pas abouti. L’enregistrement est gardé : réessayez plus tard.',
  },

  swipe: {
    complete: 'Terminer',
    schedule: 'Planifier',
    later: 'Plus tard',
    archive: 'Archiver',
    delete: 'Supprimer',
  },

  sort: {
    label: 'Trier par',
    manual: 'Ordre manuel',
    priority: 'Priorité',
    deadline: 'Échéance',
    created: 'Date de création',
    estimate: 'Durée estimée',
  },

  bulk: {
    selected: '{count, plural, one {# tâche sélectionnée} other {# tâches sélectionnées}}',
    complete: 'Terminer',
    schedule: 'Planifier',
    move: 'Déplacer',
    delete: 'Supprimer',
  },

  /** Toasts — always paired with `common.undo` when the action is reversible. */
  toast: {
    completed: 'Tâche terminée',
    completedMany: '{count, plural, one {# tâche terminée} other {# tâches terminées}}',
    reopened: 'Tâche rouverte',
    deleted: 'Tâche supprimée',
    deletedMany: '{count, plural, one {# tâche supprimée} other {# tâches supprimées}}',
    archived: 'Tâche archivée',
    duplicated: 'Tâche dupliquée',
    moved: 'Déplacée vers {list}',
    scheduled: 'Planifiée {when}',
    postponed: 'Reportée à {when}',
    linkCopied: 'Lien de la tâche copié',
  },

  empty: {
    list: {
      title: 'Aucune tâche ici',
      body: 'Ajoutez la première, ou capturez-la depuis n’importe où avec {shortcut}.',
      action: 'Ajouter une tâche',
    },
    done: {
      title: 'Rien de terminé pour l’instant',
      body: 'Les tâches terminées s’afficheront ici : de quoi voir le chemin parcouru.',
    },
    project: {
      title: 'Projet vide',
      body: 'Ajoutez une première tâche pour lancer ce projet.',
      action: 'Ajouter une tâche',
    },
    filtered: {
      title: 'Aucune tâche ne correspond',
      body: 'Essayez de retirer un filtre.',
      action: 'Effacer les filtres',
    },
  },
};
