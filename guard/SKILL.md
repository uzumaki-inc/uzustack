---
name: guard
type: translated
version: 0.1.0
description: |
  フル safety mode：destructive コマンド警告 + directory scope の編集制限。
  `/careful`（`rm -rf` / `DROP TABLE` / force-push 等の前に警告）と `/freeze`
  （指定 directory 外の編集を block）を組み合わせる。 本番環境に触る、 live system
  のデバッグ時に最大セーフティとして使用する。「guard モード」「フル safety」
  「lock it down」「最大セーフティ」 と要求されたときに使用する。(uzustack)
triggers:
  - guard モード
  - 本番作業モード
  - 最大防御で
  - 全セーフティ ON
  - 壊すな絶対
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash $CLAUDE_PROJECT_DIR/.claude/skills/careful/bin/check-careful.sh"
          statusMessage: "危険コマンドをチェック中..."
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash $CLAUDE_PROJECT_DIR/.claude/skills/freeze/bin/check-freeze.sh"
          statusMessage: "freeze 境界をチェック中..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash $CLAUDE_PROJECT_DIR/.claude/skills/freeze/bin/check-freeze.sh"
          statusMessage: "freeze 境界をチェック中..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /guard — フル safety mode

destructive コマンド警告と directory scope の編集制限を **両方** 同時に有効化する。 `/careful` + `/freeze` を 1 つの command で発動する組み合わせ skill。

**依存 note**：本 skill は sibling の `/careful` および `/freeze` skill ディレクトリの hook script を参照する。 両方が install されている必要がある（uzustack setup script でまとめて install される）。

```bash
mkdir -p ~/.uzustack/analytics
echo '{"skill":"guard","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.uzustack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## Setup

ユーザーに編集を制限する directory を尋ねる。 AskUserQuestion を使う：

- Question: 「Guard モード：編集をどの directory に制限しますか？ destructive コマンド警告は常に有効です。 選んだ path の外のファイルは編集が block されます。」
- Text input（multiple choice ではない）— ユーザーが path を typed input する。

ユーザーが directory path を提供したら：

1. 絶対 path に解決する：
```bash
FREEZE_DIR=$(cd "<user-provided-path>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. trailing slash を確実にして freeze state file に保存：
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.uzustack}"
mkdir -p "$STATE_DIR"
echo "$FREEZE_DIR" > "$STATE_DIR/freeze-dir.txt"
echo "Freeze 境界を設定: $FREEZE_DIR"
```

ユーザーに伝える：
- 「**Guard モード有効化。** 2 つの保護が動作中：」
- 「1. **destructive コマンド警告** — `rm -rf` / `DROP TABLE` / force-push 等は実行前に警告（override 可能）」
- 「2. **編集境界** — ファイル編集は `<path>/` に制限されています。 この directory 外の編集は block されます。」
- 「編集境界を削除するには `/unfreeze` を実行。 全部解除するには session を終了。」

## 保護対象

destructive コマンドの全パターンと安全例外は `/careful` を参照。 編集境界の動作は `/freeze` を参照。
