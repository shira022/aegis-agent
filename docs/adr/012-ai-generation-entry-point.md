# ADR-012: AI Generation Entry Point on the Review Screen

## Status

Accepted

## Context

The Rust AI client can already generate an RPA script (`ai_generate_script`) and the provider
status/keychain commands exist (`ai_provider_status`, `save_provider_key`), but no renderer code
called generation. The Code Review screen could only render whatever the approval queue already
contained, and since approvals are session-scoped and nothing could create one, the screen stayed
empty in a fresh install: the product's core loop (describe a task → let the model write the
script → review it → approve → run it) could not be started from the UI at all.

Constraints that shaped the decision:

- **Local-first models.** A primary use case is a local Ollama model that needs no API key, so the
  entry point must work with anonymous providers. Local generation is also slow (minutes on 8B-class
  hardware), so the UI cannot look frozen.
- **Credentials stay native.** Provider keys live in the OS keychain behind Rust
  (`security::load_secret`); the renderer never sees them.
- **The review domain already lives in the renderer.** `@aegis/approval` owns the safety analyzer
  that produces `safetyChecks` and `riskLevel` (exception handlers are a field of the approval
  record; nothing derives them yet, so new requests carry an empty list), and `CodeReviewPanel`
  plus the approval dialog already implement review → approve/reject.
- **ADR-006** fixes the IPC pattern: one `DesktopApi` interface with a Tauri adapter and a mock
  adapter, so the UI stays verifiable in a plain browser (ADR-007).

## Decision

1. **Generation is triggered by the renderer but executed in Rust.** The UI calls
   `DesktopApi.generateScript(...)`, which invokes the existing `ai_generate_script` command.
   Credentials never leave the OS keychain, and no CORS bridging is needed inside the WebView.
2. **A new Rust command `create_approval` inserts the generated script into the approval queue** as a
   `pending` request, so the existing panel, dialog and `decide_approval` path are reused unchanged.
   There is exactly one review UI.
3. **Safety metadata is computed in the renderer** by the existing `@aegis/approval` analyzer and
   submitted with the code, instead of re-implementing analysis in Rust. Generated code is never
   executed without an explicit human approval.
4. **The entry point lives on the existing Code Review screen** ("Generate with AI" panel) rather
   than a separate screen: describe → generate → review → approve is one workflow.
5. **Providers come from the shared registry**, including `ollama` and `openai-compatible`, so a
   local model is a first-class choice; the model name stays a free-form, provider-defaulted input.
6. **Progress is reported honestly**: elapsed time plus a live status line while generating, inline
   error messages on failure, and a stale-response guard so a late result cannot overwrite a newer
   run.

## Consequences

- The review screen becomes self-sufficient: the core loop can be started, completed and verified
  from the UI, and the generated script immediately enters the queue the operator already knows.
- No credential duplication and no second AI path: Rust remains the only code that talks to
  providers.
- Both adapters keep the browser-only development path working, so the flow can be exercised without
  a Tauri build (ADR-007).
- **Accepted downside:** `safetyChecks`/`riskLevel` are client-computed and therefore not
  tamper-proof. This is acceptable for a local single-user desktop app where the human reviewer is
  the decision maker; it must be revisited if the renderer ever becomes remote.
- **Accepted downside:** approvals remain session-scoped, so generated requests disappear on restart.
- **Accepted downside:** the task link of a generated request is optional, so a request may carry an
  empty task id.

Related to ADR-006 (frontend–backend IPC contract) and ADR-007 (mock-first seams).
