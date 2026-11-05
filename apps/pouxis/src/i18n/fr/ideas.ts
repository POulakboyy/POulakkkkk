/**
 * Ideas: notes, brain dump, strict typewriter, serendipity engine, divergent constraints,
 * SCAMPER and six thinking hats, friction journal, sandbox, ambient sound, moodboard.
 * Method steps and constraint texts come from `@pouxis/core` (ideation), already bilingual.
 */
export const ideas = {
  title: 'Idées',
  subtitle: 'Notez vite, reliez plus tard.',

  tabs: {
    label: 'Sections des idées',
    notes: 'Notes',
    studio: 'Atelier',
    journal: 'Journal',
    sandbox: 'Bac à sable',
  },

  notes: {
    list: 'Notes',
    new: 'Nouvelle note',
    untitled: 'Sans titre',
    titlePlaceholder: 'Titre',
    titleLabel: 'Titre de la note',
    bodyLabel: 'Contenu de la note',
    bodyPlaceholder: 'Commencez à écrire…',
    editLine: 'Ligne {line}, cliquer pour modifier',
    edited: 'Modifiée {time}',
    search: 'Rechercher dans les notes',
    noResults: 'Aucune note ne contient « {query} ».',
    back: 'Toutes les notes',
    pick: 'Choisissez une note à gauche, ou créez-en une.',
    backlinks: 'Mentionnée dans',
    noBacklinks:
      'Aucune autre note ne la mentionne pour l’instant. Écrivez [[{title}]] ailleurs pour la relier.',
    mentions: '{count, plural, one {# mention} other {# mentions}}',
    createLinked: 'Créer la note « {title} »',
    history: 'Historique des paragraphes',
    historyHint: 'Les paragraphes effacés ou modifiés pendant cette session.',
    historyEmpty:
      'Rien à restaurer : aucun paragraphe n’a été effacé ou modifié depuis l’ouverture.',
    restoreBlock: 'Restaurer ce paragraphe',
    restored: 'Paragraphe restauré',
    delete: 'Supprimer la note',
    deleted: 'Note supprimée',
    more: 'Actions de la note',
    toggleTask: 'Cocher ou décocher la tâche',
    words: '{count, plural, =0 {Aucun mot} one {# mot} other {# mots}}',
  },

  /** Opens instantly; text goes to the inbox when closed. */
  brainDump: {
    open: 'Vider sa tête',
    title: 'Vider sa tête',
    placeholder: 'Tout ce qui vous passe par la tête. Rien n’est jugé, tout sera trié plus tard.',
    hint: 'Une idée par ligne. Fermez quand vous avez fini : tout part dans la boîte de réception.',
    close: 'Envoyer dans la boîte de réception',
    count: '{count, plural, =0 {Aucune idée} one {# idée} other {# idées}}',
    sent: '{count, plural, one {# idée envoyée} other {# idées envoyées}} dans la boîte de réception',
    empty: 'Rien à envoyer.',
  },

  /** Strict typewriter: Backspace/Delete disabled to keep self-censorship out of first drafts. */
  typewriter: {
    toggle: 'Machine à écrire',
    on: 'Machine à écrire : pas de retour en arrière, seulement en avant.',
    off: 'Machine à écrire désactivée',
    blocked: 'Effacer est en pause. Continuez, vous corrigerez plus tard.',
    hint: 'Pour un premier jet sans autocensure. Désactivez-la pour relire.',
  },

  studio: {
    label: 'Outils de l’atelier',
  },

  /** Random connector: pairs two unrelated notes to spark an association. */
  serendipity: {
    title: 'Rencontre fortuite',
    hint: 'Deux notes qui ne se connaissent pas. Cherchez ce qui les relie.',
    action: 'Rapprocher deux idées',
    again: 'Nouvelles paires',
    link: 'Les relier',
    linked: 'Notes reliées',
    card: 'Paire {current} sur {total}',
    next: 'Paire suivante',
    previous: 'Paire précédente',
    swipe: 'Balayez ou utilisez les flèches pour changer de paire.',
    open: 'Ouvrir « {title} »',
    shared: 'En commun : {tags}',
    unrelated: 'Aucun lien entre elles',
    distance: '{count, plural, one {# note d’écart} other {# notes d’écart}}',
    tooFew: 'Il faut au moins deux notes sans lien entre elles. Écrivez-en quelques autres.',
  },

  constraints: {
    title: 'Contraintes',
    hint: 'Une contrainte inattendue aide à sortir des réponses évidentes.',
    action: 'Tirer une contrainte',
    again: 'Une autre',
    category: 'Catégorie',
    all: 'Toutes',
    drawn: 'Déjà tirées',
    copy: 'Copier la contrainte',
    copied: 'Contrainte copiée',
    exhausted: 'Toutes les contraintes de cette catégorie sont passées. On recommence.',
  },

  methods: {
    title: 'Méthodes guidées',
    hint: 'Une question à la fois, avec un temps limité pour chacune.',
    start: 'Commencer',
    perStep: '{count} min par étape',
    stepCount: '{count, plural, one {# étape} other {# étapes}}',
    step: 'Étape {current} sur {total}',
    remaining: 'Temps restant pour cette étape',
    overdue: 'Temps écoulé. Passez à la suite quand vous voulez.',
    pause: 'Mettre le minuteur en pause',
    resume: 'Reprendre le minuteur',
    previous: 'Étape précédente',
    next: 'Étape suivante',
    finish: 'Terminer et garder les réponses',
    quit: 'Quitter la méthode',
    ideaLabel: 'Votre idée pour cette étape',
    ideaPlaceholder: 'Une idée, puis Entrée',
    addIdea: 'Ajouter',
    ideas: '{count, plural, =0 {Aucune idée} one {# idée} other {# idées}}',
    saved: 'Réponses gardées dans une nouvelle note',
    nothing: 'Aucune idée notée : rien n’a été gardé.',
    source: 'Source : {source}',
  },

  /** Friction journal: capture what blocks, separate from productive work. */
  friction: {
    title: 'Journal de friction',
    placeholder: 'Qu’est-ce qui coince ?',
    label: 'Ce qui coince',
    hint: 'Notez-le et passez à autre chose : vous y reviendrez à froid.',
    add: 'Noter',
    kind: {
      label: 'Nature',
      technical: 'Technique',
      creative: 'Créatif',
      external: 'Extérieur',
      other: 'Autre',
    },
    logged: 'Noté',
    resolve: 'C’est réglé',
    reopen: 'Rouvrir',
    resolved: 'Réglé',
    recurring: 'Revient souvent',
    empty: 'Rien ne coince pour l’instant. Tant mieux.',
  },

  /** Sandbox: excluded from search, wiped at the end of the session. */
  sandbox: {
    title: 'Bac à sable',
    hint: 'Un brouillon jetable : absent de la recherche, effacé en fin de session.',
    label: 'Brouillon jetable',
    placeholder: 'Essayez, raturez, jetez. Rien ici ne sera gardé sans votre accord.',
    keep: 'Garder comme note',
    kept: 'Gardé dans vos notes',
    clear: 'Tout effacer maintenant',
    cleared: 'Bac à sable vidé',
    endsWith: 'Effacé à la fermeture de l’app',
  },

  ambient: {
    title: 'Ambiance sonore',
    open: 'Ambiance sonore',
    play: 'Lancer l’ambiance',
    pause: 'Couper l’ambiance',
    volume: 'Volume',
    sound: 'Son',
    timer: 'Arrêter après',
    noTimer: 'Jamais',
    minutes: '{count} min',
    endsIn: 'Arrêt dans {time}',
    synthesized: 'Sons générés sur l’appareil, rien n’est téléchargé.',
    unsupported: 'Le son n’est pas disponible sur cet appareil.',
    sounds: {
      white: 'Bruit blanc',
      pink: 'Bruit rose',
      brown: 'Bruit brun',
      cafe: 'Café',
      forest: 'Forêt',
      rain: 'Pluie',
    },
    playing: 'Ambiance : {sound}',
  },

  moodboard: {
    title: 'Moodboard',
    hint: 'Les images restent sur cet appareil, le temps de la session.',
    drop: 'Déposez des images pour en extraire une palette',
    browse: 'Choisir des images',
    palette: 'Palette',
    swatches: 'Couleurs de {name}',
    copyHex: 'Copier {hex}',
    copied: '{hex} copié',
    copyAll: 'Copier la palette',
    copiedAll: 'Palette copiée',
    remove: 'Retirer {name}',
    unreadable: 'Impossible de lire « {name} ». Essayez une image JPEG, PNG ou WebP.',
  },

  /** Dead ends: notes started and never touched again. Neutral, never a reproach. */
  deadEnds: {
    title: 'Pistes en sommeil',
    hint: 'Commencées, puis laissées de côté. Certaines méritent un second regard, d’autres peuvent partir.',
    since: 'Laissée de côté depuis {count, plural, one {# jour} other {# jours}}',
    revisit: 'Y revenir',
    archive: 'Archiver',
    archived: 'Note archivée',
    empty: 'Aucune piste en sommeil. Vos notes ont toutes été reprises au moins une fois.',
  },

  empty: {
    title: 'Aucune idée pour l’instant',
    body: 'Les idées arrivent rarement sur commande. Notez-les dès qu’elles passent, même à moitié.',
    action: 'Nouvelle note',
    secondary: 'Vider sa tête',
  },
};
