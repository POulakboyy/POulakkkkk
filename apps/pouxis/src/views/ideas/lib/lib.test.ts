import { describe, expect, it } from 'vitest';
import { ideation, type JournalEntry, type Note } from '@pouxis/core';
import { sourceOffset } from '../editor/caret.ts';
import { fillNoise, nextDelay, SOUNDSCAPES, SOUNDS } from '../ambient/noise.ts';
import { buildDeck, swipeDirection } from '../studio/deck.ts';
import { boardPalette, type MoodImage } from '../studio/moodboard.ts';
import { lostBlocks, pushSnapshot, restoreBlock } from './history.ts';
import {
  appendLine,
  continuation,
  insertText,
  mergeWithNext,
  mergeWithPrevious,
  splitLine,
  toggleTask,
  wordCount,
} from './lines.ts';
import { parseInline, parseLine, plainText, safeHref } from './markdown.ts';
import {
  ARCHIVED_TAG,
  excerpt,
  frictionKind,
  inboxTask,
  linkableNotes,
  linkPatches,
  RESOLVED_TAG,
  sortFriction,
  splitIdeas,
  titleFromBody,
  visibleNotes,
} from './notes.ts';
import { parseTab } from './route.ts';
import { startSession } from './sandbox.ts';

let seq = 0;
function note(patch: Partial<Note> = {}): Note {
  seq += 1;
  return {
    id: `n${seq}`,
    title: `Note ${seq}`,
    body: '',
    tags: [],
    links: [],
    createdAt: 1000 + seq,
    updatedAt: 1000 + seq,
    ...patch,
  };
}

function entry(patch: Partial<JournalEntry>): JournalEntry {
  seq += 1;
  return {
    id: `j${seq}`,
    kind: 'friction',
    text: 'x',
    tags: [],
    createdAt: seq,
    updatedAt: seq,
    ...patch,
  };
}

describe('markdown', () => {
  it('parses block kinds with their markers', () => {
    expect(parseLine('## Title')).toMatchObject({
      kind: 'heading',
      level: 2,
      marker: '## ',
      content: 'Title',
    });
    expect(parseLine('#### Deep').level).toBe(3);
    expect(parseLine('  - item')).toMatchObject({ kind: 'bullet', depth: 1, content: 'item' });
    expect(parseLine('- [x] done')).toMatchObject({ kind: 'task', checked: true, content: 'done' });
    expect(parseLine('3. third')).toMatchObject({ kind: 'ordered', number: 3 });
    expect(parseLine('> quote')).toMatchObject({ kind: 'quote', content: 'quote' });
    expect(parseLine('---').kind).toBe('rule');
    expect(parseLine('   ').kind).toBe('blank');
    expect(parseLine('#hashtag').kind).toBe('paragraph');
  });

  it('parses inline emphasis, code, links and wiki links', () => {
    expect(parseInline('a **b** *c* `d` ~~e~~')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'strong', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'c' }] },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'd' },
      { type: 'text', text: ' ' },
      { type: 'strike', children: [{ type: 'text', text: 'e' }] },
    ]);
    expect(parseInline('[[Plan#Goals|the plan]]')).toEqual([
      { type: 'wiki', target: 'Plan', label: 'the plan', embed: false },
    ]);
    expect(parseInline('[site](https://x.org)')).toEqual([
      { type: 'link', label: 'site', href: 'https://x.org' },
    ]);
    expect(parseInline('snake_case_name')).toEqual([{ type: 'text', text: 'snake_case_name' }]);
  });

  it('never turns unsafe schemes into links', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(parseInline('[x](javascript:alert(1))')[0]).toMatchObject({ type: 'text' });
  });

  it('flattens a line to plain text', () => {
    expect(plainText('- **Bold** and [[Other|alias]]')).toBe('Bold and alias');
  });
});

describe('line editing', () => {
  it('continues lists and quotes on Enter', () => {
    expect(continuation('- a')).toBe('- ');
    expect(continuation('- [x] a')).toBe('- [ ] ');
    expect(continuation('9. a')).toBe('10. ');
    expect(continuation('plain')).toBeNull();
    expect(splitLine(['- abc'], 0, 4)).toEqual({ lines: ['- ab', '- c'], line: 1, caret: 2 });
  });

  it('leaves the list when Enter is pressed on an empty item', () => {
    expect(splitLine(['- a', '- '], 1, 2)).toEqual({ lines: ['- a', ''], line: 1, caret: 0 });
  });

  it('merges lines on Backspace and Delete', () => {
    expect(mergeWithPrevious(['ab', 'cd'], 1)).toEqual({ lines: ['abcd'], line: 0, caret: 2 });
    expect(mergeWithPrevious(['ab'], 0)).toBeNull();
    expect(mergeWithNext(['ab', 'cd'], 0)).toEqual({ lines: ['abcd'], line: 0, caret: 2 });
    expect(mergeWithNext(['ab'], 0)).toBeNull();
  });

  it('pastes multi-line text across lines', () => {
    expect(insertText(['hello world'], 0, 6, 11, 'big\nnew\nworld')).toEqual({
      lines: ['hello big', 'new', 'world'],
      line: 2,
      caret: 5,
    });
    expect(insertText(['ab'], 0, 1, 1, 'X')).toEqual({ lines: ['aXb'], line: 0, caret: 2 });
  });

  it('toggles tasks and counts words', () => {
    expect(toggleTask('- [ ] a')).toBe('- [x] a');
    expect(toggleTask('- [x] a')).toBe('- [ ] a');
    expect(toggleTask('plain')).toBe('plain');
    expect(wordCount('L’idée — deux mots-clés, 3 fois')).toBe(5);
    expect(appendLine('a\n', 'b')).toBe('a\n\nb');
    expect(appendLine('', 'b')).toBe('b');
  });
});

describe('caret mapping', () => {
  it('maps a rendered offset back to the source', () => {
    expect(sourceOffset('a **bold** c', 'a bold c', 3)).toBe(5);
    expect(sourceOffset('see [[Plan]]', 'see Plan', 8)).toBe(12);
    expect(sourceOffset('plain', 'plain', 2)).toBe(2);
    expect(sourceOffset('', '', 0)).toBe(0);
  });
});

describe('block history', () => {
  it('offers removed and rewritten lines for restoration, newest first', () => {
    let snaps = pushSnapshot([], ['# T', 'first', 'second'], 1);
    snaps = pushSnapshot(snaps, ['# T', 'first', 'second'], 2);
    expect(snaps).toHaveLength(1);
    snaps = pushSnapshot(snaps, ['# T', 'first edited'], 3);
    const lost = lostBlocks(['# T', 'first edited again'], snaps);
    expect(lost.map((b) => b.text)).toEqual(['first edited', 'first', 'second']);
    expect(restoreBlock(['# T'], lost[2]!)).toEqual(['# T', 'second']);
  });

  it('keeps only the newest snapshots', () => {
    let snaps = pushSnapshot([], ['a'], 1, 2);
    snaps = pushSnapshot(snaps, ['b'], 2, 2);
    snaps = pushSnapshot(snaps, ['c'], 3, 2);
    expect(snaps.map((x) => x.lines[0])).toEqual(['b', 'c']);
  });
});

describe('notes helpers', () => {
  it('lists visible notes, newest first, filtered accent-insensitively', () => {
    const a = note({ title: 'Été', updatedAt: 5 });
    const b = note({ title: 'Hiver', updatedAt: 9 });
    const hidden = [
      note({ sandbox: true }),
      note({ vaultId: 'v' }),
      note({ tags: [ARCHIVED_TAG] }),
    ];
    expect(visibleNotes([a, b, ...hidden]).map((n) => n.id)).toEqual([b.id, a.id]);
    expect(visibleNotes([a, b], 'ete').map((n) => n.id)).toEqual([a.id]);
    expect(linkableNotes([a, ...hidden])).toHaveLength(2);
  });

  it('derives excerpts and titles without Markdown', () => {
    expect(excerpt('# Title\n\n- **first** point')).toBe('first point');
    expect(excerpt('x'.repeat(200), 10)).toBe(`${'x'.repeat(9)}…`);
    expect(titleFromBody('\n## Big idea\nmore')).toBe('Big idea');
  });

  it('links two notes both ways without duplicates', () => {
    const a = note({ links: ['z'] });
    const b = note({ links: [a.id] });
    expect(linkPatches(a, b)).toEqual([
      { id: a.id, links: ['z', b.id] },
      { id: b.id, links: [a.id] },
    ]);
  });

  it('splits a brain dump into one idea per line', () => {
    expect(splitIdeas('- one\n\n  2) two  \n• three\n')).toEqual(['one', 'two', 'three']);
    expect(inboxTask('x')).toMatchObject({ title: 'x', status: 'inbox' });
  });

  it('orders friction entries open first, newest first', () => {
    const old = entry({ tags: ['creative'] });
    const resolved = entry({ tags: [RESOLVED_TAG] });
    const recent = entry({});
    const other = entry({ kind: 'win' });
    expect(sortFriction([old, resolved, recent, other]).map((e) => e.id)).toEqual([
      recent.id,
      old.id,
      resolved.id,
    ]);
    expect(frictionKind(old)).toBe('creative');
    expect(frictionKind(recent)).toBe('other');
  });
});

describe('sandbox session', () => {
  it('reports a new session once per storage', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    expect(startSession(storage)).toBe(true);
    expect(startSession(storage)).toBe(false);
    expect(startSession(undefined)).toBe(true);
  });
});

describe('serendipity deck', () => {
  it('draws distinct unlinked pairs', () => {
    const notes = Array.from({ length: 6 }, () => note());
    const deck = buildDeck(notes, ideation.mulberry32(7), 4);
    expect(deck).toHaveLength(4);
    const keys = new Set(deck.map((p) => ideation.pairKey(p.a.id, p.b.id)));
    expect(keys.size).toBe(4);
    expect(buildDeck(notes.slice(0, 1), ideation.mulberry32(1))).toEqual([]);
  });

  it('turns a drag into a direction past the threshold', () => {
    expect(swipeDirection(-100)).toBe(1);
    expect(swipeDirection(100)).toBe(-1);
    expect(swipeDirection(20)).toBe(0);
  });
});

describe('ambient noise', () => {
  it('fills normalised noise of each colour', () => {
    for (const color of ['white', 'pink', 'brown'] as const) {
      const out = fillNoise(new Float32Array(4096), color, ideation.mulberry32(3), 0.5);
      const peak = Math.max(...Array.from(out, Math.abs));
      expect(peak).toBeCloseTo(0.5, 5);
    }
  });

  it('defines a soundscape for every sound and bounded accent delays', () => {
    for (const sound of SOUNDS) expect(SOUNDSCAPES[sound].layers.length).toBeGreaterThan(0);
    const rng = ideation.mulberry32(5);
    for (let i = 0; i < 100; i++) {
      const d = nextDelay(1000, rng);
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(5000);
    }
  });
});

describe('misc', () => {
  it('merges board palettes without duplicates', () => {
    const img = (palette: MoodImage['palette']): MoodImage => ({
      id: 'i',
      name: 'n',
      url: 'u',
      palette,
    });
    expect(
      boardPalette([img(['#111111', '#222222']), img('error'), img(null), img(['#111111'])]),
    ).toEqual(['#111111', '#222222']);
  });

  it('parses the tab route parameter', () => {
    expect(parseTab('studio')).toBe('studio');
    expect(parseTab('nope')).toBe('notes');
    expect(parseTab(null)).toBe('notes');
  });
});
