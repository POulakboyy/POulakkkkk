import type { errors as fr } from '../fr/errors.ts';

export const errors: typeof fr = {
  generic: {
    title: 'Something didn’t work',
    body: 'Your data is safe. Try again; if it keeps happening, restart the app.',
  },
  details: 'Technical details',
  code: 'Code: {code}',
  copyDetails: 'Copy details',
  report: 'Report the problem',

  boundary: {
    title: 'This view ran into a problem',
    body: 'The rest of the app still works. Reload the view to continue.',
    reload: 'Reload view',
    home: 'Back to Today',
  },

  notFound: {
    title: 'Page not found',
    body: 'This link doesn’t lead anywhere, or the item was deleted.',
    action: 'Back to Today',
  },

  offline: {
    title: 'You’re offline',
    body: 'Everything keeps working. Changes will sync when you’re back online.',
  },

  sync: {
    failed: 'Sync paused: the server isn’t responding. Retrying automatically.',
    auth: 'The sync server refused access. Reconnect this device in Settings.',
    conflict: 'Two edits crossed paths. Both versions are kept.',
    tooOld: 'This server runs an older version. Update it to sync.',
  },

  storage: {
    full: 'Storage is full. Free up some space to keep saving.',
    unavailable: 'Local storage can’t be reached. Your changes aren’t being saved right now.',
    quotaHint: 'In private browsing, some browsers limit storage.',
  },

  network: {
    timeout: 'The server is taking too long to respond. Try again in a moment.',
    unreachable: 'Can’t reach {host}. Check the address and your connection.',
  },

  permission: {
    denied:
      'POuxis doesn’t have permission to use {capability}. You can grant it in your system settings.',
    capability: {
      notifications: 'notifications',
      location: 'your location',
      microphone: 'the microphone',
      dnd: 'Do Not Disturb',
      clipboard: 'the clipboard',
    },
  },

  import: {
    unreadable:
      'This file can’t be read. Check that it’s a POuxis archive, an .md or an .ics file.',
    partial:
      '{count, plural, one {# item couldn’t be imported} other {# items couldn’t be imported}}. Everything else came through.',
  },

  export: {
    failed: 'Export didn’t work. Check available space and try again.',
  },

  clipboard: {
    failed: 'Couldn’t copy. Select the text and copy it manually.',
  },
};
