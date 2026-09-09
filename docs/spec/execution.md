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
| `ProcessManager` | ✅ Complete | Subprocess management |
| `ExecutionEngine` | ✅ Complete | Orchestration |
| `LogCollector` | ✅ Complete | Log collection & formatting |
| `ScriptGenerator` | ✅ Complete | Script generation |
| `types.ts` | ✅ Complete | All type definitions |

### Not Yet Implemented

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
