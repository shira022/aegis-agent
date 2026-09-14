//! Aegis Agent desktop crate root.
//!
//! All Tauri commands are declared in the modules below and registered in
//! [`run`]. The TypeScript side (see `packages/@aegis/recorder` and
//! `packages/@aegis/executor`) calls these through `window.__TAURI__.invoke`.

pub mod ai_client;
pub mod executor;
pub mod ipc;
pub mod recorder;
pub mod security;
pub mod setup;
pub mod tasks;

use ipc::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .setup(|app| {
            // Best-effort restore of the durable domain state. A missing or
            // unreadable file simply starts from an empty store; a failure here
            // must never prevent the window from opening.
            if let Ok(data_dir) = app.path().app_data_dir() {
                let state = app.state::<AppState>();
                if let Ok(mut domain) = state.domain.lock() {
                    *domain = tasks::load_from_dir(&data_dir);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            recorder::start_recording,
            recorder::stop_recording,
            recorder::pause_recording,
            recorder::resume_recording,
            recorder::get_recording_state,
            recorder::get_recorder,
            recorder::take_screenshot,
            executor::run_python_script,
            executor::cancel_python_script,
            setup::get_python_runtime_info,
            ai_client::ai_generate_script,
            ai_client::ai_provider_status,
            security::store_api_key,
            security::get_api_key,
            security::has_api_key,
            security::delete_api_key,
            security::list_api_key_providers,
            tasks::get_setup,
            tasks::complete_setup,
            tasks::list_tasks,
            tasks::create_task,
            tasks::update_task,
            tasks::delete_task,
            tasks::run_task,
            tasks::get_active_run,
            tasks::list_activity,
            tasks::list_approvals,
            tasks::decide_approval,
            tasks::list_healing_events,
            tasks::save_provider_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
