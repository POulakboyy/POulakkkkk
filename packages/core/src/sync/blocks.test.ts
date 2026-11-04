import { describe, expect, it } from 'vitest';
import { BLOCK_HISTORY, createBlockDoc } from './blocks.ts';
import type { Op } from './ops.ts';
import { createReplica } from './replica.ts';
import { manualClock, prng, shuffle } from './test-utils.ts';

function setup(seed = 1) {
  const clock = manualClock();
  let n = 0;
  const make = (node: string) => {
    const replica = createReplica({ nodeId: node, now: clock.now, history: BLOCK_HISTORY });
    const doc = createBlockDoc(replica, 'doc-1', {
      random: prng(seed + node.charCodeAt(0)),
      createId: () => `${node}-${String(n++).padStart(3, '0')}`,
    });
    return { replica, doc };
  };
  return { clock, a: make('a'), b: make('b') };
}

const texts = (doc: { blocks(): { text: string }[] }) => doc.blocks().map((block) => block.text);

describe('block documents', () => {
  it('inserts, moves, updates and removes blocks', () => {
    const { a } = setup();
    const first = a.doc.insert({ text: 'one' }).block;
    const third = a.doc.insert({ text: 'three' }).block;
    a.doc.insert({ text: 'two' }, { after: first.id });
    a.doc.insert({ type: 'heading', text: 'Title', level: 2 }, { after: null });
    expect(texts(a.doc)).toEqual(['Title', 'one', 'two', 'three']);
    a.doc.move(third.id, { before: first.id });
    expect(texts(a.doc)).toEqual(['Title', 'three', 'one', 'two']);
    a.doc.update(first.id, { type: 'todo', checked: true });
    expect(a.doc.get(first.id)).toMatchObject({ type: 'todo', text: 'one', checked: true });
    a.doc.update(first.id, { type: 'paragraph' });
    expect(a.doc.get(first.id)).not.toHaveProperty('checked');
    a.doc.remove(third.id);
    expect(texts(a.doc)).toEqual(['Title', 'one', 'two']);
    expect(() => a.doc.move('missing', { after: null })).toThrow();
    expect(() => a.doc.insert({ text: 'x' }, { after: 'missing' })).toThrow();
  });

  it('keeps both blocks of concurrent inserts at the same place, in the same order everywhere', () => {
    const { a, b } = setup();
    const base = a.doc.insert({ text: 'start' });
    const end = a.doc.insert({ text: 'end' });
    b.replica.apply([...base.ops, ...end.ops]);
    const fromA = a.doc.insert({ text: 'from A' }, { after: base.block.id });
    const fromB = b.doc.insert({ text: 'from B' }, { after: base.block.id });
    a.replica.apply(fromB.ops);
    b.replica.apply(fromA.ops);
    expect(texts(a.doc)).toEqual(texts(b.doc));
    expect(texts(a.doc)).toHaveLength(4);
    expect(texts(a.doc)[0]).toBe('start');
    expect(texts(a.doc)[3]).toBe('end');
  });

  it('merges a concurrent move with an edit of the same block', () => {
    const { a, b } = setup();
    const ops: Op[] = [];
    const x = a.doc.insert({ text: 'x' });
    const y = a.doc.insert({ text: 'y' });
    ops.push(...x.ops, ...y.ops);
    b.replica.apply(ops);
    const moved = a.doc.move(y.block.id, { before: x.block.id });
    const edited = b.doc.update(y.block.id, { text: 'y edited' });
    a.replica.apply(edited);
    b.replica.apply(moved);
    expect(texts(a.doc)).toEqual(['y edited', 'x']);
    expect(texts(b.doc)).toEqual(['y edited', 'x']);
  });

  it('re-spaces tied keys when inserting between two blocks with the same position', () => {
    const clock = manualClock();
    const replicas = ['a', 'b'].map((node) => createReplica({ nodeId: node, now: clock.now }));
    const docs = replicas.map((replica, i) =>
      createBlockDoc(replica, 'd', { random: () => 0.5, createId: () => `id-${i}` }),
    );
    const [ra, rb] = replicas as [
      ReturnType<typeof createReplica>,
      ReturnType<typeof createReplica>,
    ];
    const [da, db] = docs as [ReturnType<typeof createBlockDoc>, ReturnType<typeof createBlockDoc>];
    // Concurrent inserts into an empty document drawing the same jitter.
    const fromA = da.insert({ text: 'first' }).ops; // id-0
    const fromB = db.insert({ text: 'second' }).ops; // id-1
    ra.apply(fromB);
    rb.apply(fromA);
    const [first, second] = da.blocks();
    expect(first?.pos).toBe(second?.pos);
    const middle = createBlockDoc(ra, 'd', { createId: () => 'id-2' }).insert(
      { text: 'middle' },
      { after: first!.id },
    );
    rb.apply(middle.ops);
    expect(texts(da)).toEqual(['first', 'middle', 'second']);
    expect(texts(db)).toEqual(texts(da));
    expect(new Set(da.blocks().map((block) => block.pos)).size).toBe(3);
  });

  it('keeps the text history of a block across replicas', () => {
    const { a, b, clock } = setup();
    const block = a.doc.insert({ text: 'draft' });
    b.replica.apply(block.ops);
    clock.advance(5);
    b.replica.apply(a.doc.update(block.block.id, { text: 'draft v2' }));
    clock.advance(5);
    a.replica.apply(b.doc.update(block.block.id, { text: 'draft v3' }));
    const history = a.doc.blockHistory(block.block.id);
    expect(history.map((entry) => entry.value)).toEqual(['draft', 'draft v2', 'draft v3']);
    expect(history.map((entry) => entry.node)).toEqual(['a', 'a', 'b']);
    expect(b.doc.blockHistory(block.block.id)).toEqual(history);
  });

  it('exports Markdown and re-imports it in place, preserving untouched block ids', () => {
    const { a } = setup();
    a.doc.setMarkdown('# Plan\n\nIntro\n\n- un\n- deux\n');
    const before = a.doc.blocks();
    expect(a.doc.toMarkdown()).toBe('# Plan\n\nIntro\n\n- un\n- deux\n');
    a.doc.setMarkdown('# Plan\n\nIntro modifiée\n\n- un\n- [ ] nouveau\n- deux\n');
    const after = a.doc.blocks();
    expect(after.map((block) => block.text)).toEqual([
      'Plan',
      'Intro modifiée',
      'un',
      'nouveau',
      'deux',
    ]);
    expect(after[0]?.id).toBe(before[0]?.id); // unchanged
    expect(after[1]?.id).toBe(before[1]?.id); // edited in place
    expect(after[4]?.id).toBe(before[3]?.id);
    expect(a.doc.blockHistory(before[1]!.id).map((entry) => entry.value)).toEqual([
      'Intro',
      'Intro modifiée',
    ]);
    expect(a.doc.setMarkdown(a.doc.toMarkdown())).toEqual([]);
    a.doc.setMarkdown('');
    expect(a.doc.blocks()).toEqual([]);
  });

  it('converges under random concurrent editing sessions', () => {
    const random = prng(99);
    const { a, b, clock } = setup(5);
    const log: Op[] = [];
    for (let step = 0; step < 150; step++) {
      clock.advance(1);
      const side = random() < 0.5 ? a : b;
      const blocks = side.doc.blocks();
      const target = blocks[Math.floor(random() * blocks.length)];
      const roll = random();
      if (!target || roll < 0.4) {
        log.push(
          ...side.doc.insert({ text: `t${step}` }, target ? { after: target.id } : { before: null })
            .ops,
        );
      } else if (roll < 0.6) log.push(...side.doc.update(target.id, { text: `${target.text}+` }));
      else if (roll < 0.8) {
        const anchor = blocks[Math.floor(random() * blocks.length)];
        if (anchor && anchor.id !== target.id)
          log.push(...side.doc.move(target.id, { before: anchor.id }));
      } else log.push(...side.doc.remove(target.id));
      if (random() < 0.2) {
        const other = side === a ? b : a;
        other.replica.apply(shuffle(random, log));
      }
    }
    a.replica.apply(shuffle(random, log));
    b.replica.apply(shuffle(random, log));
    expect(a.doc.blocks()).toEqual(b.doc.blocks());
    expect(a.doc.toMarkdown()).toBe(b.doc.toMarkdown());
  });
});
