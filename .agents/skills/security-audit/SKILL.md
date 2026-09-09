---
name: security-audit
description: Audit code for security vulnerabilities specific to Aegis (PII, SSRF, secrets, prompt injection). Use before releases and for high-risk changes.
tags: [security, audit, pii, ssrf, secrets]
category: development
---

# security-audit

Security audit procedures specific to Aegis.

## Trigger Conditions

- Before a release
- When making security-impacting changes
- During periodic audits

## Checklist Items

### 1. Secret Leakage
```bash
# Search for hardcoded API keys
grep -rn "api[_-]key\|secret[_-]key\|password\|token"   --include="*.ts" --include="*.tsx" --include="*.py"   packages/ apps/ | grep -v node_modules | grep -v ".test." | grep -v "mock"

# Check environment variable files
cat .gitignore | grep -E "\.env|secret|key"
```

### 2. PII Leakage
- Verify the `@aegis/security` package
- Check that user input is filtered
- Check that logs do not contain PII

### 3. SSRF Prevention
- Verify that external URL access is validated
- Check that user-supplied URLs are filtered against a blocklist

### 4. Command Injection
- Check for shell injection in Python subprocess execution
- Identify places where `execSync` should be replaced with `execFileSync`

### 5. Dependencies
```bash
pnpm audit --audit-level=high
```

### 6. TruffleHog (CI Integration)
```bash
trufflehog filesystem --only-verified ./
```

## Related Packages

- `@aegis/security` — PII detection and filtering
- `@aegis/ai-engine` — Prompt injection prevention
- `@aegis/executor` — Safe command execution wrapping
