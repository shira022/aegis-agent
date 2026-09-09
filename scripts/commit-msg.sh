#!/usr/bin/env bash
#
# commit-msg hook — Conventional Commits 検証
#
# フォーマット: <type>(<scope>): <description>
# type: feat, fix, docs, style, refactor, test, chore, ci, revert
# scope: パッケージ名（省略可）
#
# 例:
#   feat(ai-engine): add streaming support
#   fix(security): handle nested PII patterns
#   docs: update ADR for selector strategy
#   chore(deps): upgrade turbo to 2.5

set -euo pipefail

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(head -1 "$COMMIT_MSG_FILE")

# Conventional Commits pattern
PATTERN="^(feat|fix|docs|style|refactor|test|chore|ci|revert)(\([a-zA-Z0-9._-]+\))?(!)?: .+"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo ""
  echo "❌ Conventional Commits violation!"
  echo ""
  echo "  Got:      $COMMIT_MSG"
  echo "  Expected: <type>(<scope>): <description>"
  echo ""
  echo "  Types:    feat | fix | docs | style | refactor | test | chore | ci | revert"
  echo "  Scope:    optional, e.g. (ai-engine), (security), (desktop)"
  echo "  Breaking: add ! before : for breaking changes"
  echo ""
  echo "  Examples:"
  echo "    feat(recorder): add CSS selector generation"
  echo "    fix(security): handle nested PII patterns"
  echo "    docs: update ADR for selector strategy"
  echo ""
  exit 1
fi

# --- ADR reference validation (soft warning only) ---
# Matches patterns like ADR-003, ADR-1, refs ADR-012, see ADR-5, etc.
FULL_COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")
ADR_REFS=$(echo "$FULL_COMMIT_MSG" | grep -ioE 'ADR-[0-9]+' | sort -u || true)

if [ -n "$ADR_REFS" ]; then
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  MISSING_ADRS=""

  for ref in $ADR_REFS; do
    # Normalize: ADR-003 -> 003
    NUM=$(echo "$ref" | sed 's/^[Aa][Dd][Rr]-//')
    # Zero-pad to 3 digits for filename lookup
    PADDED=$(printf "%03d" "$((10#$NUM))")

    ADR_FILE=$(ls "$REPO_ROOT/docs/adr/${PADDED}"-*.md 2>/dev/null || true)
    if [ -z "$ADR_FILE" ]; then
      MISSING_ADRS="$MISSING_ADRS $ref"
    fi
  done

  if [ -n "$MISSING_ADRS" ]; then
    echo ""
    echo "⚠️  ADR reference(s) may not exist:$MISSING_ADRS"
    echo "  Expected files in docs/adr/ (e.g. docs/adr/003-python-subprocess.md)"
    echo "  This is a soft warning — commit will proceed."
    echo ""
  fi
fi
