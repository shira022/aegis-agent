# Real-Model End-to-End Verification (ADR-010)

This directory is an **opt-in** vitest project that verifies the AI
generation and execution pipeline against a real model server. It is
deliberately outside the normal test graph:

- it is **not** part of the root `pnpm test` command,
- it is **not** registered as a task in `turbo.json`,
- it is invoked explicitly with `pnpm test:e2e`.

Every value that identifies the model — provider, base URL, model id,
credential — comes from `AEGIS_E2E_*` environment variables. No test file
contains a model name, provider id, or base URL literal.

## Running

From the repository root:

```sh
AEGIS_E2E_BASE_URL=http://127.0.0.1:11434 pnpm test:e2e
```

`http://127.0.0.1:11434` above is a placeholder — substitute the base URL
of the server you actually want to verify. Nothing is run against a live
server unless you configure one.

## One ordered spec file

All coverage lives in **`e2e/real-model.spec.ts`**. vitest runs spec
*files* in parallel, so the two verification groups were merged into a
single file with a strictly sequential flow inside it:

1. **Group A** runs first: it generates the Python artifact once and
   validates it through the engine's validation surface.
2. **Group B** runs second and consumes **the same in-run result**: the
   validated code from Group A is written to
   `e2e/.artifacts/<timestamp>-artifact.py` and executed through
   `@aegis/executor`.

Group B never falls back to a bundled sample script. If Group A produced
no validated code (skipped or failed), Group B skips with a recorded
reason — a green run therefore never overstates what was executed.

## Skip behaviour

The suite skips (green, never red) when:

- no `AEGIS_E2E_BASE_URL` is configured — the default state on any
  machine and in CI;
- the configured base URL is unreachable — an explicit
  `AEGIS_E2E_MODEL` triggers a reachability probe, and the discovery
  path fails naturally when the server is down;
- no model can be resolved at the configured server;
- Group A produced no validated code in the run — Group B skips.

Absence of a model is not a repository defect (ADR-010), so the suite
skips instead of failing; each skip is recorded in `e2e/.artifacts/`.
With **no `AEGIS_E2E_*` variables set at all**, both groups report as
skipped and the command exits 0.

## Environment variables

| Variable | Required | Meaning |
|----------|----------|---------|
| `AEGIS_E2E_PROVIDER` | no | Provider id to exercise. Defaults to `openai-compatible` when unset. An unknown id is a configuration error and fails loudly instead of skipping. |
| `AEGIS_E2E_BASE_URL` | yes | Base URL of the provider server, for example `http://127.0.0.1:11434`. A URL already ending in `/v1` is used as-is for API calls; otherwise `/v1` is appended. |
| `AEGIS_E2E_MODEL` | no | Model id to use. When unset, the model is discovered at run time via `GET {baseUrl}/v1/models` (Ollama-style `GET {baseUrl}/api/tags` fallback) and the first advertised model is used. When set, the endpoint is probed for reachability first; an unreachable server skips. |
| `AEGIS_E2E_API_KEY` | no | Credential when the provider requires one. Read from the environment at run time only; never committed and never written to an artifact record. |
| `AEGIS_E2E_TIMEOUT_MS` | no | Per-test timeout budget (and the cap for discovery/reachability probes). Default `120000`. |
| `AEGIS_E2E_STUB_MODULES` | no | Top-level Python modules the stub layer covers for Group B, comma-separated. Default `selenium`. An **empty string disables stubbing**: the artifact then runs against the real Python environment and the record carries `stubMode: "real"`. |

## What is verified

- **Group A — generation through validation**: builds `AiEngine` from
  the env configuration, calls `generateCode(...)` with one fixed
  RPA-style operation log, and asserts the generated code through the
  engine's own validation surface — syntax validity (AI-NF02) and no
  dangerous-pattern violations. Latency is recorded as an observed value
  compared against the 30000 ms budget (AI-NF01); it is reported, not
  hard-asserted, because local-model latency legitimately varies with
  hardware.
- **Group B — execution of the generated artifact**: takes the Python
  code Group A produced **in the same run**, writes it to
  `e2e/.artifacts/<timestamp>-artifact.py`, records its sha256 in the
  run record **before** execution, re-verifies the hash immediately
  before running, then executes it through `ExecutionEngine.execute()`
  from `@aegis/executor` with `PYTHONPATH` pointing at the permissive
  stub layer (`e2e/fixtures/stubs/`) — injected via `ExecutionConfig.env`
  only, never by mutating the test process's environment. Asserts exit
  code 0 and no timeout.

### Limitation: a stubbed run proves control flow only

Group B's default configuration runs the generated script against the
permissive selenium stub layer. That proves the **generated control flow
executes end to end** — every import resolves, the script runs top to
bottom, exits cleanly. It does **NOT** prove that a real browser was
driven: no browser launches, no DOM exists, every call is a no-op.
Records for such runs carry `stubMode: "stubbed"` and `usedStubs`, and
must never be presented as evidence of real browser automation. Set
`AEGIS_E2E_STUB_MODULES=""` to run against the real Python environment
instead (`stubMode: "real"`); the script then only passes if its imports
resolve for real.

## Thinking auto-detection

When the engine reports a reasoning-only response (`TextExtractionError`
with kind `reasoning-only` — the provider put its output in a reasoning
field instead of content), the suite retries the same request **once**
with `disableThinking: true` (the ADR-009(d) setting) and records
`thinkingAutoDisabled: true` in the artifact. The decision is made from
the observed response shape, never from a model name. Reasoning text is
never treated as generated code.

## Artifacts

Each run writes one JSON record per group to `e2e/.artifacts/`
(gitignored): timestamp, provider, base URL, resolved model, latency,
token counts, validation results, exit code, `thinkingAutoDisabled`,
and the final state (`executed` or `skipped`). Group B records
additionally carry the Python artifact file name (`artifactScript`),
its sha256 (`artifactSha256`), the covered top-level modules
(`usedStubs`) and the execution mode (`stubMode`). Comparing records
over time is what shows whether a configuration change made a local
model faster or broke parsing. Records never contain credentials.

The `<timestamp>-artifact.py` files next to the JSON records are the
exact scripts that were executed (sha256-verified before the run). The
directory accumulates files and should be pruned periodically; it is
never committed.
