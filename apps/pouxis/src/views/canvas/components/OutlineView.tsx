import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Id } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import { IconCheck, IconChevronRight, IconLock, cx } from '../../../ui/index.ts';
import type { OutlineRow } from '../model.ts';
import s from '../Canvas.module.css';

export interface OutlineViewProps {
  rows: readonly OutlineRow[];
  onToggleCollapse: (id: Id) => void;
  onRename: (id: Id, label: string) => void;
  onToggleDone: (id: Id) => void;
  onDelete: (id: Id) => void;
}

/**
 * Accessible alternative to the canvas: the same graph as a WAI-ARIA tree. Arrow keys move,
 * Left/Right collapse or expand, Enter edits, Space checks tasks, Delete removes.
 */
export function OutlineView({
  rows,
  onToggleCollapse,
  onRename,
  onToggleDone,
  onDelete,
}: OutlineViewProps) {
  const t = useT();
  const [active, setActive] = useState<Id | undefined>(rows[0]?.id);
  const [editing, setEditing] = useState<Id | undefined>();
  const list = useRef<HTMLUListElement>(null);
  const activeId = rows.some((r) => r.id === active) ? active : rows[0]?.id;

  useEffect(() => {
    if (!editing && list.current?.contains(document.activeElement)) {
      list.current.querySelector<HTMLElement>(`[data-id="${CSS.escape(activeId ?? '')}"]`)?.focus();
    }
  }, [activeId, editing]);

  if (rows.length === 0) return <p className={s.outlineEmpty}>{t('canvas.outline.empty')}</p>;

  const focusRow = (id: Id | undefined) => {
    if (!id) return;
    setActive(id);
    list.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLLIElement>, row: OutlineRow, i: number) => {
    if (editing) return;
    const parent = () => {
      for (let j = i - 1; j >= 0; j--)
        if ((rows[j] as OutlineRow).depth < row.depth) return rows[j];
      return undefined;
    };
    const handlers: Record<string, () => void> = {
      ArrowDown: () => focusRow(rows[i + 1]?.id),
      ArrowUp: () => focusRow(rows[i - 1]?.id),
      Home: () => focusRow(rows[0]?.id),
      End: () => focusRow(rows[rows.length - 1]?.id),
      ArrowRight: () => {
        if (row.collapsed) onToggleCollapse(row.id);
        else if (row.childCount > 0) focusRow(rows[i + 1]?.id);
      },
      ArrowLeft: () => {
        if (row.childCount > 0 && !row.collapsed) onToggleCollapse(row.id);
        else focusRow(parent()?.id);
      },
      Enter: () => setEditing(row.id),
      F2: () => setEditing(row.id),
      ' ': () => {
        if (row.kind === 'task' && !row.locked) onToggleDone(row.id);
      },
      Delete: () => onDelete(row.id),
      Backspace: () => onDelete(row.id),
    };
    const handler = handlers[e.key];
    if (!handler) return;
    e.preventDefault();
    handler();
  };

  return (
    <div className={s.outline}>
      <p className={s.outlineHint}>{t('canvas.outline.hint')}</p>
      <ul ref={list} role="tree" aria-label={t('canvas.outline.label')} className={s.outlineList}>
        {rows.map((row, i) => {
          const expandable = row.childCount > 0;
          return (
            <li
              key={row.id}
              data-id={row.id}
              role="treeitem"
              aria-level={row.depth + 1}
              aria-posinset={row.index}
              aria-setsize={row.siblings}
              aria-expanded={expandable ? !row.collapsed : undefined}
              aria-selected={row.id === activeId}
              tabIndex={row.id === activeId ? 0 : -1}
              className={cx(s.outlineRow, row.done && s.outlineDone, row.locked && s.outlineLocked)}
              style={{ paddingInlineStart: `calc(var(--space-3) + ${row.depth} * var(--space-6))` }}
              onFocus={() => setActive(row.id)}
              onKeyDown={(e) => onKey(e, row, i)}
            >
              <button
                type="button"
                tabIndex={-1}
                className={cx(s.outlineToggle, !expandable && s.hiddenToggle)}
                aria-hidden="true"
                data-open={expandable && !row.collapsed ? 'true' : 'false'}
                onClick={() => expandable && onToggleCollapse(row.id)}
              >
                <IconChevronRight size={16} />
              </button>
              {row.kind === 'task' && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className={cx(s.outlineCheck, row.done && s.outlineCheckOn)}
                  disabled={row.locked}
                  onClick={() => onToggleDone(row.id)}
                >
                  {row.locked ? <IconLock size={14} /> : row.done ? <IconCheck size={14} /> : null}
                </button>
              )}
              {editing === row.id ? (
                <RowEditor
                  initial={row.label}
                  label={t('canvas.node.editLabel')}
                  onDone={(label) => {
                    setEditing(undefined);
                    if (label !== undefined && label.trim() !== row.label)
                      onRename(row.id, label.trim());
                    requestAnimationFrame(() => focusRow(row.id));
                  }}
                />
              ) : (
                <span className={s.outlineLabel} onDoubleClick={() => setEditing(row.id)}>
                  {row.label || t('canvas.node.placeholder')}
                </span>
              )}
              {row.collapsed && (
                <span className={s.outlineBadge}>
                  {t('canvas.collapse.hidden', { count: row.childCount })}
                </span>
              )}
              <span className={s.srOnly}>
                {[
                  row.kind === 'task' ? t('canvas.node.task') : '',
                  row.done ? t('canvas.node.done') : '',
                  row.locked ? t('canvas.node.locked') : '',
                ]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RowEditor(props: { initial: string; label: string; onDone: (label?: string) => void }) {
  const [value, setValue] = useState(props.initial);
  const done = useRef(false);
  const finish = (label?: string) => {
    if (done.current) return;
    done.current = true;
    props.onDone(label);
  };
  return (
    <input
      className={s.outlineInput}
      value={value}
      aria-label={props.label}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(value);
        if (e.key === 'Escape') finish(undefined);
      }}
    />
  );
}
