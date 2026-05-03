# uzustack Architecture

uzustack は **3 場所** に分散して動作する Claude Code skill ツールキット。本ドキュメントは構造の詳細を示す。

end user 視点の overview は [README.md](README.md#architecture) / メンテナー視点は [CONTRIBUTING.md](CONTRIBUTING.md) の Architecture section を参照してください。本ドキュメントは両 view を補完する設計詳細層です。

---

## 3 つの場所（Three places）

### A. skill 本体

uzustack repo そのもの。end user とメンテナーで配置場所が異なる：

```
~/.claude/skills/uzustack/             ← end user の install 先
└── （`./setup` が `git clone` する先）

~/src/uzustack/                        ← メンテナーの開発用 clone
└── （任意の場所、本ドキュメントは `~/src/uzustack/` を例示）
```

各 skill は repo top に直接配置：

- `<skill>/SKILL.md.tmpl` — 一次ソース（メンテナー編集対象）
- `<skill>/SKILL.md` — 生成物（`bun run gen:skill-docs` で再生成）
- `_upstream/gstack/` — gstack subtree（月次自動 pull）
- `bin/` — runtime CLI（約 50 個）
- `scripts/` — build / `gen-skill-docs.ts` / placeholder engine
- `docs/uzustack/` — 翻訳ガイド + Phase 履歴

メンテナーは `~/.claude/skills/uzustack/` を **作らずに**、`~/src/uzustack/` から `bin/dev-setup` で直接 symlink を貼る（1 clone で開発と利用を兼ねる）。

### B. skill 接続点

Claude Code が skill を探索するフラットディレクトリ：

```
<your-project>/
├── CLAUDE.md                          ← プロジェクト固有の文脈
├── .claude/
│   ├── settings.json                  ← （あれば既存のまま、setup では触らない）
│   ├── CLAUDE.md                      ← （あれば既存のまま、setup では触らない）
│   └── skills/                        ← `./setup` または `bin/dev-setup` が管理
│       ├── investigate/               ← real directory
│       │   └── SKILL.md               ← uzustack repo の SKILL.md への symlink
│       ├── obsidian-audit-tac/        ← Type 2: 個人固有 skill
│       │   └── SKILL.md
│       └── ...                        ← skill ごとに 1 ディレクトリ（フラット配置）
```

**フラット配置が必須**：Claude Code は `.claude/skills/<skill>/SKILL.md` をフラット探索する仕様。`uzustack/<skill>/` のような階層は受け付けないため、skill ごとに real directory + `SKILL.md` symlink を展開する。

`./setup` / `bin/dev-setup` は uzustack 由来 skill のみ管理し、user 独自 skill（Type 2）は保護する。

### C. 状態保存

skill 実行の中間成果物をプロジェクト別 namespace で保存：

```
~/.uzustack/                           ← state ルート
└── projects/
    └── {SLUG}/                        ← プロジェクト別 namespace
        ├── checkpoints/               ← `context-save` skill の保存先
        ├── timeline.jsonl             ← skill 実行の time series log
        └── ...                        ← 各 skill が必要に応じた sub-directory
```

設計原則：

- **プロジェクト別 namespace**：SLUG は `bin/uzustack-slug` が git remote URL から導出（例：`uzumaki-inc-uzustack`）。プロジェクト跨ぎを防ぐ
- **プロジェクト本体を汚さない**：state は `$HOME` 配下、コード / docs リポジトリには残さない
- **クロスマシン同期**（Phase 5 で実装予定）：gbrain による Supabase 連携 backup

この設計は gstack の pattern（`~/.gstack/projects/{SLUG}/`）を踏襲。

---

## Skill typology（3 type 構成）

| Type | 由来 | 配置 | frontmatter | OSS |
|---|---|---|---|---|
| **Type 1** | gstack 翻訳 + 検証 | uzustack repo top `<skill>/` | `type: translated` | ◯ |
| **Type 2** | 個人運用の固有 skill | `<project>/.claude/skills/<skill>/` | 任意（属人化を許容） | ✗ |
| **Type 3** | Type 2 から属人性を抜いた汎用版 | uzustack repo top `<skill>/` | `type: native` | ◯ |

OSS 公開対象は **Type 1 と Type 3** のみ。Type 2 は各 user が自由に試行錯誤する個人領域。これにより「個人依存 skill が OSS を侵さない」 構造的な分離を実現。

**`type:` の意義**：Claude Code は `.claude/skills/<skill>/SKILL.md` をフラット探索するため、Type 1 / Type 3 を別フォルダに分けても配布時には混在する。区別は SKILL.md frontmatter の `type:` フィールドで表現する。

---

## Runtime layer（runtime 層）

uzustack の runtime は **約 50 個の bin script** + テンプレート機構 + voice 翻案ガイドラインから成る。

### bin scripts（`bin/` 配下）

主要 binary：

- `uzustack-slug` — git remote URL → slug 変換、`~/.uzustack/projects/{SLUG}/` の名前空間解決
- `uzustack-config` — config 読み書き（`~/.uzustack/config.yaml`）
- `uzustack-next-version` — VERSION bump（gstack-next-version の翻訳）
- `dev-setup` / `dev-teardown` — メンテナー symlink 展開 / 解除
- `uzustack-gbrain-*` — クロスマシン記憶同期 binary（gbrain 系、Phase 5 で本格活用予定）

完全リストは `bin/` ディレクトリを直接参照（PR #40 / PR #42 / PR #44 / PR #46 / PR #48 で翻訳）。

### テンプレート機構（`scripts/` 配下）

- `gen-skill-docs.ts` — `<skill>/SKILL.md.tmpl` → `<skill>/SKILL.md` 再生成（placeholder 展開を含む）
- `host-config.ts` — host 切替（5 host 対応：claude / codex / kiro / factory / opencode）
- `resolvers/` — placeholder 展開モジュール（preamble / design / review / gbrain 等）

5 host 対応の意図：uzustack は Claude Code only を主対象とするが、テンプレート機構は gstack 由来のため 5 host 切替を保持する。`host: claude` を default として、host ごとの SKILL.md を生成可能。

### voice 翻案ガイドライン

[docs/uzustack/translation-voice-guide.md](docs/uzustack/translation-voice-guide.md) に集約。3 軸構成：

- **文字列軸**：パス / bin 名 / URL の機械置換ルール
- **固有名詞軸**：プロジェクト名 / 用語の維持 / 翻訳ルール
- **voice 軸**：思想 / 規律の翻案ルール

voice 規約 v1（bin 翻訳時に確立、PR #40〜#48）+ v2 拡張（plan / strategy / design / orchestration 系、PR #66〜#118、PR #120 で集約）の 2 層がある。

### freshness CI

`.github/workflows/skill-docs.yml` が PR ごとに以下を実行：

1. `bun install`
2. `bun run gen:skill-docs`
3. `git diff --exit-code`（差分があれば CI 失敗）

「ソース定義（`.tmpl` + `gen-skill-docs.ts`） ↔ 生成物（`SKILL.md`）」 の machine-enforced 整合性。

---

## State preservation layer（状態保存層）

`~/.uzustack/projects/{SLUG}/` 配下に skill 実行の中間成果物を保存。各 skill が独自の sub-directory 構造を持つ：

- `checkpoints/` — `context-save` skill の保存先（`{timestamp}-{title}.md`）
- `timeline.jsonl` — skill 実行の time series log
- `evals/` — paid eval 結果（gstack 由来、Phase 6 で本格活用）
- `learnings/` — 学習履歴（Phase 5 で実装予定）
- 他、各 skill が必要に応じた sub-directory を作成

**SLUG 解決**：`bin/uzustack-slug` が git remote URL を sanitize して slug 化（例：`https://github.com/uzumaki-inc/uzustack` → `uzumaki-inc-uzustack`）。

---

## Phase progression（Phase 進捗）

現在の Phase 進捗：

| 段階 | Phase | 状態 |
|---|---|---|
| **守** | 0c〜3.5（完了 2026-05-02） | gstack を subtree で取り込み、型を確立。runtime + Type 1 翻訳 30 skill + Phase 6 予約スタブ 10 件が揃った |
| **守** | 3.6（進行中） | 土台を構造化。`_upstream-sync/` directory 設計 + root file 4 件先行取込み |
| **守** | 4 | hook + 連鎖機構（`freeze` / `unfreeze` skill pair 翻訳 + `investigate` の hook 復活）|

各 Phase の主要 PR # と完遂事項の詳細は [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md)、守破離の概念詳細は [README.md](README.md#守破離uzustack-の進化段階) を参照。

---

## gstack subtree integration

`_upstream/gstack/` に gstack を subtree として保持。

### 自動化（月 1 で動く）但し upstream-sync 設計を得て実施

毎月 1 日 09:00 JST に GitHub Actions が自動で subtree pull → PR 作成（`.github/workflows/gstack-subtree-pull.yml`）。

### 手動 fallback

```bash
git checkout -b chore/gstack-subtree-pull-$(date +%Y%m%d)
git subtree pull --prefix _upstream/gstack https://github.com/garrytan/gstack.git main --squash
```

### rebase（翻訳済み skill が上流変更を受けた時）

`feature/sync-gstack-<日付>-<skill>` ブランチで再翻訳。詳細手順は [CONTRIBUTING.md](CONTRIBUTING.md#gstack-更新追従) を参照。

`_upstream/gstack/` 配下の編集は禁止（subtree pull の上書き対象）。uzustack 独自編集は repo top の `<skill>/` 配下または root level で行う。

---

## CI / freshness

`.github/workflows/` 配下：

- **`skill-docs.yml`**：PR ごとに `gen:skill-docs` 整合性を検証（前述）
- **`gstack-subtree-pull.yml`**：月次 subtree pull 自動 PR
- **`actionlint.yml`**：GitHub Actions workflow lint

---

## Related docs

- [README.md](README.md) — end user onboarding
- [CONTRIBUTING.md](CONTRIBUTING.md) — メンテナー / Contributor onboarding
- [CLAUDE.md](CLAUDE.md) — Claude Code session 向け project context
- [CHANGELOG.md](CHANGELOG.md) — release notes
- [ETHOS.md](ETHOS.md) — 構築哲学・原則（Boil the Lake / Search Before Building / User Sovereignty / Build for Yourself）
- [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) — Phase 0c〜3.5 進捗 + 主要 PR # 内訳
- [docs/uzustack/translation-voice-guide.md](docs/uzustack/translation-voice-guide.md) — 翻訳 voice ガイド + 訳語表
- [docs/uzustack/translation-rebase-fixes.md](docs/uzustack/translation-rebase-fixes.md) — rebase 時 uzustack 独自 fix
