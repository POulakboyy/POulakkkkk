/** Deck of serendipity cards (5.1): a handful of distinct remote pairs drawn in one go. */
import { ideation, type Note } from '@pouxis/core';

export type Pair = ideation.Connection<Note>;

export function buildDeck(
  notes: readonly Note[],
  rng: ideation.Rng,
  size = 5,
  history: ReadonlyArray<readonly [string, string]> = [],
): Pair[] {
  const seen: Array<readonly [string, string]> = [...history];
  const deck: Pair[] = [];
  while (deck.length < size) {
    const pair = ideation.randomConnection({ notes, rng, history: seen });
    if (!pair) break;
    deck.push(pair);
    seen.push([pair.a.id, pair.b.id]);
  }
  return deck;
}

/** Horizontal drag distance (px) past which a swipe changes card. */
export const SWIPE_THRESHOLD = 72;

/** −1 previous, 1 next, 0 snap back. */
export function swipeDirection(dx: number, threshold = SWIPE_THRESHOLD): -1 | 0 | 1 {
  if (dx <= -threshold) return 1;
  if (dx >= threshold) return -1;
  return 0;
}
