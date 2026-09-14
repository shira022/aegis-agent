# System Architecture Category

> Package: System-wide
> Core Flow: Integration of all flows

## Overview

Defines the overall system architecture of Aegis Agent, the relationships between packages, and data flows.

**Core idea**: Frontend and backend run entirely on the local PC; only AI processing is delegated to the cloud. All data is stored on the user's PC, and any externally transmitted data is PII-masked.

> **Implementation note.** The diagrams, data flows and stack below describe the intended system. They are not a description of what the shipped app does today. Where the two disagree, the [Implementation Status](#implementation-status) table at the end of this document is authoritative, together with the status section of each category spec.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| ARCH-01 | Local-first architecture | Must |
| ARCH-02 | Cloud AI integration (prompt/response) | Must |
| ARCH-03 | Clear dependency relationships between packages | Must |
| ARCH-04 | Data flow observability | Should |
| ARCH-05 | Tauri desktop app integration | Must |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| ARCH-NF01 | Startup time | < 5 seconds |
| ARCH-NF02 | Memory usage | < 500MB |
| ARCH-NF03 | Disk usage | < 1GB |
| ARCH-NF04 | Cross-platform | Windows, macOS |

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Desktop App (Tauri)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Recorder │  │ Approval │  │ Executor │  │  UI    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┘ │
│       │              │              │                    │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────────┐ │
│  │ AI Engine│  │  Healer  │  │   HITL   │  │Security│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │                  @aegis/shared                       ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (PII-masked)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  Cloud AI Service                        │
│  (OpenAI / Anthropic / Local LLM)                       │
└──────────────────────────────────────────────────────────┘
```

## Package Dependencies

```
@aegis/shared         ← All packages depend on this
    ↑
@aegis/recorder       ← AI Engine, Approval, Security
    ↑
@aegis/ai-engine      ← Approval, Healer
    ↑
@aegis/approval       ← Executor, HITL
    ↑
@aegis/executor       ← Healer
    ↑
@aegis/healer         ← HITL
    ↑
@aegis/hitl           ← (no circular dependencies)
    ↑
@aegis/security       ← Used by all packages
```

## Data Flows

> These four flows are the target end-to-end pipeline. Only the first stage of
> the first flow (recording) is implemented, and it captures no operations yet, so
> the pipeline has no live producer or consumer. See
> [Implementation Status](#implementation-status) for the per-stage reality.

### 1. Recording Flow

```
User operation → Recorder → OperationLog (JSON)
    ↓
Security.PII mask → Sanitized log
    ↓
AI Engine → Python code generation
```

### 2. Approval Flow

```
Generated code → SafetyAnalyzer → Risk assessment
    ↓
UI.CodeReviewPanel → User review
    ↓
ApprovalManager → Approve/Reject
    ↓
Approved code lock (read-only)
```

### 3. Execution Flow

```
Approved code → ScriptGenerator → Python subprocess
    ↓
ProcessManager → Subprocess launch
    ↓
LogCollector → Log collection
    ↓
Error detected → Healer/HITL
```

### 4. Evolution Flow

```
Error detected → ErrorClassifier → Error classification
    ↓
VisionAnalyzer → Screen analysis
    ↓
CodePatcher → Proposed code fix
    ↓
HumanLoopEngine → User approval
    ↓
DiffLearner → Pattern learning
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop framework | Tauri (Rust + WebView) |
| Frontend | React + TypeScript |
| AI code generation | Python / Playwright / Selenium |
| Local data storage | JSON state file (`aegis-state.json`, schema v1) — SQLite is not used |
| Cloud AI | OpenAI / Anthropic / Local LLM |
| Local model servers | Ollama (`http://localhost:11434/v1`), LM Studio (`http://localhost:1234/v1`), any OpenAI-compatible endpoint |
| Encryption | OS Keychain (AES-256) |

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Package structure | ✅ Complete | pnpm + Turborepo monorepo (`pnpm-workspace.yaml`, `turbo.json`) |
| `@aegis/shared` | ✅ Complete | Shared type definitions |
| `@aegis/python-runtime` | ✅ Implemented | Four modules (`dependencies.py`, `generator.py`, `runner.py`, `validator.py`) plus four Jinja templates and 92 test functions under `packages/@aegis/python-runtime/` |
| Python interpreter & runtime resolution | ✅ Implemented | No absolute paths: caller path → `AEGIS_PYTHON_PATH` → bundled runtime → workspace venv → `python3` on `PATH` (`setup/mod.rs:1-14`, `:240-283`) |
| Tauri app skeleton | ✅ Complete | `apps/desktop`; 12 Rust modules and **30 registered commands** (`lib.rs:37-68`) |
| TypeScript IPC adapter | ✅ Complete | 20-method `DesktopApi` (`apps/desktop/src/ipc/types.ts:85-106`); the real Tauri adapter is selected inside the app and the mock adapter only outside Tauri (`ipc/index.ts:13`) |
| Recording | ⚠️ Partial | Session state machine and real screen capture work; no operation is ever captured (`recorder/mod.rs:214`) — see [recording.md](recording.md) |
| AI generation | ⚠️ Partial | Real HTTP client for nine providers (`ai_client/providers.rs`, response is built with `mocked: false` at `ai_client/mod.rs:183`) and real OS-keychain reads (`ai_client/mod.rs:159`); no TypeScript code calls `ai_generate_script` and no real key is ever stored, so the engine is unreachable from the UI — see [ai-engine.md](ai-engine.md) and [security.md](security.md) |
| Approval flow | ❌ Not implemented | No non-test code appends to `store.approvals`; `list_approvals` only clones an always-empty store (`tasks/mod.rs:131-133`, `ipc/mod.rs:437`) |
| Execution flow | ❌ Not implemented | `run_task` is documented as *not* executing and only records a run state (`tasks/mod.rs:17-33`, `:108-118`). The Python runner is real but is reachable only through the low-level `run_python_script` command (`executor/mod.rs:106-265`) |
| Self-healing flow | ❌ Not implemented | No healing event is ever produced, so the notifier never renders — see [self-healing.md](self-healing.md) |
| Dependency detection at setup | ⚠️ Partial | Detects the Python runtime only (`tasks/state.rs:242-258`); the UI's install buttons only rewrite the stored status |
| Local data storage | ⚠️ Partial | One JSON file (`aegis-state.json`, schema v1) in the app data directory, replaced via same-directory temp file + rename so readers never see a partial write (`tasks/state.rs:19-36`, `:74-77`). Tasks, activity, setup completion and provider model names are persisted; recording sessions and healing events are session-only |
| SQLite persistence | ❌ Not implemented | Superseded by the JSON state file above; there is no SQLite dependency in the backend |
| CI/CD pipeline | ✅ Implemented | `.github/workflows/ci.yml`: lint + type check, English-only check (`scripts/check-no-japanese.sh`), and tests with coverage |

### Notes on stale paths

`engines/python-runtime/` is a leftover stub — it contains only
`requirements.txt` and a single unused `templates/base.py`. The runtime that is
actually tested and shipped lives in `packages/@aegis/python-runtime/` and is
bundled into the app as the `python-runtime/` Tauri resource
(`apps/desktop/src-tauri/tauri.conf.json`), which is the directory
`setup/mod.rs:181-190` resolves at run time.

### What "implemented" means here

Three layers have to be distinguished, because they are frequently conflated:

1. **Shared library** (`packages/@aegis/*`, TypeScript) — implemented and unit
   tested, but only partly reachable from the app. `apps/desktop` imports
   `@aegis/shared` and `@aegis/ui` at runtime and `@aegis/approval` for its types
   (`CodeReviewPanel.tsx:1-2`, `ApprovalDialog.tsx:2`); `@aegis/recorder` is
   imported only by other packages (`@aegis/hitl`, `@aegis/healer`), never by
   `apps/desktop`; and `@aegis/ai-engine`, `@aegis/executor`, `@aegis/healer`,
   `@aegis/hitl` and `@aegis/security` have **zero importers** anywhere in the
   repository. A package's own test suite is therefore not evidence that the
   product uses it.
2. **Rust backend** (`apps/desktop/src-tauri/src`) — the real, running
   implementation: 30 commands covering recording state, screenshots, Python
   execution, provider HTTP calls, the keychain, tasks, activity, approvals and
   healing-event reads.
3. **Wired product** — a category is only reachable end to end when the UI calls
   the Rust command *and* the Rust command produces the artifact the next stage
   needs. Today no category satisfies both: recording produces no operations, AI
   generation has no caller, approvals and healing have no producer, and
   `run_task` does not execute.

## Test Coverage

| Test File | Target |
|-----------|--------|
| `packages/@aegis/shared/src/__tests__/types.test.ts` | Shared type definitions |
| `packages/@aegis/shared/src/__tests__/dependency-checker.test.ts` | Dependency checker |
