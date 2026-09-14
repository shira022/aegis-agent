//! Persistent task / activity / approval / healing / setup domain.
//!
//! This module backs the desktop `DesktopApi` commands that previously had no
//! Rust implementation (`get_setup`, `list_tasks`, `create_task`, ...). It owns
//! the in-memory [`DomainStore`] and mirrors it to a single JSON file in the
//! Tauri app data directory.
//!
//! # Persistence
//!
//! Only non-secret, durable state is written: tasks, the activity log, the
//! setup-completed flag and the per-provider model selection. API keys are
//! **never** persisted or logged — [`save_provider_key`] routes the raw key
//! through [`crate::security::store_key`], which reduces it to a `KeyMask` and
//! drops the material. Writes are atomic (temp file + rename) and use
//! `serde_json` + `std::fs`, so no database dependency is required.
//!
//! # Run lifecycle (scope)
//!
//! `run_task` does **not** execute the task's script and spawns no background
//! process. A real Python execution engine is out of scope here, so the command
//! records a run lifecycle honestly:
//!
//! 1. the task is marked `running` and its `updatedAt` is refreshed;
//! 2. a [`TaskRun`] is created with `status = running`, `startedAt = now` and
//!    `steps` replayed from the task's most recent activity entry (empty when
//!    the task has never recorded one);
//! 3. the run becomes `get_active_run`'s result, and the same step trace is
//!    appended to the activity log so the UI can render it.
//!
//! No step is invented: an empty task yields an empty step list. A future
//! execution engine is expected to transition the stored run to `completed`
//! or `failed` and set `finishedAt`; nothing in this module claims that a run
//! finished.

pub mod state;

use std::sync::MutexGuard;

use tauri::{AppHandle, Manager};

use crate::ipc::{
    now_ms, AppState, ApprovalDecisionInput, ApprovalRequest, DomainStore, HealingEvent,
    NewTaskInput, OperationLog, ProviderKeyInput, SetupState, Task, TaskRun, UpdateTaskInput,
};
use crate::security;
use state::{create_task_in, decide_approval_in, delete_task_in, start_run_in, update_task_in};

pub use state::{detect_dependencies, load_from_dir, save_to_dir, slugify};

fn persist(app: &AppHandle, store: &DomainStore) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    save_to_dir(&dir, store)
}

fn lock_domain<'a>(
    state: &'a tauri::State<'_, AppState>,
) -> Result<MutexGuard<'a, DomainStore>, String> {
    state
        .domain
        .lock()
        .map_err(|e| format!("domain state lock poisoned: {e}"))
}

#[tauri::command]
pub fn list_tasks(state: tauri::State<'_, AppState>) -> Result<Vec<Task>, String> {
    Ok(lock_domain(&state)?.tasks.clone())
}

#[tauri::command]
pub fn create_task(
    input: NewTaskInput,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<Task, String> {
    let mut store = lock_domain(&state)?;
    let task = create_task_in(&mut store, &input.name, now_ms())?;
    persist(&app, &store)?;
    Ok(task)
}

#[tauri::command]
pub fn update_task(
    input: UpdateTaskInput,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<Task, String> {
    let mut store = lock_domain(&state)?;
    let task = update_task_in(&mut store, &input.task_id, &input.name, now_ms())?;
    persist(&app, &store)?;
    Ok(task)
}

#[tauri::command]
pub fn delete_task(
    task_id: String,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let mut store = lock_domain(&state)?;
    delete_task_in(&mut store, &task_id)?;
    persist(&app, &store)?;
    Ok(())
}

#[tauri::command]
pub fn run_task(
    task_id: String,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<TaskRun, String> {
    let mut store = lock_domain(&state)?;
    let run = start_run_in(&mut store, &task_id, now_ms())?;
    persist(&app, &store)?;
    Ok(run)
}

#[tauri::command]
pub fn get_active_run(state: tauri::State<'_, AppState>) -> Result<Option<TaskRun>, String> {
    Ok(lock_domain(&state)?.active_run.clone())
}

#[tauri::command]
pub fn list_activity(state: tauri::State<'_, AppState>) -> Result<Vec<OperationLog>, String> {
    Ok(lock_domain(&state)?.activity.clone())
}

#[tauri::command]
pub fn list_approvals(state: tauri::State<'_, AppState>) -> Result<Vec<ApprovalRequest>, String> {
    Ok(lock_domain(&state)?.approvals.clone())
}

#[tauri::command]
pub fn decide_approval(
    input: ApprovalDecisionInput,
    state: tauri::State<'_, AppState>,
) -> Result<ApprovalRequest, String> {
    let mut store = lock_domain(&state)?;
    decide_approval_in(&mut store, &input)
}

#[tauri::command]
pub fn list_healing_events(state: tauri::State<'_, AppState>) -> Result<Vec<HealingEvent>, String> {
    Ok(lock_domain(&state)?.healing.clone())
}

#[tauri::command]
pub fn get_setup(state: tauri::State<'_, AppState>) -> Result<SetupState, String> {
    let completed = lock_domain(&state)?.completed_setup;
    let (python, _source) = crate::setup::resolve_python(None);
    Ok(SetupState {
        dependencies: detect_dependencies(python.as_deref()),
        completed,
    })
}

#[tauri::command]
pub fn complete_setup(state: tauri::State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let mut store = lock_domain(&state)?;
    store.completed_setup = true;
    persist(&app, &store)?;
    Ok(())
}

/// Persist the provider model and store the API key as a non-recoverable mask.
#[tauri::command]
pub fn save_provider_key(
    input: ProviderKeyInput,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    {
        let mut keychain = state
            .keychain
            .lock()
            .map_err(|e| format!("keychain state lock poisoned: {e}"))?;
        security::store_key(&mut keychain, &input.provider_id, &input.api_key, now_ms())?;
    }

    let mut store = lock_domain(&state)?;
    if let Some(model) = input.model.as_ref().filter(|model| !model.is_empty()) {
        store
            .provider_models
            .insert(input.provider_id.clone(), model.clone());
    }
    persist(&app, &store)?;
    Ok(())
}
