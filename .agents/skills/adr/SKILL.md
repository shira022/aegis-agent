---
name: adr
description: Record Architecture Decision Records for significant design choices. Use when making non-trivial architectural decisions.
tags: [adr, architecture, decision, documentation]
category: documentation
---

# adr

Procedure for creating Architecture Decision Records (ADRs) for the Aegis project.

## Trigger Conditions

- When making a new technology choice
- When changing an architectural pattern
- When reversing an existing decision

## Procedure

1. **Create an ADR following the template**
   ```bash
   ls docs/adr/ | tail -1  # Check the latest number
   ```

2. **File name**: `docs/adr/<NNN>-<short-title>.md`

3. **Format**:
   ```markdown
   # ADR-<NNN>: <title>

   ## Status
   Proposed | Accepted | Deprecated | Superseded by ADR-XXX

   ## Context
   Why this decision is needed. Background and challenges.

   ## Decision
   What is being decided.

   ## Consequences
   ### Positive
   - ...

   ### Negative
   - ...

   ## Alternatives Considered
   - ...
   ```

4. **Required fields**
   - Status (state of the decision)
   - Context (background)
   - Decision (what was decided)
   - Consequences (impact)

## Existing ADRs

- ADR-001: Tauri Desktop Framework
- ADR-002: NPM Distribution
- ADR-003: Python Subprocess Execution
- ADR-004: pnpm Monorepo
- ADR-005: React TypeScript Frontend
- ADR-006: Frontend–Backend IPC Contract
- ADR-007: Mock-First Seams for AI Generation and Credential Storage
