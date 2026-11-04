import { describe, expect, it } from 'vitest';
import {
  addMonthsCal,
  lastDayOfMonth,
  mondayOf,
  nextDayOfMonth,
  nextMonthDay,
  nextWeekday,
  weekdayCal,
} from './calendar.ts';
import { capitalizeFirst, fold } from './text.ts';

const thu = { y: 2026, m: 10, d: 8 };

describe('calendar', () => {
  it('weekday arithmetic', () => {
    expect(weekdayCal(thu)).toBe(4);
    expect(mondayOf(thu)).toEqual({ y: 2026, m: 10, d: 5 });
    expect(nextWeekday(thu, 4)).toEqual(thu);
    expect(nextWeekday(thu, 4, true)).toEqual({ y: 2026, m: 10, d: 15 });
    expect(nextWeekday({ y: 2026, m: 12, d: 30 }, 1)).toEqual({ y: 2027, m: 1, d: 4 });
  });

  it('clamps months', () => {
    expect(addMonthsCal({ y: 2027, m: 1, d: 31 }, 1)).toEqual({ y: 2027, m: 2, d: 28 });
    expect(addMonthsCal({ y: 2026, m: 11, d: 15 }, 3)).toEqual({ y: 2027, m: 2, d: 15 });
    expect(lastDayOfMonth({ y: 2028, m: 2, d: 3 })).toEqual({ y: 2028, m: 2, d: 29 });
  });

  it('finds the next day of month, skipping short months', () => {
    expect(nextDayOfMonth({ y: 2026, m: 10, d: 31 }, 31)).toEqual({ y: 2026, m: 10, d: 31 });
    expect(nextDayOfMonth({ y: 2026, m: 11, d: 1 }, 31)).toEqual({ y: 2026, m: 12, d: 31 });
    expect(nextDayOfMonth(thu, 32)).toBeNull();
    expect(nextMonthDay(thu, 2, 30)).toBeNull();
  });
});

describe('text', () => {
  it('folds without changing the length', () => {
    const s = 'Réunion — Après‑demain À 14h’';
    const f = fold(s);
    expect(f).toBe("reunion - apres-demain a 14h'");
    expect(f.length).toBe(s.length);
    expect(fold('Œuvre 🙂').length).toBe('Œuvre 🙂'.length);
  });

  it('capitalises only a leading lower-case word', () => {
    expect(capitalizeFirst('écrire')).toBe('Écrire');
    expect(capitalizeFirst('« réunion »')).toBe('« Réunion »');
    expect(capitalizeFirst('iPhone setup')).toBe('iPhone setup');
    expect(capitalizeFirst('12 œufs')).toBe('12 œufs');
  });
});
