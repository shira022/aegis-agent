# Aegis Agent — Product Specification

> AI creates programs (RPA) for you, and only human-approved code runs safely.
> A next-generation AI agent desktop app for non-engineers.

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
├── shared/       Shared type definitions & utilities
├── recorder/     Recording & operation logging
├── ai-engine/    AI code generation engine
├── approval/     Approval workflow
├── executor/     Execution engine
├── healer/       Self-healing
├── hitl/         Human-in-the-Loop
├── security/     Security (PII masking, etc.)
└── ui/           UI components (not yet implemented)
apps/
└── desktop/      Tauri desktop application
engines/
└── python-runtime/  Python execution environment template
```

## Implementation Status

| Category | Status |
|----------|--------|
| shared, recorder, ai-engine, approval, executor | ✅ Implemented |
| healer, hitl, security | ✅ Implemented |
| ui | ⬜ Not implemented |
| desktop app | ⬜ Not implemented (skeleton only) |
| Python runtime | ⬜ Template only |

Last updated: 2026-09-08
