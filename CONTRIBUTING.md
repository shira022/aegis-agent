# Contributing to Aegis Agent

Thank you for your interest in contributing! This document covers the development workflow, PR process, and code standards.


## English-Only Policy

All human-readable text in this repository **must be written in English**. This includes:

- **Documentation** (README, CONTRIBUTING, spec docs, ADRs)
- **Code comments** (inline, block, JSDoc/TSDoc, docstrings)
- **User-facing strings** (UI labels, error messages, toast notifications, log messages)
- **Test descriptions and test data** (describe/it blocks, fixture names, assertion messages)
- **Commit messages and PR titles**

### Why

This is an open-source project with a global contributor base. Non-English text creates barriers for non-native speakers and erodes consistency. Even a single non-English string in an otherwise English codebase looks accidental.

### Exceptions

The only acceptable use of non-Latin script is:

- **Regex patterns that detect non-Latin text** (e.g., PII detection for Japanese names/addresses in `pii-patterns.ts`) — the pattern itself stays in the target language, but all surrounding code and comments must be English.
- **Third-party vendored code** that cannot be modified.

### Enforcement

- Run `bash scripts/check-no-japanese.sh` locally before pushing.
- CI runs this check automatically on every PR.
- During PR review, flag any non-English text as a blocking comment.

## Development Setup

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (this project uses pnpm workspaces)
- **Rust** ≥ 1.75 (for the Tauri backend)
- **Python** ≥ 3.10 (for RPA script execution)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/shira022/aegis-agent.git
cd aegis-agent

# Install dependencies
pnpm install

# Start development
pnpm dev
```

### Pre-commit Hook

The repository includes a pre-commit hook (`scripts/pre-commit.sh`) that runs automatically on `pnpm install` via the `prepare` script. It checks:

- TypeScript type checking for changed packages
- Tests for changed packages
- Potential hardcoded secrets

To install manually:

```bash
cp scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Branch Workflow

### GitFlow Branch Model

This project follows a **3-branch GitFlow** strategy:

| Branch | Purpose | Push Policy | Merge Target |
|--------|---------|-------------|--------------|
| `main` | Stable releases only | **Protected** — no direct push | — (only accepts PR from `develop`) |
| `develop` | Active development | Open — direct push or PR merge from feature branches | — (integration branch) |
| `feature/<name>`, `fix/<name>`, `docs/<name>`, `refactor/<name>`, `chore/<name>` | Isolated work | Open — push your own branch | → `develop` |

```
main                          ← stable releases only, PR from develop only
  └── develop                 ← active development, PR target for features
        ├── feature/<name>    ← new features
        ├── fix/<name>        ← bug fixes
        ├── docs/<name>       ← documentation changes
        ├── refactor/<name>   ← code refactoring
        └── chore/<name>      ← build, deps, tooling
```

### Branch Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<short-description>` | `feature/audio-recorder` |
| Bug fix | `fix/<short-description>` | `fix/race-condition-start` |
| Documentation | `docs/<short-description>` | `docs/api-reference` |
| Refactor | `refactor/<short-description>` | `refactor/extract-core-module` |
| Chore | `chore/<short-description>` | `chore/upgrade-tauri-v2` |

Use lowercase kebab-case for branch names. Keep descriptions concise (2–4 words).

### Creating a Branch

Always branch from `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature
```

### Making Changes

1. **Write tests first** (TDD) — add or update tests in the relevant package's `__tests__/` directory
2. **Implement the change** — make your code changes
3. **Run checks locally** before pushing:

```bash
# Type check
pnpm typecheck

# Run tests
pnpm test

# Full CI check
pnpm ci
```

4. **Commit** with a clear message following [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(recorder): add CSS selector generation
fix(security): handle nested PII patterns
test(ai-engine): add prompt builder edge cases
docs: update ADR for selector strategy
```

### Submitting a Pull Request

1. Push your branch: `git push origin feature/my-new-feature`
2. Open a PR against `develop` (not `main`)
3. Fill in the PR description:
   - **What** does this PR do?
   - **Why** is this change needed?
   - **How** was this tested?
4. Ensure CI passes (lint, typecheck, test, build, security)
5. Request a review from at least one maintainer

### PR Review Checklist

- [ ] CI passes (all green)
- [ ] Tests cover the new/changed behavior
- [ ] TypeScript types are correct (no `any` unless justified)
- [ ] No hardcoded secrets or credentials
- [ ] Documentation updated if public API changed
- [ ] ADR created for architectural decisions

## Testing

### Test Framework

All packages use **Vitest** with the following conventions:

- Test files: `src/__tests__/<name>.test.ts` or `*.spec.ts`
- Test globals enabled (`describe`, `it`, `expect` available without imports)
- Coverage via `v8` provider

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in a specific package
cd packages/@aegis/ai-engine && npx vitest run

# Run tests in watch mode
cd packages/@aegis/recorder && npx vitest
```

### Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Branches | 70% |
| Functions | 80% |
| Statements | 80% |

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('MyModule', () => {
  it('should handle basic case', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow('Invalid input');
  });
});
```

## Code Style

### TypeScript

- Use **strict TypeScript** — no `any` unless absolutely necessary
- Prefer explicit types over inference where it improves readability
- Use `interface` for object shapes, `type` for unions/intersections
- Export types from a dedicated `types.ts` file

### File Structure

```
packages/@aegis/<package>/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts          # Public API exports
    ├── types.ts          # Type definitions
    ├── <module>.ts       # Implementation files
    └── __tests__/
        └── <module>.test.ts
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `prompt-builder.ts`)
- **Types/Interfaces**: `PascalCase` (e.g., `RecorderConfig`)
- **Functions**: `camelCase` (e.g., `buildPrompt`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)

### Imports

Use workspace protocol for internal packages:

```typescript
import { sharedUtil } from '@aegis/shared';
import { buildPrompt } from '@aegis/ai-engine';
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `chore` | Build process, dependencies, or tooling changes |
| `ci` | CI/CD configuration changes |

### Scopes

- `desktop` — Tauri desktop app
- `ai-engine` — AI code generation
- `recorder` — Desktop action recorder
- `security` — PII masking and security
- `shared` — Shared utilities and types
- `ui` — Shared React components

## Questions?

Open a [GitHub Discussion](https://github.com/shira022/aegis-agent/discussions) for questions about contributing.
