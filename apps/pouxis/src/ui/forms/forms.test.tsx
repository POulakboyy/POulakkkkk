import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { platform } from '../../platform/index.ts';
import { Checkbox } from './Checkbox.tsx';
import { Switch } from './Switch.tsx';
import { TextField } from './TextField.tsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Checkbox', () => {
  it('toggles via its label and fires a success haptic only when checking', async () => {
    const user = userEvent.setup();
    const haptic = vi.spyOn(platform, 'haptic').mockImplementation(() => {});
    const onChange = vi.fn();
    render(<Checkbox label="Écrire l’intro" onCheckedChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Écrire l’intro' }) as HTMLInputElement;
    await user.click(screen.getByText('Écrire l’intro'));
    expect(box.checked).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(haptic).toHaveBeenCalledWith('success');
    await user.keyboard(' ');
    expect(box.checked).toBe(false);
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it('exposes the mixed state and description', () => {
    render(<Checkbox label="Tout" description="3 sur 5" indeterminate checked={false} />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(document.getElementById(box.getAttribute('aria-describedby')!)?.textContent).toBe(
      '3 sur 5',
    );
  });
});

describe('Switch', () => {
  it('has the switch role and toggles', async () => {
    const user = userEvent.setup();
    vi.spyOn(platform, 'haptic').mockImplementation(() => {});
    render(<Switch label="Sons" />);
    const sw = screen.getByRole('switch', { name: 'Sons' }) as HTMLInputElement;
    await user.click(sw);
    expect(sw.checked).toBe(true);
  });
});

describe('TextField', () => {
  it('wires label, hint and error to the input', () => {
    render(<TextField label="Durée" hint="En minutes" error="Entrez un nombre" />);
    const input = screen.getByRole('textbox', { name: 'Durée' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
      'Entrez un nombre',
      'En minutes',
    ]);
  });
});
