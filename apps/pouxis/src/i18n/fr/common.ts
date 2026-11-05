/**
 * Shared vocabulary: generic buttons, states, domain labels (priority, status, mode…) and counts.
 * Copy rules: docs/design/UX_WRITING.md. Plurals use ICU-lite: `{count, plural, one {…} other {…}}`.
 */
export const common = {
  appName: 'POuxis',
  loading: 'Chargement…',
  save: 'Enregistrer',
  cancel: 'Annuler',
  close: 'Fermer',
  delete: 'Supprimer',
  /** Undo button in toasts (Spark-style: act first, offer undo, no confirmation dialog). */
  undo: 'Annuler',
  done: 'Terminé',

  actions: {
    add: 'Ajouter',
    create: 'Créer',
    edit: 'Modifier',
    rename: 'Renommer',
    duplicate: 'Dupliquer',
    archive: 'Archiver',
    unarchive: 'Désarchiver',
    restore: 'Restaurer',
    retry: 'Réessayer',
    confirm: 'Confirmer',
    continue: 'Continuer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    skip: 'Passer',
    later: 'Plus tard',
    notNow: 'Pas maintenant',
    start: 'Commencer',
    pause: 'Mettre en pause',
    resume: 'Reprendre',
    stop: 'Arrêter',
    finish: 'Terminer',
    open: 'Ouvrir',
    more: 'Plus d’options',
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    share: 'Partager',
    copy: 'Copier',
    copyLink: 'Copier le lien',
    paste: 'Coller',
    export: 'Exporter',
    import: 'Importer',
    download: 'Télécharger',
    send: 'Envoyer',
    select: 'Sélectionner',
    selectAll: 'Tout sélectionner',
    deselectAll: 'Tout désélectionner',
    clear: 'Effacer',
    apply: 'Appliquer',
    reset: 'Réinitialiser',
    keep: 'Garder',
    discard: 'Ne pas garder',
    move: 'Déplacer',
    pin: 'Épingler',
    unpin: 'Désépingler',
    expand: 'Déplier',
    collapse: 'Replier',
    showMore: 'Afficher plus',
    showLess: 'Afficher moins',
    gotIt: 'Compris',
    learnMore: 'En savoir plus',
    allow: 'Autoriser',
    dismiss: 'Masquer',
  },

  state: {
    saving: 'Enregistrement…',
    saved: 'Enregistré',
    unsaved: 'Modifications non enregistrées',
    on: 'Activé',
    off: 'Désactivé',
    auto: 'Automatique',
    optional: 'Facultatif',
    required: 'Obligatoire',
    beta: 'Bêta',
    comingSoon: 'Bientôt',
  },

  /** Sync indicator, mirrors the store's `SyncStatus`. `{time}` comes from `formatRelativeTime`. */
  sync: {
    offline: 'Hors ligne · tout est gardé sur cet appareil',
    connecting: 'Connexion…',
    syncing: 'Synchronisation…',
    synced: 'À jour',
    syncedAgo: 'À jour · {time}',
    error: 'Synchronisation en pause',
    a11y: 'État de la synchronisation : {status}',
  },

  priority: {
    label: 'Priorité',
    none: 'Aucune',
    low: 'Basse',
    medium: 'Moyenne',
    high: 'Haute',
  },

  /** Task statuses (`TaskStatus`). Feminine: they qualify « tâche ». */
  status: {
    inbox: 'À trier',
    todo: 'À faire',
    doing: 'En cours',
    done: 'Terminée',
    archived: 'Archivée',
  },

  /** Work modes (`WorkMode`): drives the create/organize balance and the UI tint. */
  mode: {
    label: 'Type de travail',
    create: 'Création',
    organize: 'Organisation',
    createHint: 'Produire : écrire, dessiner, coder, composer',
    organizeHint: 'Faire tourner : e-mails, administratif, planification',
  },

  energy: {
    label: 'Énergie',
    low: 'Basse',
    medium: 'Moyenne',
    high: 'Haute',
  },

  /** Calendar event kinds (`EventKind`). */
  eventKind: {
    meeting: 'Réunion',
    focus: 'Bloc focus',
    personal: 'Personnel',
    travel: 'Trajet',
    buffer: 'Transition',
  },

  /** Category palette `--cat-1…8`, for colour pickers and screen readers. */
  colors: {
    cat1: 'Pêche',
    cat2: 'Miel',
    cat3: 'Menthe',
    cat4: 'Ciel',
    cat5: 'Lavande',
    cat6: 'Rose',
    cat7: 'Lagon',
    cat8: 'Sable',
  },

  time: {
    now: 'Maintenant',
    allDay: 'Toute la journée',
    noDate: 'Sans date',
    noTime: 'Sans heure',
    morning: 'Matin',
    afternoon: 'Après-midi',
    evening: 'Soir',
    /** `{start}`/`{end}` from `formatTime`. Prefer `formatTimeRange` for visible text. */
    range: 'de {start} à {end}',
    until: 'jusqu’à {time}',
    at: '{day} à {time}',
  },

  count: {
    tasks: '{count, plural, =0 {Aucune tâche} one {# tâche} other {# tâches}}',
    events: '{count, plural, =0 {Aucun événement} one {# événement} other {# événements}}',
    notes: '{count, plural, =0 {Aucune note} one {# note} other {# notes}}',
    ideas: '{count, plural, =0 {Aucune idée} one {# idée} other {# idées}}',
    items: '{count, plural, =0 {Aucun élément} one {# élément} other {# éléments}}',
    days: '{count, plural, one {# jour} other {# jours}}',
    weeks: '{count, plural, one {# semaine} other {# semaines}}',
    sessions: '{count, plural, one {# session} other {# sessions}}',
    selected:
      '{count, plural, =0 {Aucun élément sélectionné} one {# élément sélectionné} other {# éléments sélectionnés}}',
    more: '{count, plural, one {# autre} other {# autres}}',
  },

  /** Generic toasts. Prefer the specific ones of each namespace (`tasks.toast.*`). */
  toast: {
    saved: 'Enregistré',
    copied: 'Copié',
    linkCopied: 'Lien copié',
    deleted: 'Supprimé',
    archived: 'Archivé',
    restored: 'Restauré',
    undone: 'Action annulée',
  },

  form: {
    required: 'Ce champ est nécessaire',
    tooLong: '{max, number} caractères maximum',
    invalidNumber: 'Entrez un nombre',
    invalidTime: 'Entrez une heure, par exemple 14:30',
    invalidDate: 'Entrez une date, par exemple 12/11',
    invalidEmail: 'Entrez une adresse e-mail complète, par exemple nom@exemple.fr',
    invalidUrl: 'Entrez une adresse complète, commençant par https://',
  },

  search: {
    placeholder: 'Rechercher…',
    clear: 'Effacer la recherche',
    results: '{count, plural, =0 {Aucun résultat} one {# résultat} other {# résultats}}',
    noResults: 'Aucun résultat pour « {query} »',
    noResultsHint: 'Essayez un autre mot ou une idée proche : la recherche comprend le sens.',
    semantic: 'Recherche par le sens',
  },

  /** Key names for shortcut hints. Symbols (⌘ ⌥ ⇧) are used as is on macOS/iOS. */
  keys: {
    cmd: '⌘',
    ctrl: 'Ctrl',
    alt: 'Alt',
    option: '⌥',
    shift: 'Maj',
    enter: 'Entrée',
    escape: 'Échap',
    tab: 'Tab',
    space: 'Espace',
    backspace: 'Retour arrière',
    delete: 'Suppr',
    up: 'Haut',
    down: 'Bas',
    left: 'Gauche',
    right: 'Droite',
  },
};
