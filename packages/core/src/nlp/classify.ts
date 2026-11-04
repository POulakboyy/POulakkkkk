/** Kind and work-mode inference from the words of a capture. */
import type { WorkMode } from '../model.ts';
import {
  CREATE_PREFIXES,
  MEETING_WORDS,
  ORGANIZE_PREFIXES,
  ORGANIZE_WORDS,
  alt,
} from './lexicon.ts';
import { fold } from './text.ts';

const RE_MEETING = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${alt(MEETING_WORDS)})(?![\\p{L}\\p{N}])`,
  'u',
);
const RE_WORD = /[\p{L}\p{N}]+/gu;
/** How many leading words are inspected: imperative captures start with their verb. */
const MODE_WORDS = 2;

/** True when the folded text names a meeting ("réunion", "rdv", "déjeuner avec", "call"…). */
export function hasMeetingWord(folded: string): boolean {
  return RE_MEETING.test(folded);
}

function modeOfWord(w: string): WorkMode | undefined {
  if (CREATE_PREFIXES.some((p) => w.startsWith(p))) return 'create';
  if (ORGANIZE_WORDS.has(w) || ORGANIZE_PREFIXES.some((p) => w.startsWith(p))) return 'organize';
  return undefined;
}

/**
 * Work mode from the verb that opens the title: "écrire", "dessiner", "composer", "tourner",
 * "design" → create; "payer", "répondre", "trier", "organiser", "facturer" → organize.
 */
export function inferMode(title: string): WorkMode | undefined {
  const words = fold(title).match(RE_WORD) ?? [];
  for (const w of words.slice(0, MODE_WORDS)) {
    const mode = modeOfWord(w);
    if (mode) return mode;
  }
  return undefined;
}
