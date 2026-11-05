import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAppPrefs, resetAppPrefs } from '../../app/appPrefs.ts';
import { store } from '../../store/index.ts';
import { buildExport, exportBaseName, snapshot, zipEntries } from './export.ts';
import { minutesToTime, timeToMinutes, toggleDay, weekdayName } from './hours.ts';
import SettingsView from './index.tsx';
import { actionLabelKey } from './sections/Keyboard.tsx';
import { timeZoneOptions } from './sections/Language.tsx';
import { crc32 } from './zip.ts';

const NOW = new Date(Date.UTC(2026, 10, 5, 12));

describe('hours helpers', () => {
  it('converts between minutes and time input values', () => {
    expect(minutesToTime(9 * 60 + 5)).toBe('09:05');
    expect(minutesToTime(-3)).toBe('00:00');
    expect(timeToMinutes('18:30')).toBe(18 * 60 + 30);
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('nope')).toBeNull();
  });

  it('toggles days in sorted order and names weekdays independently of the machine zone', () => {
    expect(toggleDay([1, 5], 3)).toEqual([1, 3, 5]);
    expect(toggleDay([1, 3], 3)).toEqual([1]);
    expect(weekdayName(1, 'fr', 'long')).toBe('lundi');
    expect(weekdayName(0, 'en', 'long')).toBe('Sunday');
  });
});

describe('export', () => {
  const fake = {
    all: (name: string) => (name === 'tasks' ? [{ id: 't1', title: 'Écrire' }] : []),
    prefs: () => store.prefs(),
  } as never;

  it('snapshots every collection with a versioned schema', () => {
    const snap = snapshot(fake, NOW);
    expect(snap.schema).toBe('pouxis-export');
    expect(snap.exportedAt).toBe('2026-11-05T12:00:00.000Z');
    expect(Object.keys(snap.collections)).toEqual([
      'tasks',
      'events',
      'notes',
      'journal',
      'graphs',
    ]);
  });

  it('builds a JSON file and a zip with a manifest and one file per collection', () => {
    expect(exportBaseName(NOW)).toBe('pouxis-2026-11-05');
    const json = buildExport(fake, 'json', NOW);
    expect(json.name).toBe('pouxis-2026-11-05.json');
    expect(JSON.parse(new TextDecoder().decode(json.bytes)).collections.tasks).toHaveLength(1);

    const names = zipEntries(snapshot(fake, NOW), NOW).map((e) => e.name);
    expect(names).toEqual([
      'manifest.json',
      'prefs.json',
      'tasks.json',
      'events.json',
      'notes.json',
      'journal.json',
      'graphs.json',
    ]);
    const zip = buildExport(fake, 'zip', NOW);
    expect(zip.type).toBe('application/zip');
    // Local file header signature, then the end-of-central-directory signature at the end.
    expect([...zip.bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect([...zip.bytes.slice(-22, -18)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('misc', () => {
  it('maps keymap actions to label keys and keeps the current zone in the list', () => {
    expect(actionLabelKey('command.open')).toBe('settings.keyboard.actions.commandOpen');
    expect(actionLabelKey('move.previous')).toBe('settings.keyboard.actions.movePrevious');
    expect(timeZoneOptions('Mars/Olympus')[0]).toBe('Mars/Olympus');
  });
});

describe('SettingsView', () => {
  beforeEach(() => {
    resetAppPrefs({ onboarded: true });
    store.setPrefs({ locale: 'fr', wipLimit: 5 });
    location.hash = '#/settings';
  });
  afterEach(cleanup);

  it('lists every section in its navigation', () => {
    render(<SettingsView />);
    const nav = screen.getByRole('navigation', { name: 'Sections des réglages' });
    expect(within(nav).getAllByRole('link')).toHaveLength(8);
    expect(screen.getByRole('heading', { level: 2, name: 'Clavier' })).toBeTruthy();
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'location');
    expect(current.map((link) => link.textContent)).toEqual(['Apparence']);
  });

  it('switches theme and steps the priorities per day', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('radio', { name: 'Sombre' }));
    expect(getAppPrefs().theme).toBe('dark');
    const wip = screen.getByRole('group', { name: 'Priorités par jour' });
    await user.click(within(wip).getByRole('button', { name: 'Augmenter' }));
    expect(store.prefs().wipLimit).toBe(6);
  });

  it('validates the JSON keymap before applying it', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    const editor = screen.getByRole('textbox', { name: 'Raccourcis personnalisés (JSON)' });
    fireEvent.change(editor, { target: { value: '{\n  "nav.nowhere": []\n}' } });
    expect(screen.getByText(/ligne 2 : l’action « nav.nowhere » n’existe pas/)).toBeTruthy();
    const apply = screen.getByRole('button', { name: 'Appliquer' });
    expect(apply).toHaveProperty('disabled', true);

    fireEvent.change(editor, { target: { value: '{ "nav.today": ["g x"] }' } });
    expect(screen.getByText('Configuration valide')).toBeTruthy();
    await user.click(apply);
    expect(getAppPrefs().keymap).toBe('{ "nav.today": ["g x"] }');
  });

  it('refuses a short sync passphrase without contacting the relay', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.type(screen.getByLabelText('Adresse du relais'), 'https://relay.example');
    await user.type(screen.getByLabelText('Jeton d’accès'), 'token');
    await user.type(screen.getByLabelText('Phrase de passe'), 'court');
    await user.click(screen.getByRole('button', { name: 'Connecter cet appareil' }));
    expect(screen.getByText('Au moins 15 caractères, pour un chiffrement solide.')).toBeTruthy();
    expect(store.syncInfo().configured).toBe(false);
  });
});
