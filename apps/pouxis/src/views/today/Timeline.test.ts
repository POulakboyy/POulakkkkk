import { describe, expect, it } from 'vitest';
import type { TimelineItem } from './model.ts';
import { chronological } from './Timeline.tsx';

const H = 3_600_000;

const item = (id: string, start: number, end: number): TimelineItem => ({
  id,
  kind: 'event',
  title: id,
  icon: '•',
  color: 1,
  fixed: false,
  done: false,
  start,
  end,
});

describe('chronological', () => {
  it('interleaves blocks and free gaps by start time so Tab follows the day', () => {
    const items = [item('b', 10 * H, 11 * H), item('a', 8 * H, 9 * H)];
    const gaps = [
      { start: 9 * H, end: 10 * H },
      { start: 11 * H, end: 12 * H },
    ];
    const order = chronological(items, gaps).map((e) =>
      e.kind === 'gap' ? `gap@${e.gap.start / H}` : e.item.id,
    );
    expect(order).toEqual(['a', 'gap@9', 'b', 'gap@11']);
  });

  it('keeps the original order of blocks that start together (lanes)', () => {
    const items = [item('first', 8 * H, 9 * H), item('second', 8 * H, 10 * H)];
    const order = chronological(items, []).map((e) => (e.kind === 'item' ? e.item.id : ''));
    expect(order).toEqual(['first', 'second']);
  });
});
