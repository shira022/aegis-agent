# Execution Engine Category

> Package: `@aegis/executor`
> Core Flow: ③Delegate (Execute)

## Overview

An engine that safely executes approved Python scripts, monitors resources, and collects logs.

**Core idea**: All code execution happens **only after human approval** and runs in isolated subprocesses. Resource monitoring detects infinite loops and memory leaks, automatically terminating processes when needed.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| EXE-01 | Python subprocess launch & management | Must |
| EXE-02 | Resource monitoring (CPU, memory, disk) | Must |
| EXE-03 | Log collection (stdout, stderr) | Must |
| EXE-04 | Script generation (template injection) | Must |
| EXE-05 | Timeout management | Must |
| EXE-06 | Process forced termination | Must |
| EXE-07 | Automatic requirements.txt generation | Should |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| EXE-NF01 | Process startup time | < 2 seconds |
| EXE-NF02 | Resource monitoring interval | 1 second |
| EXE-NF03 | Log buffer size | < 10MB |
| EXE-NF04 | Process isolation level | Full sandbox |

## API / Interfaces

### Main Classes

- **`ProcessManager`**: Launch, manage, and monitor Python subprocesses
- **`ExecutionEngine`**: Orchestration of the execution engine
- **`LogCollector`**: Log collection, formatting, and export
- **`ScriptGenerator`**: Script generation and template injection

### Key Type Definitions

```typescript
interface ProcessInfo {
  pid: number;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'killed';
  startTime: Date;
  endTime?: Date;
  resourceUsage: ResourceUsage;
}

interface ResourceUsage {
  cpu: number;      // percentage
  memory: number;   // MB
  disk: number;     // MB
}
```

### Execution Flow

```
Approved code → ScriptGenerator → Python subprocess launch
     ↓                                     ↓
  LogCollector ←──── Resource monitoring ←─── Executing
     ↓
  Results/logs → Error triage (if any)
```

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `ProcessManager` | ✅ Complete | Shared library (TypeScript) |
| `ExecutionEngine` | ✅ Complete | Shared library (TypeScript) |
| `LogCollector` | ✅ Complete | Log collection & formatting |
| `ScriptGenerator` | ✅ Complete | Script generation and template injection |
| `types.ts` | ✅ Complete | All type definitions |
| Rust executor (`executor::run_python_script`) | ✅ Implemented | Real subprocess with timeout, cancellation and stdout/stderr capture (`apps/desktop/src-tauri/src/executor/mod.rs:106-265`) |
| Executor reachable from the UI | ❌ Not implemented | No TypeScript file references `run_python_script`; `packages/@aegis/executor/src/tauri-bridge.ts` is unused by `apps/desktop` |
| Task script execution | ❌ Not implemented | `run_task` does not execute (`tasks/mod.rs:17-33`); see below |
| Completed / failed run outcomes | ❌ Not implemented | Nothing writes a terminal status or `finishedAt` |
| Resource monitoring (EXE-02) | ❌ Not implemented | `ExecutionResult.memoryUsage` is always `None` (`executor/mod.rs:51`, `:262`); CPU and disk are not measured at all |
| Automatic `requirements.txt` generation (EXE-07) | ❌ Not implemented | `detect_dependencies` reports the Python runtime only (`tasks/state.rs:242-258`) |

### Where execution stands today

Two halves exist and neither calls the other:

- **The engine is real.** `executor::run_python_script` spawns the script through
  the bundled Python runtime, enforces a timeout, supports idempotent
  cancellation (`executor/mod.rs:268-281`) and returns a truthful
  `ExecutionResult { exit_code, stdout, stderr, duration, timed_out,
  output_lines, memory_usage }`.
- **The command that a user can reach does not execute anything.** `run_task`
  states its own scope in its module documentation: it marks the task `running`,
  creates a `TaskRun` with `status = running` and replays the task's most recent
  activity steps; it spawns no process, and it explicitly notes that "a future
  execution engine is expected to transition the stored run to `completed` or
  `failed` and set `finishedAt`" (`tasks/mod.rs:17-33`).

The consequence is user-visible: because nothing can ever reach a terminal state,
the dashboard's success rate is always the placeholder dash and "last run" is
derived from `task.updatedAt` rather than from an execution
(`apps/desktop/src/components/Dashboard/Dashboard.tsx:34-39`).

**Target behaviour** (contract C4 of
[ADR-011](../adr/011-agentic-rpa-pipeline.md)): execution is permitted only for a
`TaskRun` whose approval state is `approved`, the code executed is the code that
was approved (locked, read-only, after approval), the executor's real result is
mapped onto run and task state (`running → completed | failed`, `finishedAt` set
from the real end time), and the activity log receives the run record. Only that
stage may write a terminal outcome, which is what turns the dashboard figures into
measurements instead of placeholders.

### Not Yet Implemented

- Wiring approved code to `run_python_script` from the UI
- Terminal run/task transitions and `finishedAt`
- Resource monitoring: memory (field exists but is never populated), CPU and disk
- Surfacing `ExecutionResult` (stdout, stderr, duration, exit code) and metrics in the run view
- Process pool (concurrent execution management)
- Execution queuing
- Execution result persistence

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/process-manager.test.ts` | ProcessManager |
| `__tests__/execution-engine.test.ts` | ExecutionEngine |
| `__tests__/log-collector.test.ts` | LogCollector |
| `__tests__/script-generator.test.ts` | ScriptGenerator |
