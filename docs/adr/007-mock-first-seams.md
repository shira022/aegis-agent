# ADR-007: Mock-First Seams for AI Generation and Credential Storage

## Status

Accepted

## Context

Two capabilities in the backend touch the outside world and cannot be exercised
safely by an autonomous agent working unattended:

- **AI code generation** — the real provider call costs money, requires a
  credential, and produces non-deterministic output.
- **Credential storage** — the product intends to store provider API keys in the
  OS keychain (Windows Credential Manager / macOS Keychain / Secret Service).
  Any implementation that can read a raw key back into application memory also
  widens the blast radius if the process or the webview is compromised.

At the same time the UI needs both features to exist so that the setup flow,
approval flow and error handling can be built and tested end to end.

## Decision

Implement both capabilities as **deterministic mocks with an explicit,
single-point seam**, and make the mocking structural rather than conventional:

- `ai_client` performs no network calls and reads no credentials. It returns a
  canned response derived deterministically from its input, and the seam for the
  real provider is one documented function.
- `security` stores credentials in memory as a `KeyMask` (`provider`, `masked`,
  `length`, `storedAt`). The map value type structurally **cannot** hold the
  secret; `store_api_key` reduces the input to a mask and drops the rest, and
  `get_api_key` always returns `None`. The command signatures already match what
  a real keychain-backed implementation needs, so the future change is local.
- No `.env` file and no plaintext key file is read or written anywhere.

## Consequences

**Positive:**

- The whole product surface can be built, reviewed and tested without spending
  money or handling real secrets; nothing in the repository can leak a key.
- The mock is deterministic, so tests and screenshot verification are stable.
- The mock cannot be mistaken for a working integration in the middle of the
  code: the seam is one function, and the mask-only type makes a
  "temporarily store the plaintext" shortcut a type error rather than an
  oversight.
- The security posture is fail-closed by construction: the only command that
  could ever release material returns `None`.

**Negative:**

- The real provider call, its error taxonomy, retry/backoff behaviour and token
  accounting remain unverified; they can only be exercised with a real key.
- The real keychain round-trip (write, read back, delete, prompt behaviour) is
  unverified; keyring failures on locked or unavailable stores are unknown.
- A mock can drift from the real provider's response shape, so the
  adapter/DTO boundary will need re-verification when the real client lands.

## Alternatives Considered

- **Skip the AI and credential commands until the real implementations exist** —
  rejected: the setup and approval flows would have nothing to call, and the
  whole UI layer would be built against a moving interface.
- **Use a real provider key from the environment for development** — rejected:
  the repository explicitly forbids committing secrets, an unattended agent
  cannot manage a real per-call cost, and non-deterministic output would break
  screenshot/test verification.
- **Persist keys in a local file or `localStorage` for now** — rejected: it
  establishes exactly the habit the keychain decision exists to prevent, and
  migration would be riskier than starting with no persistence.
