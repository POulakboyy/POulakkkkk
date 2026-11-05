import type { command as fr } from '../fr/command.ts';

export const command: typeof fr = {
  a11y: 'Command bar',
  input: 'Capture, search or type a command',
  placeholder: {
    default: 'Capture a task, search, or type / for a command',
    capture: 'E.g. Call Lea tomorrow 3pm #personal !high',
    search: 'Search tasks, notes and events…',
    commands: 'Type a command…',
    mobile: 'Capture or search…',
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
    deadline: 'Due · {value}',
    tag: 'Tag · {value}',
    person: 'Person · {value}',
    project: 'Project · {value}',
    priority: 'Priority · {value}',
    recurrence: 'Repeats · {value}',
    location: 'Place · {value}',
    remove: 'Remove “{value}”',
  },

  preview: {
    a11y: 'What will be created',
    task: 'Task',
    event: 'Event',
    inbox: 'Inbox',
    asEvent: 'Make it an event',
    asTask: 'Make it a task',
    estimate: 'About {duration}',
    deadline: 'Before {date}',
    with: 'With {people}',
    repeats: 'Repeats · {rule}',
    pinned: 'Fixed time',
    many: '{count, plural, one {# item will be created} other {# items will be created}}',
    empty: 'Write a task, an appointment or an idea, just as it comes.',
  },

  intent: {
    task: 'Create task',
    event: 'Create event',
    note: 'Create note',
    idea: 'Send to inbox',
    many: '{count, plural, one {Create # item} other {Create # items}}',
  },

  actions: {
    newTask: 'New task',
    newEvent: 'New event',
    newNote: 'New note',
    newCanvas: 'New canvas',
    brainDump: 'Brain dump',
    startFocus: 'Start a focus',
    triageInbox: 'Sort the inbox',
    reroute: 'Rearrange the day',
    goTo: 'Go to {view}',
    toggleTheme: 'Change theme',
    setTheme: 'Theme · {theme}',
    toggleZen: 'Zen interface',
    openSettings: 'Open settings',
    shortcuts: 'Keyboard shortcuts',
    exportData: 'Export my data',
    replayOnboarding: 'Replay the intro',
    openGallery: 'Component library',
    language: 'Language · {language}',
  },

  sections: {
    create: 'Create',
    suggestions: 'Suggestions',
    recent: 'Recent',
    actions: 'Actions',
    commands: 'Commands',
    tasks: 'Tasks',
    notes: 'Notes',
    events: 'Events',
    canvases: 'Canvases',
    journal: 'Journal',
  },

  hints: {
    select: '{key} to confirm',
    navigate: '↑ ↓ to move',
    close: '{key} to close',
    commands: '{key} for commands',
    newLine: '{key} for a new line',
    complete: '{key} to complete',
    syntax: '#tag · @person · p1 · tomorrow 2pm',
  },

  suggestion: 'Suggestion: {value}',

  result: {
    created:
      '{kind, select, task {Task created} event {Event created} note {Note created} other {Sent to inbox}}',
    createdMany: '{count, plural, one {# item created} other {# items created}}',
    open: 'Open',
  },

  empty: 'No matching command. Press Enter to make it a task.',
  noMatch: 'No command matches “{query}”',

  voice: {
    start: 'Dictate',
    stop: 'Stop dictation',
    listening: 'Listening…',
    unsupported: 'Dictation isn’t available in this browser.',
    denied: 'The microphone isn’t allowed. You can turn it on in your system or browser settings.',
    failed: 'Dictation stopped. You can try again.',
  },

  newNoteTitle: 'New note',
  newCanvasTitle: 'New canvas',

  quick: {
    title: 'Quick capture',
    saved: 'Captured · {title}',
    hint: 'Enter to keep, Esc to close',
  },
};
