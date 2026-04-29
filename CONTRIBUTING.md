# Contributing to uzustack

uzustack の開発に貢献していただきありがとうございます。このドキュメントは **メンテナー・コントリビューター向け** の開発ガイドです。

end user として uzustack を使うだけの方は [README.md](README.md) を参照してください。

---

## 個人メンテナーの OSS について

uzustack は **個人メンテナーによる OSS** です：

- PR は歓迎しますが、対応の保証はありません
- 翻訳の改善・新スキル提案・バグ修正も歓迎
- バグ報告・機能要望は [Issue](https://github.com/uzumaki-inc/uzustack/issues) へ

---

## Quick Start（メンテナー / Contributor 向け）

メンテナーは `~/.claude/skills/uzustack/` を **作らずに**、開発用 clone から直接 symlink を貼ります。これにより **1 clone で開発と利用を兼ねられます**。

### 前提

- [Claude Code](https://claude.com/claude-code) インストール済み
- [bun](https://bun.sh/) インストール済み
- Git アカウント・GitHub 認証

### 1. 開発用 clone

```bash
git clone https://github.com/uzumaki-inc/uzustack.git ~/src/uzustack
cd ~/src/uzustack && bun install
```

（任意の場所に clone してよいが、本ガイドは `~/src/uzustack/` を例として使用）

### 2. dev-setup で symlink を貼る

`bin/dev-setup` には 2 つのモードがあります：

#### モード A：引数なし（uzustack repo 自身でセルフ symlink）

```bash
cd ~/src/uzustack
bin/dev-setup
```

`~/src/uzustack/.claude/skills/<skill>/SKILL.md` を各 skill への symlink として展開。これで **uzustack repo の中で Claude Code を起動** して、開発中の skill を即座にテストできます。

#### モード B：引数あり（外部プロジェクトに開発中 symlink）

```bash
cd ~/src/uzustack
bin/dev-setup ~/path/to/your-project
```

任意の外部プロジェクト（例：自前の開発リポジトリ）の `.claude/skills/<skill>/SKILL.md` を uzustack repo 配下の各 skill への symlink として展開。実プロジェクトで開発中の skill をテストする用途。存在しないパスを渡すと error で exit。

> 💡 **teardown**：モード A は `bin/dev-teardown`、モード B は `bin/dev-teardown ~/path/to/your-project` で対応（uzustack 由来 symlink のみ削除、ユーザー独自 skill は保護されます）。

> 💡 **end user 向けの正式 install は `./setup`** を使います（`bin/dev-setup` はメンテナー向けの開発用）。

### 3. 動作確認

symlink を貼ったプロジェクトで Claude Code を起動し、`/investigate` 等のスキルが呼び出せることを確認してください。

---

## Architecture（メンテナー / Contributor の場合）

メンテナーは **`~/.claude/skills/uzustack/` を作りません**。代わりに開発用 clone（`~/src/uzustack/`）から直接 symlink を貼ります。

```
<your-project>/                       ← Claude Code を起動する場所
├── .claude/
│   └── skills/                        ← Claude Code が skill を探索するディレクトリ（フラット配置）
│       ├── investigate/               ← uzustack 由来 skill（dev-setup が展開）
│       │   └── SKILL.md
│       ├── obsidian-audit-tac/        ← Type 2: 個人固有スキル
│       │   └── SKILL.md
│       └── ...                        ← skill ごとに 1 ディレクトリ

~/src/uzustack/                        ← 開発用 clone（メンテナーはこれ 1 つだけ）
├── investigate/                       ← skill 1 個 = 1 ディレクトリ（frontmatter: type: translated）
│   ├── SKILL.md.tmpl                  ← 一次ソース（メンテナーが編集）
│   └── SKILL.md                       ← 生成物（gen:skill-docs で再生成）
├── <other-skills>/                    ← repo top に直接配置
├── _upstream/
│   └── gstack/                        ← gstack を subtree で保持（git subtree pull で最新化）
├── bin/dev-setup                      ← .claude/skills/ への symlink + flat 展開
└── setup                              ← end user 向け（メンテナーは使わない）
   ※ ~/.claude/skills/uzustack/ は作らない

~/.uzustack/                           ← 生成物・状態保存（end user と同じ）
```

- **skill 本体の場所**：`~/src/uzustack/`（開発用 clone、end user での `~/.claude/skills/uzustack/` に相当）。各 skill は repo top に直接配置（`<skill>/SKILL.md`）、Type 1/3 の区別は SKILL.md frontmatter の `type:` フィールドで表現
- **symlink を貼る作業**：`bin/dev-setup` が自動化（gstack の `setup` から `link_claude_skill_dirs` ロジックを継承）。Claude Code が `.claude/skills/<skill>/SKILL.md` をフラットに探索する仕様に合わせるための展開
- **メリット**：開発した skill が即座にプロジェクトで使える。バージョンずれゼロ・pull 重複なし

end user 視点の Architecture は [README.md](README.md#architecture) を参照してください。

---

## 開発フロー

### ブランチ運用

- **`main` ブランチ**：安定版（end user が利用する版）
- **`feature/<機能名>` ブランチ**：開発作業用
- 開発時に `git checkout -b feature/translate-investigate` のようにブランチを切る
- 完成したら `main` へ PR / merge

これにより、開発中の壊れた変更が `main` ブランチで利用中の自分（メンテナー兼利用者）に影響しません。

### PR の流れ

1. `feature/<機能名>` ブランチで開発
2. `bin/dev-setup` 経由で動作確認
3. push して GitHub で PR 作成
4. `skill-docs.yml`（freshness CI）が自動実行されることを確認
5. CI が通ったら self-merge or レビュー後に merge

---

## gstack 更新追従

uzustack は gstack を `_upstream/gstack/` に **subtree** として保持しています。

### 自動化（推奨、月 1 で動く）

**毎月 1 日 09:00 JST に GitHub Actions が自動で subtree pull → PR 作成** します（`.github/workflows/gstack-subtree-pull.yml`）。メンテナーは届いた PR を以下の手順でレビューします：

1. diff stat を確認し、想定外の量・領域に変更が及んでいないか確認
2. uzustack 独自部分（repo top の skill / setup / bin / README 等）に影響がないことを確認
3. 翻訳済み skill（frontmatter `type: translated`）の `_upstream/gstack/<skill>/` 側に変更があれば、再翻訳の必要性を判断（rebase 手順は step 23 で確立予定）
4. OK なら squash merge

**手動実行**（緊急で取込みたい / workflow 動作確認）：

```bash
gh workflow run gstack-subtree-pull.yml
```

または GitHub の Actions タブから "gstack subtree pull (monthly)" → "Run workflow"。「変更なし」なら no-op で終了します。

### 手動 fallback（自動 PR が衝突して fail した時）

```bash
cd ~/src/uzustack
git checkout -b chore/gstack-subtree-pull-$(date +%Y%m%d)
git subtree pull --prefix _upstream/gstack https://github.com/garrytan/gstack.git main --squash
# 衝突があれば手動で解決（git status で衝突ファイル確認 → 編集 → git add → git commit）
git push -u origin chore/gstack-subtree-pull-$(date +%Y%m%d)
gh pr create
```

### 取込み後の翻訳 rebase

自動 PR の中に翻訳済み skill（`type: translated`）の上流変更が含まれていたら、[翻訳ガイド](#翻訳ガイドgstack-の英語スキルを翻訳する場合) の「rebase の手順」を参照して再翻訳します。uzustack 独自部分（`type: native`）は gstack 更新と無関係。

---

## Type 2 → Type 3 への昇華プロセス

uzustack の独自貢献ポイント：個人で熟成したスキル（Type 2）を、属人性を抜いて汎用版（Type 3）として OSS に昇華させる。

### 昇華の判断基準

- 個人プロジェクトで繰り返し使った（実用性の証明）
- プロジェクト構造・ファイル命名・固有概念名などの **属人的依存が抜けた**（or 抜くことができる）
- 他のユーザーにも価値がある（汎用化の意義）

### 昇華の手順

1. Type 2（個人プロジェクト内 `personal/<skill>`）の現状を整理
2. 属人的な依存（具体的なファイルパス、固有の概念名等）を **設定で外出し** または **抽象化**
3. `~/src/uzustack/skills/native/<skill>/` に新規作成（コピー & 汎用化）
4. README の Available Skills を更新
5. PR

> 📝 **重要**：personal（Type 2）と uzustack（Type 1/3）は **直接の相互参照をしません**。価値の流れは「Type 2 → Type 3 への昇華」というメタプロセスで担います（Skill 同士の依存関係グラフを作らない設計）。

---

## テスト・freshness CI

### gen:skill-docs

`bun run gen:skill-docs` で全スキルの `SKILL.md` が再生成されます。コミット済みの `SKILL.md` と差分が出なければ整合性が保たれています。

### .github/workflows/skill-docs.yml

push / PR ごとに以下を実行：
- `bun install`
- `bun run gen:skill-docs`
- `git diff --exit-code`（差分があれば CI 失敗）

→ 「ソース定義 ↔ 生成された SKILL.md」の整合性を機械的に保証します。

---

## 翻訳ガイド（gstack の英語スキルを翻訳する場合）

このセクションは「新規に翻訳する」と「既存翻訳が上流更新された時に rebase する」の 2 種類の作業をカバーします。step 15（`investigate` 初翻訳、PR #5）の経験を型化したものです。

### 配置とメタデータ（共通）

- 翻訳済みは uzustack repo top の `<skill>/` に直接配置（例：`investigate/SKILL.md.tmpl`）、未翻訳は `_upstream/gstack/<skill>/` のまま
- `SKILL.md.tmpl` frontmatter に **`type: translated`** を必ず付与（Type 1 識別。`type: native` は uzustack 独自・汎用スキル用）
- 自動起動 trigger は日本語の発動語彙（「デバッグして」「このバグを直して」等）を frontmatter の `description` に含める

### 翻訳の粒度（守破離の段階的移行）

- 翻訳は **「守」段階では原文に忠実に**（用語のみ日本語化）
- 経営者コンテキストへの翻案は **「破」段階で**（数ヶ月後）
- **gstack 専用機構** は機械的踏襲ができないため、Phase 1 では削除（論点 5、段階的取り込み）：
  - `{{PREAMBLE}}`、`{{LEARNINGS_SEARCH}}`、`{{LEARNINGS_LOG}}`、`{{GBRAIN_CONTEXT_LOAD}}`、`{{GBRAIN_SAVE_RESULTS}}` の placeholder
  - `hooks:` frontmatter（`freeze` 等の他 skill との連携）
  - bash 内の `~/.claude/skills/gstack/bin/*` 呼び出し（uzustack に対応バイナリが未実装のため）
- これらは uzustack 版バイナリ（`bin/uzustack-config` 等）が整備された後の Phase 3 以降で段階的に再取り込み
- **メソッド本体**（Iron Law、Phase 構造、Important Rules、レポート形式 等）は **原文忠実に翻訳**

### 置換ルール表 v1

step-35 以降の bin 機械翻訳と既存 skill の .tmpl 化が「**置換ルール表を見るだけ**」で進むよう、`gstack` → `uzustack` の機械置換ルールを明文化する。step-32 で確定した型と申し送りを出発点に、3 軸構成で整理。

#### 文字列軸（パス・bin 名・URL 等）

| gstack | uzustack |
|---|---|
| `~/.gstack/` | `~/.uzustack/` |
| `$GSTACK_HOME` | `$UZUSTACK_HOME` |
| `gstack-*` | `uzustack-*` |
| https://github.com/garrytan/gstack | https://github.com/uzumaki-inc/uzustack |
| `~/.claude/skills/gstack/` | `~/.claude/skills/uzustack/` |

**注意**：長いパターンから先に置換すること。`gstack-config` → `uzustack-config` を先、`gstack` → `uzustack` を後。逆順だと `uzustackconfig` のような壊れ方をする。

#### 固有名詞軸

| gstack | uzustack |
|---|---|
| Garry Tan | uzustack 開発者 |
| Y Combinator / YC | スタートアップ |
| Garry Tan 個人を指す箇所 | OSS メンテナー |

#### voice 軸（思想・規律の翻案）

原文を尊重する目的で、訳語と併記する形で残す。

| gstack | uzustack |
|---|---|
| Boil the Lake | 一晩でやり切る（Boil the Lake） |
| Search Before Building | 作る前に探す（Search Before Building） |
| "the gstack way" | "uzustack の流儀"（"the gstack way"） |

#### 周辺ルール

- **CONFIG_HEADER の日本語化方針**：gstack `gstack-config` の英語コメント約 70 行は、step-32 で英語のままコピーで保留。本ルール表整備後、step-37（DEFAULTS 連動チェック）と整合させて日本語化する
- **DEFAULTS の意味論判断は step-37 集中**：gstack 文字を含まない key（例：`gbrain_sync_mode`）は機械置換せず、step-37 の brain 系翻訳時に集中判断
- **v1 で完璧を目指さない**：翻訳作業中に増えるケースは追記して育てる方針。迷ったら `v2 で見直し` フラグ付きで暫定採用し、翻訳作業を止めない

### voice 規約 v1（cluster B = bin 翻訳で確立）

Phase 3 cluster B（bin 翻訳、step-35〜39、PR #40 / #42 / #44 / #46 / #47）で確立した voice 翻案規律。bash + 副言語 embedded スクリプトの翻訳に適用する。本節は cluster B 完了 (step-39) で PR description / memory に分散していた規範を集約したもの。

#### 7 項目（cluster B step-35 = PR #40 commit `d1b2c0f` で確立）

1. **Section 見出し**（`Usage:` / `Behavior:` / `Exit codes:`）は **英語維持** — CLI 慣習に合わせる
2. **エラーメッセージは客観形（日本語）**：「〜が必要、実際は N 個」のような客観事実、責難形（「〜してください」）は避ける
3. **インラインコメントは簡潔な日本語**、技術用語は backtick で英語維持
4. **fixed identifier**（`base` / `ours` / `theirs`、API 名）は **英語維持**
5. **bin 名**は backtick 囲み（例：`uzustack-config`）
6. **embedded code** 内コメント（Python heredoc / bun -e の JS 等）も日本語化、技術用語は英語維持
7. **括弧**は半角 `(...)` を維持

#### 運用方針 v1

- **bash + 副言語 embedded** は副言語コメントも日本語化（cluster B step-36 で確立、Python heredoc / bun -e の JS で適用）
- **TypeScript / 主言語そのもの**は英語維持（reader 想定の言語と一致させる、cluster B step-35 `uzustack-next-version` 477 行 TS で確立）
- **embedded Python heredoc 内の error 文字列** も日本語化対象（cluster B step-37 `uzustack-brain-init` / `uzustack-brain-restore` で確認、voice 規約 v1 項目 2 が境界を貫通する）

#### 外部 SaaS / 別プロジェクト identifier 維持（step-37 拡張）

voice 規約 v1 項目 4「fixed identifier 英語維持」を、外部 SaaS や別プロジェクトの identifier にも拡張する。`gstack` 由来は `uzustack` に置換するが、以下は **維持**：

- **外部 CLI 名**：`gbrain`（別プロジェクト）、`Codex CLI` / `Gemini CLI`（外部 product）
- **外部 path / config**：`~/.gbrain/config.json` / `~/.codex/sessions` / `~/.gemini/projects.json` / `~/.claude/projects`
- **外部 env**：`GBRAIN_URL` / `GBRAIN_TOKEN` / `CODEX_HOME` / `CODEX_API_KEY` / `OPENAI_API_KEY`
- **外部プロジェクト共有 config key**：`gbrain_sync_mode` 等（`uzustack-config` に外部プロジェクトと共有する key）
- **外部 SaaS リソース慣習名**：例 Supabase project name prefix `gbrain`（gbrain CLI で作る project の慣習）
- **OS / Tool UI 引用**：Chrome の `'Developer mode'` / `'Load unpacked'`（Chrome 自身の英語 UI 引用）
- **未翻訳 skill 名のまま**（cluster C/D 翻訳完了次第 自動整合）：CLAUDE.md snippet 内の `/qa, /ship, /review, /investigate, /browse` 等

#### step-38 学び 3 点（cluster B 完了時の追加観測、PR #46）

- **機械置換は dangling reference まで忠実に伝播する**：comment 内の他 binary 参照も置換対象。`uzustack-question-log:27` の `uzustack-question-sensitivity`（実体未持ち込み）参照を削除した事例。`/simplify` の quality + reuse agent が独立に同じ findings を発見、cross-validation で confidence 高い
- **output 表示英語維持の境界線**：sentinel token + 周辺 context は parser 互換重視で **英語維持**。`uzustack-specialist-stats` output / dashboard 系で適用。コメント / status メッセージは日本語化、機械処理される token は英語維持
- **judgment 軸数の動的性**：外部 CLI 連携の有無で軸数が変動する。step-37（`gbrain` あり）→ 3 軸 / step-38（なし）→ 2 軸 / step-39（なし、CONTRIBUTING 統合あり）→ 2 軸 + 統合タスク。事前合意で軸数を確定すれば cluster 進行が機械化される

#### 規約射程の拡張（cluster B step-39 で確立）— ファイル名も射程に含める

voice 規約 v1（7 項目）+ step-37 拡張は **ファイル名そのもの** も射程に含める。`bin/<name>` の `<name>` も「ファイル内 identifier」と同じ規律で扱う。step-39 完了直前に「規約はファイル内 identifier しか射程に入れていなかった」穴が発覚し、cluster B 完了タイミングで穴埋めとして確立。

**運用ルール**：外部 product / protocol / tool 名で構成された binary は **`uzustack-` prefix なしで維持** する。

**判断基準**：

- upstream で `gstack-` prefix が付いていない binary は、upstream 側でも「外部 identifier 命名」と判断した signal として読む
- これに従い uzustack 側でも prefix なし維持する（memory `mechanize_over_scope_skip` 規律と整合）
- 「内容は外部 identifier 維持、ファイル名だけ `uzustack-` prefix」という分裂状態を生まない

**具体例**：

- `bin/chrome-cdp`（Chrome [外部 product 名] + CDP [外部 protocol 名] の合成）— `uzustack-chrome-cdp` ではなく `chrome-cdp` のまま維持
- 確認 signal：`_upstream/gstack/test/audit-compliance.test.ts` の `bin/chrome-cdp` hardcode（upstream test が path を直接参照、upstream 設計判断の最も強い signal）

#### 集約タイミング規律

cluster 進行中は規範が PR description / memory / step ノート / issue body に分散して動いている。**cluster 完了で規範が固まった直後（次 cluster 着手前）に CONTRIBUTING.md へ集約**する。Phase 完了判定 (step-42) まで待つと cluster 内参照性が上がらず、PR description を漁る運用になる。本節は cluster B step-39 で集約した（step-42 → step-39 完了に前倒し）。

### 新規翻訳の手順（1 個ずつ、緊急時 / 単発の場合）

緊急で 1 個だけ翻訳したい場合や、cluster に収まらない isolated な skill の場合に使う。継続的に翻訳を進める場合は、後述の **small batch アプローチ** を推奨。

1. **ベース確認**：`_upstream/gstack/<skill>/SKILL.md.tmpl` を読む
2. **翻訳作業**：
   - repo top に `<skill>/SKILL.md.tmpl` を新規作成
   - メソッド本体を原文忠実に日本語訳
   - gstack 専用機構（上記）を削除
   - frontmatter に `type: translated` + 日本語 trigger 語彙を追加
3. **生成 / 動作確認**：
   - `bun run gen:skill-docs` で `<skill>/SKILL.md` を生成
   - `bin/dev-setup` で symlink を貼り、Claude Code で skill が呼べることを確認
4. **`/simplify` を 2 周**（過剰な翻訳調整・機構残骸がないか）
5. **PR**：`feature/translate-<skill>` ブランチで作成

### small batch アプローチ（推奨：cluster 単位 3-5 個）

役割が似た skill を **3-5 個まとめて** 翻訳する。1 個ずつだと mode switch コストが高く、完全 batch（数十個）は「翻訳の整合性ドリフト」「trigger 語彙の干渉」「機構削除の影響伝播」「上流追跡との混戦」のリスクが高まる。中間サイズが最も効率的。

**手順**：

1. **cluster 選定**：似た役割の skill 3-5 個を選ぶ（後述の cluster 例）
2. **batch 翻訳**：cluster 内の skill を順番に翻訳（用語・構造の整合性を維持）
3. **batch 動作確認**：cluster 全体に対して `bun run gen:skill-docs` + `bin/dev-setup` を一気に実行、Claude Code で各 skill の起動を確認
4. **`/simplify` を 2 周**：cluster 全体を 1 セッションでレビュー
5. **PR**：`feature/translate-cluster-<cluster-name>` ブランチで作成、cluster 全体を 1 PR に

**学習 loop**：cluster 内で見つかった改善点（用語選択、機構削除の漏れ、trigger 語彙の干渉等）を次 cluster に反映する。最初の cluster は時間がかかるが、cluster を重ねるごとに効率が上がる。

**cluster 例**（gstack の skill から、完全な分類は実際の翻訳着手前に整理）：

- **investigation 系**：`investigate`（既翻訳）、`retro`、`careful`（3 件）
- **context 系**：`context-save`、`context-restore`、`learn`、`freeze`、`unfreeze`、`autoplan`（6 件 → 3 + 3 等に再分割推奨）
- **ship 系**：`ship`、`land-and-deploy`、`document-release`、`canary`、`landing-report`（5 件）
- **review 系**：`plan-ceo-review`、`plan-eng-review`、`design-review`、`qa`、`qa-only` ほか（10 件 → `plan-*` と `qa-*` に再分割）
- **design 系**：`design-consultation`、`design-shotgun`、`design-html`（3 件）

cluster サイズが 5 を超える場合は sub-cluster に分割（例：`plan-*` 系と `qa-*` 系）。

### rebase の手順（既存翻訳が gstack 側で更新された時）

step 22 の自動 subtree pull PR が来た時、翻訳済み skill が変更されているか確認：

1. **影響判定**：

   ```bash
   gh pr diff <auto-PR-number> -- _upstream/gstack/<翻訳済み skill>/SKILL.md.tmpl
   ```

   - 変更なし → rebase 不要、auto PR をそのまま merge
   - 変更あり → 以下の rebase 作業へ

2. **rebase 作業**：
   - auto PR を先に merge → main で `feature/sync-gstack-<日付>-<skill>` ブランチを切る
   - 翻訳済み `<skill>/SKILL.md.tmpl` を上流差分に合わせて更新
   - メソッド本体の変更：**原文忠実に再翻訳**
   - 機構関連の追加（`{{PREAMBLE}}` 等）：引き続き **削除** する方針（Phase 3+ まで）
   - 既存の日本語 trigger は維持
3. **検証**：
   - `bun run gen:skill-docs` を実行 → `git diff` が clean（または期待通りの差分のみ）
   - `bin/dev-setup` で動作確認
4. **`/simplify` を 2 周**
5. **PR**：別 PR として作成、auto PR とは独立した commit に

### rebase 時に保持すべき uzustack 独自 fix

uzustack の翻訳版には、gstack 上流にない uzustack 独自の fix が含まれている場合がある。subtree pull は `_upstream/gstack/` 配下しか触らないので物理的に上書きされないが、上記「rebase 作業」で翻訳版を上流差分に合わせて書き直す時に、AI / 人間 reviewer が **誤って revert する risk** がある。以下を **必ず維持** する：

#### `careful` skill（PR #24 で導入）

| fix | 理由 | 場所 |
|---|---|---|
| `${CLAUDE_SKILL_DIR}` → `$CLAUDE_PROJECT_DIR/.claude/skills/<skill>/bin/...` | Claude Code 公式 env var に揃える（gstack の `${CLAUDE_SKILL_DIR}` は独自拡張で空文字列に展開され、hook script が見つからない） | `careful/SKILL.md.tmpl` の `hooks: command` |
| hook output JSON を `hookSpecificOutput` で wrap、`message` → `permissionDecisionReason` | Claude Code 現行 hook 仕様（gstack 旧 format `{"permissionDecision":"ask","message":"..."}` は無視される） | `careful/bin/check-careful.sh` の出力部 |
| sed regex で `\s+` → `[[:space:]]+` | BSD sed (macOS) は `\s` 非対応で safe exception の RM_ARGS strip が失敗する。POSIX `[[:space:]]+` で macOS / Linux 両対応 | `careful/bin/check-careful.sh` の sed |
| WARN メッセージ日本語化（`危険:` prefix） | uzustack 全体の言語感整合（SKILL.md.tmpl と statusMessage は日本語、warning だけ英語は不整合） | `careful/bin/check-careful.sh` の WARN 文字列 8 種 |

#### Phase 4 以降の hook 持ち skill 翻訳時の規範

新しい hook 持ち skill（`freeze`、hook 化された `investigate` 等）を翻訳する時も、上記 4 種類の fix パターンを **最初から** 適用すること：

1. **hook command path**：YAML frontmatter の `hooks.PreToolUse[].hooks[].command` で `$CLAUDE_PROJECT_DIR/.claude/skills/<skill>/bin/...` を使う（gstack 原文の `${CLAUDE_SKILL_DIR}` は使わない）
2. **hook output JSON format**：bin script の出力は `hookSpecificOutput` で wrap、message field は `permissionDecisionReason`
3. **sed regex の互換性**：bin script 内の sed で `\s` を使わず POSIX `[[:space:]]+` を使う
4. **user-facing メッセージ**：WARN、status、説明文等は日本語化（uzustack 全体の言語感に揃える）

これにより Phase 4 で同じ修正集積をやり直さずに済む。

### bulk rebase（翻訳済み skill が ≥3 件になったら）

複数の翻訳済み skill が同じ自動 PR で上流更新を受けた場合、1 件ずつではなく月次 batch でまとめて rebase する運用も検討します（将来の改善ポイント）。今は 1 件のみなので個別対応で十分。

### 詳細

- 守破離方針：[README.md](README.md#守破離uzustack-の進化段階) 参照