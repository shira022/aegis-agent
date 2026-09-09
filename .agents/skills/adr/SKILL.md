---
name: adr
description: Record Architecture Decision Records for significant design choices. Use when making non-trivial architectural decisions.
tags: [adr, architecture, decision, documentation]
category: documentation
---

# adr

Aegisプロジェクトのアーキテクチャ判断記録（ADR）作成手順。

## トリガー条件

- 新しい技術選択を行うとき
- アーキテクチャパターンを変更するとき
- 既存の判断を取り消すとき

## 実行手順

1. **テンプレートに従いADRを作成**
   ```bash
   ls docs/adr/ | tail -1  # 最新番号を確認
   ```

2. **ファイル名**: `docs/adr/<NNN>-<short-title>.md`

3. **フォーマット**:
   ```markdown
   # ADR-<NNN>: <タイトル>

   ## Status
   Proposed | Accepted | Deprecated | Superseded by ADR-XXX

   ## Context
   なぜこの判断が必要なのか。背景と課題。

   ## Decision
   何を決めるか。

   ## Consequences
   ### Positive
   - ...

   ### Negative
   - ...

   ## Alternatives Considered
   - ...
   ```

4. **必須フィールド**
   - Status（状態）
   - Context（背景）
   - Decision（判断内容）
   - Consequences（影響）

## 既存ADR一覧

- ADR-001: Tauri Desktop Framework
- ADR-002: NPM Distribution
- ADR-003: Python Subprocess Execution
- ADR-004: pnpm Monorepo
- ADR-005: React TypeScript Frontend
