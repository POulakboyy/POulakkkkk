import type { ideas as fr } from '../fr/ideas.ts';

export const ideas: typeof fr = {
  title: 'Ideas',

  notes: {
    new: 'New note',
    untitled: 'Untitled',
    titlePlaceholder: 'Title',
    bodyPlaceholder: 'Start writing…',
    edited: 'Edited {time}',
    backlinks: 'Mentioned in',
    noBacklinks: 'No other note mentions it yet.',
    history: 'History',
    restoreBlock: 'Restore this paragraph',
    restored: 'Paragraph restored',
    delete: 'Delete note',
    deleted: 'Note deleted',
    words: '{count, plural, =0 {No words} one {# word} other {# words}}',
  },

  brainDump: {
    title: 'Brain dump',
    placeholder: 'Whatever’s on your mind. Nothing is judged; it all gets sorted later.',
    hint: 'One idea per line. Close when you’re done: it all goes to your inbox.',
    close: 'Send to inbox',
    sent: '{count, plural, one {# idea sent} other {# ideas sent}} to your inbox',
    empty: 'Nothing to send.',
  },

  typewriter: {
    toggle: 'Typewriter',
    on: 'Typewriter: no going back, only forward.',
    off: 'Typewriter off',
    blocked: 'Deleting is on hold. Keep going, you can edit later.',
    hint: 'For a first draft without self-censoring. Turn it off to revise.',
  },

  serendipity: {
    title: 'Chance encounter',
    action: 'Pair two ideas',
    prompt: 'What connection do you see between these two notes?',
    again: 'Another pair',
    link: 'Link them',
    linked: 'Notes linked',
    tooFew: 'You need at least two unrelated notes. Write a few more.',
  },

  constraints: {
    title: 'Constraints',
    action: 'Add a constraint',
    again: 'Another one',
    hint: 'An unexpected constraint helps you move past the obvious answers.',
    items: {
      half: 'What if you had half the time?',
      blind: 'What if the person using it couldn’t see?',
      noText: 'What if no words were allowed?',
      child: 'What if an 8-year-old had to understand it?',
      tenX: 'What if it had to serve ten times as many people?',
      opposite: 'What if you did the exact opposite?',
      oneHand: 'What if everything had to work with one hand?',
      offline: 'What if there were never a connection?',
    },
  },

  methods: {
    title: 'Methods',
    start: 'Start',
    step: 'Step {current} of {total}',
    finish: 'Finish',
    saved: 'Answers saved to the note',
    scamper: {
      title: 'SCAMPER',
      hint: 'Seven questions to transform an existing idea.',
      substitute: { title: 'Substitute', prompt: 'What could you replace?' },
      combine: { title: 'Combine', prompt: 'What could you pair it with?' },
      adapt: { title: 'Adapt', prompt: 'What exists elsewhere that could work here?' },
      modify: { title: 'Modify', prompt: 'What could you enlarge, shrink or change?' },
      putToOtherUse: { title: 'Put to other use', prompt: 'What else could this be used for?' },
      eliminate: { title: 'Eliminate', prompt: 'What could you remove without losing anything?' },
      reverse: { title: 'Reverse', prompt: 'What if you changed the order or direction?' },
    },
    hats: {
      title: 'Six hats',
      hint: 'Look at the same question from six angles, one at a time.',
      white: { title: 'White · facts', prompt: 'What do we really know? What’s missing?' },
      red: { title: 'Red · feelings', prompt: 'What’s your gut feeling, no justification needed?' },
      black: { title: 'Black · caution', prompt: 'What could go wrong?' },
      yellow: { title: 'Yellow · benefits', prompt: 'What could work well?' },
      green: { title: 'Green · creativity', prompt: 'What other paths, even wild ones?' },
      blue: { title: 'Blue · overview', prompt: 'Where are you now, and what’s next?' },
    },
  },

  friction: {
    title: 'Friction log',
    placeholder: 'What’s getting in the way?',
    hint: 'Write it down and move on: you’ll come back to it with fresh eyes.',
    kind: {
      label: 'Kind',
      technical: 'Technical',
      creative: 'Creative',
      external: 'External',
      other: 'Other',
    },
    logged: 'Logged',
    resolve: 'It’s sorted',
    resolved: 'Sorted',
    recurring: 'Keeps coming back',
    empty: 'Nothing in the way right now. Good.',
  },

  sandbox: {
    title: 'Sandbox',
    hint: 'A throwaway draft: left out of search, wiped at the end of the session.',
    keep: 'Keep as a note',
    kept: 'Kept in your notes',
    clear: 'Clear now',
    cleared: 'Sandbox cleared',
    endsWith: 'Cleared when the app closes',
  },

  ambient: {
    title: 'Ambient sound',
    play: 'Play ambience',
    pause: 'Stop ambience',
    volume: 'Volume',
    timer: 'Stop after',
    sounds: {
      white: 'White noise',
      pink: 'Pink noise',
      brown: 'Brown noise',
      cafe: 'Café',
      forest: 'Forest',
      rain: 'Rain',
    },
    playing: 'Ambience: {sound}',
  },

  moodboard: {
    title: 'Moodboard',
    drop: 'Drop images to pull a palette from them',
    palette: 'Palette',
    copyHex: 'Copy {hex}',
    copied: '{hex} copied',
  },

  voice: {
    record: 'Record an idea',
    highEnergy: 'High energy',
    highEnergyHint: 'Picked up from the enthusiasm in your voice.',
  },

  deadEnds: {
    title: 'Dormant threads',
    hint: 'Started, then set aside. Some deserve a second look, others can go.',
    since: 'Not edited since {when}',
    revisit: 'Revisit',
    archive: 'Archive',
  },

  empty: {
    title: 'No ideas yet',
    body: 'Ideas rarely arrive on cue. Jot them down as they pass, even half-formed.',
    action: 'New note',
    secondary: 'Brain dump',
  },
};
