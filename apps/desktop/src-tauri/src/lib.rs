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

use ipc::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            recorder::start_recording,
            recorder::stop_recording,
            recorder::pause_recording,
            recorder::resume_recording,
            recorder::get_recording_state,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
