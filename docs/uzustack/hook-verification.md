# Hook 機構の発動経路検証 (Phase 4 多 skill 連鎖)

issue [#166](https://github.com/uzumaki-inc/uzustack/issues/166) (epic [#152](https://github.com/uzumaki-inc/uzustack/issues/152)) の検証成果物。 PR #24 で確立した hook 機構の基本動作 + path 解決経路が、 Phase 4 で同時 active になる 4 hook 持ち skill (`freeze` / `unfreeze` / `guard` / `investigate`) すべてで再利用可能であることを検証した「実機 log の epitomized observation」。

## 検証対象 4 skill

| skill | hooks block | matcher | bin script | type |
|-------|-------------|---------|------------|------|
| `careful` | あり | Bash | `careful/bin/check-careful.sh` (own) | warn (permissionDecision: ask) |
| `freeze` | あり | Edit + Write | `freeze/bin/check-freeze.sh` (own) | block (permissionDecision: deny) |
| `unfreeze` | なし (state 削除のみ) | — | — | n/a (design 通り) |
| `guard` | あり | Bash + Edit + Write | `careful/bin/check-careful.sh` + `freeze/bin/check-freeze.sh` (sibling borrow) | combo |
| `investigate` | あり (本 PR で復活) | Edit + Write | `freeze/bin/check-freeze.sh` (sibling borrow) | debug-scope boundary |

## PR #24 で確立済の技術前提 (本 PR で再確認)

1. **公式 env var の使用**: `${CLAUDE_SKILL_DIR}` は **Claude Code 公式 env var ではない** (gstack 独自拡張)。 `$CLAUDE_PROJECT_DIR` を使い、 絶対 path で記述する: `$CLAUDE_PROJECT_DIR/.claude/skills/<skill>/bin/...`
2. **hook output JSON format**: `hookSpecificOutput` で wrap。 旧 format (`{"permissionDecision":"ask","message":"..."}`) は **現行 Claude Code に無視される**
3. **field 名**: `message` ではなく `permissionDecisionReason`。 `hookEventName: "PreToolUse"` を併記
4. **permissionDecision 値域**: `"ask" | "allow" | "deny" | "defer"`
5. **`bin/dev-setup` の SKILL.md + bin/ 両 symlink**: hook 持ち skill では `<skill>/bin/` も symlink する logic を持つ。 bin/ がない skill (unfreeze / 他) には影響なし

## Static audit 結果 (4 skill すべてで規律準拠を確認)

| 検証項目 | careful | freeze | guard | investigate |
|---------|---------|--------|-------|-------------|
| `$CLAUDE_PROJECT_DIR` 使用 | ✓ | ✓ | ✓ (3 path) | ✓ (2 path) |
| 絶対 path 記述 | ✓ | ✓ | ✓ | ✓ |
| `hookSpecificOutput` wrap | ✓ (own bin) | ✓ (own bin、 **本 PR で migrate**) | ✓ (借用 bin 両方) | ✓ (借用 bin) |
| `permissionDecisionReason` field 名 | ✓ | ✓ (**本 PR で migrate**) | ✓ | ✓ |
| `hookEventName: "PreToolUse"` 併記 | ✓ | ✓ (**本 PR で migrate**) | ✓ | ✓ |
| statusMessage 日本語化 | ✓ | ✓ | ✓ | ✓ (**本 PR で復活**) |
| `sensitive: true` | ✓ | ✓ | ✓ | (preamble-tier 2、 sensitive 不要) |

## Functional simulation 結果

uzustack repo 内で bin script に simulated Claude Code tool_input JSON を pipe して output を直接検証。 Mode A 環境下での動作確認に相当。

### `check-careful.sh` (uchanged from PR #24)

- input: `{"tool_name":"Bash","tool_input":{"command":"rm -rf /tmp/anything"}}` → `permissionDecision: "ask"` + warn message ✓
- input: `{"tool_name":"Bash","tool_input":{"command":"rm -rf node_modules"}}` (safe exception) → `{}` ✓
- input: `{"tool_name":"Bash","tool_input":{"command":"ls"}}` → `{}` ✓
- output JSON: `python3 -c 'import json; json.loads(...)'` で structural valid ✓

### `check-freeze.sh` (本 PR で migrate 後)

- input: Edit outside freeze boundary → `permissionDecision: "deny"` + hookSpecificOutput wrap + permissionDecisionReason ✓
- input: Edit inside freeze boundary → `{}` ✓
- input: no freeze state set → `{}` ✓
- output JSON: structural valid ✓

## 発見事項 (#166 verification で surface した実害 2 件)

### (a) `check-freeze.sh` output format drift

PR #153 (freeze 翻訳) で旧 format (`permissionDecision` + `message`) のまま導入。 PR #24 で careful が新 format (`hookSpecificOutput` wrap) に先行 migrate していたため、 uzustack 内で hook output format が不整合 (= freeze hook が silent に block 失敗する可能性)。

**本 PR の fix**: commit `ae0fe87` で `check-freeze.sh:77` を新 format に migrate。 careful と同 escape pattern (`sed 's/"/\\"/g'`) を `FILE_PATH` / `FREEZE_DIR` 両変数にも適用。

### (b) `investigate` hooks block 消失

upstream `_upstream/gstack/investigate/SKILL.md.tmpl:29-42` に `hooks: PreToolUse (Edit + Write → ../freeze/bin/check-freeze.sh)` が存在するが、 uzustack 翻訳版に hooks block 自体が無い。 「debug 作業中の編集境界を limit する」 という upstream 設計意図が完全に落ちていた。

**本 PR の fix**: commit `3af7cb9` で `investigate/SKILL.md.tmpl` に hooks block を復活。 path 翻案 (`${CLAUDE_SKILL_DIR}/../freeze/` → `$CLAUDE_PROJECT_DIR/.claude/skills/freeze/`) + statusMessage 翻案 (`"Checking debug scope boundary..."` → `"デバッグ scope の境界をチェック中..."`、 voice 規約 v1 の English-locked + Japanese gloss pattern)。

## Mode A / Mode B 差 (PR #24 確認済 pattern の再確認)

- **Mode A (uzustack repo 内)**: `bin/dev-setup` で `.claude/skills/<skill>/` 配下に SKILL.md + bin/ の symlink が貼られる。 hook 持ち skill 4 件 (careful / freeze / guard / investigate) すべてで `$CLAUDE_PROJECT_DIR/.claude/skills/<name>/bin/...` が解決可能。 functional simulation で動作確認済
- **Mode B (外部プロジェクト)**: 外部 project の `$CLAUDE_PROJECT_DIR` には uzustack skill が install されていないため、 hook command path が解決不可。 Claude Code の permission layer で **hook 起動前に短絡** される (= good practice な multi-layer security)。 PR #24 で careful 単独時に確認済の pattern。 多 skill 連鎖 (`guard` の 3 matcher 同時 active) でも同 pattern が成立 (path 形式が careful と同一のため、 失敗 mode も同一)

## upstream tech debt 観測リスト (本 PR で追加識別、 単独修正は守期間 skip)

- **`_resolve_path()` の fail-silent**: `freeze/bin/check-freeze.sh:55-61` の `cd "$_dir" 2>/dev/null && pwd -P || printf '%s' "$_dir"` で、 ターゲット dir が存在しない場合 silent に unresolved path に fallback。 結果として macOS の `/var/folders` (symlink) vs `/private/var/folders` (realpath) の不整合で正しいはずの path が boundary 外と判定される edge case あり。 upstream gstack でも同 pattern、 単独修正は upstream PR 候補に分離 (破移行時に再評価)
- **JSON escape の不完全性**: `sed 's/"/\\"/g'` は `"` のみ escape、 backslash や制御文字は未対応。 path に `\` を含む edge case で JSON 構文崩れの可能性 (Unix / macOS では稀)。 careful / freeze 両 bin で同 pattern、 upstream tech debt 観測リストに分離

## Phase 5 `_upstream-sync/` 設計への申し送り

本 PR で確立した 4 hook 持ち skill の整合性を、 Phase 5 で `_upstream-sync/` パイプラインに乗せる際の **technical 前提**として参照可能:

1. **hooks block の path 翻案規律**: `${CLAUDE_SKILL_DIR}/...` → `$CLAUDE_PROJECT_DIR/.claude/skills/<name>/...` の機械置換は upstream → uzustack 同期時の必須 transform。 `_upstream-sync/` の transform layer に組み込む
2. **statusMessage の voice 翻案規律**: upstream の意図的 framing distinction (例: investigate の `"Checking debug scope boundary..."` は freeze の `"Checking freeze boundary..."` と意図的に違う) を carry-through する規律。 機械翻訳ではなく voice 翻案として通す必要がある
3. **hook output format の新 / 旧 format 検出**: upstream が旧 format のままの bin script を新 format に migrate する transform を `_upstream-sync/` に組み込む候補。 ただし careful / freeze 以外で hook output 持つ bin script が現状なし、 必要性は将来 hook 持ち skill 追加時に再評価

## user-side real-fire 検証手順 (optional follow-up)

本 PR では simulation evidence + static audit で acceptance criteria を満たしている。 完全な real-fire 検証 (= 実際の Claude Code session で hook が発動する) は session 独立性の理由から本 session 内で実施せず。 user-side で別 session を立てて以下を実行することで追加検証可能:

```bash
# Mode A test (uzustack repo 内で別 session 起動 + Claude Code が PreToolUse hook を fire)
cd ~/src/uzustack
bin/dev-setup  # SKILL.md + bin/ symlink を再生成
# 別 terminal で claude --skill careful などを起動、 destructive cmd を試す → ask 警告が出る
# 別 terminal で claude --skill freeze を起動、 freeze 設定後 outside Edit → deny block

# Mode B test (外部プロジェクト)
cd /tmp/some-other-project
# claude --skill careful → hook command path 解決不可 → permission layer で短絡
```

real-fire 観察 log は本 doc の追補として `## user-side real-fire 観察 log (YYYY-MM-DD)` section を追加して記録する運用とする。
