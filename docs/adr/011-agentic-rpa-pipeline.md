# ADR-011: Agentic RPA Pipeline - Canonical Flow and Stage Contracts

## Status

Proposed

## Context

The product specification states the core promise in one line:

> AI creates programs (RPA) for you, and only human-approved code runs safely.
> (`docs/spec/README.md:3`)

The same document requires that every execution be gated on human approval
(`docs/spec/README.md:25`) and describes the Review (Approve) stage as
"AI generates deterministic Python scripts with pre-defined exception handlers;
locked after user approval" (`docs/spec/README.md:19`). The spec's own status
table already admits the gap: the desktop app is "Partially implemented - ...
AI generation and the OS keychain are deterministic mocks"
(`docs/spec/README.md:68`).

The code confirms this. Every building block of the pipeline exists in
isolation, but no path connects them, so the promise does not exist as a user
experience. Concretely:

- **Generation is unreachable from the UI.** `ai_client` performs real HTTP
  calls to the configured provider (`apps/desktop/src-tauri/src/ai_client/mod.rs:1-9`,
  `:159-182`) and strips markdown fences before returning
  (`ai_client/mod.rs:178`). The command `ai_generate_script` is implemented and
  registered (`ai_client/mod.rs:188-195`, `apps/desktop/src-tauri/src/lib.rs:47`),
  but no TypeScript code calls it: `apps/desktop/src/ipc/tauri-adapter.ts`
  (93 lines, 20 adapter methods) has no generation method, and a repository-wide
  search for `ai_generate_script` / `aiGenerateScript` outside Rust returns
  nothing.
- **No approval request is ever produced.** `list_approvals` simply clones the
  store (`apps/desktop/src-tauri/src/tasks/mod.rs:131-133`), and
  `start_run_in` (`apps/desktop/src-tauri/src/tasks/state.rs:171-205`) creates a
  `TaskRun` only. There is no non-test `approvals.push` anywhere in
  `apps/desktop/src-tauri/src`, so the review screen can only ever render the
  empty state "No pending approvals" (`packages/@aegis/ui/src/i18n/locales/en.json:138`).
- **Nothing executes a script.** `run_task` documents its own scope: it does
  **not** execute the task's script, only records a run lifecycle, and states
  that "A future execution engine is expected to transition the stored run to
  `completed` or `failed` and set `finishedAt`"
  (`apps/desktop/src-tauri/src/tasks/mod.rs:17-33`). The execution engine itself
  is implemented (`executor::run_python_script`,
  `apps/desktop/src-tauri/src/executor/mod.rs:106-265`) and registered
  (`lib.rs:45-46`), but the webview never invokes it: no TypeScript file in
  `apps/desktop/src` references `run_python_script` or `@aegis/executor`, so the
  wrapper in `packages/@aegis/executor/src/tauri-bridge.ts` is dead code from the
  app's point of view.
- **Run state only ever moves forward into `running`.** No code transitions a
  run to `RunStatus::Completed` / `RunStatus::Failed` or a task to
  `TaskStatus::Completed`, so the dashboard's success rate is always the
  placeholder dash and "last run" is derived from `task.updatedAt`, not from an
  actual execution
  (`apps/desktop/src/components/Dashboard/Dashboard.tsx:34-39`). The displayed
  number is not a measurement.
- **Credentials are not really stored.** `save_provider_key`
  (`tasks/mod.rs:172-193`) routes the raw key through `security::store_key`
  (`apps/desktop/src-tauri/src/security/mod.rs:167`), which keeps a
  non-recoverable `KeyMask` only - as its own module documentation says
  (`tasks/mod.rs:10-15`). The real persistence path,
  `security::store_api_key` (`security/mod.rs:207-222`), is registered
  (`lib.rs:50`) but the UI calls `save_provider_key` instead
  (`tauri-adapter.ts:88-89`). Because `ai_client` resolves credentials through
  `security::load_secret` (`ai_client/mod.rs:159`), a configured provider is
  lost on restart and every generation then fails with
  "provider '<id>' is not configured: no API key stored"
  (`ai_client/mod.rs:160-164`).
- **The recorder records nothing.** `recorder` returns `actions: Vec::new()`
  (`apps/desktop/src-tauri/src/recorder/mod.rs:214`) and exposes no command to
  append a captured action, so there is no operation log to build a prompt from.
  `healing.push` likewise appears only in tests.

Some prerequisites are already in place and should be reused rather than
reinvented:

- `Task.script_path` is already defined as a workspace-relative
  `scripts/<slug>.py` (`tasks/state.rs:121-129`, with the relative-path contract
  asserted at `tasks/state.rs:350-353`), and `slugify` exists
  (`tasks/state.rs:84`).
- Validity rules for generated Python already exist in the shared engine:
  blocked patterns (`packages/@aegis/ai-engine/src/validators.ts:6-28`),
  `validateSyntax` (`:32-66`), `validateNoDangerousOps` (`:70-84`) and
  `validateDeterministic` (`:102-115`), plus the safety prompt and JSON-shaped
  output contract (`packages/@aegis/ai-engine/src/prompt-builder.ts:6-17`,
  `:21-77`).
- The approval domain type, safety checks and risk model already exist
  (`packages/@aegis/approval/src/types.ts:7-42`,
  `calculateRiskLevel` at `packages/@aegis/approval/src/safety-analyzer.ts:112-125`)
  and match the Rust side (`ApprovalRequest`, `SafetyCheck`, `ApprovalState` at
  `apps/desktop/src-tauri/src/ipc/mod.rs:323-363`).

This ADR defines the canonical flow and the contract at each stage boundary so
that the vertical slice can be implemented without inventing new semantics, and
so that each stage can be completed independently by different workstreams.

## Decision

Define one canonical pipeline - **Record -> Generate -> Review -> Execute** -
and bind each transition to an explicit contract. Stages may be implemented in
any order, but a stage is only "done" when its contract holds; no stage may
simulate the next one.

### The flow

```
(1) Record      recorder captures real user actions into an OperationLog
      |            contract C1
      v
(2) Generate    generate_task_script builds a deterministic prompt from the
      |         OperationLog, calls the real provider, runs the validator gate,
      |         writes scripts/<slug>.py, and creates a pending ApprovalRequest
      |            contract C2
      v
(3) Review      the UI lists pending approvals and the human decides
      |            contract C3
      v
(4) Execute     only approved code is executed; the run records its real result
                   contract C4
```

**D1. This flow is the only supported path from an idea to a running program.**
There is no shortcut that executes code which did not pass Review, and no path
that produces a "successful" run without the executor having run something.

**D2. Only the stage that owns a piece of state may advance it.** The recorder
owns operation logs, generation owns script files and pending approvals, Review
owns the approval decision, and the executor owns run/task outcome. No stage
writes another stage's state to make the UI look complete.

**D3. Every stage reports what it actually did.** Outputs carry provenance -
whether a response came from a real provider or a mock
(`AiGenerationResponse.mocked`, `ai_client/mod.rs:46-52`), which prompt produced
the script (`prompt_hash`), and which safety checks passed. Placeholder values
stay placeholders until real data exists; they are not replaced with estimates.

**D4. Credentials live in the OS keychain, never in the app's JSON state.**
`save_provider_key` must persist the real secret through `security::store_api_key`
(`security/mod.rs:207-222`); the persisted state file must never contain key
material, and only the non-secret provider model selection may be written
(`tasks/state.rs:25-36`, `tasks/mod.rs:8-15`).

**D5. The validator gate and human approval are both mandatory.** Both are
required regardless of provider, including local models of ~8B parameters: the
gate rejects (it never repairs silently), and the human sees the exact code that
will run. Generated code is treated as untrusted input regardless of which model
produced it.

**D6. Introduce the pipeline in phases** (P0/P1/P2 below) so the product promise
becomes true end-to-end before any convenience feature is added.

### Contracts

#### C1. Record -> Generate

Generation consumes an `OperationLog` (`ipc/mod.rs:223-229`):
`{ id, taskId, steps: OperationStep[], recordedAt, source: 'browser' | 'desktop' }`,
where each step follows `StepType` / `StepTarget` (`ipc/mod.rs:187-215`).
The recorder must expose a real append path; `actions: Vec::new()`
(`recorder/mod.rs:214`) is a placeholder that violates this contract.

Generation is only defined for a log with `steps.length > 0`. An empty log is an
error the UI must show, not a prompt to guess: the safety prompt forbids
hallucinating selectors "that are not present in the operation log"
(`prompt-builder.ts:6-17`).

#### C2. Generate -> Review

A new command `generate_task_script` is the single entry point:

```ts
interface GenerateTaskScriptInput {
  taskId: string;
  provider?: string;
  model?: string;
  baseUrl?: string;
  region?: string;
  projectId?: string;
}

interface GenerateTaskScriptResult {
  request: ApprovalRequest;   // state: 'pending'
  scriptPath: string;         // workspace-relative, "scripts/<slug>.py"
  promptHash: string;
  model: string;
  mocked: boolean;
}
```

The command performs, in order:

1. Load the task's most recent `OperationLog`; reject an empty or missing log.
2. Build the prompt exactly as the shared engine does - same safety rules, same
   operation-log serialisation, same platform hint
   (`prompt-builder.ts:21-77` with `SAFETY_PROMPT` at `:6-17`). The prompt is a
   pure function of the log plus the request: no timestamps, no randomness.
3. Call the real provider through `ai_client::generate`
   (`ai_client/mod.rs:159-182`), not a mock. If the provider is not configured,
   fail with the existing explicit error (`ai_client/mod.rs:160-164`) instead of
   fabricating a script.
4. Parse tolerantly: accept either the JSON object requested by the prompt
   (`prompt-builder.ts:14`, `:71`) or a bare code block, using the existing fence
   stripping (`ai_client/mod.rs:178`). A response that cannot be parsed is an
   error, never an empty script.
5. Run the validator gate with the same semantics as the shared engine:
   `validateSyntax` (`validators.ts:32-66`), `validateNoDangerousOps` against
   `BLOCKED_PATTERNS` (`validators.ts:6-28`, `:70-84`) and `validateDeterministic`
   (`validators.ts:102-115`). A failed check does not abort the request silently:
   it is recorded as a failed `SafetyCheck` in the `ApprovalRequest`, so the
   human sees why the code is risky.
6. Write the script to the app data directory at the task's `scriptPath`
   (`tasks/state.rs:121-129`, `slugify` at `:84`) and persist it; the approval
   must reference code that actually exists on disk.
7. Construct and store the request with
   `ApprovalRequest { id, taskId, code, explanation, exceptionHandlers,
   safetyChecks, createdAt, riskLevel, state: 'pending' }`
   (`ipc/mod.rs:352-363`, `types.ts:29-42`), with `riskLevel` derived from the
   safety checks by the same thresholds as `calculateRiskLevel`
   (`safety-analyzer.ts:112-125`).

Contract rule: generation creates exactly one `pending` request per invocation
and never approves, executes or deletes anything.

#### C3. Review -> Execute

The existing commands remain the only approval mutators: `list_approvals`
(`tasks/mod.rs:131-133`) for reading and `decide_approval` (`tasks/mod.rs:136-145`
with the transition in `state.rs:208-241`) for deciding. The state machine is
unchanged: only `pending` / `reviewing` may move, to `approved` or `rejected`;
a second decision is an error (`state.rs:218-232`).

Contract rules:

- Approval state is persisted, not session-scoped. Today `approvals` is
  deliberately excluded from the on-disk shape (`DomainStore.approvals` at
  `ipc/mod.rs:433-442` versus `PersistedState` at `tasks/state.rs:25-36`,
  whose fields are version, tasks, activity, completed and provider_models). Since generation writes the script to disk, an
  approval that vanishes on restart would leave an orphaned script and a UI that
  claims nothing was ever generated, so approvals must join the persisted shape
  and `STATE_VERSION` (`tasks/state.rs:22`) must be bumped.
- Execution is permitted only for a request whose state is `approved`, and the
  code that runs is the code that was approved. After approval the script is
  treated as locked (read-only), per the Review stage definition
  (`docs/spec/README.md:19`).

#### C4. Execute -> Reporting

Execution is performed by `executor::run_python_script`
(`executor/mod.rs:106-265`), invoked from the UI through the IPC adapter.
The command returns the executor's real result (`exitCode`, `stdout`, `stderr`,
`duration`, `timedOut`), which is mapped to state:

- `TaskRun.status` moves `running -> completed | failed` and `finishedAt` is set
  from the real end time (`TaskRun` at `ipc/mod.rs:243-250`).
- `Task.status` moves to `completed | failed` (`TaskStatus` at `ipc/mod.rs:167-173`).
- The activity log receives the run record (`DomainStore.activity`,
  `ipc/mod.rs:433-442`).

Contract rule: only this stage may set a terminal outcome, and it must reflect
what the executor returned. This is the change that makes the dashboard's
success rate and last-run time measurements rather than placeholders
(`Dashboard.tsx:34-39`).

#### C5. Cross-cutting

- **Provenance.** `mocked` and `promptHash` are carried from the provider
  response into whatever the UI displays; a mocked response must never be
  presented as a real generation.
- **No secret in state.** The state file stores tasks, activity, the
  setup-completed flag and per-provider model ids only
  (`tasks/state.rs:29-36`). API keys go to the OS keychain through
  `security::store_api_key` (`security/mod.rs:207-222`).
- **Approval guard.** No execution path exists that skips C3; this preserves
  SEC-04, the human-approval guard (`docs/spec/security.md:21`).

### Phased rollout

**P0 - make the promise true end-to-end (vertical slice).**
Recorder append path (C1); `generate_task_script` with prompt builder, real
provider call, validator gate, script write and pending approval (C2); persisted
approvals (C3); execution of approved code through `executor::run_python_script`
from the UI with truthful run/task transitions and activity entries (C4); fix
`save_provider_key` to store the real secret (D4). P0 is complete when a user can
record a short flow, generate a script, approve the exact code shown, run it, and
see the real outcome - with the dashboard numbers matching the runs that happened.

**P1 - make results observable and cumulative.**
Surface `ExecutionResult` (`stdout`, `stderr`, `duration`, `timedOut`,
`exitCode`; `packages/@aegis/executor/src/types.ts:45-53`) in the run view;
compute success rate and last-run time from actual runs
(`ExecutionMetrics`, `types.ts:71-77`); surface real logs and errors; keep the
locked (read-only) state of approved scripts enforced.

**P2 - hardening and assistants.**
Self-healing events through a real `healing` write path (the healing prompt
builder already exists, `prompt-builder.ts:118+`); PII masking on every payload
that leaves the machine (`docs/spec/security.md:10`); recorder capture of
locators and screenshots with masking applied at capture time; richer
pre-execution dependency checks (the `detect_dependencies` seam already exists,
`tasks/state.rs:242`).

## Consequences

### Positive

- The product promise in `docs/spec/README.md:3` becomes an executable path
  instead of four disconnected libraries.
- The work divides cleanly along the four contracts: recorder, generation,
  approval persistence, execution wiring. Each can be built and tested
  independently, mirroring the mock-first seams of ADR-007.
- The dashboard stops displaying placeholders as if they were measurements,
  because terminal states can only be written by the executor.
- Generation is safe by construction with weak models: the deterministic gate
  plus mandatory human review are both in the path, and a rejected check is shown
  to the human rather than hidden.
- Existing conventions are reused (`scripts/<slug>.py`, the shared validator and
  prompt semantics, the existing approval state machine and risk thresholds), so
  no new vocabulary is introduced.
- Credentials actually survive a restart, which is what makes the provider
  configuration screen meaningful.

### Negative

- `PersistedState` and `STATE_VERSION` change (`tasks/state.rs:22-36`); existing
  state files need a migration or an explicit reset path.
- Approvals become durable state with a lifecycle, so a stale `pending` request
  now needs expiry handling (`expiresAt` already exists, `ipc/mod.rs:360`).
- The Rust side must reproduce validator semantics that currently live in
  TypeScript (`validators.ts`). Two implementations can drift; the accepted risk
  is mitigated by keeping the checks a small, explicitly enumerated set and by
  testing the Rust gate against the same fixtures.
- A mandatory gate means weak local models will fail generation frequently by
  design, surfacing more errors and retries to the user than a permissive
  "try anyway" path would.
- Real execution intensifies the sandbox question: the app now runs generated
  Python, so resource limits, timeouts and working-directory containment
  (`executor/mod.rs:106-265`) become load-bearing rather than latent.
- Generation latency and provider cost move into the interactive path; the AI
  call is now on the critical path of the recorded flow, not a side feature.
- More IPC surface to test: a new command plus new UI wiring, on top of the
  existing 30 registered commands (`lib.rs:37-68`).

## Alternatives Considered

- **Keep the mock-only skeleton (status quo).** The current seams all return
  deterministic mocks: no generation reaches a provider from the UI, approvals
  are never created and nothing executes. Rejected: the headline promise stays
  unimplemented while the UI (review screen, dashboard, provider setup) implies
  it works, which is worse than an explicit "not available yet".
- **Move AI generation into the TypeScript layer** (call the provider from the
  webview, or wire `@aegis/executor`'s `tauri-bridge` into the app). Rejected:
  API keys would have to live in the webview, contradicting the OS-keychain rule
  (`docs/spec/security.md:10`, `security/mod.rs:202-222`), and the Tauri CSP is
  deliberately strict (`script-src 'self'`, see ADR-008). The Rust client already
  performs the real call and strips fences correctly
  (`ai_client/mod.rs:159-182`); the missing part is a thin command, not a second
  client.
- **Let `run_task` execute immediately without an approval gate.** Rejected: it
  contradicts `docs/spec/README.md:25` and SEC-04
  (`docs/spec/security.md:21`), and would make every other safety mechanism
  decorative.
- **Skip the validator gate and rely on human review alone.** Rejected: it puts
  the entire burden of spotting `subprocess`/`eval` patterns on a person skimming
  generated code, while the deterministic checks are cheap
  (`validators.ts:6-28`) and produce the `safetyChecks` the review UI already
  renders (`CodeReviewPanel`).
- **Regenerate the script on demand instead of persisting approvals.** Rejected:
  model output is not reproducible, so the code the user approved could not be
  guaranteed to be the code that runs, and the locked-after-approval property
  (`docs/spec/README.md:19`) would be unenforceable.
- **Build a parallel execution path in TypeScript.** Rejected: it duplicates an
  engine that already exists in Rust and is registered (`lib.rs:45-46`), and
  splitting execution across two runtimes makes "only the executor advances run
  state" impossible to guarantee. The TypeScript executor package stays the
  shared, spec-level library.
