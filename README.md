# Aegis Agent

> AI-powered RPA desktop application for non-engineers.

[![CI](https://github.com/shira022/aegis-agent/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/shira022/aegis-agent/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](https://github.com/shira022/aegis-agent/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-80%25%2B-blue.svg)](https://github.com/shira022/aegis-agent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-≥20-339933.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-≥9-F69220.svg)](https://pnpm.io/)
[![Rust](https://img.shields.io/badge/Rust-≥1.75-CE422B.svg)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131.svg)](https://tauri.app/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## Implementation Status

The Rust backend is real: **30 registered Tauri commands**
(`apps/desktop/src-tauri/src/lib.rs:37-68`) covering the recording state machine,
screen capture, Python execution, HTTP calls to nine AI providers, OS-keychain
access, tasks, activity, approvals and healing-event reads. What is not yet wired
is the product flow that connects them.

| Area | Status | Notes |
|------|--------|-------|
| Recording session (start/pause/resume/stop) | ✅ Implemented | State transitions validated in `recorder/mod.rs:201-260` |
| Screen capture | ✅ Implemented | Real capture, base64 PNG (`recorder/screenshot.rs`) |
| Captured operations | ❌ Not implemented | Every session is created with `actions: Vec::new()` (`recorder/mod.rs:214`) and nothing appends to it |
| AI provider client | ✅ Implemented | Real HTTP for nine providers, responses flagged `mocked: false` (`ai_client/mod.rs:183`); model is a per-request value, not a constant |
| AI generation reachable from the UI | ❌ Not implemented | `ai_generate_script` has no caller in TypeScript (`lib.rs:47`) |
| Credential read from the OS keychain | ✅ Implemented | `ai_client/mod.rs:159` → `security::load_secret` |
| Credential **written** to the OS keychain | ❌ Not implemented | The setup screen stores a non-recoverable mask only (`tasks/mod.rs:171-193`); the real storage path `security::store_api_key` (`security/mod.rs:207-222`) is never called by the UI |
| PII masking of outbound data | ❌ Not implemented | No `@aegis/security` import exists anywhere in `apps/` or `packages/`; masking runs only in `@aegis/security`'s own tests |
| Approval requests | ❌ Not implemented | Nothing appends to `store.approvals`, so the queue is always empty |
| Task execution | ❌ Not implemented | `run_task` records a run state and does not execute (`tasks/mod.rs:17-33`) |
| Self-healing events | ❌ Not implemented | Nothing appends to `store.healing`, so the notifier never renders |
| Tests | ✅ Implemented | 69 vitest test files and 92 pytest test functions, all deterministic (no network, no model, no keychain) |

Full per-layer detail, including what "implemented" means at each layer, is in
[`docs/spec/architecture.md`](docs/spec/architecture.md#implementation-status).
The intended end-to-end pipeline and the stage contracts that close these gaps are
specified in [ADR-011](docs/adr/011-agentic-rpa-pipeline.md).

## Quick Start

```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Clone the repository
git clone https://github.com/shira022/aegis-agent.git
cd aegis-agent

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

### Prerequisites

- **Node.js** ≥ 20
- **Rust** ≥ 1.75 ([rustup](https://rustup.rs/))
- **pnpm** ≥ 9
- **Python** ≥ 3.10 (for RPA script execution)

## Architecture

Aegis Agent is built as a **Tauri** desktop application with a Rust backend and a React/TypeScript frontend.

```
aegis-agent/
├── apps/
│   └── desktop/            # Tauri desktop application
│       ├── src-tauri/      # Rust backend (12 modules: recorder, executor,
│       │                   #   ai_client, security, setup, tasks, ipc)
│       └── src/            # React frontend (UI views, IPC adapter)
├── packages/
│   ├── @aegis/shared/         # Shared TypeScript types and utilities
│   ├── @aegis/ai-engine/      # AI code generation engine
│   ├── @aegis/recorder/       # Desktop action recorder
│   ├── @aegis/approval/       # Safety analysis, approval management
│   ├── @aegis/executor/       # Script generation and subprocess management
│   ├── @aegis/healer/         # Error classification and fix proposals
│   ├── @aegis/hitl/           # Human-in-the-loop intervention
│   ├── @aegis/security/       # PII masking and security
│   ├── @aegis/ui/             # Shared React UI components
│   └── @aegis/python-runtime/ # Python runtime shipped as a Tauri resource
├── scripts/                # Setup and maintenance scripts
└── docs/
    ├── adr/                # Architecture Decision Records
    └── spec/               # Product specifications by category
```

### Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Desktop Shell | Tauri (Rust) | Window management, system tray, IPC bridge |
| Frontend UI | React + TypeScript | Recorder, script editor, execution dashboard |
| RPA Engine | Rust → Python subprocess | Runs automation scripts; real (`executor/mod.rs`), but reachable only through the low-level `run_python_script` command — `run_task` itself does not execute (`tasks/mod.rs:17-33`) |
| Distribution | npm (postinstall binary download) | Cross-platform install via `npm install -g` |

### How It Works

The five stages below are the intended flow. Only parts of stage 1 are built
today — see [Implementation Status](#implementation-status) for what each stage
actually does.

1. **Record** — The user performs actions on their desktop; Aegis captures mouse clicks, keystrokes, and screen state. *Implemented: the session and screenshots. Not implemented: the operations themselves (`recorder/mod.rs:214`).*
2. **Generate** — AI translates recorded actions into Python automation scripts
3. **Review** — The user reviews and approves the generated scripts
4. **Execute** — Approved scripts run in an isolated Python virtual environment
5. **Replay** — Automations can be triggered on-demand or scheduled

## Local Models

Aegis Agent is local-first, and the AI step is designed to work with a local model
server as well as a cloud API. Nothing in the provider layer assumes a cloud
endpoint: `ollama` and `lm-studio` are first-class providers in both registries
(`apps/desktop/src-tauri/src/ai_client/providers.rs:151-173`,
`packages/@aegis/shared/src/types/provider.ts:104-121`).

| Provider ID | Default base URL | Credential |
|-------------|------------------|------------|
| `ollama` | `http://localhost:11434/v1` | not required (`accepts_anonymous: true`, `providers.rs:160`) |
| `lm-studio` | `http://localhost:1234/v1` | not required (`accepts_anonymous: true`, `providers.rs:172`) |
| `openai-compatible` | you supply the URL | depends on the server (`providers.rs:175-186`) |

The selector groups these under "local" and "compatible"
(`packages/@aegis/ui/src/ProviderSelector/ProviderSelector.tsx:13`). A local
server needs no credential, so the configuration check itself accepts it without a
stored key (`ai_client/mod.rs:139-141`) — the setup-time keychain gap described in
[Implementation Status](#implementation-status) does not block the local path.

**The model name is not hardcoded.** The model is a per-request value: the client
calls whatever the caller passes and only falls back to the registry placeholder
when the field is empty (`ai_client/mod.rs:152-157`). The intended behaviour is
that any model — including one you just pulled — can be used, by enumerating the
server's installed models at runtime and accepting free text when enumeration
fails ([ADR-009](docs/adr/009-model-agnostic-provider-configuration.md)).
*Current gap:* the UI still renders a fixed `<select>` over `availableModels`
(`ProviderSelector.tsx:163-175`) and nothing queries `/v1/models` or `/api/tags`,
so an unlisted local model cannot yet be selected
(`docs/spec/ai-engine.md:100-104`).

**Measured on local hardware.** The numbers below were measured on 2026-09-14 on
one machine — a CPU-only setup serving `qwen3.5:9b` (9.7B parameters, Q4_K_M
quantisation) through Ollama on the Windows host
([ADR-010](docs/adr/010-real-model-e2e-verification.md), `docs/spec/ai-engine.md:106-113`).
They are observations from that run, not guarantees or minimum requirements.

| Path | Result |
|------|--------|
| Native `/api/chat`, thinking disabled (`think: false`) | answered in **0.5 s**; generated correct RPA-plan JSON in **7.8 s** using 60 tokens, and it parsed |
| OpenAI-compatible `/v1/chat/completions`, thinking left on | **52 s**, 500 reasoning tokens, and an **empty `content`** — the model's output was in a separate `reasoning` field |

The second row is the trap worth knowing about: through an OpenAI-compatible
endpoint a reasoning model can return an empty message content with the real
output placed elsewhere. The client currently reads only
`/choices/0/message/content` (`ai_client/providers.rs:395-416`), so such a response
fails with `provider response did not contain generated text`. Until
reasoning-aware parsing and a thinking-suppression option land (designed in
ADR-009, `docs/spec/ai-engine.md:106-127`), use a local model with thinking
disabled, or one that does not emit a separate reasoning field.

Note that these measurements come from direct client calls — AI generation is not
yet reachable from the UI at all (see [Implementation Status](#implementation-status)).
They establish that the local path works and is fast enough to be worth wiring up,
not that the feature is user-reachable today.

## Product Specifications

Product specifications by category are available in [`docs/spec/`](docs/spec/):

| Category | File | Description |
|---------|------|-------------|
| [Specifications Top](docs/spec/README.md) | `README.md` | Overview and links for all specifications |
| [Recording](docs/spec/recording.md) | `recording.md` | Operation metadata structure, selector resolution |
| [AI Engine](docs/spec/ai-engine.md) | `ai-engine.md` | Code generation, prompt design |
| [Approval Workflow](docs/spec/approval.md) | `approval.md` | Safety analysis, approval management |
| [Execution Engine](docs/spec/execution.md) | `execution.md` | Subprocess management, log collection |
| [Self-Healing](docs/spec/self-healing.md) | `self-healing.md` | Error classification, code fix proposals |
| [Human-in-the-Loop](docs/spec/hitl.md) | `hitl.md` | Intervention management, demo recording, differential learning |
| [Security](docs/spec/security.md) | `security.md` | PII masking, API key management |
| [UI/UX](docs/spec/ui.md) | `ui.md` | Dashboard, code review |
| [Architecture](docs/spec/architecture.md) | `architecture.md` | System diagram, data flow |

## Architecture Decisions

All significant architectural decisions are documented in [`docs/adr/`](docs/adr/):

| ADR | Decision | Status |
|-----|----------|--------|
| [001](docs/adr/001-tauri-desktop-framework.md) | Tauri Desktop Framework | Accepted |
| [002](docs/adr/002-npm-distribution.md) | npm Distribution | Accepted |
| [003](docs/adr/003-python-subprocess-execution.md) | Python Subprocess Execution | Accepted |
| [004](docs/adr/004-pnpm-monorepo.md) | pnpm Monorepo | Accepted |
| [005](docs/adr/005-react-typescript-frontend.md) | React TypeScript Frontend | Accepted |
| [006](docs/adr/006-frontend-backend-ipc-contract.md) | Frontend–Backend IPC Contract | Accepted |
| [007](docs/adr/007-mock-first-seams.md) | Mock-First Seams for AI Generation and Credential Storage | Accepted |
| [008](docs/adr/008-ui-icons-i18n-theme.md) | Icon Library, Internationalization and Theme Switching | Accepted |
| [009](docs/adr/009-model-agnostic-provider-configuration.md) | Model-Agnostic Provider Configuration | Proposed |
| [010](docs/adr/010-real-model-e2e-verification.md) | Real-Model End-to-End Verification | Proposed |
| [011](docs/adr/011-agentic-rpa-pipeline.md) | Agentic RPA Pipeline — Canonical Flow and Stage Contracts | Proposed |

## Development

```bash
# Run in development mode
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Full CI check (typecheck + test + build) — there is no `pnpm ci` script
pnpm typecheck && pnpm test && pnpm build

# English-only check (the same script CI runs)
bash scripts/check-no-japanese.sh

# Python runtime tests
cd packages/@aegis/python-runtime && python -m pytest
```

## Verification

The default suite is entirely deterministic: 69 vitest test files plus 92 pytest
test functions, with no network access, no model, no credential and no OS
keychain. `pnpm test` and `pnpm typecheck` are the normal gates, and both run in CI
(`.github/workflows/ci.yml`).

Verifying real AI behaviour needs a model, so it is a **separate, opt-in** suite
rather than part of `pnpm test`. Its design — what it asserts, why it skips instead
of fails, and how it is isolated from the required jobs — is specified in
[ADR-010](docs/adr/010-real-model-e2e-verification.md). In summary:

- It is invoked explicitly by its own script and its own CI job, never as a side
  effect of `pnpm test`, so no workspace gains a dependency on a running model.
- It is configured **only** through environment variables: `AEGIS_E2E_PROVIDER`,
  `AEGIS_E2E_BASE_URL`, `AEGIS_E2E_MODEL`, `AEGIS_E2E_API_KEY` and
  `AEGIS_E2E_TIMEOUT_MS`. No provider, URL, or model value is written into a test
  file.
- **The model name is never hardcoded.** With `AEGIS_E2E_MODEL` unset the suite
  discovers the model at run time from the server's model list, so it follows
  whatever the operator has installed.
- With no reachable model the suite **skips** and reports green: the absence of a
  local model is not a defect in the repository.

See ADR-010 for the exact invocation, the environment table and the two
verification groups. That suite is not yet present in the tree; the numbers in
[Local Models](#local-models) come from the manual measurement recorded in
ADR-009 and ADR-010.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, PR process, and guidelines.

## License

[MIT](LICENSE)
