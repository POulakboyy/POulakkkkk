import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollectionName, Note } from '@pouxis/core';
import { store } from '../../store/index.ts';
import { HybridEditor } from './editor/HybridEditor.tsx';
import type { WikiHandlers } from './editor/RenderedLine.tsx';
import { BrainDump } from './dump/BrainDump.tsx';
import { FrictionJournal } from './journal/FrictionJournal.tsx';
import { RESOLVED_TAG } from './lib/notes.ts';
import { NotesPane } from './notes/NotesPane.tsx';
import { SandboxPane } from './sandbox/SandboxPane.tsx';
import { Constraints } from './studio/Constraints.tsx';
import { DeadEnds } from './studio/DeadEnds.tsx';
import { Methods } from './studio/Methods.tsx';
import { Serendipity } from './studio/Serendipity.tsx';

const DAY = 86_400_000;

function wipe(...names: CollectionName[]) {
  for (const name of names) for (const r of store.all(name)) store.remove(name, r.id);
}

function addNote(patch: Partial<Note> = {}): Note {
  return store.create('notes', { title: 'Note', body: '', tags: [], links: [], ...patch });
}

/** Lets the store deliver its batched notifications. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(async () => {
  await store.ready;
  store.setPrefs({ locale: 'fr' });
  wipe('notes', 'journal', 'tasks');
  await settle();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const wiki = (overrides: Partial<WikiHandlers> = {}): WikiHandlers => ({
  resolve: () => undefined,
  open: vi.fn(),
  create: vi.fn(),
  createLabel: (title) => `Créer ${title}`,
  ...overrides,
});

function renderEditor(body: string, props: Partial<Parameters<typeof HybridEditor>[0]> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <HybridEditor
      noteId="test"
      body={body}
      onChange={onChange}
      wiki={wiki()}
      label="Contenu"
      placeholder="Écrire…"
      taskLabel="Cocher"
      {...props}
    />,
  );
  const line = (i: number) => utils.container.querySelector<HTMLElement>(`[data-line="${i}"]`)!;
  return { ...utils, onChange, line };
}

describe('HybridEditor', () => {
  it('renders Markdown without its markers', () => {
    const { line } = renderEditor('# Title\nSome **bold** and `code`\n- item');
    expect(line(0).textContent).toBe('Title');
    expect(line(1).querySelector('strong')?.textContent).toBe('bold');
    expect(line(1).querySelector('code')?.textContent).toBe('code');
    expect(line(2).textContent).toBe('item');
    expect(screen.queryByRole('textbox', { name: 'Contenu', hidden: false })).toBeTruthy();
  });

  it('shows the source of the line being edited and saves on blur', () => {
    const { line, onChange } = renderEditor('# Title\nbody');
    fireEvent.mouseDown(line(0), { button: 0 });
    const field = line(0).querySelector('textarea')!;
    expect(field.value).toBe('# Title');
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: '# Title 2' } });
    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledWith('# Title 2\nbody');
    expect(line(0).querySelector('textarea')).toBeNull();
  });

  it('splits lines on Enter and continues lists', () => {
    const { line, onChange } = renderEditor('- one');
    fireEvent.mouseDown(line(0), { button: 0 });
    const field = line(0).querySelector('textarea')!;
    field.setSelectionRange(5, 5);
    fireEvent.keyDown(field, { key: 'Enter' });
    const next = line(1).querySelector('textarea')!;
    expect(next.value).toBe('- ');
    fireEvent.change(next, { target: { value: '- two' } });
    fireEvent.blur(next);
    expect(onChange).toHaveBeenLastCalledWith('- one\n- two');
  });

  it('merges with the previous line on Backspace at the start', () => {
    const { line, onChange } = renderEditor('ab\ncd');
    fireEvent.mouseDown(line(1), { button: 0 });
    const field = line(1).querySelector('textarea')!;
    field.setSelectionRange(0, 0);
    fireEvent.keyDown(field, { key: 'Backspace' });
    const merged = line(0).querySelector('textarea')!;
    expect(merged.value).toBe('abcd');
    fireEvent.blur(merged);
    expect(onChange).toHaveBeenLastCalledWith('abcd');
  });

  it('refuses every deletion in typewriter mode', () => {
    const onBlocked = vi.fn();
    const { line, onChange } = renderEditor('ab\ncd', { typewriter: true, onBlocked });
    fireEvent.mouseDown(line(1), { button: 0 });
    const field = line(1).querySelector('textarea')!;
    field.setSelectionRange(0, 0);
    expect(fireEvent.keyDown(field, { key: 'Backspace' })).toBe(false);
    expect(fireEvent.keyDown(field, { key: 'Delete' })).toBe(false);
    const beforeInput = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
      cancelable: true,
    });
    field.dispatchEvent(beforeInput);
    expect(beforeInput.defaultPrevented).toBe(true);
    expect(onBlocked).toHaveBeenCalledTimes(3);
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps selected text when a mobile keyboard types or autocorrects in typewriter mode', () => {
    const onBlocked = vi.fn();
    const { line } = renderEditor('hello', { typewriter: true, onBlocked });
    fireEvent.mouseDown(line(0), { button: 0 });
    const field = line(0).querySelector('textarea')!;
    field.setSelectionRange(1, 4);
    const typed = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: 'x',
      cancelable: true,
    });
    field.dispatchEvent(typed);
    expect(typed.defaultPrevented).toBe(false);
    expect([field.selectionStart, field.selectionEnd]).toEqual([4, 4]);
    const corrected = new InputEvent('beforeinput', {
      inputType: 'insertReplacementText',
      cancelable: true,
    });
    field.dispatchEvent(corrected);
    expect(corrected.defaultPrevented).toBe(true);
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it('toggles task checkboxes without entering edit mode', () => {
    const { line, onChange, unmount } = renderEditor('- [ ] ship');
    fireEvent.click(within(line(0)).getByRole('checkbox', { name: 'Cocher' }));
    expect(within(line(0)).getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    unmount();
    expect(onChange).toHaveBeenCalledWith('- [x] ship');
  });

  it('opens existing wiki links and offers to create missing ones', () => {
    const handlers = wiki({ resolve: (t) => (t === 'Plan' ? 'p1' : undefined) });
    renderEditor('See [[Plan]] and [[Later]]', { wiki: handlers });
    fireEvent.click(screen.getByRole('link', { name: 'Plan' }));
    expect(handlers.open).toHaveBeenCalledWith('p1');
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(handlers.create).toHaveBeenCalledWith('Later');
  });
});

describe('NotesPane', () => {
  it('lists notes, opens one and shows its backlinks', async () => {
    const target = addNote({ title: 'Plan', body: 'The plan' });
    addNote({ title: 'Journal', body: 'Reread [[Plan]] tomorrow' });
    await settle();
    const onSelect = vi.fn();
    const { rerender } = render(
      <NotesPane selectedId={undefined} onSelect={onSelect} onBrainDump={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Plan/ }));
    expect(onSelect).toHaveBeenCalledWith(target.id);

    rerender(<NotesPane selectedId={target.id} onSelect={onSelect} onBrainDump={vi.fn()} />);
    const backlinks = screen.getByRole('region', { name: /Mentionnée dans/ });
    expect(within(backlinks).getByText('Journal')).toBeTruthy();
    expect((screen.getByLabelText('Titre de la note') as HTMLInputElement).value).toBe('Plan');
  });

  it('filters the list and offers an empty state without notes', async () => {
    const onBrainDump = vi.fn();
    const { unmount } = render(
      <NotesPane selectedId={undefined} onSelect={vi.fn()} onBrainDump={onBrainDump} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Vider sa tête' }));
    expect(onBrainDump).toHaveBeenCalled();
    unmount();

    addNote({ title: 'Alpha' });
    addNote({ title: 'Beta' });
    await settle();
    render(<NotesPane selectedId={undefined} onSelect={vi.fn()} onBrainDump={onBrainDump} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'alp' } });
    await settle();
    expect(screen.queryByRole('button', { name: /^Beta/ })).toBeNull();
    expect(screen.getByRole('button', { name: /^Alpha/ })).toBeTruthy();
  });
});

describe('BrainDump', () => {
  it('sends one inbox task per line when closed', async () => {
    const onClose = vi.fn();
    render(<BrainDump onClose={onClose} />);
    const field = screen.getByRole('textbox', { name: 'Vider sa tête' });
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: 'Appeler Léa\n\n- Acheter du café' } });
    expect(screen.getByText('2 idées')).toBeTruthy();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    const tasks = store.all('tasks');
    expect(tasks.map((t) => [t.title, t.status])).toEqual([
      ['Appeler Léa', 'inbox'],
      ['Acheter du café', 'inbox'],
    ]);
  });
});

describe('FrictionJournal', () => {
  it('logs a friction with its kind and resolves it', async () => {
    render(<FrictionJournal />);
    fireEvent.click(screen.getByRole('button', { name: 'Créatif' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Ce qui coince' }), {
      target: { value: 'Page blanche sur l’intro' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Noter' }));
    await settle();
    const [entry] = store.all('journal');
    expect(entry).toMatchObject({
      kind: 'friction',
      text: 'Page blanche sur l’intro',
      tags: ['creative'],
    });
    fireEvent.click(screen.getByRole('button', { name: 'C’est réglé' }));
    await settle();
    expect(store.all('journal')[0]?.tags).toContain(RESOLVED_TAG);
    expect(screen.getByRole('button', { name: 'Rouvrir' })).toBeTruthy();
  });
});

describe('Constraints', () => {
  it('draws a constraint, then a different one', () => {
    const { container } = render(<Constraints />);
    fireEvent.click(screen.getByRole('button', { name: 'Tirer une contrainte' }));
    const first = container.querySelector('blockquote')?.textContent;
    expect(first).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Une autre' }));
    expect(container.querySelector('blockquote')?.textContent).not.toBe(first);
    expect(screen.getByText('Déjà tirées')).toBeTruthy();
  });
});

describe('Methods', () => {
  it('runs SCAMPER step by step and keeps the ideas as a note', async () => {
    const onSaved = vi.fn();
    render(<Methods onSaved={onSaved} />);
    const scamper = screen.getByText('SCAMPER').closest('li')!;
    fireEvent.click(within(scamper).getByRole('button', { name: 'Commencer' }));
    expect(screen.getByText('Étape 1 sur 7')).toBeTruthy();
    expect(
      screen.getByRole('progressbar', { name: 'Temps restant pour cette étape' }),
    ).toBeTruthy();

    const field = screen.getByRole('textbox', { name: 'Votre idée pour cette étape' });
    fireEvent.change(field, { target: { value: 'Remplacer le papier' } });
    fireEvent.submit(field.closest('form')!);
    expect(screen.getByText('Remplacer le papier')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Étape suivante' }));
    expect(screen.getByText('Étape 2 sur 7')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mettre le minuteur en pause' }));
    expect(screen.getByRole('button', { name: 'Reprendre le minuteur' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Quitter la méthode' }));
    await settle();
    const [note] = store.all('notes');
    expect(note?.title).toMatch(/^SCAMPER · /);
    expect(note?.body).toContain('- Remplacer le papier');
  });
});

describe('Serendipity', () => {
  it('deals pairs of unlinked notes and links them both ways', async () => {
    const notes = ['Abeilles', 'Typographie', 'Marées', 'Budget'].map((title) =>
      addNote({ title, body: `${title} body` }),
    );
    await settle();
    render(<Serendipity notes={store.all('notes')} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rapprocher deux idées' }));
    const card = screen.getByRole('group', { name: /^Paire 1 sur \d/ });
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    expect(screen.getByRole('group', { name: /^Paire 2 sur/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Les relier' }));
    await settle();
    const linked = store.all('notes').filter((n) => n.links.length > 0);
    expect(linked).toHaveLength(2);
    expect(linked[0]?.links).toEqual([linked[1]?.id]);
    expect(notes).toHaveLength(4);
  });

  it('explains when there are not enough notes', () => {
    render(<Serendipity notes={[]} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rapprocher deux idées' }));
    expect(screen.getByText(/au moins deux notes/)).toBeTruthy();
  });
});

describe('SandboxPane', () => {
  it('keeps a throwaway draft as a real note', async () => {
    render(<SandboxPane onKept={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: 'Brouillon jetable' });
    fireEvent.change(field, { target: { value: 'Idée folle\nà creuser' } });
    fireEvent.blur(field);
    await settle();
    expect(store.all('notes').filter((n) => n.sandbox)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Garder comme note' }));
    await settle();
    const notes = store.all('notes');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ title: 'Idée folle', body: 'Idée folle\nà creuser' });
    expect(notes[0]?.sandbox).toBeFalsy();
  });
});

describe('DeadEnds', () => {
  it('lists notes never edited after creation and archives them', async () => {
    const stale = addNote({ title: 'Projet oublié' });
    await settle();
    const later = stale.createdAt + 40 * DAY;
    const onOpen = vi.fn();
    const { rerender } = render(
      <DeadEnds notes={store.all('notes')} onOpen={onOpen} now={later} />,
    );
    expect(screen.getByText('Projet oublié')).toBeTruthy();
    expect(screen.getByText('Laissée de côté depuis 40 jours')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Y revenir' }));
    expect(onOpen).toHaveBeenCalledWith(stale.id);
    fireEvent.click(screen.getByRole('button', { name: 'Archiver' }));
    await settle();
    rerender(<DeadEnds notes={store.all('notes')} onOpen={onOpen} now={later} />);
    expect(screen.getByText(/Aucune piste en sommeil/)).toBeTruthy();
  });
});
