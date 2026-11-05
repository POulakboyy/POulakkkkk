/**
 * Maker-schedule guard (1.15): deep work needs long uninterrupted blocks, so a meeting that
 * cuts the day's last long free block into short pieces is flagged before it is accepted.
 *
 * Free blocks are measured inside the working window of the local day. `focus` events are
 * maker time, not interruptions, so they do not split a block; every other event does.
 */
import type { CalendarEvent, Id, Interval, Locale, Minutes } from '../model.ts';
import { MINUTE, freeSlots, overlaps } from '../time.ts';
import {
  isValidInterval,
  localAligner,
  localDate,
  localDay,
  shiftDate,
  toMinutes,
  workingWindow,
} from './calendar.ts';
import type {
  AlternativesInput,
  FocusBlock,
  FocusBlockInput,
  MakerCheck,
  MakerCheckInput,
  MakerCode,
} from './types.ts';

export function largestFocusBlock(input: FocusBlockInput): FocusBlock {
  const day = localDay(localDate(input.day, input.timeZone), input.timeZone);
  const window = workingWindow(day, input.prefs.workingHours, input.timeZone);
  return window ? largest(freeSlots(window, interruptions(input.events))) : { minutes: 0 };
}

export function checkMakerSchedule(input: MakerCheckInput): MakerCheck {
  const { candidate, prefs, timeZone } = input;
  const day = localDay(localDate(candidate.start, timeZone), timeZone);
  const window = workingWindow(day, prefs.workingHours, timeZone);
  const busy = interruptions(input.events, candidate.id);
  return evaluate(window, busy, candidate, prefs.makerBlockMin, prefs.locale);
}

/**
 * Slots of the candidate's length that are free and keep the day's maker block, closest to
 * the requested start first (then earliest). Working days only, never before `now`.
 */
export function suggestAlternatives(input: AlternativesInput): Interval[] {
  const { candidate, prefs, timeZone } = input;
  const dur = candidate.end - candidate.start;
  if (!isValidInterval(candidate)) return [];
  const limit = Math.max(0, Math.floor(input.limit ?? 3));
  const step = Math.max(1, input.stepMin ?? 15) * MINUTE;
  const reach = Math.max(0, Math.floor(input.searchDays ?? 1));
  const now = input.now ?? Number.NEGATIVE_INFINITY;
  const allBusy = busyEvents(input.events, candidate.id);
  const busy = interruptions(input.events, candidate.id);
  const origin = localDate(candidate.start, timeZone);

  const found: Interval[] = [];
  for (let offset = -reach; offset <= reach; offset++) {
    const day = localDay(shiftDate(origin, offset), timeZone);
    const window = workingWindow(day, prefs.workingHours, timeZone);
    if (!window) continue;
    const align = localAligner(window, timeZone);
    for (let start = align(window.start, step); start + dur <= window.end; start += step) {
      const slot = { start, end: start + dur };
      if (start < now || start === candidate.start) continue;
      if (allBusy.some((b) => overlaps(b, slot))) continue;
      if (evaluate(window, busy, slot, prefs.makerBlockMin, prefs.locale).ok) found.push(slot);
    }
  }
  return found
    .sort(
      (a, b) =>
        Math.abs(a.start - candidate.start) - Math.abs(b.start - candidate.start) ||
        a.start - b.start,
    )
    .slice(0, limit);
}

/* ------------------------------------------------------------------------------------------ */

function evaluate(
  window: Interval | undefined,
  busy: readonly Interval[],
  candidate: Interval,
  makerBlockMin: Minutes,
  locale: Locale,
): MakerCheck {
  const threshold = Math.max(0, makerBlockMin);
  const before = window ? freeSlots(window, busy) : [];
  const after = window ? freeSlots(window, [...busy, candidate]) : [];
  const largestBefore = largest(before).minutes;
  const largestAfter = largest(after).minutes;
  const fragmented = before.find(
    (b) => toMinutes(b.end - b.start) >= threshold && overlaps(b, candidate),
  );

  let code: MakerCode = 'ok';
  if (threshold > 0 && largestBefore < threshold) code = 'no-maker-block';
  else if (largestAfter < threshold) code = 'fragments-maker-block';

  const result: MakerCheck = {
    ok: code !== 'fragments-maker-block',
    code,
    largestBlockBefore: largestBefore,
    largestBlockAfter: largestAfter,
    message: message(code, threshold, largestAfter, locale),
  };
  if (code === 'fragments-maker-block' && fragmented) result.fragmented = fragmented;
  return result;
}

function largest(slots: readonly Interval[]): FocusBlock {
  let best: Interval | undefined;
  for (const s of slots) if (!best || s.end - s.start > best.end - best.start) best = s;
  return best ? { minutes: toMinutes(best.end - best.start), block: best } : { minutes: 0 };
}

/** Valid events except `focus` blocks (and the event being moved). */
function interruptions(events: readonly CalendarEvent[], ignore?: Id): Interval[] {
  return busyEvents(events, ignore).filter((e) => e.kind !== 'focus');
}

function busyEvents(events: readonly CalendarEvent[], ignore?: Id): CalendarEvent[] {
  return events.filter((e) => e.id !== ignore && isValidInterval(e));
}

/* ------------------------------------------------------------------------------------------ */
/* Messages                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const MESSAGES: Record<Locale, Record<MakerCode, (block: string, left: string) => string>> = {
  fr: {
    ok: (_block, left) => `La journée garde un bloc libre de ${left}.`,
    'fragments-maker-block': (block, left) =>
      `Cette réunion fragmente votre bloc de concentration de ${block} : le plus long créneau libre restant ferait ${left}.`,
    'no-maker-block': (block) => `Aucun bloc de concentration de ${block} n'est libre ce jour-là.`,
  },
  en: {
    ok: (_block, left) => `The day keeps a ${left} free block.`,
    'fragments-maker-block': (block, left) =>
      `This meeting breaks up your ${block} focus block: the longest free slot left would be ${left}.`,
    'no-maker-block': (block) => `No ${block} focus block is free that day.`,
  },
};

function message(code: MakerCode, threshold: Minutes, left: Minutes, locale: Locale): string {
  return MESSAGES[locale][code](formatDuration(threshold, locale), formatDuration(left, locale));
}

/** `formatDuration(90, 'fr')` → `1 h 30`; `formatDuration(90, 'en')` → `1 h 30 min`. */
export function formatDuration(minutes: Minutes, locale: Locale): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return locale === 'fr' ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h ${m} min`;
}
