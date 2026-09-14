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

use crate::security::{default_secret_backend, KeyMask, SecretBackend};

// ─── Time helper ────────────────────────────────────────────────────────────

/// Milliseconds since the Unix epoch. Falls back to 0 on a pre-epoch clock.
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Convert epoch milliseconds to an ISO 8601 UTC timestamp (`...Z`).
///
/// Implemented locally (no chrono/time dependency) so the serialized `Task`
/// timestamps match the TypeScript `string` fields exactly.
pub fn iso8601_from_ms(ms: u64) -> String {
    let secs = ms / 1000;
    let millis = ms % 1000;
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let (year, month, day) = civil_from_days(days);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year,
        month,
        day,
        rem / 3600,
        (rem % 3600) / 60,
        rem % 60,
        millis
    )
}

/// Howard Hinnant's `civil_from_days`: days since 1970-01-01 to `(y, m, d)`.
fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
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

// ─── Task / activity / approval domain DTOs ──────────────────────────────────
//
// These mirror the TypeScript contracts consumed by the desktop adapter
// (`apps/desktop/src/ipc/types.ts`, `@aegis/shared` and `@aegis/approval`)
// field-for-field. Every struct is `camelCase`; every string-union enum is
// lowercase so the serialized JSON is byte-compatible with the TypeScript
// literal unions.

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Idle,
    Running,
    Completed,
    Failed,
    Paused,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub name: String,
    pub status: TaskStatus,
    /// Workspace-relative script location. Never an absolute path.
    pub script_path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StepType {
    Click,
    Type,
    Navigate,
    Wait,
    Screenshot,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct StepTarget {
    pub selector: Option<String>,
    pub text: Option<String>,
    pub screenshot: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OperationStep {
    #[serde(rename = "type")]
    pub step_type: StepType,
    pub target: StepTarget,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OperationSource {
    Browser,
    Desktop,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OperationLog {
    pub id: String,
    pub task_id: String,
    pub steps: Vec<OperationStep>,
    pub recorded_at: String,
    pub source: OperationSource,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RunStatus {
    Idle,
    Running,
    Paused,
    Completed,
    Failed,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TaskRun {
    pub id: String,
    pub task_id: String,
    pub status: RunStatus,
    pub started_at: u64,
    pub finished_at: Option<u64>,
    pub steps: Vec<OperationStep>,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HealingEventType {
    Error,
    Healing,
    Healed,
    Failed,
    Fallback,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HealingEvent {
    pub id: String,
    pub task_id: String,
    #[serde(rename = "type")]
    pub event_type: HealingEventType,
    pub message: String,
    pub strategy: Option<String>,
    pub timestamp: u64,
    pub resolved: bool,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RecorderStatus {
    #[default]
    Idle,
    Recording,
    Paused,
    Stopped,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotRef {
    pub id: String,
    pub label: String,
    pub captured_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RecorderSession {
    pub status: RecorderStatus,
    pub started_at: Option<u64>,
    pub stopped_at: Option<u64>,
    pub actions: Vec<OperationStep>,
    pub screenshots: Vec<ScreenshotRef>,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// `ExceptionHandler.riskLevel` never uses `critical` in the TypeScript contract.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ExceptionRiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ApprovalState {
    Pending,
    Reviewing,
    Approved,
    Rejected,
    Locked,
    Expired,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExceptionHandler {
    pub condition: String,
    pub action: String,
    pub code: String,
    pub risk_level: ExceptionRiskLevel,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SafetyCheck {
    pub id: String,
    pub name: String,
    pub passed: bool,
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRequest {
    pub id: String,
    pub task_id: String,
    pub code: String,
    pub explanation: String,
    pub exception_handlers: Vec<ExceptionHandler>,
    pub safety_checks: Vec<SafetyCheck>,
    pub created_at: u64,
    pub expires_at: Option<u64>,
    pub risk_level: RiskLevel,
    pub state: ApprovalState,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DependencyStatus {
    Ok,
    Missing,
    Outdated,
    Error,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DependencyCheck {
    pub name: String,
    pub installed: String,
    pub version: String,
    pub required: String,
    pub status: DependencyStatus,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SetupState {
    pub dependencies: Vec<DependencyCheck>,
    pub completed: bool,
}

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NewTaskInput {
    pub name: String,
}

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub task_id: String,
    pub name: String,
}

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderKeyInput {
    pub provider_id: String,
    pub api_key: String,
    pub model: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ApprovalDecision {
    Approved,
    Rejected,
}

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalDecisionInput {
    pub request_id: String,
    pub decision: ApprovalDecision,
    pub reason: Option<String>,
}

/// In-memory source of truth for the task/approval/healing/activity domain.
///
/// `tasks`, `activity`, `completed_setup` and `provider_models` are persisted
/// to the app data directory by the `tasks` module; approvals, healing events,
/// screenshots and the active run are session-scoped.
#[derive(Debug, Default)]
pub struct DomainStore {
    pub tasks: Vec<Task>,
    pub activity: Vec<OperationLog>,
    pub approvals: Vec<ApprovalRequest>,
    pub healing: Vec<HealingEvent>,
    pub active_run: Option<TaskRun>,
    pub completed_setup: bool,
    pub provider_models: BTreeMap<String, String>,
    pub screenshots: Vec<ScreenshotRef>,
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
    pub domain: Mutex<DomainStore>,
    /// Raw-secret storage (OS keychain by default; in-memory in tests).
    pub secrets: Arc<dyn SecretBackend>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            recorder: Mutex::new(RecorderState::idle()),
            executor: Mutex::new(ExecutorState::default()),
            keychain: Mutex::new(KeychainStore::default()),
            domain: Mutex::new(DomainStore::default()),
            secrets: default_secret_backend(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn iso8601_formats_known_epoch_values() {
        assert_eq!(iso8601_from_ms(0), "1970-01-01T00:00:00.000Z");
        assert_eq!(
            iso8601_from_ms(1_700_000_000_000),
            "2023-11-14T22:13:20.000Z"
        );
        // Leap day.
        assert_eq!(
            iso8601_from_ms(1_582_934_400_000),
            "2020-02-29T00:00:00.000Z"
        );
        // Sub-second precision is preserved.
        assert_eq!(
            iso8601_from_ms(1_700_000_000_123),
            "2023-11-14T22:13:20.123Z"
        );
    }

    #[test]
    fn domain_dtos_serialize_to_camel_case_typescript_shapes() {
        let task = Task {
            id: "task-1".to_string(),
            name: "Task".to_string(),
            status: TaskStatus::Idle,
            script_path: "scripts/task.py".to_string(),
            created_at: "2023-11-14T22:13:20.000Z".to_string(),
            updated_at: "2023-11-14T22:13:20.000Z".to_string(),
        };
        let task_json = serde_json::to_value(&task).unwrap();
        assert_eq!(task_json["scriptPath"], "scripts/task.py");
        assert_eq!(task_json["status"], "idle");

        let run = TaskRun {
            id: "run-1".to_string(),
            task_id: "task-1".to_string(),
            status: RunStatus::Running,
            started_at: 5,
            finished_at: None,
            steps: Vec::new(),
        };
        let run_json = serde_json::to_value(&run).unwrap();
        assert_eq!(run_json["taskId"], "task-1");
        assert_eq!(run_json["startedAt"], 5);
        assert_eq!(run_json["status"], "running");

        let step = OperationStep {
            step_type: StepType::Click,
            target: StepTarget::default(),
            timestamp: "2023-11-14T22:13:20.000Z".to_string(),
        };
        let step_json = serde_json::to_value(&step).unwrap();
        assert_eq!(step_json["type"], "click");
        assert!(step_json.get("stepType").is_none());

        let healing = HealingEvent {
            id: "heal-1".to_string(),
            task_id: "task-1".to_string(),
            event_type: HealingEventType::Fallback,
            message: "message".to_string(),
            strategy: None,
            timestamp: 1,
            resolved: false,
        };
        let healing_json = serde_json::to_value(&healing).unwrap();
        assert_eq!(healing_json["type"], "fallback");
        assert_eq!(healing_json["taskId"], "task-1");
    }

    #[test]
    fn approval_dto_serializes_nested_camel_case_fields() {
        let request = ApprovalRequest {
            id: "req-1".to_string(),
            task_id: "task-1".to_string(),
            code: "print()".to_string(),
            explanation: "demo".to_string(),
            exception_handlers: vec![ExceptionHandler {
                condition: "cond".to_string(),
                action: "act".to_string(),
                code: "code".to_string(),
                risk_level: ExceptionRiskLevel::High,
            }],
            safety_checks: vec![SafetyCheck {
                id: "check-1".to_string(),
                name: "name".to_string(),
                passed: true,
                message: "ok".to_string(),
            }],
            created_at: 1,
            expires_at: None,
            risk_level: RiskLevel::Low,
            state: ApprovalState::Reviewing,
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["taskId"], "task-1");
        assert_eq!(json["exceptionHandlers"][0]["riskLevel"], "high");
        assert_eq!(json["safetyChecks"][0]["passed"], true);
        assert_eq!(json["riskLevel"], "low");
        assert_eq!(json["state"], "reviewing");
    }
}
