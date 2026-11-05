import { describe, expect, it } from 'vitest';
import {
  estimateVelocity,
  nearest,
  projectPosition,
  resolveSheetRelease,
  rubberband,
  rubberbandClamp,
} from './physics.ts';
import { armedAction, detectSwipeAxis, resolveSwipeRelease, swipeOffset } from './swipe.ts';

const W = 400;
const both = { leading: 1, trailing: 2 };

describe('rubber banding', () => {
  it('resists more the further it goes and never exceeds the dimension', () => {
    expect(rubberband(0, 100)).toBe(0);
    const a = rubberband(50, 100);
    const b = rubberband(500, 100);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(50);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(100);
  });

  it('passes values through inside the range', () => {
    expect(rubberbandClamp(30, 0, 100, 100)).toBe(30);
    expect(rubberbandClamp(-40, 0, 100, 100)).toBeLessThan(0);
    expect(rubberbandClamp(-40, 0, 100, 100)).toBeGreaterThan(-40);
  });
});

describe('velocity and projection', () => {
  it('estimates px/ms over the recent window', () => {
    const samples = [
      { p: 0, t: 0 },
      { p: 10, t: 50 },
      { p: 60, t: 100 },
    ];
    expect(estimateVelocity(samples, 100)).toBeCloseTo(0.6);
    expect(estimateVelocity(samples, 50)).toBeCloseTo(1);
  });

  it('reports no fling when the finger rested before release', () => {
    expect(
      estimateVelocity(
        [
          { p: 0, t: 0 },
          { p: 50, t: 20 },
        ],
        100,
        500,
      ),
    ).toBe(0);
  });

  it('projects and snaps to the nearest candidate', () => {
    expect(projectPosition(100, 0)).toBe(100);
    expect(projectPosition(0, 1, 0.99)).toBeCloseTo(99);
    expect(nearest(42, [0, 50, 100])).toBe(50);
  });
});

describe('resolveSheetRelease', () => {
  const base = { snapOffsets: [0, 300], closedOffset: 600, dismissible: true };

  it('settles at the nearest snap point', () => {
    expect(resolveSheetRelease({ ...base, offset: 40, velocity: 0 })).toBe(0);
    expect(resolveSheetRelease({ ...base, offset: 260, velocity: 0 })).toBe(300);
  });

  it('dismisses on a fast downward flick from the lowest snap or when dragged far', () => {
    expect(resolveSheetRelease({ ...base, offset: 320, velocity: 1.2 })).toBe('dismiss');
    expect(resolveSheetRelease({ ...base, offset: 520, velocity: 0 })).toBe('dismiss');
  });

  it('never dismisses when not dismissible', () => {
    expect(resolveSheetRelease({ ...base, dismissible: false, offset: 580, velocity: 2 })).toBe(
      300,
    );
  });
});

describe('swipe maths', () => {
  it('detects the axis after the slop', () => {
    expect(detectSwipeAxis(3, 2)).toBeNull();
    expect(detectSwipeAxis(20, 4)).toBe('x');
    expect(detectSwipeAxis(6, 20)).toBe('y');
  });

  it('follows the finger then rubber-bands past the limit, and resists on empty sides', () => {
    expect(swipeOffset(100, W, both)).toBe(100);
    const past = swipeOffset(W, W, both);
    expect(past).toBeGreaterThan(W * 0.86);
    expect(past).toBeLessThan(W);
    const empty = swipeOffset(-200, W, { leading: 1, trailing: 0 });
    expect(empty).toBeLessThan(0);
    expect(Math.abs(empty)).toBeLessThan(W * 0.12);
  });

  it('arms the first action at 22 % and the second at 55 %', () => {
    expect(armedAction(W * 0.2, W, both)).toBeNull();
    expect(armedAction(W * 0.25, W, both)).toEqual({ side: 'leading', index: 0 });
    expect(armedAction(-W * 0.3, W, both)).toEqual({ side: 'trailing', index: 0 });
    expect(armedAction(-W * 0.6, W, both)).toEqual({ side: 'trailing', index: 1 });
    // A single leading action never arms a second one.
    expect(armedAction(W * 0.7, W, both)).toEqual({ side: 'leading', index: 0 });
  });

  it('commits the armed action, a same-direction flick, and cancels on a back-flick', () => {
    expect(resolveSwipeRelease(W * 0.3, 0, W, both)).toEqual({ side: 'leading', index: 0 });
    expect(resolveSwipeRelease(W * 0.1, 0.9, W, both)).toEqual({ side: 'leading', index: 0 });
    expect(resolveSwipeRelease(W * 0.05, 0.9, W, both)).toBeNull();
    expect(resolveSwipeRelease(W * 0.3, -1, W, both)).toBeNull();
    expect(resolveSwipeRelease(W * 0.1, 0.1, W, both)).toBeNull();
  });
});
