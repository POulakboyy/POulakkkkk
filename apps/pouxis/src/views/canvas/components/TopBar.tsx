import { useEffect, useState } from 'react';
import type { Graph, Id } from '@pouxis/core';
import { useT } from '../../../i18n/index.ts';
import {
  IconBolt,
  IconChevronDown,
  IconMore,
  IconPlus,
  IconTasks,
  Menu,
  SegmentedControl,
  Tooltip,
  IconCanvas,
  cx,
  type MenuItem,
} from '../../../ui/index.ts';
import type { ExportFormat } from '../engine/export.ts';
import type { ViewMode } from '../Workspace.tsx';
import { IconDownload, IconOutline, IconPresent, IconTimeline, IconTree } from './icons.tsx';
import s from '../Canvas.module.css';

export interface TopBarProps {
  graph: Graph;
  graphs: readonly Graph[];
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  timeline: boolean;
  layoutRunning: boolean;
  minimap: boolean;
  waypointCount: number;
  onRename: (title: string) => void;
  onOpen: (id: Id) => void;
  onNew: () => void;
  onUntangle: () => void;
  onStopLayout: () => void;
  onTree: () => void;
  onMindMap: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onTimeline: () => void;
  onPresent: () => void;
  onAddWaypoint: () => void;
  onClearWaypoints: () => void;
  onExport: (format: ExportFormat) => void;
  onTasks: () => void;
  onMinimap: (on: boolean) => void;
  /** Narrow screens: icon-only mode switch. */
  compact: boolean;
  /** Dev builds only. */
  onStress?: (() => void) | undefined;
}

/** Floating header: title and canvas switcher on the left, view and actions on the right. */
export function TopBar(props: TopBarProps) {
  const t = useT();
  const { graph, mode } = props;
  const [title, setTitle] = useState(graph.title);
  useEffect(() => setTitle(graph.title), [graph.title]);

  const switchItems: MenuItem[] = [
    ...[...props.graphs]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12)
      .map<MenuItem>((x) => ({
        type: 'checkbox',
        id: x.id,
        label: x.title || t('canvas.untitled'),
        checked: x.id === graph.id,
        onCheckedChange: () => props.onOpen(x.id),
      })),
    { type: 'separator', id: 'sep' },
    { id: 'new', label: t('canvas.new'), icon: <IconPlus size={18} />, onSelect: props.onNew },
  ];

  const layoutItems: MenuItem[] = [
    props.layoutRunning
      ? { id: 'stop', label: t('canvas.layout.stop'), onSelect: props.onStopLayout }
      : {
          id: 'force',
          label: t('canvas.layout.force'),
          icon: <IconBolt size={18} />,
          onSelect: props.onUntangle,
        },
    {
      id: 'tree',
      label: t('canvas.layout.tree'),
      icon: <IconTree size={18} />,
      onSelect: props.onTree,
    },
    {
      id: 'mindmap',
      label: t('canvas.layout.mindmap'),
      icon: <IconCanvas size={18} />,
      onSelect: props.onMindMap,
    },
    { type: 'separator', id: 'sep' },
    { id: 'collapse', label: t('canvas.collapse.collapseAll'), onSelect: props.onCollapseAll },
    { id: 'expand', label: t('canvas.collapse.expandAll'), onSelect: props.onExpandAll },
  ];

  const moreItems: MenuItem[] = [
    {
      id: 'waypoint',
      label: t('canvas.present.addWaypoint'),
      icon: <IconPlus size={18} />,
      onSelect: props.onAddWaypoint,
    },
    ...(props.waypointCount > 0
      ? [
          {
            id: 'clear',
            label: t('canvas.present.clear'),
            onSelect: props.onClearWaypoints,
          } as MenuItem,
        ]
      : []),
    { type: 'separator', id: 'sep1' },
    {
      id: 'svg',
      label: t('canvas.export.svg'),
      icon: <IconDownload size={18} />,
      onSelect: () => props.onExport('svg'),
    },
    { id: 'png', label: t('canvas.export.png'), onSelect: () => props.onExport('png') },
    { id: 'md', label: t('canvas.export.markdown'), onSelect: () => props.onExport('markdown') },
    { id: 'opml', label: t('canvas.export.opml'), onSelect: () => props.onExport('opml') },
    { type: 'separator', id: 'sep2' },
    {
      id: 'tasks',
      label: t('canvas.import.tasks'),
      icon: <IconTasks size={18} />,
      onSelect: props.onTasks,
    },
    {
      type: 'checkbox',
      id: 'minimap',
      label: t('canvas.view.minimap'),
      checked: props.minimap,
      onCheckedChange: props.onMinimap,
    },
    ...(props.onStress
      ? [
          { type: 'separator', id: 'sep3' } as MenuItem,
          { id: 'stress', label: t('canvas.dev.stress'), onSelect: props.onStress } as MenuItem,
        ]
      : []),
  ];

  const commitTitle = () => {
    const clean = title.trim();
    if (clean && clean !== graph.title) props.onRename(clean);
    else setTitle(graph.title);
  };

  return (
    <header className={s.topBar}>
      <div className={cx(s.glass, s.titleGroup)}>
        <input
          className={s.titleInput}
          value={title}
          aria-label={t('canvas.titleLabel')}
          placeholder={t('canvas.untitled')}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setTitle(graph.title);
              requestAnimationFrame(() => e.currentTarget?.blur());
            }
          }}
        />
        <Menu
          label={t('canvas.list')}
          items={switchItems}
          placement="bottom-start"
          trigger={
            <button type="button" className={s.barIcon} aria-label={t('canvas.list')}>
              <IconChevronDown size={18} />
            </button>
          }
        />
      </div>

      <div className={s.actions}>
        <div className={cx(s.glass, s.modeSwitch)}>
          <SegmentedControl<ViewMode>
            label={t('canvas.mode.label')}
            size="sm"
            iconOnly={props.compact}
            value={mode}
            onChange={props.onMode}
            options={[
              { value: 'canvas', label: t('canvas.mode.canvas'), icon: <IconCanvas size={16} /> },
              {
                value: 'outline',
                label: t('canvas.mode.outline'),
                icon: <IconOutline size={16} />,
              },
            ]}
          />
        </div>
        {mode === 'canvas' && (
          <div className={cx(s.glass, s.actionGroup)}>
            <Menu
              label={t('canvas.layout.menu')}
              items={layoutItems}
              placement="bottom-end"
              trigger={
                <button type="button" className={s.barButton} aria-label={t('canvas.layout.menu')}>
                  <IconTree size={18} />
                  <span className={s.hideNarrow}>{t('canvas.layout.menu')}</span>
                </button>
              }
            />
            <Tooltip content={t('canvas.timeline.toggle')}>
              <button
                type="button"
                className={cx(s.barIcon, props.timeline && s.barIconOn)}
                aria-pressed={props.timeline}
                aria-label={t('canvas.timeline.toggle')}
                onClick={props.onTimeline}
              >
                <IconTimeline size={18} />
              </button>
            </Tooltip>
            <button
              type="button"
              className={cx(s.barButton, s.presentButton)}
              aria-label={t('canvas.present.start')}
              onClick={props.onPresent}
            >
              <IconPresent size={18} />
              <span className={s.hideNarrow}>{t('canvas.present.start')}</span>
            </button>
            <Menu
              label={t('canvas.more')}
              items={moreItems}
              placement="bottom-end"
              trigger={
                <button type="button" className={s.barIcon} aria-label={t('canvas.more')}>
                  <IconMore size={18} />
                </button>
              }
            />
          </div>
        )}
      </div>
    </header>
  );
}
