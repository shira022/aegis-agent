# System Architecture Category

> Package: System-wide
> Core Flow: Integration of all flows

## Overview

Defines the overall system architecture of Aegis Agent, the relationships between packages, and data flows.

**Core idea**: Frontend and backend run entirely on the local PC; only AI processing is delegated to the cloud. All data is stored on the user's PC, and any externally transmitted data is PII-masked.

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
| Local data storage | SQLite (planned) |
| Cloud AI | OpenAI / Anthropic / Local LLM |
| Encryption | OS Keychain (AES-256) |

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Package structure | ✅ Complete | monorepo |
| `@aegis/shared` | ✅ Complete | Shared type definitions |
| Tauri app skeleton | ✅ Complete | `apps/desktop` |
| Python runtime | ⬜ Template only | `engines/python-runtime` |
| SQLite persistence | ⬜ Not implemented | |
| CI/CD pipeline | ⬜ Not implemented | |

## Test Coverage

| Test File | Target |
|-----------|--------|
| `packages/@aegis/shared/src/__tests__/types.test.ts` | Shared type definitions |
| `packages/@aegis/shared/src/__tests__/dependency-checker.test.ts` | Dependency checker |
