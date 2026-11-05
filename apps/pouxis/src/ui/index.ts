// UI primitives — import from here, not from files.
// Every component uses design tokens only; motion is transform/opacity, collapsed by reduced motion.

export * from './icons.tsx';

// Actions
export { Button, buttonClassName } from './actions/Button.tsx';
export type { ButtonProps, ButtonSize, ButtonVariant } from './actions/Button.tsx';
export { IconButton } from './actions/IconButton.tsx';
export type { IconButtonProps } from './actions/IconButton.tsx';
export { Chip, Pill, PillGroup } from './actions/Pill.tsx';
export type { ChipProps, PillGroupProps, PillProps } from './actions/Pill.tsx';

// Navigation
export { SegmentedControl } from './navigation/SegmentedControl.tsx';
export type { SegmentOption, SegmentedControlProps } from './navigation/SegmentedControl.tsx';
export { Tabs } from './navigation/Tabs.tsx';
export type { TabItem, TabsProps } from './navigation/Tabs.tsx';

// Display
export { Avatar, avatarSlot, initials } from './display/Avatar.tsx';
export type { AvatarProps } from './display/Avatar.tsx';
export { Badge, formatBadgeCount } from './display/Badge.tsx';
export type { BadgeProps, BadgeTone } from './display/Badge.tsx';
export { Card, cardLinkClassName } from './display/Card.tsx';
export type { CardProps } from './display/Card.tsx';
export { EmptyState } from './display/EmptyState.tsx';
export type { EmptyStateProps } from './display/EmptyState.tsx';
export { Kbd } from './display/Kbd.tsx';
export type { KbdProps } from './display/Kbd.tsx';
export { ListRow } from './display/ListRow.tsx';
export type { ListRowProps } from './display/ListRow.tsx';
export { SectionHeader } from './display/SectionHeader.tsx';
export type { SectionHeaderProps } from './display/SectionHeader.tsx';
export { Skeleton, SkeletonText } from './display/Skeleton.tsx';
export type { SkeletonProps, SkeletonTextProps } from './display/Skeleton.tsx';

// Forms
export { Checkbox } from './forms/Checkbox.tsx';
export type { CheckboxProps } from './forms/Checkbox.tsx';
export { Switch } from './forms/Switch.tsx';
export type { SwitchProps } from './forms/Switch.tsx';
export { TextArea } from './forms/TextArea.tsx';
export type { TextAreaProps } from './forms/TextArea.tsx';
export { TextField } from './forms/TextField.tsx';
export type { TextFieldProps } from './forms/TextField.tsx';

// Overlays
export { Dialog } from './overlays/Dialog.tsx';
export type { DialogProps } from './overlays/Dialog.tsx';
export { Menu } from './overlays/Menu.tsx';
export type {
  MenuActionItem,
  MenuCheckboxItem,
  MenuItem,
  MenuProps,
  MenuSeparator,
} from './overlays/Menu.tsx';
export { Popover } from './overlays/Popover.tsx';
export type { PopoverProps } from './overlays/Popover.tsx';
export { Sheet, snapPercent } from './overlays/Sheet.tsx';
export type { SheetProps } from './overlays/Sheet.tsx';
export { Tooltip } from './overlays/Tooltip.tsx';
export type { TooltipProps } from './overlays/Tooltip.tsx';
export { computePosition } from './overlays/position.ts';
export type { Placement } from './overlays/position.ts';

// Feedback
export { ProgressBar } from './feedback/ProgressBar.tsx';
export type { ProgressBarProps } from './feedback/ProgressBar.tsx';
export { ProgressRing } from './feedback/ProgressRing.tsx';
export type { ProgressRingProps, ProgressTone } from './feedback/ProgressRing.tsx';
export { Spinner } from './feedback/Spinner.tsx';
export type { SpinnerProps } from './feedback/Spinner.tsx';
export { Toaster } from './feedback/Toaster.tsx';
export type { ToasterProps } from './feedback/Toaster.tsx';
export { dismissToast, toast } from './feedback/toastStore.ts';
export type { ToastAction, ToastOptions, ToastTone } from './feedback/toastStore.ts';

// Gestures
export { SwipeableRow } from './gestures/SwipeableRow.tsx';
export type { SwipeAction, SwipeableRowProps, SwipeTone } from './gestures/SwipeableRow.tsx';

// Hooks
export { useControllableState } from './hooks/useControllableState.ts';
export { createFocusTrap, useFocusTrap } from './hooks/useFocusTrap.ts';
export type { FocusTrapOptions } from './hooks/useFocusTrap.ts';
export { matchHotkey, parseHotkey, useHotkeys } from './hooks/useHotkeys.ts';
export type { HotkeyMap, HotkeyOptions } from './hooks/useHotkeys.ts';
export { useLongPress } from './hooks/useLongPress.ts';
export type { LongPressOptions } from './hooks/useLongPress.ts';
export { DESKTOP_QUERY, useMediaQuery } from './hooks/useMediaQuery.ts';
export { usePresence } from './hooks/usePresence.ts';
export type { Presence } from './hooks/usePresence.ts';
export { prefersReducedMotion, useReducedMotion } from './hooks/useReducedMotion.ts';
export { lockScroll, useScrollLock } from './hooks/useScrollLock.ts';

// Utilities
export { cx } from './utils/cx.ts';
export type { ClassValue } from './utils/cx.ts';
export { formatKey } from './utils/keys.ts';
export { Portal } from './utils/Portal.tsx';
export type { PortalProps } from './utils/Portal.tsx';
export { VisuallyHidden } from './utils/VisuallyHidden.tsx';
export type { VisuallyHiddenProps } from './utils/VisuallyHidden.tsx';

// Living style guide (#/settings?gallery=1)
export { Gallery } from './Gallery.tsx';
