import { describe, expect, it, vi } from 'vitest';
import { encodeHlc } from './hlc.ts';
import type { Op } from './ops.ts';
import { createReplica, decodeHistory, encodeHistory } from './replica.ts';
import { manualClock } from './test-utils.ts';

function pair(options: { history?: { [c: string]: string[] } } = {}) {
  const clock = manualClock();
  const a = createReplica({ nodeId: 'a', now: clock.now, ...options });
  const b = createReplica({ nodeId: 'b', now: clock.now, ...options });
  return { a, b, clock };
}

describe('replica: local changes', () => {
  it('writes fields, skips unchanged values and unsets with undefined', () => {
    const { a } = pair();
    const first = a.change('tasks', 't1', { title: 'Write', tags: ['x'], done: false });
    expect(first).toHaveLength(3);
    expect(new Set(first.map((op) => op.hlc)).size).toBe(1); // one change, one timestamp
    expect(a.change('tasks', 't1', { title: 'Write', tags: ['x'] })).toEqual([]);
    const unset = a.change('tasks', 't1', { done: undefined });
    expect(unset).toEqual([expect.objectContaining({ type: 'set', field: 'done' })]);
    expect(unset[0]).not.toHaveProperty('value');
    expect(a.get('tasks', 't1')).toEqual({ tags: ['x'], title: 'Write' });
  });

  it('copies and freezes values (no aliasing with app objects)', () => {
    const { a } = pair();
    const tags = ['a'];
    a.change('notes', 'n', { tags });
    tags.push('b');
    const value = a.get('notes', 'n');
    expect(value?.['tags']).toEqual(['a']);
    expect(Object.isFrozen(value)).toBe(true);
  });

  it('rejects non-JSON values and reserved field names', () => {
    const { a } = pair();
    expect(() => a.change('x', '1', { when: new Date() })).toThrow();
    expect(() => a.change('x', '1', { n: Number.NaN })).toThrow();
    expect(() => a.change('x', '1', JSON.parse('{"__proto__": 1}'))).toThrow();
  });

  it('lists live records by id and collections', () => {
    const { a } = pair();
    a.change('tasks', 'b', { n: 2 });
    a.change('tasks', 'a', { n: 1 });
    a.change('notes', 'z', { n: 3 });
    a.change('notes', 'z', 'delete');
    expect([...a.all('tasks').keys()]).toEqual(['a', 'b']);
    expect(a.collections()).toEqual(['tasks']);
    expect(a.isDeleted('notes', 'z')).toBe(true);
  });
});

describe('replica: merge', () => {
  it('converges on concurrent edits of different fields and keeps the latest of one field', () => {
    const { a, b, clock } = pair();
    const base = a.change('tasks', 't', { title: 'v0', done: false });
    b.apply(base);
    const fromA = a.change('tasks', 't', { title: 'A' });
    clock.advance(1);
    const fromB = b.change('tasks', 't', { title: 'B', done: true });
    a.apply(fromB);
    b.apply(fromA);
    expect(a.get('tasks', 't')).toEqual({ done: true, title: 'B' });
    expect(b.get('tasks', 't')).toEqual(a.get('tasks', 't'));
  });

  it('is idempotent and reports only effective ops', () => {
    const { a, b } = pair();
    const ops = a.change('tasks', 't', { title: 'x' });
    expect(b.apply(ops).applied).toHaveLength(1);
    expect(b.apply(ops).applied).toHaveLength(0);
    expect(b.apply([...ops, ...ops]).applied).toHaveLength(0);
  });

  it('breaks exact HLC ties deterministically by value', () => {
    const hlc = encodeHlc({ wall: 1, counter: 0, node: 'x' });
    const op1: Op = { type: 'set', collection: 'c', id: '1', field: 'f', hlc, value: 'apple' };
    const op2: Op = { type: 'set', collection: 'c', id: '1', field: 'f', hlc, value: 'pear' };
    const { a, b } = pair();
    a.apply([op1, op2]);
    b.apply([op2, op1]);
    expect(a.get('c', '1')).toEqual(b.get('c', '1'));
  });

  it('notifies subscribers once per batch with deduplicated records', () => {
    const { a, b } = pair();
    const listener = vi.fn();
    const stop = b.subscribe(listener);
    b.apply(a.change('tasks', 't', { x: 1, y: 2 }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      source: 'remote',
      records: [{ collection: 'tasks', id: 't' }],
    });
    b.apply([]);
    stop();
    b.change('tasks', 't', { x: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('replica: tombstones (delete wins)', () => {
  it('a delete wins over a concurrent later update, in both delivery orders', () => {
    const { a, b, clock } = pair();
    const create = a.change('tasks', 't', { title: 'x' });
    b.apply(create);
    const del = a.change('tasks', 't', 'delete');
    clock.advance(1_000); // B's edit is later in time but did not see the delete
    const edit = b.change('tasks', 't', { title: 'edited' });
    const x = createReplica({ nodeId: 'x', now: clock.now });
    const y = createReplica({ nodeId: 'y', now: clock.now });
    x.apply([...create, ...del, ...edit]);
    y.apply([...edit, ...del, ...create]);
    a.apply(edit);
    b.apply(del);
    for (const r of [a, b, x, y]) {
      expect(r.get('tasks', 't')).toBeUndefined();
      expect(r.isDeleted('tasks', 't')).toBe(true);
    }
  });

  it('ignores local edits of a deleted record and does not resurrect it', () => {
    const { a } = pair();
    a.change('tasks', 't', { title: 'x' });
    a.change('tasks', 't', 'delete');
    expect(a.change('tasks', 't', { title: 'again' })).toEqual([]);
    expect(a.change('tasks', 't', 'delete')).toEqual([]);
    expect(a.get('tasks', 't')).toBeUndefined();
  });

  it('a delete received before the record still applies when the record arrives', () => {
    const { a, b } = pair();
    const create = a.change('tasks', 't', { title: 'x' });
    const del = a.change('tasks', 't', 'delete');
    b.apply(del);
    b.apply(create);
    expect(b.get('tasks', 't')).toBeUndefined();
  });

  it('compaction drops tombstones before the horizon and ignores stale ops afterwards', () => {
    const { a, b, clock } = pair();
    const create = a.change('tasks', 't', { title: 'x' });
    const del = a.change('tasks', 't', 'delete');
    clock.advance(10);
    const horizon = a.change('tasks', 'other', { title: 'y' })[0]!.hlc;
    expect(a.compact({ horizon }).tombstonesRemoved).toBe(1);
    expect(a.isDeleted('tasks', 't')).toBe(false);
    a.apply(create); // a late duplicate of an op older than the horizon
    expect(a.get('tasks', 't')).toBeUndefined();
    b.apply([...create, ...del]);
    expect(b.get('tasks', 't')).toBeUndefined();
  });
});

describe('replica: delta sync', () => {
  it('opsSince(vv) sends only what the peer has not seen', () => {
    const { a, b } = pair();
    a.change('tasks', '1', { title: 'one' });
    b.apply(a.opsSince(b.versionVector()));
    a.change('tasks', '2', { title: 'two' });
    a.change('tasks', '1', { title: 'one!' });
    const delta = a.opsSince(b.versionVector());
    expect(delta.map((op) => op.id)).toEqual(['2', '1']);
    b.apply(delta);
    expect(b.snapshot().records).toEqual(a.snapshot().records);
    expect(a.opsSince(b.versionVector())).toEqual([]);
  });

  it('filters by origin', () => {
    const { a, b } = pair();
    b.apply(a.change('tasks', '1', { x: 1 }));
    b.change('tasks', '2', { x: 2 });
    expect(b.opsSince({}, { origin: 'b' }).map((op) => op.id)).toEqual(['2']);
  });
});

describe('replica: clock drift', () => {
  it('defers ops from a clock too far ahead and applies them once time catches up', () => {
    const clock = manualClock();
    const a = createReplica({ nodeId: 'a', now: clock.now, maxDriftMs: 60_000 });
    const hlc = encodeHlc({ wall: clock.now() + 3_600_000, counter: 0, node: 'future' });
    const op: Op = { type: 'set', collection: 'tasks', id: 't', field: 'x', hlc, value: 1 };
    expect(a.apply([op])).toEqual({ applied: [], deferred: 1 });
    expect(a.apply([op]).deferred).toBe(1); // duplicates are not stacked
    expect(a.snapshot().deferred).toHaveLength(1);
    clock.advance(3_600_000);
    expect(a.apply([]).applied).toHaveLength(1);
    expect(a.get('tasks', 't')).toEqual({ x: 1 });
    expect(a.deferred()).toEqual([]);
  });
});

describe('replica: history', () => {
  it('records every observed version of tracked fields, in HLC order', () => {
    const { a, b, clock } = pair({ history: { blocks: ['text'] } });
    b.apply(a.change('blocks', 'k', { text: 'hello' }));
    clock.advance(1);
    const late = a.change('blocks', 'k', { text: 'hello world' });
    clock.advance(1);
    b.change('blocks', 'k', { text: 'hello there' });
    b.apply(late);
    expect(b.history('blocks', 'k', 'text').map((e) => e.value)).toEqual([
      'hello',
      'hello world',
      'hello there',
    ]);
    expect(b.history('blocks', 'k', 'other')).toEqual([]);
  });

  it('bounds the history and encodes string versions as reverse patches', () => {
    const clock = manualClock();
    const a = createReplica({
      nodeId: 'a',
      now: clock.now,
      history: { blocks: ['text'] },
      historyLimit: 5,
    });
    let text = 'The quick brown fox jumps over the lazy dog. '.repeat(4);
    for (let i = 0; i < 8; i++) {
      text = text.replace('fox', `fox${i}`);
      a.change('blocks', 'k', { text });
      clock.advance(1);
    }
    const history = a.history('blocks', 'k', 'text');
    expect(history).toHaveLength(5);
    const encoded = encodeHistory(history);
    expect(encoded.slice(0, -1).every((entry) => entry[1] === 2)).toBe(true);
    expect(decodeHistory(encoded)).toEqual(history);
  });
});

describe('replica: snapshots', () => {
  it('round-trips state, version vector, history and clock through JSON', () => {
    const clock = manualClock();
    const options = { nodeId: 'a', now: clock.now, history: { blocks: ['text'] } };
    const a = createReplica(options);
    a.change('blocks', '1', { text: 'one' });
    a.change('blocks', '1', { text: 'one two' });
    a.change('tasks', 't', { title: 'x', note: undefined });
    a.change('tasks', 'gone', { title: 'y' });
    a.change('tasks', 'gone', 'delete');
    const json = JSON.parse(JSON.stringify(a.snapshot()));
    clock.set(clock.now() - 60_000); // restarted with a clock set back
    const restored = createReplica(options);
    restored.load(json);
    const { clock: restoredClock, ...state } = restored.snapshot();
    const { clock: originalClock, ...expected } = a.snapshot();
    expect(state).toEqual(expected);
    expect(restoredClock >= originalClock).toBe(true);
    expect(restored.change('tasks', 't', { title: 'z' })[0]!.hlc > a.clock()).toBe(true);
  });

  it('load merges rather than replaces', () => {
    const { a, b } = pair();
    a.change('tasks', '1', { x: 1 });
    b.change('tasks', '2', { x: 2 });
    b.load(a.snapshot());
    expect([...b.all('tasks').keys()]).toEqual(['1', '2']);
    expect(Object.keys(b.versionVector())).toEqual(['a', 'b']);
  });

  it('rejects malformed snapshots', () => {
    const { a } = pair();
    expect(() => a.load({} as never)).toThrow();
    const snapshot = a.snapshot();
    expect(() => a.load({ ...snapshot, records: [['tasks', 'x', 'bad-hlc', []]] })).toThrow();
  });
});
