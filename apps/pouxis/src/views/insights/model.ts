import {
  addDays,
  dayKey,
  insights,
  startOfWeek,
  weekday,
  type CalendarEvent,
  type JournalEntry,
  type Locale,
  type Note,
  type Task,
  type Timestamp,
  type TimeZone,
} from '@pouxis/core';
import type { MessageKey } from '../../i18n/index.ts';
import type { MessageVars } from '../../i18n/index.ts';

/** Streak rules of the app: one joker per week, at most two in the bank. */
export const STREAK_RULES: insights.StreakRules = { jokersPerWeek: 1, maxJokers: 2 };
/** Days shown in the streak strip (three weeks reads at a glance without scrolling). */
export const STREAK_STRIP_DAYS = 21;
/** Rows kept in the dormant / archive lists. */
export const STALE_LIMIT = 5;

export interface InsightsInput {
  tasks: readonly Task[];
  events: readonly CalendarEvent[];
  journal: readonly JournalEntry[];
  notes: readonly Note[];
  now: Timestamp;
  timeZone: TimeZone;
  /** 0 = the current week, -1 = last week… Never positive. */
  weekOffset: number;
}

export type StaleKind = 'tasks' | 'notes';

export interface StaleItem {
  kind: StaleKind;
  id: string;
  title: string;
  idleDays: number;
}

export type StripState = 'active' | 'joker' | 'rest';

export interface StripDay {
  day: string;
  state: StripState;
  today: boolean;
}

export interface InsightsModel {
  week: { start: Timestamp; end: Timestamp };
  /** The review of the current week is "ready" on Sundays (7.9: Sunday evening report). */
  reviewReady: boolean;
  energy: insights.EnergyHeatmap;
  balance: insights.Balance;
  streak: insights.Streak;
  strip: StripDay[];
  review: insights.WeeklyReview;
  skills: insights.SkillNode;
  deadEnds: StaleItem[];
  archive: StaleItem[];
}

export function computeInsights(input: InsightsInput): InsightsModel {
  const { tasks, events, journal, notes, now, timeZone } = input;
  const offset = Math.min(0, Math.trunc(input.weekOffset));
  const start = addDays(startOfWeek(now, timeZone, 1), offset * 7, timeZone);
  const end = addDays(start, 7, timeZone);
  const reviewNow = Math.min(now, end);

  const days = insights.activeDays({ tasks, timeZone });
  const today = dayKey(now, timeZone);
  const streak = insights.streak({ activeDays: days, today, rules: STREAK_RULES });

  return {
    week: { start, end },
    reviewReady: offset === 0 && weekday(now, timeZone) === 0,
    energy: insights.energyHeatmap({ tasks, now, timeZone }),
    balance: insights.balance({ tasks, events, range: { start, end }, timeZone }),
    streak,
    strip: streakStrip(days, streak, now, timeZone, STREAK_STRIP_DAYS),
    review: insights.weeklyReview({
      tasks,
      events,
      journal,
      weekStart: start,
      timeZone,
      now: reviewNow,
    }),
    skills: insights.skillTree(tasks),
    deadEnds: staleItems(insights.deadEnds(tasks, now), insights.deadEnds(notes, now)),
    archive: staleItems(insights.archiveCandidates(tasks, now, { timeZone }), []),
  };
}

/** The last `count` local days, oldest first, each marked active, joker-covered or rest. */
export function streakStrip(
  activeDays: readonly string[],
  streak: insights.Streak,
  now: Timestamp,
  timeZone: TimeZone,
  count: number,
): StripDay[] {
  const active = new Set(activeDays);
  const jokers = new Set(streak.jokerDays);
  const out: StripDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const day = dayKey(addDays(now, -i, timeZone), timeZone);
    const state: StripState = active.has(day) ? 'active' : jokers.has(day) ? 'joker' : 'rest';
    out.push({ day, state, today: i === 0 });
  }
  return out;
}

function staleItems(
  tasks: readonly insights.StaleRecord<Task>[],
  notes: readonly insights.StaleRecord<Note>[],
): StaleItem[] {
  const items: StaleItem[] = [
    ...tasks.map((s) => toItem('tasks', s.record.id, s.record.title, s.idleDays)),
    ...notes.map((s) => toItem('notes', s.record.id, s.record.title, s.idleDays)),
  ];
  return items.sort((a, b) => b.idleDays - a.idleDays).slice(0, STALE_LIMIT);
}

function toItem(kind: StaleKind, id: string, title: string, idleDays: number): StaleItem {
  return { kind, id, title: title.trim(), idleDays };
}

/** Sequential bin of an energy value, matching the `--heat-0…4` tokens. */
export function heatLevel(value: number): 0 | 1 | 2 | 3 | 4 {
  if (!(value > 0.08)) return 0;
  if (value < 0.3) return 1;
  if (value < 0.55) return 2;
  if (value < 0.8) return 3;
  return 4;
}

/**
 * Side of a heatmap square as a share of the cell: confidence is encoded by size, so a
 * tentative estimate never looks as solid as a measured one. Area grows linearly with confidence.
 */
export function cellScale(confidence: number): number {
  const c = Math.min(1, Math.max(0, confidence));
  return 0.42 + 0.58 * Math.sqrt(c);
}

/** True when the heatmap, the balance and the review all have nothing to show yet. */
export function isEmpty(model: InsightsModel): boolean {
  return (
    model.energy.samples === 0 &&
    model.balance.total === 0 &&
    model.review.wins.length === 0 &&
    model.skills.tasks === 0 &&
    model.streak.best === 0
  );
}

export interface Message {
  key: MessageKey;
  vars: MessageVars;
}

/** Wording of an engine suggestion; numbers are formatted by the caller's locale. */
export function suggestionMessage(
  s: insights.Suggestion,
  percent: (ratio: number) => string,
): Message {
  switch (s.kind) {
    case 'pad-estimates':
      return { key: 'insights.weekly.suggestion.padEstimates', vars: { factor: percent(s.factor) } };
    case 'trim-estimates':
      return {
        key: 'insights.weekly.suggestion.trimEstimates',
        vars: { factor: percent(s.factor) },
      };
    case 'lighten-plan':
      return { key: 'insights.weekly.suggestion.lightenPlan', vars: { rate: percent(s.rate) } };
    case 'address-blocker':
      return {
        key: 'insights.weekly.suggestion.addressBlocker',
        vars: { terms: s.terms.join(', '), count: s.count },
      };
    case 'protect-creation':
      return {
        key: 'insights.weekly.suggestion.protectCreation',
        vars: { share: percent(s.share) },
      };
    case 'reschedule-slipped':
      return { key: 'insights.weekly.suggestion.rescheduleSlipped', vars: { count: s.count } };
  }
}

const intlTag = (locale: Locale) => (locale === 'fr' ? 'fr-FR' : 'en-US');

/** Weekday names indexed 0 = Sunday, as the engine indexes them. Labels only: no zone maths. */
export function weekdayNames(locale: Locale, style: 'short' | 'long'): string[] {
  const f = new Intl.DateTimeFormat(intlTag(locale), { weekday: style, timeZone: 'UTC' });
  // 2024-01-07 is a Sunday.
  return Array.from({ length: 7 }, (_, d) => f.format(Date.UTC(2024, 0, 7 + d)));
}

/** `9 h` / `9 AM` — the label of a local hour of the day. */
export function hourLabel(hour: number, locale: Locale): string {
  const f = new Intl.DateTimeFormat(intlTag(locale), { hour: 'numeric', timeZone: 'UTC' });
  return f.format(Date.UTC(2024, 0, 1, hour));
}

/** Display order of weekday rows: Monday first, Sunday last (ISO 8601). */
export const WEEK_ROWS: readonly number[] = [1, 2, 3, 4, 5, 6, 0];
