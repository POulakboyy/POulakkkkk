import { startOfDay } from '@pouxis/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { store } from '../../../store/index.ts';
import TasksView from '../index.tsx';

const base = {
  tags: [] as string[],
  dependsOn: [] as string[],
  timeLogs: [],
  postponedCount: 0,
  mode: 'organize' as const,
  status: 'todo' as const,
  priority: 0 as const,
};

let n = 0;
const unique = (label: string) => `${label} ${++n}-${Math.random().toString(36).slice(2, 6)}`;

function go(hash: string) {
  act(() => {
    location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  store.setPrefs({ locale: 'fr', wipLimit: 5 });
  go('#/tasks');
});
afterEach(cleanup);

describe('TasksView', () => {
  it('captures a task from natural language into the list', async () => {
    const user = userEvent.setup();
    render(<TasksView />);
    const title = unique('Lire le rapport');
    await user.type(screen.getByRole('textbox', { name: 'Nouvelle tâche' }), `${title} #veille`);
    expect(screen.getByText('#veille')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    const created = store.all('tasks').find((t) => t.title === title);
    expect(created).toMatchObject({ status: 'inbox', tags: ['veille'] });
    expect(screen.getByText(title)).toBeTruthy();
  });

  it('filters by search and offers to clear filters when nothing matches', async () => {
    const user = userEvent.setup();
    render(<TasksView />);
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher une tâche' }), 'zzzqqq');
    expect(screen.getByText('Aucune tâche ne correspond')).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: 'Effacer les filtres' })[0]!);
    expect(screen.queryByText('Aucune tâche ne correspond')).toBeNull();
  });

  it('opens the detail sheet and saves the title in place', async () => {
    const user = userEvent.setup();
    const title = unique('Écrire la conclusion');
    const task = store.create('tasks', { ...base, title });
    render(<TasksView />);
    await user.click(screen.getByText(title));
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('textbox', { name: 'Titre' });
    await user.clear(input);
    await user.type(input, 'Conclusion relue{Enter}');
    expect(store.get('tasks', task.id)?.title).toBe('Conclusion relue');
  });

  it('describes a recurrence rule live and saves it', async () => {
    const user = userEvent.setup();
    const task = store.create('tasks', { ...base, title: unique('Arroser') });
    go(`#/tasks?task=${task.id}`);
    render(<TasksView />);
    const dialog = await screen.findByRole('dialog');
    const field = within(dialog).getByRole('textbox', { name: 'Répétition' });
    await user.type(field, 'tous les lundis');
    expect(within(dialog).getByText(/Compris : chaque lundi/)).toBeTruthy();
    await user.tab();
    expect(store.get('tasks', task.id)?.recurrence).toBe('tous les lundis');
  });

  it('shows the WIP dialog for one priority too many and can lower it instead', async () => {
    const user = userEvent.setup();
    store.setPrefs({ wipLimit: 1 });
    const day = startOfDay(Date.now(), store.prefs().timeZone);
    store.create('tasks', { ...base, title: unique('Prioritaire'), priority: 3, floatingDay: day });
    const task = store.create('tasks', { ...base, title: unique('Autre'), floatingDay: day });
    go(`#/tasks?task=${task.id}`);
    render(<TasksView />);
    const sheet = await screen.findByRole('dialog');
    const priority = within(sheet).getByRole('radiogroup', { name: 'Priorité' });
    await user.click(within(priority).getByRole('radio', { name: 'Haute' }));
    const alert = await screen.findByRole('alertdialog');
    expect(store.get('tasks', task.id)?.priority).toBe(0);
    await user.click(within(alert).getByRole('button', { name: 'La garder en priorité moyenne' }));
    expect(store.get('tasks', task.id)?.priority).toBe(2);
  });

  it('does not ask about the limit for edits that leave priority and day unchanged', async () => {
    const user = userEvent.setup();
    store.setPrefs({ wipLimit: 1 });
    const day = startOfDay(Date.now(), store.prefs().timeZone);
    const high = { ...base, priority: 3 as const, floatingDay: day, mode: 'create' as const };
    store.create('tasks', { ...high, title: unique('Déjà là') });
    const title = unique('Au-delà');
    const task = store.create('tasks', { ...high, title });
    go('#/tasks?view=kanban');
    render(<TasksView />);
    const groupBy = screen.getByRole('radiogroup', { name: 'Grouper par' });
    await user.click(within(groupBy).getAllByRole('radio')[2]!);
    const handle = screen.getByRole('button', { name: new RegExp(`Déplacer.+${title}`) });
    handle.focus();
    fireEvent.keyDown(handle, { key: ' ' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.keyDown(handle, { key: ' ' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(store.get('tasks', task.id)?.mode).toBe('organize');
  });

  it('moves a kanban card with the keyboard', async () => {
    const title = unique('Carte');
    const task = store.create('tasks', { ...base, title });
    go('#/tasks?view=kanban');
    render(<TasksView />);
    const handle = screen.getByRole('button', { name: new RegExp(`Déplacer.+${title}`) });
    handle.focus();
    fireEvent.keyDown(handle, { key: ' ' });
    expect(handle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.keyDown(handle, { key: ' ' });
    expect(store.get('tasks', task.id)?.status).toBe('doing');
    expect(screen.getByRole('status').textContent).toMatch(/déposée dans\sEn cours/);
  });

  it('refuses a dependency that would create a loop', async () => {
    const a = store.create('tasks', { ...base, title: unique('Amont') });
    const b = store.create('tasks', { ...base, title: unique('Aval'), dependsOn: [a.id] });
    go(`#/tasks?task=${a.id}`);
    render(<TasksView />);
    const dialog = await screen.findByRole('dialog');
    const select = within(dialog).getByRole('combobox', { name: 'Ajouter une tâche préalable' });
    const option = within(select).getByRole('option', { name: new RegExp(b.title) });
    expect((option as HTMLOptionElement).disabled).toBe(true);
    expect(option.textContent).toContain('créerait une boucle');
  });

  it('decomposes a task into kept subtasks', async () => {
    const user = userEvent.setup();
    const task = store.create('tasks', {
      ...base,
      title: unique('Préparer la présentation client'),
    });
    go(`#/tasks?task=${task.id}`);
    render(<TasksView />);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Décomposer' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Tout garder' }));
    const children = store.all('tasks').filter((t) => t.parentId === task.id);
    expect(children.length).toBeGreaterThan(2);
    expect(children.every((c) => c.status === 'todo')).toBe(true);
  });
});
