import { describe, expect, it } from 'vitest';
import { at, done, focus, task } from './fixtures.test-utils.ts';
import { flattenSkills, skillTree } from './skills.ts';

const DONE_AT = at(2026, 3, 3, 10);

describe('skillTree', () => {
  it('is an empty root without completed tasks', () => {
    const tree = skillTree([task({ tags: ['design'] })]);
    expect(tree).toMatchObject({ id: '', kind: 'root', tasks: 0, weight: 0, share: 0, level: 0 });
    expect(tree.children).toEqual([]);
    expect(tree.lastCompletedAt).toBeNull();
  });

  it('nests tag paths and credits each node once per task', () => {
    const tasks = [
      done(DONE_AT, { tags: ['Design/Typography', 'design'], projectId: 'p1' }),
      done(DONE_AT + 1, { tags: ['design:Colour'], projectId: 'p2' }),
      done(DONE_AT + 2, { tags: ['#writing'] }),
    ];
    const tree = skillTree(tasks);
    expect(tree.tasks).toBe(3);
    expect(tree.children.map((c) => c.id)).toEqual(['design', 'writing']);
    const design = tree.children[0];
    expect(design).toMatchObject({ label: 'Design', tasks: 2, projects: 2, depth: 1, level: 1 });
    expect(design?.share).toBeCloseTo(2 / 3, 10);
    expect(design?.lastCompletedAt).toBe(DONE_AT + 1);
    expect(design?.children.map((c) => [c.id, c.label, c.depth])).toEqual([
      ['design/colour', 'Colour', 2],
      ['design/typography', 'Typography', 2],
    ]);
  });

  it('merges tags that differ only by case, accents or spacing', () => {
    const tasks = [done(DONE_AT, { tags: ['Écriture'] }), done(DONE_AT, { tags: [' ecriture '] })];
    const tree = skillTree(tasks);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]).toMatchObject({ id: 'ecriture', label: 'Écriture', tasks: 2 });
  });

  it('falls back to project branches for untagged tasks', () => {
    const tasks = [
      done(DONE_AT, { projectId: 'p1' }),
      done(DONE_AT, { projectId: 'p1' }),
      done(DONE_AT, { projectId: 'p2' }),
      done(DONE_AT),
    ];
    const tree = skillTree(tasks, { projectNames: { p1: 'Website' } });
    expect(tree.tasks).toBe(4);
    expect(tree.children.map((c) => [c.id, c.label, c.kind, c.tasks])).toEqual([
      ['project:p1', 'Website', 'project', 2],
      ['project:p2', 'p2', 'project', 1],
    ]);
  });

  it('weights by focus minutes on request', () => {
    const tasks = [
      done(DONE_AT, { tags: ['a'], timeLogs: [focus(DONE_AT - 3_600_000, 60)] }),
      done(DONE_AT, { tags: ['b'] }),
      done(DONE_AT, { tags: ['b'] }),
    ];
    const byMinutes = skillTree(tasks, { weightBy: 'minutes' });
    expect(byMinutes.weight).toBe(60);
    expect(byMinutes.children.map((c) => [c.id, c.weight, c.share])).toEqual([
      ['a', 60, 1],
      ['b', 0, 0],
    ]);
    expect(skillTree(tasks).children.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('grows levels logarithmically', () => {
    const levels = [1, 3, 7].map((n) => {
      const tasks = Array.from({ length: n }, () => done(DONE_AT, { tags: ['x'] }));
      return skillTree(tasks).children[0]?.level;
    });
    expect(levels).toEqual([1, 2, 3]);
  });

  it('counts archived-with-completion tasks and skips dropped ones', () => {
    const tasks = [
      task({ status: 'archived', completedAt: DONE_AT, tags: ['x'] }),
      task({ status: 'archived', tags: ['x'] }),
    ];
    expect(skillTree(tasks).tasks).toBe(1);
  });

  it('flattens depth-first, root first', () => {
    const tree = skillTree([done(DONE_AT, { tags: ['a/b', 'c'] })]);
    expect(flattenSkills(tree).map((n) => n.id)).toEqual(['', 'a', 'a/b', 'c']);
  });

  it('ignores empty tag segments', () => {
    const tree = skillTree([done(DONE_AT, { tags: ['/a//b/', '  ', '#'] })]);
    expect(flattenSkills(tree).map((n) => n.id)).toEqual(['', 'a', 'a/b']);
  });
});
