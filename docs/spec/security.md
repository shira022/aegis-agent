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
| `PIIMasker` | ✅ Complete | masker.ts |
| `LogSanitizer` | ✅ Complete | sanitizer.ts |
| `PIIValidator` | ✅ Complete | validator.ts |
| `ApiKeyManager` | ✅ Complete | OS Keychain integration |
| `Sandbox` | ✅ Complete | Process isolation |
| `ApprovalGuard` | ✅ Complete | Human-approval guard |
| `pii-patterns.ts` | ✅ Complete | 11 category support |

### Not Yet Implemented

- UI settings for custom PII patterns
- Security audit logging
- Remote SSH connection security

## Test Coverage

| Test File | Target |
|-----------|--------|
| `__tests__/masking.test.ts` | PIIMasker, LogSanitizer, PIIValidator |
