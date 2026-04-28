---
name: careful
type: translated
version: 0.1.0
description: |
  destructive コマンドに対する safety guardrail。`rm -rf`、`DROP TABLE`、
  force-push、`git reset --hard`、`kubectl delete` 等の破壊的操作の前に警告する。
  ユーザーは各警告を override 可能。本番環境に触る、live system のデバッグ、
  共有環境で作業する時に使用する。「セーフティモード」「本番モード」「危険コマンドに注意」
  「careful モード」「destructive 警告」と要求されたときに使用する。
allowed-tools:
  - Bash
  - Read
triggers:
  - セーフティモード
  - 本番モード
  - 危険コマンドに注意
  - careful モード
  - destructive 警告
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash $CLAUDE_PROJECT_DIR/.claude/skills/careful/bin/check-careful.sh"
          statusMessage: "危険コマンドをチェック中..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /careful — destructive コマンドのガードレール

セーフティモードが **有効** になった。すべての bash コマンドは実行前に destructive パターンに対して検査される。destructive コマンドが検出されると警告が表示され、続行または中止を選択できる。

## 保護対象

| パターン | 例 | リスク |
|---------|---------|------|
| `rm -rf` / `rm -r` / `rm --recursive` | `rm -rf /var/data` | 再帰削除 |
| `DROP TABLE` / `DROP DATABASE` | `DROP TABLE users;` | データ損失 |
| `TRUNCATE` | `TRUNCATE orders;` | データ損失 |
| `git push --force` / `-f` | `git push -f origin main` | 履歴書き換え |
| `git reset --hard` | `git reset --hard HEAD~3` | 未コミット作業の損失 |
| `git checkout .` / `git restore .` | `git checkout .` | 未コミット作業の損失 |
| `kubectl delete` | `kubectl delete pod` | プロダクション影響 |
| `docker rm -f` / `docker system prune` | `docker system prune -a` | コンテナ / image 損失 |

## 安全例外

以下のパターンは警告なしで許可される：
- `rm -rf node_modules` / `.next` / `dist` / `__pycache__` / `.cache` / `build` / `.turbo` / `coverage`

## 動作の仕組み

hook は tool input JSON からコマンドを読み取り、上記パターンに対して照合する。マッチがあれば `permissionDecision: "ask"` を警告メッセージ付きで返す。警告を override して続行することは常に可能。

無効化するには、会話を終了するか新しい会話を開始する。hook はセッションスコープ。
