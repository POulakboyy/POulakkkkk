import type { ReactNode } from 'react';
import type { GraphEdge } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import {
  IconCheck,
  IconEdit,
  IconLock,
  IconTasks,
  IconTrash,
  Popover,
  Tooltip,
  cx,
} from '../../../ui/index.ts';
import type { SceneNode } from '../engine/scene.ts';
import { IconChild, IconCollapse, IconExpand } from './icons.tsx';
import s from '../Canvas.module.css';

export interface SelectionBarProps {
  nodes: readonly SceneNode[];
  edge: GraphEdge | undefined;
  onAddChild: () => void;
  onEdit: () => void;
  onToggleCollapse: () => void;
  onColor: (color: number | undefined) => void;
  onTask: () => void;
  onDelete: () => void;
  onEdgeCondition: (conditional: boolean) => void;
  onDeleteEdge: () => void;
}

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Contextual actions for the current selection, floating above the canvas. */
export function SelectionBar(props: SelectionBarProps) {
  const t = useT();
  const { nodes, edge } = props;
  if (edge && nodes.length === 0) {
    const conditional = edge.condition === 'on-complete';
    return (
      <div className={s.selectionBar} role="toolbar" aria-label={t('canvas.edge.label')}>
        <button
          type="button"
          className={cx(s.barButton, conditional && s.barButtonOn)}
          aria-pressed={conditional}
          onClick={() => props.onEdgeCondition(!conditional)}
        >
          <IconLock size={18} />
          <span>{t('canvas.edge.makeConditional')}</span>
        </button>
        <BarIcon label={t('canvas.edge.delete')} onClick={props.onDeleteEdge} danger>
          <IconTrash size={18} />
        </BarIcon>
      </div>
    );
  }
  const first = nodes[0];
  if (!first) return null;
  const single = nodes.length === 1;
  return (
    <div
      className={s.selectionBar}
      role="toolbar"
      aria-label={t('canvas.node.selected', { count: nodes.length })}
    >
      {!single && (
        <span className={s.barCount}>{t('canvas.node.selected', { count: nodes.length })}</span>
      )}
      {single && (
        <>
          <BarIcon label={t('canvas.node.addChild')} shortcut="Tab" onClick={props.onAddChild}>
            <IconChild size={18} />
          </BarIcon>
          <BarIcon label={t('canvas.node.edit')} shortcut="F2" onClick={props.onEdit}>
            <IconEdit size={18} />
          </BarIcon>
          {first.hasChildren && (
            <BarIcon
              label={t(
                first.hiddenCount > 0 ? 'canvas.collapse.expand' : 'canvas.collapse.collapse',
              )}
              onClick={props.onToggleCollapse}
            >
              {first.hiddenCount > 0 ? <IconExpand size={18} /> : <IconCollapse size={18} />}
            </BarIcon>
          )}
        </>
      )}
      <Popover
        label={t('canvas.node.color')}
        placement="bottom"
        trigger={
          <button type="button" className={s.barIcon} aria-label={t('canvas.node.color')}>
            <span
              className={s.colorDot}
              style={{
                background:
                  first.node.color !== undefined && first.node.color > 0
                    ? `var(--cat-${first.node.color})`
                    : 'var(--surface)',
              }}
            />
          </button>
        }
      >
        {({ close }) => (
          <div className={s.palette} role="group" aria-label={t('canvas.node.color')}>
            <button
              type="button"
              className={s.paletteSwatch}
              aria-label={t('canvas.node.noColor')}
              aria-pressed={!first.node.color}
              style={{ background: 'var(--surface)' }}
              onClick={() => {
                props.onColor(undefined);
                close();
              }}
            />
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={s.paletteSwatch}
                aria-label={t('canvas.node.colorN', { n: c })}
                aria-pressed={first.node.color === c}
                style={{ background: `var(--cat-${c})` }}
                onClick={() => {
                  props.onColor(c);
                  close();
                }}
              />
            ))}
          </div>
        )}
      </Popover>
      {single && (
        <BarIcon
          label={
            first.node.kind !== 'task'
              ? t('canvas.node.convertToTask')
              : first.done
                ? t('canvas.node.reopen')
                : t('canvas.node.markDone')
          }
          onClick={props.onTask}
          disabled={first.locked}
          pressed={first.node.kind === 'task' ? first.done : undefined}
        >
          {first.node.kind === 'task' ? <IconCheck size={18} /> : <IconTasks size={18} />}
        </BarIcon>
      )}
      <BarIcon label={t('canvas.node.delete')} shortcut="⌫" onClick={props.onDelete} danger>
        <IconTrash size={18} />
      </BarIcon>
    </div>
  );
}

function BarIcon(props: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  pressed?: boolean | undefined;
}) {
  return (
    <Tooltip content={props.label} {...(props.shortcut ? { shortcut: props.shortcut } : {})}>
      <button
        type="button"
        className={cx(s.barIcon, props.danger && s.barDanger)}
        aria-label={props.label}
        aria-pressed={props.pressed}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.children}
      </button>
    </Tooltip>
  );
}
