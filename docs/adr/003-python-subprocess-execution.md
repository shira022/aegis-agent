# ADR-003: Python Subprocess Execution

## Status

Accepted

## Context

Aegis Agent generates and executes Python code to perform RPA tasks (browser automation, file operations, API calls). The execution model must be safe, debuggable, and extensible.

Key constraints:
- Users approve every script before execution (human-in-the-loop)
- The app needs to execute arbitrary Python code, not a restricted DSL
- Debugging must be straightforward — users should be able to see and modify generated scripts
- Dependencies (e.g., `playwright`, `requests`) must be installable without modifying the host system
- The setup wizard checks and installs Python dependencies

Alternatives considered:
- **Embedded Python (PyO3/CPython binding)** — more complex integration, harder to debug, version coupling with Rust backend
- **Jupyter kernel** — heavyweight, requires running a server process, overkill for script execution
- **WASM Python (Pyodide)** — limited library support, can't run native extensions like `playwright`
- **Docker container** — adds Docker as a dependency, poor UX for non-technical users

## Decision

Execute approved Python code via **subprocess** (`python3 -m` or direct script execution).

- The Rust backend spawns a Python child process for each script execution
- Generated scripts are saved as `.py` files that the user can inspect, edit, and rerun
- The setup wizard ensures Python 3.x and required pip packages are installed
- Virtual environment (venv) is used to isolate dependencies from the user's system Python

## Consequences

**Positive:**
- Simple, battle-tested execution model — subprocess is the most portable approach
- Scripts are plain `.py` files — users can open them in any editor, version control them, share them
- Full Python ecosystem is available: `playwright`, `selenium`, `requests`, `pandas`, etc.
- Debugging is natural: the user can run the script manually in a terminal
- No version coupling between the Rust backend and Python runtime
- Easy to extend: adding new automation capabilities means installing a new pip package

**Negative:**
- Python must be installed on the user's machine (handled by setup wizard)
- Subprocess has slight overhead vs embedded execution (negligible for RPA tasks)
- Inter-process communication (Rust ↔ Python) requires a defined protocol (stdout/stderr, IPC socket, or temp files)
- Python version mismatches or missing packages can cause runtime errors (mitigated by venv + setup wizard)

**Trade-offs accepted:**
- We accept the Python installation requirement in exchange for simplicity, debuggability, and full library access
- Subprocess overhead is negligible for RPA tasks that involve waiting on network/UI interactions
