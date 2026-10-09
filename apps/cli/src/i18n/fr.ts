/** French messages — the canonical catalogue; `en.ts` mirrors its shape. */

export type HelpRow = readonly [flag: string, description: string];

export interface CommandHelp {
  summary: string;
  usage: string;
  description?: string;
  options: readonly HelpRow[];
  examples: readonly string[];
}

const plural = (n: number, one: string, many: string): string => `${n} ${n > 1 ? many : one}`;

export const fr = {
  intlLocale: 'fr-FR',

  help: {
    tagline:
      'POuxis en ligne de commande : tâches, agenda, planification et recherche depuis le terminal.',
    usage: 'Utilisation',
    commands: 'Commandes',
    options: 'Options',
    globalOptions: 'Options globales',
    examples: 'Exemples',
    aliases: 'Alias',
    environment: 'Environnement',
    data: (file: string) => `Données : ${file}`,
    footer: 'Aide détaillée d’une commande : pouxis help <commande>',
    exitCodes: 'Codes de sortie : 0 succès · 1 erreur · 2 mauvaise utilisation',
    global: [
      ['--json', 'sortie JSON pour les scripts (jq…)'],
      ['--lang <fr|en>', 'langue des messages (défaut : LANG, sinon français)'],
      ['--home <dossier>', 'dossier des données (prioritaire sur POUXIS_HOME)'],
      ['--no-color', 'désactive les couleurs (comme NO_COLOR)'],
      ['-h, --help', 'affiche l’aide'],
      ['-V, --version', 'affiche la version'],
    ] as readonly HelpRow[],
    env: [
      ['POUXIS_HOME', 'dossier des données (défaut : ~/.pouxis)'],
      ['NO_COLOR', 'désactive les couleurs lorsqu’elle est définie'],
      ['LANG, LC_ALL', 'langue des messages (en_* → anglais)'],
      ['POUXIS_NOW', 'date courante simulée, ISO 8601 (tests, scripts)'],
    ] as readonly HelpRow[],
  },

  commands: {
    add: {
      summary: 'Ajoute une tâche ou un événement en langage naturel',
      usage: 'pouxis add <texte…> [--dry-run]',
      description:
        'Le texte est analysé : date, heure, durée, #étiquettes, !priorité, @personnes.\nUne plage horaire (« 14h-16h ») crée un événement, sinon c’est une tâche.',
      options: [['--dry-run', 'montre ce qui a été compris sans rien enregistrer']],
      examples: [
        'pouxis add "Appeler le plombier demain 9h #maison"',
        'pouxis add "Réunion projet X mardi prochain 14h-16h avec @paul"',
        'pouxis add "Écrire l’article !! 2h vendredi" --dry-run',
      ],
    },
    ls: {
      summary: 'Liste les tâches (ou les événements)',
      usage: 'pouxis ls [--today] [--tag <t>] [--status <s>] [--all] [--events]',
      description:
        'Par défaut : les tâches ouvertes (boîte de réception, à faire, en cours).\nStatuts : inbox, todo, doing, done, archived.',
      options: [
        ['--today', 'seulement ce qui concerne aujourd’hui (retards inclus)'],
        ['--tag <t>', 'filtre par étiquette (répétable : toutes doivent correspondre)'],
        ['--status <s>', 'filtre par statut (liste séparée par des virgules)'],
        ['--all', 'inclut les tâches terminées et archivées'],
        ['--events', 'liste les événements au lieu des tâches'],
      ],
      examples: [
        'pouxis ls --today',
        'pouxis ls --tag travail --status todo,doing',
        'pouxis ls --json | jq -r \'.[] | select(.priority == 3) | .title\'',
      ],
    },
    done: {
      summary: 'Marque une ou plusieurs tâches comme terminées',
      usage: 'pouxis done <id…>',
      description: 'Un début d’identifiant suffit (voir pouxis ls), tant qu’il est unique.',
      options: [],
      examples: ['pouxis done 3f2a', 'pouxis done 3f2a 9b1c'],
    },
    edit: {
      summary: 'Modifie une tâche ou un événement',
      usage: 'pouxis edit <id> [--title <t>] [--due <date>] [--priority <p>] …',
      description:
        'Dates : AAAA-MM-JJ, « AAAA-MM-JJ 14:30 », today/aujourd’hui, demain, +3j, vendredi, none (efface).\nDurées : 45, 45m, 1h30. Priorités : 0-3, none/basse/moyenne/haute.',
      options: [
        ['--title <texte>', 'nouveau titre'],
        ['--notes <texte>', 'remplace les notes'],
        ['--tag <t>', 'ajoute une étiquette (répétable)'],
        ['--untag <t>', 'retire une étiquette (répétable)'],
        ['--due <date>', 'tâche : échéance'],
        ['--day <date>', 'tâche : jour sans heure précise (tâche flottante)'],
        ['--priority <p>', 'tâche : priorité'],
        ['--estimate <durée>', 'tâche : durée estimée'],
        ['--status <s>', 'tâche : inbox, todo, doing, done, archived'],
        ['--mode <m>', 'tâche : create (création) ou organize (organisation)'],
        ['--start <date>', 'événement : début (la durée est conservée)'],
        ['--end <date>', 'événement : fin'],
        ['--location <lieu>', 'événement : lieu'],
      ],
      examples: [
        'pouxis edit 3f2a --due vendredi --priority haute',
        'pouxis edit 3f2a --tag urgent --untag plus-tard',
        'pouxis edit 9b1c --start "2026-10-14 15:00"',
      ],
    },
    rm: {
      summary: 'Supprime des tâches ou des événements',
      usage: 'pouxis rm <id…>',
      description: 'Les références vers l’élément supprimé (dépendances, liens) sont nettoyées.',
      options: [],
      examples: ['pouxis rm 3f2a'],
    },
    plan: {
      summary: 'Planifie une journée et l’affiche en frise horaire',
      usage: 'pouxis plan [--date AAAA-MM-JJ] [--save] [--step <minutes>]',
      description:
        'Place les tâches dans les créneaux libres autour des événements fixes, selon les heures de travail (pouxis config).',
      options: [
        ['--date <date>', 'jour à planifier (défaut : aujourd’hui)'],
        ['--save', 'enregistre les créneaux proposés dans les tâches'],
        ['--step <minutes>', 'résolution de la frise : 15, 30 ou 60 (défaut : 30)'],
      ],
      examples: ['pouxis plan', 'pouxis plan --date demain --save', 'pouxis plan --json'],
    },
    search: {
      summary: 'Recherche dans les tâches, événements, notes et journal',
      usage: 'pouxis search <requête…> [--limit <n>]',
      options: [['--limit <n>', 'nombre maximal de résultats (défaut : 20)']],
      examples: ['pouxis search rapport trimestriel', 'pouxis search plombier --json'],
    },
    export: {
      summary: 'Exporte toutes les données (JSON + Markdown), sans enfermement',
      usage: 'pouxis export [--zip <fichier.zip> | --dir <dossier>] [--force]',
      description:
        'Contenu : manifest.json (version du schéma), un fichier JSON par collection, prefs.json et notes/*.md.\nSans option : pouxis-export-AAAA-MM-JJ.zip dans le dossier courant.',
      options: [
        ['--zip <fichier>', 'écrit une archive ZIP'],
        ['--dir <dossier>', 'écrit les fichiers dans un dossier'],
        ['--force', 'écrase un fichier ou un dossier non vide existant'],
      ],
      examples: ['pouxis export', 'pouxis export --dir ~/sauvegardes/pouxis', 'unzip -l pouxis-export-*.zip'],
    },
    import: {
      summary: 'Importe un export POuxis (ZIP ou dossier)',
      usage: 'pouxis import <fichier.zip|dossier> [--replace] [--dry-run]',
      description:
        'Par défaut, fusionne : les éléments inconnus sont ajoutés, les éléments connus sont remplacés seulement si la version importée est plus récente.\nUne copie des données précédentes est conservée dans data.json.bak.',
      options: [
        ['--replace', 'remplace toutes les données locales (préférences comprises)'],
        ['--dry-run', 'affiche ce qui changerait sans rien modifier'],
      ],
      examples: ['pouxis import pouxis-export-2026-10-08.zip --dry-run', 'pouxis import ~/sauvegardes/pouxis'],
    },
    config: {
      summary: 'Lit ou modifie les préférences',
      usage: 'pouxis config <get [clé] | set <clé> <valeur> | unset <clé> | path>',
      description:
        'Clés : timeZone, locale, workingHours.start, workingHours.end, workingHours.days, bufferMin, makerBlockMin, wipLimit, decayThreshold.',
      options: [],
      examples: [
        'pouxis config get',
        'pouxis config set timeZone America/Montreal',
        'pouxis config set workingHours.start 08:30',
        'pouxis config set workingHours.days lun,mar,mer,jeu',
      ],
    },
    help: {
      summary: 'Affiche l’aide générale ou celle d’une commande',
      usage: 'pouxis help [commande]',
      options: [],
      examples: ['pouxis help plan'],
    },
  } satisfies Record<string, CommandHelp>,

  labels: {
    task: 'Tâche',
    event: 'Événement',
    note: 'Note',
    journal: 'Journal',
    title: 'Titre',
    due: 'Échéance',
    day: 'Jour',
    when: 'Quand',
    scheduled: 'Créneau',
    priority: 'Priorité',
    tags: 'Étiquettes',
    with: 'Avec',
    where: 'Lieu',
    estimate: 'Durée estimée',
    recurrence: 'Récurrence',
    status: 'Statut',
    notes: 'Notes',
    mode: 'Mode',
    start: 'Début',
    end: 'Fin',
  },
  kinds: { tasks: 'tâche', events: 'événement', notes: 'note', journal: 'journal', graphs: 'graphe' },
  collections: {
    tasks: 'tâches',
    events: 'événements',
    notes: 'notes',
    journal: 'journal',
    graphs: 'graphes',
  },
  priorities: ['aucune', 'basse', 'moyenne', 'haute'] as readonly string[],
  statuses: {
    inbox: 'boîte de réception',
    todo: 'à faire',
    doing: 'en cours',
    done: 'terminée',
    archived: 'archivée',
  },
  modes: { create: 'création', organize: 'organisation' },
  relativeDays: { today: 'aujourd’hui', tomorrow: 'demain', yesterday: 'hier' },
  minutes: (n: number) => `${n} min`,
  hours: (h: number, m: number) => (m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`),

  add: {
    savedTask: 'Tâche ajoutée',
    savedEvent: 'Événement ajouté',
    preview: 'Aperçu — rien n’a été enregistré',
    fallbackParser:
      'Analyse simplifiée : le module nlp de @pouxis/core n’est pas encore disponible.',
    emptyText: 'Que faut-il ajouter ? Écrivez le texte après « add ».',
    emptyTitle: 'Le texte ne contient pas de titre une fois la date et les étiquettes retirées.',
  },
  ls: {
    empty: 'Rien à afficher.',
    emptyHint: 'Ajoutez une tâche : pouxis add "Appeler Paul demain 14h"',
    emptyFiltered: 'Aucun élément ne correspond à ces filtres.',
    countTasks: (n: number) => plural(n, 'tâche', 'tâches'),
    countEvents: (n: number) => plural(n, 'événement', 'événements'),
    overdue: (n: number) => plural(n, 'en retard', 'en retard'),
    duePrefix: 'échéance',
    overdueLabel: 'en retard',
  },
  done: {
    completed: 'Terminée',
    already: 'Déjà terminée',
    unlocked: 'Débloquée',
    notATask: (title: string) =>
      `« ${title} » est un événement : seules les tâches peuvent être terminées.`,
  },
  edit: {
    updated: 'Modifié',
    nothing: 'Rien à modifier : précisez au moins une option (--title, --due, --tag…).',
    notForEvent: (flag: string) => `L’option ${flag} ne s’applique pas à un événement.`,
    notForTask: (flag: string) => `L’option ${flag} ne s’applique pas à une tâche.`,
    endBeforeStart: 'La fin de l’événement doit être après son début.',
    cleared: 'effacé',
  },
  rm: { removed: 'Supprimé' },
  plan: {
    title: (day: string, zone: string) => `Plan du ${day} · ${zone}`,
    legend: 'Légende : ## événement  == tâche  ~~ tampon  !! chevauchement',
    now: '◂ maintenant',
    unplaced: (n: number) => `Non placées (${n}) :`,
    nothing: 'Journée libre : aucun événement ni tâche à placer.',
    saved: (n: number) => (n === 0 ? 'Aucun créneau à enregistrer.' : `${plural(n, 'créneau enregistré', 'créneaux enregistrés')}.`),
    saveHint: 'Pour enregistrer ces créneaux : pouxis plan --save',
    fallbackScheduler:
      'Planification simplifiée : le module scheduler de @pouxis/core n’est pas encore disponible.',
    reasons: {
      'no-time': 'pas assez de temps libre',
      blocked: 'en attente d’une autre tâche',
      'non-working-day': 'jour non travaillé',
      other: 'non placée',
    } as Record<string, string>,
    buffer: 'tampon',
  },
  search: {
    results: (n: number, q: string) =>
      n === 0 ? `Aucun résultat pour « ${q} ».` : `${plural(n, 'résultat', 'résultats')} pour « ${q} »`,
    emptyQuery: 'Que faut-il chercher ? Écrivez la requête après « search ».',
    fallbackSearch:
      'Recherche simplifiée : le module search de @pouxis/core n’est pas encore disponible.',
  },
  export: {
    done: (path: string) => `Export créé : ${path}`,
    both: 'Choisissez --zip ou --dir, pas les deux.',
    exists: (path: string) => `« ${path} » existe déjà.`,
    existsHint: 'Ajoutez --force pour l’écraser, ou choisissez un autre chemin.',
    notEmpty: (path: string) => `Le dossier « ${path} » n’est pas vide.`,
    markdown: (n: number) => plural(n, 'fichier .md', 'fichiers .md'),
    readmeTitle: 'Export POuxis',
  },
  import: {
    done: (source: string, mode: string) => `Import terminé depuis ${source} (${mode})`,
    dryRun: (source: string, mode: string) => `Simulation d’import depuis ${source} (${mode}) — rien n’a été modifié`,
    merge: 'fusion',
    replace: 'remplacement',
    row: (added: number, updated: number, unchanged: number) =>
      `+${added} ajouté(s) · ${updated} mis à jour · ${unchanged} inchangé(s)`,
    removedRow: (n: number) => `${n} supprimé(s)`,
    prefsReplaced: 'Préférences remplacées.',
    backup: (path: string) => `Copie des données précédentes : ${path}`,
    notFound: (path: string) => `« ${path} » est introuvable.`,
    notExport: (path: string) => `« ${path} » n’est pas un export POuxis (manifest.json manquant).`,
    badManifest: (detail: string) => `manifest.json invalide : ${detail}`,
    tooNew: (version: number, supported: number) =>
      `Cet export utilise le schéma ${version}, cette version du CLI ne lit que jusqu’au schéma ${supported}.`,
    tooNewHint: 'Mettez à jour POuxis puis réessayez.',
    badFile: (file: string, detail: string) => `${file} : ${detail}`,
    badRecords: (file: string, n: number) => `${file} : ${plural(n, 'élément invalide', 'éléments invalides')}`,
    badZip: (path: string, detail: string) => `Archive illisible « ${path} » : ${detail}`,
  },
  config: {
    set: (key: string, value: string) => `${key} = ${value}`,
    unset: (key: string, value: string) => `${key} remis à la valeur par défaut (${value})`,
    unknownKey: (key: string) => `Clé de configuration inconnue : « ${key} ».`,
    keys: (keys: string) => `Clés disponibles : ${keys}`,
    invalid: (key: string, value: string, expected: string) =>
      `Valeur invalide pour ${key} : « ${value} » (attendu : ${expected}).`,
    expected: {
      timeZone: 'un fuseau IANA, ex. Europe/Paris',
      locale: 'fr ou en',
      time: 'une heure HH:MM',
      days: 'des jours séparés par des virgules, ex. 1,2,3,4,5 ou lun,mar,mer',
      int: (min: number) => `un entier ≥ ${min}`,
      hoursOrder: 'une fin de journée après le début',
    },
    subcommand: 'Sous-commande attendue : get, set, unset ou path.',
  },
  version: (v: string, schema: number) => `pouxis ${v} (schéma de données ${schema})`,

  errors: {
    prefix: 'Erreur',
    unknownCommand: (name: string) => `Commande inconnue : « ${name} ».`,
    didYouMean: (s: string) => `Vouliez-vous dire « ${s} » ?`,
    seeHelp: (cmd?: string) => (cmd ? `Voir : pouxis help ${cmd}` : 'Voir : pouxis help'),
    unknownOption: (opt: string) => `Option inconnue : ${opt}.`,
    missingValue: (opt: string) => `L’option ${opt} attend une valeur.`,
    noValue: (opt: string) => `L’option ${opt} n’accepte pas de valeur.`,
    badArgs: (detail: string) => `Arguments invalides : ${detail}`,
    unexpectedArgs: (args: string) => `Argument(s) inattendu(s) : ${args}.`,
    missingId: 'Précisez l’identifiant (ou son début) de l’élément.',
    idHint: 'Les identifiants sont affichés par : pouxis ls (ou pouxis ls --events)',
    notFound: (prefix: string) => `Aucun élément ne correspond à l’identifiant « ${prefix} ».`,
    ambiguous: (prefix: string, n: number) =>
      `L’identifiant « ${prefix} » est ambigu (${n} correspondances) :`,
    ambiguousHint: 'Ajoutez des caractères pour le rendre unique.',
    invalidDate: (v: string) => `Date invalide : « ${v} ».`,
    dateHint: 'Formats acceptés : AAAA-MM-JJ, « AAAA-MM-JJ HH:MM », aujourd’hui, demain, +3j, vendredi.',
    invalidDuration: (v: string) => `Durée invalide : « ${v} » (ex. 45, 45m, 1h30).`,
    invalidPriority: (v: string) => `Priorité invalide : « ${v} » (0-3, none, basse, moyenne, haute).`,
    invalidStatus: (v: string) =>
      `Statut invalide : « ${v} » (inbox, todo, doing, done, archived).`,
    invalidMode: (v: string) => `Mode invalide : « ${v} » (create ou organize).`,
    invalidNumber: (opt: string, v: string) => `${opt} attend un nombre entier positif, pas « ${v} ».`,
    invalidStep: (v: string) => `Pas invalide : « ${v} » (15, 30 ou 60).`,
    invalidLang: (v: string) => `Langue inconnue : « ${v} » (fr ou en).`,
    dataCorrupt: (file: string, detail: string) =>
      `Le fichier de données est illisible : ${file} (${detail}).`,
    dataCorruptHint: (backup: string) =>
      `Rien n’a été modifié. Une copie précédente existe peut-être : ${backup}`,
    dataTooNew: (file: string, version: number) =>
      `${file} a été écrit par une version plus récente de POuxis (schéma ${version}).`,
    locked: (pid: string) => `Les données sont verrouillées par un autre processus POuxis (pid ${pid}).`,
    lockedHint: 'Réessayez dans un instant.',
    conflict: 'Les données ont été modifiées par un autre programme pendant l’opération.',
    conflictHint: 'Relancez la commande : elle repartira de la version à jour.',
    io: (detail: string) => `Erreur d’entrée/sortie : ${detail}`,
    unexpected: (detail: string) => `Erreur inattendue : ${detail}`,
    debugHint: 'Relancez avec POUXIS_DEBUG=1 pour afficher la trace complète.',
  },
};

export type Messages = typeof fr;
