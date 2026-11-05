import type { insights as fr } from '../fr/insights.ts';

export const insights: typeof fr = {
  title: 'Insights',
  subtitle: 'Your patterns, calculated from what you do — no judgment.',
  privacy: 'Calculated on this device. Nothing leaves it.',
  showTable: 'Show as table',

  week: {
    label: 'Week shown',
    previous: 'Previous week',
    next: 'Next week',
    current: 'This week',
  },

  energy: {
    title: 'Your energy hours',
    hint: 'Based on your focus sessions and completed tasks over the past 4 weeks.',
    peak: 'You usually get the most done on {day} around {hour}',
    legendLow: 'Less',
    legendHigh: 'More',
    legendConfidence: 'Full square: reliable estimate. Small square: not much data yet.',
    a11ySummary:
      'Energy heatmap, 7 days by 24 hours. {peak}. Use the arrow keys to move between slots.',
    cell: '{day} {hour} · energy {value} · {confidence}',
    confident: 'reliable estimate',
    tentative: 'not much data yet',
    readoutHint: 'Hover or move through the map to read a slot.',
    hourColumn: 'Hour',
    roledescription: 'heatmap',
    notEnough: 'A few more days of use and the map will sharpen.',
    priorNote:
      'Until your data comes in, the map starts from an average daily profile and adjusts with every session.',
  },

  balance: {
    title: 'Creating and organizing',
    hint: 'Time spent making things, compared with time spent keeping things running.',
    create: 'Creating',
    organize: 'Organizing',
    meetings: 'Meetings',
    share: '{label} · {percent}',
    a11y: '{create} creating, {organize} organizing, {meetings} in meetings',
    total: '{duration} tracked over the week',
    creationShare: 'of tracked time spent creating',
    daysLabel: 'Day-by-day breakdown',
    readoutHint: 'Hover or move through a column to read that day.',
    dayColumn: 'Day',
    day: '{day}: {summary}',
    totalColumn: 'Total',
    noData: 'No time tracked this week yet. Start a focus session to begin.',
  },

  streak: {
    title: 'Creative streak',
    days: '{count, plural, =0 {No streak right now} one {# day} other {# days}}',
    best: 'Longest streak: {count, plural, one {# day} other {# days}}',
    jokers: '{count, plural, =0 {No jokers saved} one {# joker saved} other {# jokers saved}}',
    jokerHint:
      'A joker covers a rest day without breaking the streak. You get {count, plural, one {one} other {#}} every week.',
    status: {
      active: 'Streak running',
      protected: 'Yesterday was a rest day, covered by a joker.',
      paused: 'Streak paused: it picks up again on your next creative day.',
      none: 'One creative day is all it takes to start a streak.',
    },
    restarted: 'New streak. What you did still counts.',
    calendar: 'The last {count} days',
    dayActive: '{date}: creative day',
    dayJoker: '{date}: rest covered by a joker',
    dayRest: '{date}: rest',
    dayToday: '{date}: today',
    legendActive: 'Creating',
    legendJoker: 'Joker',
    legendRest: 'Rest',
    today: 'today',
  },

  weekly: {
    title: 'Weekly review',
    subtitle: 'Week of {date}',
    ready: 'Your weekly review is ready',
    wins: 'Wins this week',
    winsEmpty: 'Nothing checked off? A week of thinking or rest counts too.',
    biggestWin: 'The standout',
    blockers: 'Recurring blockers',
    blockersEmpty: 'No recurring blockers.',
    blockerCount: '{count, plural, one {# mention} other {# mentions}}, {week} this week',
    focusTime: 'Focus',
    completed: 'Done',
    creationShare: 'Creating',
    planning: 'Planning accuracy',
    planningEstimates:
      'Durations: median at {ratio} of the estimate, {within} of tasks within ±25%',
    planningScheduled: 'Slots: {done} of {planned} planned tasks done',
    planningEmpty: 'Not enough estimates yet to measure planning accuracy.',
    slipped: '{count, plural, one {# task to reschedule} other {# tasks to reschedule}}',
    suggestions: 'Ideas for next week',
    suggestion: {
      padEstimates:
        'Your tasks usually take {factor} of the planned time: try widening your estimates by as much.',
      trimEstimates: 'You often finish sooner than planned: estimates at {factor} would do.',
      lightenPlan: '{rate} of planned slots got done: a slightly lighter plan would leave room.',
      addressBlocker: '“{terms}” came up {count} times: a dedicated moment could clear it.',
      protectCreation: 'Creating was {share} of tracked time: blocking out maker time could help.',
      rescheduleSlipped:
        '{count, plural, one {One task is waiting} other {# tasks are waiting}} for a new slot.',
    },
    share: 'Share as image',
    shareTitle: 'My weekly review',
    shared: 'Image ready',
    sharedBody: 'Your weekly review was saved as an image.',
    shareFailed: 'The image couldn’t be created. Try again in a moment.',
    imageFooter: 'POuxis · calculated on device',
  },

  skills: {
    title: 'Skill tree',
    hint: 'Each branch grows with the tasks you finish, based on their tags.',
    node: '{name} · level {level} · {count, plural, one {# task} other {# tasks}}',
    a11y: 'Skill tree: {count, plural, one {# branch} other {# branches}}. {top}',
    top: 'Main branch: {name}.',
    empty: 'Finish a tagged task (for example “design/type”) to watch the first branch grow.',
    level: 'lvl {level}',
    skillColumn: 'Skill',
    levelColumn: 'Level',
    tasksColumn: 'Tasks',
  },

  deadEnds: {
    title: 'Dormant threads',
    hint: 'Ideas and tasks left as they were since you created them.',
    count:
      '{count, plural, =0 {No dormant threads} one {# dormant thread} other {# dormant threads}}',
    idle: 'Untouched for {count, plural, one {# day} other {# days}}',
    keep: 'Keep',
    keepLabel: 'Keep: {title}',
    kept: 'Thread kept',
    empty: 'No dormant threads: every idea has been picked up at least once.',
  },

  archive: {
    title: 'Archive?',
    hint: 'No activity for over two years. Nothing is archived without your say-so.',
    idle: 'No activity for {count, plural, one {# day} other {# days}}',
    archive: 'Archive',
    archiveLabel: 'Archive: {title}',
    archived: 'Task archived',
    keep: 'Keep',
    keepLabel: 'Keep: {title}',
    kept: 'Kept as is',
    empty: 'Nothing to archive right now.',
  },

  kind: {
    task: 'Task',
    note: 'Note',
  },

  untitled: 'Untitled',

  empty: {
    title: 'Insights build up over time',
    body: 'Use POuxis for a few days: your patterns will show up here, calculated on your device.',
  },
};
