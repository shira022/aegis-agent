#!/usr/bin/env bash
#
# setup-hooks.sh — シンボリックリンクでGit hooksをセットアップする
#
# pnpm install 後に実行するか、package.json の prepare スクリプトから呼ばれる
# worktree対応: git rev-parse --git-dir で正しいhooksディレクトリを取得
#

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# worktreeでも正しく動くよう git rev-parse で .git ディレクトリを取得
GIT_DIR="$(git -C "$REPO_ROOT" rev-parse --git-dir 2>/dev/null || echo "$REPO_ROOT/.git")"

# 相対パスなら絶対パスに変換
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
