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
| `HealingEngine` | ✅ Complete | Flow management |
| `ErrorClassifier` | ✅ Complete | Error classification |
| `VisionAnalyzer` | ✅ Complete | Screen analysis |
| `CodePatcher` | ✅ Complete | Code fix generation |
| `types.ts` | ✅ Complete | All type definitions |

### Not Yet Implemented

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
