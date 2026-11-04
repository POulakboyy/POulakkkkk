import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from '@pouxis/core';
import { messages } from '../i18n/index.ts';
import { KEYS, parseDays } from './config.ts';

const m = messages('en');

describe('config keys', () => {
  it('parses weekday lists, names and ranges', () => {
    expect(parseDays('1,2,3')).toEqual([1, 2, 3]);
    expect(parseDays('lun,mar,mer')).toEqual([1, 2, 3]);
    expect(parseDays('mon-fri')).toEqual([1, 2, 3, 4, 5]);
    expect(parseDays('sat-mon')).toEqual([0, 1, 6]);
    expect(parseDays('funday')).toBeUndefined();
    expect(parseDays('')).toBeUndefined();
  });

  it('validates values and keeps working hours ordered', () => {
    const prefs = structuredClone(DEFAULT_PREFS);
    expect(KEYS['workingHours.start']!.set(prefs, '08:30', m)).toBeUndefined();
    expect(prefs.workingHours.start).toBe(510);
    expect(KEYS['workingHours.end']!.set(prefs, '08:00', m)).toBe(m.config.expected.hoursOrder);
    expect(KEYS.timeZone!.set(prefs, 'Mars/Base', m)).toBe(m.config.expected.timeZone);
    expect(KEYS.wipLimit!.set(prefs, '0', m)).toBe(m.config.expected.int(1));
    KEYS['workingHours.start']!.reset(prefs);
    expect(prefs.workingHours.start).toBe(DEFAULT_PREFS.workingHours.start);
  });
});
