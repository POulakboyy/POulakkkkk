import { describe, expect, it } from 'vitest';
import { DAY, fromZoned, MINUTE } from '../time.ts';
import { archiveCandidates, deadEnds, type LifecycleRecord } from './lifecycle.ts';

const NOW = Date.UTC(2026, 10, 4, 12);

function rec(id: string, createdDaysAgo: number, editedAfterMin = 0, extra = {}): LifecycleRecord {
  const createdAt = NOW - createdDaysAgo * DAY;
  return { id, createdAt, updatedAt: createdAt + editedAfterMin * MINUTE, ...extra };
}

describe('deadEnds', () => {
  it('flags records never revisited after creation, most idle first', () => {
    const records = [
      rec('a', 40),
      rec('b', 90, 5), // edited within the creation session
      rec('c', 40, 60), // revisited an hour later
      rec('d', 10), // too recent
    ];
    const out = deadEnds(records, NOW);
    expect(out.map((s) => s.record.id)).toEqual(['b', 'a']);
    expect(out.map((s) => s.idleDays)).toEqual([90, 40]);
  });

  it('includes the exact idle threshold and honours options', () => {
    expect(deadEnds([rec('a', 30)], NOW)).toHaveLength(1);
    expect(deadEnds([rec('a', 29)], NOW)).toHaveLength(0);
    expect(deadEnds([rec('a', 10)], NOW, { idleDays: 7 })).toHaveLength(1);
    expect(deadEnds([rec('a', 40, 5)], NOW, { creationSessionMin: 0 })).toHaveLength(0);
    expect(deadEnds([rec('a', 40, 60)], NOW, { creationSessionMin: 120 })).toHaveLength(1);
  });

  it('skips finished, archived and sandbox records and keeps extra fields', () => {
    const records = [
      rec('done', 40, 0, { status: 'done' }),
      rec('arch', 40, 0, { status: 'archived' }),
      rec('sand', 40, 0, { sandbox: true }),
      rec('todo', 40, 0, { status: 'todo', title: 'Draft' }),
    ];
    const out = deadEnds(records, NOW);
    expect(out.map((s) => s.record.id)).toEqual(['todo']);
    expect(out[0]?.record).toHaveProperty('title', 'Draft');
  });

  it('breaks ties by id and validates input', () => {
    expect(deadEnds([rec('z', 40), rec('m', 40)], NOW).map((s) => s.record.id)).toEqual(['m', 'z']);
    expect(() => deadEnds([], Number.NaN)).toThrow(RangeError);
    expect(() => deadEnds([], NOW, { idleDays: 0 })).toThrow(RangeError);
    expect(() => deadEnds([], NOW, { creationSessionMin: -1 })).toThrow(RangeError);
  });
});

describe('archiveCandidates', () => {
  it('proposes records without interaction for two calendar years', () => {
    const twoYears = Date.UTC(2024, 10, 4, 12);
    const records: LifecycleRecord[] = [
      { id: 'exact', createdAt: twoYears - DAY, updatedAt: twoYears },
      { id: 'recent', createdAt: twoYears - DAY, updatedAt: twoYears + 1 },
      { id: 'old', createdAt: 0, updatedAt: Date.UTC(2020, 0, 1) },
      { id: 'done', createdAt: 0, updatedAt: 0, status: 'done' },
    ];
    const out = archiveCandidates(records, NOW);
    expect(out.map((s) => s.record.id)).toEqual(['old', 'exact']);
    expect(out[1]?.idleDays).toBe(730);
  });

  it('handles custom and fractional periods and leap days', () => {
    const leap = Date.UTC(2028, 1, 29);
    const r: LifecycleRecord = { id: 'a', createdAt: 0, updatedAt: Date.UTC(2027, 1, 28) };
    expect(archiveCandidates([r], leap, { years: 1 })).toHaveLength(1);
    const half: LifecycleRecord = { id: 'b', createdAt: 0, updatedAt: NOW - 200 * DAY };
    expect(archiveCandidates([half], NOW, { years: 0.5 })).toHaveLength(1);
    expect(archiveCandidates([half], NOW, { years: 1 })).toHaveLength(0);
    expect(() => archiveCandidates([], NOW, { years: 0 })).toThrow(RangeError);
    expect(() => archiveCandidates([], Number.NaN)).toThrow(RangeError);
  });

  it('counts calendar years in the requested zone', () => {
    const tz = 'Europe/Paris';
    const now = fromZoned({ year: 2026, month: 3, day: 1 }, tz);
    // Local midnight on 1 March 2024 is still 29 February on the UTC calendar.
    const r: LifecycleRecord = {
      id: 'a',
      createdAt: 0,
      updatedAt: fromZoned({ year: 2024, month: 3, day: 1 }, tz),
    };
    expect(archiveCandidates([r], now, { timeZone: tz })).toHaveLength(1);
    expect(
      archiveCandidates([{ ...r, updatedAt: r.updatedAt + 1 }], now, { timeZone: tz }),
    ).toHaveLength(0);
    expect(archiveCandidates([r], now)).toHaveLength(0);
  });
});
