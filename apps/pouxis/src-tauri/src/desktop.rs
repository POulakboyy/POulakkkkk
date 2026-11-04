//! Desktop-only integration: system tray (Capture / Today / Quit), the global quick-capture
//! shortcut (feature 2.11) and two small overlay windows:
//!
//! - `capture`: frameless, always-on-top palette loading `index.html#/capture`, hidden when it
//!   loses focus;
//! - `scrapbook`: a floating drop zone loading `index.html#/scrapbook` (feature 5.6). Tauri's
//!   native drag-drop handler is disabled there so the web content receives standard HTML5
//!   `drop` events with `File` objects: no file-system permission is granted to any window.

use tauri::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{
    AppHandle, Emitter, Manager, Runtime, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::events::{CAPTURE_SHOWN, CAPTURE_WINDOW, MAIN_WINDOW, SCRAPBOOK_WINDOW, TRAY_ACTION};

/// System-wide shortcut that toggles the capture palette.
pub const CAPTURE_SHORTCUT: &str = "CommandOrControl+Shift+Space";

const TRAY_ID: &str = "pouxis-tray";

// --- tray ------------------------------------------------------------------------------------

/// What a tray menu item does. Menu ids are plain strings owned by this module.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TrayAction {
    Capture,
    Today,
    Quit,
}

impl TrayAction {
    const ALL: [Self; 3] = [Self::Capture, Self::Today, Self::Quit];

    fn id(self) -> &'static str {
        match self {
            Self::Capture => "capture",
            Self::Today => "today",
            Self::Quit => "quit",
        }
    }

    fn from_id(id: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|action| action.id() == id)
    }
}

/// Tray labels. The tray is built before the web UI loads, so the language comes from the
/// POSIX locale variables (French if they say so, English otherwise).
#[derive(Debug, PartialEq, Eq)]
struct TrayLabels {
    capture: &'static str,
    today: &'static str,
    quit: &'static str,
}

fn tray_labels(locale: Option<&str>) -> TrayLabels {
    let french = locale.is_some_and(|value| value.to_ascii_lowercase().starts_with("fr"));
    if french {
        TrayLabels {
            capture: "Capture rapide",
            today: "Aujourd’hui",
            quit: "Quitter POuxis",
        }
    } else {
        TrayLabels {
            capture: "Quick capture",
            today: "Today",
            quit: "Quit POuxis",
        }
    }
}

/// First non-empty value of `LC_ALL`, `LC_MESSAGES`, `LANG` (POSIX precedence).
fn env_locale() -> Option<String> {
    ["LC_ALL", "LC_MESSAGES", "LANG"]
        .iter()
        .filter_map(|key| std::env::var(key).ok())
        .find(|value| !value.is_empty())
}

fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let labels = tray_labels(env_locale().as_deref());
    let capture = MenuItem::with_id(
        app,
        TrayAction::Capture.id(),
        labels.capture,
        true,
        Some(CAPTURE_SHORTCUT),
    )?;
    let today = MenuItem::with_id(
        app,
        TrayAction::Today.id(),
        labels.today,
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, TrayAction::Quit.id(), labels.quit, true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&capture, &today, &separator, &quit])?;

    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("POuxis")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(on_tray_menu);
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

fn on_tray_menu<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    match TrayAction::from_id(event.id().as_ref()) {
        Some(TrayAction::Capture) => toggle_capture(app),
        Some(TrayAction::Today) => {
            show_main(app);
            if let Err(err) = app.emit_to(MAIN_WINDOW, TRAY_ACTION, TrayAction::Today.id()) {
                log::warn!("could not emit the tray action: {err}");
            }
        }
        Some(TrayAction::Quit) => app.exit(0),
        None => {}
    }
}

// --- windows ---------------------------------------------------------------------------------

/// Brings the main window to the front (deep links, second launch, tray).
pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn build_capture<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<WebviewWindow<R>> {
    let window = WebviewWindowBuilder::new(
        app,
        CAPTURE_WINDOW,
        WebviewUrl::App("index.html#/capture".into()),
    )
    .title("POuxis")
    .inner_size(640.0, 320.0)
    .resizable(false)
    .decorations(false)
    .always_on_top(true)
    .visible_on_all_workspaces(true)
    .skip_taskbar(true)
    .visible(false)
    .center()
    .build()?;

    // Behaves like Spotlight: clicking elsewhere dismisses the palette.
    let handle = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            let _ = handle.hide();
        }
    });
    Ok(window)
}

/// Shows the capture palette (centered, focused) or hides it if it is visible.
pub fn toggle_capture<R: Runtime>(app: &AppHandle<R>) {
    let window = match app.get_webview_window(CAPTURE_WINDOW) {
        Some(window) => window,
        None => match build_capture(app) {
            Ok(window) => window,
            Err(err) => {
                log::warn!("could not create the capture window: {err}");
                return;
            }
        },
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }
    let _ = window.center();
    let _ = window.show();
    let _ = window.set_focus();
    if let Err(err) = app.emit_to(CAPTURE_WINDOW, CAPTURE_SHOWN, ()) {
        log::warn!("could not notify the capture window: {err}");
    }
}

fn build_scrapbook<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<WebviewWindow<R>> {
    WebviewWindowBuilder::new(
        app,
        SCRAPBOOK_WINDOW,
        WebviewUrl::App("index.html#/scrapbook".into()),
    )
    .title("POuxis — Scrapbook")
    .inner_size(320.0, 420.0)
    .min_inner_size(240.0, 240.0)
    .always_on_top(true)
    .skip_taskbar(true)
    // HTML5 drops (with `File` objects) instead of native paths: see the module docs.
    .disable_drag_drop_handler()
    .build()
}

// --- commands --------------------------------------------------------------------------------

/// Hides the calling overlay window (Escape, or after saving). Ignored for any other window,
/// so this permission cannot be used to hide the main window.
#[tauri::command]
pub fn hide_overlay<R: Runtime>(window: WebviewWindow<R>) {
    if is_overlay(window.label()) {
        let _ = window.hide();
    }
}

fn is_overlay(label: &str) -> bool {
    label == CAPTURE_WINDOW || label == SCRAPBOOK_WINDOW
}

/// Opens the scrapbook drop window, or closes it when it is already visible.
#[tauri::command]
pub fn toggle_scrapbook<R: Runtime>(app: AppHandle<R>) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(SCRAPBOOK_WINDOW) {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
            return Ok(false);
        }
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(true);
    }
    build_scrapbook(&app).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Hidden overlays keep the process alive once the main window is closed, which would leave
/// a tray whose "Today" item and deep links have no window to show: quit with the main window.
fn exit_with_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(main) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    let handle = app.clone();
    main.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            handle.exit(0);
        }
    });
}

// --- setup -----------------------------------------------------------------------------------

/// The plugin is registered without shortcuts: [`setup`] adds them so that a shortcut taken
/// by another app (or unsupported, as on Wayland) is logged instead of aborting startup.
pub fn global_shortcut_plugin<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_global_shortcut::Builder::new().build()
}

pub fn setup<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    build_tray(app)?;
    exit_with_main_window(app);
    let registered =
        app.global_shortcut()
            .on_shortcut(CAPTURE_SHORTCUT, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    toggle_capture(app);
                }
            });
    if let Err(err) = registered {
        log::warn!("could not register {CAPTURE_SHORTCUT}: {err}");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_ids_round_trip() {
        for action in TrayAction::ALL {
            assert_eq!(TrayAction::from_id(action.id()), Some(action));
        }
        assert_eq!(TrayAction::from_id("settings"), None);
    }

    #[test]
    fn tray_labels_follow_the_locale() {
        assert_eq!(tray_labels(Some("fr_FR.UTF-8")).today, "Aujourd’hui");
        assert_eq!(tray_labels(Some("FR_be")).quit, "Quitter POuxis");
        assert_eq!(tray_labels(Some("en_US.UTF-8")).today, "Today");
        assert_eq!(tray_labels(None).capture, "Quick capture");
    }

    #[test]
    fn only_overlays_can_be_hidden() {
        assert!(is_overlay(CAPTURE_WINDOW));
        assert!(is_overlay(SCRAPBOOK_WINDOW));
        assert!(!is_overlay(MAIN_WINDOW));
    }
}
