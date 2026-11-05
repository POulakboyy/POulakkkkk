import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Note } from '@pouxis/core';
import { NOW, fakeStore, makeEntry, makeTask } from './shared/fixtures.test-utils.ts';

vi.mock('../../store/index.ts', async () => {
  const m = await import('./shared/fixtures.test-utils.ts');
  return m.fakeStoreModule(m.fakeStore);
});

const { labFeatures } = await import('./index.ts');
const { PreMortem } = await import('./premortem/PreMortem.tsx');
const { TransitionAirlock } = await import('./transition/TransitionAirlock.tsx');
const { IdeaIncubator } = await import('./incubation/IdeaIncubator.tsx');
const { FreshStart } = await import('./freshstart/FreshStart.tsx');
const { incubationTags } = await import('./incubation/incubation.ts');

const DAY = 86_400_000;

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  fakeStore.reset();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function note(id: string, patch: Partial<Note> = {}): Note {
  return {
    id,
    createdAt: NOW - 10 * DAY,
    updatedAt: NOW - DAY,
    title: `Idée ${id}`,
    body: 'Une piste à creuser',
    tags: [],
    links: [],
    ...patch,
  };
}

describe('feature toggle', () => {
  it('pauses a feature without mounting it, and remembers the choice', () => {
    const Wins = labFeatures.find((f) => f.id === 'wins')!.Component;
    render(<Wins />);
    const toggle = screen.getByRole('switch', { name: 'Activer « Bocal des victoires »' });
    expect(screen.getByText('Vos victoires de la semaine')).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByText('Vos victoires de la semaine')).toBeNull();
    expect(screen.getByText(/En pause/)).toBeTruthy();
    expect(localStorage.getItem('pouxis.lab.disabled')).toBe('["wins"]');
    fireEvent.click(toggle);
    expect(screen.getByText('Vos victoires de la semaine')).toBeTruthy();
  });
});

describe('PreMortem', () => {
  it('records causes and turns parades into subtasks, with undo', () => {
    const target = makeTask({ title: 'Lancer la chaîne', important: true });
    fakeStore.seed('tasks', [target]);
    render(<PreMortem />);
    fireEvent.click(screen.getByRole('button', { name: 'Lancer la chaîne' }));
    expect(screen.getByText(/« Lancer la chaîne » a échoué/)).toBeTruthy();

    const save = screen.getByRole('button', { name: 'Enregistrer le pré-mortem' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Cause 1'), { target: { value: 'Pas de régularité' } });
    fireEvent.change(screen.getByLabelText('Parade'), { target: { value: 'Bloquer le mardi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une cause' }));
    fireEvent.change(screen.getByLabelText('Cause 2'), { target: { value: 'Matériel' } });
    fireEvent.click(save);

    const [entry] = fakeStore.all('journal');
    expect(entry).toMatchObject({
      kind: 'dump',
      text: 'Pas de régularité → Bloquer le mardi\nMatériel',
      tags: ['lab:premortem', `lab:task:${target.id}`],
    });
    const sub = fakeStore.all('tasks').find((t) => t.parentId === target.id);
    expect(sub?.title).toBe('Bloquer le mardi');
    expect(screen.getByText('Pré-mortem enregistré · 1 parade ajoutée')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(fakeStore.all('journal')).toHaveLength(0);
    expect(fakeStore.all('tasks')).toHaveLength(1);
  });

  it('shows the previous pre-mortem of the chosen task', () => {
    const target = makeTask({ title: 'Projet' });
    fakeStore.seed('tasks', [target]);
    fakeStore.seed('journal', [
      makeEntry({ text: 'Retard → Marge', tags: ['lab:premortem', `lab:task:${target.id}`] }),
    ]);
    render(<PreMortem />);
    fireEvent.click(screen.getByRole('button', { name: 'Projet' }));
    expect(screen.getByText('Retard → Marge')).toBeTruthy();
  });
});

describe('TransitionAirlock', () => {
  it('saves a resume note, swaps statuses, then shows it when the task comes back', () => {
    const leaving = makeTask({ title: 'Montage', status: 'doing' });
    const next = makeTask({ title: 'Courriels', floatingDay: NOW });
    fakeStore.seed('tasks', [leaving, next]);
    render(<TransitionAirlock />);

    fireEvent.click(screen.getByRole('button', { name: 'Montage' }));
    fireEvent.change(screen.getByLabelText('Où j’en suis'), {
      target: { value: 'Séquence 2 calée' },
    });
    fireEvent.change(screen.getByLabelText('Prochaine étape'), {
      target: { value: 'Étalonner' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Courriels' }));
    fireEvent.click(screen.getByRole('button', { name: 'Passer le sas' }));

    expect(fakeStore.all('journal')[0]).toMatchObject({
      text: 'Séquence 2 calée\nÉtalonner',
      tags: ['lab:transition', `lab:task:${leaving.id}`],
    });
    expect(fakeStore.get('tasks', leaving.id)?.status).toBe('todo');
    expect(fakeStore.get('tasks', next.id)?.status).toBe('doing');
    expect(screen.getByRole('progressbar', { name: 'Pause de transition' })).toBeTruthy();
    expect(screen.getByText('Ensuite : Courriels')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Passer la pause' }));
    // Coming back to "Montage" later shows the note.
    fireEvent.click(screen.getByRole('button', { name: 'Courriels' }));
    fireEvent.click(screen.getByRole('button', { name: 'Montage' }));
    expect(screen.getByText('Séquence 2 calée')).toBeTruthy();
    expect(screen.getByText('Prochaine étape : Étalonner')).toBeTruthy();
  });

  it('requires a line before passing', () => {
    fakeStore.seed('tasks', [makeTask({ title: 'Seule', status: 'doing' })]);
    render(<TransitionAirlock />);
    fireEvent.click(screen.getByRole('button', { name: 'Seule' }));
    const pass = screen.getByRole('button', { name: 'Passer le sas' }) as HTMLButtonElement;
    expect(pass.disabled).toBe(true);
    expect(screen.getByText('Écrivez au moins une ligne')).toBeTruthy();
  });
});

describe('IdeaIncubator', () => {
  it('parks a note, then offers due ideas to develop, postpone or release', () => {
    fakeStore.seed('notes', [note('a'), note('b')]);
    fakeStore.seed('journal', [
      makeEntry({ text: 'Idée b', tags: incubationTags('b', 1, NOW - 4 * DAY, 'Europe/Paris') }),
    ]);
    render(<IdeaIncubator />);

    // b is due (3 days after its last review); a can be parked.
    expect(screen.getByRole('link', { name: 'Idée b' }).getAttribute('href')).toBe(
      '#/ideas?note=b',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Idée a' }));
    expect(screen.getByText('En incubation · revient demain')).toBeTruthy();
    expect(screen.getByText('Revient demain')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Laisser mûrir · 7 j' }));
    const b = fakeStore.all('journal').find((e) => e.tags.includes('lab:note:b'));
    expect(b?.tags).toContain('lab:stage:2');
    expect(b?.tags).toContain('lab:since:2026-11-05');
    expect(screen.queryByRole('link', { name: 'Idée b' })).toBeNull();
  });

  it('turns a due idea into a creative task for today', () => {
    fakeStore.seed('notes', [note('c')]);
    fakeStore.seed('journal', [
      makeEntry({ tags: incubationTags('c', 0, NOW - 2 * DAY, 'Europe/Paris') }),
    ]);
    render(<IdeaIncubator />);
    fireEvent.click(screen.getByRole('button', { name: 'J’y retourne' }));
    expect(fakeStore.all('journal')).toHaveLength(0);
    expect(fakeStore.all('tasks')[0]).toMatchObject({
      title: 'Développer : Idée c',
      mode: 'create',
      status: 'todo',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(fakeStore.all('tasks')).toHaveLength(0);
    expect(fakeStore.all('journal')).toHaveLength(1);
  });
});

describe('FreshStart', () => {
  it('restarts a stalled task next Monday with a first step', () => {
    const task = makeTask({ title: 'Déclarer la TVA', postponedCount: 5 });
    fakeStore.seed('tasks', [task, makeTask({ title: 'Fraîche' })]);
    render(<FreshStart />);
    expect(screen.queryByText('Fraîche')).toBeNull();
    expect(screen.getByText('Reportée 5 fois')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Repartir « Déclarer la TVA » · lundi' }));
    expect(screen.getByText(/Reporter n’est pas un échec/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Un premier pas/), {
      target: { value: 'Ouvrir le portail' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer · lundi' }));

    const updated = fakeStore.get('tasks', task.id)!;
    expect(updated.postponedCount).toBe(0);
    expect(updated.floatingDay).toBe(Date.UTC(2026, 10, 8, 23));
    expect(fakeStore.all('tasks').find((t) => t.parentId === task.id)?.title).toBe(
      'Ouvrir le portail',
    );
    expect(fakeStore.all('journal')[0]?.tags).toContain('lab:postponed:5');
    expect(screen.getByText('Aucune tâche enlisée. Rien à relancer.')).toBeTruthy();

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Annuler' })));
    expect(fakeStore.get('tasks', task.id)?.postponedCount).toBe(5);
    expect(fakeStore.all('tasks')).toHaveLength(2);
    expect(fakeStore.all('journal')).toHaveLength(0);
  });

  it('lets go of a task by archiving it', () => {
    const task = makeTask({ title: 'Vieille idée', postponedCount: 4 });
    fakeStore.seed('tasks', [task]);
    render(<FreshStart />);
    fireEvent.click(screen.getByRole('button', { name: 'Lâcher « Vieille idée »' }));
    expect(fakeStore.get('tasks', task.id)?.status).toBe('archived');
  });

  it('switches the landmark to the next month', () => {
    const task = makeTask({ title: 'Ranger', postponedCount: 4 });
    fakeStore.seed('tasks', [task]);
    render(<FreshStart />);
    fireEvent.click(screen.getByRole('radio', { name: /Nouveau mois/ }));
    fireEvent.click(screen.getByRole('button', { name: /Repartir « Ranger »/ }));
    fireEvent.click(screen.getByRole('button', { name: /Recommencer/ }));
    expect(fakeStore.get('tasks', task.id)?.floatingDay).toBe(Date.UTC(2026, 10, 30, 23));
  });
});
