//! Real Python execution bridge.
//!
//! The child process is always spawned with an argument array
//! ([`build_argv`]); no shell interpreter is ever involved.

use std::collections::HashMap;
use std::io::Read;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

use crate::ipc::{now_ms, AppState};
use crate::setup;

const DEFAULT_TIMEOUT_MS: u64 = 30_000;
const POLL_INTERVAL_MS: u64 = 50;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionConfig {
    pub script_path: String,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub timeout: Option<u64>,
    pub working_dir: Option<String>,
    pub python_path: Option<String>,
    pub max_retries: Option<u32>,
    pub retry_delay: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OutputLine {
    pub timestamp: u64,
    pub stream: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration: u64,
    pub timed_out: bool,
    pub memory_usage: Option<u64>,
    pub output_lines: Vec<OutputLine>,
}

/// Build the exact argv vector passed to the OS: `[python, scriptPath, ..args]`.
///
/// Script paths and arguments are always single elements, so a value such as
/// `"a b; rm -rf x"` can never be interpreted by a shell.
pub fn build_argv(config: &ExecutionConfig, python: &str) -> Vec<String> {
    let mut argv = Vec::with_capacity(2 + config.args.as_ref().map_or(0, Vec::len));
    argv.push(python.to_string());
    argv.push(config.script_path.clone());
    if let Some(args) = &config.args {
        argv.extend(args.iter().cloned());
    }
    argv
}

/// Clears the in-flight cancel flag when the run ends, on every exit path.
struct RunFlagGuard<'a> {
    state: &'a AppState,
    flag: Arc<AtomicBool>,
}

impl<'a> RunFlagGuard<'a> {
    fn new(state: &'a AppState, flag: Arc<AtomicBool>) -> Self {
        RunFlagGuard { state, flag }
    }
}

impl Drop for RunFlagGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut executor) = self.state.executor.lock() {
            if let Some(current) = executor.running.as_ref() {
                if Arc::ptr_eq(current, &self.flag) {
                    executor.running = None;
                }
            }
        }
    }
}

fn lines_for(stream: &str, content: &str) -> Vec<OutputLine> {
    content
        .split('\n')
        .map(|line| line.strip_suffix('\r').unwrap_or(line))
        .filter(|line| !line.is_empty())
        .map(|line| OutputLine {
            timestamp: now_ms(),
            stream: stream.to_string(),
            content: line.to_string(),
        })
        .collect()
}

#[tauri::command]
pub fn run_python_script(
    config: ExecutionConfig,
    state: tauri::State<'_, AppState>,
) -> Result<ExecutionResult, String> {
    if config.script_path.is_empty() {
        return Err("scriptPath must not be empty".to_string());
    }

    let (python_opt, _source) = setup::resolve_python(config.python_path.as_deref());
    let python = python_opt.ok_or_else(|| {
        "python interpreter not found; set AEGIS_PYTHON_PATH or add python3 to PATH".to_string()
    })?;

    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut executor = state
            .executor
            .lock()
            .map_err(|e| format!("executor state lock poisoned: {e}"))?;
        if executor.running.is_some() {
            return Err("another python script is already running".to_string());
        }
        executor.running = Some(cancel_flag.clone());
    }

    let app_state: &AppState = state.inner();
    let _guard = RunFlagGuard::new(app_state, cancel_flag.clone());

    let argv = build_argv(&config, &python);
    let program = argv
        .first()
        .cloned()
        .ok_or_else(|| "python interpreter path is empty".to_string())?;

    let mut cmd = Command::new(&program);
    if argv.len() > 1 {
        cmd.args(&argv[1..]);
    }

    if let Some(dir) = config.working_dir.as_deref() {
        cmd.current_dir(dir);
    } else if let Some(runtime_dir) = setup::resolve_runtime_dir() {
        cmd.current_dir(runtime_dir);
    }

    if let Some(env) = &config.env {
        for (key, value) in env {
            cmd.env(key, value);
        }
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let started = Instant::now();
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to spawn python interpreter: {e}"))?;

    let stdout_pipe = child
        .stdout
        .take()
        .ok_or_else(|| "failed to capture python stdout".to_string())?;
    let stderr_pipe = child
        .stderr
        .take()
        .ok_or_else(|| "failed to capture python stderr".to_string())?;

    let (tx, rx) = std::sync::mpsc::channel::<(bool, String)>();
    let tx_out = tx.clone();
    let out_handle = std::thread::spawn(move || {
        let mut reader = stdout_pipe;
        let mut buffer = String::new();
        let _ = reader.read_to_string(&mut buffer);
        let _ = tx_out.send((false, buffer));
    });
    let tx_err = tx.clone();
    let err_handle = std::thread::spawn(move || {
        let mut reader = stderr_pipe;
        let mut buffer = String::new();
        let _ = reader.read_to_string(&mut buffer);
        let _ = tx_err.send((true, buffer));
    });
    drop(tx);

    let timeout_ms = config.timeout.unwrap_or(DEFAULT_TIMEOUT_MS);
    let mut timed_out = false;
    #[allow(unused_assignments)]
    let mut status: Option<std::process::ExitStatus> = None;

    loop {
        match child.try_wait() {
            Ok(Some(exit_status)) => {
                status = Some(exit_status);
                break;
            }
            Ok(None) => {}
            Err(e) => return Err(format!("failed to poll python process: {e}")),
        }

        if started.elapsed().as_millis() as u64 >= timeout_ms {
            timed_out = true;
            let _ = child.kill();
            status = child.wait().ok();
            break;
        }

        if cancel_flag.load(Ordering::SeqCst) {
            let _ = child.kill();
            status = child.wait().ok();
            break;
        }

        std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));
    }

    let _ = out_handle.join();
    let _ = err_handle.join();

    let mut stdout = String::new();
    let mut stderr = String::new();
    for (is_stderr, content) in rx.iter() {
        if is_stderr {
            stderr.push_str(&content);
        } else {
            stdout.push_str(&content);
        }
    }

    let mut output_lines = lines_for("stdout", &stdout);
    output_lines.extend(lines_for("stderr", &stderr));

    let exit_code = match status {
        Some(exit_status) => exit_status.code().unwrap_or(-1),
        None => -1,
    };

    Ok(ExecutionResult {
        exit_code,
        stdout,
        stderr,
        duration: started.elapsed().as_millis() as u64,
        timed_out,
        memory_usage: None,
        output_lines,
    })
}

#[tauri::command]
pub fn cancel_python_script(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let executor = state
        .executor
        .lock()
        .map_err(|e| format!("executor state lock poisoned: {e}"))?;

    // Cancellation is idempotent: if nothing is running there is nothing to do.
    if let Some(flag) = executor.running.as_ref() {
        flag.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(script_path: &str, args: Option<Vec<String>>) -> ExecutionConfig {
        ExecutionConfig {
            script_path: script_path.to_string(),
            args,
            env: None,
            timeout: None,
            working_dir: None,
            python_path: None,
            max_retries: None,
            retry_delay: None,
        }
    }

    #[test]
    fn argv_is_python_then_script_then_args() {
        let cfg = config(
            "script.py",
            Some(vec!["--flag".to_string(), "value".to_string()]),
        );
        assert_eq!(
            build_argv(&cfg, "python3"),
            vec!["python3", "script.py", "--flag", "value"]
        );
    }

    #[test]
    fn metacharacters_stay_a_single_argument() {
        let cfg = config("a b; rm -rf x", Some(vec!["$(whoami)".to_string()]));
        let argv = build_argv(&cfg, "python3");
        assert_eq!(argv, vec!["python3", "a b; rm -rf x", "$(whoami)"]);
        assert!(argv.iter().any(|arg| arg == "a b; rm -rf x"));
    }

    #[test]
    fn no_element_is_ever_dash_c() {
        let cfg = config(
            "script.py",
            Some(vec!["--verbose".to_string(), "x".to_string()]),
        );
        let argv = build_argv(&cfg, "python3");
        assert!(!argv.iter().any(|arg| arg == "-c"));
    }

    #[test]
    fn empty_args_produce_two_elements() {
        assert_eq!(build_argv(&config("s.py", None), "python"), vec!["python", "s.py"]);
        assert_eq!(
            build_argv(&config("s.py", Some(vec![])), "python"),
            vec!["python", "s.py"]
        );
    }
}
