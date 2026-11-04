import type { insights as fr } from '../fr/insights.ts';

export const insights: typeof fr = {
  title: 'Insights',

  period: {
    label: 'Period',
    week: 'This week',
    month: 'This month',
    quarter: 'This quarter',
    custom: 'Custom',
  },

  energy: {
    title: 'Your energy hours',
    hint: 'Based on tasks completed over the past few weeks.',
    peak: 'You usually get the most done {range}',
    legendLow: 'Less',
    legendHigh: 'More',
    cellA11y:
      '{day} at {hour}: {count, plural, =0 {no tasks done} one {# task done} other {# tasks done}}',
    useForPlanning: 'Schedule creative work in these hours',
    notEnough: 'A few more days of use and the map will take shape.',
  },

  balance: {
    title: 'Creating and organizing',
    hint: 'Time spent making things, compared with time spent keeping things running.',
    create: 'Creating · {percent}',
    organize: 'Organizing · {percent}',
    a11y: '{create} creating, {organize} organizing',
    goal: 'Your target balance: {percent} creating',
    setGoal: 'Set a target balance',
    noData: 'Not enough time logged yet.',
  },

  streak: {
    title: 'Creative streak',
    days: '{count, plural, =0 {No streak right now} one {# day} other {# days}}',
    best: 'Longest streak: {count, plural, one {# day} other {# days}}',
    jokers: '{count, plural, =0 {No jokers} one {# joker available} other {# jokers available}}',
    jokerHint:
      'A joker covers a rest day without breaking the streak. You earn one every {days} days.',
    jokerUsed: 'Joker used {when}: rest is part of the work.',
    restarted: 'New streak. What you did still counts.',
    paused: 'Streak paused',
    hide: 'Hide streaks',
  },

  weekly: {
    title: 'Weekly review',
    subtitle: 'Week of {date}',
    ready: 'Your weekly review is ready',
    wins: 'Wins this week',
    winsEmpty: 'Nothing checked off? A week of thinking or rest counts too.',
    blockers: 'Recurring blockers',
    blockersEmpty: 'No recurring blockers.',
    focusTime: '{duration} of focus',
    completed: '{count, plural, =0 {No tasks done} one {# task done} other {# tasks done}}',
    planned: 'Planned {planned} · actual {actual}',
    reflect: 'One thing to carry into next week?',
    reflectPlaceholder: 'Optional',
    close: 'Close the week',
  },

  deadEnds: {
    title: 'Dormant threads',
    count:
      '{count, plural, =0 {No dormant threads} one {# dormant thread} other {# dormant threads}}',
    open: 'Go through them',
  },

  skills: {
    title: 'Skill tree',
    hint: 'Branches grow with the projects you finish.',
    branch: '{name} · {count, plural, one {# project} other {# projects}}',
    rename: 'Rename branch',
    empty: 'Finish a first project to watch the first branch grow.',
  },

  privacy: 'Calculated on this device. Nothing leaves it.',

  empty: {
    title: 'Insights build up over time',
    body: 'Use POuxis for a few days: your patterns will show up here, calculated on your device.',
  },
};
