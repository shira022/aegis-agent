# Approval Workflow Category

> Package: `@aegis/approval`
> Core Flow: ②Review (Approve)

## Overview

A category that manages the workflow for users to safely review and approve AI-generated code.

**Core idea**: Approved code is "locked" (read-only), preventing modification by AI or the system afterward. The approval workflow consists of two pillars: safety analysis and code display.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| APR-01 | Review UI for generated code | Must |
| APR-02 | Safety analysis (dangerous operation detection) | Must |
| APR-03 | Code approve/reject operations | Must |
| APR-04 | Locking approved code (read-only) | Must |
| APR-05 | Approval history recording | Must |
| APR-06 | Safety scoring | Should |
| APR-07 | Code diff display | Should |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| APR-NF01 | Safety analysis response time | < 5 seconds |
| APR-NF02 | Approval state consistency | ACID compliant |
| APR-NF03 | Lock immutability | Hash verification |

## API / Interfaces

### Main Classes

- **`ApprovalManager`**: Manages the approval workflow (approve, reject, history)
- **`SafetyAnalyzer`**: Safety analysis of code (dangerous operation detection, risk assessment)
- **`CodeDisplay`**: Code display formatting (syntax highlighting, diffs)

### Key Type Definitions

```typescript
interface ApprovalDecision {
  decision: 'approved' | 'rejected';
  reason: string;
  approvedAt: Date;
  approvedBy: string;
}

interface SafetyAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: SafetyFinding[];
  score: number;
}

interface SafetyFinding {
  type: string;
  severity: 'info' | 'warning' | 'error';
  line: number;
  message: string;
}
```

### Approval Flow

```
AI code generation → Safety analysis → User review → Approve/Reject
     ↓                                        ↓
  Code display ←─────── Approved code lock ←───┘
```

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `ApprovalManager` | ✅ Complete | Approve, reject, history recording |
| `SafetyAnalyzer` | ✅ Complete | Dangerous operation detection, risk assessment |
| `CodeDisplay` | ✅ Complete | Syntax highlighting |
| `types.ts` | ✅ Complete | All type definitions |

### Not Yet Implemented

- Team approval (multi-person approval workflow)
- Approval rule customization
- Approval email notifications

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/approval-manager.test.ts` | ApprovalManager |
| `__tests__/safety-analyzer.test.ts` | SafetyAnalyzer |
| `__tests__/code-display.test.ts` | CodeDisplay |
