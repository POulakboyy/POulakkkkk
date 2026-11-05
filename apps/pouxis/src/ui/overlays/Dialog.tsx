import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { IconButton } from '../actions/IconButton.tsx';
import { usePresence } from '../hooks/usePresence.ts';
import { IconClose } from '../icons.tsx';
import { useUiLabels } from '../labels.ts';
import { cx } from '../utils/cx.ts';
import { Portal } from '../utils/Portal.tsx';
import { mergeRefs } from '../utils/refs.ts';
import { useModal } from './useModal.ts';
import s from './Overlay.module.css';

export interface DialogProps {
  open: boolean;
  /** Called with `false` on Escape, backdrop click or the close button. */
  onOpenChange: (open: boolean) => void;
  /** Dialog title (names it via `aria-labelledby`). */
  title: ReactNode;
  /** Supporting text (`aria-describedby`). */
  description?: ReactNode;
  children?: ReactNode;
  /** Action row, typically secondary then primary {@link Button}s. */
  footer?: ReactNode;
  /** `alertdialog` for confirmations that interrupt; requires an explicit choice. Default `dialog`. */
  role?: 'dialog' | 'alertdialog';
  /** Width. Default `md` (480 px). */
  size?: 'sm' | 'md' | 'lg';
  /** Close on backdrop click. Default `true` (`false` for `alertdialog`). */
  closeOnBackdrop?: boolean;
  /** Show the × button. Default `true` (`false` for `alertdialog`). */
  showClose?: boolean;
  /** Element to focus on open (default: first focusable). Point it at the least destructive action. */
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Centred modal dialog: portal, focus trap + restore, inert background, Escape, scroll lock,
 * `aria-modal`, scale/fade enter and exit.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  role = 'dialog',
  size = 'md',
  closeOnBackdrop,
  showClose,
  initialFocus,
  className,
}: DialogProps) {
  const labels = useUiLabels();
  const titleId = useId();
  const descId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const presence = usePresence<HTMLDivElement>(open);
  const alert = role === 'alertdialog';
  const close = () => onOpenChange(false);
  useModal({ open, layerRef, panelRef, onDismiss: close, initialFocus });

  if (!presence.mounted) return null;
  return (
    <Portal>
      <div ref={layerRef} className={s.layer} data-state={presence.state}>
        <div
          className={s.backdrop}
          aria-hidden="true"
          onClick={(closeOnBackdrop ?? !alert) ? close : undefined}
        />
        <div className={s.center}>
          <div
            ref={mergeRefs(panelRef, presence.ref)}
            role={role}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            data-state={presence.state}
            className={cx(s.dialog, s[size], className)}
          >
            <div className={s.header}>
              <h2 id={titleId} className={s.title}>
                {title}
              </h2>
              {(showClose ?? !alert) && (
                <IconButton
                  className={s.close}
                  label={labels.close}
                  icon={<IconClose />}
                  size="sm"
                  onClick={close}
                />
              )}
            </div>
            {description && (
              <p id={descId} className={s.description}>
                {description}
              </p>
            )}
            {children && <div className={s.body}>{children}</div>}
            {footer && <div className={s.footer}>{footer}</div>}
          </div>
        </div>
      </div>
    </Portal>
  );
}
