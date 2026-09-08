# Aegis Agent

> AI-powered RPA desktop application for non-engineers.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-≥18-green.svg)](https://nodejs.org/)
[![Rust](https://img.shields.io/badge/Rust-≥1.75-orange.svg)](https://www.rust-lang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-≥9-purple.svg)](https://pnpm.io/)

## Quick Start

```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Clone the repository
git clone https://github.com/your-org/aegis-agent.git
cd aegis-agent

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

### Prerequisites

- **Node.js** ≥ 18
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
├── engines/
│   └── rpa/              # RPA execution engine (Python subprocess management)
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utility functions
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

# Build for production
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint
```

## License

[MIT](LICENSE)
