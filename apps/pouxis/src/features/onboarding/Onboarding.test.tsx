import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppPrefs, resetAppPrefs } from '../../app/appPrefs.ts';
import { store } from '../../store/index.ts';
import { Onboarding } from './Onboarding.tsx';
import {
  microphoneAvailable,
  notificationState,
  requestMicrophone,
  requestNotifications,
} from './permissions.ts';

beforeEach(() => {
  resetAppPrefs();
  store.setPrefs({
    locale: 'fr',
    workingHours: { start: 9 * 60, end: 18 * 60, days: [1, 2, 3, 4, 5] },
  });
});
afterEach(cleanup);

describe('Onboarding', () => {
  it('walks through the four screens and finishes', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'Bienvenue dans POuxis' })).toBeTruthy();
    expect(screen.getByText('Étape 1 sur 4')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    const hours = screen.getByRole('heading', { name: 'Vos heures de travail' });
    expect(document.activeElement).toBe(hours);

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    await user.click(screen.getByRole('radio', { name: /Plutôt le soir/ }));
    expect(getAppPrefs().chronotype).toBe('evening');

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(
      screen.getByRole('heading', { name: 'Deux autorisations, si vous le souhaitez' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Ouvrir ma journée' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('changes the language from the first screen', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: 'English' }));
    expect(store.prefs().locale).toBe('en');
    expect(await screen.findByRole('heading', { name: 'Welcome to POuxis' })).toBeTruthy();
  });

  it('saves valid working days and blocks an end before the start', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'samedi' }));
    expect(store.prefs().workingHours.days).toEqual([1, 2, 3, 4, 5, 6]);

    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '08:00' } });
    expect(screen.getByRole('alert').textContent).toContain('L’heure de fin');
    expect(screen.getByRole('button', { name: 'Suivant' })).toHaveProperty('disabled', true);
    expect(store.prefs().workingHours.end).toBe(18 * 60);
  });

  it('moves through the rhythm choices with the arrow keys, one tab stop for the group', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    const radios = screen.getAllByRole('radio');
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);

    const start = radios.findIndex((r) => r.tabIndex === 0);
    radios[start]!.focus();
    await user.keyboard('{ArrowDown}');
    const next = (start + 1) % radios.length;
    expect(document.activeElement).toBe(radios[next]);
    expect(radios[next]!.getAttribute('aria-checked')).toBe('true');
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(radios[start]);
  });

  it('can be skipped at any time', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: 'Passer l’introduction' }));
    expect(onDone).toHaveBeenCalled();
  });
});

describe('permissions', () => {
  it('reports unavailable APIs instead of throwing', async () => {
    expect(notificationState({})).toBe('unavailable');
    expect(await requestNotifications({})).toBe('unavailable');
    expect(microphoneAvailable({})).toBe(false);
    expect(await requestMicrophone({})).toBe('unavailable');
  });

  it('requests notifications and releases the microphone right after the grant', async () => {
    const Notification = { permission: 'default', requestPermission: async () => 'granted' };
    expect(await requestNotifications({ Notification })).toBe('granted');
    const stop = vi.fn();
    const navigator = {
      mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop }] }) },
    };
    expect(await requestMicrophone({ navigator })).toBe('granted');
    expect(stop).toHaveBeenCalled();
    const refused = { mediaDevices: { getUserMedia: () => Promise.reject(new Error('no')) } };
    expect(await requestMicrophone({ navigator: refused })).toBe('denied');
  });
});
