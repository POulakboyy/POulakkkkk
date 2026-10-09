import { cloneElement, isValidElement, type ReactElement, type Ref, type SyntheticEvent } from 'react';
import { mergeRefs } from '../utils/refs.ts';

type AnyProps = Record<string, unknown> & { ref?: Ref<HTMLElement> };

/**
 * Clones a trigger element, merging ARIA props, the ref and event handlers (the child's handler
 * runs first; ours is skipped if it calls `preventDefault()`). Like Radix's `asChild`.
 */
export function cloneTrigger(child: ReactElement, props: AnyProps): ReactElement {
  if (!isValidElement(child)) return child;
  const childProps = child.props as AnyProps;
  const merged: AnyProps = { ...props };
  for (const key of Object.keys(props)) {
    const ours = props[key];
    const theirs = childProps[key];
    if (/^on[A-Z]/.test(key) && typeof ours === 'function' && typeof theirs === 'function') {
      merged[key] = (e: SyntheticEvent) => {
        (theirs as (e: SyntheticEvent) => void)(e);
        if (!e.defaultPrevented) (ours as (e: SyntheticEvent) => void)(e);
      };
    }
  }
  const describedBy = [childProps['aria-describedby'], props['aria-describedby']].filter(Boolean).join(' ');
  if (describedBy) merged['aria-describedby'] = describedBy;
  merged.ref = mergeRefs(childProps.ref, props.ref);
  return cloneElement(child, merged);
}
