// English mirror of the demo seed (apps/pouxis/src/store/seed.ts is written in French). The EN
// screenshot sets must show the same week and the same projects, only in English, so the store
// records are rewritten in the page after seeding. Keys are the exact French strings of the seed;
// a string missing here simply stays French, and `untranslatedStrings()` reports it.

/** Whole-string translations: titles, labels, journal entries, tags, note lines. */
export const SEED_EN = {
  // Events
  'Point d’équipe': 'Team check-in',
  Déjeuner: 'Lunch',
  'Revue produit': 'Product review',
  'Bloc création — maquettes': 'Creative block — mockups',
  'Appel client — Atelier Nord': 'Client call — Atelier Nord',
  'Trajet vers le studio': 'Commute to the studio',
  'Atelier d’idéation': 'Ideation workshop',
  Tampon: 'Buffer',
  'Entretien — designer produit': 'Interview — product designer',
  'Deep work — écriture': 'Deep work — writing',
  'Rétrospective de la semaine': 'Weekly retrospective',
  'Course au parc': 'Run in the park',
  'Concert — Philharmonie': 'Concert — Philharmonie',
  'Arbitrer le périmètre de la v1 de l’onboarding.': 'Settle the scope of onboarding v1.',
  'Salle Lumière': 'Lumière room',
  Visio: 'Video call',
  // Tasks
  'Esquisser la nouvelle page d’accueil': 'Sketch the new home page',
  'Répondre aux retours clients': 'Reply to client feedback',
  'Enregistrer la voix-off de la vidéo': 'Record the video voice-over',
  'Finaliser le script de la vidéo': 'Finish the video script',
  'Préparer la facture du mois': 'Prepare this month’s invoice',
  'Prototype interactif de l’onboarding': 'Interactive onboarding prototype',
  'Test utilisateur avec cinq personnes': 'User test with five people',
  'Écrire l’article « Créer sans s’épuiser »': 'Write the “Create without burning out” article',
  'Relire le contrat de l’Atelier Nord': 'Review the Atelier Nord contract',
  'Choisir la palette de la marque': 'Choose the brand palette',
  'Mettre à jour le planning de production': 'Update the production schedule',
  'Envoyer le devis à Atelier Nord': 'Send the quote to Atelier Nord',
  'Revue hebdomadaire': 'Weekly review',
  'Pages du matin': 'Morning pages',
  'Payer le loyer de l’atelier': 'Pay the studio rent',
  'Arroser les plantes': 'Water the plants',
  'Idée : série de podcasts sur la créativité': 'Idea: a podcast series on creativity',
  'Trier les photos du voyage': 'Sort the trip photos',
  'Lire « Deep Work » — chapitre 3': 'Read “Deep Work” — chapter 3',
  'Renouveler l’assurance du matériel': 'Renew the equipment insurance',
  'Moodboard de la nouvelle identité': 'Moodboard for the new identity',
  'Entretiens exploratoires — synthèse': 'Discovery interviews — summary',
  'Déclarer la TVA du trimestre': 'File the quarterly VAT return',
  'Storyboard de la vidéo de lancement': 'Storyboard the launch video',
  'Ranger le dossier « Clients 2025 »': 'Tidy the “Clients 2025” folder',
  'Écrire la newsletter d’octobre': 'Write the October newsletter',
  // Tags
  équipe: 'team',
  produit: 'product',
  recherche: 'research',
  idées: 'ideas',
  vidéo: 'video',
  lecture: 'reading',
  écriture: 'writing',
  recrutement: 'hiring',
  // Notes: titles and body lines
  'Vision du site': 'Website vision',
  'Principes de design': 'Design principles',
  'Notes d’entretiens': 'Interview notes',
  'Idées de vidéos': 'Video ideas',
  'Script de lancement': 'Launch script',
  'Lectures du mois': 'This month’s reading',
  'Brouillon — article créativité': 'Draft — creativity article',
  '# Vision du site': '# Website vision',
  'Un site **calme**, éditorial, qui donne envie d’essayer sans rien promettre de magique.':
    'A **calm**, editorial site that makes people want to try it, without promising magic.',
  '- Une promesse claire en une phrase': '- One clear promise in one sentence',
  '- Trois captures, pas plus': '- Three screenshots, no more',
  '- Un seul appel à l’action': '- A single call to action',
  'Voir [[Principes de design]] et [[Notes d’entretiens]].':
    'See [[Design principles]] and [[Interview notes]].',
  '# Principes de design': '# Design principles',
  '1. Le contenu d’abord, l’interface ensuite.': '1. Content first, interface second.',
  '2. Une animation doit expliquer un changement, jamais décorer.':
    '2. Motion explains a change; it never decorates.',
  '3. Chaque écran a une action principale.': '3. Every screen has one main action.',
  '> La simplicité est la sophistication suprême.': '> Simplicity is the ultimate sophistication.',
  'Appliqués dans [[Vision du site]].': 'Applied in [[Website vision]].',
  '# Notes d’entretiens': '# Interview notes',
  '## Ce qui revient': '## What keeps coming up',
  '- « Je planifie trop, puis je ne fais rien. »': '- “I over-plan, then I do nothing.”',
  '- Les rappels culpabilisants font fuir.': '- Guilt-tripping reminders drive people away.',
  '- Le besoin d’un mode « juste aujourd’hui ».': '- The need for a “just today” mode.',
  '## À creuser': '## To dig into',
  '- [ ] Tester une vue jour sans heures': '- [ ] Test a day view without hours',
  '- [x] Regrouper les retours par thème': '- [x] Group feedback by theme',
  '# Idées de vidéos': '# Video ideas',
  '- Une journée avec le minuteur de focus': '- A day with the focus timer',
  '- Avant / après : une semaine replanifiée': '- Before / after: a rescheduled week',
  '- Le canvas pour structurer un projet': '- Using the canvas to structure a project',
  'Lié au [[Script de lancement]].': 'Linked to the [[Launch script]].',
  '# Script de lancement': '# Launch script',
  '**Ouverture** — un bureau en désordre, une notification de trop.':
    '**Opening** — a messy desk, one notification too many.',
  '**Bascule** — tout se range dans une seule journée lisible.':
    '**Turn** — everything settles into one readable day.',
  '**Fin** — « Moins d’outils. Plus de temps. »': '**End** — “Fewer tools. More time.”',
  '# Lectures du mois': '# This month’s reading',
  '- *Make Time*, Jake Knapp et John Zeratsky': '- *Make Time*, Jake Knapp and John Zeratsky',
  '# Créer sans s’épuiser': '# Create without burning out',
  'Protéger deux heures le matin change plus qu’une nouvelle application.':
    'Protecting two morning hours changes more than a new app.',
  'Références : [[Lectures du mois]].': 'References: [[This month’s reading]].',
  // Journal
  'Storyboard bouclé en une matinée, sans interruption.':
    'Storyboard wrapped up in one morning, no interruptions.',
  'Export vidéo bloqué : le codec n’est pas reconnu.':
    'Video export stuck: the codec isn’t recognised.',
  'Premier retour client très positif sur le moodboard.':
    'First client feedback on the moodboard: very positive.',
  'Trois réunions d’affilée, impossible d’écrire ensuite.':
    'Three meetings in a row, impossible to write afterwards.',
  'Penser à demander les accès au serveur de démo. Acheter des piles pour le micro.':
    'Ask for access to the demo server. Buy batteries for the mic.',
  'Page blanche sur l’introduction de l’article.': 'Blank page on the article’s introduction.',
  'Synthèse des entretiens partagée avec l’équipe.': 'Interview summary shared with the team.',
  'Réunions qui débordent sur le bloc de création.': 'Meetings spilling into the creative block.',
  'Le build échoue à cause d’une dépendance.': 'The build fails because of a dependency.',
  'TVA déclarée deux jours avant l’échéance.': 'VAT filed two days before the deadline.',
  'Une idée : un mode « une seule tâche » plein écran, sans horloge.':
    'An idea: a full-screen “one task” mode, with no clock.',
  'Newsletter envoyée : 41 réponses en deux jours.': 'Newsletter sent: 41 replies in two days.',
  // Canvas graph
  'Lancement du nouveau site': 'New website launch',
  'Lancer le nouveau site': 'Launch the new website',
  Recherche: 'Research',
  Contenu: 'Content',
  'Synthèse des entretiens': 'Interview summary',
  'Esquisse de la page d’accueil': 'Home page sketch',
  'Prototype de l’onboarding': 'Onboarding prototype',
  'Test utilisateur': 'User test',
  'Voix-off': 'Voice-over',
  'Mode « une seule tâche »': '“One task” mode',
  nourrit: 'feeds',
  'plus tard': 'later',
};

/** Fields never rewritten: parsed by the engine or used as identifiers. */
const SKIP_KEYS = new Set(['id', 'recurrence', 'projectId', 'parentId', 'from', 'to', 'kind']);

/** Translates one string: whole match first, then line by line (Markdown note bodies). */
export function translateString(value, map = SEED_EN) {
  if (Object.hasOwn(map, value)) return map[value];
  if (!value.includes('\n')) return value;
  return value
    .split('\n')
    .map((line) => (Object.hasOwn(map, line) ? map[line] : line))
    .join('\n');
}

/** Deep copy of `value` with every translatable string replaced. */
export function translateValue(value, map = SEED_EN, key = '') {
  if (SKIP_KEYS.has(key)) return value;
  if (typeof value === 'string') return translateString(value, map);
  if (Array.isArray(value)) return value.map((v) => translateValue(v, map, ''));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translateValue(v, map, k)]));
  }
  return value;
}

/**
 * Patch of the top-level fields of `record` whose translation differs, or null when nothing
 * changes. Only fields that carry text are patched, so ids and timestamps stay untouched.
 */
export function translationPatch(record, map = SEED_EN) {
  const patch = {};
  for (const [k, v] of Object.entries(record)) {
    if (SKIP_KEYS.has(k)) continue;
    const next = translateValue(v, map, k);
    if (JSON.stringify(next) !== JSON.stringify(v)) patch[k] = next;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
