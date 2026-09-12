//! Python interpreter and runtime-directory resolution.
//!
//! No absolute paths are ever hard-coded. Resolution order for the interpreter:
//! explicit caller path -> `AEGIS_PYTHON_PATH` -> workspace virtualenv found by
//! walking up from the cwd -> bare `python3`/`python` found on `PATH`.

use serde::Serialize;

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PythonRuntimeInfo {
    pub python_path: Option<String>,
    pub runtime_dir: Option<String>,
    pub source: String,
    pub available: bool,
}

/// Bare interpreter names to try, in order, when nothing else resolves.
pub fn interpreter_candidates() -> [&'static str; 2] {
    ["python3", "python"]
}

/// Pure selection between the explicit, environment and workspace-venv choices.
///
/// Empty strings are treated as "not provided" so an empty explicit path falls
/// through to the environment variable.
pub fn choose_python_source(
    explicit: Option<&str>,
    env_path: Option<&str>,
    venv_path: Option<&str>,
) -> (Option<String>, &'static str) {
    if let Some(path) = explicit.filter(|p| !p.is_empty()) {
        return (Some(path.to_string()), "explicit");
    }
    if let Some(path) = env_path.filter(|p| !p.is_empty()) {
        return (Some(path.to_string()), "env");
    }
    if let Some(path) = venv_path.filter(|p| !p.is_empty()) {
        return (Some(path.to_string()), "workspace-venv");
    }
    (None, "path")
}

fn is_on_path(name: &str, path_var: Option<&std::ffi::OsStr>) -> bool {
    let Some(paths) = path_var else {
        return false;
    };
    std::env::split_paths(paths).any(|dir| {
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

fn find_workspace_venv_python() -> Option<String> {
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

/// Resolve the Python interpreter path and the source it came from.
pub fn resolve_python(explicit: Option<&str>) -> (Option<String>, &'static str) {
    let env_path = std::env::var("AEGIS_PYTHON_PATH").ok();
    let venv_path = find_workspace_venv_python();
    let (choice, source) = choose_python_source(
        explicit,
        env_path.as_deref(),
        venv_path.as_deref(),
    );
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

/// Resolve the runtime directory: env override first, then a repo-relative walk.
pub fn resolve_runtime_dir() -> Option<String> {
    if let Ok(value) = std::env::var("AEGIS_PYTHON_RUNTIME") {
        if !value.is_empty() {
            return Some(value);
        }
    }
    find_workspace_runtime_dir()
}

#[tauri::command]
pub fn get_python_runtime_info() -> Result<PythonRuntimeInfo, String> {
    let (python_path, source) = resolve_python(None);
    let runtime_dir = resolve_runtime_dir();
    let available = python_path.is_some();

    Ok(PythonRuntimeInfo {
        python_path,
        runtime_dir,
        source: source.to_string(),
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
            choose_python_source(Some("/opt/custom/python"), Some("/env/python"), None);
        assert_eq!(choice.as_deref(), Some("/opt/custom/python"));
        assert_eq!(source, "explicit");
    }

    #[test]
    fn empty_explicit_falls_through_to_env() {
        let (choice, source) = choose_python_source(Some(""), Some("/env/python"), None);
        assert_eq!(choice.as_deref(), Some("/env/python"));
        assert_eq!(source, "env");
    }

    #[test]
    fn venv_is_used_when_no_explicit_or_env() {
        let (choice, source) =
            choose_python_source(None, None, Some("/repo/.venv/bin/python3"));
        assert_eq!(choice.as_deref(), Some("/repo/.venv/bin/python3"));
        assert_eq!(source, "workspace-venv");
    }

    #[test]
    fn nothing_provided_reports_path_source() {
        let (choice, source) = choose_python_source(None, None, None);
        assert_eq!(choice, None);
        assert_eq!(source, "path");
    }
}
