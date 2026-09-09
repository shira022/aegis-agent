---
name: security-audit
description: Audit code for security vulnerabilities specific to Aegis (PII, SSRF, secrets, prompt injection). Use before releases and for high-risk changes.
tags: [security, audit, pii, ssrf, secrets]
category: development
---

# security-audit

Aegis固有のセキュリティ監査手順。

## トリガー条件

- リリース前
- セキュリティ影響のある変更時
- 定期的な監査

## チェック項目

### 1. シークレット漏洩
```bash
# 硬编码されたAPIキーの検索
grep -rn "api[_-]key\|secret[_-]key\|password\|token"   --include="*.ts" --include="*.tsx" --include="*.py"   packages/ apps/ | grep -v node_modules | grep -v ".test." | grep -v "mock"

# 環境変数ファイルの確認
cat .gitignore | grep -E "\.env|secret|key"
```

### 2. PII漏洩
- `@aegis/security` パッケージの検証
- ユーザー入力がフィルタリングされているか
- ログにPIIが含まれていないか

### 3. SSRF防止
- 外部URLへのアクセスが検証されているか
- ユーザー指定URLがブロックリストでフィルタリングされているか

### 4. コマンドインジェクション
- Pythonサブプロセス実行でシェルインジェクションがないか
- `execSync` → `execFileSync` 置換が必要な箇所がないか

### 5. 依存関係
```bash
pnpm audit --audit-level=high
```

### 6. TruffleHog（CI連動）
```bash
trufflehog filesystem --only-verified ./
```

## 関連パッケージ

- `@aegis/security` — PII検出・フィルタリング
- `@aegis/ai-engine` — プロンプトインジェクション防止
- `@aegis/executor` — コマンド実行の安全なラッピング
