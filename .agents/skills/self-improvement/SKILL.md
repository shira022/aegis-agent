---
name: self-improvement
description: "Extract learnings after complex tasks and suggest skill/ADR updates. Use after completing non-trivial work."
tags: [learning, improvement, adr, retrospective]
category: development
---

# self-improvement

A skill that autonomously extracts learnings after task completion and proposes updates to skills or ADRs.

## Trigger Conditions

- When completing a complex task (3 or more steps)
- When a problem is resolved (root cause identified and fix applied)
- When a design decision is made (technology selection, architecture change)
- When a review identifies areas for improvement

## Execution Steps

### 1. Extracting Learnings

Review the completed task against the following:

```
□ What went well?
□ What was problematic?
□ What would you do differently next time?
□ What new knowledge was gained (APIs, patterns, tools)?
□ Were there any pitfalls?
```

### 2. Saving Learning Records

Save to the `learnings/` directory with a date prefix:

```bash
# Filename: learnings/YYYY-MM-DD-<topic>.md
# Example: learnings/2026-09-09-monorepo-typecheck-workaround.md
```

Format:
```markdown
# <topic>

## Date
2026-09-09

## Context
<what you were doing>

## Learnings
<concrete discoveries>

## Actions
- [ ] <improvement action>
```

### 3. ADR Trigger Detection

An ADR is required in the following cases:

- A technology choice was made (e.g., chose B over A)
- A change was made that breaks an existing pattern
- A security-related decision was made
- A performance vs. readability trade-off was decided

→ Refer to the `adr` skill and record in `docs/adr/`

### 4. Skill Update Proposal

Consider a skill patch in the following cases:

- The skill's procedure was incorrect
- A better approach was discovered
- A new error pattern was identified
- A step was missing from the skill

→ Refer to the `skill-authoring` skill and apply a patch

### 5. Verification Loop

After reflecting learnings:

1. **Verify the fix is correct** — run tests, confirm build passes
2. **Check for side effects** — assess impact on related skills and code
3. **Try it on the next task** — apply it in practice

## Known Learning Patterns

### Example Pitfall Records

| Pattern | Mitigation |
|----------|------|
| `pnpm install` followed by pre-commit failure in a worktree | Install dependencies first |
| Temporary use of `any` type | Allow with a comment, leave a TODO |
| Skills included in CI `paths-ignore` | CI won't run on skill changes (by design) |

## Autonomous Cycle

```
Task Execution → Learning Extraction → Skill/ADR Update → Verification → Next Task
     ↑                                                       |
     └───────────────────────────────────────────────────────┘
```
