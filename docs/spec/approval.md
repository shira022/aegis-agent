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
| `ApprovalManager` | ✅ Complete | Approve, reject, history recording (shared library) |
| `SafetyAnalyzer` | ✅ Complete | Dangerous operation detection, risk assessment (`safety-analyzer.ts:112-125`) |
| `CodeDisplay` | ✅ Complete | Syntax highlighting |
| `types.ts` | ✅ Complete | All type definitions |
| Rust approval state machine | ✅ Implemented | `list_approvals` / `decide_approval` with the `pending`/`reviewing` → `approved`/`rejected` transition (`tasks/mod.rs:131-145`, `tasks/state.rs:208-241`) |
| Request generation | ❌ Not implemented | Nothing creates an `ApprovalRequest`; see below |
| Approval history durability (APR-05) | ❌ Not implemented | Approvals are not persisted; history is lost on restart |
| Locking approved code (APR-04) | ❌ Not implemented | No write path exists that could enforce read-only |
| Code diff display (APR-07) | ❌ Not implemented | `CodeDisplay` shows a single version; nothing produces two versions to diff |

### Where approvals stand today

The review stage is a complete, tested skeleton with no producer:

- **No request is ever created.** There is no non-test `approvals.push` anywhere in
  `apps/desktop/src-tauri/src`. `list_approvals` simply clones the store
  (`tasks/mod.rs:131-133`), so the review screen can only ever render its empty
  state (`packages/@aegis/ui/src/i18n/locales/en.json:138`), and
  `App.tsx:288-289` always computes `pendingRequest = null`.
- **Decisions cannot be reached.** The state machine in `tasks/state.rs:208-241`
  is implemented and guards against a second decision, but with no `pending`
  request in existence there is nothing for a user to approve or reject.
- **Approval history is volatile.** `PersistedState` (`tasks/state.rs:30-36`)
  deliberately stores only tasks, the activity log, the setup flag and the
  per-provider model selection; `approvals` and `healing_events` are session-only
  fields of the in-memory `DomainStore`. A restart therefore discards the entire
  approval history.

**Target behaviour** (contracts C2 and C3 of
[ADR-011](../adr/011-agentic-rpa-pipeline.md)): the generation command
(`generate_task_script`) is the single producer, creating exactly one `pending`
request per invocation together with the script it wrote to
`scripts/<slug>.py`, including the failed safety checks so the human can see why
code is risky. Generation never approves, executes or deletes anything; approvals
become persisted state with a version bump so a request cannot vanish while its
script remains on disk, and execution is permitted only for a request whose state
is `approved`, running exactly the code that was approved.

### Not Yet Implemented

- A producer for approval requests (`generate_task_script`)
- Persisted approval history (and the `STATE_VERSION` bump it requires)
- Expiry handling for stale `pending` requests (`expiresAt` exists but is unused)
- Read-only locking of approved scripts
- Team approval (multi-person approval workflow)
- Approval rule customization
- Approval email notifications

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/approval-manager.test.ts` | ApprovalManager |
| `__tests__/safety-analyzer.test.ts` | SafetyAnalyzer |
| `__tests__/code-display.test.ts` | CodeDisplay |
