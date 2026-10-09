/** Public types of the scheduling engine ("Moteur temporel"). */
import type {
  CalendarEvent,
  EventKind,
  Id,
  Interval,
  Minutes,
  Record_,
  Task,
  TaskStatus,
  TimeZone,
  Timestamp,
  UserPrefs,
} from '../model.ts';

/** 24 values in 0..1; index = local hour of the day (0 = midnight). */
export type EnergyProfile = readonly number[];

/* ------------------------------------------------------------------------------------------ */
/* Routing (1.1) and floating tasks (1.10)                                                     */
/* ------------------------------------------------------------------------------------------ */

export interface RouteOptions {
  /** Duration of tasks without `estimateMin` (default 30). */
  defaultEstimateMin?: Minutes;
  /** Slot starts snap to this grid (default 5, clamped to 1–60). */
  granularityMin?: Minutes;
  /** Split a task into chunks when it does not fit whole (or would miss its deadline). */
  split?: boolean;
  /** Minimum chunk length when splitting; never below 25 (default 25). */
  minChunkMin?: Minutes;
  /** Cap on focused work per local day: scheduled tasks plus `focus` events (e.g. 360). */
  dailyCapMin?: Minutes;
  /**
   * Opt-in: send insight-type creative work (`mode: 'create'` without `energy: 'high'`) to
   * off-peak hours, where insight problem solving was found to benefit from reduced
   * inhibitory control (Wieth & Zacks, 2011, Thinking & Reasoning). Needs an energy profile.
   */
  insightOffPeak?: boolean;
  /** Release non-pinned tasks already scheduled in the future and plan them again. */
  replan?: boolean;
}

export interface RouteInput {
  tasks: readonly Task[];
  events: readonly CalendarEvent[];
  prefs: UserPrefs;
  /** Planning horizon. Nothing is placed outside it, nor before `now`. */
  range: Interval;
  now: Timestamp;
  energyProfile?: EnergyProfile;
  options?: RouteOptions;
}

/**
 * Why a slot was chosen:
 * - `earliest`: first free slot (no energy preference applies);
 * - `energy`: best energy match on the earliest day the task fits;
 * - `insight-off-peak`: lowest-energy slot, see `RouteOptions.insightOffPeak`;
 * - `deadline`: earliest possible slot because the deadline is at risk;
 * - `split`: one chunk of a task split across several slots.
 */
export type PlacementReason = 'earliest' | 'energy' | 'insight-off-peak' | 'deadline' | 'split';

export interface Placement {
  taskId: Id;
  start: Timestamp;
  end: Timestamp;
  reason: PlacementReason;
  /** Set on split tasks: 0-based chunk index and number of chunks. */
  chunk?: { index: number; count: number };
}

/**
 * - `blocked`: a dependency is not done;
 * - `too-long`: longer than any working window and splitting is off;
 * - `over-capacity`: a slot exists but the daily cap forbids it;
 * - `no-slot`: no free slot is large enough within the range.
 */
export type UnplacedReason = 'blocked' | 'too-long' | 'over-capacity' | 'no-slot';

export interface Unplaced {
  taskId: Id;
  reason: UnplacedReason;
}

export type RouteWarning =
  /** The placement ends after the task deadline. */
  | { kind: 'deadline-missed'; taskId: Id; deadline: Timestamp; end: Timestamp }
  /** Existing commitments of a day already exceed `dailyCapMin`. */
  | { kind: 'overload'; day: string; loadMin: Minutes; capMin: Minutes }
  /** The energy profile is not 24 finite numbers; it was ignored. */
  | { kind: 'invalid-energy-profile' }
  /** `prefs.workingHours` has no working day or an empty span. */
  | { kind: 'no-working-hours' };

export interface RouteResult {
  /** Chronological. */
  placements: Placement[];
  unplaced: Unplaced[];
  warnings: RouteWarning[];
}

export interface MagnetizeInput {
  /** Any instant of the target local day (in `prefs.timeZone`). */
  day: Timestamp;
  tasks: readonly Task[];
  events: readonly CalendarEvent[];
  prefs: UserPrefs;
  /** Gaps before this instant are not used. */
  now?: Timestamp;
  energyProfile?: EnergyProfile;
  options?: Omit<RouteOptions, 'replan'>;
}

export interface MagnetizeResult {
  /** Chronological suggested slots; nothing existing is moved. */
  suggestions: Placement[];
  unplaced: Unplaced[];
  warnings: RouteWarning[];
}

/* ------------------------------------------------------------------------------------------ */
/* Delay propagation (1.2)                                                                     */
/* ------------------------------------------------------------------------------------------ */

export type ItemKind = 'task' | 'event';

export interface PropagateInput {
  /** Tasks with a `scheduled` slot and events of the day. */
  items: readonly (Task | CalendarEvent)[];
  /** Item that runs over. */
  overrunId: Id;
  /** Its new end. */
  newEnd: Timestamp;
  prefs: UserPrefs;
  timeZone: TimeZone;
  /**
   * `shift` (default): every later movable item slides by the overrun, keeping its gaps.
   * `push`: free time absorbs the delay; items move only as far as needed.
   */
  mode?: 'shift' | 'push';
}

export interface Move {
  id: Id;
  kind: ItemKind;
  start: Timestamp;
  end: Timestamp;
}

export interface PropagateResult {
  /** New slots, chronological; includes the overrunning item itself when its end changed. */
  moves: Move[];
  /** Moved items now ending after the working hours of the day. */
  overflow: Id[];
  /** Fixed items the overrun itself now overlaps (they never move). */
  conflicts: Id[];
}

/* ------------------------------------------------------------------------------------------ */
/* Buffers (1.6)                                                                               */
/* ------------------------------------------------------------------------------------------ */

/** A calendar event without its record fields; the store assigns `id` and timestamps. */
export type EventDraft = Omit<CalendarEvent, keyof Record_>;

export interface BufferOptions {
  /** Event kinds that need a transition after them (default `['meeting']`). */
  kinds?: readonly EventKind[];
}

/* ------------------------------------------------------------------------------------------ */
/* Maker schedule guard (1.15)                                                                 */
/* ------------------------------------------------------------------------------------------ */

export interface MakerCheckInput {
  events: readonly CalendarEvent[];
  /** The meeting to add. With `id`, the event of that id is ignored (moving a meeting). */
  candidate: Interval & { id?: Id };
  prefs: UserPrefs;
  timeZone: TimeZone;
}

/**
 * - `ok`: the day keeps a maker block, or the candidate does not touch one;
 * - `fragments-maker-block`: the candidate breaks a free block of `makerBlockMin` or more
 *   into pieces that are all shorter;
 * - `no-maker-block`: the day had no free block of `makerBlockMin` to protect.
 */
export type MakerCode = 'ok' | 'fragments-maker-block' | 'no-maker-block';

export interface MakerCheck {
  ok: boolean;
  code: MakerCode;
  /** The free block the candidate breaks up. */
  fragmented?: Interval;
  largestBlockBefore: Minutes;
  largestBlockAfter: Minutes;
  /** Short sentence in `prefs.locale`. */
  message: string;
}

export interface FocusBlockInput {
  events: readonly CalendarEvent[];
  /** Any instant of the local day. */
  day: Timestamp;
  prefs: UserPrefs;
  timeZone: TimeZone;
}

export interface AlternativesInput extends MakerCheckInput {
  /** Slots before this instant are not suggested. */
  now?: Timestamp;
  /** Max number of suggestions (default 3). */
  limit?: number;
  /** Grid of candidate starts (default 15 min). */
  stepMin?: Minutes;
  /** Days searched before and after the candidate's day (default 1). */
  searchDays?: number;
}

/* ------------------------------------------------------------------------------------------ */
/* Snapshots (1.9)                                                                             */
/* ------------------------------------------------------------------------------------------ */

export interface SnapshotEntry {
  id: Id;
  kind: ItemKind;
  title: string;
  start: Timestamp;
  end: Timestamp;
  /** Events only. */
  fixed?: boolean;
  /** Tasks only. */
  status?: TaskStatus;
  estimateMin?: Minutes;
  /** Focus time logged on the task when the snapshot was taken. */
  loggedMin?: Minutes;
  completedAt?: Timestamp;
}

/** A frozen, JSON-serialisable version of the calendar. */
export interface PlanSnapshot {
  takenAt: Timestamp;
  /** Sorted by start, then id. */
  entries: SnapshotEntry[];
}

export interface SnapshotMove {
  id: Id;
  kind: ItemKind;
  /** Positive when the item moved later. */
  deltaStartMin: Minutes;
  deltaDurationMin: Minutes;
}

export type SlipReason = 'completed-late' | 'not-done' | 'dropped';

export interface Slip {
  id: Id;
  reason: SlipReason;
  /** `completed-late` only: minutes between the planned end and completion. */
  delayMin?: Minutes;
}

export interface PlanningAccuracy {
  estimatedMin: Minutes;
  loggedMin: Minutes;
  /** Completed tasks with both an estimate and logged focus time. */
  sampleSize: number;
  /**
   * `estimatedMin / loggedMin`: 1 is a perfect estimate, below 1 means work took longer than
   * planned (the planning fallacy — Buehler, Griffin & Ross, 1994). Absent without samples.
   */
  ratio?: number;
}

export interface SnapshotDiff {
  added: Id[];
  removed: Id[];
  moved: SnapshotMove[];
  /** Planned tasks completed by the end of their planned slot. */
  completedOnTime: Id[];
  /** Planned tasks whose slot is over and that were not completed on time. */
  slipped: Slip[];
  accuracy: PlanningAccuracy;
}

/* ------------------------------------------------------------------------------------------ */
/* Time progress (1.14)                                                                        */
/* ------------------------------------------------------------------------------------------ */

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year' | Interval;

export interface ProgressOptions {
  /** First day of the week, 0 = Sunday … 6 = Saturday (default 1, Monday). */
  weekStartsOn?: number;
}
