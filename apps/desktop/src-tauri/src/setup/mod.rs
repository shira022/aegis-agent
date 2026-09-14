//! Python interpreter and runtime-directory resolution.
//!
//! No absolute paths are ever hard-coded. Resolution order for the interpreter:
//! explicit caller path -> `AEGIS_PYTHON_PATH` -> interpreter inside the
//! resolved bundled runtime directory -> workspace virtualenv found by walking
//! up from the cwd -> bare `python3`/`python` found on `PATH`.
//!
//! The runtime directory (bundled with the app) resolves in this order:
//! 1. explicit `AEGIS_PYTHON_RUNTIME` environment override,
//! 2. the Tauri app resource directory (`python-runtime/` shipped with the app),
//! 3. a cwd walk-up to the workspace copy, used only as a development fallback.
//!
//! The cwd walk-up can expose a build-machine path, so it is marked as a
//! fallback in the payload and is never consulted in release builds.

use std::path::Path;

use serde::Serialize;
use tauri::Manager;

/// Directory name of the bundled runtime inside the app resource directory.
pub const RUNTIME_RESOURCE_DIR: &str = "python-runtime";

/// Outcome of runtime-directory resolution.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuntimeResolution {
    pub dir: Option<String>,
    /// `env`, `resource`, `cwd-walk-up` or `none`.
    pub source: &'static str,
    /// True when the resolved directory is not a distributable location.
    pub is_fallback: bool,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PythonRuntimeInfo {
    pub python_path: Option<String>,
    pub runtime_dir: Option<String>,
    pub source: String,
    /// Where `runtime_dir` came from (`env`, `resource`, `cwd-walk-up`, `none`).
    pub runtime_source: String,
    /// True when `runtime_dir` is a development-only fallback.
    pub runtime_is_fallback: bool,
    pub available: bool,
}

/// Bare interpreter names to try, in order, when nothing else resolves.
pub fn interpreter_candidates() -> [&'static str; 2] {
    ["python3", "python"]
}

/// Pure selection between the explicit, environment, bundled-runtime and
/// workspace-venv choices.
///
/// Empty strings are treated as "not provided" so an empty explicit path falls
/// through to the environment variable. The bundled runtime is preferred over
/// the development-only workspace venv and the bare `PATH` candidates.
pub fn choose_python_source(
    explicit: Option<&str>,
    env_path: Option<&str>,
    runtime_path: Option<&str>,
    venv_path: Option<&str>,
) -> (Option<String>, &'static str) {
    if let Some(path) = explicit.filter(|p| !p.is_empty()) {
        return (Some(path.to_string()), "explicit");
    }
    if let Some(path) = env_path.filter(|p| !p.is_empty()) {
        return (Some(path.to_string()), "env");
    }
    if let Some(path) = runtime_path.filter(|p| !p.is_empty()) {
        return (Some(path.to_string()), "resource");
    }
    if let Some(path) = venv_path.filter(|p| !p.is_empty()) {
        return (Some(path.to_string()), "workspace-venv");
    }
    (None, "path")
}

/// Windows Store "App Execution Alias" stub directories.
///
/// `python.exe`/`python3.exe` under `...\WindowsApps\...` (notably
/// `Microsoft\WindowsApps`) are reparse points that merely print an install
/// prompt. They must never be treated as a working interpreter.
fn is_store_alias_path(path: &Path) -> bool {
    path.to_string_lossy()
        .to_ascii_lowercase()
        .contains("windowsapps")
}

fn is_store_alias(path: &str) -> bool {
    is_store_alias_path(Path::new(path))
}

fn is_on_path(name: &str, path_var: Option<&std::ffi::OsStr>) -> bool {
    let Some(paths) = path_var else {
        return false;
    };
    std::env::split_paths(paths).any(|dir| {
        if is_store_alias_path(&dir) {
            return false;
        }
        if dir.join(name).is_file() {
            return true;
        }
        #[cfg(windows)]
        {
            if dir.join(format!("{name}.exe")).is_file() {
                return true;
            }
        }
        false
    })
}

/// Locate a usable interpreter inside a bundled runtime directory.
///
/// Windows ships `.venv\Scripts\python.exe` or `python.exe`; Unix ships
/// `bin/python3` or `.venv/bin/python3`. Returns `None` when the directory has
/// no interpreter so callers can fall back to `PATH`.
pub fn runtime_interpreter(runtime_dir: Option<&Path>) -> Option<String> {
    let dir = runtime_dir?;
    let candidates = [
        dir.join(".venv").join("Scripts").join("python.exe"),
        dir.join("python.exe"),
        dir.join("bin").join("python3"),
        dir.join(".venv").join("bin").join("python3"),
    ];
    candidates
        .into_iter()
        .find(|candidate| candidate.is_file())
        .map(|candidate| candidate.to_string_lossy().into_owned())
}

fn find_workspace_venv_python() -> Option<String> {
    // Development-only fallback: a packaged release build must not report a
    // build-machine virtualenv path.
    if !cfg!(debug_assertions) {
        return None;
    }
    let cwd = std::env::current_dir().ok()?;
    for ancestor in cwd.ancestors() {
        let venv = ancestor
            .join("packages")
            .join("@aegis")
            .join("python-runtime")
            .join(".venv");
        let candidates = [
            venv.join("bin").join("python3"),
            venv.join("bin").join("python"),
            venv.join("Scripts").join("python.exe"),
        ];
        for candidate in candidates {
            if candidate.is_file() {
                return Some(candidate.to_string_lossy().into_owned());
            }
        }
    }
    None
}

fn find_workspace_runtime_dir() -> Option<String> {
    // Development-only fallback. A packaged release build must never report a
    // build-machine path, so it is skipped entirely outside debug builds.
    if !cfg!(debug_assertions) {
        return None;
    }
    let cwd = std::env::current_dir().ok()?;
    for ancestor in cwd.ancestors() {
        let dir = ancestor
            .join("packages")
            .join("@aegis")
            .join("python-runtime");
        if dir.is_dir() {
            return Some(dir.to_string_lossy().into_owned());
        }
    }
    None
}

/// Resolve the bundled runtime directory inside an app resource directory.
pub fn resource_runtime_dir(resource_dir: Option<&Path>) -> Option<String> {
    let base = resource_dir?;
    let candidate = base.join(RUNTIME_RESOURCE_DIR);
    if candidate.is_dir() {
        Some(candidate.to_string_lossy().into_owned())
    } else {
        None
    }
}

/// Pure selection between env, resource and workspace runtime directories.
///
/// Empty strings are treated as "not provided". Anything but `env` or
/// `resource` is flagged as a fallback so callers never mistake a
/// build-machine path for a distributable one.
pub fn choose_runtime_dir(
    env_path: Option<&str>,
    resource_path: Option<&str>,
    workspace_path: Option<&str>,
) -> RuntimeResolution {
    if let Some(dir) = env_path.filter(|path| !path.is_empty()) {
        return RuntimeResolution {
            dir: Some(dir.to_string()),
            source: "env",
            is_fallback: false,
        };
    }
    if let Some(dir) = resource_path.filter(|path| !path.is_empty()) {
        return RuntimeResolution {
            dir: Some(dir.to_string()),
            source: "resource",
            is_fallback: false,
        };
    }
    if let Some(dir) = workspace_path.filter(|path| !path.is_empty()) {
        return RuntimeResolution {
            dir: Some(dir.to_string()),
            source: "cwd-walk-up",
            is_fallback: true,
        };
    }
    RuntimeResolution {
        dir: None,
        source: "none",
        is_fallback: true,
    }
}

/// Resolve the Python interpreter path and the source it came from.
///
/// `runtime_dir` is the resolved bundled-runtime directory. When it actually
/// contains an interpreter it is preferred over the development-only workspace
/// venv and the bare `PATH` candidates, so a packaged app uses the runtime it
/// ships with. Explicit and environment overrides still win, and Windows Store
/// alias paths are never accepted.
pub fn resolve_python(
    explicit: Option<&str>,
    runtime_dir: Option<&Path>,
) -> (Option<String>, &'static str) {
    let env_path = std::env::var("AEGIS_PYTHON_PATH").ok();
    let runtime_path = runtime_interpreter(runtime_dir);
    let venv_path = find_workspace_venv_python();

    let explicit = explicit.filter(|path| !is_store_alias(path));
    let env_path = env_path.as_deref().filter(|path| !is_store_alias(path));
    let runtime_path = runtime_path.as_deref().filter(|path| !is_store_alias(path));
    let venv_path = venv_path.as_deref().filter(|path| !is_store_alias(path));

    let (choice, source) = choose_python_source(explicit, env_path, runtime_path, venv_path);
    if choice.is_some() {
        return (choice, source);
    }

    let path_var = std::env::var_os("PATH");
    for candidate in interpreter_candidates() {
        if is_on_path(candidate, path_var.as_deref()) {
            return (Some(candidate.to_string()), "path");
        }
    }

    (None, "path")
}

/// Resolve the runtime directory: env override, then app resources, then a
/// development-only cwd walk-up fallback.
pub fn resolve_runtime_dir(resource_dir: Option<&Path>) -> RuntimeResolution {
    let env_path = std::env::var("AEGIS_PYTHON_RUNTIME").ok();
    let resource = resource_runtime_dir(resource_dir);
    let workspace = find_workspace_runtime_dir();
    choose_runtime_dir(
        env_path.as_deref(),
        resource.as_deref(),
        workspace.as_deref(),
    )
}

#[tauri::command]
pub fn get_python_runtime_info(app: tauri::AppHandle) -> Result<PythonRuntimeInfo, String> {
    let resource_dir = app.path().resource_dir().ok();
    let runtime = resolve_runtime_dir(resource_dir.as_deref());
    let (python_path, source) = resolve_python(None, runtime.dir.as_deref().map(Path::new));
    let available = python_path.is_some();

    Ok(PythonRuntimeInfo {
        python_path,
        runtime_dir: runtime.dir,
        source: source.to_string(),
        runtime_source: runtime.source.to_string(),
        runtime_is_fallback: runtime.is_fallback,
        available,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn candidates_are_bare_names_in_order() {
        let candidates = interpreter_candidates();
        assert_eq!(candidates, ["python3", "python"]);
        for candidate in candidates {
            assert!(!candidate.starts_with('/'));
            assert!(!candidate.contains('\\'));
            assert!(!candidate.contains(std::path::MAIN_SEPARATOR));
        }
    }

    #[test]
    fn explicit_path_wins_over_env() {
        let (choice, source) =
            choose_python_source(Some("/opt/custom/python"), Some("/env/python"), None, None);
        assert_eq!(choice.as_deref(), Some("/opt/custom/python"));
        assert_eq!(source, "explicit");
    }

    #[test]
    fn empty_explicit_falls_through_to_env() {
        let (choice, source) = choose_python_source(Some(""), Some("/env/python"), None, None);
        assert_eq!(choice.as_deref(), Some("/env/python"));
        assert_eq!(source, "env");
    }

    #[test]
    fn bundled_runtime_wins_over_venv_and_path() {
        let (choice, source) = choose_python_source(
            None,
            None,
            Some("/app/resources/python-runtime/bin/python3"),
            Some("/repo/.venv/bin/python3"),
        );
        assert_eq!(
            choice.as_deref(),
            Some("/app/resources/python-runtime/bin/python3")
        );
        assert_eq!(source, "resource");
    }

    #[test]
    fn venv_is_used_when_no_explicit_env_or_runtime() {
        let (choice, source) =
            choose_python_source(None, None, None, Some("/repo/.venv/bin/python3"));
        assert_eq!(choice.as_deref(), Some("/repo/.venv/bin/python3"));
        assert_eq!(source, "workspace-venv");
    }

    #[test]
    fn nothing_provided_reports_path_source() {
        let (choice, source) = choose_python_source(None, None, None, None);
        assert_eq!(choice, None);
        assert_eq!(source, "path");
    }

    #[test]
    fn store_alias_paths_are_recognized() {
        assert!(is_store_alias(
            r"C:\Users\me\AppData\Local\Microsoft\WindowsApps\python3.exe"
        ));
        assert!(is_store_alias(
            r"C:\Program Files\WindowsApps\python\python.exe"
        ));
        assert!(!is_store_alias(r"C:\Python313\python.exe"));
    }

    #[test]
    fn runtime_interpreter_finds_a_unix_layout() {
        let base = std::env::temp_dir().join(format!("aegis-runtime-test-{}", std::process::id()));
        let runtime = base.join(RUNTIME_RESOURCE_DIR);
        std::fs::create_dir_all(runtime.join("bin")).expect("create runtime bin dir");
        let python = runtime.join("bin").join("python3");
        std::fs::write(&python, b"").expect("create interpreter placeholder");

        assert_eq!(
            runtime_interpreter(Some(runtime.as_path())),
            Some(python.to_string_lossy().into_owned())
        );

        std::fs::remove_dir_all(&base).ok();
    }

    #[test]
    fn runtime_interpreter_ignores_a_runtime_without_an_interpreter() {
        let base = std::env::temp_dir().join(format!("aegis-runtime-empty-{}", std::process::id()));
        std::fs::create_dir_all(&base).expect("create empty temp dir");

        assert_eq!(runtime_interpreter(Some(base.as_path())), None);
        assert_eq!(runtime_interpreter(None), None);

        std::fs::remove_dir_all(&base).ok();
    }

    #[test]
    fn env_wins_over_resource_and_workspace() {
        let resolution = choose_runtime_dir(
            Some("/env/runtime"),
            Some("/app/resources/python-runtime"),
            Some("/workspace/python-runtime"),
        );
        assert_eq!(resolution.dir.as_deref(), Some("/env/runtime"));
        assert_eq!(resolution.source, "env");
        assert!(!resolution.is_fallback);
    }

    #[test]
    fn resource_wins_over_workspace() {
        let resolution = choose_runtime_dir(
            None,
            Some("/app/resources/python-runtime"),
            Some("/workspace/python-runtime"),
        );
        assert_eq!(
            resolution.dir.as_deref(),
            Some("/app/resources/python-runtime")
        );
        assert_eq!(resolution.source, "resource");
        assert!(!resolution.is_fallback);
    }

    #[test]
    fn workspace_is_flagged_as_a_fallback() {
        let resolution = choose_runtime_dir(None, None, Some("/workspace/python-runtime"));
        assert_eq!(resolution.dir.as_deref(), Some("/workspace/python-runtime"));
        assert_eq!(resolution.source, "cwd-walk-up");
        assert!(resolution.is_fallback);
    }

    #[test]
    fn nothing_resolved_is_an_explicit_fallback() {
        let resolution = choose_runtime_dir(None, None, None);
        assert_eq!(resolution.dir, None);
        assert_eq!(resolution.source, "none");
        assert!(resolution.is_fallback);
    }

    #[test]
    fn empty_values_fall_through_to_the_next_source() {
        let resolution = choose_runtime_dir(Some(""), Some(""), Some("/workspace/python-runtime"));
        assert_eq!(resolution.source, "cwd-walk-up");
        assert!(resolution.is_fallback);
    }

    #[test]
    fn resource_runtime_dir_only_accepts_an_existing_bundled_directory() {
        let base = std::env::temp_dir().join(format!("aegis-setup-test-{}", std::process::id()));
        let bundled = base.join(RUNTIME_RESOURCE_DIR);
        std::fs::create_dir_all(&bundled).expect("create temp runtime dir");

        let resolved = resource_runtime_dir(Some(base.as_path()));
        assert!(resolved.is_some());
        assert!(resolved.expect("resolved").ends_with(RUNTIME_RESOURCE_DIR));

        let empty =
            std::env::temp_dir().join(format!("aegis-setup-missing-{}", std::process::id()));
        assert_eq!(resource_runtime_dir(Some(empty.as_path())), None);
        assert_eq!(resource_runtime_dir(None), None);

        std::fs::remove_dir_all(&base).ok();
    }
}
