//! Shared IPC data-transfer objects, application state and small helpers.
//!
//! Every struct in this module mirrors the TypeScript contract in
//! `packages/@aegis/recorder/src/types.ts` and `packages/@aegis/executor/src/types.ts`
//! field-for-field using `#[serde(rename_all = "camelCase")]`.

use std::collections::BTreeMap;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

// Bring the base64 `Engine` trait into scope for the screenshot encoder.
// (Modules that use the encoder import it locally as well; kept here so the
// shared DTO module is the single documented home of the encoding helper.)
#[allow(unused_imports)]
use base64::engine::Engine as _;

use crate::security::KeyMask;

// ─── Time helper ────────────────────────────────────────────────────────────

/// Milliseconds since the Unix epoch. Falls back to 0 on a pre-epoch clock.
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ─── Recording state machine DTOs ────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RecordingState {
    Idle,
    Recording,
    Paused,
    Stopped,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ElementSelector {
    pub text: Option<String>,
    pub label: Option<String>,
    pub placeholder: Option<String>,
    pub xpath: Option<String>,
    pub css_selector: Option<String>,
    pub role: Option<String>,
    pub aria_label: Option<String>,
    pub tag_name: Option<String>,
    pub class_name: Option<String>,
    pub index: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ActionMetadata {
    pub url: Option<String>,
    pub title: Option<String>,
    pub value: Option<String>,
    pub key_code: Option<String>,
    pub scroll_direction: Option<String>,
    pub scroll_amount: Option<u32>,
    pub duration: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecordedAction {
    pub id: String,
    #[serde(rename = "type")]
    pub action_type: String,
    pub timestamp: u64,
    pub selector: ElementSelector,
    pub metadata: ActionMetadata,
    pub screenshot: Option<String>,
    pub before_screenshot: Option<String>,
    pub after_screenshot: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct CapturedSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SessionMetadata {
    pub platform: String,
    pub browser: Option<String>,
    pub screen_size: Option<CapturedSize>,
    pub user_agent: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecordingSession {
    pub id: String,
    pub name: String,
    pub start_time: u64,
    pub end_time: Option<u64>,
    pub state: RecordingState,
    pub actions: Vec<RecordedAction>,
    pub metadata: SessionMetadata,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct BoundingBox {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

// ─── Application state ───────────────────────────────────────────────────────

/// Recorder state: the current session (if any) plus a duplicated state marker
/// so the state machine never has to inspect the session to answer queries.
#[derive(Debug)]
pub struct RecorderState {
    pub session: Option<RecordingSession>,
    pub state: RecordingState,
}

impl RecorderState {
    pub fn idle() -> Self {
        RecorderState {
            session: None,
            state: RecordingState::Idle,
        }
    }
}

/// Executor state: holds the cancel flag of the in-flight run, if any.
#[derive(Debug, Default)]
pub struct ExecutorState {
    pub running: Option<Arc<AtomicBool>>,
}

/// In-memory mock keychain. Values only ever hold a mask, never secret material.
#[derive(Debug, Default)]
pub struct KeychainStore {
    pub entries: BTreeMap<String, KeyMask>,
}

pub struct AppState {
    pub recorder: Mutex<RecorderState>,
    pub executor: Mutex<ExecutorState>,
    pub keychain: Mutex<KeychainStore>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            recorder: Mutex::new(RecorderState::idle()),
            executor: Mutex::new(ExecutorState::default()),
            keychain: Mutex::new(KeychainStore::default()),
        }
    }
}

// AppState is intentionally composed only of Send + Sync primitives. This
// assertion documents and enforces that invariant at compile time.
#[allow(dead_code)]
fn _assert_app_state_is_send_sync() {
    fn assert_send_sync<T: Send + Sync + 'static>() {}
    assert_send_sync::<AppState>();
}
