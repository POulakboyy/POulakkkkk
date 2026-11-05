/**
 * Interactive innovation method cards (5.10): SCAMPER and the Six Thinking Hats as FR/EN data,
 * plus a pure, timeboxed step machine to walk a user through them.
 *
 * - SCAMPER: Eberle (1971), "SCAMPER: Games for Imagination Development", which arranges
 *   Osborn's idea-spurring questions into seven prompts.
 * - Six Thinking Hats: de Bono (1985), "Six Thinking Hats". The blue hat opens and closes the
 *   session; the red hat is kept short because it asks for gut reactions, not justification.
 *
 * Timeboxes are suggested defaults, adjustable per session; they are not empirical values.
 * The machine never reads the clock: every transition takes `now` (epoch ms), so it is
 * deterministic, testable and safe to persist as plain JSON.
 */
import type { Locale, Minutes, Timestamp } from '../model.ts';

export type MethodId = 'scamper' | 'six-hats';
export type HatColor = 'white' | 'red' | 'black' | 'yellow' | 'green' | 'blue';

type Text = Readonly<Record<Locale, string>>;

export interface MethodStep {
  /** Unique within its method. */
  id: string;
  /** Short label (`S`, `C`… for SCAMPER; the hat colour for Six Hats). */
  letter?: string;
  hat?: HatColor;
  title: Text;
  /** One-sentence instruction for the step. */
  prompt: Text;
  /** Questions to spark ideas during the step. */
  questions: Readonly<Record<Locale, readonly string[]>>;
  /** Suggested timebox. */
  minutes: Minutes;
}

export interface MethodCard {
  id: MethodId;
  name: Text;
  summary: Text;
  /** Bibliographic origin of the method. */
  source: string;
  steps: readonly MethodStep[];
}

type StepRow = {
  id: string;
  letter?: string;
  hat?: HatColor;
  minutes: Minutes;
  title: [fr: string, en: string];
  prompt: [fr: string, en: string];
  questions: [fr: readonly string[], en: readonly string[]];
};

function step(row: StepRow): MethodStep {
  const out: MethodStep = {
    id: row.id,
    title: { fr: row.title[0], en: row.title[1] },
    prompt: { fr: row.prompt[0], en: row.prompt[1] },
    questions: { fr: row.questions[0], en: row.questions[1] },
    minutes: row.minutes,
  };
  if (row.letter) out.letter = row.letter;
  if (row.hat) out.hat = row.hat;
  return out;
}

export const SCAMPER: MethodCard = {
  id: 'scamper',
  name: { fr: 'SCAMPER', en: 'SCAMPER' },
  summary: {
    fr: 'Sept questions pour transformer une idée existante : substituer, combiner, adapter, modifier, détourner, éliminer, inverser.',
    en: 'Seven prompts to transform an existing idea: substitute, combine, adapt, modify, put to another use, eliminate, reverse.',
  },
  source: 'Eberle, B. (1971). SCAMPER: Games for Imagination Development.',
  steps: [
    step({
      id: 'substitute',
      letter: 'S',
      minutes: 4,
      title: ['Substituer', 'Substitute'],
      prompt: [
        'Remplace un élément (matériau, personne, étape, règle) par un autre.',
        'Replace one element (material, person, step, rule) with another.',
      ],
      questions: [
        [
          'Quel composant pourrait être remplacé ?',
          'Qui d’autre pourrait s’en charger ?',
          'Quelle autre règle ou méthode utiliser ?',
        ],
        [
          'Which component could be replaced?',
          'Who else could do it?',
          'What other rule or process could you use?',
        ],
      ],
    }),
    step({
      id: 'combine',
      letter: 'C',
      minutes: 4,
      title: ['Combiner', 'Combine'],
      prompt: [
        'Associe l’idée à une autre idée, fonction ou ressource.',
        'Merge the idea with another idea, function or resource.',
      ],
      questions: [
        [
          'Que se passe-t-il si tu fusionnes deux fonctions ?',
          'Quels objectifs pourraient être servis ensemble ?',
          'Quelle ressource partager avec un autre projet ?',
        ],
        [
          'What happens if you merge two functions?',
          'Which goals could be served together?',
          'Which resource could you share with another project?',
        ],
      ],
    }),
    step({
      id: 'adapt',
      letter: 'A',
      minutes: 4,
      title: ['Adapter', 'Adapt'],
      prompt: [
        'Emprunte une solution qui fonctionne ailleurs et ajuste-la.',
        'Borrow a solution that works elsewhere and adjust it.',
      ],
      questions: [
        [
          'Qu’est-ce qui ressemble à ce problème dans un autre domaine ?',
          'Quelle idée du passé pourrais-tu reprendre ?',
          'Comment la nature résout-elle ce problème ?',
        ],
        [
          'What resembles this problem in another field?',
          'Which past idea could you revive?',
          'How does nature solve this problem?',
        ],
      ],
    }),
    step({
      id: 'modify',
      letter: 'M',
      minutes: 4,
      title: ['Modifier', 'Modify'],
      prompt: [
        'Agrandis, réduis ou change la forme, la fréquence, l’intensité.',
        'Magnify, minify or change the shape, frequency or intensity.',
      ],
      questions: [
        [
          'Que se passe-t-il si tu exagères un attribut ?',
          'Et si c’était dix fois plus petit ?',
          'Quelle couleur, forme ou rythme changer ?',
        ],
        [
          'What if you exaggerated one attribute?',
          'What if it were ten times smaller?',
          'Which colour, shape or rhythm could change?',
        ],
      ],
    }),
    step({
      id: 'put-to-other-uses',
      letter: 'P',
      minutes: 4,
      title: ['Détourner', 'Put to another use'],
      prompt: [
        'Trouve un autre usage, un autre public ou un autre contexte.',
        'Find another use, audience or context.',
      ],
      questions: [
        [
          'Qui d’autre pourrait s’en servir ?',
          'À quoi servirait-ce dans un autre contexte ?',
          'Que faire des déchets ou des restes ?',
        ],
        [
          'Who else could use it?',
          'What would it be for in another context?',
          'What could you do with the waste or leftovers?',
        ],
      ],
    }),
    step({
      id: 'eliminate',
      letter: 'E',
      minutes: 4,
      title: ['Éliminer', 'Eliminate'],
      prompt: [
        'Retire une partie, une étape ou une contrainte et observe ce qui reste.',
        'Remove a part, step or constraint and see what remains.',
      ],
      questions: [
        [
          'Qu’est-ce qui n’est pas indispensable ?',
          'Et s’il fallait garder une seule fonction ?',
          'Quelle étape supprimer sans perte ?',
        ],
        [
          'What is not essential?',
          'What if only one feature could stay?',
          'Which step could go without loss?',
        ],
      ],
    }),
    step({
      id: 'reverse',
      letter: 'R',
      minutes: 4,
      title: ['Inverser', 'Reverse'],
      prompt: [
        'Inverse l’ordre, les rôles ou le sens ; réorganise les éléments.',
        'Reverse the order, roles or direction; rearrange the parts.',
      ],
      questions: [
        [
          'Et si tu commençais par la fin ?',
          'Et si l’utilisateur et le fournisseur échangeaient leurs rôles ?',
          'Que se passe-t-il à l’envers ?',
        ],
        [
          'What if you started from the end?',
          'What if user and provider swapped roles?',
          'What happens upside down?',
        ],
      ],
    }),
  ],
};

export const SIX_HATS: MethodCard = {
  id: 'six-hats',
  name: { fr: 'Les six chapeaux', en: 'Six Thinking Hats' },
  summary: {
    fr: 'Une seule manière de penser à la fois : faits, émotions, prudence, optimisme, créativité, pilotage.',
    en: 'One mode of thinking at a time: facts, feelings, caution, optimism, creativity, process.',
  },
  source: 'de Bono, E. (1985). Six Thinking Hats.',
  steps: [
    step({
      id: 'blue-open',
      hat: 'blue',
      letter: 'Bleu',
      minutes: 2,
      title: ['Chapeau bleu — cadrer', 'Blue hat — frame'],
      prompt: [
        'Formule la question et l’objectif de la séance.',
        'State the question and the goal of the session.',
      ],
      questions: [
        ['Quelle décision ou idée examine-t-on ?', 'À quoi ressemble une bonne fin de séance ?'],
        ['Which decision or idea are we looking at?', 'What does a good outcome look like?'],
      ],
    }),
    step({
      id: 'white',
      hat: 'white',
      letter: 'Blanc',
      minutes: 4,
      title: ['Chapeau blanc — faits', 'White hat — facts'],
      prompt: [
        'Liste les faits, les chiffres connus et ce qui manque.',
        'List the facts, known figures and what is missing.',
      ],
      questions: [
        ['Que sait-on avec certitude ?', 'Quelle information manque ?', 'Comment l’obtenir ?'],
        ['What do we know for sure?', 'What information is missing?', 'How could we get it?'],
      ],
    }),
    step({
      id: 'red',
      hat: 'red',
      letter: 'Rouge',
      minutes: 1,
      title: ['Chapeau rouge — émotions', 'Red hat — feelings'],
      prompt: [
        'Note ton ressenti immédiat, sans le justifier.',
        'Write your gut feeling, without justifying it.',
      ],
      questions: [
        ['Qu’est-ce que ça t’inspire, là, maintenant ?', 'Qu’est-ce qui t’inquiète ou t’attire ?'],
        ['How does it make you feel right now?', 'What worries or attracts you?'],
      ],
    }),
    step({
      id: 'yellow',
      hat: 'yellow',
      letter: 'Jaune',
      minutes: 4,
      title: ['Chapeau jaune — bénéfices', 'Yellow hat — benefits'],
      prompt: [
        'Cherche la valeur et les raisons pour lesquelles ça peut marcher.',
        'Look for the value and the reasons it could work.',
      ],
      questions: [
        [
          'Quels sont les bénéfices ?',
          'Pour qui est-ce une bonne nouvelle ?',
          'Dans le meilleur cas ?',
        ],
        ['What are the benefits?', 'Who is this good news for?', 'What is the best case?'],
      ],
    }),
    step({
      id: 'black',
      hat: 'black',
      letter: 'Noir',
      minutes: 4,
      title: ['Chapeau noir — risques', 'Black hat — risks'],
      prompt: [
        'Identifie les risques, les faiblesses et les points de rupture.',
        'Identify the risks, weaknesses and failure points.',
      ],
      questions: [
        ['Qu’est-ce qui peut mal tourner ?', 'Quelle hypothèse est la plus fragile ?'],
        ['What could go wrong?', 'Which assumption is the weakest?'],
      ],
    }),
    step({
      id: 'green',
      hat: 'green',
      letter: 'Vert',
      minutes: 5,
      title: ['Chapeau vert — idées', 'Green hat — ideas'],
      prompt: [
        'Propose des alternatives et des solutions aux risques relevés.',
        'Propose alternatives and fixes for the risks you found.',
      ],
      questions: [
        [
          'Quelles autres options existent ?',
          'Comment contourner chaque risque ?',
          'Et l’idée la plus folle ?',
        ],
        [
          'What other options exist?',
          'How could each risk be avoided?',
          'What is the wildest idea?',
        ],
      ],
    }),
    step({
      id: 'blue-close',
      hat: 'blue',
      letter: 'Bleu',
      minutes: 3,
      title: ['Chapeau bleu — conclure', 'Blue hat — conclude'],
      prompt: [
        'Résume, décide et fixe la prochaine action.',
        'Summarise, decide and set the next action.',
      ],
      questions: [
        ['Que retient-on ?', 'Quelle est la prochaine action, et pour quand ?'],
        ['What do we keep?', 'What is the next action, and by when?'],
      ],
    }),
  ],
};

export const METHODS: readonly MethodCard[] = [SCAMPER, SIX_HATS];

export function getMethod(id: MethodId): MethodCard {
  return id === 'scamper' ? SCAMPER : SIX_HATS;
}

/* ------------------------------------------------------------------------------------------ */
/* Step machine                                                                                */
/* ------------------------------------------------------------------------------------------ */

export type SessionStatus = 'running' | 'paused' | 'done';

/** Plain, JSON-serialisable state of a guided method session. */
export interface MethodSession {
  methodId: MethodId;
  status: SessionStatus;
  stepIndex: number;
  startedAt: Timestamp;
  /** When the current step last (re)started running; `null` while paused or done. */
  runningSince: Timestamp | null;
  /** Milliseconds spent on each step, excluding the current running stretch. */
  spent: number[];
  /** Timebox of each step, in minutes. */
  minutes: Minutes[];
  /** Ideas captured during each step. */
  notes: string[][];
  finishedAt?: Timestamp;
}

export interface StartSessionOptions {
  /** Per-step timebox overrides, by step id. */
  minutes?: Readonly<Record<string, Minutes>>;
}

const MINUTE = 60_000;

export function startSession(
  methodId: MethodId,
  now: Timestamp,
  options: StartSessionOptions = {},
): MethodSession {
  const steps = getMethod(methodId).steps;
  return {
    methodId,
    status: 'running',
    stepIndex: 0,
    startedAt: now,
    runningSince: now,
    spent: steps.map(() => 0),
    minutes: steps.map((s) => Math.max(0, options.minutes?.[s.id] ?? s.minutes)),
    notes: steps.map(() => []),
  };
}

export function currentStep(session: MethodSession): MethodStep {
  const steps = getMethod(session.methodId).steps;
  return steps[clampIndex(session.stepIndex, steps.length)] as MethodStep;
}

/** Milliseconds spent on step `index` (current stretch included). */
export function stepElapsed(
  session: MethodSession,
  now: Timestamp,
  index = session.stepIndex,
): number {
  const base = session.spent[index] ?? 0;
  const running =
    index === session.stepIndex && session.runningSince !== null
      ? Math.max(0, now - session.runningSince)
      : 0;
  return base + running;
}

/** Milliseconds left in the current step's timebox (negative once overdue). */
export function stepRemaining(session: MethodSession, now: Timestamp): number {
  return (session.minutes[session.stepIndex] ?? 0) * MINUTE - stepElapsed(session, now);
}

export function isOverdue(session: MethodSession, now: Timestamp): boolean {
  return session.status !== 'done' && stepRemaining(session, now) < 0;
}

/** Steps completed over total steps, in [0, 1]. */
export function sessionProgress(session: MethodSession): number {
  const total = session.spent.length;
  if (total === 0 || session.status === 'done') return 1;
  return session.stepIndex / total;
}

/** Banks the running stretch of the current step into `spent`. */
function bank(session: MethodSession, now: Timestamp): number[] {
  const spent = session.spent.slice();
  spent[session.stepIndex] = stepElapsed(session, now);
  return spent;
}

/** Moves to step `index` (clamped). Moving past the last step finishes the session. */
export function goToStep(session: MethodSession, index: number, now: Timestamp): MethodSession {
  if (session.status === 'done' || !Number.isFinite(index)) return session;
  const spent = bank(session, now);
  if (index >= spent.length)
    return { ...session, spent, status: 'done', runningSince: null, finishedAt: now };
  const stepIndex = clampIndex(index, spent.length);
  return {
    ...session,
    spent,
    stepIndex,
    runningSince: session.status === 'running' ? now : null,
  };
}

export function nextStep(session: MethodSession, now: Timestamp): MethodSession {
  return goToStep(session, session.stepIndex + 1, now);
}

export function previousStep(session: MethodSession, now: Timestamp): MethodSession {
  return goToStep(session, session.stepIndex - 1, now);
}

export function pauseSession(session: MethodSession, now: Timestamp): MethodSession {
  if (session.status !== 'running') return session;
  return { ...session, spent: bank(session, now), status: 'paused', runningSince: null };
}

export function resumeSession(session: MethodSession, now: Timestamp): MethodSession {
  if (session.status !== 'paused') return session;
  return { ...session, status: 'running', runningSince: now };
}

export function finishSession(session: MethodSession, now: Timestamp): MethodSession {
  if (session.status === 'done') return session;
  return {
    ...session,
    spent: bank(session, now),
    status: 'done',
    runningSince: null,
    finishedAt: now,
  };
}

/** Adds an idea to the current step (blank text is ignored). */
export function addIdea(session: MethodSession, text: string): MethodSession {
  const idea = text.trim();
  if (!idea) return session;
  const notes = session.notes.map((list, i) => (i === session.stepIndex ? [...list, idea] : list));
  return { ...session, notes };
}

/** Markdown summary of the session: one section per step with its ideas. */
export function summarizeSession(session: MethodSession, locale: Locale): string {
  const card = getMethod(session.methodId);
  const lines = [`# ${card.name[locale]}`, ''];
  card.steps.forEach((s, i) => {
    const ideas = session.notes[i] ?? [];
    if (ideas.length === 0) return;
    lines.push(`## ${s.title[locale]}`, '', ...ideas.map((idea) => `- ${idea}`), '');
  });
  return lines.join('\n').trimEnd() + '\n';
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(0, Math.floor(index)), Math.max(0, length - 1));
}
