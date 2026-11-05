/**
 * Command bar and universal capture (1.8, 2.11): ⌘K / Ctrl+K, the capture buttons and the
 * desktop quick-capture window all go through this module.
 */
export { CommandBar } from './CommandBar.tsx';
export { QuickCapture } from './QuickCapture.tsx';
export {
  COMMAND_OPEN_EVENT,
  closeCommandBar,
  getCommandBarState,
  openCommandBar,
  useCommandBar,
} from './state.ts';
export { planCapture, planText, type CaptureItem, type CaptureKind } from './capture.ts';
