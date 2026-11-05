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
    lab: 'Labo',
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
    location: {
      label: 'Position pour suivre le soleil',
      hint: 'Utilisée uniquement sur cet appareil, pour calculer le lever et le coucher du soleil.',
      locate: 'Utiliser ma position',
      set: 'Position enregistrée · {latitude}, {longitude}',
      missing: 'Sans position, le thème suit celui du système.',
      denied: 'Position indisponible. Le thème suit celui du système en attendant.',
      clear: 'Oublier la position',
    },
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
    hoursInvalid: 'L’heure de fin doit venir après l’heure de début.',
    chronotype: {
      label: 'Moment de la journée le plus vif',
      hint: 'Point de départ de la carte d’énergie du bilan, affinée ensuite par vos journées réelles.',
      unset: 'Non précisé',
    },
    minutes: '{count} min',
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
    hint: 'Les dates, heures et nombres suivent la langue choisie.',
  },

  keyboard: {
    title: 'Raccourcis clavier',
    hint: 'Choisissez une disposition, puis ajustez chaque raccourci en JSON si besoin.',
    capture: 'Capture universelle',
    record: 'Appuyez sur la nouvelle combinaison…',
    conflict: 'Déjà utilisé par « {action} ».',
    replace: 'Remplacer',
    vim: 'Mode Vim',
    vimHint:
      'Vim : g puis une lettre pour changer de vue, j et k pour passer d’un élément à l’autre, / pour capturer.',
    openFile: 'Ouvrir le fichier de configuration',
    invalidFile:
      'Le fichier de configuration contient une erreur ligne {line} : {reason}. Les raccourcis précédents restent actifs.',
    resetAll: 'Rétablir tous les raccourcis',
    preset: 'Disposition',
    presets: {
      default: 'Standard',
      vim: 'Vim',
    },
    editor: 'Raccourcis personnalisés (JSON)',
    editorHint:
      'Associez une action à une ou plusieurs touches, par exemple « mod+k » ou « g t ». null retire un raccourci.',
    apply: 'Appliquer',
    applied: 'Raccourcis appliqués',
    valid: 'Configuration valide',
    template: 'Partir de la disposition actuelle',
    table: 'Raccourcis actifs',
    action: 'Action',
    keys: 'Touches',
    none: 'Aucun',
    then: 'puis',
    errors: {
      syntax: 'le JSON est mal formé',
      notObject: 'un objet JSON est attendu à la racine',
      unknownAction: 'l’action « {detail} » n’existe pas',
      invalidValue: 'une liste de raccourcis est attendue pour « {detail} »',
      invalidCombo: 'le raccourci « {detail} » n’est pas reconnu',
      conflict: '« {detail} » est déjà utilisé par « {other} »',
    },
    actions: {
      commandOpen: 'Ouvrir la barre de commande',
      commandPalette: 'Ouvrir les commandes',
      navToday: 'Aller à Aujourd’hui',
      navTasks: 'Aller aux Tâches',
      navCalendar: 'Aller au Calendrier',
      navCanvas: 'Aller à la Toile',
      navIdeas: 'Aller aux Idées',
      navInsights: 'Aller au Bilan',
      navSettings: 'Ouvrir les réglages',
      navLab: 'Ouvrir le labo',
      noteNew: 'Nouvelle note',
      ideasBrainDump: 'Vider sa tête',
      focusStart: 'Commencer un focus',
      themeCycle: 'Changer de thème',
      zenToggle: 'Interface zen',
      moveNext: 'Élément suivant',
      movePrevious: 'Élément précédent',
    },
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
    url: 'Adresse du relais',
    urlHint: 'Un serveur POuxis en https://, le vôtre ou celui d’une personne de confiance.',
    token: 'Jeton d’accès',
    tokenHint: 'Fourni par la personne qui gère le relais.',
    space: 'Identifiant d’espace',
    spaceHint:
      'Laissez vide sur le premier appareil, puis recopiez celui qui s’affiche sur les suivants.',
    passphrase: 'Phrase de passe',
    passphraseHint:
      'Au moins 15 caractères. Elle chiffre vos données et ne quitte jamais cet appareil. Sans elle, personne ne peut les lire.',
    passphraseShort: 'Au moins 15 caractères, pour un chiffrement solide.',
    show: 'Afficher la phrase de passe',
    hide: 'Masquer la phrase de passe',
    connect: 'Connecter cet appareil',
    connected: 'Synchronisation activée',
    disable: 'Arrêter la synchronisation',
    disabled: 'Synchronisation arrêtée. Vos données restent sur cet appareil.',
    unlock: 'Déverrouiller',
    locked: 'Entrez la phrase de passe pour reprendre la synchronisation sur cet appareil.',
    pending:
      '{count, plural, =0 {Tout est envoyé} one {# modification à envoyer} other {# modifications à envoyer}}',
    failed: 'Connexion impossible : {reason}',
    spaceValue: 'Espace · {space}',
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
      hint: 'Toutes vos données en JSON lisible, dans une archive .zip ou un seul fichier.',
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
    description:
      'Gestion du temps, des tâches et des idées, conçue pour la création et la concentration.',
    licenceValue: 'GNU AGPL 3.0',
    replay: 'Revoir l’introduction',
    gallery: 'Bibliothèque de composants',
  },

  nav: {
    a11y: 'Sections des réglages',
  },

  /** Export formats (data.export). */
  exportFormat: {
    label: 'Format',
    zip: 'Archive .zip',
    json: 'Fichier JSON',
  },
  deleted: 'Les données de cet appareil ont été supprimées.',

  decrease: 'Diminuer',
  increase: 'Augmenter',
  backToSettings: 'Retour aux réglages',
};
