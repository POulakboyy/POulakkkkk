import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeCommandBar, getCommandBarState } from '../features/command/index.tsx';
import { store } from '../store/index.ts';
import { App } from './App.tsx';
import { getAppPrefs, resetAppPrefs, setAppPrefs } from './appPrefs.ts';

// Views are lazy and owned elsewhere: replace them with light stand-ins.
vi.mock('./routes.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./routes.ts')>();
  const stub = (name: string) => ({ default: () => <h1>{name}</h1> });
  const { lazy } = await import('react');
  return {
    ...actual,
    VIEWS: actual.VIEWS.map((v) => ({
      ...v,
      component: lazy(async () => stub(`view:${v.id}`)),
    })),
    viewDef: (id: string) => {
      const def = actual.VIEWS.find((v) => v.id === id) ?? actual.VIEWS[0]!;
      return { ...def, component: lazy(async () => stub(`view:${def.id}`)) };
    },
  };
});

beforeEach(() => {
  resetAppPrefs({ onboarded: true });
  store.setPrefs({ locale: 'fr' });
  location.hash = '#/today';
});

afterEach(() => {
  act(() => closeCommandBar());
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe('App shell', () => {
  it('renders navigation, a skip link and the current view, and titles the window', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'view:today' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Aller au contenu' }).getAttribute('href')).toBe(
      '#main',
    );
    const current = screen
      .getAllByRole('link', { name: 'Aujourd’hui' })
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.length).toBeGreaterThan(0);
    expect(document.title).toMatch(/^Aujourd’hui\s·\sPOuxis$/);
    expect(document.documentElement.lang).toBe('fr');
  });

  it('navigates from the sidebar and opens the command bar from the capture button', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('link', { name: 'Tâches' })[0]!);
    expect(await screen.findByRole('heading', { name: 'view:tasks' })).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: /Capturer/ })[0]!);
    expect(getCommandBarState().open).toBe(true);
  });

  it('applies the theme preference to <html> and runs keymap shortcuts', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'view:today' });
    act(() => setAppPrefs({ theme: 'dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(getCommandBarState().open).toBe(true);
    act(() => closeCommandBar());
    fireEvent.keyDown(window, { key: '3', altKey: true });
    expect(await screen.findByRole('heading', { name: 'view:calendar' })).toBeTruthy();
  });

  it('shows the introduction on first run, then the app', async () => {
    resetAppPrefs({ onboarded: false });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Passer l’introduction' }));
    expect(getAppPrefs().onboarded).toBe(true);
    expect(await screen.findByRole('heading', { name: 'view:today' })).toBeTruthy();
  });

  it('renders only the quick-capture composer on #/capture', async () => {
    location.hash = '#/capture';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('main', { name: 'Capture rapide' })).toBeTruthy());
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
