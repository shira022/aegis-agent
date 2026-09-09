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
