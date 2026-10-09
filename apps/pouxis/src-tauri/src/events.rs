//! Event names and window labels shared with the frontend.
//!
//! These strings are a contract with `apps/pouxis/src/platform/events.ts`: change both sides
//! together. Tauri event names may only contain alphanumerics, `-`, `/`, `:` and `_`.

/// The main application window (every platform).
pub const MAIN_WINDOW: &str = "main";
/// The quick-capture palette (desktop, feature 2.11).
pub const CAPTURE_WINDOW: &str = "capture";
/// The floating scrapbook drop zone (desktop, feature 5.6).
pub const SCRAPBOOK_WINDOW: &str = "scrapbook";

/// A validated `pouxis://` link, emitted to the main window (feature 1.13).
pub const DEEP_LINK: &str = "pouxis:deep-link";
/// A tray menu action the frontend must route (e.g. "today"), emitted to the main window.
pub const TRAY_ACTION: &str = "pouxis:tray";
/// The capture window was just shown: the frontend should reset and focus its input.
pub const CAPTURE_SHOWN: &str = "pouxis:capture-shown";
/// Files dropped on the scrapbook window, forwarded to the main window (feature 5.6).
pub const SCRAPBOOK_DROP: &str = "pouxis:scrapbook-drop";
