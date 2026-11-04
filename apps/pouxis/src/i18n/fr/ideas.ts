/**
 * Ideas: notes, brain dump, strict typewriter, serendipity engine, divergent constraints,
 * SCAMPER and six thinking hats, friction journal, sandbox, ambient sound, moodboard.
 */
export const ideas = {
  title: 'Idées',

  notes: {
    new: 'Nouvelle note',
    untitled: 'Sans titre',
    titlePlaceholder: 'Titre',
    bodyPlaceholder: 'Commencez à écrire…',
    edited: 'Modifiée {time}',
    backlinks: 'Mentionnée dans',
    noBacklinks: 'Aucune autre note ne la mentionne pour l’instant.',
    history: 'Historique',
    restoreBlock: 'Restaurer ce paragraphe',
    restored: 'Paragraphe restauré',
    delete: 'Supprimer la note',
    deleted: 'Note supprimée',
    words: '{count, plural, =0 {Aucun mot} one {# mot} other {# mots}}',
  },

  /** Opens instantly; text goes to the inbox when closed. */
  brainDump: {
    title: 'Vider sa tête',
    placeholder: 'Tout ce qui vous passe par la tête. Rien n’est jugé, tout sera trié plus tard.',
    hint: 'Une idée par ligne. Fermez quand vous avez fini : tout part dans la boîte de réception.',
    close: 'Envoyer dans la boîte de réception',
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

  /** Random connector: pairs two unrelated notes to spark an association. */
  serendipity: {
    title: 'Rencontre fortuite',
    action: 'Rapprocher deux idées',
    prompt: 'Quel lien voyez-vous entre ces deux notes ?',
    again: 'Une autre paire',
    link: 'Les relier',
    linked: 'Notes reliées',
    tooFew: 'Il faut au moins deux notes sans lien entre elles. Écrivez-en quelques autres.',
  },

  constraints: {
    title: 'Contraintes',
    action: 'Ajouter une contrainte',
    again: 'Une autre',
    hint: 'Une contrainte inattendue aide à sortir des réponses évidentes.',
    items: {
      half: 'Et si vous aviez moitié moins de temps ?',
      blind: 'Et si la personne qui l’utilise ne voyait pas ?',
      noText: 'Et si aucun mot n’était permis ?',
      child: 'Et si un enfant de 8 ans devait le comprendre ?',
      tenX: 'Et s’il fallait servir dix fois plus de monde ?',
      opposite: 'Et si vous faisiez exactement l’inverse ?',
      oneHand: 'Et si tout devait se faire d’une seule main ?',
      offline: 'Et s’il n’y avait jamais de connexion ?',
    },
  },

  methods: {
    title: 'Méthodes',
    start: 'Commencer',
    step: 'Étape {current} sur {total}',
    finish: 'Terminer la méthode',
    saved: 'Réponses gardées dans la note',
    scamper: {
      title: 'SCAMPER',
      hint: 'Sept questions pour transformer une idée existante.',
      substitute: { title: 'Substituer', prompt: 'Que pourriez-vous remplacer ?' },
      combine: { title: 'Combiner', prompt: 'Avec quoi pourriez-vous l’associer ?' },
      adapt: { title: 'Adapter', prompt: 'Qu’est-ce qui existe ailleurs et pourrait servir ici ?' },
      modify: { title: 'Modifier', prompt: 'Que pourriez-vous agrandir, réduire ou changer ?' },
      putToOtherUse: { title: 'Détourner', prompt: 'À quoi d’autre cela pourrait-il servir ?' },
      eliminate: { title: 'Éliminer', prompt: 'Que pourriez-vous retirer sans rien perdre ?' },
      reverse: { title: 'Inverser', prompt: 'Et si vous changiez l’ordre ou le sens ?' },
    },
    hats: {
      title: 'Six chapeaux',
      hint: 'Regarder la même question sous six angles, un à la fois.',
      white: { title: 'Blanc · les faits', prompt: 'Que sait-on vraiment ? Que manque-t-il ?' },
      red: { title: 'Rouge · le ressenti', prompt: 'Quelle est votre intuition, sans justifier ?' },
      black: { title: 'Noir · la prudence', prompt: 'Qu’est-ce qui pourrait mal tourner ?' },
      yellow: { title: 'Jaune · les atouts', prompt: 'Qu’est-ce qui pourrait bien fonctionner ?' },
      green: { title: 'Vert · la créativité', prompt: 'Quelles autres pistes, même folles ?' },
      blue: { title: 'Bleu · le recul', prompt: 'Où en êtes-vous, et quelle est la suite ?' },
    },
  },

  /** Friction journal: capture what blocks, separate from productive work. */
  friction: {
    title: 'Journal de friction',
    placeholder: 'Qu’est-ce qui coince ?',
    hint: 'Notez-le et passez à autre chose : vous y reviendrez à froid.',
    kind: {
      label: 'Nature',
      technical: 'Technique',
      creative: 'Créatif',
      external: 'Extérieur',
      other: 'Autre',
    },
    logged: 'Noté',
    resolve: 'C’est réglé',
    resolved: 'Réglé',
    recurring: 'Revient souvent',
    empty: 'Rien ne coince pour l’instant. Tant mieux.',
  },

  /** Sandbox: excluded from search, wiped at the end of the session. */
  sandbox: {
    title: 'Bac à sable',
    hint: 'Un brouillon jetable : absent de la recherche, effacé en fin de session.',
    keep: 'Garder comme note',
    kept: 'Gardé dans vos notes',
    clear: 'Tout effacer maintenant',
    cleared: 'Bac à sable vidé',
    endsWith: 'Effacé à la fermeture de l’app',
  },

  ambient: {
    title: 'Ambiance sonore',
    play: 'Lancer l’ambiance',
    pause: 'Couper l’ambiance',
    volume: 'Volume',
    timer: 'Arrêter après',
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
    drop: 'Déposez des images pour en extraire une palette',
    palette: 'Palette',
    copyHex: 'Copier {hex}',
    copied: '{hex} copié',
  },

  voice: {
    record: 'Enregistrer une idée',
    highEnergy: 'Haute énergie',
    highEnergyHint: 'Repérée à l’enthousiasme de votre voix.',
  },

  /** Dead ends: notes started and never touched again. Neutral, never a reproach. */
  deadEnds: {
    title: 'Pistes en sommeil',
    hint: 'Commencées, puis laissées de côté. Certaines méritent un second regard, d’autres peuvent partir.',
    since: 'Pas modifiée depuis {when}',
    revisit: 'Y revenir',
    archive: 'Archiver',
  },

  empty: {
    title: 'Aucune idée pour l’instant',
    body: 'Les idées arrivent rarement sur commande. Notez-les dès qu’elles passent, même à moitié.',
    action: 'Nouvelle note',
    secondary: 'Vider sa tête',
  },
};
