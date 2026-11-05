import type { ReactNode } from 'react';
import { useT, type MessageKey } from '../../../i18n/index.ts';
import { Tooltip, cx } from '../../../ui/index.ts';
import type { Tool } from '../engine/controller.ts';
import { IconCursor, IconEdge, IconEraser, IconHand, IconNode, IconPen } from './icons.tsx';
import s from '../Canvas.module.css';

/** Tools in display order, with their single-key shortcut (design-tool conventions). */
export const TOOLS: readonly { id: Tool; key: string; label: MessageKey; icon: ReactNode }[] = [
  { id: 'select', key: 'V', label: 'canvas.tools.select', icon: <IconCursor /> },
  { id: 'pan', key: 'H', label: 'canvas.tools.pan', icon: <IconHand /> },
  { id: 'node', key: 'N', label: 'canvas.tools.node', icon: <IconNode /> },
  { id: 'edge', key: 'L', label: 'canvas.tools.edge', icon: <IconEdge /> },
  { id: 'draw', key: 'P', label: 'canvas.tools.draw', icon: <IconPen /> },
  { id: 'eraser', key: 'E', label: 'canvas.tools.eraser', icon: <IconEraser /> },
];

/** Pen widths in CSS px at zoom 1. */
export const INK_WIDTHS: readonly { width: number; label: MessageKey }[] = [
  { width: 2, label: 'canvas.ink.thin' },
  { width: 3.5, label: 'canvas.ink.medium' },
  { width: 6, label: 'canvas.ink.bold' },
];
/** 0 = ink; then a few `--viz-*` hues that read well on both themes. */
export const INK_COLORS: readonly number[] = [0, 1, 4, 3, 5];

export interface ToolbarProps {
  tool: Tool;
  onTool: (tool: Tool) => void;
  ink: { width: number; color: number };
  onInk: (ink: { width: number; color: number }) => void;
}

export function Toolbar({ tool, onTool, ink, onInk }: ToolbarProps) {
  const t = useT();
  const inking = tool === 'draw';
  return (
    <div className={s.toolbarWrap}>
      {inking && (
        <div className={s.inkBar} role="group" aria-label={t('canvas.ink.label')}>
          {INK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={s.swatch}
              aria-pressed={ink.color === color}
              aria-label={color === 0 ? t('canvas.ink.ink') : t('canvas.ink.color', { n: color })}
              style={{ color: color === 0 ? 'var(--ink)' : `var(--viz-${color})` }}
              onClick={() => onInk({ ...ink, color })}
            />
          ))}
          <span className={s.inkDivider} aria-hidden="true" />
          {INK_WIDTHS.map(({ width, label }) => (
            <button
              key={width}
              type="button"
              className={s.widthButton}
              aria-pressed={ink.width === width}
              aria-label={t(label)}
              onClick={() => onInk({ ...ink, width })}
            >
              <span style={{ width: width * 2 + 2, height: width * 2 + 2 }} />
            </button>
          ))}
        </div>
      )}
      <div className={s.toolbar} role="toolbar" aria-label={t('canvas.tools.label')}>
        {TOOLS.map((item) => {
          const label = t(item.label);
          return (
            <Tooltip key={item.id} content={label} shortcut={item.key} placement="top">
              <button
                type="button"
                className={cx(s.tool, tool === item.id && s.toolActive)}
                aria-pressed={tool === item.id}
                aria-label={label}
                aria-keyshortcuts={item.key}
                onClick={() => onTool(item.id)}
              >
                {item.icon}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
