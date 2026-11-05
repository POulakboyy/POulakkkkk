import type { today as fr } from '../fr/today.ts';

export const today: typeof fr = {
  title: 'Today',

  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },

  summary: {
    a11y: 'Day summary',
    planned: '{count, plural, =0 {Nothing planned} one {# thing planned} other {# things planned}}',
    free: '{duration} free',
    focus: '{duration} of focus',
  },

  plan: {
    action: 'Plan my day',
    hint: 'Places your tasks in free slots, matched to your usual energy. Fixed appointments stay put.',
    done: 'Day planned',
    placed: '{count, plural, one {# task placed} other {# tasks placed}}',
    nothing: 'Everything is already in place.',
    unplaced:
      '{count, plural, one {# task found no slot today} other {# tasks found no slot today}}',
  },

  progress: {
    label: 'of the day',
    a11y: '{percent} of the working day elapsed',
    dayA11y: '{percent} of the day elapsed',
  },

  energy: {
    label: 'Estimated energy',
    hint: 'Based on your past focus sessions; a typical curve until there’s history.',
    hour: '{time} · {level} energy',
    low: 'low',
    medium: 'medium',
    high: 'high',
  },

  timeline: {
    label: 'Day timeline',
    now: 'Now',
    nowA11y: 'It’s {time}',
    jumpToNow: 'Back to now',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    allDay: 'All day',
    outsideHours: 'Outside your working hours',
    dayStart: 'Day starts · {time}',
    dayEnd: 'Day ends · {time}',
    freeSlot: 'Free · {duration}',
    freeSlotHint: 'Drag a task here, or tap to add one',
    addAt: 'Add at {time}',
    fixed: 'Fixed appointment',
    fixedHint: 'Stays put when the plan shifts',
    pinned: 'Pinned time',
    pinnedHint: 'Auto-scheduling leaves it alone',
    travel: 'Travel · {duration}',
    leaveAt: 'Leave at {time}',
    blockA11y: '{title}, from {start} to {end}',
    blockDone: 'Done',
    move: 'Move block',
    resize: 'Adjust duration',
    reroute: 'Rearrange the day',
    rerouteHint: 'Fits tasks into free slots without touching fixed appointments',
    rerouted: 'Day rearranged',
  },

  floating: {
    title: 'Floating tasks',
    hint: 'Planned for today, no set time: they slip into free slots.',
    count: '{count, plural, =0 {No floating tasks} one {# floating task} other {# floating tasks}}',
    expand: 'Show floating tasks',
    collapse: 'Hide floating tasks',
    place: 'Find a slot',
    placeAll: 'Place all',
    placed: 'Placed at {time}',
    placedMany: '{count, plural, one {# task placed} other {# tasks placed}}',
    noRoom: 'No free slot left today. It stays here, no pressure.',
    noRoomMany: 'The day is full. The rest stay here; you can pick them up tomorrow.',
    dragHint: 'Drag a task onto the timeline to give it a time.',
    empty: 'Nothing is waiting for a slot.',
  },

  focus: {
    a11y: 'Focus player',
    start: 'Start focus',
    startOn: 'Focus on “{title}”',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'End session',
    skipBreak: 'Skip break',
    extend: '{duration} more',
    expand: 'Expand player',
    collapse: 'Minimize player',
    focusing: 'Focus',
    onBreak: 'Break',
    paused: 'Paused',
    remaining: '{time} left',
    remainingA11y: '{duration} left',
    session: 'Session {current} of {total}',
    mode: 'Single focus',
    sound: 'Ambient sound',
    soundOff: 'None',
    dnd: 'Do Not Disturb',
    nextBreak: 'Up next: {duration} break',
    nextFocus: 'Up next: {duration} of focus',
    ready: 'Ready for the next session',
    pickTask: 'Pick a task to begin',
    dndOn: 'Notifications are silenced during the session',
    dndOff: 'Notifications stay on',
    dndUnavailable: 'Not available on this device: silence notifications manually.',
    sessionDone: 'Session complete · {duration} of focus',
    breakDone: 'Break’s over',
    breakIdeas: {
      look: 'Look into the distance for a few seconds.',
      stretch: 'Stand up and stretch.',
      water: 'Glass of water?',
      breathe: 'Three slow breaths.',
      walk: 'A few steps away from the screen.',
    },
    complete: 'Mark as done',
    noise: {
      white: 'White',
      pink: 'Pink',
      brown: 'Brown',
    },
    soundHint: 'Generated on your device, no files, no network.',
    timerA11y: '{state}, {duration} left',
  },

  unlocked: {
    title: '“{title}” can start',
    body: '“{blocker}” is done, so the next step is unlocked.',
    many: '{count, plural, one {# task unlocked} other {# tasks unlocked}}',
    view: 'View task',
    addToToday: 'Add to today',
  },

  overrun: {
    title: '“{title}” is running over',
    body: 'It’s {duration} past its slot. Shift what comes next?',
    propagate: 'Shift the rest',
    propagateBy: 'Shift by {duration}',
    extend: 'Extend by {duration}',
    wrapUp: 'Finish now',
    keep: 'Leave as is',
    fixedNote: 'Fixed appointments won’t move.',
    propagated: '{count, plural, one {# task shifted} other {# tasks shifted}} by {duration}',
    overflow:
      '{count, plural, one {# task no longer fits today} other {# tasks no longer fit today}}',
    overflowHint: 'They move to tomorrow’s floating tasks, unless you choose otherwise.',
    toTomorrow: 'Plan them for tomorrow',
    choose: 'Choose for each',
    preview: 'Dotted outlines show the new times for what follows.',
  },

  buffers: {
    label: 'Breather',
    a11y: '{duration} breather',
    hint: 'Time to breathe between two meetings',
    remove: 'Remove this breather',
    suggested: 'Suggested breather',
    add: 'Add breathers',
    removed: 'Breather removed',
    added:
      '{count, plural, one {# breather added} other {# breathers added}} between your meetings',
  },

  /** WIP limiter (2.15): high-priority tasks planned today vs. the limit. */
  wip: {
    label: '{count} of {limit} priorities',
    a11y: '{count} high-priority tasks planned today, against a limit of {limit}',
    exceeded: 'More than {limit} priorities today: working memory only holds a few items at once.',
  },

  /** Task decay (2.3): postponed tasks fade. Never guilt-tripping. */
  decay: {
    aging: 'Postponed a few times',
    stale: 'Still useful?',
  },

  maker: {
    title: 'This meeting splits a maker block',
    body: 'You’d have {before} before and {after} after. Deep work needs long, uninterrupted stretches.',
    suggest: 'Suggest another time',
    suggestion: '{time} would work without splitting the block',
    keep: 'Keep this time',
    move: 'Move to {time}',
    noSuggestion: 'No other free time keeps the block intact today or tomorrow.',
    protected: 'Protected maker block',
    protectedA11y: 'Protected maker block from {start} to {end}',
  },

  carryOver: {
    title:
      '{count, plural, one {A task from yesterday is still waiting} other {# tasks from yesterday are still waiting}}',
    body: 'Days don’t always go as planned. What would you like to do with them?',
    toToday: 'Plan them for today',
    toInbox: 'Send them back to sort',
    oneByOne: 'Choose one by one',
    done: 'All sorted.',
  },

  allDone: {
    title: 'All done',
    body: 'The rest of the day is yours.',
    action: 'Look back on the day',
  },

  wrapUp: {
    title: 'End of day',
    completed:
      '{count, plural, =0 {Nothing checked off today: thinking and resting count too.} one {# task done today.} other {# tasks done today.}}',
    leftover: 'What’s left can wait until tomorrow.',
    planTomorrow: 'Plan tomorrow',
    close: 'Close the day',
  },

  dayOff: {
    title: 'Day off',
    body: 'No working hours today. Notifications stay quiet.',
  },

  empty: {
    title: 'An open day',
    body: 'Nothing planned yet. Add a task, or keep the space: that’s a choice too.',
    action: 'Add a task',
    secondary: 'Open inbox',
  },
};
