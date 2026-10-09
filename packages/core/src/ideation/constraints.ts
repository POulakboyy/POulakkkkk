/**
 * Divergent-constraint generator (5.4): a curated FR/EN library of creative challenges to
 * inject into a brief ("What if the user were blind?", "Do it in half the time").
 *
 * Rationale: well-chosen constraints tend to facilitate rather than hinder creative output by
 * blocking the path of least resistance (Haught-Tromp, 2017, "The Green Eggs and Ham
 * Hypothesis: How Constraints Facilitate Creativity", Psychology of Aesthetics, Creativity,
 * and the Arts, 11(1)).
 */
import type { Locale } from '../model.ts';
import { pick, type Rng } from './rng.ts';

export type ConstraintCategory =
  | 'user'
  | 'time'
  | 'resources'
  | 'medium'
  | 'inversion'
  | 'scale'
  | 'emotion';

export interface Constraint {
  /** Stable id (`<category>-<slug>`), safe to persist in a "already drawn" list. */
  id: string;
  category: ConstraintCategory;
  text: Readonly<Record<Locale, string>>;
}

export const CONSTRAINT_CATEGORIES: readonly {
  id: ConstraintCategory;
  label: Readonly<Record<Locale, string>>;
}[] = [
  { id: 'user', label: { fr: 'Utilisateur', en: 'User' } },
  { id: 'time', label: { fr: 'Temps', en: 'Time' } },
  { id: 'resources', label: { fr: 'Ressources', en: 'Resources' } },
  { id: 'medium', label: { fr: 'Support', en: 'Medium' } },
  { id: 'inversion', label: { fr: 'Inversion', en: 'Inversion' } },
  { id: 'scale', label: { fr: 'Échelle', en: 'Scale' } },
  { id: 'emotion', label: { fr: 'Émotion', en: 'Emotion' } },
];

type Row = readonly [slug: string, fr: string, en: string];

const LIBRARY: Readonly<Record<ConstraintCategory, readonly Row[]>> = {
  user: [
    ['blind', 'Et si l’utilisateur était aveugle ?', 'What if the user were blind?'],
    ['child', 'Et si l’utilisateur avait 7 ans ?', 'What if the user were 7 years old?'],
    [
      'elderly',
      'Et si l’utilisateur avait 90 ans et n’avait jamais touché un smartphone ?',
      'What if the user were 90 and had never touched a smartphone?',
    ],
    ['one-hand', 'L’utilisateur n’a qu’une main de libre.', 'The user has only one free hand.'],
    [
      'ten-seconds',
      'L’utilisateur n’a que 10 secondes à t’accorder.',
      'The user can only spare you 10 seconds.',
    ],
    [
      'expert',
      'Ton utilisateur est le meilleur expert mondial du sujet.',
      'Your user is the world’s leading expert on the subject.',
    ],
    [
      'hostile',
      'Ton utilisateur déteste profondément l’idée de départ.',
      'Your user deeply hates the original idea.',
    ],
    ['foreign', 'L’utilisateur ne parle pas ta langue.', 'The user doesn’t speak your language.'],
    [
      'noisy',
      'L’utilisateur est dans un lieu bruyant et n’entend rien.',
      'The user is somewhere loud and can’t hear anything.',
    ],
    ['offline', 'L’utilisateur n’a aucune connexion internet.', 'The user has no internet connection.'],
  ],
  time: [
    ['half', 'Fais-le en moitié moins de temps.', 'Do it in half the time.'],
    [
      'one-hour',
      'Tu n’as qu’une heure pour livrer une première version.',
      'You only have one hour to ship a first version.',
    ],
    ['ten-years', 'Ça doit encore fonctionner dans dix ans.', 'It must still work ten years from now.'],
    ['year-1900', 'Et si tu devais le réaliser en 1900 ?', 'What if you had to build it in 1900?'],
    ['year-2100', 'Imagine la version de 2100.', 'Imagine the 2100 version.'],
    [
      'five-minutes',
      'Résous-le en cinq minutes, sans réfléchir davantage.',
      'Solve it in five minutes, no more thinking.',
    ],
    ['once', 'Ça ne servira qu’une seule fois.', 'It will only ever be used once.'],
    [
      'daily',
      'Ça doit être utilisé chaque jour, pendant des années.',
      'It must be used every day, for years.',
    ],
    ['night', 'Ça ne peut être utilisé que la nuit.', 'It can only be used at night.'],
  ],
  resources: [
    ['zero-budget', 'Budget : zéro euro.', 'Budget: zero.'],
    [
      'unlimited',
      'Ton budget est illimité : qu’est-ce qui change vraiment ?',
      'Your budget is unlimited: what really changes?',
    ],
    ['alone', 'Tu travailles seul, sans aucune aide.', 'You work alone, with no help at all.'],
    ['three-tools', 'Tu ne peux utiliser que trois outils.', 'You may only use three tools.'],
    ['salvaged', 'Uniquement des matériaux de récupération.', 'Only salvaged materials.'],
    ['no-screen', 'Interdit d’utiliser un écran.', 'No screens allowed.'],
    ['no-words', 'Aucun mot écrit autorisé.', 'No written words allowed.'],
    [
      'paper',
      'Une feuille de papier et un crayon, rien d’autre.',
      'One sheet of paper and a pencil, nothing else.',
    ],
    [
      'hundred-people',
      'Cent personnes doivent pouvoir y contribuer.',
      'A hundred people must be able to contribute.',
    ],
  ],
  medium: [
    ['sound', 'Exprime-le uniquement par le son.', 'Express it only through sound.'],
    ['poster', 'Ça doit tenir sur une affiche.', 'It must fit on a poster.'],
    ['short-text', 'Explique-le en 140 caractères.', 'Explain it in 140 characters.'],
    ['object', 'Transforme-le en objet physique.', 'Turn it into a physical object.'],
    ['game', 'Fais-en un jeu.', 'Make it a game.'],
    ['ritual', 'Fais-en un rituel.', 'Make it a ritual.'],
    [
      'comic',
      'Raconte-le en bande dessinée de trois cases.',
      'Tell it as a three-panel comic.',
    ],
    ['map', 'Représente-le comme une carte géographique.', 'Represent it as a map.'],
    ['recipe', 'Écris-le sous forme de recette de cuisine.', 'Write it as a cooking recipe.'],
    [
      'gestures',
      'Communique-le sans parler, seulement par des gestes.',
      'Communicate it without speaking, only with gestures.',
    ],
  ],
  inversion: [
    [
      'opposite',
      'Fais exactement l’inverse de ce qui est attendu.',
      'Do the exact opposite of what is expected.',
    ],
    [
      'worst',
      'Conçois la pire version possible, puis inverse chaque défaut.',
      'Design the worst possible version, then reverse each flaw.',
    ],
    [
      'no-core',
      'Supprime la fonction principale : que reste-t-il ?',
      'Remove the core feature: what is left?',
    ],
    [
      'paid-user',
      'Et si l’utilisateur était payé pour l’utiliser ?',
      'What if the user were paid to use it?',
    ],
    ['slow', 'Rends-le volontairement lent.', 'Make it deliberately slow.'],
    ['end-first', 'Commence par la fin.', 'Start from the end.'],
    [
      'problem-solution',
      'Et si le problème était en fait une solution ?',
      'What if the problem were actually a solution?',
    ],
    [
      'swap-roles',
      'Inverse les rôles de l’utilisateur et du créateur.',
      'Swap the roles of user and creator.',
    ],
    ['cliche', 'Utilise le cliché que tu t’interdisais.', 'Use the cliché you had ruled out.'],
  ],
  scale: [
    [
      'million',
      'Ça doit servir un million de personnes demain.',
      'It must serve a million people tomorrow.',
    ],
    ['one-person', 'Conçois-le pour une seule personne précise.', 'Design it for one specific person.'],
    ['pocket', 'Ça doit tenir dans une poche.', 'It must fit in a pocket.'],
    ['building', 'Donne-lui la taille d’un bâtiment.', 'Make it the size of a building.'],
    ['ten-times', 'Et si c’était dix fois plus grand ?', 'What if it were ten times bigger?'],
    ['tenth', 'Et si c’était dix fois plus petit ?', 'What if it were ten times smaller?'],
    ['city', 'Déploie-le à l’échelle d’une ville entière.', 'Roll it out across an entire city.'],
    ['one-word', 'Résume-le en un seul mot.', 'Sum it up in a single word.'],
    ['mars', 'Et si ça devait fonctionner sur Mars ?', 'What if it had to work on Mars?'],
  ],
  emotion: [
    ['laugh', 'Ça doit faire rire.', 'It must make people laugh.'],
    ['calm', 'Ça doit apaiser en moins de dix secondes.', 'It must calm people within ten seconds.'],
    [
      'nostalgia',
      'Ça doit évoquer la nostalgie de l’enfance.',
      'It must evoke childhood nostalgia.',
    ],
    ['wonder', 'Ça doit provoquer l’émerveillement.', 'It must spark wonder.'],
    [
      'trust',
      'Un inconnu doit lui faire confiance au premier regard.',
      'A stranger must trust it at first sight.',
    ],
    [
      'anger',
      'Pars de ce qui te met en colère dans ce sujet.',
      'Start from what makes you angry about this topic.',
    ],
    [
      'fear',
      'Et si ça devait aider quelqu’un qui a peur ?',
      'What if it had to help someone who is afraid?',
    ],
    [
      'pride',
      'L’utilisateur doit en être fier au point de le montrer.',
      'Users must be proud enough to show it off.',
    ],
    ['surprise', 'Ajoute une surprise que personne n’attend.', 'Add a surprise nobody expects.'],
    ['melancholy', 'Donne-lui une note de mélancolie.', 'Give it a touch of melancholy.'],
  ],
};

/** The whole library, grouped by category in `CONSTRAINT_CATEGORIES` order. */
export const CONSTRAINTS: readonly Constraint[] = CONSTRAINT_CATEGORIES.flatMap(({ id }) =>
  LIBRARY[id].map(([slug, fr, en]) => ({ id: `${id}-${slug}`, category: id, text: { fr, en } })),
);

const BY_ID = new Map(CONSTRAINTS.map((c) => [c.id, c]));

export function getConstraint(id: string): Constraint | undefined {
  return BY_ID.get(id);
}

export interface DrawConstraintOptions {
  rng?: Rng;
  /** Ids already drawn (e.g. this session), never returned again. */
  exclude?: Iterable<string>;
  /** Restrict the draw to one or several categories. */
  category?: ConstraintCategory | readonly ConstraintCategory[];
}

/**
 * A random constraint, uniformly among those not excluded; `null` once every eligible
 * constraint has been drawn (the UI can then offer to start over).
 */
export function drawConstraint(options: DrawConstraintOptions = {}): Constraint | null {
  const rng = options.rng ?? Math.random;
  const exclude = new Set(options.exclude ?? []);
  const categories =
    options.category === undefined
      ? undefined
      : new Set<ConstraintCategory>(
          typeof options.category === 'string' ? [options.category] : options.category,
        );
  const pool = CONSTRAINTS.filter(
    (c) => !exclude.has(c.id) && (!categories || categories.has(c.category)),
  );
  return pick(rng, pool) ?? null;
}
