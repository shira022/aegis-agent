# Aegis Agent — Agent Guidelines

## English-Only Policy

**All human-readable text in this repository MUST be written in English.** This includes:

- Documentation (`.md` files)
- Code comments and JSDoc strings
- UI strings and labels in source code
- Test descriptions and assertions
- Commit messages and PR titles

### Exceptions

- Regex patterns that intentionally match Japanese text (e.g., `pii-patterns.ts`)
- Locale/language configuration files

### Enforcement

A CI check (`scripts/check-no-japanese.sh`) runs on every push and PR. It scans source files for CJK characters and fails if any are found outside of excluded directories and intentional patterns.

### For AI Agents

When generating or modifying code in this repository:
1. Do NOT introduce Japanese text in comments, strings, or documentation
2. Do NOT add Japanese UI labels — use English equivalents
3. If translating from Japanese, verify the result reads naturally in English
4. Review generated files for any CJK characters before committing
