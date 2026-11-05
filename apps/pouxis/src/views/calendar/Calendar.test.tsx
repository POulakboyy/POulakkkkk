import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS, HOUR, fromZoned, type CalendarEvent } from '@pouxis/core';
import { store } from '../../store/index.ts';
import CalendarView from './index.tsx';
import { MonthGrid } from './MonthGrid.tsx';
import { SpiralView } from './SpiralView.tsx';
import { TimeGrid, type TimeGridProps } from './TimeGrid.tsx';
import { expandEvents } from './model/expand.ts';
import { visibleDays } from './model/range.ts';

const TZ = 'Europe/Paris';
const at = (day: number, hour: number, minute = 0) =>
  fromZoned({ year: 2026, month: 11, day, hour, minute }, TZ);

function event(
  id: string,
  start: number,
  end: number,
  extra: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    title: id,
    start,
    end,
    timeZone: TZ,
    fixed: false,
    kind: 'meeting',
    attendees: [],
    tags: [],
    ...extra,
  };
}

beforeEach(() => {
  localStorage.clear();
  store.setPrefs({ timeZone: TZ, locale: 'fr' });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TimeGrid', () => {
  const days = visibleDays(at(4, 12), 'week', TZ);
  const events = [
    event('review', at(4, 10), at(4, 11)),
    event('standup', at(2, 9, 30), at(2, 9, 45), { recurrence: 'FREQ=DAILY;COUNT=3' }),
  ];
  const instances = expandEvents(events, { start: days[0]!, end: at(9, 0) }, 'fr');

  function renderGrid(overrides: Partial<TimeGridProps> = {}) {
    const handlers = {
      onCreate: vi.fn(),
      onOpen: vi.fn(),
      onRetime: vi.fn(),
      onDelete: vi.fn(),
    };
    render(
      <TimeGrid
        days={days}
        timeZone={TZ}
        instances={instances}
        now={at(4, 15)}
        workingHours={DEFAULT_PREFS.workingHours}
        zones={[]}
        heatmap={null}
        ghosts={[]}
        {...handlers}
        {...overrides}
      />,
    );
    return handlers;
  }

  it('shows one column per day and every occurrence of a recurring event', () => {
    renderGrid();
    expect(screen.getAllByRole('group', { name: /Flèches haut et bas/ })).toHaveLength(7);
    expect(screen.getAllByRole('button', { name: /^standup/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: /^review, 10:00/ })).toBeTruthy();
  });

  it('moves, resizes and deletes an event from the keyboard', () => {
    const { onRetime, onDelete } = renderGrid();
    const review = screen.getByRole('button', { name: /^review/ });
    fireEvent.keyDown(review, { key: 'ArrowDown' });
    expect(onRetime).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'review' }), {
      start: at(4, 10, 15),
      end: at(4, 11, 15),
    });
    fireEvent.keyDown(review, { key: 'ArrowUp', shiftKey: true });
    expect(onRetime).toHaveBeenLastCalledWith(expect.anything(), {
      start: at(4, 10),
      end: at(4, 10, 45),
    });
    fireEvent.keyDown(review, { key: 'ArrowRight' });
    expect(onRetime).toHaveBeenLastCalledWith(expect.anything(), {
      start: at(5, 10),
      end: at(5, 11),
    });
    fireEvent.keyDown(review, { key: 'Delete' });
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ key: 'review' }));
  });

  it('creates a one-hour slot from the keyboard cursor', () => {
    const { onCreate } = renderGrid();
    const wednesday = screen.getAllByRole('group', { name: /Flèches haut et bas/ })[2]!;
    act(() => wednesday.focus());
    fireEvent.keyDown(wednesday, { key: 'ArrowDown' });
    fireEvent.keyDown(wednesday, { key: 'Enter' });
    // 4 Nov 15:00 is in working hours: the cursor starts there, one step down is 15:30.
    expect(onCreate).toHaveBeenCalledWith({ start: at(4, 15, 30), end: at(4, 16, 30) });
  });

  it('opens an event on click and draws a new one by dragging', () => {
    const { onOpen, onCreate } = renderGrid();
    fireEvent.click(screen.getByRole('button', { name: /^review/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ key: 'review' }));

    const monday = screen.getAllByRole('group', { name: /Flèches haut et bas/ })[0]!;
    vi.spyOn(monday, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 24 * 48));
    fireEvent.pointerDown(monday, { button: 0, pointerId: 1, clientX: 10, clientY: 9 * 48 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 10, clientY: 10.5 * 48 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10.5 * 48 });
    expect(onCreate).toHaveBeenCalledWith({ start: at(2, 9), end: at(2, 10, 30) });
  });

  it('aligns collaborator zones and highlights the shared working window', () => {
    const { container } = render(
      <TimeGrid
        days={[at(4, 0)]}
        timeZone={TZ}
        instances={[]}
        now={at(4, 15)}
        workingHours={DEFAULT_PREFS.workingHours}
        zones={['America/New_York']}
        heatmap={null}
        ghosts={[]}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onRetime={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('New York')).toBeTruthy();
    expect(screen.getByText('−6 h')).toBeTruthy();
    const band = container.querySelector<HTMLElement>('[class*="shared"]');
    // 15:00–18:00 in Paris is 9:00–12:00 in New York.
    expect(band?.style.top).toBe(`${15 * 48}px`);
    expect(band?.style.height).toBe(`${3 * 48}px`);
  });
});

describe('MonthGrid', () => {
  it('lists six weeks, summarises busy days and navigates with arrows', () => {
    const days = visibleDays(at(4, 12), 'month', TZ);
    const instances = expandEvents(
      [event('a', at(4, 9), at(4, 10)), event('b', at(4, 11), at(4, 12))],
      { start: days[0]!, end: days[41]! + 24 * HOUR },
      'fr',
    );
    const onOpenDay = vi.fn();
    render(
      <MonthGrid
        days={days}
        anchor={at(4, 12)}
        now={at(4, 12)}
        timeZone={TZ}
        instances={instances}
        onOpenDay={onOpenDay}
        onOpenEvent={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(7);
    const today = screen.getByRole('button', { name: /mercredi 4 novembre, 2 événements/ });
    expect(today.getAttribute('aria-current')).toBe('date');
    expect(today.tabIndex).toBe(0);
    act(() => today.focus());
    fireEvent.keyDown(today, { key: 'ArrowDown' });
    const next = screen.getByRole('button', { name: /mercredi 11 novembre, aucun événement/ });
    expect(document.activeElement).toBe(next);
    fireEvent.click(next);
    expect(onOpenDay).toHaveBeenCalledWith(at(11, 0));
  });
});

describe('SpiralView', () => {
  it('lists upcoming events and zooms with buttons and keys', () => {
    const onSpanChange = vi.fn();
    const onOpen = vi.fn();
    const now = at(4, 9);
    render(
      <SpiralView
        events={[event('Atelier', at(4, 14), at(4, 15)), event('Passé', at(3, 9), at(3, 10))]}
        now={now}
        timeZone={TZ}
        locale="fr"
        span="day"
        onSpanChange={onSpanChange}
        onOpen={onOpen}
      />,
    );
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(within(list).getByRole('button', { name: /Atelier/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ key: 'Atelier' }));
    expect(screen.getByRole('button', { name: 'Rapprocher' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Éloigner' }));
    expect(onSpanChange).toHaveBeenLastCalledWith('week');
    const spiral = screen.getByRole('group', { name: 'Spirale du temps' });
    expect(spiral.querySelectorAll('path[stroke]').length).toBe(2);
    fireEvent.keyDown(spiral, { key: 'ArrowLeft' });
    expect(screen.getByRole('button', { name: 'Recentrer sur maintenant' })).toBeTruthy();
  });
});

describe('CalendarView', () => {
  it('creates an event from the dialog', async () => {
    render(<CalendarView />);
    const before = store.all('events').length;
    fireEvent.click(screen.getAllByRole('button', { name: 'Nouvel événement' })[0]!);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Titre'), { target: { value: 'Atelier typo' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Créer l’événement' }));
    const created = store.all('events').find((e) => e.title === 'Atelier typo');
    expect(created).toBeTruthy();
    expect(created!.end - created!.start).toBe(HOUR);
    expect(store.all('events')).toHaveLength(before + 1);
  });

  it('fills the form from a natural-language line', async () => {
    render(<CalendarView />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Nouvel événement' })[0]!);
    const dialog = await screen.findByRole('dialog');
    const quick = within(dialog).getByPlaceholderText(/Réunion projet X/);
    fireEvent.change(quick, { target: { value: 'Réunion projet demain 14h-16h avec @paul' } });
    fireEvent.keyDown(quick, { key: 'Enter' });
    expect((within(dialog).getByLabelText('Titre') as HTMLInputElement).value).toBe(
      'Réunion projet',
    );
    expect((within(dialog).getByLabelText('Début') as HTMLInputElement).value).toBe('14:00');
    expect((within(dialog).getByLabelText('Fin') as HTMLInputElement).value).toBe('16:00');
    expect(within(dialog).getByText('@paul')).toBeTruthy();
  });

  it('switches between the four modes', () => {
    render(<CalendarView />);
    fireEvent.click(screen.getByRole('radio', { name: 'Mois' }));
    expect(screen.getByRole('grid', { name: 'Vue du mois' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Spirale' }));
    expect(screen.getByRole('group', { name: 'Spirale du temps' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Jour' }));
    expect(screen.getAllByRole('group', { name: /Flèches haut et bas/ })).toHaveLength(1);
  });

  it('opens a deep link on the linked event', () => {
    const start = Date.now() + 2 * HOUR;
    const created = store.create('events', {
      title: 'Ciblé',
      start,
      end: start + HOUR,
      timeZone: TZ,
      fixed: false,
      kind: 'personal',
      attendees: [],
      tags: [],
    });
    localStorage.setItem('pouxis.calendar.mode', '"month"');
    render(<CalendarView />);
    act(() => {
      location.hash = `#/calendar?event=${created.id}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    // The month view switches to the week grid and outlines the event.
    const block = document.querySelector<HTMLElement>(`[data-key="${created.id}"]`);
    expect(block?.className).toMatch(/highlighted/);
  });

  it('copies a deep link to an event', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const created = store.create('events', {
      title: 'Lien',
      start: Date.now() + HOUR,
      end: Date.now() + 2 * HOUR,
      timeZone: TZ,
      fixed: false,
      kind: 'personal',
      attendees: [],
      tags: [],
    });
    render(<CalendarView />);
    fireEvent.click(screen.getByRole('radio', { name: 'Spirale' }));
    fireEvent.click(within(screen.getByRole('list')).getByRole('button', { name: /Lien/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copier le lien du créneau' }));
    expect(writeText).toHaveBeenCalledWith(`pouxis://event/${created.id}`);
  });
});
