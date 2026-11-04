import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../actions/Button.tsx';
import { Dialog } from './Dialog.tsx';
import { Menu } from './Menu.tsx';
import { Popover } from './Popover.tsx';

afterEach(cleanup);

function MenuFixture({ onSelect = () => {} }: { onSelect?: (id: string) => void }) {
  return (
    <>
      <Menu
        label="Actions"
        trigger={<Button>Actions</Button>}
        items={[
          { id: 'edit', label: 'Modifier', onSelect: () => onSelect('edit') },
          { id: 'dup', label: 'Dupliquer', onSelect: () => onSelect('dup') },
          { id: 'sep', type: 'separator' },
          { id: 'off', label: 'Déplacer', disabled: true, onSelect: () => onSelect('off') },
          { id: 'del', label: 'Supprimer', danger: true, onSelect: () => onSelect('del') },
        ]}
      />
      <button type="button">Outside</button>
    </>
  );
}

describe('Menu', () => {
  it('opens from the keyboard, roves with arrows (skipping disabled), wraps and selects', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MenuFixture onSelect={onSelect} />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Modifier' }));
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Supprimer' }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Modifier' }));
    await user.keyboard('{End}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('del');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('opens on the last item with ArrowUp and supports typeahead', async () => {
    const user = userEvent.setup();
    render(<MenuFixture />);
    screen.getByRole('button', { name: 'Actions' }).focus();
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Supprimer' }));
    await user.keyboard('d');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Dupliquer' }));
  });

  it('closes on Escape and restores focus, and on outside click', async () => {
    const user = userEvent.setup();
    render(<MenuFixture />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

function DialogFixture() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div id="page">
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Planifier"
        description="Trois priorités."
        footer={<button type="button">Save</button>}
      >
        <input aria-label="Priorité" />
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('traps focus, makes the page inert, closes on Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<DialogFixture />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Planifier' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    // First tabbable: the close button.
    const close = screen.getByRole('button', { name: 'Fermer' });
    expect(document.activeElement).toBe(close);
    expect(document.getElementById('page')?.closest('[inert]')).toBeTruthy();
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Priorité' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save' }));
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.querySelector('[inert]')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });
});

describe('Popover', () => {
  it('toggles aria-expanded, moves focus in, closes on Escape back to the trigger', async () => {
    const user = userEvent.setup();
    render(
      <Popover label="Filtres" trigger={<button type="button">Filtres</button>}>
        <button type="button">Appliquer</button>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Filtres' });
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('dialog', { name: 'Filtres' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Appliquer' }));
    act(() => {
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('overlay stack', () => {
  it('does not let Escape reach a layer beneath a modal that refuses it', async () => {
    const { pushLayer } = await import('./layers.ts');
    const below = document.createElement('div');
    const above = document.createElement('div');
    document.body.append(below, above);
    const onBelow = vi.fn();
    const popBelow = pushLayer({ node: below, modal: true, onEscape: onBelow });
    const popAbove = pushLayer({ node: above, modal: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBelow).not.toHaveBeenCalled();
    popAbove();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBelow).toHaveBeenCalledTimes(1);
    popBelow();
    below.remove();
    above.remove();
  });
});
