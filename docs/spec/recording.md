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
| `OperationLogger` | ✅ Complete | logAction, exportLog, filterSensitiveData |
| `SelectorResolver` | ✅ Complete | CSS/XPath/text-based resolution |
| `ScreenshotManager` | ✅ Complete | Capture & compression |
| `tauri-commands.ts` | ✅ Complete | Tauri IPC bridge |
| `types.ts` | ✅ Complete | All type definitions |

### Not Yet Implemented

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
