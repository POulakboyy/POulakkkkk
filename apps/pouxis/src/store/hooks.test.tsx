import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { store, useCollection, useHistory, usePrefs, useRecord, useStoreReady } from './index.ts';

function Probe({ id }: { id?: string }) {
  const notes = useCollection('notes');
  const note = useRecord('notes', id);
  const prefs = usePrefs();
  const history = useHistory();
  const ready = useStoreReady();
  return (
    <output>
      {`${notes.length}|${note?.title ?? '-'}|${prefs.wipLimit}|${history.canUndo}|${ready}`}
    </output>
  );
}

describe('store hooks', () => {
  it('starts seeded and re-renders on changes, undo included', async () => {
    expect(store.all('tasks').length).toBeGreaterThan(0);
    const before = store.all('notes').length;
    const { rerender } = render(<Probe />);
    expect(screen.getByRole('status').textContent).toBe(`${before}|-|5|false|true`);

    let id = '';
    await act(async () => {
      id = store.create('notes', { title: 'Hook', body: '', tags: [], links: [] }).id;
      store.setPrefs({ wipLimit: 4 });
    });
    rerender(<Probe id={id} />);
    expect(screen.getByRole('status').textContent).toBe(`${before + 1}|Hook|4|true|true`);

    await act(async () => {
      store.undo();
    });
    expect(screen.getByRole('status').textContent).toBe(`${before}|-|4|false|true`);
  });
});
