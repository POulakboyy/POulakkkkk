//! OS-level "Do Not Disturb" / Focus (feature 1.11), implemented honestly per OS.
//!
//! | OS      | Method                                                              |
//! |---------|---------------------------------------------------------------------|
//! | macOS   | No public DND API. Runs user-installed Shortcuts "POuxis Focus On" / |
//! |         | "POuxis Focus Off" through `/usr/bin/shortcuts` (macOS 12+).         |
//! | Linux   | GNOME only: `org.gnome.desktop.notifications show-banners` via       |
//! |         | `gsettings`; the previous value is restored when focus ends.         |
//! | Windows | Unsupported: Focus Assist has no public API (`FocusSessionManager`   |
//! |         | is a Limited Access Feature). The UI falls back to its quiet mode.   |
//! | iOS     | Unsupported: apps cannot toggle Focus; needs a Swift App Intents     |
//! |         | extension (Focus Filters) — see `src-tauri/README.md`.               |
//! | Android | Unsupported for now: needs a Kotlin plugin calling                   |
//! |         | `NotificationManager.setInterruptionFilter` (ACCESS_NOTIFICATION_POLICY). |
//!
//! The decision logic is written against a [`Runner`] so it compiles and is unit-tested on
//! every host, whatever OS the binary targets.

use std::io::Read;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;

/// How focus was (or would be) applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum FocusMethod {
    MacosShortcuts,
    GnomeGsettings,
    None,
}

/// Stable, machine-readable reason codes (the UI translates them).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum FocusReason {
    /// The OS offers no public API (Windows).
    NoPublicApi,
    /// The OS forbids third-party apps from toggling Focus (iOS).
    OsRestricted,
    /// Possible, but needs a native mobile plugin that is not written yet (Android).
    NeedsNativePlugin,
    /// `/usr/bin/shortcuts` is missing (macOS < 12).
    ShortcutsCliMissing,
    /// The "POuxis Focus On/Off" shortcuts are not installed.
    ShortcutMissing,
    /// Not a GNOME session (KDE, Sway, …).
    DesktopNotGnome,
    /// `gsettings` is not installed.
    GsettingsMissing,
    /// The GNOME notifications schema is not installed.
    SchemaMissing,
    /// The helper command ran and failed.
    CommandFailed,
    /// The helper command did not finish in time and was killed.
    Timeout,
}

/// Result of `set_focus_mode`, mirrored by `FocusModeResult` in `src/platform/index.ts`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FocusModeResult {
    pub applied: bool,
    pub method: FocusMethod,
    pub reason: Option<FocusReason>,
}

impl FocusModeResult {
    fn applied(method: FocusMethod) -> Self {
        Self {
            applied: true,
            method,
            reason: None,
        }
    }

    fn failed(method: FocusMethod, reason: FocusReason) -> Self {
        Self {
            applied: false,
            method,
            reason: Some(reason),
        }
    }

    fn unsupported(reason: FocusReason) -> Self {
        Self::failed(FocusMethod::None, reason)
    }
}

/// Result of `focus_mode_support`: whether `set_focus_mode` can work right now.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FocusModeSupport {
    pub available: bool,
    pub method: FocusMethod,
    pub reason: Option<FocusReason>,
}

impl From<FocusModeResult> for FocusModeSupport {
    fn from(r: FocusModeResult) -> Self {
        Self {
            available: r.applied,
            method: r.method,
            reason: r.reason,
        }
    }
}

/// Remembers what POuxis changed so that "focus off" restores the user's own setting.
#[derive(Default)]
pub struct FocusState {
    gnome_saved_banners: Mutex<Option<bool>>,
}

// --- process runner ----------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CmdOutput {
    pub success: bool,
    pub stdout: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RunError {
    NotFound,
    Timeout,
    Io,
}

/// Runs a program with fixed arguments (never through a shell).
pub trait Runner {
    fn run(&self, program: &str, args: &[&str], timeout: Duration)
        -> Result<CmdOutput, RunError>;
}

/// Bounded output read, so a chatty helper cannot exhaust memory.
const MAX_OUTPUT: u64 = 1 << 20;

pub struct SystemRunner;

impl Runner for SystemRunner {
    fn run(
        &self,
        program: &str,
        args: &[&str],
        timeout: Duration,
    ) -> Result<CmdOutput, RunError> {
        let mut child = Command::new(program)
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| match e.kind() {
                std::io::ErrorKind::NotFound => RunError::NotFound,
                _ => RunError::Io,
            })?;
        // Drain stdout on a thread so a full pipe cannot block the child past the deadline.
        let stdout = child.stdout.take();
        let reader = std::thread::spawn(move || {
            let mut buf = String::new();
            if let Some(out) = stdout {
                let _ = out.take(MAX_OUTPUT).read_to_string(&mut buf);
            }
            buf
        });
        let deadline = Instant::now() + timeout;
        let status = loop {
            match child.try_wait() {
                Ok(Some(status)) => break status,
                Ok(None) if Instant::now() >= deadline => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(RunError::Timeout);
                }
                Ok(None) => std::thread::sleep(Duration::from_millis(20)),
                Err(_) => {
                    let _ = child.kill();
                    return Err(RunError::Io);
                }
            }
        };
        Ok(CmdOutput {
            success: status.success(),
            stdout: reader.join().unwrap_or_default(),
        })
    }
}

// --- macOS: user-installed Shortcuts --------------------------------------------------------

pub const MAC_SHORTCUTS_BIN: &str = "/usr/bin/shortcuts";
pub const MAC_SHORTCUT_ON: &str = "POuxis Focus On";
pub const MAC_SHORTCUT_OFF: &str = "POuxis Focus Off";
const LIST_TIMEOUT: Duration = Duration::from_secs(5);
const RUN_TIMEOUT: Duration = Duration::from_secs(15);

fn mac_failure(err: RunError) -> FocusModeResult {
    match err {
        RunError::NotFound => FocusModeResult::unsupported(FocusReason::ShortcutsCliMissing),
        RunError::Timeout => FocusModeResult::failed(FocusMethod::MacosShortcuts, FocusReason::Timeout),
        RunError::Io => {
            FocusModeResult::failed(FocusMethod::MacosShortcuts, FocusReason::CommandFailed)
        }
    }
}

/// Checks that the given shortcuts are installed (`shortcuts list`, one name per line).
fn mac_check(runner: &dyn Runner, names: &[&str]) -> Result<(), FocusModeResult> {
    let out = runner
        .run(MAC_SHORTCUTS_BIN, &["list"], LIST_TIMEOUT)
        .map_err(mac_failure)?;
    if !out.success {
        return Err(FocusModeResult::failed(
            FocusMethod::MacosShortcuts,
            FocusReason::CommandFailed,
        ));
    }
    let installed = |name: &str| out.stdout.lines().any(|line| line.trim() == name);
    if names.iter().all(|n| installed(n)) {
        Ok(())
    } else {
        Err(FocusModeResult::failed(
            FocusMethod::MacosShortcuts,
            FocusReason::ShortcutMissing,
        ))
    }
}

pub fn macos_apply(on: bool, runner: &dyn Runner) -> FocusModeResult {
    let name = if on { MAC_SHORTCUT_ON } else { MAC_SHORTCUT_OFF };
    if let Err(result) = mac_check(runner, &[name]) {
        return result;
    }
    match runner.run(MAC_SHORTCUTS_BIN, &["run", name], RUN_TIMEOUT) {
        Ok(out) if out.success => FocusModeResult::applied(FocusMethod::MacosShortcuts),
        Ok(_) => FocusModeResult::failed(FocusMethod::MacosShortcuts, FocusReason::CommandFailed),
        Err(err) => mac_failure(err),
    }
}

pub fn macos_support(runner: &dyn Runner) -> FocusModeSupport {
    match mac_check(runner, &[MAC_SHORTCUT_ON, MAC_SHORTCUT_OFF]) {
        Ok(()) => FocusModeResult::applied(FocusMethod::MacosShortcuts).into(),
        Err(result) => result.into(),
    }
}

// --- Linux: GNOME notification banners -------------------------------------------------------

const GSETTINGS: &str = "gsettings";
const GNOME_SCHEMA: &str = "org.gnome.desktop.notifications";
const GNOME_KEY: &str = "show-banners";
const GSETTINGS_TIMEOUT: Duration = Duration::from_secs(5);

fn is_gnome(xdg_current_desktop: Option<&str>) -> bool {
    xdg_current_desktop.is_some_and(|value| {
        value
            .split(':')
            .any(|part| part.trim().eq_ignore_ascii_case("gnome"))
    })
}

fn gnome_failure(err: RunError) -> FocusModeResult {
    match err {
        RunError::NotFound => FocusModeResult::unsupported(FocusReason::GsettingsMissing),
        RunError::Timeout => FocusModeResult::failed(FocusMethod::GnomeGsettings, FocusReason::Timeout),
        RunError::Io => {
            FocusModeResult::failed(FocusMethod::GnomeGsettings, FocusReason::CommandFailed)
        }
    }
}

/// Reads `show-banners`; a failing `get` means the schema is not installed.
fn gnome_read_banners(
    xdg_current_desktop: Option<&str>,
    runner: &dyn Runner,
) -> Result<bool, FocusModeResult> {
    if !is_gnome(xdg_current_desktop) {
        return Err(FocusModeResult::unsupported(FocusReason::DesktopNotGnome));
    }
    let out = runner
        .run(GSETTINGS, &["get", GNOME_SCHEMA, GNOME_KEY], GSETTINGS_TIMEOUT)
        .map_err(gnome_failure)?;
    if !out.success {
        return Err(FocusModeResult::unsupported(FocusReason::SchemaMissing));
    }
    match out.stdout.trim() {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err(FocusModeResult::failed(
            FocusMethod::GnomeGsettings,
            FocusReason::CommandFailed,
        )),
    }
}

pub fn gnome_apply(
    on: bool,
    xdg_current_desktop: Option<&str>,
    state: &FocusState,
    runner: &dyn Runner,
) -> FocusModeResult {
    let current = match gnome_read_banners(xdg_current_desktop, runner) {
        Ok(value) => value,
        Err(result) => return result,
    };
    let mut saved = state
        .gnome_saved_banners
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    // Focus on: hide banners and remember the user's value (only the first time, so that
    // repeated "on" calls do not overwrite it with our own `false`).
    // Focus off: restore what we saved; without a saved value, show banners again.
    let (target, remember) = if on {
        (false, saved.is_none().then_some(current))
    } else {
        (saved.unwrap_or(true), None)
    };
    if current != target {
        let value = if target { "true" } else { "false" };
        match runner.run(
            GSETTINGS,
            &["set", GNOME_SCHEMA, GNOME_KEY, value],
            GSETTINGS_TIMEOUT,
        ) {
            Ok(out) if out.success => {}
            Ok(_) => {
                return FocusModeResult::failed(
                    FocusMethod::GnomeGsettings,
                    FocusReason::CommandFailed,
                )
            }
            Err(err) => return gnome_failure(err),
        }
    }
    if on {
        if let Some(value) = remember {
            *saved = Some(value);
        }
    } else {
        *saved = None;
    }
    FocusModeResult::applied(FocusMethod::GnomeGsettings)
}

pub fn gnome_support(xdg_current_desktop: Option<&str>, runner: &dyn Runner) -> FocusModeSupport {
    match gnome_read_banners(xdg_current_desktop, runner) {
        Ok(_) => FocusModeResult::applied(FocusMethod::GnomeGsettings).into(),
        Err(result) => result.into(),
    }
}

// --- per-OS dispatch -------------------------------------------------------------------------

/// Reason returned on platforms without any implementation.
#[allow(dead_code)] // each target uses one arm only
fn platform_unsupported_reason() -> FocusReason {
    if cfg!(target_os = "ios") {
        FocusReason::OsRestricted
    } else if cfg!(target_os = "android") {
        FocusReason::NeedsNativePlugin
    } else {
        FocusReason::NoPublicApi
    }
}

#[cfg(target_os = "linux")]
fn xdg_current_desktop() -> Option<String> {
    std::env::var("XDG_CURRENT_DESKTOP").ok()
}

#[allow(unused_variables)]
pub fn apply(on: bool, state: &FocusState) -> FocusModeResult {
    #[cfg(target_os = "macos")]
    return macos_apply(on, &SystemRunner);
    #[cfg(target_os = "linux")]
    return gnome_apply(on, xdg_current_desktop().as_deref(), state, &SystemRunner);
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    return FocusModeResult::unsupported(platform_unsupported_reason());
}

pub fn support() -> FocusModeSupport {
    #[cfg(target_os = "macos")]
    return macos_support(&SystemRunner);
    #[cfg(target_os = "linux")]
    return gnome_support(xdg_current_desktop().as_deref(), &SystemRunner);
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    return FocusModeResult::unsupported(platform_unsupported_reason()).into();
}

// --- commands --------------------------------------------------------------------------------

/// Turns OS-level focus on or off. Runs helper processes off the async runtime.
#[tauri::command]
pub async fn set_focus_mode<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    on: bool,
) -> FocusModeResult {
    use tauri::Manager;
    let result = tauri::async_runtime::spawn_blocking(move || {
        apply(on, app.state::<FocusState>().inner())
    })
    .await;
    result.unwrap_or_else(|_| {
        FocusModeResult::failed(FocusMethod::None, FocusReason::CommandFailed)
    })
}

/// Says whether `set_focus_mode` can work (for the settings screen), without changing anything.
#[tauri::command]
pub async fn focus_mode_support() -> FocusModeSupport {
    tauri::async_runtime::spawn_blocking(support)
        .await
        .unwrap_or_else(|_| {
            FocusModeResult::failed(FocusMethod::None, FocusReason::CommandFailed).into()
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    /// Scripted runner: answers by matching the joined command line.
    struct Fake {
        answers: Vec<(&'static str, Result<CmdOutput, RunError>)>,
        calls: RefCell<Vec<String>>,
    }

    fn ok(stdout: &str) -> Result<CmdOutput, RunError> {
        Ok(CmdOutput {
            success: true,
            stdout: stdout.to_owned(),
        })
    }

    fn failed() -> Result<CmdOutput, RunError> {
        Ok(CmdOutput {
            success: false,
            stdout: String::new(),
        })
    }

    impl Fake {
        fn new(answers: Vec<(&'static str, Result<CmdOutput, RunError>)>) -> Self {
            Self {
                answers,
                calls: RefCell::new(Vec::new()),
            }
        }
        fn calls(&self) -> Vec<String> {
            self.calls.borrow().clone()
        }
    }

    impl Runner for Fake {
        fn run(&self, program: &str, args: &[&str], _: Duration) -> Result<CmdOutput, RunError> {
            let line = std::iter::once(program)
                .chain(args.iter().copied())
                .collect::<Vec<_>>()
                .join(" ");
            self.calls.borrow_mut().push(line.clone());
            self.answers
                .iter()
                .find(|(prefix, _)| line.starts_with(prefix))
                .map(|(_, answer)| answer.clone())
                .unwrap_or(Err(RunError::NotFound))
        }
    }

    const LIST: &str = "Morning\nPOuxis Focus On\nPOuxis Focus Off\n";

    #[test]
    fn macos_runs_the_matching_shortcut() {
        let fake = Fake::new(vec![
            ("/usr/bin/shortcuts list", ok(LIST)),
            ("/usr/bin/shortcuts run", ok("")),
        ]);
        assert_eq!(
            macos_apply(true, &fake),
            FocusModeResult::applied(FocusMethod::MacosShortcuts)
        );
        assert_eq!(fake.calls()[1], "/usr/bin/shortcuts run POuxis Focus On");
    }

    #[test]
    fn macos_reports_missing_shortcut_or_cli() {
        let fake = Fake::new(vec![("/usr/bin/shortcuts list", ok("Morning\n"))]);
        assert_eq!(
            macos_apply(false, &fake).reason,
            Some(FocusReason::ShortcutMissing)
        );
        assert_eq!(fake.calls().len(), 1, "must not run anything");

        let none = Fake::new(vec![]);
        let result = macos_apply(true, &none);
        assert_eq!(result.method, FocusMethod::None);
        assert_eq!(result.reason, Some(FocusReason::ShortcutsCliMissing));
    }

    #[test]
    fn macos_reports_failures_and_timeouts() {
        let failing = Fake::new(vec![
            ("/usr/bin/shortcuts list", ok(LIST)),
            ("/usr/bin/shortcuts run", failed()),
        ]);
        assert_eq!(
            macos_apply(true, &failing).reason,
            Some(FocusReason::CommandFailed)
        );
        let slow = Fake::new(vec![
            ("/usr/bin/shortcuts list", ok(LIST)),
            ("/usr/bin/shortcuts run", Err(RunError::Timeout)),
        ]);
        assert_eq!(macos_apply(true, &slow).reason, Some(FocusReason::Timeout));
    }

    #[test]
    fn macos_support_needs_both_shortcuts() {
        let one = Fake::new(vec![("/usr/bin/shortcuts list", ok("POuxis Focus On\n"))]);
        assert!(!macos_support(&one).available);
        let both = Fake::new(vec![("/usr/bin/shortcuts list", ok(LIST))]);
        assert!(macos_support(&both).available);
    }

    #[test]
    fn gnome_detection() {
        assert!(is_gnome(Some("GNOME")));
        assert!(is_gnome(Some("ubuntu:GNOME")));
        assert!(!is_gnome(Some("KDE")));
        assert!(!is_gnome(None));
        let fake = Fake::new(vec![]);
        let result = gnome_apply(true, Some("KDE"), &FocusState::default(), &fake);
        assert_eq!(result.reason, Some(FocusReason::DesktopNotGnome));
        assert!(fake.calls().is_empty());
    }

    #[test]
    fn gnome_hides_banners_then_restores_the_user_value() {
        let state = FocusState::default();
        let on = Fake::new(vec![("gsettings get", ok("true\n")), ("gsettings set", ok(""))]);
        assert!(gnome_apply(true, Some("GNOME"), &state, &on).applied);
        assert_eq!(
            on.calls()[1],
            "gsettings set org.gnome.desktop.notifications show-banners false"
        );

        // A second "on" (banners now false) must not overwrite the saved `true`.
        let again = Fake::new(vec![("gsettings get", ok("false\n"))]);
        assert!(gnome_apply(true, Some("GNOME"), &state, &again).applied);
        assert_eq!(again.calls().len(), 1, "already hidden: no set");

        let off = Fake::new(vec![("gsettings get", ok("false\n")), ("gsettings set", ok(""))]);
        assert!(gnome_apply(false, Some("GNOME"), &state, &off).applied);
        assert_eq!(
            off.calls()[1],
            "gsettings set org.gnome.desktop.notifications show-banners true"
        );
    }

    #[test]
    fn gnome_keeps_banners_off_when_the_user_had_them_off() {
        let state = FocusState::default();
        let on = Fake::new(vec![("gsettings get", ok("false\n"))]);
        assert!(gnome_apply(true, Some("GNOME"), &state, &on).applied);
        let off = Fake::new(vec![("gsettings get", ok("false\n"))]);
        assert!(gnome_apply(false, Some("GNOME"), &state, &off).applied);
        assert_eq!(off.calls().len(), 1, "restoring `false` needs no set");
    }

    #[test]
    fn gnome_reports_missing_tools_and_failed_writes() {
        let state = FocusState::default();
        let none = Fake::new(vec![]);
        assert_eq!(
            gnome_apply(true, Some("GNOME"), &state, &none).reason,
            Some(FocusReason::GsettingsMissing)
        );
        let no_schema = Fake::new(vec![("gsettings get", failed())]);
        assert_eq!(
            gnome_apply(true, Some("GNOME"), &state, &no_schema).reason,
            Some(FocusReason::SchemaMissing)
        );
        let read_only = Fake::new(vec![("gsettings get", ok("true")), ("gsettings set", failed())]);
        assert_eq!(
            gnome_apply(true, Some("GNOME"), &state, &read_only).reason,
            Some(FocusReason::CommandFailed)
        );
        // The failed write must not leave a saved value behind.
        let off = Fake::new(vec![("gsettings get", ok("true"))]);
        assert!(gnome_apply(false, Some("GNOME"), &state, &off).applied);
        assert_eq!(off.calls().len(), 1);
    }

    #[test]
    fn serializes_for_the_frontend() {
        let json = serde_json::to_string(&FocusModeResult::failed(
            FocusMethod::None,
            FocusReason::NoPublicApi,
        ))
        .unwrap();
        assert_eq!(
            json,
            r#"{"applied":false,"method":"none","reason":"no-public-api"}"#
        );
        let json = serde_json::to_string(&FocusModeResult::applied(FocusMethod::MacosShortcuts))
            .unwrap();
        assert_eq!(
            json,
            r#"{"applied":true,"method":"macos-shortcuts","reason":null}"#
        );
    }

    #[test]
    fn system_runner_reports_missing_programs_and_timeouts() {
        let runner = SystemRunner;
        assert_eq!(
            runner.run("/nonexistent/pouxis-helper", &[], Duration::from_secs(1)),
            Err(RunError::NotFound)
        );
        if cfg!(unix) {
            let out = runner
                .run("/bin/echo", &["hello"], Duration::from_secs(5))
                .unwrap();
            assert!(out.success);
            assert_eq!(out.stdout.trim(), "hello");
            assert_eq!(
                runner.run("/bin/sleep", &["5"], Duration::from_millis(100)),
                Err(RunError::Timeout)
            );
        }
    }
}
