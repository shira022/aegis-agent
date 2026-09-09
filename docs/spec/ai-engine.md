# AI Engine Category

> Package: `@aegis/ai-engine`
> Core Flow: ②Review (Approve) — the core component

## Overview

An engine that takes operation logs and generates **deterministic** Python scripts with pre-defined exception handlers.

**Core idea**: To prevent AI hallucinations, safety is ensured through a two-stage approach: prompt design and validation. Generated code is always wrapped in an `if __name__ == "__main__"` block and locked (read-only) only after user approval.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| AI-01 | Operation log → Python script conversion | Must |
| AI-02 | Playwright/Selenium code generation | Must |
| AI-03 | Automatic exception handler injection | Must |
| AI-04 | Input validation (dangerous pattern detection) | Must |
| AI-05 | Code validation (syntax & structure checks) | Must |
| AI-06 | Prompt template management | Must |
| AI-07 | Multiple AI provider support | Should |
| AI-08 | Exception prediction pattern learning | Should |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| AI-NF01 | Code generation response time | < 30 seconds |
| AI-NF02 | Generated code syntax validity | 100% |
| AI-NF03 | Prompt management consistency | Versioning support |

## API / Interfaces

### Main Classes

- **`CodeGenerator`**: Generates Python code from operation logs
- **`PromptBuilder`**: Constructs prompts for the AI
- **`InputValidator`**: Detects dangerous patterns in user input
- **`CodeValidator`**: Validates syntax and structure of generated code

### Key Type Definitions

```typescript
interface AiEngineResult {
  success: boolean;
  code?: string;
  error?: string;
  warnings: string[];
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
}
```

### Prompt Design

- **Role definition**: "You are an expert in RPA automation code"
- **Constraint rules**: Prohibition of dangerous functions (eval, exec, os.system)
- **Output format**: Code generation conforming to a JSON schema
- **Exception templates**: Timeout, network error, element not found

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `CodeGenerator` | ✅ Complete | Playwright/Selenium support |
| `PromptBuilder` | ✅ Complete | Prompt template management |
| `InputValidator` | ✅ Complete | Dangerous pattern detection |
| `CodeValidator` | ✅ Complete | Syntax & structure validation |
| `types.ts` | ✅ Complete | All type definitions |

### Not Yet Implemented

- Multi-provider switching (currently single provider only)
- Machine learning for exception patterns
- Code quality scoring

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/generator.test.ts` | CodeGenerator |
| `__tests__/prompt-builder.test.ts` | PromptBuilder |
| `__tests__/validators.test.ts` | InputValidator/CodeValidator |
