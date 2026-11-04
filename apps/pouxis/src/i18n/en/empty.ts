import type { empty as fr } from '../fr/empty.ts';

export const empty: typeof fr = {
  generic: {
    title: 'Nothing here yet',
    body: 'Anything you add will show up here.',
  },
  search: {
    title: 'No results',
    body: 'Try another word, or a related idea: search understands meaning.',
  },
  filtered: {
    title: 'Nothing matches these filters',
    body: 'Remove a filter to widen the view.',
    action: 'Clear filters',
  },
  archive: {
    title: 'No archives',
    body: 'Anything you archive is kept here, never deleted.',
  },
  journal: {
    title: 'Empty journal',
    body: 'A few lines at the end of the day are enough to keep the thread.',
    action: 'Write an entry',
  },
  trash: {
    title: 'Trash is empty',
    body: 'Deleted items stay here for 30 days before they’re gone.',
  },
  offline: {
    title: 'Nothing to show offline',
    body: 'This content isn’t on this device yet. It’ll arrive with the next sync.',
  },
};
