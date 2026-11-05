import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: ReactNode;
  /** Target element. Defaults to `document.body`, so overlays escape clipping and stacking contexts. */
  container?: Element | null;
}

/** Renders children into another part of the DOM (overlays, toasts). */
export function Portal({ children, container }: PortalProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, container ?? document.body);
}
