# Security Category

> Package: `@aegis/security`
> Core Flow: Cross-cutting (applies to all flows)

## Overview

Manages all security-related functionality including PII (Personally Identifiable Information) masking, API key management, sandboxed execution, and human-approval guards.

**Core idea**: All data is stored locally; any externally transmitted data must be PII-masked. API keys are managed via the OS keychain, and all code execution requires human approval.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-01 | Automatic PII detection & masking | Must |
| SEC-02 | OS Keychain-based API key management | Must |
| SEC-03 | Sandboxed code execution | Must |
| SEC-04 | Human-approval guard (prevent unapproved code execution) | Must |
| SEC-05 | Custom PII pattern support | Should |
| SEC-06 | Safe log verification | Must |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| SEC-NF01 | PII detection accuracy | ≥ 95% |
| SEC-NF02 | Masking processing speed | < 100ms / 1,000 lines |
| SEC-NF03 | Keychain encryption | AES-256 |
| SEC-NF04 | Sandbox isolation level | Process-level |

## API / Interfaces

### Main Classes

- **`PIIMasker`**: PII detection & masking
- **`LogSanitizer`**: PII sanitization of operation logs
- **`PIIValidator`**: PII validation of text/logs
- **`ApiKeyManager`**: OS Keychain-based API key management

### PII Detection Patterns

| Category | Detection Pattern | Severity |
|----------|-------------------|----------|
| `email` | Email addresses | High |
| `credit_card` | Credit card numbers | High |
| `ssn` | US Social Security Number | High |
| `my_number` | Japanese My Number (12-digit) | High |
| `password` | Password fields | High |
| `phone` | Phone numbers | High |
| `bank_account` | Bank account numbers | High |
| `ip_address` | IPv4/IPv6 | Medium |
| `name` | Japanese name patterns | Medium |
| `address` | Postal code (〒) | Medium |

### Key Type Definitions

```typescript
interface PIIDetection {
  category: PIICategory;
  startIndex: number;
  endIndex: number;
  originalValue: string;
  maskedValue: string;
  confidence: number;
}

interface SanitizedLog extends OperationLog {
  sanitized: true;
  detections: PIIDetection[];
  stats: SanitizeStats;
}
```

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `PIIMasker` | ✅ Complete | masker.ts (shared library) |
| `LogSanitizer` | ✅ Complete | sanitizer.ts (shared library) |
| `PIIValidator` | ✅ Complete | validator.ts (shared library) |
| `ApiKeyManager` | ✅ Complete | OS Keychain integration (shared library) |
| `Sandbox` | ✅ Complete | Process isolation (shared library) |
| `ApprovalGuard` | ✅ Complete | Human-approval guard (shared library) |
| `pii-patterns.ts` | ✅ Complete | 11 category support |
| PII masking of outbound payloads (SEC-01, SEC-06) | ❌ Not implemented | No `@aegis/security` import exists anywhere under `apps/desktop/src` or `packages/@aegis/ui/src` — the shared library is never loaded at runtime, so nothing masks the AI request body built in `ai_client/mod.rs:166-177` or the operation logs appended to the activity list |
| Capture-time PII filtering of recorded values (SEC-01) | ❌ Not implemented | `filterSensitiveData` is never called; combined with the empty action log of [recording.md](recording.md) there is currently nothing to mask |
| Real secret backend (`KeyringBackend`) | ✅ Implemented | `keyring` crate against the platform credential store (Windows Credential Manager / macOS Keychain / Secret Service), service `com.aegis.agent` (`security/mod.rs:21`, `:55-80`); the running app uses it via `default_secret_backend` (`security/mod.rs:124-126`, wired in `ipc/mod.rs:481-491`). `MemoryBackend` (`security/mod.rs:82-121`) is for tests |
| OS keychain write path (`security::store_api_key`, SEC-02) | ✅ Implemented, unreachable from the UI | Registered as a command (`lib.rs:50`) and implemented against `SecretBackend::store` (`security/mod.rs:207-222`), but no frontend caller exists — no `store_api_key` invocation appears anywhere in `apps/desktop/src` |
| API key entry from the setup screen (`save_provider_key`) | ⚠️ Partial | Stores **only** a non-recoverable mask: it routes the raw key through `security::store_key` (`tasks/mod.rs:171-193` → `security/mod.rs:167-187`), which reduces the secret to `KeyMask { masked, length, stored_at }` and drops the material. It never calls `SecretBackend::store`, so the OS keychain stays empty |
| OS keychain read path (`security::load_secret`) | ✅ Implemented | Reads the platform credential store through `SecretBackend::retrieve` (`security/mod.rs:129-131`) and is called by the AI client before every request (`ai_client/mod.rs:159`) |
| Secret isolation from the webview | ✅ Implemented | `get_api_key` returns a `KeyMask` and never releases the secret; Rust-side callers use `load_secret` (`security/mod.rs:1-7`) |
| Human-approval guard reachable at runtime (SEC-04) | ⚠️ Partial | `ApprovalGuard` exists as a library and `list_approvals`/`decide_approval` are implemented (`tasks/mod.rs:130-140`), but no non-test code ever appends to `store.approvals`: `decide_approval_in` only mutates an existing entry (`tasks/state.rs:207-216`). The store is therefore always empty and the guard is never exercised |

### Where security stands today

The two halves of this category disagree about whether they are wired up.

The **read** half is real. `AppState.secrets` is a `KeyringBackend` in the shipping
app (`ipc/mod.rs:481-491`), `security::load_secret` retrieves the raw secret from
the OS keychain (`security/mod.rs:129-131`), and the AI client consumes it on
every request (`ai_client/mod.rs:159`).

The **write** half is not. The setup screen calls `save_provider_key`, which stores
a mask and nothing else (`tasks/mod.rs:171-193`); the function that would persist
the real secret, `security::store_api_key` (`security/mod.rs:207-222`), is
registered as a Tauri command (`lib.rs:50`) but has no frontend caller — no
`store_api_key` invocation exists anywhere under `apps/desktop/src`.

The consequence is verifiable from the read side. Both the status check and the
generation call decide whether a provider is usable via `security::load_secret`,
which only ever consults the OS keychain (`ai_client/mod.rs:210-216` and
`:159-164`). The mask that `save_provider_key` writes is never read back either:
`has_key` / `list_providers` (`security/mod.rs:189-199`) have no frontend caller,
and the in-memory `KeychainStore` is not part of the persisted shape
(`tasks/state.rs:30-36`). So for any provider that requires a credential, entering
a key in the setup screen leaves `configured: false` and generation fails with
`provider '<id>' is not configured: no API key stored`
(`ai_client/mod.rs:161-163`). The screen accepts the key and the keychain stays
empty. (Providers with `accepts_anonymous` — Ollama, LM Studio — are exempt and
need no credential at all; see [architecture.md](architecture.md).)

PII masking (SEC-01, SEC-05, SEC-06) is in the same position one layer up: the
`@aegis/security` library is complete and tested but has zero importers in
`apps/desktop/src` or `packages/@aegis/ui/src`, so no request body and no operation
log passes through it. The requirement that "any externally transmitted data must
be PII-masked" is documented but not enforced by code today.

Both defects and their repair policy — route `save_provider_key` (or a replacement
command) through `SecretBackend::store`, and mask the outbound AI payload before
transmission — are specified in
[ADR-011](../adr/011-agentic-rpa-pipeline.md).

### Not Yet Implemented

- Connecting `@aegis/security` to the runtime: masking the AI request body before
  it is sent and sanitizing the operation log before it is persisted
- A frontend caller for `store_api_key`, so that entering a key in the setup screen
  actually populates the OS keychain
- Creating approval requests, so that `ApprovalGuard` / `decide_approval` have
  something to guard
- UI settings for custom PII patterns
- Security audit logging
- Remote SSH connection security

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/masking.test.ts` | PIIMasker, LogSanitizer, PIIValidator |
