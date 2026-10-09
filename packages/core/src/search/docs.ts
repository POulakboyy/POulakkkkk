/**
 * Flattening of domain records into `SearchDoc`s, so every collection is searchable with the
 * same index and field weights.
 */
import type { Collections, CollectionName } from '../model.ts';
import type { SearchDoc } from './lexical.ts';

/**
 * Builds the indexable view of a record:
 * - tasks: title, notes, tags;
 * - events: title, notes + location + attendees, tags;
 * - notes: title, body, tags, sandbox flag — the body of a vault note (3.5) is ciphertext and
 *   is never indexed;
 * - journal: text as body (entries have no title), tags;
 * - graphs: title, node labels as body.
 */
export function toSearchDoc<C extends CollectionName>(
  collection: C,
  record: Collections[C],
): SearchDoc {
  const base = { id: record.id, collection, updatedAt: record.updatedAt };
  switch (collection) {
    case 'tasks': {
      const task = record as Collections['tasks'];
      return { ...base, title: task.title, body: task.notes ?? '', tags: task.tags };
    }
    case 'events': {
      const event = record as Collections['events'];
      const body = [event.notes, event.location, event.attendees.join(' ')]
        .filter((part): part is string => Boolean(part))
        .join('\n');
      return { ...base, title: event.title, body, tags: event.tags };
    }
    case 'notes': {
      const note = record as Collections['notes'];
      const doc: SearchDoc = {
        ...base,
        title: note.title,
        body: note.vaultId ? '' : note.body,
        tags: note.tags,
      };
      if (note.sandbox) doc.sandbox = true;
      return doc;
    }
    case 'journal': {
      const entry = record as Collections['journal'];
      return { ...base, title: '', body: entry.text, tags: entry.tags };
    }
    case 'graphs': {
      const graph = record as Collections['graphs'];
      return { ...base, title: graph.title, body: graph.nodes.map((n) => n.label).join('\n') };
    }
    default:
      throw new Error(`Unknown collection: ${String(collection)}`);
  }
}
