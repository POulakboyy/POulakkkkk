import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Graph, JournalEntry, Note, Task } from '../model.ts';
import { toSearchDoc } from './docs.ts';

const base = { createdAt: 1, updatedAt: 2 };

describe('toSearchDoc', () => {
  it('flattens tasks', () => {
    const task = {
      ...base,
      id: 't',
      title: 'Écrire',
      notes: 'brouillon',
      tags: ['x'],
    } as unknown as Task;
    expect(toSearchDoc('tasks', task)).toEqual({
      id: 't',
      collection: 'tasks',
      updatedAt: 2,
      title: 'Écrire',
      body: 'brouillon',
      tags: ['x'],
    });
  });

  it('joins event notes, location and attendees', () => {
    const event = {
      ...base,
      id: 'e',
      title: 'Atelier',
      location: 'Paris',
      attendees: ['ana@example.org', 'bo@example.org'],
      tags: [],
    } as unknown as CalendarEvent;
    expect(toSearchDoc('events', event).body).toBe('Paris\nana@example.org bo@example.org');
  });

  it('flags sandbox notes and never indexes vault bodies', () => {
    const note: Note = { ...base, id: 'n', title: 'T', body: 'secret', tags: [], links: [] };
    expect(toSearchDoc('notes', note)).not.toHaveProperty('sandbox');
    expect(toSearchDoc('notes', { ...note, sandbox: true }).sandbox).toBe(true);
    expect(toSearchDoc('notes', { ...note, vaultId: 'v' }).body).toBe('');
  });

  it('indexes journal text and graph node labels', () => {
    const entry = {
      ...base,
      id: 'j',
      text: 'Bloqué sur le design',
      tags: ['friction'],
    } as unknown as JournalEntry;
    expect(toSearchDoc('journal', entry)).toMatchObject({
      title: '',
      body: 'Bloqué sur le design',
    });
    const graph = {
      ...base,
      id: 'g',
      title: 'Carte',
      nodes: [{ label: 'Idée A' }, { label: 'Idée B' }],
    } as unknown as Graph;
    expect(toSearchDoc('graphs', graph).body).toBe('Idée A\nIdée B');
  });
});
