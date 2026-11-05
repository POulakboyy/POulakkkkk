import { useMemo, type CSSProperties } from 'react';
import { insights } from '@pouxis/core';
import { useT } from '../../i18n/index.ts';
import { useMediaQuery } from '../../ui/index.ts';
import { ChartCard } from './ChartCard.tsx';
import { TREE_HEIGHT, TREE_WIDTH, layoutTree, treeBounds } from './treeLayout.ts';
import s from './Insights.module.css';

/** Categorical slots in fixed order, one per main branch (validated as a set for CVD). */
const BRANCH_COLORS = [
  'var(--viz-1)',
  'var(--viz-2)',
  'var(--viz-3)',
  'var(--viz-4)',
  'var(--viz-5)',
  'var(--viz-7)',
] as const;

/** Maps every node id to the index of its main (depth-1) branch. */
export function branchIndex(root: insights.SkillNode): Map<string, number> {
  const out = new Map<string, number>();
  const visit = (node: insights.SkillNode, i: number) => {
    out.set(node.id, i);
    node.children.forEach((c) => visit(c, i));
  };
  root.children.forEach((c, i) => visit(c, i));
  return out;
}

export interface SkillTreeProps {
  root: insights.SkillNode;
  index?: number;
}

/** Skill tree (7.5): a generative SVG tree, the same data always grows the same shape. */
export function SkillTree({ root, index }: SkillTreeProps) {
  const t = useT();
  const layout = useMemo(() => layoutTree(root), [root]);
  const colors = useMemo(() => branchIndex(root), [root]);
  const colorOf = (id: string) => BRANCH_COLORS[(colors.get(id) ?? 0) % BRANCH_COLORS.length];
  const levelLabel = (n: insights.SkillNode) => t('insights.skills.level', { level: n.level });
  // On a phone the drawing shrinks a lot: larger labels keep about 12 px on screen.
  const compact = useMediaQuery('(max-width: 600px)');
  const fontSize = compact ? 26 : 13;
  const box = useMemo(
    () =>
      treeBounds(
        layout,
        (l) => (compact ? l.node.label : `${l.node.label}  ${levelLabel(l.node)}`),
        fontSize,
      ),
    [layout, t, fontSize, compact],
  );
  const nodeLabel = (n: insights.SkillNode) =>
    t('insights.skills.node', { name: n.label, level: n.level, count: n.tasks });

  if (layout.branches.length === 0) {
    return (
      <ChartCard title={t('insights.skills.title')} hint={t('insights.skills.hint')} index={index}>
        <p className={s.muted}>{t('insights.skills.empty')}</p>
      </ChartCard>
    );
  }

  const top = root.children[0];
  const summary = t('insights.skills.a11y', {
    count: root.children.length,
    top: top ? t('insights.skills.top', { name: top.label }) : '',
  });

  const table = () => (
    <div className={s.tableWrap} tabIndex={0} role="region" aria-label={t('insights.skills.title')}>
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">{t('insights.skills.skillColumn')}</th>
            <th scope="col">{t('insights.skills.levelColumn')}</th>
            <th scope="col">{t('insights.skills.tasksColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {insights
            .flattenSkills(root)
            .filter((n) => n.depth > 0)
            .map((n) => (
              <tr key={n.id}>
                <th
                  scope="row"
                  style={{
                    paddingInlineStart: `calc(${n.depth - 1} * var(--space-4) + var(--space-3))`,
                  }}
                >
                  {n.label}
                </th>
                <td>{n.level}</td>
                <td>{n.tasks}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <ChartCard
      title={t('insights.skills.title')}
      hint={t('insights.skills.hint')}
      table={table}
      index={index}
    >
      <svg
        className={s.treeSvg}
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        role="img"
        aria-label={summary}
      >
        <line
          className={s.ground}
          x1={Math.max(box.x, TREE_WIDTH / 2 - 160)}
          x2={Math.min(box.x + box.width, TREE_WIDTH / 2 + 160)}
          y1={TREE_HEIGHT - 8}
          y2={TREE_HEIGHT - 8}
        />
        {layout.branches.map((b, i) => (
          <path
            key={`b-${b.id}`}
            className={`${s.branch} ${s.twig}`}
            data-depth={b.depth}
            d={b.d}
            strokeWidth={b.width}
            style={
              {
                ...(b.depth === 0 ? {} : { stroke: colorOf(b.node.id) }),
                '--depth': b.depth,
                '--i': i,
                transformOrigin: `${b.x1}px ${b.y1}px`,
              } as CSSProperties
            }
          />
        ))}
        {layout.leaves.map((l, i) => (
          <g
            key={`l-${l.id}`}
            className={s.twig}
            style={
              {
                '--depth': l.depth + 1,
                '--i': i,
                transformOrigin: `${l.x}px ${l.y}px`,
              } as CSSProperties
            }
          >
            <circle
              className={s.leaf}
              cx={l.x}
              cy={l.y}
              r={l.r}
              data-tip={l.node.children.length === 0}
              style={{ fill: colorOf(l.node.id) }}
            >
              <title>{nodeLabel(l.node)}</title>
            </circle>
            {l.labelled ? (
              <text
                className={s.leafLabel}
                style={{ fontSize }}
                x={l.x + (l.anchor === 'start' ? l.r + 6 : l.anchor === 'end' ? -l.r - 6 : 0)}
                y={l.anchor === 'middle' ? l.y - l.r - 8 : l.y + fontSize * 0.35}
                textAnchor={l.anchor}
              >
                <tspan>{l.node.label}</tspan>
                {compact ? null : <tspan dx={6}>{levelLabel(l.node)}</tspan>}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </ChartCard>
  );
}
