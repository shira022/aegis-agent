# ADR-006: Frontend–Backend IPC Contract

## Status

Accepted

## Context

The desktop app is a React frontend (ADR-005) inside a Tauri v2 shell (ADR-001)
that must call native capabilities: recording state, screenshots, python
process execution, AI generation and credential storage.

Three constraints shaped the design:

- The Rust backend did not exist at the time of this decision: every module
  directory was an empty placeholder and `invoke()` calls from `@aegis/recorder`
  could only fail at runtime.
- The UI must stay verifiable in a plain browser (`pnpm dev` → Vite) because a
  full Tauri build requires a Windows/macOS toolchain and a desktop session.
  Components that hard-depend on Tauri cannot be developed or tested that way.
- Command names and payload shapes cross a language boundary, so drift between
  the TypeScript caller and the Rust handler is a silent, runtime-only failure.

## Decision

Define a single `DesktopApi` interface in `apps/desktop/src/ipc` and provide two
implementations:

1. **Tauri adapter** — calls the Rust commands. The `invoke` function is
   *injected* rather than imported, so tests can drive the adapter without a
   Tauri runtime, and the browser bundle never imports `@tauri-apps/api`.
2. **Mock adapter** — an in-memory implementation with realistic demo data, used
   whenever `isTauri()` is false.

The adapter is resolved lazily at call time, and the contract is the command
name plus its camelCase DTO (`#[serde(rename_all = "camelCase")]` on the Rust
side). All commands are registered in one `generate_handler![]` in `lib.rs`.

`tauri.conf.json` sets `withGlobalTauri: true` because the bridge reads the
injected global instead of bundling the `@tauri-apps/api` package; this avoids
adding a runtime dependency and keeps the mock/Tauri switch a single check.

## Consequences

**Positive:**

- The UI is fully developable, testable and screenshot-verifiable in a browser;
  the desktop app and the browser preview share one implementation.
- Store/hook/adapter tests run in jsdom with a fake `invoke`, so they assert the
  exact payload sent to Rust. No native toolchain needed for the test suite.
- One interface means adding a capability is a two-place change (interface +
  adapter), not a scattered search for `invoke` calls.
- `invoke` is injectable, so the failure paths (rejected promise, malformed
  response) are unit-testable.

**Negative:**

- Two implementations must stay behaviourally aligned; the mock can drift from
  the Rust semantics.
- The TS/Rust contract is enforced only by convention and tests, not by the
  compiler. A rename on one side fails at runtime — mitigated by keeping the
  names in one adapter file and by tests asserting the command names.
- `withGlobalTauri` exposes the IPC surface on `window`, which widens what any
  injected script can reach inside the webview; a strict CSP and a
  least-privilege capability (`core:default` only, no shell permissions)
  are therefore mandatory, not optional.
- Browser-mode behaviour differs from the packaged app by design; the mock path
  must never be mistaken for a working native integration.

## Alternatives Considered

- **Import `@tauri-apps/api` directly in components** — rejected: every consumer
  becomes Tauri-dependent, browser verification dies, and tests need a Tauri
  runtime.
- **Feature-detect per call site** (`if (window.__TAURI__)`) — rejected:
  duplicated branching, untestable, and it spreads the contract across the UI.
- **Generate TypeScript types from the Rust commands (e.g. tauri-specta)** —
  attractive for compile-time contract safety, deferred: it adds a codegen step
  and a build-order dependency that is not yet justified at this size.
- **A sidecar/HTTP bridge instead of IPC** — rejected: heavier process
  management, loses the Tauri permission model, and contradicts ADR-001's
  in-process design.
