# Recording & Operation Logging Category

> Package: `@aegis/recorder`
> Core Flow: ①Show (Learn)

## Overview

Records the user's PC operations (browser & desktop apps) as lightweight JSON metadata, building the operation logs needed for downstream AI code generation.

**Core idea**: Button text, labels, HTML structure, and screenshots are kept as "rich metadata" providing sufficient context for AI to generate safe Playwright code.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REC-01 | Browser operation recording (click, input, scroll, navigation) | Must |
| REC-02 | Desktop app operation recording (via Tauri IPC) | Must |
| REC-03 | Automatic CSS selector / XPath resolution | Must |
| REC-04 | Automatic screenshot capture | Should |
| REC-05 | Operation session pause / resume | Should |
| REC-06 | Operation log export (@aegis/shared format) | Must |
| REC-07 | Sensitive data filtering | Must |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| REC-NF01 | CPU usage during recording | < 5% |
| REC-NF02 | Metadata storage size | < 1MB/session |
| REC-NF03 | Screenshot compression quality | 80% JPEG |
| REC-NF04 | Selector resolution response time | < 100ms |

## API / Interfaces

### Main Classes

- **`OperationLogger`**: Tracks and exports recorded operations
- **`SelectorResolver`**: Automatic CSS selector / XPath resolution
- **`ScreenshotManager`**: Screenshot capture management

### Key Type Definitions

```typescript
type ActionType = 'click' | 'type' | 'scroll' | 'navigate' | 'wait'
  | 'screenshot' | 'keypress' | 'select' | 'hover' | 'drag';

interface RecordedAction {
  id: string;
  type: ActionType;
  selector: SelectorInfo;
  metadata: ActionMetadata;
  timestamp: number;
  screenshot?: string;
}
```

### Tauri Commands

- `start_recording(name?)` → Start session
- `stop_recording()` → Stop session
- `pause_recording()` / `resume_recording()` → Pause / resume
- `get_recording_state()` → Get current state
- `take_screenshot(region?)` → Take screenshot

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `OperationLogger` | ✅ Complete | Shared library (`logAction`, `exportLog`, `filterSensitiveData`); not imported by `apps/desktop` |
| `SelectorResolver` | ✅ Complete | CSS/XPath/text-based resolution (shared library) |
| `ScreenshotManager` | ✅ Complete | Capture & compression (shared library) |
| `tauri-commands.ts` | ✅ Complete | Tauri IPC bridge (shared library) |
| `types.ts` | ✅ Complete | All type definitions |
| Recorder session state machine (start / pause / resume / stop) | ✅ Implemented | `apps/desktop/src-tauri/src/recorder/mod.rs:201-260`; illegal transitions are rejected by `apply_transition` (`recorder/mod.rs:50`) |
| Real screen capture (`take_screenshot`) | ✅ Implemented | Captures through the `xcap` crate and returns a base64 PNG (`recorder/screenshot.rs:70`); a `ScreenshotRef` is appended to the domain store (`recorder/mod.rs:262-287`) |
| Operation log capture (recorded actions) | ❌ Not implemented | `start_recording` initialises `actions: Vec::new()` (`recorder/mod.rs:214`) and no registered command appends a captured action, so `RecorderSession.actions` is empty for every session |
| Input-event capture (click, key, scroll, navigation) | ❌ Not implemented | `lib.rs:38-44` registers only the state transitions, the session read and `take_screenshot`; nothing observes user input |
| Selector resolution at capture time | ❌ Not implemented | `SelectorResolver` exists only in the TypeScript package, which the app does not import |
| Capture-time sensitive-data filtering (REC-07) | ❌ Not implemented | No `@aegis/security` import exists under `apps/desktop`; see [security.md](security.md) |
| Session persistence and export (REC-06) | ❌ Not implemented | The recorder lives in memory in `AppState.recorder`; the persisted shape holds tasks, activity, the setup flag and provider models only (`tasks/state.rs:19-36`) |

### Where recording stands today

Recording is a correctly modelled session that never receives any content. The
state machine is real: transitions are validated (`recorder/mod.rs:50`) and the
frontend can start, pause, resume, stop and read a session through registered
commands (`lib.rs:38-44`), and screen capture genuinely works
(`recorder/screenshot.rs`). What is missing is the element that gives the category
its name — the session's `actions` vector is created empty
(`recorder/mod.rs:214`) and no non-test code appends to it, so a session reports
zero actions no matter what the user does. Screenshots are therefore the only real
capture artifact, and they are held as opaque references in the domain store
(`recorder/mod.rs:280-284`) rather than attached to an action.

The consequence is the break that runs through the rest of the product: the
category that is supposed to produce the AI's input produces nothing, so the
downstream stages have nothing to consume even before the UI wiring gaps recorded
in [ai-engine.md](ai-engine.md) are considered.

**Target behaviour** (contract C1 of
[ADR-011](../adr/011-agentic-rpa-pipeline.md)): the recorder captures each user
operation as a `RecordedAction` — at minimum the `ActionType` variants defined
above (`click`, `type`, `scroll`, `navigate`, `keypress`, `select`, `hover`,
`drag`) — each carrying the resolved `SelectorInfo`, the action metadata (button
text, labels, HTML structure) and, where relevant, a linked screenshot. The
resulting `OperationLog` is the **input contract of AI generation**: only a
session with captured actions can be turned into a validated script and a pending
approval request (contract C2 of ADR-011). A session that captured no actions must
be reported as empty rather than silently accepted as a generation input.

### Not Yet Implemented

- Capturing operations at all: appending a `RecordedAction` to the active session
  and exposing that command to the frontend
- Linking a screenshot to the action that triggered it (today: an unattached
  `ScreenshotRef` list)
- Native desktop operation recording (currently browser-focused)
- Mouse tracking & gesture recording
- Multi-monitor support

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/selector-resolver.test.ts` | SelectorResolver |
| `__tests__/operation-logger.test.ts` | OperationLogger |
| `__tests__/screenshot-manager.test.ts` | ScreenshotManager |
| `__tests__/tauri-commands.test.ts` | Tauri commands |
| `__tests__/recorder-integration.test.ts` | Integration tests |
