# ADR-005: React TypeScript Frontend

## Status

Accepted

## Context

Aegis Agent's desktop UI needs a frontend framework for the Tauri WebView. The UI includes a recorder view, script editor, execution dashboard, and settings panel. It must communicate with the Rust backend via Tauri's IPC layer.

Key constraints:
- The UI runs inside Tauri's WebView (WebView2 on Windows, WKWebView on macOS)
- Must integrate with Tauri's TypeScript bindings (`@tauri-apps/api`)
- Component reusability is needed across multiple views (recorder, editor, dashboard)
- Type safety is important for a codebase shared between frontend and engine packages
- Team familiarity and ecosystem maturity are priorities

Alternatives considered:
- **Svelte** — smaller bundle, but less mature Tauri integration and smaller ecosystem for component libraries
- **Vue** — strong framework, but weaker Tauri community adoption and fewer TypeScript-first component libraries
- **SolidJS** — excellent performance, but small ecosystem; team has less experience

## Decision

Use **React with TypeScript** for the frontend UI.

- React 18+ with TypeScript for type-safe component development
- Vite as the dev server and bundler (fast HMR, native ESM)
- Component library: shadcn/ui or Radix primitives for accessible, themeable UI components
- Tauri IPC calls typed via `@tauri-apps/api` with shared TypeScript types from `packages/types`

## Consequences

**Positive:**
- Largest frontend ecosystem — abundance of component libraries, tooling, and community knowledge
- First-class Tauri integration: `@tauri-apps/api` is React-friendly; community examples are abundant
- TypeScript shared types between frontend and engine packages ensure contract consistency
- React component model maps well to the UI's view-based structure (recorder, editor, dashboard)
- Team has proven experience with React + TypeScript from the DeskSpawn project

**Negative:**
- React's bundle size is larger than Svelte or SolidJS (mitigated by Vite tree-shaking and code splitting)
- React's runtime overhead is higher than compile-time frameworks (negligible for a desktop app's UI complexity)
- Need to maintain Vite + React build pipeline configuration

**Trade-offs accepted:**
- We accept React's larger runtime footprint in exchange for ecosystem maturity, team familiarity, and the widest pool of potential contributors
- Bundle size is not critical for a desktop app — WebView2/WKWebView already have a runtime
