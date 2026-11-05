import type { onboarding as fr } from '../fr/onboarding.ts';

export const onboarding: typeof fr = {
  a11y: 'Introduction to POuxis',
  skip: 'Skip intro',
  progress: 'Step {current} of {total}',

  welcome: {
    title: 'Welcome to POuxis',
    body: 'One place for your time, tasks and ideas. Everything stays on your device.',
    language: 'Interface language',
    example: 'Call Lea tomorrow 3pm #personal',
    exampleCaption: 'Write it as it comes: dates, times and tags are picked up.',
    action: 'Get started',
  },

  hours: {
    title: 'Your working hours',
    body: 'POuxis fits your tasks into these hours and keeps the rest of the day free. You can change everything in Settings.',
    start: 'Start',
    end: 'End',
    days: 'Working days',
    summary: 'I work from {start} to {end}',
    invalid: 'The end time needs to come after the start time.',
    action: 'Next',
  },

  rhythm: {
    title: 'When are you at your sharpest?',
    body: 'A first estimate to place demanding work at the right time. Insights then refine it with your real days.',
    morning: 'Mostly mornings',
    morningHint: 'Ideas come early, energy dips in the evening.',
    intermediate: 'Somewhere in between',
    intermediateHint: 'No time clearly better than another.',
    evening: 'Mostly evenings',
    eveningHint: 'Slow start, at your best late in the day.',
    unsure: 'I don’t know yet',
    action: 'Next',
  },

  ready: {
    title: 'Two permissions, if you like',
    body: 'Nothing is required. You can grant them later, when they’re actually useful.',
  },

  permissions: {
    notifications: {
      title: 'A gentle signal at the right time',
      body: 'To let you know when a focus session ends or a task unlocks. Never nagging reminders.',
      allow: 'Allow notifications',
    },
    dnd: {
      title: 'Silence distractions during focus',
      body: 'POuxis can turn on Do Not Disturb during your sessions and turn it off right after.',
      allow: 'Allow',
    },
    microphone: {
      title: 'Dictate your ideas',
      body: 'To turn a few spoken sentences into tasks. Depending on the browser, speech recognition may go through its vendor’s service.',
      allow: 'Allow microphone',
    },
    notNow: 'Not now',
    granted: 'Allowed',
    unavailable: 'Not available on this device',
    denied: 'Permission denied. You can grant it later in your system settings.',
    openSystemSettings: 'Open system settings',
  },

  done: {
    title: 'You’re all set',
    body: 'Start with whatever’s on your mind right now.',
    action: 'Open my day',
  },
};
