# Placeholder convention — uzustack

uzustack docs / rules / skill template での placeholder 命名規則。 gstack upstream の慣例を **uzustack の規律として正式採用** する。 新規 placeholder 導入時の判断軸を機械化することが目的。

対象は中括弧 placeholder（`{}` / `{{}}`）。 山括弧 `<>` 表記は別慣例として本規約の対象外。

## 4 層分類

gstack は placeholder を「展開タイミング × データ出所」 で 4 層に層別している。 uzustack も同分類を採用：

| 層 | 表記 | case style | 用途 | 例 |
|---|---|---|---|---|
| Resolver | `{{NAME}}` | UPPERCASE + double brace | `.tmpl` 内、 build 時に generator 展開（uzustack 直接使用なし、 gstack 識別目的で残置） | `{{PREAMBLE}}` |
| System / per-project path | `{NAME}` | UPPERCASE + single brace | path template の動的部分（system / git derived / cwd） | `{SLUG}` / `{TIMESTAMP}` / `{HOME}` / `{PROJECT_REPO}` / `{CLAUDE_CODE_PROJECT}` |
| User-facing 例示 / 説明文 | `{name}` | lowercase + single brace | docs / 説明文の「ユーザーが値を入れる」 想定 | `{slug}` / `{skill}` / `{branch}` / `{topic}` / `{name}` |
| User 命名自由 | `{some-name}` | kebab-case lowercase | ユーザーが固有名を入れる | `{production-url}` / `{service-name}` |

### 補足：Shell var 表記

bash code block 内では同じ値を `${NAME}` で評価する形で書く（`${SLUG}` / `${HOME}` 等）。 markdown 説明文の `{NAME}` と shell 評価対象 `${NAME}` は同じ値を指す表記 variant、 文脈で使い分ける。

## 新規 placeholder 導入時の判断手順

1. 展開タイミング × データ出所 の組合せを上表で判定し、 case style を決定
2. 既存 uzustack docs / `_upstream/gstack/` で類似 placeholder を grep 確認（一貫性違反検出）

## uzustack 独自 placeholder

gstack に存在しない概念（uzustack 独自）は、 4 層分類に当てはめて導入する。 既知の独自 placeholder：

- `{PROJECT_REPO}` = git root（cwd の git remote から決定）→ system / per-project path layer
- `{CLAUDE_CODE_PROJECT}` = Claude Code 内部の encoded-cwd directory（cwd を `/` → `-` 置換、 例 `-Users-tac-src-uzustack`）→ system / per-project path layer
- `{LOCAL_VAULT}` = メンテナー個人 Obsidian vault root path（machine-specific、 OSS 公開不可な絶対 path を sanitize する）→ system / per-project path layer
- `{LOCAL_VAULT_BACKUP}` = vault の dated backup dir path（同上）→ system / per-project path layer

## 出典 (gstack 慣例)

調査時点（2026-05-06）の gstack 集計傾向：UPPERCASE は per-project path / path template 系で集中、 lowercase は user-facing 説明文（`{slug}` / `{skill}` / `{branch}` 等）で多用、 kebab-case は user 命名自由 context で採用、 shell var は bash code block 内専用。

代表的な使用箇所（line 番号は subtree pull で drift、 必要なら現時点 grep で追跡）：

- `_upstream/gstack/docs/designs/PLAN_TUNING_V0.md` — `{SLUG}` UPPERCASE per-project path
- `_upstream/gstack/bin/gstack-developer-profile` / `gstack-question-preference` — comment 内 `{SLUG}` 使用
- `_upstream/gstack/context-save/SKILL.md.tmpl` — `${SLUG}` shell var 使用例
- `_upstream/gstack/CONTRIBUTING.md` — `{slug}` lowercase 説明文

## 関連 docs

- `~/.claude/CLAUDE.md` — user-level routing rule（5 パターン routing rule）の placeholder 適用例
- `{PROJECT_REPO}/CONTRIBUTING.md` — voice 規約（voice 軸 / 訳語表）
- `{PROJECT_REPO}/ARCHITECTURE.md` — 3 場所 layout / skill typology
- `{PROJECT_REPO}/.claude/rules/translation.md` — 翻訳作業規律
