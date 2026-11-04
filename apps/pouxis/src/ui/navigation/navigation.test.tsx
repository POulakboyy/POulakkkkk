import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl.tsx';
import { Tabs } from './Tabs.tsx';

afterEach(cleanup);

const tabs = [
  { value: 'a', label: 'Tout', panel: <p>Panel A</p> },
  { value: 'b', label: 'Aujourd’hui', panel: <p>Panel B</p> },
  { value: 'c', label: 'Archivées', disabled: true, panel: <p>Panel C</p> },
  { value: 'd', label: 'Plus tard', panel: <p>Panel D</p> },
] as const;

describe('Tabs', () => {
  it('links tabs and panels and keeps a single tab stop', () => {
    render(<Tabs label="Sections" items={tabs} />);
    const [first, second] = screen.getAllByRole('tab');
    expect(first!.getAttribute('aria-selected')).toBe('true');
    expect(first!.tabIndex).toBe(0);
    expect(second!.tabIndex).toBe(-1);
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(first!.id);
    expect(first!.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('selects with arrows (automatic activation), skips disabled, Home/End', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs label="Sections" items={tabs} onChange={onChange} />);
    screen.getAllByRole('tab')[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel B');
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('d');
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement?.textContent).toBe('Plus tard');
  });

  it('moves focus only with manual activation, selecting on Enter', async () => {
    const user = userEvent.setup();
    render(<Tabs label="Sections" items={tabs} activation="manual" />);
    screen.getAllByRole('tab')[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel A');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel B');
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'day', label: 'Jour' },
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
  ] as const;

  it('is a radio group with roving focus that selects on arrows', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl label="Période" options={options} defaultValue="day" onChange={onChange} />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Période' });
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    radios[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('week');
    expect(document.activeElement).toBe(radios[1]);
    expect(radios[1]!.getAttribute('aria-checked')).toBe('true');
    expect(group.style.getPropertyValue('--index')).toBe('1');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('month');
    await user.click(radios[0]!);
    expect(onChange).toHaveBeenLastCalledWith('day');
  });
});
