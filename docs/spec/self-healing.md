# Self-Healing Category

> Package: `@aegis/healer`
> Core Flow: ④Evolve (Improve)

## Overview

Automatically detects errors during execution, classifies causes, proposes AI-generated fix code, and accumulates results as learning patterns.

**Core idea**: All fixes require user approval. AI only "proposes" fixes; actual code changes are made based on human judgment. Fix patterns are accumulated as learning data, improving the accuracy of automatic fixes for similar errors.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| HL-01 | Error classification (timeout, element not found, network, etc.) | Must |
| HL-02 | Error cause analysis from screen capture (vision analysis) | Should |
| HL-03 | AI-generated code fix proposals | Must |
| HL-04 | Accumulate & match learning patterns | Must |
| HL-05 | Diff display for fix code | Must |
| HL-06 | Error history management | Should |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| HL-NF01 | Error classification response time | < 3 seconds |
| HL-NF02 | Fix proposal accuracy | ≥ 70% (target) |
| HL-NF03 | Learning pattern matching speed | < 100ms |

## API / Interfaces

### Main Classes

- **`HealingEngine`**: Orchestration of the healing flow
- **`ErrorClassifier`**: Automatic error classification
- **`VisionAnalyzer`**: Error cause analysis from screen capture
- **`CodePatcher`**: Code fix generation and application

### Key Type Definitions

```typescript
interface HealingResult {
  success: boolean;
  originalError: string;
  classifiedType: ErrorType;
  proposedFix?: CodePatch;
  confidence: number;
}

interface ErrorContext {
  taskId: string;
  error: string;
  stackTrace?: string;
  timestamp: Date;
  screenshot?: string;
}

interface CodePatch {
  line: number;
  oldCode: string;
  newCode: string;
  reason: string;
}
```

### Error Classification Types

```typescript
type ErrorType =
  | 'timeout'
  | 'element_not_found'
  | 'network_error'
  | 'permission_denied'
  | 'selector_changed'
  | 'page_structure_changed'
  | 'unknown';
```

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `HealingEngine` | ✅ Complete | Flow management (shared library) |
| `ErrorClassifier` | ✅ Complete | Error classification (shared library) |
| `VisionAnalyzer` | ✅ Complete | Screen analysis (shared library) |
| `CodePatcher` | ✅ Complete | Code fix generation (shared library) |
| `types.ts` | ✅ Complete | All type definitions |
| Healing event storage (`DomainStore.healing`) | ✅ Implemented | In-memory `Vec<HealingEvent>` (`ipc/mod.rs:437`) exposed by `list_healing_events` (`tasks/mod.rs:145-146`, registered at `lib.rs:66`) |
| Healing event generation (HL-01, HL-04, HL-06) | ❌ Not implemented | Nothing ever appends to `store.healing`. Searching the whole Rust backend for an append finds only the field declaration (`ipc/mod.rs:437`) and a serialization test (`ipc/mod.rs:563-574`); no run, no error path and no AI call emits an event |
| Error detection during execution (HL-01) | ❌ Not implemented | There is no execution error path to detect from: `run_task` does not run anything (see [architecture.md](architecture.md)) and the executor is only reachable through `run_python_script` |
| AI fix proposal / diff display (HL-03, HL-05) | ❌ Not implemented | No healing flow is invoked from the app; `CodePatcher` has no runtime caller |
| Learning-pattern accumulation (HL-04) | ❌ Not implemented | Patterns are never persisted — the `healing` field is deliberately excluded from the on-disk shape (`tasks/state.rs:19-36`) |
| Healing notification UI | ⚠️ Partial | The UI is built and correct but permanently invisible: `App.tsx:261-265` passes the filtered event list to `HealingNotifier`, which returns `null` for an empty list (`HealingNotifier.tsx:29-31`). With no producer, `healingStore` always holds `[]` |
| `@aegis/healer` runtime integration | ❌ Not implemented | `@aegis/healer` has no importer anywhere in the repository, so no code path reaches it |

### Where self-healing stands today

Self-healing is a complete library with no producer. The `@aegis/healer` package
classifies errors, analyses screenshots and drafts patches, and it is covered by
tests; the app even has the receiving half wired up — `healingStore` polls
`listHealingEvents` (`healingStore.ts:29`) through the real Tauri adapter
(`tauri-adapter.ts:48`), and `App.tsx:264-269` feeds the result into
`HealingNotifier`.

What is missing is the event itself. `store.healing` is created empty and only
ever read (`tasks/mod.rs:145-146`); no error path, run completion, or AI call
appends to it. Because `HealingNotifier` deliberately renders nothing when its
event list is empty (`HealingNotifier.tsx:29-31`), the visible result is that the
notifier never appears — which is the correct behaviour for "no healing attempt
has been made", but it also means the category produces no observable behaviour at
all today, and the only place a healing event exists is the mock adapter used
outside Tauri (`mock-adapter.ts:128-170`).

The upstream dependency is the same one that blocks approvals: detection needs an
execution error, and execution is not wired up (see
[architecture.md](architecture.md)). The intended end state — detect, classify,
propose a diff, require human approval, and record the accepted fix as a learning
pattern — is specified as stage C5 of
[ADR-011](../adr/011-agentic-rpa-pipeline.md).

### Not Yet Implemented

- Emitting healing events: appending to `store.healing` from the execution error
  path so `list_healing_events` returns something and the notifier can render
- Invoking the `@aegis/healer` flow (classify → analyse → propose diff) from the
  app, and routing the proposal through human approval before it is applied
- Persistent storage for patterns
- Fix accuracy statistics dashboard
- Ranking of multiple fix candidates

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/healing-engine.test.ts` | HealingEngine |
| `__tests__/error-classifier.test.ts` | ErrorClassifier |
| `__tests__/vision-analyzer.test.ts` | VisionAnalyzer |
| `__tests__/code-patcher.test.ts` | CodePatcher |
