import { describe, expect, it } from 'vitest';
import { decodeBatch, encodeBatch } from './codec.ts';
import { isSyncError } from './errors.ts';
import { createReplica } from './replica.ts';
import { manualClock } from './test-utils.ts';

function sampleOps() {
  const clock = manualClock();
  const replica = createReplica({ nodeId: 'device-1', now: clock.now });
  const ops = [
    ...replica.change('tasks', '0d3c9b1e-0000-4000-8000-000000000001', {
      title: 'Écrire le chapitre 2',
      done: false,
      tags: ['écriture'],
      meta: { estimate: 45, energy: 'high' },
      due: null,
    }),
    ...replica.change('tasks', '0d3c9b1e-0000-4000-8000-000000000001', {
      notes: undefined,
      done: true,
    }),
    ...replica.change('notes', 'n1', 'delete'),
  ];
  return ops;
}

describe('encodeBatch / decodeBatch', () => {
  it('round-trips sets, unsets and deletes', () => {
    const ops = sampleOps();
    expect(decodeBatch(encodeBatch(ops))).toEqual(ops);
    expect(decodeBatch(encodeBatch([]))).toEqual([]);
  });

  it('interns collections, ids and timestamps', () => {
    const ops = sampleOps();
    const compact = encodeBatch(ops).length;
    const naive = JSON.stringify(ops).length;
    expect(compact).toBeLessThan(naive * 0.5);
  });

  it('rejects malformed batches with a decode error', () => {
    const valid = JSON.parse(encodeBatch(sampleOps())) as unknown[];
    const cases = [
      'not json',
      '{}',
      JSON.stringify([2, [], [], [], []]),
      JSON.stringify([1, ['c'], [0, 'id'], ['bad-hlc'], [[0, 0]]]),
      JSON.stringify([1, ['c'], ['0', 'id'], valid[3], [[0, 0]]]),
      JSON.stringify([1, ['c'], [0, 'id'], valid[3], [[0, 99]]]),
      JSON.stringify([1, ['c'], [0, 'id'], valid[3], [[0, 0, '__proto__', 1]]]),
      JSON.stringify([1, ['c'], [0, 'id'], valid[3], [[0, 0, 'f', 1, 'extra']]]),
    ];
    for (const text of cases) {
      try {
        decodeBatch(text);
        expect.unreachable(text);
      } catch (error) {
        expect(isSyncError(error, 'decode')).toBe(true);
      }
    }
  });
});
