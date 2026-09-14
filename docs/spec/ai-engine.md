# AI Engine Category

> Package: `@aegis/ai-engine`
> Core Flow: ②Review (Approve) — the core component

## Overview

An engine that takes operation logs and generates **deterministic** Python scripts with pre-defined exception handlers.

**Core idea**: To prevent AI hallucinations, safety is ensured through a two-stage approach: prompt design and validation. Generated code is always wrapped in an `if __name__ == "__main__"` block and locked (read-only) only after user approval.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| AI-01 | Operation log → Python script conversion | Must |
| AI-02 | Playwright/Selenium code generation | Must |
| AI-03 | Automatic exception handler injection | Must |
| AI-04 | Input validation (dangerous pattern detection) | Must |
| AI-05 | Code validation (syntax & structure checks) | Must |
| AI-06 | Prompt template management | Must |
| AI-07 | Multiple AI provider support | Should |
| AI-08 | Exception prediction pattern learning | Should |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| AI-NF01 | Code generation response time | < 30 seconds |
| AI-NF02 | Generated code syntax validity | 100% |
| AI-NF03 | Prompt management consistency | Versioning support |

## API / Interfaces

### Main Classes

- **`CodeGenerator`**: Generates Python code from operation logs
- **`PromptBuilder`**: Constructs prompts for the AI
- **`InputValidator`**: Detects dangerous patterns in user input
- **`CodeValidator`**: Validates syntax and structure of generated code

### Key Type Definitions

```typescript
interface AiEngineResult {
  success: boolean;
  code?: string;
  error?: string;
  warnings: string[];
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
}
```

### Prompt Design

- **Role definition**: "You are an expert in RPA automation code"
- **Constraint rules**: Prohibition of dangerous functions (eval, exec, os.system)
- **Output format**: Code generation conforming to a JSON schema
- **Exception templates**: Timeout, network error, element not found

### Providers and model selection

The provider registry defines nine providers
(`packages/@aegis/shared/src/types/provider.ts:43-130`): six cloud
(`openai`, `anthropic`, `google`, `aws-bedrock`, `azure-foundry`, `gcp-vertexai`),
two local (`ollama`, `lm-studio`) and one compatible endpoint
(`openai-compatible`). The Rust client mirrors the same list and maps it onto four
request styles — OpenAI chat, Anthropic messages, Gemini `generateContent` and
Bedrock invoke (`apps/desktop/src-tauri/src/ai_client/providers.rs:30-180`) — and
it performs real HTTP requests (`ai_client/mod.rs:159-182`).

**Model resolution — target design** ([ADR-009](../adr/009-model-agnostic-provider-configuration.md)).
A model ID must flow from user configuration or the request, never from a silent
fallback inside the code path:

- The registry `defaultModel` (`provider.ts:24`) is a *suggestion* offered in the
  UI, not an authority the request path substitutes silently.
- Any substitution that does occur is echoed back in the response `model` field
  (`ai_client/mod.rs:50`) so the user can see which model actually served the
  request.
- A request with no resolvable model is an actionable error, not a request served
  by a built-in default.

**Local runtimes — target design.** For `ollama`, `lm-studio` and
`openai-compatible`, the application queries the running server for the models it
actually has (`GET {baseUrl}/v1/models`; Ollama additionally exposes
`GET /api/tags`), and the UI offers a combo box: the enumerated list as
suggestions **plus** free-text entry, so a model the server did not enumerate
remains selectable by typing it. `ProviderConfig.availableModels` is an offline
suggestion list, not an exhaustive allow-list; an enumeration failure degrades to
free text instead of erroring.

**Current gap.** The UI renders a fixed `<select>` over `availableModels`
(`packages/@aegis/ui/src/ProviderSelector/ProviderSelector.tsx:163-175`), so an
arbitrary model ID cannot be entered, the initial value is
`PROVIDER_REGISTRY[id].defaultModel` (`apps/desktop/src/App.tsx:71-73`), and
nothing queries a local server for its model list.

**Reasoning ("thinking") models.** A reasoning model can return an empty
`content` while putting the text in a separate `reasoning` field. Measured on
2026-09-14 with a local 8B-class model (`qwen3.5:9b`, Q4_K_M, CPU) served by
Ollama: through the OpenAI-compatible endpoint the response had empty `content`,
the text appeared only under `reasoning`, 500 tokens were spent thinking, and the
call took **52 seconds** (violating AI-NF01); through the native `/api/chat`
endpoint with thinking disabled (`think: false`) the same model answered in
**0.5 seconds**, and produced parseable plan JSON in 7.8 seconds. Design
consequences (ADR-009):

- `reasoning` / `reasoning_content` is treated as the model's **explanation** and
  surfaced as such. Generated code and generated JSON are extracted **only** from
  `content`, so a model's internal monologue can never become executable output.
- Empty `content` with a non-empty reasoning field yields an explicit, typed error
  identifying a reasoning-only response, instead of the current opaque
  `"provider response did not contain generated text"`
  (`ai_client/providers.rs:415`).
- Disabling thinking is a user-settable **provider capability** (Ollama
  `think: false` and the equivalent for other providers), not a hardcoded flag.
- Current gap: the client reads only `/choices/0/message/content`
  (`ai_client/providers.rs:395-416`); no `reasoning` field is parsed, and no
  thinking-suppression option exists.

**Verification.** Real-model behaviour — latency against AI-NF01, whether output
parses, and whether the generated artifact executes — is verified by the opt-in
suite specified in [ADR-010](../adr/010-real-model-e2e-verification.md).

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `CodeGenerator` | ✅ Complete | Shared library; no importer anywhere in this repository (`@aegis/ai-engine` has 0 references from `apps/` or `packages/`) |
| `PromptBuilder` | ✅ Complete | Safety prompt + JSON output contract |
| `InputValidator` | ✅ Complete | Dangerous pattern detection (`validators.ts:6-84`) |
| `CodeValidator` | ✅ Complete | Syntax, dangerous-op and determinism checks (`validators.ts:32-115`) |
| `types.ts` | ✅ Complete | All type definitions |
| Rust provider client | ✅ Implemented | Real HTTP calls for nine providers (`ai_client/providers.rs`) |
| Generation reachable from the UI | ❌ Not implemented | `ai_generate_script` is registered (`lib.rs:47`) but no TypeScript code calls it, so no user path reaches this engine |
| Reasoning-model responses | ❌ Not implemented | Only `content` is parsed (`providers.rs:395-416`) |
| Runtime model enumeration | ❌ Not implemented | No `/v1/models` or `/api/tags` query exists |

### Not Yet Implemented

- A command that turns an operation log into a validated script and a pending
  approval (planned as `generate_task_script`, see
  [ADR-011](../adr/011-agentic-rpa-pipeline.md))
- Model ID resolution from user configuration, and free-text model entry for local
  runtimes (ADR-009)
- Reasoning-field handling and a user-settable thinking-suppression option (ADR-009)
- Machine learning for exception patterns
- Code quality scoring
- Provider capabilities beyond text generation (vision, token accounting)

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/generator.test.ts` | CodeGenerator |
| `__tests__/prompt-builder.test.ts` | PromptBuilder |
| `__tests__/validators.test.ts` | InputValidator/CodeValidator |
