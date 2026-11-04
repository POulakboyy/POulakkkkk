import type { onboarding as fr } from '../fr/onboarding.ts';

export const onboarding: typeof fr = {
  skip: 'Skip intro',
  progress: 'Step {current} of {total}',

  welcome: {
    title: 'Welcome to POuxis',
    body: 'One place for your time, tasks and ideas. Everything stays on your device.',
    action: 'Get started',
  },

  capture: {
    title: 'Capture without thinking',
    body: 'A task, an idea, an appointment: write it as it comes. POuxis picks up the date, time and tags.',
    example: 'Call Lea tomorrow 3pm #personal',
    action: 'Next',
  },

  day: {
    title: 'A day that adapts',
    body: 'Your tasks fit into free slots. If something runs over, the rest shifts, and your fixed appointments stay put.',
    action: 'Next',
  },

  setup: {
    title: 'Your hours, your pace',
    body: 'Tell us when you work. You can change everything later in Settings.',
    hours: 'I work from {start} to {end}',
    language: 'Language',
    theme: 'Theme',
    action: 'Let’s go',
  },

  permissions: {
    notifications: {
      title: 'A gentle signal at the right time?',
      body: 'To let you know when a focus session ends or a task unlocks. Never nagging reminders.',
      allow: 'Allow notifications',
    },
    dnd: {
      title: 'Silence distractions during focus',
      body: 'POuxis can turn on Do Not Disturb during your sessions and turn it off right after.',
      allow: 'Allow',
    },
    location: {
      title: 'Reminders in the right place',
      body: 'To remind you of your shopping list when you reach the store. Your location stays on the device.',
      allow: 'Allow location',
    },
    microphone: {
      title: 'Dictate your ideas',
      body: 'To turn a voice memo into a task. Audio is processed on this device.',
      allow: 'Allow microphone',
    },
    notNow: 'Not now',
    denied: 'Permission denied. You can grant it later in your system settings.',
    openSystemSettings: 'Open system settings',
  },

  done: {
    title: 'You’re all set',
    body: 'Start with whatever’s on your mind right now.',
    action: 'Open my day',
  },
};
