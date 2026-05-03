# Contributing to uzustack

uzustack の開発に貢献していただきありがとうございます。このドキュメントは **メンテナー・コントリビューター向け** の開発ガイドです。

end user として uzustack を使うだけの方は [README.md](README.md) を参照してください。

---

## 個人メンテナーの OSS について

uzustack は [株式会社UZUMAKI](https://uzumaki-inc.jp/) の CEO [@ToraDady](https://github.com/ToraDady) が個人実践として始め、同じ課題感を持つ日本の経営者・開発者にも役立つよう UZUMAKI 社の OSS 活動として公開している個人メンテナーの OSS です。

PR / Issue / 翻訳改善・新スキル提案・バグ修正、いずれの Contribution も歓迎します。少人数運営のため個別の対応は保証できませんが、Contributor が動きやすいように OSS の流れを整えていきます。

- バグ報告・機能要望は [Issue](https://github.com/uzumaki-inc/uzustack/issues) へ
- PR / 翻訳改善 / 新スキル提案も歓迎（個別対応は保証なし）

---

## Phase 進捗（2026-05-02 時点）

uzustack は Phase 0c → 1 → 2 → 3 → 3.5 を経て、**Phase 3 + Phase 3.5 で「型の取り込み」が完了**（PR #120 merged 2026-05-02）。runtime（bin 約 50 個 + テンプレート機構 + voice 翻案ガイドライン v1/v2 + ETHOS.md）と Type 1 実翻訳 30 skill + Phase 6 予約スタブ 10 件が揃った状態です。守破離の **守の完成** は Phase 6（10 件スタブの Type 1/3 判定）で達成予定。

**現在の uzustack 状態**：

- runtime: bin 約 50 個 + テンプレート機構（SKILL.md.tmpl + 5 host 展開：claude / codex / kiro / factory / opencode）+ voice 翻案ガイドライン v1/v2 + ETHOS.md
- skill: 30 件（実翻訳）+ Phase 6 予約スタブ 10 件 = top-level 40 directory

**Phase 4 / 5 / 6 への接続**：

- **Phase 4「絆を結ぶ」**: hook + 連鎖機構を runtime 上に実装。`freeze` / `unfreeze` skill pair 翻訳 + `investigate` の hook 復活 + obsidian-audit 系の連鎖実装
- **Phase 5「記憶が編まれる」**: learnings 機構実装。`{{LEARNINGS_*}}` placeholder 展開 + `learn` skill 翻訳 + マシン間記憶同期 skill 連携
- **Phase 6「守の完成」**: subtree pull 集約 directory `_imports/` 構築 + Phase 6 予約スタブ 10 件の Type 1/3 判定（subtree pull で取り込めれば Type 1、取り込めなければ Type 3 で守対象外）。両方の判定が完了した瞬間が **守の完成**

各 Phase の主要 PR # と完遂事項の詳細は [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) を参照してください。

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

> 💡 **AI session 向け context**：Claude Code session で uzustack repo を開く場合、[CLAUDE.md](CLAUDE.md) が自動読込される AI 向け project context です（commands / structure / voice rules / 既存 doc へのポインターを集約）。

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
3. 翻訳済み skill（frontmatter `type: translated`）の `_upstream/gstack/<skill>/` 側に変更があれば、再翻訳の必要性を判断（rebase 手順は本ドキュメントの「rebase の手順」 section 参照）
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

### voice 規約 + 訳語表

uzustack の翻訳作業で使う **voice 規約と訳語表（置換ルール表 v1 + voice 規約 v1/v2）** は [docs/uzustack/translation-voice-guide.md](docs/uzustack/translation-voice-guide.md) に集約しています。文字列軸・固有名詞軸・voice 軸の 3 軸構成で訳語の機械置換ルールを定義しているため、新規翻訳着手前に必読です。

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

`careful` skill 等で必要な uzustack 独自 fix（`${CLAUDE_SKILL_DIR}` → `$CLAUDE_PROJECT_DIR/...` 等の 4 種類 fix）と Phase 4 以降の hook 持ち skill 翻訳時の規範は [docs/uzustack/translation-rebase-fixes.md](docs/uzustack/translation-rebase-fixes.md) に集約しています。subtree pull は `_upstream/gstack/` 配下しか触らないので物理的に上書きされませんが、rebase 作業で AI / 人間 reviewer が **誤って revert する risk** があるため必ず維持してください。

### bulk rebase（複数件が同時に更新を受けた時）

Phase 3.5 完遂時点で翻訳済み skill は 30 件。複数の翻訳済み skill が同じ自動 PR で上流更新を受けた場合、1 件ずつ rebase するのではなく月次 batch でまとめて rebase する運用にする。各 skill の影響範囲を `gh pr diff <auto-PR-number>` で先に確認し、変更がある skill だけを 1 つの feature ブランチに集めて再翻訳する。

### 詳細

- 守破離方針：[README.md](README.md#守破離uzustack-の進化段階) 参照