/**
 * Canvas: infinite graph / mind-map. Tools, auto layout, collapse, timeline mode, conditional
 * edges, minimap, presentation, export, text ↔ graph conversion.
 */
export const canvas = {
  title: 'Toile',
  untitled: 'Toile sans titre',
  new: 'Nouvelle toile',
  list: 'Toutes les toiles',

  tools: {
    label: 'Outils',
    select: 'Sélection',
    pan: 'Déplacer la vue',
    node: 'Nœud',
    text: 'Texte',
    edge: 'Lien',
    draw: 'Dessin libre',
    shape: 'Forme',
    eraser: 'Gomme',
    /** Tool tooltip: `{tool}` is a label above, `{key}` its shortcut. */
    withKey: '{tool} ({key})',
  },

  node: {
    placeholder: 'Écrire…',
    add: 'Ajouter un nœud',
    addChild: 'Ajouter un enfant',
    addSibling: 'Ajouter un voisin',
    delete: 'Supprimer le nœud',
    linkTo: 'Lier à…',
    openTask: 'Ouvrir la tâche',
    openNote: 'Ouvrir la note',
    convertToTask: 'Transformer en tâche',
    embed: 'Intégrer un contenu',
    embedPlaceholder: 'Collez un lien vidéo, une page ou un bloc de code',
    a11y: 'Nœud « {label} », {children, plural, =0 {sans enfant} one {# enfant} other {# enfants}}',
  },

  edge: {
    label: 'Lien',
    delete: 'Supprimer le lien',
    conditional: 'Lien conditionnel',
    conditionalHint: 'La cible se débloque quand la source est terminée.',
    makeConditional: 'Débloquer seulement quand la source est terminée',
    makePlain: 'Lien simple',
    locked: 'Verrouillé · attend « {title} »',
    unlocked: '« {title} » est débloquée',
    a11y: 'Lien de « {from} » vers « {to} »',
  },

  layout: {
    auto: 'Démêler',
    autoHint: 'Réorganise les nœuds pour que les liens se croisent le moins possible.',
    running: 'Organisation…',
    done: 'Toile démêlée',
    tree: 'Arbre',
    radial: 'Radial',
    force: 'Libre',
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
    on: 'Mode frise activé · déplacer un nœud vers la droite repousse son échéance',
    off: 'Mode frise désactivé',
    dueChanged: 'Échéance déplacée {when}',
    noDate: 'Sans échéance',
  },

  view: {
    zoomIn: 'Zoomer',
    zoomOut: 'Dézoomer',
    zoomLevel: 'Zoom {percent}',
    fit: 'Tout afficher',
    center: 'Centrer sur la sélection',
    minimap: 'Mini-carte',
    showMinimap: 'Afficher la mini-carte',
    hideMinimap: 'Masquer la mini-carte',
    minimapA11y: 'Mini-carte : la zone encadrée est la partie visible de la toile',
  },

  present: {
    start: 'Présenter',
    stop: 'Quitter la présentation',
    addWaypoint: 'Ajouter une étape au parcours',
    removeWaypoint: 'Retirer cette étape',
    step: 'Étape {current} sur {total}',
    empty: 'Ajoutez des étapes pour composer un parcours de nœud en nœud.',
  },

  export: {
    title: 'Exporter la toile',
    format: 'Format',
    svg: 'SVG',
    png: 'PNG (fond transparent)',
    pdf: 'PDF',
    markdown: 'Plan Markdown',
    opml: 'OPML',
    exporting: 'Export…',
    done: 'Export prêt',
    failed: 'L’export n’a pas abouti. Réessayez avec une zone plus petite.',
  },

  convert: {
    toOutline: 'Voir en plan',
    fromList: 'Déposez une liste pour la transformer en arbre',
    converted: '{count, plural, one {# nœud créé} other {# nœuds créés}}',
  },

  templates: {
    title: 'Modèles',
    blank: 'Toile vierge',
    mindmap: 'Carte mentale',
    flow: 'Diagramme de flux',
    org: 'Organigramme',
    uml: 'UML',
    bpmn: 'BPMN',
  },

  toast: {
    nodeDeleted: 'Nœud supprimé',
    nodesDeleted: '{count, plural, one {# nœud supprimé} other {# nœuds supprimés}}',
    linked: 'Nœuds liés',
  },

  empty: {
    title: 'Une toile blanche',
    body: 'Double-cliquez ou touchez deux fois n’importe où pour poser une première idée.',
    action: 'Ajouter un nœud',
    secondary: 'Partir d’un modèle',
  },
};
