import type { calendar as fr } from '../fr/calendar.ts';

export const calendar: typeof fr = {
  title: 'Calendar',

  views: {
    label: 'View',
    day: 'Day',
    week: 'Week',
    spiral: 'Spiral',
    spiralHint: 'Time as one continuous line, no week or month breaks.',
  },

  nav: {
    today: 'Today',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    goTo: 'Go to date',
    weekNumber: 'Week {number}',
    rangeA11y: '{start} to {end}',
  },

  spiral: {
    label: 'Time spiral',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    turn: 'One turn = {span, select, week {one week} month {one month} other {one year}}',
    centerOnNow: 'Center on now',
    a11y: 'Spiral view. Use the arrow keys to move forward or back in time.',
  },

  event: {
    new: 'New event',
    titlePlaceholder: 'Event title',
    quickPlaceholder: 'E.g. Project X meeting next Tuesday 2-4pm with @paul',
    quickHint: 'Write naturally: date, time, duration and people are recognized.',
    parsed: 'Got it: {summary}',
    parsedNothing: 'No date recognized: the event will be created for today.',
    kind: 'Type',
    allDay: 'All day',
    starts: 'Starts',
    ends: 'Ends',
    timeZone: 'Time zone',
    location: 'Location',
    attendees: 'People',
    addAttendee: 'Add person',
    fixed: 'Fixed appointment',
    fixedHint: 'Never moves when the day is rearranged.',
    notes: 'Notes',
    a11y: '{title}, {range}',
    a11yAllDay: '{title}, all day',
    edit: 'Edit event',
    delete: 'Delete event',
    duplicate: 'Duplicate event',
    endBeforeStart: 'The end needs to come after the start.',
  },

  travel: {
    label: 'Travel',
    estimate: '{duration} travel',
    leaveAt: 'Leave at {time}',
    add: 'Add travel time',
    unavailable: 'Travel estimate unavailable right now.',
  },

  progress: {
    label: 'Progress',
    year: '{percent} of the year',
    quarter: '{percent} of the quarter',
    sprint: '{percent} of the sprint',
    month: '{percent} of the month',
    choose: 'Show progress through',
    hide: 'Hide progress',
  },

  zones: {
    title: 'Time zones',
    add: 'Add time zone',
    remove: 'Remove this time zone',
    search: 'City or time zone',
    local: 'Your time zone',
    offset: '{offset} from you',
    sameTime: 'Same time as you',
    overlap: 'Shared window: {range}',
    noOverlap: 'No shared window within working hours.',
    nightThere: 'It’s night for {name}',
  },

  snapshot: {
    title: 'Planned vs actual',
    take: 'Save a snapshot of the plan',
    taken: 'Plan snapshot saved',
    auto: 'A snapshot is saved automatically every Monday morning.',
    compare: 'Compare with the planned week',
    planned: 'Planned',
    actual: 'Actual',
    added: 'Added along the way',
    moved: 'Moved',
    dropped: 'Removed',
    summary:
      '{kept, plural, one {# block kept} other {# blocks kept}} · {moved, plural, one {# moved} other {# moved}}',
    note: 'A plan helps you decide; it isn’t a contract.',
    empty: 'No snapshot for this week yet.',
  },

  deepLink: {
    copy: 'Copy slot link',
    copied: 'Slot link copied',
    copiedHint: 'Paste it into a note or onto the canvas to come back to it.',
    openFailed: 'This slot no longer exists. It may have been deleted.',
  },

  conflict: {
    title: 'Overlap',
    body: '“{title}” overlaps “{other}”.',
    keepBoth: 'Keep both',
    move: 'Move',
  },

  toast: {
    created: 'Event added {when}',
    moved: 'Moved to {time}',
    deleted: 'Event deleted',
    resized: 'Duration adjusted · {duration}',
  },

  empty: {
    day: {
      title: 'A free day',
      body: 'No events. Drag in a task or type “lunch tomorrow 12:30”.',
      action: 'Add event',
    },
    week: {
      title: 'A clear week',
      body: 'Nothing planned this week. A good moment to protect some maker time.',
      action: 'Add event',
    },
  },
};
