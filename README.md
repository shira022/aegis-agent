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
│   └── desktop/          # Tauri desktop application
│       ├── src-tauri/    # Rust backend (recorder, executor, IPC)
│       └── src/          # React frontend (UI views)
├── packages/
│   ├── @aegis/shared/    # Shared TypeScript types and utilities
│   ├── @aegis/ai-engine/ # AI code generation engine
│   ├── @aegis/recorder/  # Desktop action recorder
│   ├── @aegis/security/  # PII masking and security
│   └── @aegis/ui/        # Shared React UI components
├── scripts/              # Setup and maintenance scripts
└── docs/
    └── adr/              # Architecture Decision Records
```

### Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Desktop Shell | Tauri (Rust) | Window management, system tray, IPC bridge |
| Frontend UI | React + TypeScript | Recorder, script editor, execution dashboard |
| RPA Engine | Rust → Python subprocess | Executes approved automation scripts |
| Distribution | npm (postinstall binary download) | Cross-platform install via `npm install -g` |

### How It Works

1. **Record** — The user performs actions on their desktop; Aegis captures mouse clicks, keystrokes, and screen state
2. **Generate** — AI translates recorded actions into Python automation scripts
3. **Review** — The user reviews and approves the generated scripts
4. **Execute** — Approved scripts run in an isolated Python virtual environment
5. **Replay** — Automations can be triggered on-demand or scheduled

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

# Full CI check (typecheck + test + build)
pnpm ci
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, PR process, and guidelines.

## License

[MIT](LICENSE)
