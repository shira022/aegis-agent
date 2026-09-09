---
name: tdd
description: Test-Driven Development workflow — red-green-refactor cycle for TypeScript/Vitest. Use when adding new features or fixing bugs.
tags: [tdd, testing, vitest, typescript, red-green-refactor]
category: development
---

# tdd

Test-Driven Development (TDD) workflow for the Aegis monorepo.
Strictly follow the **RED → GREEN → REFACTOR** cycle.

## Trigger Conditions

- When implementing a new feature
- When fixing a bug
- When changing the behavior of existing code

## Core Principles

1. **RED**: Write a failing test first
2. **GREEN**: Write the minimal implementation to pass the test
3. **REFACTOR**: Improve the code while tests remain green
4. **Verify**: Run `pnpm test` after each cycle

## Execution Steps

### 1. RED — Write a Failing Test

```bash
# Navigate to the target package
cd packages/@aegis/<package-name>

# Create a test file (skip if it already exists)
# Example: src/__tests__/myFeature.test.ts
```

After writing the test, **confirm that it fails**:
```bash
pnpm test
# Expected: Test FAILS
```

**Important**: If the test passes from the start,
- Check whether the feature is already implemented
- Verify that the test expectations are correct
- If the implementation is already correct and working, skip the TDD cycle (REFACTOR only)

### 2. GREEN — Pass the Test with Minimal Implementation

```bash
# Write the implementation
# Example: src/myFeature.ts

# Pass the test
pnpm test
# Expected: Test PASSES
```

**Rules at this stage**:
- Write only the **minimum code** needed to pass the test
- Do not consider future functionality
- A stub implementation (returning a hard-coded value) is fine
- Complex refactoring is deferred to the REFACTOR step

### 3. REFACTOR — Improve While Tests Stay Green

```bash
# Refactoring
# - Improve type definitions
# - Extract functions
# - Remove duplication
# - Improve naming

# Confirm tests still pass
pnpm test
# Expected: All PASS
```

**Rules during refactoring**:
- No refactoring that turns tests red
- No refactoring that changes behavior
- Feel free to improve type safety

### 4. Move to the Next Cycle

Repeat RED → GREEN → REFACTOR to build features incrementally in small steps.

## Test Writing Patterns (Vitest + TypeScript)

### Basic Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from '../myModule';

describe('myFunction', () => {
  beforeEach(() => {
    // Per-test setup
  });

  it('should handle normal case', () => {
    const result = myFunction('input');
    expect(result).toBe('expected-output');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction('')).toThrow('Input cannot be empty');
  });
});
```

### Mock Pattern

```typescript
import { vi, describe, it, expect } from 'vitest';

// Mock external dependencies
vi.mock('@aegis/ai-engine', () => ({
  createAIEngine: vi.fn().mockResolvedValue({
    generate: vi.fn().mockResolvedValue('mocked response'),
  }),
}));

// Mock functions
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
};
```

### Async Tests

```typescript
describe('async operations', () => {
  it('should resolve successfully', async () => {
    const result = await asyncFunction();
    expect(result).toEqual({ status: 'ok' });
  });

  it('should reject on failure', async () => {
    await expect(failingFunction()).rejects.toThrow('Error message');
  });
});
```

## Monorepo-Specific Considerations

### Cross-Package Testing

```bash
# Package-specific tests
cd packages/@aegis/ai-engine && pnpm test

# All package tests
pnpm test

# A specific test file only
cd packages/@aegis/security && pnpm test -- pii.test.ts
```

### Test File Locations

```
packages/@aegis/<package>/
├── src/
│   ├── __tests__/          ← recommended: keep tests near source
│   │   ├── feature.test.ts
│   │   └── helpers.test.ts
│   └── feature.ts
├── src/feature.ts          ← code under test
└── vitest.config.ts        ← package-level config (if present)
```

### Edge Case Coverage

| Case | Examples |
|--------|-----|
| Empty input | `''`, `[]`, `{}` |
| null/undefined | `null`, `undefined` |
| Boundary values | `0`, `MAX_SAFE_INTEGER`, empty string |
| Error paths | network error, timeout, DB connection failure |
| Type boundaries | passing `any`, passing an invalid type |

## Iteration Patterns

### Bug Fix Scenario

1. First, write a test that reproduces the bug (RED)
2. Confirm the test turns red (bug reproduced)
3. Fix the bug (GREEN)
4. Verify the fix does not affect other tests (REFACTOR)

### Refactoring-Only Scenario

1. Confirm existing tests pass
2. Perform the refactoring
3. Confirm tests still pass
4. If needed, refactor the tests alongside the code

## Important Notes

- Never skip the RED phase (this is the most important rule)
- In the GREEN phase, stick to the minimum — over-implementation makes refactoring harder
- In the REFACTOR phase, you're safe as long as tests don't turn red
- Check that the ratio of test files to implementation files is not excessively skewed (appropriate granularity)
- Do not commit while `pnpm test` is failing
