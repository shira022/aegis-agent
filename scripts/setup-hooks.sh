#!/usr/bin/env bash
#
# setup-hooks.sh — Set up Git hooks via symbolic links
#
# Run after pnpm install, or called from the package.json prepare script.
# Worktree support: uses git rev-parse --git-dir to locate the correct hooks directory.
#

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Use git rev-parse to get the correct .git directory, even in worktrees
GIT_DIR="$(git -C "$REPO_ROOT" rev-parse --git-dir 2>/dev/null || echo "$REPO_ROOT/.git")"

# Convert relative path to absolute
if [[ ! "$GIT_DIR" = /* ]]; then
  GIT_DIR="$REPO_ROOT/$GIT_DIR"
fi

HOOKS_DIR="$GIT_DIR/hooks"
SCRIPTS_DIR="$REPO_ROOT/scripts"

mkdir -p "$HOOKS_DIR"

echo "🔗 Setting up git hooks..."

# pre-commit hook
if [ -f "$SCRIPTS_DIR/pre-commit.sh" ]; then
  ln -sf "../../scripts/pre-commit.sh" "$HOOKS_DIR/pre-commit"
  echo "  ✓ pre-commit"
fi

# commit-msg hook
if [ -f "$SCRIPTS_DIR/commit-msg.sh" ]; then
  ln -sf "../../scripts/commit-msg.sh" "$HOOKS_DIR/commit-msg"
  echo "  ✓ commit-msg"
fi

# post-commit hook
if [ -f "$SCRIPTS_DIR/post-commit.sh" ]; then
  ln -sf "../../scripts/post-commit.sh" "$HOOKS_DIR/post-commit"
  echo "  ✓ post-commit"
fi

echo "✅ Git hooks installed."
