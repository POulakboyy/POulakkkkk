//! `pouxis://` deep links (feature 1.13): `pouxis://event/<id>` and `pouxis://task/<id>`.
//!
//! Deep links are untrusted input (any web page or app can open one), so they are parsed
//! strictly here and only a canonical, validated payload ever reaches the frontend.
//! Links that arrive before the UI listens (cold start) are queued until the frontend calls
//! `deep_link_take_pending`, after which they are emitted live.

use std::collections::VecDeque;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::events::{DEEP_LINK, MAIN_WINDOW};

/// The URL scheme registered with the OS (see `plugins.deep-link` in `tauri.conf.json`).
pub const SCHEME: &str = "pouxis";
/// Longest raw URL we even try to parse.
const MAX_URL_LEN: usize = 512;
/// Longest accepted record id (UUIDs are 36 chars; leave room for other id shapes).
const MAX_ID_LEN: usize = 128;
/// Links kept while the UI is not ready; older ones are dropped first.
const MAX_PENDING: usize = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DeepLinkKind {
    Event,
    Task,
}

impl DeepLinkKind {
    fn parse(segment: &str) -> Option<Self> {
        if segment.eq_ignore_ascii_case("event") {
            Some(Self::Event)
        } else if segment.eq_ignore_ascii_case("task") {
            Some(Self::Task)
        } else {
            None
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Event => "event",
            Self::Task => "task",
        }
    }
}

/// Payload of the `pouxis:deep-link` event. `url` is rebuilt from the validated parts,
/// never echoed from the raw input.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeepLinkPayload {
    pub kind: DeepLinkKind,
    pub id: String,
    pub url: String,
}

fn is_valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID_LEN
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// Parses `pouxis://<kind>/<id>` (query string and fragment ignored, trailing slash allowed).
pub fn parse(raw: &str) -> Option<DeepLinkPayload> {
    if raw.len() > MAX_URL_LEN {
        return None;
    }
    let (scheme, rest) = raw.split_once("://")?;
    if !scheme.eq_ignore_ascii_case(SCHEME) {
        return None;
    }
    let path = rest.split(['?', '#']).next().unwrap_or_default();
    let path = path.strip_suffix('/').unwrap_or(path);
    let mut segments = path.split('/');
    let kind = DeepLinkKind::parse(segments.next()?)?;
    let id = segments.next()?;
    if segments.next().is_some() || !is_valid_id(id) {
        return None;
    }
    Some(DeepLinkPayload {
        kind,
        id: id.to_owned(),
        url: format!("{SCHEME}://{}/{id}", kind.as_str()),
    })
}

#[derive(Default)]
struct QueueInner {
    /// True once the frontend drained the queue: links are then emitted immediately.
    ready: bool,
    pending: VecDeque<DeepLinkPayload>,
}

/// Holds links until the main window is listening.
#[derive(Default)]
pub struct DeepLinkQueue(Mutex<QueueInner>);

impl DeepLinkQueue {
    /// Queues the link and returns `None`, or returns it back when it can be emitted now.
    fn offer(&self, link: DeepLinkPayload) -> Option<DeepLinkPayload> {
        let mut inner = self.0.lock().unwrap_or_else(|e| e.into_inner());
        if inner.ready {
            return Some(link);
        }
        if inner.pending.back() != Some(&link) {
            if inner.pending.len() == MAX_PENDING {
                inner.pending.pop_front();
            }
            inner.pending.push_back(link);
        }
        None
    }

    /// Marks the frontend as ready and returns the queued links, oldest first.
    fn drain(&self) -> Vec<DeepLinkPayload> {
        let mut inner = self.0.lock().unwrap_or_else(|e| e.into_inner());
        inner.ready = true;
        inner.pending.drain(..).collect()
    }
}

/// Validates a raw URL and routes it to the main window (or the cold-start queue).
pub fn dispatch<R: Runtime>(app: &AppHandle<R>, raw: &str) {
    let Some(link) = parse(raw) else {
        // Do not log the raw value: it is attacker-controlled.
        log::warn!("ignored a malformed {SCHEME}:// link");
        return;
    };
    #[cfg(desktop)]
    crate::desktop::show_main(app);
    if let Some(link) = app.state::<DeepLinkQueue>().offer(link) {
        if let Err(err) = app.emit_to(MAIN_WINDOW, DEEP_LINK, link) {
            log::warn!("could not emit deep link: {err}");
        }
    }
}

/// Wires the deep-link plugin: live links, the launch link, and runtime scheme registration
/// where installers do not do it (dev builds on Windows/Linux, AppImage).
pub fn setup<R: Runtime>(app: &AppHandle<R>) {
    use tauri_plugin_deep_link::DeepLinkExt;

    #[cfg(any(target_os = "linux", windows))]
    {
        let appimage = cfg!(target_os = "linux") && std::env::var_os("APPIMAGE").is_some();
        if cfg!(debug_assertions) || appimage {
            if let Err(err) = app.deep_link().register_all() {
                log::warn!("could not register the {SCHEME}:// scheme: {err}");
            }
        }
    }

    let handle = app.clone();
    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            dispatch(&handle, url.as_str());
        }
    });

    match app.deep_link().get_current() {
        Ok(Some(urls)) => {
            for url in urls {
                dispatch(app, url.as_str());
            }
        }
        Ok(None) => {}
        Err(err) => log::warn!("could not read the launch deep link: {err}"),
    }
}

/// Called by the main window once it listens to `pouxis:deep-link`.
#[tauri::command]
pub fn deep_link_take_pending(queue: tauri::State<'_, DeepLinkQueue>) -> Vec<DeepLinkPayload> {
    queue.drain()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn link(kind: DeepLinkKind, id: &str) -> DeepLinkPayload {
        DeepLinkPayload {
            kind,
            id: id.to_owned(),
            url: format!("pouxis://{}/{id}", kind.as_str()),
        }
    }

    #[test]
    fn parses_event_and_task_links() {
        let uuid = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
        assert_eq!(
            parse(&format!("pouxis://event/{uuid}")),
            Some(link(DeepLinkKind::Event, uuid))
        );
        assert_eq!(
            parse("pouxis://task/abc_123"),
            Some(link(DeepLinkKind::Task, "abc_123"))
        );
    }

    #[test]
    fn tolerates_case_trailing_slash_query_and_fragment() {
        let expected = Some(link(DeepLinkKind::Task, "A1"));
        assert_eq!(parse("POUXIS://Task/A1/"), expected);
        assert_eq!(parse("pouxis://task/A1?from=note"), expected);
        assert_eq!(parse("pouxis://task/A1#x"), expected);
    }

    #[test]
    fn rejects_everything_else() {
        for raw in [
            "",
            "pouxis://",
            "pouxis://task",
            "pouxis://task/",
            "pouxis://note/1",
            "pouxis://task/1/extra",
            "pouxis://task/a%2Fb",
            "pouxis://task/a b",
            "pouxis://task/../../etc",
            "pouxis://task/<script>",
            "https://task/1",
            "pouxis:task/1",
        ] {
            assert_eq!(parse(raw), None, "{raw:?} should be rejected");
        }
        let long = format!("pouxis://task/{}", "a".repeat(MAX_ID_LEN + 1));
        assert_eq!(parse(&long), None);
    }

    #[test]
    fn rebuilds_the_url_instead_of_echoing_input() {
        let parsed = parse("PouXis://EVENT/x1?token=secret").unwrap();
        assert_eq!(parsed.url, "pouxis://event/x1");
    }

    #[test]
    fn queues_until_drained_then_passes_through() {
        let queue = DeepLinkQueue::default();
        let a = link(DeepLinkKind::Task, "a");
        let b = link(DeepLinkKind::Event, "b");
        assert_eq!(queue.offer(a.clone()), None);
        assert_eq!(queue.offer(a.clone()), None, "consecutive duplicates are collapsed");
        assert_eq!(queue.offer(b.clone()), None);
        assert_eq!(queue.drain(), vec![a.clone(), b]);
        assert_eq!(queue.offer(a.clone()), Some(a));
        assert!(queue.drain().is_empty());
    }

    #[test]
    fn bounds_the_cold_start_queue() {
        let queue = DeepLinkQueue::default();
        for i in 0..(MAX_PENDING + 4) {
            queue.offer(link(DeepLinkKind::Task, &i.to_string()));
        }
        let drained = queue.drain();
        assert_eq!(drained.len(), MAX_PENDING);
        assert_eq!(drained[0].id, "4");
    }

    #[test]
    fn serializes_for_the_frontend() {
        let json = serde_json::to_string(&link(DeepLinkKind::Event, "e1")).unwrap();
        assert_eq!(
            json,
            r#"{"kind":"event","id":"e1","url":"pouxis://event/e1"}"#
        );
    }
}
