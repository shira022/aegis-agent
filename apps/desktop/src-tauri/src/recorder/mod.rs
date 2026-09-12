//! Recording session state machine and its Tauri commands.

pub mod screenshot;

use crate::ipc::{
    now_ms, AppState, BoundingBox, RecorderState, RecordingSession, RecordingState,
    SessionMetadata,
};

const USER_AGENT: &str = "Aegis Agent Desktop/0.1.0";
const DEFAULT_SESSION_NAME: &str = "Untitled Recording";

/// Platform string used in [`SessionMetadata`].
pub fn current_platform() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

fn current_metadata() -> SessionMetadata {
    SessionMetadata {
        platform: current_platform().to_string(),
        browser: None,
        screen_size: screenshot::primary_monitor_size(),
        user_agent: USER_AGENT.to_string(),
    }
}

/// Pure transition input for the recorder state machine.
pub enum RecorderTransition {
    /// Begin a new session. The caller builds the fully-populated session.
    Start(RecordingSession),
    /// Finalise the current session at `now` (epoch ms).
    Stop { now: u64 },
    Pause,
    Resume,
}

/// Apply a transition to `current` and return the resulting state.
///
/// This function is pure (no clocks, no I/O, no randomness) so every rule of
/// the state machine can be unit tested in isolation.
pub fn apply_transition(
    current: &RecorderState,
    transition: RecorderTransition,
) -> Result<RecorderState, String> {
    match transition {
        RecorderTransition::Start(session) => match current.state {
            RecordingState::Idle | RecordingState::Stopped => Ok(RecorderState {
                state: RecordingState::Recording,
                session: Some(session),
            }),
            RecordingState::Recording | RecordingState::Paused => {
                Err("a recording session is already in progress".to_string())
            }
        },
        RecorderTransition::Stop { now } => match current.state {
            RecordingState::Recording | RecordingState::Paused => {
                let mut session = current
                    .session
                    .clone()
                    .ok_or_else(|| "no recording session is in progress".to_string())?;
                session.end_time = Some(now);
                session.state = RecordingState::Stopped;
                Ok(RecorderState {
                    state: RecordingState::Stopped,
                    session: Some(session),
                })
            }
            RecordingState::Idle | RecordingState::Stopped => {
                Err("no recording session is in progress".to_string())
            }
        },
        RecorderTransition::Pause => match current.state {
            RecordingState::Recording => {
                let mut session = current
                    .session
                    .clone()
                    .ok_or_else(|| "cannot pause: no recording session is active".to_string())?;
                session.state = RecordingState::Paused;
                Ok(RecorderState {
                    state: RecordingState::Paused,
                    session: Some(session),
                })
            }
            _ => Err("cannot pause: no recording session is active".to_string()),
        },
        RecorderTransition::Resume => match current.state {
            RecordingState::Paused => {
                let mut session = current.session.clone().ok_or_else(|| {
                    "cannot resume: the recording session is not paused".to_string()
                })?;
                session.state = RecordingState::Recording;
                Ok(RecorderState {
                    state: RecordingState::Recording,
                    session: Some(session),
                })
            }
            _ => Err("cannot resume: the recording session is not paused".to_string()),
        },
    }
}

fn lock_recorder<'a>(
    state: &'a tauri::State<'_, AppState>,
) -> Result<std::sync::MutexGuard<'a, RecorderState>, String> {
    state
        .recorder
        .lock()
        .map_err(|e| format!("recorder state lock poisoned: {e}"))
}

#[tauri::command]
pub fn start_recording(
    name: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<RecordingSession, String> {
    let session = RecordingSession {
        id: uuid::Uuid::new_v4().to_string(),
        name: name
            .filter(|n| !n.is_empty())
            .unwrap_or_else(|| DEFAULT_SESSION_NAME.to_string()),
        start_time: now_ms(),
        end_time: None,
        state: RecordingState::Recording,
        actions: Vec::new(),
        metadata: current_metadata(),
    };

    let mut guard = lock_recorder(&state)?;
    let next = apply_transition(&guard, RecorderTransition::Start(session))?;
    let created = next
        .session
        .clone()
        .ok_or_else(|| "failed to create recording session".to_string())?;
    *guard = next;
    Ok(created)
}

#[tauri::command]
pub fn stop_recording(state: tauri::State<'_, AppState>) -> Result<RecordingSession, String> {
    let mut guard = lock_recorder(&state)?;
    let next = apply_transition(&guard, RecorderTransition::Stop { now: now_ms() })?;
    let stopped = next
        .session
        .clone()
        .ok_or_else(|| "failed to stop recording session".to_string())?;
    *guard = next;
    Ok(stopped)
}

#[tauri::command]
pub fn pause_recording(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut guard = lock_recorder(&state)?;
    let next = apply_transition(&guard, RecorderTransition::Pause)?;
    *guard = next;
    Ok(())
}

#[tauri::command]
pub fn resume_recording(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut guard = lock_recorder(&state)?;
    let next = apply_transition(&guard, RecorderTransition::Resume)?;
    *guard = next;
    Ok(())
}

#[tauri::command]
pub fn get_recording_state(
    state: tauri::State<'_, AppState>,
) -> Result<RecordingState, String> {
    let guard = lock_recorder(&state)?;
    Ok(guard.state)
}

#[tauri::command]
pub fn take_screenshot(region: Option<BoundingBox>) -> Result<String, String> {
    screenshot::capture_base64(region)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ipc::{ElementSelector, RecordingState, SessionMetadata};

    fn session(id: &str) -> RecordingSession {
        RecordingSession {
            id: id.to_string(),
            name: "Test".to_string(),
            start_time: 100,
            end_time: None,
            state: RecordingState::Recording,
            actions: Vec::new(),
            metadata: SessionMetadata {
                platform: "linux".to_string(),
                browser: None,
                screen_size: None,
                user_agent: USER_AGENT.to_string(),
            },
        }
    }

    #[test]
    fn start_from_idle_and_stopped_enters_recording() {
        for initial in [RecordingState::Idle, RecordingState::Stopped] {
            let current = RecorderState {
                state: initial,
                session: None,
            };
            let next = apply_transition(&current, RecorderTransition::Start(session("a")))
                .expect("start should succeed");
            assert_eq!(next.state, RecordingState::Recording);
            assert_eq!(next.session.expect("session present").id, "a");
        }
    }

    #[test]
    fn start_while_active_fails() {
        for initial in [RecordingState::Recording, RecordingState::Paused] {
            let current = RecorderState {
                state: initial,
                session: Some(session("a")),
            };
            let err = apply_transition(&current, RecorderTransition::Start(session("b")))
                .expect_err("start should fail");
            assert_eq!(err, "a recording session is already in progress");
        }
    }

    #[test]
    fn stop_sets_end_time_and_state() {
        let current = RecorderState {
            state: RecordingState::Recording,
            session: Some(session("a")),
        };
        let next = apply_transition(&current, RecorderTransition::Stop { now: 999 })
            .expect("stop should succeed");
        let stopped = next.session.expect("session present");
        assert_eq!(next.state, RecordingState::Stopped);
        assert_eq!(stopped.end_time, Some(999));
        assert_eq!(stopped.state, RecordingState::Stopped);
    }

    #[test]
    fn stop_without_session_fails() {
        let current = RecorderState::idle();
        let err = apply_transition(&current, RecorderTransition::Stop { now: 1 })
            .expect_err("stop should fail");
        assert_eq!(err, "no recording session is in progress");
    }

    #[test]
    fn pause_and_resume_only_from_correct_states() {
        let recording = RecorderState {
            state: RecordingState::Recording,
            session: Some(session("a")),
        };
        let paused = apply_transition(&recording, RecorderTransition::Pause).expect("pause");
        assert_eq!(paused.state, RecordingState::Paused);

        let resumed = apply_transition(&paused, RecorderTransition::Resume).expect("resume");
        assert_eq!(resumed.state, RecordingState::Recording);

        let err = apply_transition(&paused, RecorderTransition::Pause).expect_err("pause again");
        assert_eq!(err, "cannot pause: no recording session is active");

        let err = apply_transition(&recording, RecorderTransition::Resume).expect_err("resume");
        assert_eq!(err, "cannot resume: the recording session is not paused");
    }

    #[test]
    fn selector_and_action_types_are_reusable() {
        // Keep DTO constructors covered so field renames surface here.
        let selector = ElementSelector::default();
        assert!(selector.text.is_none());
    }
}
