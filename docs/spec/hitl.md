# Human-in-the-Loop Category

> Package: `@aegis/hitl`
> Core Flow: ④Evolve (Improve)

## Overview

A category that manages human intervention when errors occur, improving automation accuracy through demonstration recording and diff-based learning.

**Core idea**: All fixes are based on human judgment. AI "proposes" fixes, humans "apply" them, and patterns are learned from the diffs. This cycle is the core of the "Evolve (Improve)" flow.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| HITL-01 | Intervention request management | Must |
| HITL-02 | Demonstration recording (record user correction operations) | Must |
| HITL-03 | Diff learning (extract patterns from code diffs before/after correction) | Must |
| HITL-04 | Present intervention options (fix, abort, skip) | Must |
| HITL-05 | Accumulate learning patterns & manage confidence | Should |
| HITL-06 | Intervention history management | Should |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| HITL-NF01 | Intervention response time | < 500ms |
| HITL-NF02 | Diff calculation accuracy | 100% (line-level) |
| HITL-NF03 | Learning pattern matching speed | < 100ms |

## API / Interfaces

### Main Classes

- **`HumanLoopEngine`**: Orchestration of the HITL flow
- **`InterventionManager`**: Manages intervention requests
- **`DemonstrationRecorder`**: Manages demonstration recording
- **`DiffLearner`**: Diff-based learning engine

### Key Type Definitions

```typescript
type HitlState = 'idle' | 'waiting_for_human' | 'demonstrating'
  | 'learning' | 'applying';

interface InterventionRequest {
  id: string;
  context: ErrorContext;
  options: InterventionOption[];
  createdAt: Date;
}

interface InterventionOption {
  id: string;
  type: 'fix_code' | 'demonstrate' | 'abort' | 'skip';
  label: string;
  description: string;
}

interface Demonstration {
  id: string;
  requestId: string;
  actions: RecordedAction[];
  timestamp: Date;
  duration: number;
}

interface LearningPattern {
  id: string;
  errorType: string;
  fixPattern: string;
  codeTemplate: string;
  confidence: number;
  usageCount: number;
}
```

### HITL Flow

```
Error detected → InterventionRequest generated → Presented to user
     ↓
  User decision → Type-based processing:
  ├── demonstrate → DemonstrationRecorder → Record demonstration
  ├── fix_code → DiffLearner → Diff-based learning
  └── abort → Terminate
```

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `HumanLoopEngine` | ✅ Complete | Flow management |
| `InterventionManager` | ✅ Complete | Intervention management |
| `DemonstrationRecorder` | ✅ Complete | Demonstration recording |
| `DiffLearner` | ✅ Complete | Diff-based learning |
| `types.ts` | ✅ Complete | All type definitions |

### Not Yet Implemented

- Visual replay of demonstrations
- Persistence of learning patterns
- Intervention priority management

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/human-loop-engine.test.ts` | HumanLoopEngine |
| `__tests__/intervention-manager.test.ts` | InterventionManager |
| `__tests__/demonstration-recorder.test.ts` | DemonstrationRecorder |
| `__tests__/diff-learner.test.ts` | DiffLearner |
