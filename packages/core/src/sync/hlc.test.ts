import { describe, expect, it } from 'vitest';
import {
  MAX_COUNTER,
  compareHlc,
  createHlc,
  decodeHlc,
  encodeHlc,
  hlcNode,
  hlcWall,
  isValidHlc,
} from './hlc.ts';
import { isSyncError } from './errors.ts';
import { int, manualClock, prng } from './test-utils.ts';

describe('HLC encoding', () => {
  it('round-trips and exposes its parts', () => {
    const ts = { wall: 1_700_000_000_123, counter: 42, node: 'device-A' };
    const encoded = encodeHlc(ts);
    expect(decodeHlc(encoded)).toEqual(ts);
    expect(hlcNode(encoded)).toBe('device-A');
    expect(hlcWall(encoded)).toBe(ts.wall);
    expect(isValidHlc(encoded)).toBe(true);
  });

  it('orders strings exactly like (wall, counter, node) tuples', () => {
    const random = prng(1);
    const nodes = ['a', 'b', 'node-zz', 'Z'];
    for (let i = 0; i < 500; i++) {
      const x = {
        wall: int(random, 5) * 1e12,
        counter: int(random, 3) * 1000,
        node: nodes[int(random, 4)] as string,
      };
      const y = {
        wall: int(random, 5) * 1e12,
        counter: int(random, 3) * 1000,
        node: nodes[int(random, 4)] as string,
      };
      const tuple =
        x.wall !== y.wall
          ? x.wall - y.wall
          : x.counter !== y.counter
            ? x.counter - y.counter
            : x.node < y.node
              ? -1
              : x.node > y.node
                ? 1
                : 0;
      expect(Math.sign(compareHlc(encodeHlc(x), encodeHlc(y)))).toBe(Math.sign(tuple));
    }
  });

  it('rejects malformed values', () => {
    expect(() => decodeHlc('nope')).toThrow();
    expect(() => encodeHlc({ wall: -1, counter: 0, node: 'a' })).toThrow();
    expect(() => encodeHlc({ wall: 0, counter: 0, node: 'has space' })).toThrow();
    expect(() => createHlc('')).toThrow();
  });
});

describe('HLC clock', () => {
  it('is strictly monotonic even when the physical clock goes backwards', () => {
    const clock = manualClock();
    const hlc = createHlc('a', clock.now);
    let last = hlc.tick();
    const random = prng(7);
    for (let i = 0; i < 2000; i++) {
      clock.advance(int(random, 21) - 10); // jitter both ways
      const next = hlc.tick();
      expect(next > last).toBe(true);
      last = next;
    }
  });

  it('receive() returns a timestamp above both the remote and every local one', () => {
    const a = manualClock();
    const b = manualClock(a.now() + 60_000); // b runs a minute ahead
    const ha = createHlc('a', a.now);
    const hb = createHlc('b', b.now);
    const remote = hb.tick();
    const local = ha.tick();
    const merged = ha.receive(remote);
    expect(merged > remote && merged > local).toBe(true);
    expect(ha.tick() > merged).toBe(true);
    expect(hlcWall(merged)).toBe(b.now()); // adopted the remote wall clock
  });

  it('keeps causality under random skew between nodes', () => {
    const random = prng(3);
    const clocks = ['a', 'b', 'c'].map((node, i) => {
      const physical = manualClock(1_700_000_000_000 + i * 5_000);
      return { node, physical, hlc: createHlc(node, physical.now) };
    });
    let previous = '';
    let message = clocks[0]!.hlc.tick();
    for (let i = 0; i < 1000; i++) {
      const target = clocks[int(random, 3)]!;
      target.physical.advance(int(random, 2000) - 1000);
      const received = target.hlc.receive(message);
      expect(received > message).toBe(true);
      expect(received > previous || hlcNode(received) !== hlcNode(previous)).toBe(true);
      previous = received;
      message = received;
    }
  });

  it('throws on excessive drift without changing state', () => {
    const clock = manualClock();
    const hlc = createHlc('a', clock.now, { maxDriftMs: 1_000 });
    const before = hlc.tick();
    const future = encodeHlc({ wall: clock.now() + 5_000, counter: 0, node: 'b' });
    try {
      hlc.receive(future);
      expect.unreachable();
    } catch (error) {
      expect(isSyncError(error, 'clock-drift')).toBe(true);
    }
    expect(hlc.peek()).toBe(before);
    clock.advance(4_500);
    expect(hlc.receive(future) > future).toBe(true);
  });

  it('borrows the next millisecond when the counter overflows', () => {
    const clock = manualClock();
    const hlc = createHlc('a', clock.now, {
      last: encodeHlc({ wall: clock.now(), counter: MAX_COUNTER, node: 'a' }),
    });
    const next = decodeHlc(hlc.tick());
    expect(next).toEqual({ wall: clock.now() + 1, counter: 0, node: 'a' });
  });

  it('breaks exact ties by node id', () => {
    const now = () => 1_700_000_000_000;
    const x = createHlc('a', now).tick();
    const y = createHlc('b', now).tick();
    expect(compareHlc(x, y)).toBe(-1);
  });

  it('resumes after `last` (restart with a clock set back in time)', () => {
    const last = encodeHlc({ wall: 1_800_000_000_000, counter: 3, node: 'a' });
    const hlc = createHlc('a', () => 1_700_000_000_000, { last });
    expect(hlc.tick() > last).toBe(true);
  });
});
