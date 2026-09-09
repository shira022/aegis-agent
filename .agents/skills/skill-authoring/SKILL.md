---
name: skill-authoring
description: "Autonomously create and modify agent skills from reusable patterns. Use when a task pattern repeats 3+ times or a new domain emerges."
tags: [skill, meta, learning, agentskills]
category: development
---

# skill-authoring

A meta-skill for autonomously creating and modifying agent skills.
Leverages Hermes Agent's skill creation patterns to generate project-specific skills autonomously.

## Trigger Conditions

- When the same task pattern has been executed 3 or more times
- When starting work in a new domain or technology area
- When an existing skill is found to have incorrect or missing steps
- When a review reveals a better approach exists

## Skill Creation Procedure

### 1. Identify the Pattern

```
// Am I repeating the same operation?
// Example: manually running pnpm test → typecheck → build every time
// → worth adding as a build-and-test skill
```

### 2. Skill Format (agentskills.io compliant)

```yaml
---
name: <skill-name>           # lowercase with hyphens, max 64 characters
description: "<trigger>"     # 57 chars max. "Use when <condition>. <one-line behavior>."
tags: [tag1, tag2]           # searchable tags
category: <development|documentation|security>
---
# <skill-name>

<markdown body>
```

### 3. Required Sections

1. **Trigger Conditions** — when to read this skill
2. **Execution Steps** — step-by-step (with commands)
3. **Examples** — concrete input/output examples
4. **Pitfalls** — common mistakes and notes

### 4. File Structure

```
.agents/skills/<skill-name>/
├── SKILL.md              ← required (skill body)
└── references/           ← optional (supplementary materials)
    └── api.md
```

## Skill Modification Procedure

1. **Always read the existing skill first** — check the current state with `skill_view` or `read_file`
2. **Identify the target** — extract the exact `old_string` for the section to be modified
3. **Apply the patch** — make minimal changes with the `patch` tool
4. **Verify** — confirm the modified skill loads correctly

## Skill Verification Checklist

- [ ] YAML frontmatter contains `name`, `description`, `tags`, `category`
- [ ] `description` is 57 characters or fewer and starts with `Use when`
- [ ] Execution steps include concrete commands
- [ ] Error paths and pitfalls are documented
- [ ] No duplication with existing skills

## Tag Conventions

| Category | Examples |
|----------|-----|
| development | build, test, typecheck, monorepo, tdd, refactor |
| documentation | adr, readme, spec, changelog |
| security | audit, secret, pii, ssrf |

## Autonomous Skill Evolution

1. **After completing a complex task** — refer to the self-improvement skill
2. **Discover a pattern** — record it when the same operation repeats 3 or more times
3. **Create a skill** — write a SKILL.md following the procedure above
4. **Verify** — try it on the next occurrence of the task
5. **Improve** — apply patches if issues are found
