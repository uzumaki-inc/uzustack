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

---

## `_upstream/gstack/setup` の実行禁止（effect 軸、 PR #131 step-86 / issue #132 / #155）

**禁止事項**：`_upstream/gstack/setup` の execution は **invocation method に関わらず禁止**。 cd した手動 invocation / `bun test` 経由 / bin script からの spawn / 他いずれの経路でも、 gstack setup script の execution 自体が禁止対象。

**effect** (= 一度実行されると同時発生する副作用)：

- `~/.claude/skills/<name>/SKILL.md` の全 symlink が gstack 英語版で上書きされる
- `~/.claude/skills/gstack-upgrade` / `~/.claude/skills/open-gstack-browser` 等 gstack 専用 directory が新規追加される
- `~/.gstack/.last-setup-version` に gstack VERSION が書き込まれる
- 後続の uzustack 翻訳版 skill 発火が gstack 英語版で発火するようになる (= 修復まで日本語 skill が事実上消滅)
- gstack 本家 setup は host 別の install 結果（`.claude/skills/`、 `.codex/skills/`、 `.factory/skills/` 等 11 host dir）を CWD 配下にも作成する
- これらは `_upstream/gstack/.gitignore` で全部 ignored = git track 外、 subtree pull の上書き対象でもない
- しかし Claude Code の skill discovery 仕様（[Automatic discovery from nested directories](https://code.claude.com/docs/en/skills)）= **CWD 配下の `.claude/skills/` を再帰探索**するため、 `<repo>/_upstream/gstack/.claude/skills/` も discoverable
- 結果：uzustack 翻訳済 skill（root level）と subtree 英語版（_upstream 配下）が **同じ skill name で重複表示**される（`/cont` 補完で `/context-save` が日本語 + 英語の 2 件 等）

**主要な発火経路 (= 防御対象)**：

1. **`bun test` 経由** (issue #155、 2026-05-15 12:50 実害発生): `_upstream/gstack/test/team-mode.test.ts:332,345` が `execSync` で `_upstream/gstack/setup -q` を直接 spawn する。 uzustack root の `bunfig.toml` に `[test] pathIgnorePatterns = ["**/_upstream/**"]` を配置することで `bun test` の default discovery から `_upstream/` 配下を除外し block する
2. **手動 `cd _upstream/gstack && ./setup`** (issue #132 / step-86): メンテナーが誤って実行する経路。 規律として禁止
3. **bin script からの spawn** (`_upstream/gstack/bin/gstack-session-update` 等): SessionStart hook 経由で発火する可能性。 現状 `.git` 不在 guard + team mode guard + `~/.claude/settings.json` 未登録 で block 済 (将来 guard が外れる場合は注意)

**運用ルール**：

- gstack 本家 setup を試したい場合は **uzustack repo の外**で実行する（例：別 clone `~/src/gstack-test/` 等）
- `bun test` を uzustack root から実行する場合は `bunfig.toml` の guard が効いていることを前提とする（消去・上書きしない）
- agentic session が誤って `_upstream/gstack/setup` を起動した場合は、 即時に手動 cleanup（下記）+ `./bin/dev-setup ~` で symlink を uzustack 翻訳版に復元

**再発時の手動 cleanup**：

```bash
cd /path/to/uzustack
rm -rf \
  _upstream/gstack/.claude \
  _upstream/gstack/.codex \
  _upstream/gstack/.factory \
  _upstream/gstack/.hermes \
  _upstream/gstack/.gbrain \
  _upstream/gstack/.kiro \
  _upstream/gstack/.opencode \
  _upstream/gstack/.openclaw \
  _upstream/gstack/.slate \
  _upstream/gstack/.cursor \
  _upstream/gstack/.agents

# symlink を uzustack 翻訳版に復元
./bin/dev-setup ~

# 残存する gstack 専用 dir (gstack-upgrade / open-gstack-browser) も削除
rm -rf ~/.claude/skills/gstack-upgrade ~/.claude/skills/open-gstack-browser ~/.claude/skills/gstack
```

これらは git track 外なので削除しても repo 状態は変わらず、 commit も発生しない（手動 1 度の cleanup として完結）。
