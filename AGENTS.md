# Aegis Agent — AI-Powered RPA Desktop App

This repository is the monorepo for **Aegis Agent** (pnpm + Turborepo).
We are building an AI-driven RPA desktop application for non-engineers.

## Project Structure

```
aegis-agent/
├── apps/desktop/          <- Tauri v2 desktop app (React + TypeScript)
├── packages/@aegis/
│   ├── shared/            <- Shared types and utilities
│   ├── ai-engine/         <- Vercel AI SDK v6 based AI inference engine
│   ├── executor/          <- RPA script execution engine
│   ├── approval/          <- HITL approval flow
│   ├── hitl/              <- Human-in-the-loop management
│   ├── healer/            <- Self-healing logic
│   ├── recorder/          <- Action recording and CSS selector generation
│   ├── security/          <- PII detection and SSRF protection
│   └── ui/                <- Shared UI components
├── engines/python-runtime <- Python subprocess execution runtime
├── docs/                  <- Specs and ADRs
└── learnings/             <- Development learnings
```

## Branch Strategy (Git Flow)

| Branch | Purpose | Merge Target |
|----------|------|----------|
| `main` | Release only (PR required) | — |
| `develop` | Dev integration branch | `main` (PR) |
| `feature/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*` | Isolated work | `develop` (PR) |

- Branch naming: kebab-case (`feature/audio-recorder`, `fix/race-condition`)
- Commits: [Conventional Commits](https://www.conventionalcommits.org/)(`feat:`, `fix:`, `docs:` etc.)
- PRs target `develop`. Direct merges to `main` are prohibited.

## Build and Test Commands

```bash
pnpm install           # Install dependencies
pnpm dev               # Start dev server (Turborepo parallel)
pnpm build             # Build all packages
pnpm test              # Run all tests
pnpm lint              # Lint
pnpm typecheck         # TypeScript type check
```

Individual package operations:
```bash
cd packages/@aegis/ai-engine && pnpm test
cd apps/desktop && pnpm typecheck
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs automatically:
- **Lint & Type Check** → pnpm lint + tsc --noEmit
- **Test** → vitest(with coverage)
- **Build** -> turbo build + dist check
- **Security Audit** → pnpm audit + TruffleHog

## Rules

- **Type Safety**: strict TypeScript. `any` usage is prohibited by default.
- **Tests Required**: new features and bug fixes must include tests.
- **Security**: never commit secrets (API keys, etc.) — use `.env` or OS keychain.
- **Shared UI**: consolidate in `@aegis/ui`. Common parts between Web/Desktop stay as shared code.
- **AI SDK**: use Vercel AI SDK v6 (`ai@6.x`, `@ai-sdk/*@3.x`). v4/v5 are incompatible.
- **Cross-package References**: use `workspace:*`. Circular dependencies are prohibited.

## Development Notes

- Tauri builds require Rust Toolchain + Windows SDK (on the host).
- Python subprocesses run via `engines/python-runtime`.
- Model provider settings are stored in the OS keychain (`.env` is not recommended)

## Autonomous Agent Workflow

### Skill Loading
- **Always load relevant skills first** before starting work. Skills live in `.agents/skills/` and encode domain-specific procedures.
- At minimum, load `build-and-test` before any verification task and `code-review` before PRs.
- If a skill is missing steps or has wrong commands, update it via `skill_manage(action='patch')` before finishing.

### Self-Improvement Loop
1. Execute task → encounter friction → identify root cause
2. If the pattern recurs (3+ times), extract it into a new skill via `skill_crafter`
3. After complex tasks, run `knowledge-harvest` to extract structured learnings
4. Record significant architectural decisions as ADRs via the `adr` skill

### ADR Creation Triggers
Create an ADR (using `.agents/skills/adr`) when:
- Introducing a new technology choice or framework
- Changing an established architectural pattern
- Reversing a previous decision
- The decision affects multiple packages or the overall system architecture

### Verification Loops
1. **Local first**: `pnpm typecheck && pnpm test && pnpm lint` on changed packages
2. **Hook-driven**: Git hooks (`pre-commit`, `post-commit`) validate incrementally
3. **PR gate**: CI runs full build + security audit before merge to `develop`
4. **Post-merge**: Verify `develop` builds cleanly; fix regressions immediately

## Skills Overview

| Skill | When to Use |
|-------|-------------|
| `adr` | Recording Architecture Decision Records for non-trivial design choices |
| `build-and-test` | Running builds, tests, type-checks — pre-PR verification |
| `code-review` | PR review, pre-merge quality gate, self-review before push |
| `new-package` | Scaffolding a new `@aegis/*` package in the monorepo |
| `security-audit` | Auditing for PII leaks, SSRF, secrets, command injection — before releases |

## Agent Delegation Patterns

### Use `delegate_task` when:
- The task decomposes into 2+ **independent** subtasks (e.g., audit package A and package B in parallel)
- A subtask is **reasoning-heavy** and would flood the context (e.g., full code review across 5 packages)
- You need to **compare or synthesize** results from multiple parallel investigations

### Do NOT delegate when:
- The work is **single-step mechanical** (run a command, read a file)
- It can be completed in 1–2 tool calls
- The task requires **user interaction** (subagents cannot ask questions)

### Worktree Conventions for Parallel Work
- Use `git worktree` branches for isolated parallel features (`worktree-parallel-dev` skill)
- Each worktree gets its own branch — never share uncommitted state across worktrees
- Run `pnpm install` in each worktree before building
- After parallel work merges, run a full `pnpm build` on `develop` to verify integration

### Delegation Hierarchy
- **Orchestrator role** (`role='orchestrator'`): spawns further sub-decompositions (depth ≤ 3)
- **Leaf role** (default): executes focused tasks and returns results
- Always pass **full context** to subagents — they have no shared history with you
- Verify subagent results yourself before claiming success to the user
