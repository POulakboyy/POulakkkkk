import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SwipeableRow } from './SwipeableRow.tsx';

afterEach(cleanup);

describe('SwipeableRow', () => {
  it('offers every swipe action through an accessible menu', async () => {
    const user = userEvent.setup();
    const snooze = vi.fn();
    const archive = vi.fn();
    render(
      <SwipeableRow
        menuLabel="Actions pour Relire"
        leading={[{ id: 'done', label: 'Terminer', icon: null, onAction: () => {} }]}
        trailing={[
          { id: 'snooze', label: 'Reporter', icon: null, onAction: snooze },
          { id: 'archive', label: 'Archiver', icon: null, removes: true, onAction: archive },
        ]}
      >
        <p>Relire</p>
      </SwipeableRow>,
    );
    const trigger = screen.getByRole('button', { name: 'Actions pour Relire' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Terminer',
      'Reporter',
      'Archiver',
    ]);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(snooze).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Relire')).toBeTruthy();
    await user.keyboard('{Enter}{End}{Enter}');
    expect(archive).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Relire')).toBeNull();
  });

  it('swallows the click that follows a cancelled horizontal swipe', () => {
    const onClick = vi.fn();
    render(
      <SwipeableRow
        trailing={[{ id: 'snooze', label: 'Reporter', icon: null, onAction: () => {} }]}
      >
        <button type="button" onClick={onClick}>
          Relire
        </button>
      </SwipeableRow>,
    );
    const row = screen.getByRole('button', { name: 'Relire' });
    fireEvent.pointerDown(row, { clientX: 100, clientY: 10, pointerType: 'mouse', button: 0 });
    fireEvent.pointerMove(row, { clientX: 85, clientY: 10, pointerType: 'mouse' });
    fireEvent.pointerUp(row, { clientX: 100, clientY: 10, pointerType: 'mouse' });
    fireEvent.click(row);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
