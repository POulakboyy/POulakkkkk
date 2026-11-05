import { render, screen } from '@testing-library/react';
import { it, vi } from 'vitest';
import { NOW, fakeStore, makeTask } from './shared/fixtures.test-utils.ts';
vi.mock('../../store/index.ts', async () => {
  const m = await import('./shared/fixtures.test-utils.ts');
  return m.fakeStoreModule(m.fakeStore);
});
const { labFeatures } = await import('./index.ts');
const { FreshStart } = await import('./freshstart/FreshStart.tsx');
it('dbg', () => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  const Wins = labFeatures.find((f) => f.id === 'wins')!.Component;
  const { container } = render(<Wins />);
  console.log(container.innerHTML.slice(0, 700));
  fakeStore.seed('tasks', [makeTask({ title: 'X', postponedCount: 5 })]);
  render(<FreshStart />);
  console.log(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') + '|' + b.textContent).join('\n'));
});
