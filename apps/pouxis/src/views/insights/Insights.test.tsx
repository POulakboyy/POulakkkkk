import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../store/index.ts';
import { BalanceChart } from './BalanceChart.tsx';
import { EnergyHeatmap } from './EnergyHeatmap.tsx';
import { SkillTree, branchIndex } from './SkillTree.tsx';
import { StaleList } from './StaleList.tsx';
import { StreakCard } from './StreakCard.tsx';
import { WeeklyReview, ratioPosition } from './WeeklyReview.tsx';
import InsightsView from './index.tsx';
import { demoRecords } from './fixtures.test-utils.ts';
import { computeInsights } from './model.ts';

const TZ = 'Europe/Paris';
const NOW = Date.UTC(2026, 10, 5, 17);
const records = demoRecords(NOW, TZ);
const model = computeInsights({ ...records, now: NOW, timeZone: TZ, weekOffset: 0 });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EnergyHeatmap', () => {
  it('summarises the peak and reads cells with the keyboard', () => {
    render(<EnergyHeatmap energy={model.energy} />);
    const plot = screen.getByRole('img', { name: /carte de chaleur de l’énergie/i });
    expect(plot.getAttribute('tabindex')).toBe('0');
    act(() => plot.focus());
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    // Starts on Monday 9 h, one step right is 10 h.
    expect(screen.getByText(/^lundi 10 h · énergie/)).toBeTruthy();
    fireEvent.keyDown(plot, { key: 'ArrowDown' });
    expect(screen.getByText(/^mardi 10 h · énergie/)).toBeTruthy();
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(screen.getByText(/Survolez ou parcourez la carte/)).toBeTruthy();
  });

  it('offers a 24-row table instead of the chart', () => {
    render(<EnergyHeatmap energy={model.energy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Afficher en tableau' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(25);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(8);
    const toggle = screen.getByRole('button', { name: 'Afficher en tableau' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('BalanceChart', () => {
  it('shows shares with a legend and names each day column', () => {
    render(<BalanceChart balance={model.balance} today="2026-11-05" />);
    expect(screen.getByText('Création')).toBeTruthy();
    expect(screen.getByText('Organisation')).toBeTruthy();
    const columns = screen.getAllByRole('img', {
      name: /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*:/,
    });
    expect(columns).toHaveLength(7);
    fireEvent.focus(columns[0]!);
    expect(screen.getByText(/^lundi · /)).toBeTruthy();
  });

  it('invites to start tracking when the week is empty', () => {
    const empty = { ...model.balance, total: 0 };
    render(<BalanceChart balance={empty} today="2026-11-05" />);
    expect(screen.getByText(/Pas encore de temps suivi/)).toBeTruthy();
  });
});

describe('StreakCard', () => {
  it('shows the streak, jokers as rings and a labelled day strip', () => {
    const { container } = render(<StreakCard streak={model.streak} strip={model.strip} />);
    expect(screen.getByText(`${model.streak.current} jours`)).toBeTruthy();
    expect(container.querySelectorAll('svg[data-available]')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(model.strip.length);
    expect(screen.getByText(/jeudi 5 novembre : journée de création \(aujourd’hui\)/)).toBeTruthy();
  });

  it('frames a pause without guilt', () => {
    const paused = { ...model.streak, current: 4, status: 'paused' as const };
    render(<StreakCard streak={paused} strip={model.strip} />);
    expect(screen.getByText(/Série en pause/)).toBeTruthy();
  });
});

describe('WeeklyReview', () => {
  const props = {
    review: model.review,
    blockers: model.blockers,
    ready: true,
    weekOffset: 0,
    onWeekChange: vi.fn(),
  };

  it('lists wins first, ending on the biggest one', () => {
    render(<WeeklyReview {...props} />);
    expect(screen.getByText('Votre point de la semaine est prêt')).toBeTruthy();
    const wins = within(
      screen.getByRole('region', { name: 'Victoires de la semaine' }),
    ).getAllByRole('listitem');
    expect(wins.length).toBe(model.review.wins.length);
    expect(wins.at(-1)?.textContent).toContain('La plus marquante');
    expect(screen.getByText('Les réunions déborde sur la matinée de création')).toBeTruthy();
  });

  it('navigates weeks without going into the future', () => {
    const onWeekChange = vi.fn();
    render(<WeeklyReview {...props} onWeekChange={onWeekChange} />);
    expect(
      (screen.getByRole('button', { name: 'Semaine suivante' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    expect(onWeekChange).toHaveBeenCalledWith(-1);
  });

  it('places estimate ratios on a log scale centred on 100 %', () => {
    expect(ratioPosition(1)).toBe(0.5);
    expect(ratioPosition(0.5)).toBe(0);
    expect(ratioPosition(4)).toBe(1);
  });
});

describe('SkillTree', () => {
  it('describes the tree and colours nodes by main branch', () => {
    render(<SkillTree root={model.skills} />);
    expect(
      screen.getByRole('img', { name: /Arbre de compétences\s*:\s*\d+\s*branches/ }),
    ).toBeTruthy();
    const colours = branchIndex(model.skills);
    const first = model.skills.children[0]!;
    expect(colours.get(first.id)).toBe(0);
    for (const child of first.children) expect(colours.get(child.id)).toBe(0);
  });

  it('falls back to a table without the root row', () => {
    render(<SkillTree root={model.skills} />);
    fireEvent.click(screen.getByRole('button', { name: 'Afficher en tableau' }));
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(1 + countNodes(model.skills) - 1);
  });
});

describe('StaleList', () => {
  it('keeps a dormant thread by touching it, with undo', () => {
    const update = vi.spyOn(store, 'update').mockImplementation(() => {});
    render(<StaleList variant="deadEnds" items={model.deadEnds} />);
    const first = model.deadEnds[0]!;
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`^Garder\\s*:\\s*${first.title}$`) }),
    );
    expect(update).toHaveBeenCalledWith(first.kind, first.id, {});
  });

  it('archives a task only on request', () => {
    const update = vi.spyOn(store, 'update').mockImplementation(() => {});
    render(<StaleList variant="archive" items={model.archive} />);
    const item = model.archive[0]!;
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`^Archiver\\s*:\\s*${item.title}$`) }),
    );
    expect(update).toHaveBeenCalledWith('tasks', item.id, { status: 'archived' });
  });
});

describe('InsightsView', () => {
  it('renders the page heading and its privacy promise', () => {
    render(<InsightsView now={NOW} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Bilan' })).toBeTruthy();
    expect(screen.getByText('Calculé sur cet appareil. Rien n’en sort.')).toBeTruthy();
  });
});

function countNodes(n: { children: readonly unknown[] }): number {
  return (
    1 + (n.children as { children: readonly unknown[] }[]).reduce((a, c) => a + countNodes(c), 0)
  );
}
