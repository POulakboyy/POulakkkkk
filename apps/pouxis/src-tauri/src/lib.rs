//! POuxis native shell (Tauri 2): OS focus mode, deep links, and on desktop a tray, a
//! global quick-capture shortcut and a scrapbook drop window.

mod deep_link;
#[cfg(desktop)]
mod desktop;
mod events;
mod focus;

/// Entry point shared by the desktop binary and the iOS/Android libraries.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Must be the first plugin: a second launch (e.g. a `pouxis://` link opened on Windows
    // or Linux) is forwarded to the running instance, then to the deep-link plugin.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
        desktop::show_main(app);
    }));

    let builder = builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .manage(focus::FocusState::default())
        .manage(deep_link::DeepLinkQueue::default());

    #[cfg(desktop)]
    let builder = builder
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_denylist(&[events::CAPTURE_WINDOW, events::SCRAPBOOK_WINDOW])
                .build(),
        )
        .plugin(desktop::global_shortcut_plugin())
        .invoke_handler(tauri::generate_handler![
            focus::set_focus_mode,
            focus::focus_mode_support,
            deep_link::deep_link_take_pending,
            desktop::hide_overlay,
            desktop::toggle_scrapbook,
        ]);

    #[cfg(mobile)]
    let builder =
        builder
            .plugin(tauri_plugin_haptics::init())
            .invoke_handler(tauri::generate_handler![
                focus::set_focus_mode,
                focus::focus_mode_support,
                deep_link::deep_link_take_pending,
            ]);

    builder
        .setup(|app| {
            let handle = app.handle();
            deep_link::setup(handle);
            #[cfg(desktop)]
            desktop::setup(handle)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running POuxis");
}
