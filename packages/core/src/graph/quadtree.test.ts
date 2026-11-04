import { describe, expect, it } from 'vitest';
import { createRandom } from './random.ts';
import { QuadTree } from './quadtree.ts';
import type { QuadItem } from './quadtree.ts';
import type { Rect } from './types.ts';

function bruteRect(points: QuadItem[], r: Rect): string[] {
  return points
    .filter((p) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height)
    .map((p) => p.id)
    .sort();
}

function randomPoints(count: number, seed: number, spread = 1000): QuadItem[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    x: (random() - 0.5) * spread,
    y: (random() - 0.5) * spread,
  }));
}

describe('QuadTree', () => {
  it('inserts, gets and removes points', () => {
    const tree = new QuadTree();
    tree.insert('a', 1, 2);
    tree.insert('b', 3, 4);
    expect(tree.size).toBe(2);
    expect(tree.get('a')).toEqual({ id: 'a', x: 1, y: 2 });
    expect(tree.remove('a')).toBe(true);
    expect(tree.remove('a')).toBe(false);
    expect(tree.has('a')).toBe(false);
    expect(tree.size).toBe(1);
  });

  it('rejects non-finite coordinates', () => {
    expect(() => new QuadTree().insert('a', Number.NaN, 0)).toThrow(RangeError);
    expect(() => new QuadTree().insert('a', 0, Infinity)).toThrow(RangeError);
  });

  it('grows to accept points far outside the initial bounds', () => {
    const tree = new QuadTree({ bounds: { x: 0, y: 0, width: 10, height: 10 } });
    tree.insert('near', 5, 5);
    tree.insert('far', -1e6, 3e6);
    expect(tree.bounds.width).toBeGreaterThan(3e6);
    expect(tree.queryRect({ x: -2e6, y: 2e6, width: 2e6, height: 2e6 }).map((p) => p.id)).toEqual([
      'far',
    ]);
  });

  it('matches a brute-force rectangle query, borders included', () => {
    const points = randomPoints(2000, 7);
    const tree = QuadTree.from(points, { capacity: 8 });
    const random = createRandom(99);
    for (let q = 0; q < 50; q++) {
      const rect = {
        x: (random() - 0.5) * 1200,
        y: (random() - 0.5) * 1200,
        width: random() * 400,
        height: random() * 400,
      };
      expect(
        tree
          .queryRect(rect)
          .map((p) => p.id)
          .sort(),
      ).toEqual(bruteRect(points, rect));
    }
    const p = points[0] as QuadItem;
    expect(tree.queryRect({ x: p.x, y: p.y, width: 0, height: 0 }).map((i) => i.id)).toContain(
      p.id,
    );
  });

  it('finds the nearest point, with distance limit and filter', () => {
    const points = randomPoints(1000, 3);
    const tree = QuadTree.from(points);
    const random = createRandom(5);
    for (let q = 0; q < 50; q++) {
      const x = (random() - 0.5) * 1000;
      const y = (random() - 0.5) * 1000;
      let best = Infinity;
      for (const p of points) best = Math.min(best, Math.hypot(p.x - x, p.y - y));
      const found = tree.nearest(x, y) as QuadItem;
      expect(Math.hypot(found.x - x, found.y - y)).toBeCloseTo(best, 9);
    }
    expect(tree.nearest(1e5, 1e5, 10)).toBeUndefined();
    const first = points[0] as QuadItem;
    const skipped = tree.nearest(first.x, first.y, Infinity, (item) => item.id !== first.id);
    expect(skipped?.id).not.toBe(first.id);
    expect(new QuadTree().nearest(0, 0)).toBeUndefined();
  });

  it('queries by radius', () => {
    const tree = QuadTree.from([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 3, y: 4 },
      { id: 'c', x: 10, y: 0 },
    ]);
    expect(
      tree
        .queryRadius(0, 0, 5)
        .map((p) => p.id)
        .sort(),
    ).toEqual(['a', 'b']);
    expect(tree.queryRadius(0, 0, -1)).toEqual([]);
  });

  it('keeps queries correct through updates and removals', () => {
    const points = randomPoints(500, 11);
    const tree = QuadTree.from(points, { capacity: 4 });
    const random = createRandom(12);
    const live = new Map(points.map((p) => [p.id, { ...p }]));
    for (let s = 0; s < 2000; s++) {
      const id = `p${Math.floor(random() * 500)}`;
      if (random() < 0.2) {
        tree.remove(id);
        live.delete(id);
      } else {
        // Small moves exercise the in-leaf fast path, large ones the remove + insert path.
        const p = live.get(id) ?? { id, x: 0, y: 0 };
        const scale = random() < 0.5 ? 1 : 2000;
        const moved = { id, x: p.x + (random() - 0.5) * scale, y: p.y + (random() - 0.5) * scale };
        tree.update(id, moved.x, moved.y);
        live.set(id, moved);
      }
    }
    expect(tree.size).toBe(live.size);
    const all = { x: -1e5, y: -1e5, width: 2e5, height: 2e5 };
    expect(tree.queryRect(all).length).toBe(live.size);
    const rect = { x: -300, y: -300, width: 500, height: 400 };
    expect(
      tree
        .queryRect(rect)
        .map((p) => p.id)
        .sort(),
    ).toEqual(bruteRect([...live.values()], rect));
  });

  it('bounds the depth when many points coincide', () => {
    const tree = new QuadTree({ capacity: 2, maxDepth: 6 });
    for (let i = 0; i < 100; i++) tree.insert(`s${i}`, 1, 1);
    expect(tree.depth()).toBeLessThanOrEqual(6);
    expect(tree.queryRadius(1, 1, 0).length).toBe(100);
  });

  it('clears and re-inserting an id moves it', () => {
    const tree = new QuadTree();
    tree.insert('a', 0, 0);
    tree.insert('a', 50, 50);
    expect(tree.size).toBe(1);
    expect(tree.nearest(50, 50)?.id).toBe('a');
    tree.clear();
    expect(tree.size).toBe(0);
    expect(tree.queryRect({ x: -100, y: -100, width: 200, height: 200 })).toEqual([]);
  });

  it('stays fast with 10 000 nodes (soft performance check)', () => {
    const points = randomPoints(10_000, 21, 20_000);
    const t0 = performance.now();
    const tree = QuadTree.from(points);
    const built = performance.now() - t0;
    const t1 = performance.now();
    for (let q = 0; q < 1000; q++)
      tree.queryRect({ x: q - 500, y: q - 500, width: 1920, height: 1080 });
    for (let q = 0; q < 1000; q++) tree.nearest(q * 7 - 3000, q * 3 - 1500, 50);
    const queried = performance.now() - t1;
    // Generous bounds: they catch an accidental O(n²), not normal machine noise.
    expect(built).toBeLessThan(500);
    expect(queried).toBeLessThan(1500);
  });
});
