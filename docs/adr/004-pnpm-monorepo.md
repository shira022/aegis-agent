# ADR-004: pnpm Monorepo

## Status

Accepted

## Context

Aegis Agent is structured as a monorepo containing multiple packages: the Tauri desktop app, shared types, engine modules, and scripts. We need a workspace management strategy that handles dependency hoisting, build caching, and package inter-dependencies efficiently.

Key constraints:
- Multiple packages share TypeScript types and utility functions
- The Tauri app, engine modules, and scripts are developed in the same repository
- Build times should be minimized through caching
- The setup should be familiar to contributors with modern JS tooling experience
- Consistency with the DeskSpawn project's established approach

Alternatives considered:
- **npm workspaces** — slower install times, no built-in build caching
- **Yarn workspaces** — better than npm but PnP mode adds complexity; Yarn Berry's adoption is polarizing
- **Lerna** — adds a dependency layer on top of npm/yarn; largely superseded by native workspace tooling

## Decision

Use **pnpm workspaces** with **Turborepo** for monorepo management.

- `pnpm-workspace.yaml` defines workspace packages (`apps/*`, `packages/*`, `engines/*`)
- Turborepo provides build caching, parallel task execution, and dependency-aware task ordering
- Shared `tsconfig.json` at the root with per-package overrides
- Dependencies are hoisted to the root `node_modules` but hardlinked per-package (pnlop's content-addressable store)

## Consequences

**Positive:**
- Fast installs: pnpm's content-addressable store eliminates duplicate downloads
- Turborepo caches builds — unchanged packages skip rebuilds on CI and locally
- Strict dependency resolution: pnpm doesn't allow phantom dependencies (packages can only import what they declare)
- Shared types and utilities are referenced as workspace dependencies — type-safe cross-package imports
- Consistent with DeskSpawn's proven monorepo structure

**Negative:**
- pnpm is a new dependency for contributors accustomed to npm/yarn
- Turborepo requires a `turbo.json` pipeline configuration that must be maintained as packages are added/removed
- Content-addressable store means symlinks in `node_modules` — some older tools may not handle symlinks correctly (rare)

**Trade-offs accepted:**
- We accept the pnpm adoption cost in exchange for faster CI pipelines and stricter dependency hygiene
- Turborepo's caching complexity is justified by the monorepo's multi-package build requirements
