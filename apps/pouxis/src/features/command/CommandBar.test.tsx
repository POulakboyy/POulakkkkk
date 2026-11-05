import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRoute } from '../../app/router.ts';
import { store } from '../../store/index.ts';
import { CommandBar } from './CommandBar.tsx';
import { closeCommandBar, getCommandBarState, openCommandBar } from './state.ts';

beforeEach(() => {
  store.setPrefs({ locale: 'fr' });
});

afterEach(() => {
  act(() => closeCommandBar());
  cleanup();
});

async function openBar(text = '') {
  render(<CommandBar />);
  act(() => openCommandBar(text));
  return screen.findByRole('textbox', { name: 'Capturer, chercher ou taper une commande' });
}

describe('CommandBar', () => {
  it('opens as a modal dialog with the composer focused and suggestions listed', async () => {
    const input = await openBar();
    expect(screen.getByRole('dialog', { name: 'Barre de commande' })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(screen.getByRole('option', { name: /Nouvelle note/ })).toBeTruthy();
  });

  it('previews the parsed capture and creates it on Enter', async () => {
    const user = userEvent.setup();
    const input = await openBar();
    const before = store.all('tasks').length;
    await user.type(input, 'Relire le manifeste demain #ecriture');
    const create = screen.getByRole('option', { name: /Relire le manifeste/ });
    expect(create.getAttribute('aria-selected')).toBe('true');
    expect(create.textContent).toContain('ecriture');
    await user.keyboard('{Enter}');
    const tasks = store.all('tasks');
    expect(tasks.length).toBe(before + 1);
    const created = tasks.find((t) => t.title === 'Relire le manifeste');
    expect(created?.tags).toEqual(['ecriture']);
    expect(created?.floatingDay).toBeTypeOf('number');
    expect(getCommandBarState().open).toBe(false);
  });

  it('switches a timed line between event and task', async () => {
    const user = userEvent.setup();
    const input = await openBar();
    await user.type(input, 'Déjeuner avec @lea demain 12h');
    expect(screen.getByRole('option', { name: /Événement/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'En faire une tâche' }));
    expect(screen.getByRole('option', { name: /Tâche/ })).toBeTruthy();
  });

  it('runs commands in / mode, moving with the arrow keys', async () => {
    const user = userEvent.setup();
    const input = await openBar('/');
    await user.type(input, 'aller bilan');
    const option = screen.getByRole('option', { name: 'Aller à Bilan' });
    expect(option.getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe(option.id);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(getRoute().view).toBe('insights'));
  });

  it('says so when no command matches', async () => {
    const user = userEvent.setup();
    const input = await openBar('/');
    await user.type(input, 'zzzz');
    expect(screen.getByText('Aucune commande ne correspond à « zzzz »')).toBeTruthy();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    await openBar();
    await user.keyboard('{Escape}');
    expect(getCommandBarState().open).toBe(false);
  });
});
