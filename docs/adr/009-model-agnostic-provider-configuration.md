# ADR-009: Model-Agnostic Provider Configuration

## Status

Proposed

## Context

The product is supposed to support multiple AI providers (`docs/spec/ai-engine.md:24`,
AI-07 "Multiple AI provider support"), and the spec already records that it does
not: `docs/spec/ai-engine.md:80` lists "Multi-provider switching (currently
single provider only)" under **Not Yet Implemented**. What was not recorded is
that the *provider* abstraction is not actually model-agnostic. A model ID is
resolved from static registry data in four independent places, and user
configuration is discarded on three of them.

**1. The TypeScript adapter hardcodes a model ID per provider.**
`packages/@aegis/ai-engine/src/provider-adapter.ts` maps each `ProviderId` to a
factory that embeds a literal model name: `'gpt-4o'` (openai, azure-foundry,
openai-compatible), `'llama3.1'` (ollama), `'default'` (lm-studio),
`'claude-sonnet-4-20250514'` (anthropic), `'gemini-2.5-flash'` (google,
gcp-vertexai), `'anthropic.claude-sonnet-4-20250514-v1:0'` (aws-bedrock).
`createProviderModel(providerId, credentials)` takes no model argument at all,
so the registry value can never be overridden by a caller.

**2. The engine drops the configured model.**
`AIConfig` declares `model: string` (`packages/@aegis/ai-engine/src/types.ts:8`),
but `AiEngine.createModel()` (`packages/@aegis/ai-engine/src/generator.ts:81-87`)
passes only `providerId`, `apiKey`, `baseUrl` and `region` to
`createProviderModel`. `this.config.model` is never forwarded. The configured
model is silently ignored on this path, and because the return type is a
`LanguageModel` there is no way for a caller to observe the substitution.

**3. The Rust registry falls back silently.**
`apps/desktop/src-tauri/src/ai_client/providers.rs:150-173` declares
`default_model: "llama3.1"` for ollama and `"local-model"` for lm-studio.
`apps/desktop/src-tauri/src/ai_client/mod.rs:152-157` correctly prefers
`request.model` when it is present and non-empty, but otherwise substitutes
`spec.default_model` with no signal to the caller. The response echoes the model
that was actually used (`apps/desktop/src-tauri/src/ai_client/mod.rs:50`), so the
substitution is at least diagnosable after the fact, but nothing forces the user
to see it before a request is sent.

**4. The UI cannot express a model the registry does not know.**
`packages/@aegis/ui/src/ProviderSelector/ProviderSelector.tsx:163-175` renders a
fixed `<select>` over `selectedConfig.availableModels`. That field is
`string[]` on `ProviderConfig` (`packages/@aegis/shared/src/types/provider.ts:25`)
and is populated with static literals, e.g. ollama at
`packages/@aegis/shared/src/types/provider.ts:111`
(`['llama3.1', 'mistral', 'codellama', 'qwen2.5', 'gemma2']`). There is no text
input and no fallback: an unlisted model is simply unselectable. The fixed list
is locked in by a test that asserts the dropdown contents
(`packages/@aegis/ui/src/__tests__/ProviderSelector.test.tsx:136-143`).

### Observed impact

On 2026-09-14 a local 8B-class model (`qwen3.5:9b`, 9.7B parameters, Q4_K_M
quantisation) served by Ollama on the Windows host was used for manual
verification. It is absent from every `availableModels` list, so it could not be
selected through the UI at all. Even if a user could select it, the TypeScript
path would have substituted `'llama3.1'`. This is the concrete case the design
must stop producing: a user who pulls any local model and expects to run it.

### Reasoning models are not represented

Reasoning ("thinking") models do not behave like the registry's implicit
assumption of a plain chat completion:

- No source file in `apps/desktop/src-tauri/src`, `apps/desktop/src`,
  `packages/@aegis/ai-engine/src` or `packages/@aegis/shared/src` references
  `reasoning` or `think` (verified by a repository-wide search; the only hits are
  unrelated).
- `providers::extract_text` (`apps/desktop/src-tauri/src/ai_client/providers.rs:392-416`)
  reads only `/choices/0/message/content` for `ApiStyle::OpenAiChat`, and returns
  the error `"provider response did not contain generated text"` when that is
  empty or whitespace.
- Measured with the same `qwen3.5:9b` model: through the OpenAI-compatible
  `/v1/chat/completions` endpoint the response carried an **empty `content`** and
  placed its output in a separate `reasoning` field, spending 500 tokens on
  reasoning and taking **52 seconds**. Through the native `/api/chat` endpoint
  with thinking disabled (`think: false`) the same model answered in
  **0.5 seconds**, and produced a parseable RPA-plan JSON in 7.8 seconds using
  60 tokens. The failure was therefore a client-path problem, not a model
  capability problem.

The same non-`content` shape appears on the cloud side in a benign form: the
`zen` endpoint for `deepseek-v4.1-flash` returns both `content` and
`reasoning_content`, so a reader that only inspects `content` works there by
luck rather than by design.

### The coupling is reinforced by the test suite

Model-ID literals appear in 13 locations across four test files
(`packages/@aegis/ai-engine/src/__tests__/generator.test.ts:19` and `:86`,
`packages/@aegis/ai-engine/src/__tests__/provider-adapter.test.ts`,
`packages/@aegis/shared/src/types/__tests__/provider.test.ts`,
`packages/@aegis/ui/src/__tests__/ProviderSelector.test.tsx`). Tests that assert a
hardcoded model make the static registry look like the intended contract and
will actively resist the change below.

## Decision

Make the model ID a value that flows from user configuration and requests, not
a value the code chooses. Concretely:

### (a) The registry `defaultModel` is demoted to a suggestion

- A model ID is always resolved from user settings or the request. Registry
  `defaultModel` values remain only as a **suggested initial value** offered in
  the UI, never as a silent substitution inside a request path.
- Any substitution that does occur must be surfaced in the response and in the
  UI, using the existing `model` echo field
  (`apps/desktop/src-tauri/src/ai_client/mod.rs:50`) so the user can see which
  model actually served the request.
- A request with no resolvable model is an error the caller can act on, not a
  request silently served by `llama3.1`.

### (b) Local providers enumerate models at runtime, and the UI accepts free text

- For `ollama`, `lm-studio` and `openai-compatible`, the application queries the
  running server for the models it actually has
  (`GET {baseUrl}/v1/models`; Ollama additionally exposes `GET /api/tags`).
- The UI replaces the fixed `<select>`
  (`packages/@aegis/ui/src/ProviderSelector/ProviderSelector.tsx:163-175`) with a
  **combo box**: the runtime-enumerated list as suggestions plus free-text entry.
  A model that the server did not enumerate must remain selectable by typing it.
- `ProviderConfig.availableModels`
  (`packages/@aegis/shared/src/types/provider.ts:25`) is reclassified as an
  offline/placeholder suggestion list, not an exhaustive allow-list. Enumeration
  failure is not an error condition — it degrades to free text.

### (c) The TypeScript adapter takes the model as a parameter

- The signature becomes
  `createProviderModel(providerId, credentials, model)`; the per-provider
  factories stop embedding model literals.
- `AiEngine.createModel()`
  (`packages/@aegis/ai-engine/src/generator.ts:81-87`) passes `this.config.model`
  (declared at `packages/@aegis/ai-engine/src/types.ts:8`) on every call, so the
  `AIConfig.model` field stops being decorative.

### (d) Reasoning output is a first-class response shape

- When `content` is empty and a `reasoning` / `reasoning_content` field is
  present, that text is treated as the model's **explanation**, and is surfaced
  as such rather than discarded.
- Generated code and generated JSON are extracted **only** from `content`. A
  reasoning field is never parsed as a script or as a plan, so a model's internal
  monologue cannot become executable output.
- If `content` is empty and only reasoning text exists, the outcome is an
  explicit, typed error identifying the reasoning-only response — not the current
  opaque `"provider response did not contain generated text"`
  (`apps/desktop/src-tauri/src/ai_client/providers.rs:415`).
- Disabling thinking on local reasoning models (Ollama `think: false`, and the
  equivalent option for other providers) is expressed as a **provider
  capability** that the user can set, rather than being hardcoded. The measured
  52 s / empty-content versus 0.5 s split above is the justification: this is the
  difference between a local model being usable and being unusable.

### (e) No model-name literals in tests, E2E or CI

- Tests assert that a configured model propagates to the provider call; they do
  not assert specific model IDs. Where a concrete value is needed, it comes from
  a single test fixture or environment variable.
- The 13 literal sites listed above are expected to be removed or converted as a
  consequence of this decision. This is what makes the fix durable: a test that
  asserts `'gpt-4o'` re-establishes the coupling the decision removes.

### Relationship to existing decisions

- This is the implementation path for AI-07 (`docs/spec/ai-engine.md:24`) and
  removes one entry from the `docs/spec/ai-engine.md:80` list.
- ADR-007 (`docs/adr/007-mock-first-seams.md`) recorded that the mock existed so
  the real provider call could land later as a local change. That change has
  landed (`apps/desktop/src-tauri/src/ai_client/providers.rs` performs real
  HTTP requests), and this ADR addresses the provider configuration surface it
  left open.
- Verification of these changes with a real model is governed by ADR-010.

## Consequences

### Positive

- Any model the user's server actually serves becomes usable, including models
  released after this repository was written — the core failure mode observed on
  2026-09-14.
- One model-resolution path instead of four disagreeing ones; the configured
  model can no longer be silently replaced between the engine and the wire.
- Reasoning models become supported rather than looking broken, and their output
  can never be promoted to executable code.
- The provider abstraction becomes genuinely multi-provider, which is what
  `docs/spec/ai-engine.md:24` (AI-07) already requires.
- Removing model literals from tests decouples the suite from the model
  catalogue, so adding a provider or a model no longer breaks unrelated tests.

### Negative

- The runtime enumeration call adds a dependency on the local server being
  reachable when the settings screen opens; this needs a loading and a failure
  state, and is more UI work than a static list.
- Free-text model entry permits typos and unsupported model names. The failure
  moves from "impossible to select" to "fails at request time", so error
  messages for an invalid model become a user-visible surface that must be
  written well.
- Reasoning-aware handling means provider responses are no longer uniform; the
  extraction path needs a per-provider shape and tests for each shape.
- Existing tests and fixtures that assert model IDs must be reworked, and
  `ProviderConfig.availableModels` changes meaning, touching
  `@aegis/shared`, `@aegis/ai-engine`, `@aegis/ui` and the Rust registry
  together.
- Provider capability flags (such as thinking suppression) introduce
  configuration that can be set wrongly, and a wrong setting may only be visible
  as a slow or empty response.

## Alternatives Considered

- **Extend `availableModels` with more static entries** — rejected: the list can
  never contain a model the user pulled five minutes ago, which is precisely the
  observed failure. It relocates the problem instead of removing it.
- **Keep model selection as a dropdown and require users to use listed models
  only** — rejected: it contradicts `docs/spec/ai-engine.md:24` (AI-07) and makes
  the product unusable with local models the user already has.
- **Pass the model through the Rust request only, leaving the TypeScript adapter
  hardcoded** — rejected: `@aegis/ai-engine` is the engine used for generation,
  and leaving `createProviderModel` model-free means the most important path
  keeps ignoring `AIConfig.model`.
- **Auto-detect a single model at runtime and never let the user choose** —
  rejected: it removes an explicit user decision and gives no way to prefer a
  faster or a more capable local model; detection alone also cannot distinguish
  two installed models.
- **Treat a reasoning field as a fallback source of generated text** — rejected:
  it would allow non-deterministic internal monologue to be parsed as a script or
  plan and handed to the executor, which contradicts the validation-first
  posture in `docs/spec/ai-engine.md:10`.
- **Hardcode `think: false` for all local providers** — rejected: it is a
  per-provider capability, not a universal truth; some models or endpoints do not
  accept it, and silently dropping it would hide the performance characteristic
  the user needs to understand.
