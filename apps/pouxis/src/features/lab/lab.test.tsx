import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOW, fakeStore, makeEntry, makeTask } from './shared/fixtures.test-utils.ts';

vi.mock('../../store/index.ts', async () => {
  const m = await import('./shared/fixtures.test-utils.ts');
  return m.fakeStoreModule(m.fakeStore);
});

const { labFeatures } = await import('./index.ts');
const { IntentionBuilder } = await import('./intention/IntentionBuilder.tsx');
const { EnergyCheckIn } = await import('./energy/EnergyCheckIn.tsx');
const { ShutdownRitual } = await import('./shutdown/ShutdownRitual.tsx');
const { WinsJar } = await import('./wins/WinsJar.tsx');
const { BreakCoach } = await import('./breaks/BreakCoach.tsx');

const MIN = 60_000;

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  fakeStore.reset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('labFeatures', () => {
  it('exposes nine features with localised copy', () => {
    expect(labFeatures.map((f) => f.id)).toEqual([
      'intention',
      'premortem',
      'energy',
      'transition',
      'breaks',
      'incubation',
      'wins',
      'freshstart',
      'shutdown',
    ]);
    expect(labFeatures[0]!.title).toBe('Intention du jour');
    act(() => fakeStore.setPrefs({ locale: 'en' }));
    expect(labFeatures[0]!.title).toBe('Daily intention');
    expect(labFeatures.every((f) => f.description.length > 0)).toBe(true);
  });

  it('wraps each component with its research basis', () => {
    const Wins = labFeatures.find((f) => f.id === 'wins')!.Component;
    render(<Wins />);
    expect(screen.getByText(/Amabile et Kramer, 2011/)).toBeTruthy();
  });
});

describe('IntentionBuilder', () => {
  it('composes an if-then sentence from a task and a cue, then saves it', () => {
    fakeStore.seed('tasks', [makeTask({ title: 'Écrire le script', floatingDay: NOW })]);
    render(<IntentionBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /Écrire le script/ }));
    fireEvent.click(screen.getByRole('button', { name: 'après mon café' }));
    expect(screen.getByText(/Quand après mon café, je m’y mets : Écrire le script\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’intention' }));
    const [entry] = fakeStore.all('journal');
    expect(entry?.tags).toContain('lab:intention');
    expect(screen.getByText('Votre intention du jour')).toBeTruthy();
  });

  it('refuses to save without a cue', () => {
    render(<IntentionBuilder />);
    fireEvent.change(screen.getByLabelText(/Je m’y mets/), { target: { value: 'Lire' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’intention' }));
    expect(fakeStore.all('journal')).toHaveLength(0);
    expect(screen.getAllByText('Indiquez l’action et le moment').length).toBeGreaterThan(0);
  });
});

describe('EnergyCheckIn', () => {
  it('records a level and suggests matching tasks', () => {
    fakeStore.seed('tasks', [
      makeTask({ title: 'Classer les factures', energy: 'low', estimateMin: 10 }),
      makeTask({ title: 'Écrire le chapitre', energy: 'high' }),
    ]);
    render(<EnergyCheckIn />);
    fireEvent.click(screen.getByRole('button', { name: /Basse/ }));
    expect(fakeStore.all('journal')[0]?.tags).toContain('lab:energy:low');
    expect(screen.getByRole('button', { name: /Basse/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Classer les factures')).toBeTruthy();
    expect(screen.queryByText('Écrire le chapitre')).toBeNull();
    const curve = screen.getByRole('list', { name: /courbe d’énergie/ });
    expect(within(curve).getAllByRole('listitem')).toHaveLength(18);
  });
});

describe('ShutdownRitual', () => {
  it('walks through the steps, moves open tasks to tomorrow and closes the day', () => {
    const open = makeTask({ title: 'Monter la vidéo', floatingDay: NOW });
    const done = makeTask({ title: 'Relire', status: 'done', completedAt: NOW - 60 * MIN });
    fakeStore.seed('tasks', [open, done]);
    render(<ShutdownRitual />);

    expect(screen.getByText('Relire')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    const group = screen.getByRole('radiogroup', { name: /Monter la vidéo/ });
    expect(within(group).getByRole('radio', { name: 'Demain' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.change(screen.getByLabelText(/Demain, je commence par/), {
      target: { value: 'Exporter la vidéo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clore la journée' }));

    expect(fakeStore.get('tasks', open.id)?.floatingDay).toBeGreaterThan(NOW);
    expect(screen.getByText('Journée close.')).toBeTruthy();
    expect(screen.getByText(/Le meilleur moment : Relire/)).toBeTruthy();
    expect(screen.getByText(/1 reportée à demain/)).toBeTruthy();
  });
});

describe('WinsJar', () => {
  it('adds typed wins and completed tasks to the jar', () => {
    fakeStore.seed('tasks', [
      makeTask({ title: 'Envoyer le devis', status: 'done', completedAt: NOW }),
    ]);
    render(<WinsJar />);
    expect(screen.getByText('Le bocal est vide pour l’instant')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Une victoire/), {
      target: { value: '  Premier jet  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    fireEvent.click(screen.getByRole('button', { name: /Envoyer le devis/ }));

    expect(fakeStore.all('journal').map((e) => e.text)).toEqual([
      'Premier jet',
      'Envoyer le devis',
    ]);
    expect(screen.getByText('2 victoires cette semaine')).toBeTruthy();
    expect(screen.getByRole('img', { name: /2 victoires/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Envoyer le devis/ })).toBeNull();
  });

  it('resurfaces an older win', () => {
    fakeStore.seed('journal', [
      makeEntry({ kind: 'win', text: 'Conférence donnée', createdAt: NOW - 30 * 86_400_000 }),
    ]);
    render(<WinsJar />);
    expect(screen.getByText('Conférence donnée')).toBeTruthy();
  });
});

describe('BreakCoach', () => {
  it('suggests a walking break after a creative stretch and logs it', () => {
    const task = makeTask({
      mode: 'create',
      timeLogs: [{ start: NOW - 26 * MIN, end: NOW, kind: 'focus' }],
    });
    fakeStore.seed('tasks', [task]);
    render(<BreakCoach />);
    expect(screen.getByText('Une pause en marchant')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Commencer la pause/ }));
    expect(screen.getByText('Pause en cours')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la pause' }));
    expect(fakeStore.get('tasks', task.id)?.timeLogs.at(-1)?.kind).toBe('break');
  });

  it('stays silent in free mode', () => {
    fakeStore.seed('tasks', [
      makeTask({ timeLogs: [{ start: NOW - 40 * MIN, end: NOW, kind: 'focus' }] }),
    ]);
    render(<BreakCoach />);
    fireEvent.click(screen.getByRole('radio', { name: 'Libre' }));
    expect(screen.queryByText('Suggestion')).toBeNull();
    expect(screen.getByText(/Pas de suggestion automatique/)).toBeTruthy();
  });
});
