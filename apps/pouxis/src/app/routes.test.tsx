import { cleanup, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { split } from './routes.ts';

afterEach(cleanup);

const view = (name: string) => async () => ({ default: () => <h1>{name}</h1> });

describe('code-split views', () => {
  it('suspends on a first visit, then renders the loaded module', async () => {
    const { component: View } = split(view('cold'));
    render(
      <Suspense fallback={<p>loading</p>}>
        <View />
      </Suspense>,
    );
    expect(screen.getByText('loading')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'cold' })).toBeTruthy();
  });

  it('renders a prefetched view synchronously, without the fallback', async () => {
    const load = vi.fn(view('warm'));
    const { component: View, preload } = split(load);
    await preload();
    render(
      <Suspense fallback={<p>loading</p>}>
        <View />
      </Suspense>,
    );
    expect(screen.queryByText('loading')).toBeNull();
    expect(screen.getByRole('heading', { name: 'warm' })).toBeTruthy();
  });
});
