---
name: refactoring
description: Systematic code refactoring with test safety — detect smells, refactor, verify. Use when improving existing code.
tags: [refactoring, code-quality, cleanup, typescript]
category: development
---

# refactoring

Systematic refactoring procedures for the Aegis monorepo.
**Verify tests pass → Refactor → Verify tests still pass**.

## Trigger Conditions

- When you want to improve code readability or maintainability
- When you want to eliminate duplicate code
- When you want to improve type safety
- When you want to clean up boundaries between packages

## Core Principles

1. **Run tests before refactoring** (confirm existing tests are green)
2. **Run tests after refactoring** (confirm all tests are still green)
3. **Do not change behavior** (refactoring is structural changes only)
4. **Proceed in small, incremental steps** (avoid large one-shot changes)

## Execution Steps

### 1. Pre-Refactoring Preparation

```bash
# Confirm current tests pass
cd packages/@aegis/<package-name>
pnpm test
pnpm typecheck

# Check coverage if needed (verify where the report is output)
pnpm test -- --coverage
```

### 2. Detect Code Smells

Check for the following patterns:

| Code Smell | Detection Method | Action |
|------------|-----------------|--------|
| Long functions | Functions over 30 lines | Extract functions |
| Duplicate code | Repeated similar patterns | Extract into functions/utilities |
| Complex conditionals | Nesting 3+ levels deep | Extract functions, early returns |
| Large objects | Many properties/methods | Separate responsibilities |
| Large classes | Over 500 lines | Separation of concerns |
| Repeated literal values | Hardcoded values | Extract to constants |
| Functions with many parameters | 4+ parameters | Convert to options object |

### 3. Perform the Refactoring

#### 3a. Function Extraction

```typescript
// BEFORE
async function processWorkflow(workflow: Workflow) {
  // 1. Validation (20 lines)
  if (!workflow.name) throw new Error('Name required');
  if (workflow.steps.length === 0) throw new Error('No steps');
  // ...more validation logic

  // 2. Execution preparation (15 lines)
  const context = { userId: workflow.owner, timestamp: Date.now() };
  const steps = workflow.steps.map(s => ({ ...s, context }));
  // ...

  // 3. Execution (25 lines)
  for (const step of steps) {
    await executor.run(step);
  }
}

// AFTER
function validateWorkflow(workflow: Workflow): void {
  if (!workflow.name) throw new Error('Name required');
  if (workflow.steps.length === 0) throw new Error('No steps');
  // ...validation logic
}

function prepareExecutionContext(workflow: Workflow): ExecutionContext {
  return { userId: workflow.owner, timestamp: Date.now() };
}

async function processWorkflow(workflow: Workflow) {
  validateWorkflow(workflow);
  const context = prepareExecutionContext(workflow);
  const steps = workflow.steps.map(s => ({ ...s, context }));
  await executeSteps(steps, executor);
}
```

#### 3b. Improve Type Definitions

```typescript
// BEFORE
function createUser(name: string, email: string, role: string) {
  return { name, email, role };
}

// AFTER
type UserRole = 'admin' | 'editor' | 'viewer';

interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
}

function createUser(input: CreateUserInput): User {
  return { ...input, id: generateId() };
}
```

#### 3c. Eliminate Duplication

```typescript
// BEFORE
const formatUserDisplay = (user: User) => `${user.name} <${user.email}>`;
const formatAdminDisplay = (admin: Admin) => `${admin.name} <${admin.email}> [Admin]`;

// AFTER
type Displayable = { name: string; email: string };

function formatDisplay(entity: Displayable, role?: string): string {
  const base = `${entity.name} <${entity.email}>`;
  return role ? `${base} [${role}]` : base;
}
```

#### 3d. Early Returns and Guard Clauses

```typescript
// BEFORE
function processApproval(approval: Approval) {
  if (approval.status !== 'pending') {
    if (approval.status === 'approved') {
      if (approval.approver) {
        // ...deep nesting
      }
    }
  }
}

// AFTER
function processApproval(approval: Approval) {
  if (approval.status !== 'pending') return;
  if (!approval.approver) return;

  // Main logic (flat structure)
}
```

### 4. Update Tests

Update tests alongside the refactoring:
- Improve test readability
- Add tests for newly exported functions
- Clean up mocks

### 5. Post-Refactoring Verification

```bash
# Confirm tests pass
pnpm test

# Confirm type checks pass
pnpm typecheck

# Confirm lint passes
pnpm lint
```

## TypeScript-Specific Refactoring

### Leverage Utility Types

```typescript
// BEFORE
type UserInput = {
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

type UserUpdate = {
  name?: string;
  email?: string;
  role?: string;
};

// AFTER
type UserInput = {
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

// Derived from existing type
type UserUpdate = Partial<Omit<UserInput, 'createdAt'>>;
```

### Generalize with Generics

```typescript
// BEFORE
function getActiveUsers(users: User[]): User[] {
  return users.filter(u => u.status === 'active');
}

function getActiveWorkflows(workflows: Workflow[]): Workflow[] {
  return workflows.filter(w => w.status === 'active');
}

// AFTER
interface Activatable {
  status: 'active' | 'inactive' | 'archived';
}

function getActive<T extends Activatable>(items: T[]): T[] {
  return items.filter(item => item.status === 'active');
}
```

### Improve Discriminated Unions

```typescript
// BEFORE
type Result = {
  success: boolean;
  data?: any;
  error?: string;
};

// AFTER
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

## Respecting Package Boundaries

### What You Must NOT Do

```typescript
// Directly depending on @aegis/security's internal implementation from @aegis/ai-engine
import { internalPIIDetector } from '@aegis/security/src/internal/pii-detector';
// ↑ Never import internal paths
```

### Correct Dependencies

```typescript
// Use only public APIs
import { detectPII } from '@aegis/security';

// Reference via workspace:*
// package.json: { "dependencies": { "@aegis/security": "workspace:*" } }
```

### Sharing Types Across Packages

```typescript
// Define shared types in @aegis/shared
// packages/@aegis/shared/src/types/workflow.ts

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

// Import from other packages
import type { Workflow } from '@aegis/shared';
```

## Refactoring Completion Checklist

- [ ] All tests pass
- [ ] Type checks pass
- [ ] Lint passes
- [ ] Package boundaries are not violated
- [ ] No new `any` types introduced
- [ ] No breaking changes to public API (update version if applicable)
- [ ] Check if README or documentation needs updating
