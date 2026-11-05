/**
 * Canvas: infinite graph / mind map. Tools, auto layout, collapse, timeline mode, conditional
 * links, minimap, presentation, export, text ↔ graph conversion.
 */
export const canvas = {
  title: 'Toile',
  untitled: 'Toile sans titre',
  new: 'Nouvelle toile',
  list: 'Toutes les toiles',
  titleLabel: 'Titre de la toile',
  more: 'Plus d’actions',

  mode: {
    label: 'Affichage',
    canvas: 'Toile',
    outline: 'Plan',
  },

  tools: {
    label: 'Outils',
    select: 'Sélection',
    pan: 'Main',
    node: 'Nœud',
    edge: 'Lien',
    draw: 'Crayon',
    eraser: 'Gomme',
    /** Tool tooltip: `{tool}` is a label above, `{key}` its shortcut. */
    withKey: '{tool} ({key})',
  },

  ink: {
    label: 'Encre',
    color: 'Couleur {n}',
    ink: 'Noir d’encre',
    thin: 'Trait fin',
    medium: 'Trait moyen',
    bold: 'Trait épais',
  },

  node: {
    placeholder: 'Écrire…',
    empty: 'Nœud sans texte',
    editLabel: 'Texte du nœud',
    newIdea: 'Nouvelle idée',
    add: 'Ajouter un nœud',
    addChild: 'Ajouter un enfant',
    addSibling: 'Ajouter un voisin',
    edit: 'Modifier le texte',
    delete: 'Supprimer',
    color: 'Couleur',
    noColor: 'Sans couleur',
    colorN: 'Couleur {n}',
    convertToTask: 'Transformer en tâche',
    markDone: 'Marquer comme terminée',
    reopen: 'Rouvrir la tâche',
    a11y: '{label}, {children, plural, =0 {sans enfant} one {# enfant} other {# enfants}}',
    task: 'tâche',
    done: 'terminée',
    locked: 'verrouillée',
    selected: '{count, plural, one {# nœud sélectionné} other {# nœuds sélectionnés}}',
  },

  edge: {
    label: 'Lien',
    delete: 'Supprimer le lien',
    conditional: 'Lien conditionnel',
    conditionalHint: 'La cible se débloque quand la source est terminée.',
    makeConditional: 'Débloquer à la fin de la source',
    makePlain: 'Lien simple',
    locked: 'Verrouillé · attend « {title} »',
    unlocked: '{count, plural, one {# étape débloquée} other {# étapes débloquées}}',
  },

  layout: {
    menu: 'Organiser',
    force: 'Démêler',
    forceHint: 'Les nœuds se repoussent et les liens se tendent jusqu’à l’équilibre.',
    running: 'Organisation en cours…',
    stop: 'Arrêter',
    tree: 'Arbre',
    mindmap: 'Carte mentale',
  },

  collapse: {
    collapse: 'Replier la branche',
    expand: 'Déplier la branche',
    collapseAll: 'Tout replier',
    expandAll: 'Tout déplier',
    hidden: '{count, plural, one {# nœud masqué} other {# nœuds masqués}}',
  },

  /** X axis becomes a timeline: moving a node right changes its due date. */
  timeline: {
    toggle: 'Mode frise',
    on: 'Frise activée · déplacer un nœud vers la droite repousse son échéance',
    off: 'Frise désactivée',
    dueChanged: 'Échéance fixée au {date}',
    duesChanged: '{count, plural, one {# échéance mise à jour} other {# échéances mises à jour}}',
  },

  view: {
    zoomIn: 'Zoomer',
    zoomOut: 'Dézoomer',
    zoomLevel: 'Zoom {percent}',
    fit: 'Tout afficher',
    minimap: 'Mini-carte',
    roleDescription: 'toile',
    minimapA11y: 'Mini-carte : touchez un point pour y déplacer la vue',
    canvasA11y: 'Toile « {title} », {count, plural, one {# nœud} other {# nœuds}}',
    keyboardHelp:
      'Flèches : sélectionner le nœud le plus proche du centre, puis passer d’un nœud à l’autre. Maj + flèches : déplacer la vue. Tab : ajouter un enfant. Entrée : ajouter un voisin. F2 : modifier. Suppr : supprimer. + et − : zoom. 0 : tout afficher. Échap : désélectionner, puis Tab pour quitter la toile. La vue Plan présente la même toile sous forme de liste.',
    hiddenCount: '{count, plural, one {# élément replié} other {# éléments repliés}}',
  },

  present: {
    start: 'Présenter',
    stop: 'Quitter la présentation',
    addWaypoint: 'Ajouter la vue au parcours',
    waypointAdded: 'Étape {count} ajoutée au parcours',
    clear: 'Effacer le parcours',
    step: 'Étape {current} sur {total}',
    next: 'Étape suivante',
    previous: 'Étape précédente',
    empty: 'Cadrez une vue puis ajoutez-la au parcours pour composer une présentation.',
    overview: 'Vue d’ensemble',
  },

  export: {
    title: 'Exporter',
    svg: 'Image vectorielle (SVG)',
    png: 'Image PNG transparente',
    markdown: 'Plan Markdown',
    opml: 'OPML',
    done: 'Export prêt : {file}',
    failed: 'L’export n’a pas abouti. Réessayez avec une toile plus petite.',
  },

  import: {
    tasks: 'Transformer mes tâches en arbre',
    tasksDone:
      '{count, plural, one {# tâche transformée en arbre} other {# tâches transformées en arbre}}',
    noTasks: 'Aucune tâche à transformer pour l’instant.',
    failed: 'Ce contenu n’a pas pu être lu. Déposez une liste Markdown ou un fichier OPML.',
    pasted:
      '{count, plural, one {# nœud créé depuis le texte} other {# nœuds créés depuis le texte}}',
    dropHint: 'Déposez une liste ou un fichier OPML pour en faire un arbre',
  },

  starter: {
    root: 'Mon projet',
    b1: 'Objectifs',
    b2: 'Idées',
    b3: 'Questions',
    b4: 'Prochaines étapes',
  },

  outline: {
    label: 'Plan de la toile',
    hint: 'Le plan reprend la toile sous forme de liste. Flèches gauche et droite : replier ou déplier.',
    empty: 'La toile est vide.',
  },

  toast: {
    deleted: '{count, plural, one {# nœud supprimé} other {# nœuds supprimés}}',
    linked: 'Nœuds liés',
    converted: 'Tâche créée',
  },

  empty: {
    title: 'Une toile blanche',
    body: 'Double-cliquez n’importe où pour poser une première idée, ou partez de vos tâches.',
    action: 'Commencer une carte mentale',
    tasks: 'Partir de mes tâches',
  },

  dev: {
    stress: 'Test de charge · 10 000 nœuds',
    stats: '{nodes} nœuds dessinés · {ms} ms',
  },
};
