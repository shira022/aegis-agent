//! Tauri-free state, persistence and pure transitions for the task domain.
//!
//! Everything in this module is independent of the Tauri runtime so it can be
//! unit tested without a display or the `webkit2gtk` toolchain. The command
//! wrappers live in the parent module.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::ipc::{
    iso8601_from_ms, ApprovalDecision, ApprovalDecisionInput, ApprovalRequest, ApprovalState,
    DependencyCheck, DependencyStatus, DomainStore, OperationLog, OperationSource, RunStatus, Task,
    TaskRun, TaskStatus,
};

/// Name of the JSON file inside the app data directory.
pub const STATE_FILE: &str = "aegis-state.json";
/// Schema version, bumped when the persisted shape changes incompatibly.
pub const STATE_VERSION: u32 = 1;

// ─── Persistence ─────────────────────────────────────────────────────────────

/// On-disk shape. Deliberately a separate struct so the in-memory
/// [`DomainStore`] can carry session-only data without leaking it to disk.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    version: u32,
    tasks: Vec<Task>,
    activity: Vec<OperationLog>,
    completed: bool,
    provider_models: BTreeMap<String, String>,
}

fn persisted_from(store: &DomainStore) -> PersistedState {
    PersistedState {
        version: STATE_VERSION,
        tasks: store.tasks.clone(),
        activity: store.activity.clone(),
        completed: store.completed_setup,
        provider_models: store.provider_models.clone(),
    }
}

/// Load persisted state from `dir`; missing or unreadable files start empty.
pub fn load_from_dir(dir: &Path) -> DomainStore {
    let path = dir.join(STATE_FILE);
    let Ok(raw) = fs::read_to_string(&path) else {
        return DomainStore::default();
    };
    let Ok(persisted) = serde_json::from_str::<PersistedState>(&raw) else {
        return DomainStore::default();
    };

    DomainStore {
        tasks: persisted.tasks,
        activity: persisted.activity,
        completed_setup: persisted.completed,
        provider_models: persisted.provider_models,
        ..DomainStore::default()
    }
}

/// Atomically write the durable slice of `store` into `dir`.
pub fn save_to_dir(dir: &Path, store: &DomainStore) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| format!("failed to create app data dir: {e}"))?;
    let path = dir.join(STATE_FILE);
    let json = serde_json::to_string_pretty(&persisted_from(store))
        .map_err(|e| format!("failed to serialize app state: {e}"))?;

    // Same-directory temp file then rename: readers never observe a partial file.
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json).map_err(|e| format!("failed to write app state: {e}"))?;
    fs::rename(&tmp, &path).map_err(|e| format!("failed to replace app state: {e}"))?;
    Ok(())
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

/// Lowercase, dash-separated slug used for workspace-relative script paths.
pub fn slugify(name: &str) -> String {
    let mut slug = String::new();
    let mut pending_dash = false;
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            pending_dash = false;
        } else if !pending_dash && !slug.is_empty() {
            slug.push('-');
            pending_dash = true;
        }
    }
    let slug = slug.trim_matches('-');
    if slug.is_empty() {
        "task".to_string()
    } else {
        slug.to_string()
    }
}

fn validate_name(name: &str) -> Result<&str, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("task name must not be empty".to_string());
    }
    Ok(trimmed)
}

fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

// ─── Pure state transitions ──────────────────────────────────────────────────

/// Insert a new task and return a copy.
pub fn create_task_in(store: &mut DomainStore, name: &str, now: u64) -> Result<Task, String> {
    let trimmed = validate_name(name)?;
    let iso = iso8601_from_ms(now);
    let task = Task {
        id: new_id(),
        name: trimmed.to_string(),
        status: TaskStatus::Idle,
        // Workspace-relative so no absolute local path is ever embedded in data.
        script_path: format!("scripts/{}.py", slugify(trimmed)),
        created_at: iso.clone(),
        updated_at: iso,
    };
    store.tasks.push(task.clone());
    Ok(task)
}

/// Rename an existing task and refresh `updatedAt`.
pub fn update_task_in(
    store: &mut DomainStore,
    task_id: &str,
    name: &str,
    now: u64,
) -> Result<Task, String> {
    let trimmed = validate_name(name)?;
    let task = store
        .tasks
        .iter_mut()
        .find(|task| task.id == task_id)
        .ok_or_else(|| format!("task {task_id} not found"))?;
    task.name = trimmed.to_string();
    task.updated_at = iso8601_from_ms(now);
    Ok(task.clone())
}

/// Remove a task; drops the active run when it belonged to that task.
pub fn delete_task_in(store: &mut DomainStore, task_id: &str) -> Result<(), String> {
    let before = store.tasks.len();
    store.tasks.retain(|task| task.id != task_id);
    if store.tasks.len() == before {
        return Err(format!("task {task_id} not found"));
    }
    if store
        .active_run
        .as_ref()
        .is_some_and(|run| run.task_id == task_id)
    {
        store.active_run = None;
    }
    Ok(())
}

/// Start a run lifecycle for `task_id` (see the parent module docs for scope).
pub fn start_run_in(store: &mut DomainStore, task_id: &str, now: u64) -> Result<TaskRun, String> {
    let steps = store
        .activity
        .iter()
        .rev()
        .find(|log| log.task_id == task_id)
        .map(|log| log.steps.clone())
        .unwrap_or_default();

    let task = store
        .tasks
        .iter_mut()
        .find(|task| task.id == task_id)
        .ok_or_else(|| format!("task {task_id} not found"))?;
    task.status = TaskStatus::Running;
    task.updated_at = iso8601_from_ms(now);

    let run = TaskRun {
        id: new_id(),
        task_id: task_id.to_string(),
        status: RunStatus::Running,
        started_at: now,
        finished_at: None,
        steps: steps.clone(),
    };
    store.active_run = Some(run.clone());
    store.activity.push(OperationLog {
        id: new_id(),
        task_id: task_id.to_string(),
        steps,
        recorded_at: iso8601_from_ms(now),
        source: OperationSource::Desktop,
    });
    Ok(run)
}

/// Apply an approval decision. Only `pending`/`reviewing` requests may move.
pub fn decide_approval_in(
    store: &mut DomainStore,
    input: &ApprovalDecisionInput,
) -> Result<ApprovalRequest, String> {
    let request = store
        .approvals
        .iter_mut()
        .find(|request| request.id == input.request_id)
        .ok_or_else(|| format!("approval request {} not found", input.request_id))?;

    match request.state {
        ApprovalState::Pending | ApprovalState::Reviewing => {}
        other => {
            return Err(format!(
                "approval request {} is already {other:?} and cannot be decided",
                input.request_id
            ))
        }
    }

    request.state = match input.decision {
        ApprovalDecision::Approved => ApprovalState::Approved,
        ApprovalDecision::Rejected => ApprovalState::Rejected,
    };
    // `reason` is part of the IPC contract but `ApprovalRequest` has no field
    // for it (matching the TypeScript type); it is intentionally not retained.
    let _ = &input.reason;
    Ok(request.clone())
}

/// Probe the Python runtime the executor needs.
///
/// This is the only runtime dependency the packaged app requires, and it is the
/// one the headless Rust backend can verify without a display.
pub fn detect_dependencies(python: Option<&str>) -> Vec<DependencyCheck> {
    let (installed, status) = match python {
        Some(path) => match python_version(path) {
            Some(version) => (version, DependencyStatus::Ok),
            None => (String::new(), DependencyStatus::Error),
        },
        None => (String::new(), DependencyStatus::Missing),
    };

    vec![DependencyCheck {
        name: "Python Runtime".to_string(),
        version: installed.clone(),
        installed,
        required: ">=3.10".to_string(),
        status,
    }]
}

/// Read `python --version` without going through a shell.
fn python_version(path: &str) -> Option<String> {
    let output = std::process::Command::new(path)
        .arg("--version")
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let text = if stdout.is_empty() {
        String::from_utf8_lossy(&output.stderr).trim().to_string()
    } else {
        stdout
    };
    // Typical output: "Python 3.14.7".
    text.split_whitespace()
        .nth(1)
        .map(|version| version.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ipc::{ExceptionHandler, ExceptionRiskLevel, RiskLevel, SafetyCheck, ScreenshotRef};

    fn approval(id: &str, state: ApprovalState) -> ApprovalRequest {
        ApprovalRequest {
            id: id.to_string(),
            task_id: "task-1".to_string(),
            code: "print('hi')".to_string(),
            explanation: "demo".to_string(),
            exception_handlers: vec![ExceptionHandler {
                condition: "ElementNotFound".to_string(),
                action: "Retry".to_string(),
                code: "retry(3)".to_string(),
                risk_level: ExceptionRiskLevel::Low,
            }],
            safety_checks: vec![SafetyCheck {
                id: "check-1".to_string(),
                name: "Network Access".to_string(),
                passed: true,
                message: "local only".to_string(),
            }],
            created_at: 1,
            expires_at: None,
            risk_level: RiskLevel::Low,
            state,
        }
    }

    fn decision(request_id: &str, decision: ApprovalDecision) -> ApprovalDecisionInput {
        ApprovalDecisionInput {
            request_id: request_id.to_string(),
            decision,
            reason: Some("because".to_string()),
        }
    }

    #[test]
    fn create_task_populates_identity_and_timestamps() {
        let mut store = DomainStore::default();
        let task = create_task_in(&mut store, "  Weekly Report  ", 1_700_000_000_000).unwrap();

        assert_eq!(task.name, "Weekly Report");
        assert_eq!(task.status, TaskStatus::Idle);
        assert_eq!(task.script_path, "scripts/weekly-report.py");
        assert_eq!(task.created_at, "2023-11-14T22:13:20.000Z");
        assert_eq!(store.tasks.len(), 1);
        assert!(!task.script_path.starts_with('/'));
    }

    #[test]
    fn create_task_rejects_an_empty_name() {
        let mut store = DomainStore::default();
        assert!(create_task_in(&mut store, "   ", 0).is_err());
        assert!(store.tasks.is_empty());
    }

    #[test]
    fn update_task_renames_and_bumps_timestamp_only() {
        let mut store = DomainStore::default();
        let created = create_task_in(&mut store, "Old", 1).unwrap();
        let updated = update_task_in(&mut store, &created.id, "New", 2).unwrap();

        assert_eq!(updated.name, "New");
        assert_eq!(updated.created_at, created.created_at);
        assert_ne!(updated.updated_at, created.updated_at);
        assert_eq!(store.tasks[0].name, "New");
    }

    #[test]
    fn update_task_errors_for_unknown_id() {
        let mut store = DomainStore::default();
        assert!(update_task_in(&mut store, "missing", "name", 1).is_err());
    }

    #[test]
    fn delete_task_removes_it_and_clears_its_active_run() {
        let mut store = DomainStore::default();
        let task = create_task_in(&mut store, "Task", 1).unwrap();
        start_run_in(&mut store, &task.id, 2).unwrap();

        delete_task_in(&mut store, &task.id).unwrap();
        assert!(store.tasks.is_empty());
        assert!(store.active_run.is_none());
        assert!(delete_task_in(&mut store, &task.id).is_err());
    }

    #[test]
    fn run_lifecycle_is_coherent_and_reflected_by_active_run() {
        let mut store = DomainStore::default();
        let task = create_task_in(&mut store, "Task", 10).unwrap();
        let run = start_run_in(&mut store, &task.id, 20).unwrap();

        assert_eq!(run.task_id, task.id);
        assert_eq!(run.status, RunStatus::Running);
        assert_eq!(run.started_at, 20);
        assert!(run.finished_at.is_none());
        assert!(run.steps.is_empty());
        assert_eq!(store.active_run.as_ref().unwrap().id, run.id);
        assert_eq!(store.tasks[0].status, TaskStatus::Running);
        assert_eq!(store.activity.len(), 1);
        assert_eq!(store.activity[0].task_id, task.id);
    }

    #[test]
    fn run_replays_the_latest_recorded_steps() {
        let mut store = DomainStore::default();
        let task = create_task_in(&mut store, "Task", 1).unwrap();
        start_run_in(&mut store, &task.id, 2).unwrap();

        let steps = vec![crate::ipc::OperationStep {
            step_type: crate::ipc::StepType::Click,
            target: crate::ipc::StepTarget {
                selector: Some("#submit".to_string()),
                text: None,
                screenshot: None,
            },
            timestamp: "2023-11-14T22:13:20.000Z".to_string(),
        }];
        store.activity.push(OperationLog {
            id: "log-1".to_string(),
            task_id: task.id.clone(),
            steps: steps.clone(),
            recorded_at: "2023-11-14T22:13:20.000Z".to_string(),
            source: OperationSource::Browser,
        });

        let run = start_run_in(&mut store, &task.id, 3).unwrap();
        assert_eq!(run.steps, steps);
    }

    #[test]
    fn run_task_errors_for_unknown_task() {
        let mut store = DomainStore::default();
        assert!(start_run_in(&mut store, "missing", 1).is_err());
    }

    #[test]
    fn approval_decision_moves_pending_to_terminal_state() {
        let mut store = DomainStore::default();
        store
            .approvals
            .push(approval("req-1", ApprovalState::Pending));

        let approved =
            decide_approval_in(&mut store, &decision("req-1", ApprovalDecision::Approved)).unwrap();
        assert_eq!(approved.state, ApprovalState::Approved);
        assert_eq!(store.approvals[0].state, ApprovalState::Approved);
    }

    #[test]
    fn approval_decision_allows_reviewing_and_rejects_a_second_decision() {
        let mut store = DomainStore::default();
        store
            .approvals
            .push(approval("req-2", ApprovalState::Reviewing));

        let rejected =
            decide_approval_in(&mut store, &decision("req-2", ApprovalDecision::Rejected)).unwrap();
        assert_eq!(rejected.state, ApprovalState::Rejected);

        let err = decide_approval_in(&mut store, &decision("req-2", ApprovalDecision::Approved))
            .unwrap_err();
        assert!(err.contains("cannot be decided"));
    }

    #[test]
    fn approval_decision_errors_for_unknown_request() {
        let mut store = DomainStore::default();
        assert!(
            decide_approval_in(&mut store, &decision("missing", ApprovalDecision::Approved))
                .is_err()
        );
    }

    #[test]
    fn slugify_is_path_safe() {
        assert_eq!(slugify("Invoice Download"), "invoice-download");
        assert_eq!(slugify("  Spaced  Out  "), "spaced-out");
        assert_eq!(slugify("../etc/passwd"), "etc-passwd");
        assert_eq!(slugify(""), "task");
        assert!(!slugify("..").contains('.'));
    }

    #[test]
    fn detect_dependencies_reports_missing_without_python() {
        let deps = detect_dependencies(None);
        assert_eq!(deps.len(), 1);
        assert_eq!(deps[0].name, "Python Runtime");
        assert_eq!(deps[0].status, DependencyStatus::Missing);
        assert!(deps[0].installed.is_empty());
    }

    #[test]
    fn persisted_state_round_trips_through_disk() {
        let dir = std::env::temp_dir().join(format!("aegis-state-test-{}", new_id()));

        let mut store = DomainStore::default();
        create_task_in(&mut store, "Invoice Download", 1).unwrap();
        store.completed_setup = true;
        store
            .provider_models
            .insert("openai".to_string(), "gpt-4o".to_string());
        // Session-only data must not survive the round trip.
        store.screenshots.push(ScreenshotRef {
            id: "shot-1".to_string(),
            label: "Home".to_string(),
            captured_at: 1,
        });

        save_to_dir(&dir, &store).expect("save");
        let loaded = load_from_dir(&dir);

        assert_eq!(loaded.tasks, store.tasks);
        assert!(loaded.completed_setup);
        assert_eq!(
            loaded.provider_models.get("openai").map(String::as_str),
            Some("gpt-4o")
        );
        assert!(loaded.screenshots.is_empty());
        assert!(loaded.active_run.is_none());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn load_from_dir_tolerates_missing_and_corrupt_files() {
        let dir = std::env::temp_dir().join(format!("aegis-state-test-{}", new_id()));
        assert!(load_from_dir(&dir).tasks.is_empty());

        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(STATE_FILE), "{ not json").unwrap();
        assert!(load_from_dir(&dir).tasks.is_empty());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn persisted_json_uses_camel_case_and_hides_secrets() {
        let mut store = DomainStore::default();
        let task = create_task_in(&mut store, "Task", 1).unwrap();
        let value = serde_json::to_value(persisted_from(&store)).unwrap();

        assert_eq!(value["tasks"][0]["scriptPath"], task.script_path);
        assert!(value["tasks"][0]["createdAt"].is_string());
        assert!(value.get("apiKey").is_none());
        assert!(value.get("providerKeys").is_none());
    }
}
