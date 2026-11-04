import type { Interval, Minutes, Priority, Timestamp, WorkMode } from '@pouxis/core';

/** What `pouxis add` understood from a sentence, before it becomes a record. */
export interface CaptureDraft {
  kind: 'task' | 'event';
  title: string;
  tags: string[];
  priority: Priority;
  /** `@paul` mentions: event attendees, or noted on a task (tasks have no attendee list). */
  attendees: string[];
  recurrence?: string;
  /** Event bounds. */
  start?: Timestamp;
  end?: Timestamp;
  location?: string;
  /** Task fields. */
  deadline?: Timestamp;
  floatingDay?: Timestamp;
  scheduled?: Interval;
  estimateMin?: Minutes;
  mode?: WorkMode;
}
