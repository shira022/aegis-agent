# ADR-010: Real-Model End-to-End Verification

## Status

Proposed

## Context

The repository has no way to answer the question the product depends on: **can a
user get real value out of a local 8B-class model run on their own machine?**

Everything the project currently knows about AI generation comes from
deterministic mocks. The existing suite is 69 vitest test files, concentrated in
per-package `src/__tests__/` directories, and the AI generation path is exercised
by substituting the SDK call (`packages/@aegis/ai-engine/src/__tests__/generator.test.ts`
mocks `generateText`). Local base URLs appear in tests only as string fixtures,
not as live connections. A mock returns canned text, so the suite passes no
matter what the provider is, how slow it is, or whether it emits output a real
parser accepts.

The specifications already state the properties that matter, and nothing verifies
them:

- `docs/spec/ai-engine.md:31` — AI-NF01: **code generation response time
  < 30 seconds**.
- `docs/spec/ai-engine.md:32` — AI-NF02: **generated code syntax validity 100%**.

ADR-007 (`docs/adr/007-mock-first-seams.md`) deliberately chose the mock-first
seam and named the resulting gap in its own negative consequences: "The real
provider call, its error taxonomy, retry/backoff behaviour and token accounting
remain unverified; they can only be exercised with a real key"
(`docs/adr/007-mock-first-seams.md:53-54`) and "A mock can drift from the real
provider's response shape, so the adapter/DTO boundary will need re-verification
when the real client lands" (`docs/adr/007-mock-first-seams.md:57-58`). The real
client has since landed: `apps/desktop/src-tauri/src/ai_client/providers.rs`
performs real HTTP requests and `extract_text`
(`apps/desktop/src-tauri/src/ai_client/providers.rs:392-416`) parses real
response bodies. The re-verification that ADR-007 anticipated is exactly what is
missing. ADR-007's rejection of "Use a real provider key from the environment for
development" (`docs/adr/007-mock-first-seams.md:65-68`) was about an unattended
agent spending money on a non-deterministic cloud call; this ADR does not reverse
that, and keeps real-model runs out of the required CI path.

### Why this cannot be answered by reasoning alone

Manual measurement on 2026-09-14 with a local 8B-class model (`qwen3.5:9b`,
9.7B parameters, Q4_K_M) served by Ollama on the Windows host, running on CPU,
produced two opposite answers to the same question:

| Path | Result |
|------|--------|
| OpenAI-compatible `/v1/chat/completions` | empty `content`, output in a `reasoning` field, 500 tokens spent reasoning, **52 seconds** (violates AI-NF01) |
| Native `/api/chat` with `think: false` | answered in **0.5 seconds**; RPA plan JSON generated correctly in **7.8 seconds** using 60 tokens, and parsed successfully |

The same model was unusable on one path and usable on the other. The variable was
the client path, not the model's capability. That distinction is invisible to a
mock and is the reason a real-model check is needed: it is the only mechanism
that can show whether a given configuration meets AI-NF01 and produces output
that actually parses and runs.

### Current infrastructure

- No `e2e/` directory exists.
- The root `package.json` declares only `"test": "turbo test"` (`package.json:9`);
  there is no `test:e2e` script.
- `turbo.json` defines only `build`, `dev`, `test`, `test:coverage`, `lint` and
  `typecheck`. There is no E2E task.
- CI has five jobs — `lint` (`.github/workflows/ci.yml:21`), `text-locale`
  (`:46`), `test` (`:56`), `build` (`:88`) and `security` (`:122`). None of them
  can reach a real model, and none of them should.
- The `text-locale` job runs `bash scripts/check-no-japanese.sh`
  (`:54`), so any new test file is subject to the English-only policy in
  `CONTRIBUTING.md:6-32`.

### The constraint on how it is configured

A test that names a model would reintroduce the coupling ADR-009 exists to
remove, and would fail on any machine whose local model differs. It would also
have to be edited every time a user runs a different model, which defeats the
purpose. Therefore the model must be supplied externally or discovered at
runtime, and the suite must be able to do nothing rather than fail when no model
is available.

## Decision

Introduce a real-model end-to-end verification suite under `e2e/`, configured
entirely from the environment and skipped when no model is reachable.

### 1. A separate vitest project, outside the normal test graph

- `e2e/` is its own vitest project, with its own configuration.
- It is **excluded from the root `pnpm test` command** (`package.json:9`,
  currently `turbo test`) and is **not registered as a task** in `turbo.json`.
  The existing `test`, `test:coverage`, `lint`, `typecheck` and `build` tasks are
  unaffected, so no existing workspace gains a dependency on a running model.
- It is invoked explicitly, by its own script and its own CI job, never as a side
  effect of `pnpm test`.

### 2. Configuration by environment variable only

| Variable | Meaning |
|----------|---------|
| `AEGIS_E2E_PROVIDER` | Provider to exercise (for example a local provider ID) |
| `AEGIS_E2E_BASE_URL` | Base URL of the provider server |
| `AEGIS_E2E_MODEL` | Model ID to use; optional |
| `AEGIS_E2E_API_KEY` | Credential when the provider requires one; optional |
| `AEGIS_E2E_TIMEOUT_MS` | Per-request timeout budget |

- No provider, URL, or model value is written into any test file.
- `AEGIS_E2E_API_KEY` is read from the environment at run time and is never
  committed, matching the repository's existing "never commit secrets" rule.
  This does not contradict ADR-007's rejection of environment keys for *CI* use
  (`docs/adr/007-mock-first-seams.md:65-68`), because these runs are opt-in and
  are not on the required PR path.

### 3. Runtime model detection, never a hardcoded name

- When `AEGIS_E2E_MODEL` is unset, the suite discovers the model at run time by
  querying the server's model list (`GET {baseUrl}/v1/models`) and taking the
  first available entry.
- When no model can be discovered, or the server is unreachable, the suite
  **skips** rather than fails, using `describe.skipIf`. A developer with no local
  model, and CI with no model, both produce a green result with the real-model
  coverage reported as skipped.
- Rationale for skipping over failing: the suite's purpose is to verify a
  configuration the operator chose to exercise. Absence of a local model is not a
  defect in the repository, and a red build for it would train contributors to
  ignore the job.

### 4. Two verification groups

**Group A — generation through validation.** Send the generation request, then
run the result through the existing validation surface and assert:

- syntax validity (AI-NF02, `docs/spec/ai-engine.md:32`);
- dangerous-pattern rejection behaviour is unchanged;
- determinism properties the engine claims are still produced.

This group also records latency and compares it against AI-NF01
(`docs/spec/ai-engine.md:31`). Response time is reported as an observed value
rather than asserted as a hard gate on every machine, because a CPU-only local
model legitimately varies; the measured 52 s versus 0.5 s split above is exactly
the kind of result the operator needs to see attributed.

**Group B — execution of the artifact.** Take the generated artifact, or a
known-safe sample Python script when generation is not part of the case under
test, and execute it through the existing Python execution path, asserting an
**exit code of 0**. This covers the boundary between generation and execution
that no unit test currently crosses: a script can be syntactically valid and
still fail when it actually runs.

### 5. Artifacts are recorded, not just asserted

- Each run writes a JSON record — latency, token counts, validation results, the
  resolved model and provider — to `e2e/.artifacts/`.
- `e2e/.artifacts/` is added to `.gitignore`. The current `.gitignore` covers
  `coverage/` and `test-results/` but has no entry for this directory.
- Persisting these records is what makes the question answerable over time:
  comparing two runs shows whether a change to provider configuration made a
  local model faster, or broke parsing, without relying on anyone's memory of a
  manual measurement.

### 6. Real-model jobs are opt-in

- Any job that requires a real model runs only on explicit request, such as a
  `workflow_dispatch` trigger, and never on the default PR path.
- The five existing CI jobs (`lint`, `text-locale`, `test`, `build`, `security`)
  keep their current behaviour and current cost. None of them is modified to
  require a model.
- Because the suite skips when no model is present, even an accidental
  invocation on a machine without one cannot produce a false red.

## Consequences

### Positive

- The two specification thresholds that currently have no verification (AI-NF01
  and AI-NF02) acquire an executable check against a real provider.
- The gap ADR-007 explicitly recorded
  (`docs/adr/007-mock-first-seams.md:53-54`, `:57-58`) is closed for the
  generation path without weakening the mock-first seam or adding a model
  dependency to the default build.
- "Does an 8B-class local model work for a real user?" becomes a reproducing
  measurement with stored evidence, rather than an opinion or a one-off manual
  observation.
- Recording latency and tokens alongside validation results attributes a
  failure to a cause: the 52 s reasoning-only result and the 7.8 s correct-JSON
  result come from the same model, so a bare pass/fail would have hidden the
  actionable difference.
- Execution of the artifact catches the class of defect that syntax validation
  cannot, at the only boundary where generation meets the executor.
- No model name appears anywhere in the configuration, so the suite is not made
  obsolete the next time the local model changes.

### Negative

- A skipped test is weaker than an executed one. On any machine without a model —
  including default CI — the coverage is nominal, so a green run must not be read
  as "verified end to end".
- Local model output is non-deterministic, so Group A assertions must be written
  against properties (valid syntax, no dangerous patterns) rather than exact
  strings; this is more work to specify than an equality check.
- The suite is slower and more resource-intensive than the unit tests, and on a
  CPU-only machine a single run can take tens of seconds, which discourages
  frequent execution.
- A second vitest project is a second configuration to maintain, and excluding
  it from `turbo.json` means it is also outside Turbo's caching and task
  orchestration.
- `e2e/.artifacts/` accumulates files that must be ignored and periodically
  pruned; a missed `.gitignore` entry would commit run output.
- Auto-detecting "the first model in the list" can exercise a model that happens
  to be installed but is unsuitable for the task, producing a misleading result
  that the operator must notice; the artifact record is what makes that
  recoverable.
- Latency varies by hardware, so AI-NF01 cannot be asserted identically
  everywhere; leaving it as a reported observation means a genuine regression
  could be seen and not caught.

## Alternatives Considered

- **Add the real-model tests to the existing vitest suite with a tag or
  environment guard** — rejected: the root `pnpm test` runs `turbo test`
  (`package.json:9`), so the tests would become part of every workspace run and
  every contributor would need a local model or a working skip, and CI's `test`
  job (`.github/workflows/ci.yml:56`) would carry a suite that can never
  execute.
- **Record real provider responses once and replay them as fixtures** — useful
  for determinism, but rejected as the primary mechanism: the properties that
  motivated this ADR are latency and whether output actually parses and runs. A
  recorded response cannot reproduce a 52-second reasoning-only response being
  misparsed, because the recording fixes the shape in place and the client's
  handling of it is what is under test.
- **Require a cloud API key in CI and test the real provider there** — rejected:
  it spends money on every PR, makes non-deterministic third-party output a merge
  gate, and directly contradicts ADR-007's rejection of that approach
  (`docs/adr/007-mock-first-seams.md:65-68`). It also does not answer the local
  model question, which is the actual open question.
- **Hardcode a small well-known local model, for example the one used in the
  2026-09-14 measurement** — rejected: it re-creates the model-name coupling
  ADR-009 removes, breaks on any machine that has a different model, and requires
  a test edit whenever a user changes models.
- **Fail the build when no model is reachable** — rejected: a missing local model
  is not a repository defect, and a permanently red or flaky job is one
  contributors learn to bypass.
- **Stand up a stub HTTP server implementing the provider protocol** — rejected
  as a substitute: it is another mock, and it cannot report real latency or
  real execution success on the operator's hardware. It remains useful as a
  complement for error-path coverage that a real model will not reliably
  reproduce.
- **Test only the generated script's syntax and never execute it** — rejected:
  syntax validity is AI-NF02 and is already the weaker of the two properties;
  the failure a user experiences is a script that runs and fails, which only
  Group B detects.
