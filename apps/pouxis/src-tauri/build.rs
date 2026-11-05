// Declaring the app commands generates one `allow-<command>` permission per command, so
// each window only gets the commands its capability file grants (least privilege).
const COMMANDS: &[&str] = &[
    "set_focus_mode",
    "focus_mode_support",
    "deep_link_take_pending",
    "hide_overlay",
    "toggle_scrapbook",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run the Tauri build script");
}
