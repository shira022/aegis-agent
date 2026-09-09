---
name: code-review
description: Review PRs and code changes against Aegis quality standards. Use before merging or during code review.
tags: [review, quality, security, pr]
category: development
---

# code-review

Code review checklist for the Aegis project.

## Trigger Conditions

- When reviewing a PR
- When checking before merging
- When doing a self-review of your own code

## Review Checklist

### Type Safety
- [ ] No type errors in TypeScript strict mode
- [ ] No use of `any` (with justification comment if legitimately needed)
- [ ] Types from `workspace:*` references are correctly imported

### Tests
- [ ] New features and bug fixes include tests
- [ ] Tests actually fail first → then pass (GREEN guarantee)
- [ ] Edge cases and error paths are covered

### Security
- [ ] API keys and secrets are not hardcoded
- [ ] User input is sanitized
- [ ] Changes do not affect PII detection logic
- [ ] Changes do not affect SSRF protection

### Package Design
- [ ] No circular references are introduced
- [ ] Does not exceed the responsibilities of existing packages
- [ ] Proper `workspace:*` references are used

### Documentation
- [ ] Changes are documented in the PR description
- [ ] An ADR is added if there are significant design decisions

### CI
- [ ] `pnpm lint && pnpm typecheck && pnpm test` passes locally
- [ ] Build succeeds
