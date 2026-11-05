import { describe, expect, it } from 'vitest';
import { insights } from '@pouxis/core';
import { NOW, TZ, makeEntry, makeTask } from '../shared/fixtures.test-utils.ts';
import {
  checkInPrior,
  checkInTags,
  currentCheckIn,
  fitScore,
  labEnergyProfile,
  levelOf,
  recentCheckInCount,
  tasksForEnergy,
} from './energy.ts';

const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;

function checkIn(level: 'low' | 'medium' | 'high', createdAt: number) {
  return makeEntry({ createdAt, tags: checkInTags(level, createdAt, TZ) });
}

describe('check-in entries', () => {
  it('round-trips the level through tags', () => {
    expect(levelOf(checkIn('high', NOW))).toBe('high');
    expect(levelOf(makeEntry({ tags: ['lab:energy'] }))).toBeUndefined();
  });

  it('treats only a recent check-in as current', () => {
    const recent = checkIn('low', NOW - HOUR);
    const stale = checkIn('high', NOW - 5 * HOUR);
    expect(currentCheckIn([stale, recent], NOW)).toBe(recent);
    expect(currentCheckIn([stale], NOW)).toBeUndefined();
  });

  it('counts check-ins of the last four weeks', () => {
    expect(recentCheckInCount([checkIn('low', NOW), checkIn('low', NOW - 5 * WEEK)], NOW)).toBe(1);
  });
});

describe('checkInPrior', () => {
  const base = Array.from({ length: 24 }, () => 0.5);
  // 17:00 Paris = 16:00 UTC.
  const hour = 17;

  it('returns the base prior without check-ins', () => {
    expect(checkInPrior([], base, NOW, TZ)).toEqual(base);
  });

  it('pulls the reported hour (and, less, its neighbours) toward the level', () => {
    const prior = checkInPrior([checkIn('high', NOW)], base, NOW, TZ);
    expect(prior[hour]).toBeCloseTo(0.75);
    expect(prior[hour + 1]!).toBeGreaterThan(0.5);
    expect(prior[hour + 1]!).toBeLessThan(prior[hour]!);
    expect(prior[3]).toBe(0.5);
  });

  it('weighs old check-ins less and ignores those outside the window', () => {
    const fresh = checkInPrior([checkIn('high', NOW)], base, NOW, TZ)[hour]!;
    const old = checkInPrior([checkIn('high', NOW - 2 * WEEK)], base, NOW, TZ)[hour]!;
    expect(old).toBeLessThan(fresh);
    expect(checkInPrior([checkIn('high', NOW - 5 * WEEK)], base, NOW, TZ)[hour]).toBe(0.5);
  });

  it('counts a check-in made moments after the minute clock ticked', () => {
    expect(checkInPrior([checkIn('high', NOW + 30_000)], base, NOW, TZ)[hour]).toBeCloseTo(0.75);
  });
});

describe('labEnergyProfile', () => {
  it('feeds the scheduler 24 values in 0..1, raised where the user reports high energy', () => {
    const plain = labEnergyProfile({ tasks: [], journal: [], now: NOW, timeZone: TZ });
    const boosted = labEnergyProfile({
      tasks: [],
      journal: [checkIn('high', NOW), checkIn('high', NOW - 24 * HOUR)],
      now: NOW,
      timeZone: TZ,
    });
    expect(plain).toHaveLength(24);
    expect(plain.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(boosted[17]! - boosted[3]!).toBeGreaterThan(plain[17]! - plain[3]!);
    expect(insights.circadianPrior('intermediate')).toHaveLength(24);
  });
});

describe('tasksForEnergy', () => {
  const deep = makeTask({ title: 'deep', energy: 'high', estimateMin: 90 });
  const creative = makeTask({ title: 'creative', mode: 'create' });
  const admin = makeTask({ title: 'admin', energy: 'low', estimateMin: 10 });
  const plain = makeTask({ title: 'plain' });

  it('matches demanding work to high energy and light work to low energy', () => {
    expect(tasksForEnergy([admin, deep, creative, plain], 'high').map((t) => t.title)).toEqual([
      'deep',
      'creative',
    ]);
    expect(tasksForEnergy([admin, deep, creative, plain], 'low').map((t) => t.title)).toEqual([
      'admin',
    ]);
    expect(fitScore(plain, 'medium')).toBeGreaterThan(0);
  });

  it('skips closed tasks and subtasks', () => {
    const done = makeTask({ energy: 'low', status: 'done' });
    const sub = makeTask({ energy: 'low', parentId: 'p' });
    expect(tasksForEnergy([done, sub], 'low')).toEqual([]);
  });
});
