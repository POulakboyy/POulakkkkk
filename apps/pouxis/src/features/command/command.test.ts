import { describe, expect, it, vi } from 'vitest';
import type { nlp } from '@pouxis/core';
import {
  commitCapture,
  highlightSegments,
  planCapture,
  planText,
  type CaptureContext,
} from './capture.ts';
import { filterCommands, fuzzyScore, type CommandItem } from './commands.ts';
import { buildSearchIndex, recordRoute, searchGrouped } from './results.ts';
import {
  closeCommandBar,
  COMMAND_OPEN_EVENT,
  getCommandBarState,
  openCommandBar,
} from './state.ts';
import { readResults, type RecognitionEventLike } from './voice.ts';

// Tuesday 3 November 2026, 10:00 in Paris.
const ctx: CaptureContext = {
  now: Date.UTC(2026, 10, 3, 9, 0),
  timeZone: 'Europe/Paris',
  locale: 'fr',
  defaultMode: 'organize',
};

describe('planCapture', () => {
  it('builds a pinned, scheduled task from a dated, timed line', () => {
    const item = planCapture('Appeler Léa demain 15h #perso !!', { ...ctx }, 'task');
    expect(item.kind).toBe('task');
    expect(item.draft?.collection).toBe('tasks');
    if (item.draft?.collection !== 'tasks') return;
    expect(item.draft.data.title).toBe('Appeler Léa');
    expect(item.draft.data.tags).toEqual(['perso']);
    expect(item.draft.data.pinned).toBe(true);
    expect(item.draft.data.scheduled?.start).toBe(Date.UTC(2026, 10, 4, 14, 0));
    expect(item.draft.data.status).toBe('todo');
  });

  it('turns a meeting with attendees into an event in the explicit zone', () => {
    const item = planCapture('Réunion projet avec @paul demain 14h-16h', ctx);
    expect(item.kind).toBe('event');
    if (item.draft?.collection !== 'events') throw new Error('expected an event');
    expect(item.draft.data.kind).toBe('meeting');
    expect(item.draft.data.attendees).toEqual(['paul']);
    expect(item.draft.data.timeZone).toBe('Europe/Paris');
    expect(item.draft.data.end - item.draft.data.start).toBe(2 * 3_600_000);
  });

  it('keeps a dateless line in the inbox and never creates an empty title', () => {
    const inbox = planCapture('Lire un livre sur la typographie', ctx);
    expect(inbox.draft?.collection === 'tasks' && inbox.draft.data.status).toBe('inbox');
    expect(planCapture('#perso', ctx).draft).toBeNull();
  });

  it('falls back to a task when an event is asked for but there is no start', () => {
    expect(planCapture('Écrire la newsletter', ctx, 'event').kind).toBe('task');
  });
});

describe('planText', () => {
  it('plans one item per non-empty line with tokens offset into the whole text', () => {
    const text = 'Acheter du pain\n\nAppeler Léa demain #perso';
    const { items, tokens } = planText(text, ctx);
    expect(items).toHaveLength(2);
    const tag = tokens.find((t) => t.type === 'tag');
    expect(tag && text.slice(tag.start, tag.end)).toBe('#perso');
  });

  it('applies the kind override only to a single-line capture', () => {
    const one = planText('Déjeuner demain 12h', ctx, 'task');
    expect(one.items[0]?.kind).toBe('task');
    const many = planText('Déjeuner demain 12h\nAppel demain 15h', ctx, 'task');
    expect(many.items.every((i) => i.kind === 'event')).toBe(true);
  });
});

describe('highlightSegments', () => {
  it('splits text around tokens and ignores overlapping or out-of-range ones', () => {
    const tokens: nlp.ParseToken[] = [
      { type: 'tag', start: 6, end: 11, text: '#perso' },
      { type: 'date', start: 8, end: 10, text: 'rs' },
      { type: 'time', start: 40, end: 44, text: 'x' },
    ];
    expect(highlightSegments('Appel #perso ok', tokens)).toEqual([
      { text: 'Appel ' },
      { text: '#pers', type: 'tag' },
      { text: 'o ok' },
    ]);
  });
});

describe('commitCapture', () => {
  it('creates every draft in one undo step and skips empty items', () => {
    const created: string[] = [];
    const target = {
      batch: vi.fn(<T>(fn: () => T) => fn()),
      create: vi.fn((name: string, data: { title: string }) => {
        created.push(`${name}:${data.title}`);
        return { id: `id-${created.length}`, ...data };
      }),
    };
    const { items } = planText('Pain\n#perso\nRéunion demain 9h avec @paul', ctx);
    const result = commitCapture(target as never, items);
    expect(target.batch).toHaveBeenCalledTimes(1);
    expect(created).toEqual(['tasks:Pain', 'events:Réunion']);
    expect(result.map((r) => r.collection)).toEqual(['tasks', 'events']);
  });

  it('does nothing without drafts', () => {
    const target = { batch: vi.fn(), create: vi.fn() };
    expect(commitCapture(target as never, [])).toEqual([]);
    expect(target.batch).not.toHaveBeenCalled();
  });
});

describe('fuzzy command filter', () => {
  const item = (id: string, label: string, keywords: string[] = []): CommandItem => ({
    id,
    label,
    keywords,
    icon: () => null,
    run: () => {},
  });
  const items = [
    item('a', 'Aller à Tâches'),
    item('b', 'Changer de thème', ['theme']),
    item('c', 'Thème · Sombre', ['dark']),
  ];

  it('ranks prefixes above word starts above subsequences, accent-insensitively', () => {
    expect(fuzzyScore('the', 'thème')!).toBeGreaterThan(fuzzyScore('the', 'Changer de thème')!);
    expect(fuzzyScore('chth', 'Changer de thème')).not.toBeNull();
    expect(fuzzyScore('xyz', 'Changer de thème')).toBeNull();
    expect(fuzzyScore('', 'anything')).toBe(0);
  });

  it('matches keywords and keeps every command for an empty query', () => {
    expect(filterCommands(items, 'dark').map((i) => i.id)).toEqual(['c']);
    expect(filterCommands(items, 'tach').map((i) => i.id)).toEqual(['a']);
    expect(filterCommands(items, '')).toHaveLength(3);
  });
});

describe('grouped search', () => {
  const base = { createdAt: 0, updatedAt: 0, tags: [] as string[] };
  const records = {
    tasks: [
      {
        ...base,
        id: 't1',
        title: 'Devis client Atelier',
        status: 'todo',
        priority: 0,
        dependsOn: [],
        mode: 'organize',
        postponedCount: 0,
        timeLogs: [],
      },
    ],
    events: [
      {
        ...base,
        id: 'e1',
        title: 'Appel client',
        start: 0,
        end: 1,
        timeZone: 'Europe/Paris',
        fixed: true,
        kind: 'meeting',
        attendees: [],
      },
    ],
    notes: [{ ...base, id: 'n1', title: 'Idées', body: 'un client heureux', links: [] }],
    graphs: [],
    journal: [],
  };

  it('groups hits by collection in display order', () => {
    const index = buildSearchIndex(records as never);
    const sections = searchGrouped(index, 'client');
    expect(sections.map((s) => s.collection)).toEqual(['tasks', 'events', 'notes']);
    expect(searchGrouped(index, 'c')).toEqual([]);
  });

  it('routes each collection to the view that opens it', () => {
    expect(recordRoute('tasks', 'x')).toEqual({ view: 'tasks', params: { task: 'x' } });
    expect(recordRoute('events', 'x').view).toBe('calendar');
    expect(recordRoute('graphs', 'x').params).toEqual({ graph: 'x' });
  });
});

describe('command bar state', () => {
  it('opens with a prefill, ignores event objects and reacts to the window event', () => {
    openCommandBar('/');
    expect(getCommandBarState()).toMatchObject({ open: true, initialText: '/' });
    const session = getCommandBarState().session;
    openCommandBar({ type: 'click' });
    expect(getCommandBarState().initialText).toBe('');
    expect(getCommandBarState().session).toBe(session + 1);
    closeCommandBar();
    window.dispatchEvent(new CustomEvent(COMMAND_OPEN_EVENT, { detail: { text: 'Idée' } }));
    expect(getCommandBarState()).toMatchObject({ open: true, initialText: 'Idée' });
    closeCommandBar();
    expect(getCommandBarState().open).toBe(false);
  });
});

describe('readResults', () => {
  it('separates final and interim speech results', () => {
    const e: RecognitionEventLike = {
      resultIndex: 0,
      results: {
        length: 2,
        0: { isFinal: true, length: 1, 0: { transcript: 'acheter du pain ' } },
        1: { isFinal: false, length: 1, 0: { transcript: 'et euh' } },
      },
    };
    expect(readResults(e)).toEqual({ final: 'acheter du pain', interim: 'et euh' });
  });
});
