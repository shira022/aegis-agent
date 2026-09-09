---
name: pr-workflow
description: Pull request workflow — branching, commits, verification, and PR creation for the Aegis monorepo. Use when creating or preparing a PR.
tags: [pr, git, workflow, conventional-commits, branching]
category: development
---

# pr-workflow

Pull Request workflow for the Aegis monorepo.
**Branch → Commit → Verify → Create PR** — the complete sequence.

## Trigger Conditions

- When creating a Pull Request
- When merging changes into `develop`
- When creating a branch before starting work

## Branch Strategy

| Branch Type | Naming Convention | Purpose | Merge Target |
|-------------|-------------------|---------|--------------|
| feature | `feature/<descriptive-name>` | New feature development | `develop` |
| fix | `fix/<issue-number>-<short-desc>` | Bug fixes | `develop` |
| docs | `docs/<topic>` | Documentation updates | `develop` |
| refactor | `refactor/<scope>-<what>` | Refactoring | `develop` |
| chore | `chore/<task>` | Maintenance (dependency updates, CI adjustments, etc.) | `develop` |

**Naming Rules**:
- kebab-case (lowercase, hyphen-separated)
- Short and specific (e.g., `feature/audio-recorder`, `fix/race-condition`)
- Include issue numbers when available (e.g., `fix/42-timeout-on-large-workflow`)

## Execution Steps

### 1. Create a Branch

```bash
# Sync develop with remote
git checkout develop
git pull origin develop

# Create a new branch
git checkout -b feature/my-new-feature
```

### 2. Work and Commit

#### Commit Message Rules (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

| Type | Purpose | Example |
|------|---------|---------|
| feat | New feature | `feat(ai-engine): add streaming response support` |
| fix | Bug fix | `fix(executor): handle timeout on long workflows` |
| docs | Documentation | `docs(readme): add architecture overview` |
| style | Code style (no logic changes) | `style(ui): format button components` |
| refactor | Refactoring (no feature additions or fixes) | `refactor(shared): extract common types` |
| test | Adding or fixing tests | `test(security): add PII detection edge cases` |
| chore | Maintenance | `chore(deps): update vitest to v2` |
| ci | CI/CD configuration | `ci(github): add security audit workflow` |

**Scope** (optional but recommended):
- Package names: `ai-engine`, `executor`, `security`, `ui`, `shared`
- App names: `desktop`
- Configuration: `config`, `ci`, `deps`

**Examples**:
```bash
git commit -m "feat(recorder): add CSS selector generation for shadow DOM"
git commit -m "fix(security): prevent PII leak in error messages"
git commit -m "test(approval): cover all approval flow transitions"
```

### 3. Commit Strategy During Work

- **Small commits**: One commit per logical change
- **Intentionally red**: It's OK if tests are red mid-way (annotate in the commit message)
- **Rebase to tidy up**: Rebase before creating the PR to clean up commit history

```bash
# Rebase onto latest develop
git fetch origin
git rebase origin/develop

# Interactive rebase (if needed)
git rebase -i HEAD~3
```

### 4. Pre-PR Verification

```bash
# 1. Install dependencies
pnpm install

# 2. Lint
pnpm lint

# 3. Type check
pnpm typecheck

# 4. Test
pnpm test

# 5. Build
pnpm build
```

**Verify only changed packages**:
```bash
cd packages/@aegis/<changed-package>
pnpm test
pnpm typecheck
```

**Full CI-equivalent check**:
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### 5. Create the PR

```bash
# Push the branch
git push origin feature/my-new-feature

# Create PR (GitHub CLI)
gh pr create \
  --base develop \
  --title "feat(ai-engine): add streaming response support" \
  --body-file .github/pr-template.md
```

**PR Body Template**:
```markdown
## Summary

<!-- What changed and why -->

## Changes

- [ ] Change 1
- [ ] Change 2

## Testing

<!-- How it was tested, including new tests if applicable -->

## Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Verified locally

## Related Issues

Closes #<issue-number>
```

### 6. Post-Creation Follow-Up

- If CI fails, reproduce locally and fix
- Address review comments
- Rebase and force push if necessary

```bash
# Push after addressing review
git add .
git commit -m "fix(address review): resolve type safety issue"
git push origin feature/my-new-feature
```

## Parallel Development with Worktrees

When developing multiple features in parallel:

```bash
# First feature
git worktree add ../worktree-feature-a feature/a

# Second feature
git worktree add ../worktree-feature-b feature/b

# Work in each worktree
cd ../worktree-feature-a
pnpm install
pnpm test

cd ../worktree-feature-b
pnpm install
pnpm test

# After completion, remove worktrees
git worktree remove ../worktree-feature-a
git worktree remove ../worktree-feature-b
```

## Merge Strategy

| Scenario | Recommended Action |
|----------|-------------------|
| No conflicts | Squash merge or merge commit |
| Conflicts | Rebase locally → resolve → force push |
| Large-scale refactoring | Rebase onto `develop` first |

**Merge Methods**:
- **Squash merge** (recommended): Combines the entire PR into a single commit before merging
- **Merge commit**: Merges while keeping all individual commits
- **Rebase**: Rebases individual commits onto the tip of `develop`

## Verification Checklist

Before creating the PR, ensure all of the following pass:

- [ ] `pnpm lint` — no lint errors
- [ ] `pnpm typecheck` — no TypeScript type errors
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm build` — build succeeds
- [ ] Code review completed
- [ ] Commit history is tidy
- [ ] PR body describes the changes

## Important Notes

- Direct merges to `main` are prohibited (PRs required)
- Merges without code review are prohibited
- Do not merge PRs where CI is failing
- Consider splitting large PRs (500+ lines)
- Security-related changes require running the `security-audit` skill
