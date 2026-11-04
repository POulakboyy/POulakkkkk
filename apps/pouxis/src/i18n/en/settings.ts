import type { settings as fr } from '../fr/settings.ts';

export const settings: typeof fr = {
  title: 'Settings',
  search: 'Search settings',
  reset: 'Restore defaults',
  resetDone: 'Defaults restored',

  sections: {
    appearance: 'Appearance',
    work: 'Work',
    focus: 'Focus',
    language: 'Language & region',
    keyboard: 'Keyboard',
    sync: 'Sync & devices',
    privacy: 'Privacy',
    data: 'Data',
    about: 'About',
  },

  appearance: {
    theme: {
      label: 'Theme',
      light: 'Light',
      dark: 'Dark',
      auto: 'Match system',
      daylight: 'Follow the sun',
      daylightHint: 'Gradually darkens in the evening, following sunrise and sunset.',
      eink: 'E-ink',
      einkHint: 'Pure black and white, maximum contrast, no animation: made for e-readers.',
    },
    zen: {
      label: 'Zen interface',
      hint: 'Toolbars and menus fade after 3 seconds without movement, and return at the slightest gesture.',
    },
    reducedMotion: {
      label: 'Reduce motion',
      hint: 'Follows your system setting by default.',
      system: 'Match system',
    },
    haptics: {
      label: 'Haptic feedback',
      hint: 'Gentle vibrations when you complete a task or link two nodes.',
    },
    textSize: 'Text size',
  },

  work: {
    hours: {
      label: 'Working hours',
      hint: 'Auto-scheduling and notifications respect these hours.',
      start: 'Start',
      end: 'End',
      days: 'Working days',
      summary: '{start} – {end}, {days}',
    },
    modes: {
      label: 'Kinds of work',
      hint: 'Creating to make things, organizing to keep them running. Feeds your balance insights.',
      defaultMode: 'Default kind for new tasks',
    },
    buffers: {
      label: 'Breathers between meetings',
      hint: 'Free time inserted between back-to-back meetings.',
      off: 'No breathers',
    },
    maker: {
      label: 'Protect maker time',
      hint: 'Lets you know when a meeting would split a deep-work block.',
      length: 'Minimum block length',
    },
    wip: {
      label: 'Priorities per day',
      hint: 'Beyond this, POuxis suggests swapping instead of piling on.',
      value: '{count, plural, one {# priority} other {# priorities}}',
    },
    decay: {
      label: 'Flag tasks that keep slipping',
      hint: 'A task changes appearance after this many postponements, as a nudge to decide.',
      value: '{count, plural, one {After # postponement} other {After # postponements}}',
    },
  },

  focus: {
    pomodoro: 'Focus length',
    shortBreak: 'Short break',
    longBreak: 'Long break',
    longBreakEvery: 'Long break every {count} sessions',
    dnd: {
      label: 'Do Not Disturb during focus',
      hint: 'Turns on your device’s Do Not Disturb for the length of a session.',
    },
    sound: 'End-of-session sound',
  },

  language: {
    label: 'Language',
    fr: 'Français',
    en: 'English',
    timeZone: 'Time zone',
    timeZoneAuto: 'Detect automatically',
    weekStart: 'First day of the week',
    changed: 'Language changed',
  },

  keyboard: {
    title: 'Keyboard shortcuts',
    hint: 'Change any shortcut here, or in the JSON config file.',
    capture: 'Universal capture',
    record: 'Press the new key combination…',
    conflict: 'Already used by “{action}”.',
    replace: 'Replace',
    vim: 'Vim mode',
    vimHint: 'h j k l navigation, plus normal and insert modes in editors.',
    openFile: 'Open config file',
    invalidFile:
      'The config file has an error on line {line}: {reason}. Your previous shortcuts are still active.',
    resetAll: 'Restore all shortcuts',
  },

  sync: {
    title: 'Sync',
    localOnly: 'This device only',
    localOnlyHint: 'Your data stays here. You can turn on sync at any time.',
    enable: 'Turn on sync',
    server: 'Server address',
    serverHint: 'Your own POuxis server, or one run by someone you trust.',
    status: 'Status: {status}',
    lastSync: 'Last synced {time}',
    syncNow: 'Sync now',
    lowBandwidth: 'Save data',
    lowBandwidthHint: 'Only exchanges changes; useful on 3G or unstable networks.',
    devices: {
      title: 'Devices',
      thisDevice: 'This device',
      lastSeen: 'Seen {time}',
      add: 'Add device',
      addHint: 'Scan this code from the other device.',
      remove: 'Remove this device',
      removed: '“{name}” will no longer sync',
    },
    encryption: 'End-to-end encrypted: the server can’t read your data.',
  },

  privacy: {
    telemetry: {
      label: 'Local statistics',
      hint: 'Calculated and kept on this device to power your insights. Never sent.',
    },
    crashReports: {
      label: 'Error reports',
      hint: 'Shows you the report before anything is sent. Off by default.',
    },
    clear: 'Clear local statistics',
    cleared: 'Statistics cleared',
  },

  data: {
    export: {
      label: 'Export everything',
      hint: 'A .zip archive with all your data as readable JSON, plus your files.',
      action: 'Export my data',
      running: 'Preparing archive…',
      done: 'Archive ready',
    },
    import: {
      label: 'Import',
      hint: 'From a POuxis archive, a Markdown file or an .ics calendar.',
      done: '{count, plural, one {# item imported} other {# items imported}}',
    },
    cleanup: {
      label: 'Archive old drafts',
      hint: 'Drafts untouched for 2 years move to the archive. Nothing is deleted.',
    },
    deleteAll: {
      label: 'Delete all data on this device',
      hint: 'Export first if you want to keep it. Other synced devices aren’t affected.',
      confirmTitle: 'Delete all data on this device?',
      confirmBody:
        'Tasks, notes, events and canvases will be erased from this device. This can’t be undone.',
      confirmType: 'Type {word} to confirm',
      confirmWord: 'DELETE',
      action: 'Delete everything',
      keep: 'Keep my data',
    },
  },

  about: {
    version: 'Version {version}',
    tagline: 'Free software, local-first.',
    licence: 'License',
    licences: 'Third-party licenses',
    source: 'Source code',
    changelog: 'What’s new',
    feedback: 'Report a problem',
    credits: 'Acknowledgements',
  },
};
