import type { command as fr } from '../fr/command.ts';

export const command: typeof fr = {
  a11y: 'Command bar',
  placeholder: {
    default: 'Capture a task, search, or type / for a command',
    capture: 'E.g. Call Lea tomorrow 3pm #personal !high',
    search: 'Search tasks, notes and events…',
    commands: 'Type a command…',
  },

  modes: {
    capture: 'Capture',
    search: 'Search',
    commands: 'Commands',
  },

  tokens: {
    a11y: 'Recognized details',
    date: 'Date · {value}',
    time: 'Time · {value}',
    duration: 'Duration · {value}',
    tag: 'Tag · {value}',
    person: 'Person · {value}',
    project: 'Project · {value}',
    priority: 'Priority · {value}',
    recurrence: 'Repeat · {value}',
    location: 'Location · {value}',
    remove: 'Remove “{value}”',
  },

  intent: {
    task: 'Create task',
    event: 'Create event',
    note: 'Create note',
    idea: 'Send to inbox',
  },

  actions: {
    newTask: 'New task',
    newEvent: 'New event',
    newNote: 'New note',
    newCanvas: 'New canvas',
    brainDump: 'Brain dump',
    startFocus: 'Start focus',
    triageInbox: 'Sort inbox',
    reroute: 'Rearrange the day',
    goTo: 'Go to {view}',
    toggleTheme: 'Switch theme',
    toggleZen: 'Zen interface',
    openSettings: 'Open settings',
    shortcuts: 'Keyboard shortcuts',
  },

  sections: {
    suggestions: 'Suggestions',
    recent: 'Recent',
    actions: 'Actions',
    tasks: 'Tasks',
    notes: 'Notes',
    events: 'Events',
    canvases: 'Canvases',
  },

  hints: {
    select: '{key} to select',
    navigate: '↑ ↓ to navigate',
    close: '{key} to close',
    commands: '/ for commands',
    newLine: '{key} for a new line',
    syntax: '#tag · @person · !priority · +project',
  },

  result: {
    created:
      '{kind, select, task {Task created} event {Event created} note {Note created} other {Sent to inbox}}',
    open: 'Open',
  },

  empty: 'No matching command. Press Enter to make it a task.',
};
