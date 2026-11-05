import { describe, expect, it } from 'vitest';
import { computePosition } from './position.ts';

const viewport = { width: 400, height: 800 };
const size = { width: 200, height: 100 };

describe('computePosition', () => {
  it('places below the anchor, aligned to its start', () => {
    const p = computePosition({ top: 100, left: 20, width: 80, height: 40 }, size, 'bottom-start', {
      viewport,
    });
    expect(p).toMatchObject({ x: 20, y: 148, placement: 'bottom-start', origin: 'top left' });
  });

  it('flips to the top when there is no room below', () => {
    const p = computePosition({ top: 740, left: 20, width: 80, height: 40 }, size, 'bottom-start', {
      viewport,
    });
    expect(p.placement).toBe('top-start');
    expect(p.y).toBe(740 - 8 - 100);
  });

  it('shifts along the cross axis to stay on screen', () => {
    const p = computePosition({ top: 100, left: 360, width: 30, height: 30 }, size, 'bottom', {
      viewport,
    });
    expect(p.x).toBe(400 - 8 - 200);
  });
});
