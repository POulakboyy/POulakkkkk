import { describe, expect, it } from 'vitest';
import { segmentDash } from '../feedback/ProgressRing.tsx';
import { snapPercent } from '../overlays/Sheet.tsx';
import { cx } from '../utils/cx.ts';
import { formatKey } from '../utils/keys.ts';
import { avatarSlot, initials } from './Avatar.tsx';
import { formatBadgeCount } from './Badge.tsx';

describe('display helpers', () => {
  it('derives initials', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('  émile ')).toBe('É');
    expect(initials('Jean Paul Sartre')).toBe('JS');
    expect(initials('')).toBe('');
  });

  it('gives a stable avatar slot in 1–8', () => {
    expect(avatarSlot('Ada')).toBe(avatarSlot('Ada'));
    for (const n of ['a', 'b', 'Kacper', 'Zoé']) {
      expect(avatarSlot(n)).toBeGreaterThanOrEqual(1);
      expect(avatarSlot(n)).toBeLessThanOrEqual(8);
    }
  });

  it('caps badge counts', () => {
    expect(formatBadgeCount(5)).toBe('5');
    expect(formatBadgeCount(100)).toBe('99+');
    expect(formatBadgeCount(12, 9)).toBe('9+');
  });

  it('formats shortcut keys per platform', () => {
    expect(formatKey('mod', true)).toBe('⌘');
    expect(formatKey('mod', false)).toBe('Ctrl');
    expect(formatKey('esc', false)).toBe('Esc');
    expect(formatKey('k', false)).toBe('K');
  });

  it('joins class names', () => {
    expect(cx('a', false, null, { b: true, c: false }, ['d', ['e']])).toBe('a b d e');
  });

  it('computes ring segments and sheet snap offsets', () => {
    const { dash, space } = segmentDash(100, 4, 4);
    expect(dash * 4 + space * 4).toBeCloseTo(100);
    expect(segmentDash(100, 1, 4)).toEqual({ dash: 100, space: 0 });
    expect(snapPercent(0.92, 0.92)).toBe(0);
    expect(snapPercent(0.46, 0.92)).toBeCloseTo(50);
  });
});
