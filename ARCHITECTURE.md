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

[docs/uzustack/translation-voice-guide.md](docs/uzustack/translation-voice-guide.md) に集約。読者目的別の 3 章構成（第 1 章 translator 用 / 第 2 章 メンテナー用 / 第 3 章 validator 用）+ Appendix A（成立履歴）。第 1 章 1.1 の機械置換ルールは 3 軸：

- **文字列軸**：パス / bin 名 / URL の機械置換ルール
- **固有名詞軸**：プロジェクト名 / 用語の維持 / 翻訳ルール
- **voice 軸**：思想 / 規律の翻案ルール

voice 規約 v1（Phase 3 bin 翻訳）+ v2（Phase 3.5 plan / strategy / design 系）+ v2 拡張（Phase 4 機械化）の 3 段階、詳細は Appendix A 参照。

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

### `~/.gstack/` との世界線分離

uzustack は `~/.uzustack/` で完結する世界線を持つ設計。 上流 gstack の `gstack-*` bin が `~/.gstack/` に書く path は、 二系統で `~/.uzustack/` に redirect する：

- **env override 経路**（25+ bin）：`${GSTACK_HOME:-$HOME/.gstack}` or `${GSTACK_STATE_DIR:-$HOME/.gstack}` で env 指定可能。 翻訳済 skill 経由では呼ばれないため対応不要だが、 上流互換のため env も指定可能（uzustack-config 系は `UZUSTACK_HOME` 独立 env を使用）
- **symlink 物理 redirect 経路**（4 path、 真の hardcode）：`bin/dev-setup` の `redirect_gstack_path()` で物理 symlink redirect
  - `~/.gstack/slug-cache/` → `~/.uzustack/slug-cache/`（PR #129）
  - `~/.gstack/analytics/` → `~/.uzustack/analytics/`（PR #131）
  - `~/.gstack/projects/` → `~/.uzustack/projects/`（PR #131）
  - `~/.gstack/installation-id` → `~/.uzustack/installation-id`（PR #131）
- 各 redirect は既存内容を `cp -rn` で `~/.uzustack/` 側に保全 merge してから symlink 化、 idempotent

`bin/dev-teardown` で 4 path 対称解除（symlink のみ削除、 内容は `~/.uzustack/` 側に温存）。

---

## (1) browser 機構 と (2) ワークフロー skill の依存関係

gstack の `_upstream/gstack/ARCHITECTURE.md:5-7` は次のように articulate する：

> "gstack gives Claude Code a persistent browser and a set of opinionated workflow skills. **The browser is the hard part — everything else is Markdown.**"

uzustack はこの 2 構成要素を **部分的依存** として引き受ける：

- **(1) 永続的 browser 機構** — Playwright + Chromium + Chrome extension + browser-manager。 gstack 著者自身が「the hard part」 と認める領域
- **(2) ワークフロー skill 群** — Markdown / docs 層で記述される skill 本体

依存関係の全数 grep 結果（gstack 全 43 skill 対象）：

| 分類 | 件数 | 例 |
|---|---|---|
| (1) 必須依存 | 13〜14 (32%) | browse / qa / qa-only / canary / benchmark / make-pdf / design-review / design-consultation / devex-review / land-and-deploy / open-uzustack-browser / pair-agent / connect-chrome / setup-browser-cookies |
| (1) optional 依存 | 2 (5%) | design-html / design-shotgun |
| (1) 非依存 | 28 (65%) | ship / review / investigate / cso / codex / claude / context-* / learn / office-hours / plan-* / retro / health / autoplan 等 |

**uzustack 守完走判定の base = 30 skill (browser 非依存 28 + optional 依存 2)**。 (1) 必須依存 14 skill (13 機能 + connect-chrome alias) は Phase 6 で実装検討として正式に位置付け、 SKILL.md.tmpl 先頭に warning block を統一配置する。 詳細 list と evidence は [docs/uzustack/phase6-pending-skills.md](docs/uzustack/phase6-pending-skills.md)、 共通 warning block の source of truth は [docs/uzustack/phase6-warning-block.md](docs/uzustack/phase6-warning-block.md) を参照。

**判定基準** (= Agent 2 grep 結果と本文 broad grep の cross-check で確定): 「`{{BROWSE_SETUP}}` placeholder の存在」 ≠ browse 必須 (= placeholder engine の resolver が空文字列を返し SKILL.md 生成時に削除される)。 必要なのは (a) SKILL.md 本文に browse 機構を呼ぶ literal instruction があるか、 (b) bin / shell command で browse を呼ぶか — の 2 条件。 fact-check の audit trail は CHANGELOG.md [0.3.5.1] entry を参照。

---

## Phase progression（Phase 進捗）

現在の Phase 進捗：

| 段階 | Phase | 状態 |
|---|---|---|
| **守** | 0c〜3.5（完了 2026-05-02） | gstack を subtree で取り込み、型を確立。runtime + Type 1 翻訳 + Phase 6 予約スタブ合計 40 skill が揃った |
| **守** | 3.6（進行中） | 土台を構造化。`_upstream-sync/` directory 設計 + root file 4 件先行取込み + browse 機構必須 14 skill の Phase 6 待ち明文化統一 |
| **守** | 4 | hook + 連鎖機構（`freeze` / `unfreeze` skill pair 翻訳 + `investigate` の hook 復活）|
| **破** | 6（着手予定） | browse 機構実装（Playwright + Chromium + browser-manager + extension）。 14 skill の動作実装で守完走判定 30 skill から 43 skill 範囲に拡張 |

各 Phase の主要 PR # と完遂事項の詳細は [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md)、守破離の概念詳細は [README.md](README.md#守破離uzustack-の進化段階) を参照。

---

## 守破離における Phase 6 の位置付け

守期間中の uzustack は「完璧複製 + voice 翻案」 の規律 pair で動いてきた。 gstack 著者自身が「browser is the hard part」 (`_upstream/gstack/ARCHITECTURE.md:5-7`) と認める browse 機構は、 完璧複製規律の限界点に位置する。

Phase 6 で uzustack が取り得る選択肢は 3 つ。 選択肢 1 は守の延長 (= 完璧複製規律の維持)、 選択肢 2 / 3 は守の延長ではなく **破の前段** と位置付ける：

- **選択肢 1: Type 1 維持で取り込み** — 機構複製の規律の「upstream 完璧コピー」 を維持したまま、 browse 機構を `_upstream/gstack/browse/` 経由で取り込む path。 voice 翻案を browse 機構について諦める前提 (= browse 機構の英語 error / output / Chromium binary 出力 は upstream voice そのまま passthrough)
- **選択肢 2: Type 3 化に向けての準備** — voice 翻案規律は維持しつつ、 機構複製の規律を「upstream 完璧コピー」 から「機能等価 + uzustack 設計判断」 に転換する。 14 skill を uzustack 独自設計で動作実装に踏み込む path
- **選択肢 3: uzustack に取り入れない決断** — 14 skill の動作実装を一旦断念し、 browse 機構領域を uzustack のスコープ外として明示する path。 翻訳された SKILL.md は維持するが、 動作実装には踏み込まない

これは「translation overkill / shim path 提案を builder 学習軸で reject」 規律の自然な帰結 — 守期間に翻訳・運用で得た「動作する 26 skill」 の dogfood 経験を踏まえ、 browse 機構が builder 学習の variant として価値があるかを Phase 6 着手時に判断する。 どれを選ぶかは Phase 6 着手時の意思決定。

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

### `_upstream/gstack/setup` を実行しない（effect 軸）

`_upstream/gstack/setup` の execution は **invocation method に関わらず禁止**（cd した手動 invocation / `bun test` 経由 / bin script からの spawn / 他いずれの経路でも）。 一度実行されると次の effect が同時発生する：

- `~/.claude/skills/<name>/SKILL.md` の全 symlink が gstack 英語版で上書きされる
- `~/.claude/skills/gstack-upgrade` / `~/.claude/skills/open-gstack-browser` 等 gstack 専用 dir が追加される（uzustack には翻訳済 `uzustack-upgrade` / `open-uzustack-browser` があるため dir 自体が不要、 流入したら削除する）
- `~/.gstack/.last-setup-version` に gstack VERSION が書き込まれる
- 後続の uzustack 翻訳版 skill 発火が gstack 英語版で発火するようになる (= 修復まで日本語 skill が事実上消滅)
- host install dir（`.claude/skills/` 等 11 系統）が `_upstream/gstack/` 内に作られ、 Claude Code の skill discovery（CWD 配下の `.claude/skills/` を再帰探索する monorepo 仕様）により subtree 英語版が翻訳版と重複表示される
- host install dir は `_upstream/gstack/.gitignore` で git track 外、 subtree pull の上書き対象でもないため、 一度作られると物理 rm 必要

主要な発火経路 (= 防御対象):

1. **`bun test` 経由** (issue #155): uzustack root の `bunfig.toml` に `[test] pathIgnorePatterns = ["**/_upstream/**"]` を配置して default discovery から除外
2. **手動 `cd _upstream/gstack && ./setup`** (issue #132 / step-86): 規律として禁止
3. **bin script からの spawn**: 現状 guard で block 済（将来注意）

詳細は [docs/uzustack/translation-rebase-fixes.md](docs/uzustack/translation-rebase-fixes.md) 参照（issue #132 / step-86 / #155）。

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
