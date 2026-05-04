# rebase 時に保持すべき uzustack 独自 fix

このドキュメントは uzustack の翻訳版に含まれる **gstack 上流にない uzustack 独自の fix** をまとめたものです。subtree pull は `_upstream/gstack/` 配下しか触らないので物理的に上書きされませんが、`CONTRIBUTING.md` の「rebase の手順」 で翻訳版を上流差分に合わせて書き直す時に、AI / 人間 reviewer が **誤って revert する risk** があります。以下を **必ず維持** してください。

---

## `careful` skill（PR #24 で導入）

| fix | 理由 | 場所 |
|---|---|---|
| `${CLAUDE_SKILL_DIR}` → `$CLAUDE_PROJECT_DIR/.claude/skills/<skill>/bin/...` | Claude Code 公式 env var に揃える（gstack の `${CLAUDE_SKILL_DIR}` は独自拡張で空文字列に展開され、hook script が見つからない） | `careful/SKILL.md.tmpl` の `hooks: command` |
| hook output JSON を `hookSpecificOutput` で wrap、`message` → `permissionDecisionReason` | Claude Code 現行 hook 仕様（gstack 旧 format `{"permissionDecision":"ask","message":"..."}` は無視される） | `careful/bin/check-careful.sh` の出力部 |
| sed regex で `\s+` → `[[:space:]]+` | BSD sed (macOS) は `\s` 非対応で safe exception の RM_ARGS strip が失敗する。POSIX `[[:space:]]+` で macOS / Linux 両対応 | `careful/bin/check-careful.sh` の sed |
| WARN メッセージ日本語化（`危険:` prefix） | uzustack 全体の言語感整合（SKILL.md.tmpl と statusMessage は日本語、warning だけ英語は不整合） | `careful/bin/check-careful.sh` の WARN 文字列 8 種 |

---

## Phase 4 以降の hook 持ち skill 翻訳時の規範

新しい hook 持ち skill（`freeze`、hook 化された `investigate` 等）を翻訳する時も、上記 4 種類の fix パターンを **最初から** 適用すること：

1. **hook command path**：YAML frontmatter の `hooks.PreToolUse[].hooks[].command` で `$CLAUDE_PROJECT_DIR/.claude/skills/<skill>/bin/...` を使う（gstack 原文の `${CLAUDE_SKILL_DIR}` は使わない）
2. **hook output JSON format**：bin script の出力は `hookSpecificOutput` で wrap、message field は `permissionDecisionReason`
3. **sed regex の互換性**：bin script 内の sed で `\s` を使わず POSIX `[[:space:]]+` を使う
4. **user-facing メッセージ**：WARN、status、説明文等は日本語化（uzustack 全体の言語感に揃える）

これにより Phase 4 で同じ修正集積をやり直さずに済む。

---

## `bin/dev-setup` の hardcode bin redirect（PR #129 / #131）

uzustack は `~/.uzustack/` で完結する世界線を持つ設計だが、 上流 gstack の bin の一部は `~/.gstack/<path>` を hardcode で書き、 env override が効かない。 これを `bin/dev-setup` で物理 symlink redirect する：

| fix | 理由 | 場所 |
|---|---|---|
| `redirect_gstack_path()` 関数で 4 path（slug-cache / analytics / projects / installation-id）を `~/.uzustack/` に redirect | 上流 hardcode bin（`gstack-slug` / `gstack-codex-probe` / `gstack-repo-mode` / `gstack-telemetry-log line 134`）が `~/.gstack/` に書く path を物理 redirect。 既存内容は `cp -rn` / `cp -n` で `~/.uzustack/` 側に保全 merge | `bin/dev-setup` 末尾 |
| `bin/dev-teardown` で 4 path symlink を for loop で対称解除 | dev-setup と対称、 内容は `~/.uzustack/` 側に温存 | `bin/dev-teardown` 末尾 |
| `setup` line 403 loop に `_upstream` EXCLUDE 追加 | gstack subtree pull の上書き対象を skill loop から除外。 line 404 の SKILL.md 存在 check で実質 skip されるが、 `_upstream/` 配下に SKILL.md が混入する将来の subtree 形態変化に対する safeguard | `setup` の `link_claude_skill_dirs()` |

**rebase 時の保持**：上流 gstack の `setup` を翻訳取り込む時、 line 403 loop に `_upstream` EXCLUDE が抜けると同じ bug を再発する。 `bin/dev-setup` の `redirect_gstack_path()` 関数も上流に存在しないため、 上流差分を翻訳に取り込む時に該当しない。
