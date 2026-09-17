# Aegis Agent — Product Specification

> AI creates programs (RPA) for you, and only human-approved code runs safely.
> A next-generation AI agent desktop app for non-engineers.

## Implementation Status

> Last verified: 2026-09-15 (commit `2a68918`). Evidence paths are relative to the
> repository root.

Everything the promise needs exists as a library, but the stages are not yet
connected to each other, so the promise is **not yet true as a user experience**.
Status per user-visible capability:

| User-visible capability | Status | Evidence |
|-------------------------|--------|----------|
| Desktop shell: navigation, dashboard, task list, theme (dark/light/system), i18n (en/ja) | ✅ Implemented | `apps/desktop/src/App.tsx:298-329`, `packages/@aegis/ui/src/theme/`, `packages/@aegis/ui/src/i18n/` |
| Task / activity / approval CRUD over Tauri IPC | ✅ Implemented | `apps/desktop/src-tauri/src/tasks/mod.rs`, `apps/desktop/src/ipc/tauri-adapter.ts` |
| Recording session state machine (start/pause/resume/stop) | ✅ Implemented | `apps/desktop/src-tauri/src/recorder/mod.rs` |
| Real screen capture (`take_screenshot`) | ✅ Implemented | `apps/desktop/src-tauri/src/recorder/screenshot.rs`, `recorder/mod.rs:268-285` |
| Real HTTP call to the configured AI provider | ✅ Implemented | `apps/desktop/src-tauri/src/ai_client/mod.rs:159-182`, `ai_client/providers.rs` |
| Python execution engine (subprocess, timeout, cancel) | ✅ Implemented | `apps/desktop/src-tauri/src/executor/mod.rs:106-265` |
| OS keychain read for provider credentials | ✅ Implemented | `apps/desktop/src-tauri/src/security/mod.rs:202-222`, `ai_client/mod.rs:159` |
| AI generation reachable from the UI | ❌ Not implemented | `ai_generate_script` is registered (`lib.rs:47`) but has no caller in `apps/desktop/src`; `tauri-adapter.ts` exposes no generation method |
| Approval request creation (Review stage) | ❌ Not implemented | no non-test `approvals.push` exists; `list_approvals` only clones the store (`tasks/mod.rs:131-133`), so the review screen always shows its empty state |
| Execution of a task's script | ❌ Not implemented | `run_task` documents that it does not execute (`tasks/mod.rs:17-33`); no TypeScript code calls `run_python_script` |
| Completed / failed outcomes and success rate | ❌ Not implemented | nothing transitions a task or run to a terminal status, so the dashboard success rate is always the `—` placeholder (`Dashboard.tsx:34-39`) |
| Operation log capture (recorded actions) | ❌ Not implemented | `actions: Vec::new()` during start (`recorder/mod.rs:214`); no command appends a captured action |
| Task editing from the UI | ⚠️ Partial | the edit button only raises `toast.editUnavailable` (`App.tsx:230-232`); the adapter can rename through `update_task` (`tauri-adapter.ts:33`) |
| Persistence of the API key entered in setup | ⚠️ Partial | `save_provider_key` stores a non-recoverable mask only (`tasks/mod.rs:171-193`); the real path `security::store_api_key` (`security/mod.rs:207`) is registered but unused by the UI (`tauri-adapter.ts:89`) |
| Model selection | ⚠️ Partial | a fixed `<select>` over `ProviderConfig.availableModels` (`ProviderSelector.tsx:163-175`) offers no way to enter an arbitrary model ID; see ADR-009 |
| Self-healing notifications | ❌ Not implemented | `healing.push` appears only in tests; the notifier therefore has nothing to render |
| PII masking of outbound payloads | ❌ Not implemented | no `@aegis/security` import exists anywhere in `apps/desktop/src` or `packages/@aegis/ui/src` |
| Dependency detection during setup | ⚠️ Partial | the UI lists Node / pnpm / Rust, but the real check reports only the Python runtime (`tasks/state.rs:242-258`) |
| Reporting of real run results (logs, duration, metrics) | ❌ Not implemented | no execution result is surfaced in the UI; planned as phase P1 of ADR-011 |

The pipeline that would make the promise true - Record → Generate → Review →
Execute - and the contract at each stage boundary are defined in
[ADR-011: Agentic RPA Pipeline](../adr/011-agentic-rpa-pipeline.md). Until that
vertical slice lands, the review screen, the success-rate figure and the provider
setup screen are skeleton UI: they are wired to stores, not to real generations
or executions. This document is the *target* specification; read it together with
the per-category status sections.

## Product Overview

Aegis Agent — named after "Aegis" meaning "Shield" — is an AI-driven RPA desktop application that prioritizes safety above all else.

### Core Flow

```
①Show (Learn) → ②Review (Approve) → ③Delegate (Execute) → ④Evolve (Improve)
```

| Phase | Description | Core Technology |
|-------|-------------|-----------------|
| **Show (Learn)** | Record a PC operation once and save it as lightweight JSON metadata | Tauri IPC, Playwright, Screenshots |
| **Review (Approve)** | AI generates deterministic Python scripts with pre-defined exception handlers; locked after user approval | AI Code Generation, Static Analysis |
| **Delegate (Execute)** | Runs safely inside a sandboxed Python subprocess | Python Runtime, Resource Monitor |
| **Evolve (Improve)** | AI detects failures, proposes fixes, and learns patterns | Error Classification, Vision Analysis |

### Security Principles

- **Human approval required**: Every code execution requires human approval (no autonomous execution)
- **AI hallucination prevention**: Deterministic code generation guarantees predictable output
- **Local-first**: All data is stored on the user's PC
- **OS Keychain**: API keys are managed via the OS-standard keychain

## Specification Index

| # | Category | File | Related Core Flow |
|---|----------|------|-------------------|
| 1 | [Recording & Operation Logging](recording.md) | `recording.md` | ①Show (Learn) |
| 2 | [AI Engine](ai-engine.md) | `ai-engine.md` | ②Review (Approve) |
| 3 | [Approval Workflow](approval.md) | `approval.md` | ②Review (Approve) |
| 4 | [Execution Engine](execution.md) | `execution.md` | ③Delegate (Execute) |
| 5 | [Self-Healing](self-healing.md) | `self-healing.md` | ④Evolve (Improve) |
| 6 | [Human-in-the-Loop](hitl.md) | `hitl.md` | ④Evolve (Improve) |
| 7 | [Security](security.md) | `security.md` | Cross-cutting |
| 8 | [UI/UX](ui.md) | `ui.md` | Cross-cutting |
| 9 | [System Architecture](architecture.md) | `architecture.md` | System-wide |

## Package Structure

```
packages/@aegis/
├── shared/         Shared type definitions & utilities
├── recorder/       Recording & operation logging
├── ai-engine/      AI code generation engine (prompt building, validators)
├── approval/       Approval workflow
├── executor/       Execution engine
├── healer/         Self-healing
├── hitl/           Human-in-the-Loop
├── security/       Security (PII masking, keychain)
├── ui/             UI components
└── python-runtime/ Python execution environment (4 modules, 4 Jinja2 templates)
apps/
└── desktop/      Tauri desktop application (Rust backend + React frontend)
engines/
└── python-runtime/  Legacy template directory (2 files); the packaged runtime is
                   `packages/@aegis/python-runtime/` (`tauri.conf.json:30-31`)
```

The desktop backend is a single Rust crate under
`apps/desktop/src-tauri/src` (12 modules) that registers 30 Tauri commands
(`lib.rs:37-68`); the frontend talks to it through the 19-method `DesktopApi`
adapter (`apps/desktop/src/ipc/types.ts:85-106`).

## Package and Build Status

Library-level status. "Implemented" means the package's own API and tests exist;
it does **not** mean the capability is reachable from the desktop UI (see the
capability table above).

| Category | Status | Notes |
|----------|--------|-------|
| shared (4 src / 3 test), recorder (6/5), ai-engine (6/4) | ✅ Implemented | Type definitions, prompt builder, validators |
| approval (5/3), executor (7/5), healer (6/4) | ✅ Implemented | Libraries only; nothing in the app invokes them |
| hitl (6/4), security (4/1), ui (30/14) | ✅ Implemented | `@aegis/security` is not imported by the app yet |
| desktop app (36 src / 26 test) | 🟡 Partially implemented | React UI reads from stores through the IPC adapter; the Tauri v2 backend registers 30 commands (`lib.rs:37-68`). The AI provider client performs real HTTP calls (`ai_client/providers.rs`) and the OS keychain API is real (`security/mod.rs:202-222`), but generation, approval creation and execution are not connected to the UI |
| desktop Rust backend (12 modules) | 🟡 Partially implemented | Recorder state machine + screenshots, executor, tasks/activity/approvals CRUD, keychain read |
| Python runtime (4 modules, 4 Jinja2 templates, 92 pytest tests, `packages/@aegis/python-runtime`) | ✅ Library implemented / ⚠️ Not invoked | Bundled as a Tauri resource (`tauri.conf.json:30-31`); `run_task` does not call it (`tasks/mod.rs:17-33`) |
| Tests: 69 vitest files + 92 pytest functions | ✅ Implemented | All run without a model or network; no test exercises a real provider |

Last updated: 2026-09-15
