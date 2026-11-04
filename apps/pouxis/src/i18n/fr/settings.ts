/**
 * Settings. Each option = label + short hint saying what it changes, in the user's terms.
 * `{duration}` from `formatDuration`, `{time}` from `formatTime`.
 */
export const settings = {
  title: 'Réglages',
  search: 'Rechercher un réglage',
  reset: 'Revenir aux valeurs par défaut',
  resetDone: 'Valeurs par défaut rétablies',

  sections: {
    appearance: 'Apparence',
    work: 'Travail',
    focus: 'Focus',
    language: 'Langue et région',
    keyboard: 'Clavier',
    sync: 'Synchronisation et appareils',
    privacy: 'Confidentialité',
    data: 'Données',
    about: 'À propos',
  },

  appearance: {
    theme: {
      label: 'Thème',
      light: 'Clair',
      dark: 'Sombre',
      auto: 'Comme le système',
      daylight: 'Suivre le soleil',
      daylightHint:
        'Passe progressivement au sombre en soirée, selon le lever et le coucher du soleil.',
      eink: 'Encre électronique',
      einkHint: 'Noir et blanc pur, contraste maximal, sans animation : pour les liseuses.',
    },
    zen: {
      label: 'Interface zen',
      hint: 'Les barres et menus s’effacent après 3 secondes sans mouvement, et reviennent au moindre geste.',
    },
    reducedMotion: {
      label: 'Réduire les animations',
      hint: 'Suit le réglage du système par défaut.',
      system: 'Comme le système',
    },
    haptics: {
      label: 'Retour haptique',
      hint: 'De légères vibrations quand vous terminez une tâche ou liez deux nœuds.',
    },
    textSize: 'Taille du texte',
  },

  work: {
    hours: {
      label: 'Heures de travail',
      hint: 'Le placement automatique et les notifications respectent ces horaires.',
      start: 'Début',
      end: 'Fin',
      days: 'Jours travaillés',
      summary: '{start} – {end}, {days}',
    },
    modes: {
      label: 'Types de travail',
      hint: 'Création pour produire, organisation pour faire tourner. Sert au bilan d’équilibre.',
      defaultMode: 'Type par défaut des nouvelles tâches',
    },
    buffers: {
      label: 'Transitions entre réunions',
      hint: 'Un temps libre inséré entre deux réunions qui se suivent.',
      off: 'Aucune transition',
    },
    maker: {
      label: 'Protéger les plages de création',
      hint: 'Prévient quand une réunion couperait une plage de travail profond.',
      length: 'Longueur minimale d’une plage',
    },
    wip: {
      label: 'Priorités par jour',
      hint: 'Au-delà, POuxis propose d’échanger plutôt que d’empiler.',
      value: '{count, plural, one {# priorité} other {# priorités}}',
    },
    decay: {
      label: 'Signaler les tâches souvent reportées',
      hint: 'Une tâche change d’apparence après ce nombre de reports, pour inviter à décider.',
      value: '{count, plural, one {Après # report} other {Après # reports}}',
    },
  },

  focus: {
    pomodoro: 'Durée d’un focus',
    shortBreak: 'Petite pause',
    longBreak: 'Longue pause',
    longBreakEvery: 'Longue pause toutes les {count} sessions',
    dnd: {
      label: 'Ne pas déranger pendant le focus',
      hint: 'Active le mode Ne pas déranger de l’appareil le temps d’une session.',
    },
    sound: 'Son de fin de session',
  },

  language: {
    label: 'Langue',
    fr: 'Français',
    en: 'English',
    timeZone: 'Fuseau horaire',
    timeZoneAuto: 'Détecter automatiquement',
    weekStart: 'Premier jour de la semaine',
    changed: 'Langue changée',
  },

  keyboard: {
    title: 'Raccourcis clavier',
    hint: 'Chaque raccourci se modifie ici, ou dans le fichier de configuration JSON.',
    capture: 'Capture universelle',
    record: 'Appuyez sur la nouvelle combinaison…',
    conflict: 'Déjà utilisé par « {action} ».',
    replace: 'Remplacer',
    vim: 'Mode Vim',
    vimHint: 'Navigation h j k l, et modes normal et insertion dans les éditeurs.',
    openFile: 'Ouvrir le fichier de configuration',
    invalidFile:
      'Le fichier de configuration contient une erreur ligne {line} : {reason}. Les raccourcis précédents restent actifs.',
    resetAll: 'Rétablir tous les raccourcis',
  },

  sync: {
    title: 'Synchronisation',
    localOnly: 'Uniquement sur cet appareil',
    localOnlyHint: 'Vos données restent ici. Vous pouvez activer la synchronisation à tout moment.',
    enable: 'Activer la synchronisation',
    server: 'Adresse du serveur',
    serverHint: 'Votre propre serveur POuxis, ou celui d’une personne de confiance.',
    status: 'État : {status}',
    lastSync: 'Dernière synchronisation {time}',
    syncNow: 'Synchroniser maintenant',
    lowBandwidth: 'Économiser les données',
    lowBandwidthHint: 'N’échange que les modifications, utile en 3G ou en réseau instable.',
    devices: {
      title: 'Appareils',
      thisDevice: 'Cet appareil',
      lastSeen: 'Vu {time}',
      add: 'Ajouter un appareil',
      addHint: 'Scannez ce code depuis l’autre appareil.',
      remove: 'Retirer cet appareil',
      removed: '« {name} » ne se synchronisera plus',
    },
    encryption: 'Chiffré de bout en bout : le serveur ne peut pas lire vos données.',
  },

  privacy: {
    telemetry: {
      label: 'Statistiques locales',
      hint: 'Calculées et gardées sur cet appareil pour alimenter votre bilan. Jamais envoyées.',
    },
    crashReports: {
      label: 'Rapports d’erreur',
      hint: 'Vous montre le rapport avant tout envoi. Désactivé par défaut.',
    },
    clear: 'Effacer les statistiques locales',
    cleared: 'Statistiques effacées',
  },

  data: {
    export: {
      label: 'Tout exporter',
      hint: 'Une archive .zip avec toutes vos données en JSON lisible et vos fichiers.',
      action: 'Exporter mes données',
      running: 'Préparation de l’archive…',
      done: 'Archive prête',
    },
    import: {
      label: 'Importer',
      hint: 'Depuis une archive POuxis, un fichier Markdown ou un calendrier .ics.',
      done: '{count, plural, one {# élément importé} other {# éléments importés}}',
    },
    cleanup: {
      label: 'Archiver les vieux brouillons',
      hint: 'Les brouillons sans modification depuis 2 ans passent dans les archives. Rien n’est supprimé.',
    },
    deleteAll: {
      label: 'Supprimer toutes les données de cet appareil',
      hint: 'Exportez d’abord si vous voulez les garder. Les autres appareils synchronisés ne sont pas touchés.',
      confirmTitle: 'Supprimer toutes les données de cet appareil ?',
      confirmBody:
        'Tâches, notes, événements et toiles seront effacés de cet appareil. C’est irréversible.',
      confirmType: 'Tapez {word} pour confirmer',
      confirmWord: 'SUPPRIMER',
      action: 'Tout supprimer',
      keep: 'Garder mes données',
    },
  },

  about: {
    version: 'Version {version}',
    tagline: 'Logiciel libre, local d’abord.',
    licence: 'Licence',
    licences: 'Licences des composants',
    source: 'Code source',
    changelog: 'Nouveautés',
    feedback: 'Signaler un problème',
    credits: 'Remerciements',
  },
};
