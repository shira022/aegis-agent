#!/usr/bin/env bash
# CI check: fail if source files contain CJK characters (Japanese text).
# Exceptions: .venv, node_modules, dist, target, pnpm-lock, and binary files.
set -euo pipefail

EXIT_CODE=0
FILES_CHECKED=0

# Search for CJK characters (Hiragana, Katakana, CJK Unified Ideographs)
# in source files: .ts, .tsx, .md, .json, .yaml, .yml, .toml, .rs
while IFS= read -r file; do
  FILES_CHECKED=$((FILES_CHECKED + 1))
  # grep -P for Perl regex with Unicode ranges
  MATCHES=$(grep -Pn '[\x{3040}-\x{309F}\x{30A0}-\x{30FF}\x{4E00}-\x{9FFF}\x{3400}-\x{4DBF}]' "$file" 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "::error file=$file::Japanese text found"
    echo "$MATCHES"
    EXIT_CODE=1
  fi
done < <(find . \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.md' -o -name '*.json' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' -o -name '*.rs' \) \
  ! -path '*/node_modules/*' \
  ! -path '*/.git/*' \
  ! -path '*/dist/*' \
  ! -path '*/.next/*' \
  ! -path '*/.turbo/*' \
  ! -path '*/target/*' \
  ! -path '*/.venv/*' \
  ! -path '*/pnpm-lock.yaml' \
  ! -name 'pnpm-lock.yaml' \
  2>/dev/null)

if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ No Japanese text found in $FILES_CHECKED source files."
else
  echo ""
  echo "✗ Japanese text detected. All human-readable text must be in English."
  echo "  See CONTRIBUTING.md for the English-Only Policy."
fi

exit $EXIT_CODE
