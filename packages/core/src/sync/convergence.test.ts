/**
 * Property tests: replicas receiving the same ops — in any order, with duplicates, split in
 * arbitrary batches — end in the same state; delta sync through version vectors converges.
 */
import { describe, expect, it } from 'vitest';
import type { Op } from './ops.ts';
import { createReplica, type Replica } from './replica.ts';
import { int, manualClock, pick, prng, shuffle } from './test-utils.ts';

const COLLECTIONS = ['tasks', 'notes'];
const IDS = ['r1', 'r2', 'r3', 'r4'];
const FIELDS = ['title', 'done', 'tags', 'meta'];

function randomValue(random: () => number): unknown {
  switch (int(random, 6)) {
    case 0:
      return undefined;
    case 1:
      return random() < 0.5;
    case 2:
      return int(random, 100);
    case 3:
      return { nested: int(random, 3), list: [int(random, 3)] };
    case 4:
      return null;
    default:
      return `v${int(random, 20)}`;
  }
}

/** Runs random concurrent local edits on `n` replicas; returns them with every op produced. */
function simulate(seed: number, n: number, steps: number) {
  const random = prng(seed);
  const clocks = Array.from({ length: n }, (_, i) => manualClock(1_700_000_000_000 + i * 997));
  const replicas = clocks.map((clock, i) =>
    createReplica({ nodeId: `n${i}`, now: clock.now, history: { notes: ['title'] } }),
  );
  const all: Op[] = [];
  for (let step = 0; step < steps; step++) {
    const i = int(random, n);
    const replica = replicas[i] as Replica;
    clocks[i]?.advance(int(random, 50) - 10); // skewed, sometimes backwards
    const collection = pick(random, COLLECTIONS);
    const id = pick(random, IDS);
    const ops =
      random() < 0.08
        ? replica.change(collection, id, 'delete')
        : replica.change(collection, id, {
            [pick(random, FIELDS)]: randomValue(random),
            [pick(random, FIELDS)]: randomValue(random),
          });
    all.push(...ops);
    // Occasionally gossip some ops so later edits are causally after remote ones.
    if (random() < 0.3 && all.length > 0) {
      const target = replicas[int(random, n)] as Replica;
      target.apply(shuffle(random, all).slice(0, int(random, 10)));
    }
  }
  return { random, replicas, all };
}

function state(replica: Replica) {
  const { records, vv, history } = replica.snapshot();
  const sortedRecords = [...records].sort((a, b) => (a[0] + a[1] < b[0] + b[1] ? -1 : 1));
  const normalized = sortedRecords.map(([c, id, tomb, fields]) => [
    c,
    id,
    tomb,
    [...fields].sort((x, y) => (x[0] < y[0] ? -1 : 1)),
  ]);
  return {
    records: normalized,
    vv,
    history: [...history].sort((a, b) => (a.join() < b.join() ? -1 : 1)),
  };
}

describe('convergence', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`full exchange in random order with duplicates converges (seed ${seed})`, () => {
      const { random, replicas, all } = simulate(seed, 4, 120);
      const fresh = createReplica({ nodeId: 'observer', history: { notes: ['title'] } });
      for (const replica of [...replicas, fresh]) {
        const deliveries = shuffle(random, [...all, ...all.slice(0, int(random, all.length))]);
        // Arbitrary batch boundaries.
        for (let i = 0; i < deliveries.length;) {
          const size = 1 + int(random, 15);
          replica.apply(deliveries.slice(i, i + size));
          i += size;
        }
      }
      const expected = state(replicas[0] as Replica);
      for (const replica of [...replicas.slice(1), fresh]) expect(state(replica)).toEqual(expected);
      for (const collection of COLLECTIONS) {
        const values = replicas.map((r) => JSON.stringify([...r.all(collection)]));
        expect(new Set(values).size).toBe(1);
      }
    });
  }

  it('merging is associative: (a ∪ b) ∪ c equals a ∪ (b ∪ c)', () => {
    const { random, all } = simulate(42, 3, 90);
    const parts = [0, 1, 2].map(() => shuffle(random, all).slice(0, int(random, all.length)));
    const [p, q, r] = parts as [Op[], Op[], Op[]];
    const left = createReplica({ nodeId: 'L' });
    left.apply([...p, ...q]);
    left.apply(r);
    const right = createReplica({ nodeId: 'R' });
    const bc = createReplica({ nodeId: 'BC' });
    bc.apply([...q, ...r]);
    right.apply(p);
    right.apply(bc.opsSince());
    expect(state(right).records).toEqual(state(left).records);
  });

  for (const seed of [11, 12, 13]) {
    it(`gossip with opsSince(versionVector) converges (seed ${seed})`, () => {
      const random = prng(seed);
      const clock = manualClock();
      const replicas = Array.from({ length: 5 }, (_, i) =>
        createReplica({ nodeId: `g${i}`, now: clock.now }),
      );
      for (let round = 0; round < 60; round++) {
        clock.advance(int(random, 5));
        const writer = pick(random, replicas);
        if (random() < 0.1) writer.change('tasks', pick(random, IDS), 'delete');
        else
          writer.change('tasks', pick(random, IDS), {
            [pick(random, FIELDS)]: randomValue(random),
          });
        const from = pick(random, replicas);
        const to = pick(random, replicas);
        to.apply(from.opsSince(to.versionVector()));
      }
      // Anti-entropy: a few full rounds of pairwise delta exchange.
      for (let pass = 0; pass < 2; pass++) {
        for (const from of replicas)
          for (const to of replicas) to.apply(from.opsSince(to.versionVector()));
      }
      const expected = state(replicas[0] as Replica).records;
      for (const replica of replicas) expect(state(replica).records).toEqual(expected);
    });
  }
});
