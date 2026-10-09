/**
 * Offline decomposition templates (2.2). Patterns run on folded text (lower case, no
 * accents), so `Vidéo`, `video` and `VIDEO` all match `\bvideo`.
 */
import type { Energy, Minutes, WorkMode } from '../../model.ts';

/** `[fr, en, estimate, mode, energy?]` */
export type Step = readonly [fr: string, en: string, min: Minutes, mode: WorkMode, energy?: Energy];

export interface GoalTemplate {
  id: string;
  patterns: readonly RegExp[];
  steps: readonly Step[];
}

/** Ordered by precedence: on equal match scores the earlier template wins. */
export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  {
    id: 'launch',
    patterns: [/\blanc(er|ement|e)\b/, /\blaunch(ing)?\b/, /\brelease\b/, /\bgo[- ]live\b/],
    steps: [
      ['Fixer la date et l’objectif du lancement', 'Set the launch date and goal', 30, 'organize'],
      ['Définir le message clé et le public', 'Define the key message and audience', 60, 'create'],
      ['Préparer la page ou l’annonce', 'Prepare the landing page or announcement', 120, 'create'],
      ['Créer les visuels', 'Create the visuals', 90, 'create'],
      ['Lister les contacts et les canaux', 'List contacts and channels', 45, 'organize'],
      ['Écrire les e-mails et les publications', 'Write the emails and posts', 90, 'create'],
      ['Faire une répétition générale', 'Run a dry run', 60, 'organize'],
      ['Lancer et annoncer', 'Launch and announce', 30, 'organize', 'high'],
      ['Suivre les retours et répondre', 'Monitor feedback and reply', 60, 'organize'],
      ['Faire le bilan', 'Run a retrospective', 30, 'organize'],
    ],
  },
  {
    id: 'mvp',
    patterns: [
      /\bmvp\b/,
      /\bprototype\b/,
      /\bpoc\b/,
      /\bapp(lication|li)?s?\b/,
      /\bsaas\b/,
      /\bstartup\b/,
      /\blogiciel\b/,
      /\bsoftware\b/,
    ],
    steps: [
      ['Définir le problème et l’utilisateur cible', 'Define the problem and target user', 60, 'organize'],
      ['Lister les hypothèses à valider', 'List the assumptions to validate', 45, 'organize'],
      ['Interroger des utilisateurs potentiels', 'Interview potential users', 180, 'organize'],
      ['Analyser les solutions existantes', 'Analyse existing alternatives', 60, 'organize'],
      ['Choisir la fonctionnalité centrale', 'Pick the one core feature', 45, 'create'],
      ['Prioriser le périmètre (indispensable / plus tard)', 'Prioritise scope (must-have / later)', 45, 'organize'],
      ['Esquisser les parcours et les écrans', 'Sketch the user flows and screens', 120, 'create'],
      ['Choisir la stack technique', 'Choose the tech stack', 45, 'organize'],
      ['Mettre en place le projet et le déploiement', 'Set up the project and deployment', 90, 'organize'],
      ['Construire la fonctionnalité centrale', 'Build the core feature', 480, 'create', 'high'],
      ['Ajouter un moyen de recueillir des retours', 'Add a way to collect feedback', 45, 'create'],
      ['Tester de bout en bout et corriger', 'Test end to end and fix bugs', 120, 'create'],
      ['Préparer la page de présentation', 'Prepare the landing page', 90, 'create'],
      ['Ouvrir aux premiers utilisateurs', 'Release to the first users', 60, 'organize'],
      ['Analyser les retours et décider de la suite', 'Review feedback and decide next steps', 60, 'organize'],
    ],
  },
  {
    id: 'video',
    patterns: [/\bvideos?\b/, /\byoutube\b/, /\bvlog\b/, /\btiktok\b/, /\breels?\b/],
    steps: [
      ['Choisir le sujet et l’angle', 'Pick the topic and angle', 30, 'create'],
      ['Rechercher et réunir les sources', 'Research and gather sources', 60, 'organize'],
      ['Écrire le script', 'Write the script', 120, 'create', 'high'],
      ['Préparer le tournage (lieu, matériel, lumière)', 'Prepare the shoot (location, gear, light)', 45, 'organize'],
      ['Tourner', 'Film', 120, 'create', 'high'],
      ['Dérusher et monter', 'Select footage and edit', 240, 'create', 'high'],
      ['Ajouter sous-titres, musique et habillage', 'Add captions, music and graphics', 90, 'create'],
      ['Créer la miniature et le titre', 'Design the thumbnail and title', 45, 'create'],
      ['Rédiger la description et les chapitres', 'Write the description and chapters', 30, 'organize'],
      ['Programmer la publication', 'Schedule the upload', 15, 'organize', 'low'],
      ['Partager et répondre aux commentaires', 'Share it and reply to comments', 30, 'organize'],
    ],
  },
  {
    id: 'podcast',
    patterns: [/\bpodcasts?\b/, /\bepisodes?\b/],
    steps: [
      ['Choisir le sujet et l’invité', 'Choose the topic and guest', 30, 'create'],
      ['Préparer la trame et les questions', 'Prepare the outline and questions', 60, 'create'],
      ['Vérifier le matériel d’enregistrement', 'Check the recording setup', 20, 'organize', 'low'],
      ['Enregistrer', 'Record', 90, 'create', 'high'],
      ['Monter et nettoyer le son', 'Edit and clean up the audio', 120, 'create'],
      ['Rédiger les notes d’épisode', 'Write the show notes', 30, 'create'],
      ['Publier et partager', 'Publish and share', 30, 'organize'],
    ],
  },
  {
    id: 'article',
    patterns: [/\barticles?\b/, /\bblog\b/, /\bbillet\b/, /\bnewsletter\b/, /\bessai\b/, /\bessay\b/],
    steps: [
      ['Définir le sujet, l’angle et le lecteur', 'Define the topic, angle and reader', 30, 'create'],
      ['Rechercher et prendre des notes', 'Research and take notes', 60, 'organize'],
      ['Construire le plan', 'Outline the piece', 30, 'create'],
      ['Rédiger le premier jet', 'Write the first draft', 120, 'create', 'high'],
      ['Laisser reposer puis réviser', 'Let it rest, then revise', 60, 'create'],
      ['Vérifier les faits et citer les sources', 'Fact-check and cite sources', 30, 'organize'],
      ['Ajouter les visuels', 'Add the visuals', 30, 'create'],
      ['Corriger et mettre en forme', 'Proofread and format', 30, 'organize', 'low'],
      ['Publier et diffuser', 'Publish and share', 20, 'organize'],
    ],
  },
  {
    id: 'presentation',
    patterns: [/\bpresentation\b/, /\bslides?\b/, /\bdiaporama\b/, /\bkeynote\b/, /\bpitch\b/, /\bexpose\b/],
    steps: [
      ['Définir le message clé et le public', 'Define the key message and audience', 30, 'create'],
      ['Construire la trame', 'Build the storyline', 45, 'create'],
      ['Créer les slides', 'Create the slides', 120, 'create', 'high'],
      ['Préparer les notes d’orateur', 'Write the speaker notes', 45, 'create'],
      ['Répéter à voix haute, chronomètre en main', 'Rehearse out loud, timed', 60, 'create'],
      ['Ajuster après la répétition', 'Adjust after rehearsal', 30, 'create'],
      ['Vérifier le matériel technique', 'Check the technical setup', 15, 'organize', 'low'],
    ],
  },
  {
    id: 'event',
    patterns: [
      /\bevenements?\b/,
      /\bevents?\b/,
      /\bsoiree\b/,
      /\bfete\b/,
      /\bparty\b/,
      /\banniversaire\b/,
      /\bbirthday\b/,
      /\bmeetup\b/,
      /\bseminaire\b/,
      /\bseminar\b/,
      /\batelier\b/,
      /\bworkshop\b/,
      /\bconference\b/,
      /\bmariage\b/,
      /\bwedding\b/,
    ],
    steps: [
      ['Définir l’objectif, la date et le budget', 'Define the goal, date and budget', 45, 'organize'],
      ['Établir la liste des invités', 'Draw up the guest list', 30, 'organize'],
      ['Réserver le lieu', 'Book the venue', 60, 'organize'],
      ['Envoyer les invitations', 'Send the invitations', 45, 'organize'],
      ['Organiser le traiteur et le matériel', 'Arrange catering and equipment', 60, 'organize'],
      ['Préparer le programme', 'Plan the programme', 45, 'create'],
      ['Confirmer les présences', 'Confirm attendance', 30, 'organize', 'low'],
      ['Préparer la check-list du jour J', 'Prepare the day-of checklist', 30, 'organize'],
      ['Animer l’événement', 'Run the event', 240, 'organize', 'high'],
      ['Remercier et faire le bilan', 'Thank attendees and debrief', 30, 'organize'],
    ],
  },
  {
    id: 'moving',
    patterns: [/\bdemenag\w*/, /\bmov(e|ing) (house|out|in)\b/, /\bmoving\b/, /\brelocat\w*/],
    steps: [
      ['Fixer la date et le budget', 'Set the date and budget', 30, 'organize'],
      ['Réserver déménageurs ou véhicule', 'Book movers or a van', 30, 'organize'],
      ['Trier et donner ce qui ne part pas', 'Sort and give away what is not coming', 180, 'organize'],
      ['Rassembler cartons et matériel', 'Get boxes and packing supplies', 30, 'organize', 'low'],
      ['Changer d’adresse (banque, administration, abonnements)', 'Update your address (bank, administration, subscriptions)', 60, 'organize', 'low'],
      ['Transférer ou résilier énergie et internet', 'Transfer or cancel utilities and internet', 45, 'organize'],
      ['Emballer pièce par pièce', 'Pack room by room', 480, 'organize'],
      ['Préparer un carton « première nuit »', 'Pack a first-night box', 20, 'organize', 'low'],
      ['Jour du déménagement', 'Moving day', 480, 'organize', 'high'],
      ['Faire l’état des lieux', 'Do the property inspection', 60, 'organize'],
      ['Déballer l’essentiel', 'Unpack the essentials', 180, 'organize'],
    ],
  },
  {
    id: 'trip',
    patterns: [/\bvoyages?\b/, /\bvoyager\b/, /\bvacances\b/, /\btrip\b/, /\btravel\b/, /\bholidays?\b/, /\bvacation\b/, /\bsejour\b/],
    steps: [
      ['Choisir les dates, la destination et le budget', 'Pick the dates, destination and budget', 45, 'organize'],
      ['Réserver le transport', 'Book transport', 45, 'organize'],
      ['Réserver l’hébergement', 'Book accommodation', 45, 'organize'],
      ['Vérifier les papiers (passeport, visa, assurance)', 'Check documents (passport, visa, insurance)', 30, 'organize', 'low'],
      ['Esquisser l’itinéraire', 'Sketch the itinerary', 60, 'create'],
      ['Faire la valise', 'Pack', 60, 'organize', 'low'],
      ['Préparer le départ (maison, courrier, plantes)', 'Prepare to leave (home, mail, plants)', 30, 'organize', 'low'],
    ],
  },
];

export interface VerbClass {
  id: string;
  /** Prefixes of the first matching word (folded): `redig` matches rédiger, rédige… */
  stems: readonly string[];
  steps: readonly Step[];
}

/** Generic plans chosen from the goal's leading verb when no template matches. */
export const VERB_CLASSES: readonly VerbClass[] = [
  {
    id: 'write',
    stems: ['redig', 'redac', 'ecri', 'write', 'writing', 'draft'],
    steps: [
      ['Rassembler les idées et les sources', 'Gather ideas and sources', 30, 'organize'],
      ['Faire un plan', 'Outline', 30, 'create'],
      ['Rédiger le premier jet', 'Write the first draft', 90, 'create', 'high'],
      ['Relire et corriger', 'Review and edit', 45, 'create'],
      ['Finaliser et envoyer', 'Finalise and send', 15, 'organize'],
    ],
  },
  {
    id: 'fix',
    stems: ['repar', 'corrig', 'resoud', 'resol', 'debug', 'fix', 'repair', 'solv', 'solve'],
    steps: [
      ['Observer et reproduire le problème', 'Observe and reproduce the problem', 30, 'organize'],
      ['Identifier la cause', 'Find the cause', 45, 'create', 'high'],
      ['Appliquer la correction', 'Apply the fix', 60, 'create'],
      ['Vérifier que c’est résolu', 'Check that it is solved', 15, 'organize'],
    ],
  },
  {
    id: 'learn',
    stems: ['appren', 'etudi', 'revis', 'learn', 'study', 'revise', 'practi'],
    steps: [
      ['Définir l’objectif d’apprentissage', 'Define the learning goal', 20, 'organize'],
      ['Choisir les ressources', 'Choose the resources', 30, 'organize'],
      ['Planifier des sessions courtes', 'Plan short sessions', 15, 'organize', 'low'],
      ['Étudier et pratiquer', 'Study and practise', 120, 'create', 'high'],
      ['S’auto-tester', 'Test yourself', 30, 'create'],
      ['Revoir les points faibles', 'Review the weak spots', 45, 'create'],
    ],
  },
  {
    id: 'buy',
    stems: ['achet', 'command', 'buy', 'order', 'purchas'],
    steps: [
      ['Définir le besoin et le budget', 'Define the need and budget', 15, 'organize'],
      ['Comparer les options', 'Compare the options', 30, 'organize'],
      ['Commander', 'Place the order', 15, 'organize', 'low'],
      ['Vérifier la réception', 'Check the delivery', 10, 'organize', 'low'],
    ],
  },
  {
    id: 'contact',
    stems: ['appel', 'contact', 'telephon', 'repond', 'relanc', 'call', 'email', 'phone', 'reply', 'follow'],
    steps: [
      ['Préparer les points à aborder', 'Prepare the talking points', 15, 'organize'],
      ['Prendre contact', 'Get in touch', 20, 'organize'],
      ['Noter la suite à donner', 'Write down the follow-up', 10, 'organize', 'low'],
    ],
  },
  {
    id: 'tidy',
    stems: ['rang', 'nettoy', 'tri', 'clean', 'tidy', 'declutter', 'sort'],
    steps: [
      ['Choisir la zone à traiter', 'Pick the area to tackle', 5, 'organize', 'low'],
      ['Trier : garder, donner, jeter', 'Sort: keep, donate, discard', 60, 'organize'],
      ['Ranger et nettoyer', 'Put away and clean', 60, 'organize'],
      ['Évacuer ce qui part', 'Take out what leaves', 20, 'organize', 'low'],
    ],
  },
  {
    id: 'plan',
    stems: ['organis', 'planifi', 'prepar', 'plan', 'organiz', 'prepar'],
    steps: [
      ['Définir l’objectif et l’échéance', 'Define the goal and deadline', 20, 'organize'],
      ['Lister tout ce qu’il faut', 'List everything needed', 30, 'organize'],
      ['Répartir en étapes datées', 'Split into dated steps', 30, 'organize'],
      ['Préparer', 'Prepare', 90, 'organize'],
      ['Vérifier la check-list finale', 'Go through the final checklist', 15, 'organize', 'low'],
    ],
  },
  {
    id: 'build',
    stems: ['cree', 'creer', 'construi', 'develop', 'fabriqu', 'code', 'implement', 'build', 'create', 'make'],
    steps: [
      ['Clarifier le résultat attendu', 'Clarify the expected result', 20, 'organize'],
      ['Esquisser une première version', 'Sketch a first version', 45, 'create'],
      ['Construire', 'Build it', 120, 'create', 'high'],
      ['Tester et ajuster', 'Test and adjust', 45, 'create'],
      ['Finaliser et livrer', 'Finalise and deliver', 20, 'organize'],
    ],
  },
];

/** Plan for goals with neither a template nor a known verb. `{goal}` is the goal text. */
export const GENERIC_STEPS: readonly Step[] = [
  ['Clarifier le résultat attendu', 'Clarify the expected result', 15, 'organize'],
  ['Rassembler ce qu’il faut (infos, outils, personnes)', 'Gather what is needed (info, tools, people)', 30, 'organize'],
  ['Faire une première action de 25 minutes', 'Do a first 25-minute step', 25, 'create'],
  ['Avancer sur : {goal}', 'Work on: {goal}', 90, 'create', 'high'],
  ['Vérifier et clore', 'Review and wrap up', 15, 'organize', 'low'],
];
