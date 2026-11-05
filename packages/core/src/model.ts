/**
 * Shared domain model of POuxis.
 *
 * This file is the contract between every module of the engine, the sync layer and the
 * apps. Conventions:
 * - every instant is a `Timestamp` (epoch milliseconds, UTC); wall-clock maths always goes
 *   through `time.ts` with an explicit IANA time zone;
 * - every durable record has `id`, `createdAt`, `updatedAt` so the CRDT layer can store it;
 * - optional fields are omitted rather than set to `undefined` when absent.
 */

export type Id = string;
/** Epoch milliseconds, UTC. */
export type Timestamp = number;
/** A duration in minutes. */
export type Minutes = number;
/** IANA time zone name, e.g. `Europe/Paris`. */
export type TimeZone = string;
export type Locale = 'fr' | 'en';

export interface Interval {
  start: Timestamp;
  end: Timestamp;
}

export interface Record_ {
  id: Id;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ------------------------------------------------------------------------------------------ */
/* Tasks                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/** 0 = none, 1 = low, 2 = medium, 3 = high. */
export type Priority = 0 | 1 | 2 | 3;
export type TaskStatus = 'inbox' | 'todo' | 'doing' | 'done' | 'archived';
/**
 * What kind of work a task is. Drives the creation/organisation balance (7.2) and the
 * colour mode of the UI (blue for creative work, warm for execution — Mehta & Zhu, 2009).
 */
export type WorkMode = 'create' | 'organize';
export type Energy = 'low' | 'medium' | 'high';

export interface TimeLog {
  start: Timestamp;
  end: Timestamp;
  kind: 'focus' | 'break';
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoTrigger extends GeoPoint {
  radiusM: number;
  label?: string;
}

export interface Task extends Record_ {
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  projectId?: Id;
  /** Parent task when this is a subtask. */
  parentId?: Id;
  /** Ids of tasks that must be done before this one becomes actionable (2.1). */
  dependsOn: Id[];
  estimateMin?: Minutes;
  deadline?: Timestamp;
  /** Start of the day (in the user's zone) a floating task is attached to, without a time (1.10). */
  floatingDay?: Timestamp;
  /** Slot placed by the router or by the user. */
  scheduled?: Interval;
  /** The user fixed the slot by hand: automatic routing must not move it. */
  pinned?: boolean;
  mode: WorkMode;
  energy?: Energy;
  /** Explicit importance flag; the Eisenhower matrix also infers it from tags/priority (2.4). */
  important?: boolean;
  /** How many times the task was postponed — drives task decay (2.3). */
  postponedCount: number;
  /** Source text of a recurrence rule, parsed by `recurrence/` (2.9). */
  recurrence?: string;
  geo?: GeoTrigger;
  /** User-programmable fields; formulas are evaluated by `tasks/formula` (2.8). */
  fields?: { [key: string]: number | string | boolean };
  timeLogs: TimeLog[];
  completedAt?: Timestamp;
  /** Emoji or short icon name shown on timeline blocks. */
  icon?: string;
  /** Index into the category palette (`--cat-1`…`--cat-8`). */
  color?: number;
}

/* ------------------------------------------------------------------------------------------ */
/* Calendar                                                                                    */
/* ------------------------------------------------------------------------------------------ */

export type EventKind = 'meeting' | 'focus' | 'personal' | 'travel' | 'buffer';

export interface CalendarEvent extends Record_ {
  title: string;
  start: Timestamp;
  end: Timestamp;
  /** Zone the event was created in (multi-zone alignment, 1.5). */
  timeZone: TimeZone;
  /** A fixed appointment: delay propagation never moves it (1.2). */
  fixed: boolean;
  kind: EventKind;
  attendees: string[];
  location?: string;
  geo?: GeoPoint;
  recurrence?: string;
  /** Linked task when the event is a time block for a task. */
  taskId?: Id;
  tags: string[];
  notes?: string;
  icon?: string;
  color?: number;
}

/* ------------------------------------------------------------------------------------------ */
/* Notes, journal, ideas                                                                       */
/* ------------------------------------------------------------------------------------------ */

export interface Note extends Record_ {
  title: string;
  /** Markdown body. */
  body: string;
  tags: string[];
  /** Ids of any record this note links to (backlinks are computed, 3.14). */
  links: Id[];
  /** Sandbox notes are excluded from universal search and purged at session end (5.8). */
  sandbox?: boolean;
  /** Set when the note lives inside an encrypted vault (3.5); `body` is then ciphertext. */
  vaultId?: Id;
}

export type JournalKind = 'friction' | 'win' | 'dump';

export interface JournalEntry extends Record_ {
  kind: JournalKind;
  text: string;
  tags: string[];
}

/* ------------------------------------------------------------------------------------------ */
/* Graphs / canvas                                                                             */
/* ------------------------------------------------------------------------------------------ */

export type GraphNodeKind = 'idea' | 'task' | 'note' | 'event' | 'group';

export interface GraphNode {
  id: Id;
  label: string;
  kind: GraphNodeKind;
  x: number;
  y: number;
  /** Record this node mirrors (task, note, event). */
  refId?: Id;
  parentId?: Id;
  collapsed?: boolean;
  color?: number;
  /** Due date when the canvas is used as a timeline (4.5). */
  due?: Timestamp;
}

export type EdgeCondition = 'always' | 'on-complete';

export interface GraphEdge {
  id: Id;
  from: Id;
  to: Id;
  label?: string;
  /** `on-complete`: the target unlocks only once the source is done (4.7). */
  condition?: EdgeCondition;
}

export interface Graph extends Record_ {
  title: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ------------------------------------------------------------------------------------------ */
/* Preferences                                                                                 */
/* ------------------------------------------------------------------------------------------ */

export interface WorkingHours {
  /** Minutes from local midnight. */
  start: Minutes;
  end: Minutes;
  /** Working weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
}

export interface UserPrefs {
  timeZone: TimeZone;
  locale: Locale;
  workingHours: WorkingHours;
  /** Transition buffer inserted between back-to-back meetings (1.6). */
  bufferMin: Minutes;
  /** Length of the deep-work block the maker-schedule guard protects (1.15). */
  makerBlockMin: Minutes;
  /** Max number of high-priority tasks per day (2.15). */
  wipLimit: number;
  /** Postponements before a task starts to decay visually (2.3). */
  decayThreshold: number;
}

export const DEFAULT_PREFS: UserPrefs = {
  timeZone: 'Europe/Paris',
  locale: 'fr',
  workingHours: { start: 9 * 60, end: 18 * 60, days: [1, 2, 3, 4, 5] },
  bufferMin: 10,
  makerBlockMin: 240,
  wipLimit: 5,
  decayThreshold: 3,
};

/* ------------------------------------------------------------------------------------------ */
/* Store collections                                                                           */
/* ------------------------------------------------------------------------------------------ */

/** Every synchronised collection and the record type it holds. */
export interface Collections {
  tasks: Task;
  events: CalendarEvent;
  notes: Note;
  journal: JournalEntry;
  graphs: Graph;
}

export type CollectionName = keyof Collections;

export const COLLECTIONS: readonly CollectionName[] = [
  'tasks',
  'events',
  'notes',
  'journal',
  'graphs',
];
