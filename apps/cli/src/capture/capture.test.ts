import { describe, expect, it } from 'vitest';
import { fromZoned } from '@pouxis/core';
import { capture, toDraft } from './index.ts';

const timeZone = 'Europe/Paris';
// Thursday 8 October 2026, 09:00 in Paris.
const now = fromZoned({ year: 2026, month: 10, day: 8, hour: 9 }, timeZone);
const at = (day: number, hour = 0, minute = 0) =>
  fromZoned({ year: 2026, month: 10, day, hour, minute }, timeZone);
const parse = (text: string) => capture(text, { now, timeZone, locale: 'fr' });

describe('capture', () => {
  it('turns a time range with a mention into an event (US-1)', () => {
    expect(parse('Réunion projet X mardi prochain 14h-16h avec @paul')).toEqual({
      kind: 'event',
      title: 'Réunion projet X',
      tags: [],
      priority: 0,
      attendees: ['paul'],
      start: at(13, 14),
      end: at(13, 16),
    });
  });

  it('attaches a dated task without a time to its day', () => {
    expect(parse("Écrire l'article !! 2h vendredi")).toMatchObject({
      kind: 'task',
      priority: 2,
      estimateMin: 120,
      floatingDay: at(9),
      mode: 'create',
    });
  });

  it('keeps deadlines, tags and mentions of tasks', () => {
    expect(parse('Rapport avant vendredi 17h #travail')).toMatchObject({
      kind: 'task',
      deadline: at(9, 17),
      tags: ['travail'],
    });
    expect(parse('Appeler @paul pour le devis')).toMatchObject({
      kind: 'task',
      attendees: ['paul'],
    });
  });

  it('gives a timed task a slot of its estimate (30 min by default)', () => {
    const base = {
      kind: 'task' as const,
      title: 'T',
      attendees: [],
      tags: [],
      tokens: [],
      confidence: 1,
    };
    expect(toDraft({ ...base, start: 100 }).scheduled).toEqual({
      start: 100,
      end: 100 + 30 * 60_000,
    });
    expect(toDraft({ ...base, start: 100, estimateMin: 10 }).scheduled).toEqual({
      start: 100,
      end: 100 + 600_000,
    });
  });

  it('gives an event without an end a default length', () => {
    const r = toDraft({
      kind: 'event',
      title: 'E',
      attendees: [],
      tags: [],
      tokens: [],
      confidence: 1,
      start: 0,
    });
    expect(r).toMatchObject({ kind: 'event', start: 0, end: 3_600_000 });
  });
});
