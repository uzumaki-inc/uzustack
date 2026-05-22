# Changelog

uzustack の release notes。フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠、versioning は gstack convention（4-tuple monotonic ordered identifier、major.minor.patch.micro）を採用しています。

各 release entry は **user-facing な変更** を要約します。Phase ごとの主要 PR # 内訳と完遂事項は [docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) に委譲します。

---

## [0.3.6.6] — 2026-05-22

### Added

- **`investigate` skill に hooks block を復活** — upstream `_upstream/gstack/investigate/SKILL.md.tmpl` の `hooks: PreToolUse (Edit + Write → freeze/bin/check-freeze.sh、 debug scope boundary check)` が uzustack 翻訳版で完全消失していた (= 翻訳漏れ) を発見、 復活。 PR #24 で確立した path 規律 (`$CLAUDE_PROJECT_DIR/.claude/skills/<name>/bin/...`) を踏襲。 statusMessage は voice 規約 v1 の English-locked + Japanese gloss pattern で「デバッグ scope の境界をチェック中...」 と翻案 (upstream の mechanism + framing 分離 signal を carry-through)
- **`docs/uzustack/hook-verification.md` を新規追加** — 4 hook 持ち skill (careful / freeze / guard / investigate) の static audit + functional simulation 結果を集約、 Phase 5 `_upstream-sync/` 設計への申し送り 3 件 (hooks path 翻案 transform / statusMessage voice 翻案規律 / hook output format migration transform 候補) を doc 末尾に記録

### Fixed

- **`freeze/bin/check-freeze.sh` の hook output を新 format に migrate** — 旧 format (`{"permissionDecision":"deny","message":"..."}`) は現行 Claude Code に無視される format で、 freeze hook が silent に block 失敗していた可能性。 `hookSpecificOutput.hookEventName: "PreToolUse"` で wrap + `message` field → `permissionDecisionReason` に置換 + escape pattern (`sed 's/"/\\"/g'`) を `FILE_PATH` / `FREEZE_DIR` 両変数にも適用。 careful/bin/check-careful.sh (PR #24 で先行 migrate 済) と format 完全一致

### Notes

- issue #166 (hook 機構の発動経路の検証 = Phase 4 多 skill 連鎖) を Closes。 Phase 4 cluster epic #152 の最後の残課題、 本 PR で close することで Phase 4 cluster の hooks 機構整合性が確定 (release bundle PR で MINOR bump = Phase 4 完遂宣言の候補)
- upstream gstack 側の check-freeze.sh は旧 format のままだが、 uzustack の check-careful.sh が PR #24 で既に先行 migrate していたため、 本 PR は内部不整合の解消 (= 既に divergence してる状態の収束) であり upstream tech debt 観測リスト規律の例外条件 (「uzustack が先行 fix 済」 case) に該当
- upstream tech debt 観測リスト追加 2 件: `_resolve_path()` の fail-silent (path 不存在時 unresolved fallback) + JSON escape の不完全性 (`sed 's/"/\\"/g'` は backslash / 制御文字未対応)

---

## [0.3.6.5] — 2026-05-21

### Added

- **review / testing / review-army resolvers を port** — upstream gstack の `scripts/resolvers/review.ts` (1,021 行) + `testing.ts` (551 行) + `review-army.ts` (244 行) = 合計 1,816 行を翻訳して `scripts/resolvers/` 配下に配置 (PR-D4b / Closes #176)。 review.ts は 12 関数を export: `generateReviewDashboard` / `generatePlanFileReviewReport` / `generateSpecReviewLoop` / `generateBenefitsFrom` / `generateCodexSecondOpinion` / `generateScopeDrift` / `generateAdversarialStep` / `generateCodexPlanReview` / `generatePlanCompletionAuditShip` / `generatePlanCompletionAuditReview` / `generatePlanVerificationExec` / `generateCrossReviewDedup`。 testing.ts は inner helper 1 つから 3 mode 分岐で 4 関数: `generateTestBootstrap` / `generateTestCoverageAuditPlan` / `generateTestCoverageAuditShip` / `generateTestCoverageAuditReview`。 review-army.ts は host=codex で空展開する `generateReviewArmy` を 1 関数 export (4 内部 helper を join)。 voice 規約 v1+v2 適用 (bash internals + codex prompt + subagent prompt = English、 narrative = Japanese、 Fix-First / Outside Voice / Red Team / Review Army / NEVER_GATE / vibe coding / yolo coding / superpower 等の固有名詞は English-locked + 日本語 gloss)
- **17 placeholder を `index.ts` で stub から wired に切替**: review.ts 系 12 件 (`BENEFITS_FROM` / `SPEC_REVIEW_LOOP` / `CODEX_PLAN_REVIEW` / `REVIEW_DASHBOARD` / `PLAN_FILE_REVIEW_REPORT` / `ADVERSARIAL_STEP` / `CROSS_REVIEW_DEDUP` / `PLAN_COMPLETION_AUDIT_REVIEW` / `SCOPE_DRIFT` / `CODEX_SECOND_OPINION` / `PLAN_COMPLETION_AUDIT_SHIP` / `PLAN_VERIFICATION_EXEC`) + testing.ts 系 4 件 (`TEST_BOOTSTRAP` / `TEST_COVERAGE_AUDIT_PLAN` / `TEST_COVERAGE_AUDIT_SHIP` / `TEST_COVERAGE_AUDIT_REVIEW`) + review-army.ts 1 件 (`REVIEW_ARMY`)
- **TEST_COVERAGE_AUDIT_REVIEW の処遇確定 = wire** — upstream `_upstream/gstack/scripts/resolvers/index.ts:45` で `generateTestCoverageAuditReview` が wire 済 + `testing.ts:166` でコメントに「review: generates tests via Fix-First (ASK)」と仕様明記の upstream signal を確認、 uzustack でも wire 確定。 issue #176 out-of-scope の「upstream 呼出有無」 条件分岐は「呼出あり → wire」 で resolution

### Changed

- **多 SKILL.md に 17 placeholder が展開** — `autoplan` / `office-hours` / `plan-ceo-review` / `plan-design-review` / `plan-devex-review` / `plan-eng-review` / `review` / `ship` に review readiness dashboard / plan file review report / spec review loop / benefits-from prerequisite / codex second opinion / scope drift / adversarial step / codex plan review / plan completion audit / plan verification / cross-review dedup / test bootstrap / test coverage audit / review army が wire-in 経由で展開。 合計 53,726 行 → 56,996 行 (+3,270 行 / ~+35K tokens)
- `CODEX_SECOND_OPINION` / `ADVERSARIAL_STEP` / `CODEX_PLAN_REVIEW` / `REVIEW_ARMY` は host=codex で空展開、 Claude host のみ生成 (Codex が自己 invoke しない設計の踏襲)
- **第 4 voice 軸 (DEFAULT_SKIPS hard-match) は noop と判定** — uzustack 側 `{{INVOKE_SKILL:...}}` の direct 使用が 0 件 + upstream gstack の DEFAULT_SKIPS array も同 12 項目 (動的 step 番号付き heading の `Spec Review Loop` / `Outside Voice` / `Adversarial review` 等は upstream でも未登録) 確認、 PR-D4b で composition.ts の DEFAULT_SKIPS 更新は不要

### Notes

- issue #176 (preamble + resolvers 翻訳完遂) を Closes。 5 PR 直列 land 計画 (PR-D1 = preamble core / PR-D2 = utility / PR-D3 = 中型 resolvers / PR-D4a = design / PR-D4b = review + testing + review-army) を完遂

---

## [0.3.6.4] — 2026-05-21

### Added

- **design resolver を port** — upstream gstack の `scripts/resolvers/design.ts` (1,142 行) を翻訳して `scripts/resolvers/design.ts` に配置 (PR-D4a / Refs #176)。 10 関数を export: `generateDesignReviewLite` / `generateDesignMethodology` / `generateDesignSketch` / `generateDesignOutsideVoices` / `generateDesignHardRules` / `generateDesignSetup` / `generateDesignMockup` / `generateDesignShotgunLoop` / `generateTasteProfile` / `generateUXPrinciples`。 voice 規約 v1+v2 適用 (bash internals = English、 narrative = Japanese、 Krug 三法則 / AI Slop / Trunk Test / Goodwill Reservoir 等の固有名詞は English-locked + 日本語 gloss)
- **10 placeholder を `index.ts` で stub から wired に切替**: `DESIGN_METHODOLOGY` / `DESIGN_HARD_RULES` / `UX_PRINCIPLES` / `DESIGN_OUTSIDE_VOICES` / `DESIGN_REVIEW_LITE` / `DESIGN_SKETCH` / `DESIGN_SETUP` / `DESIGN_MOCKUP` / `DESIGN_SHOTGUN_LOOP` / `TASTE_PROFILE`

### Changed

- **8 SKILL.md に 10 placeholder が展開** — `design-consultation` / `design-html` / `design-review` / `design-shotgun` / `office-hours` / `plan-design-review` / `ship` に design methodology / hard rules / outside voices / sketch / mockup / shotgun loop / taste profile / UX principles が wire-in 経由で展開。 合計 52,099 行 → 53,726 行 (+1,627 行 / ~+16K tokens)
- `DESIGN_OUTSIDE_VOICES` は Codex host で空展開、 Claude host のみ生成 (Codex が自己 invoke しない設計)

---

## [0.3.6.3] — 2026-05-21

### Added

- **中型 resolvers 8 file を port** — upstream gstack の `scripts/resolvers/` 配下から `composition.ts` / `constants.ts` / `confidence.ts` / `browse.ts` / `codex-helpers.ts` / `dx.ts` / `gbrain.ts` / `make-pdf.ts` を翻訳して配置 (PR-D3 / Refs #176)。 9 placeholder を `index.ts` で stub から wired に切替: `CONFIDENCE_CALIBRATION` / `INVOKE_SKILL` / `DX_FRAMEWORK` / `GBRAIN_CONTEXT_LOAD` / `GBRAIN_SAVE_RESULTS` / `MAKE_PDF_SETUP` / `COMMAND_REFERENCE` / `SNAPSHOT_FLAGS` / `BROWSE_SETUP`
- **`composition.ts` の DEFAULT_SKIPS を uzustack preamble の日本語化済 heading に同期** — `Completeness Principle — Boil the Lake` → `完全性の原則 — 一晩でやり切る（Boil the Lake）`、 `Search Before Building` → `作る前に探す（Search Before Building）`、 `Contributor Mode` → `リポジトリ所有権 — 気づいたら声を上げる`、 `Step 0: Detect platform and base branch` → `Step 0: platform と base branch を検出` の 4 件置換。 INVOKE_SKILL hard-match を uzustack の actual heading に揃え、 sub-skill 起動時の section 重複出力を防止
- **`browse.ts` の data 依存を pragmatic に解決** — `COMMAND_DESCRIPTIONS` は upstream の pure data export を import、 `SNAPSHOT_FLAGS` は upstream `snapshot.ts` が `import * as Diff from 'diff'` (uzustack 未インストール) を経由するため local inline copy で対応。 月次 subtree pull 時の手動 drift 確認を file 冒頭 comment に明記

### Changed

- **12 SKILL.md に 9 placeholder が展開** — `cso` / `design-consultation` / `design-html` / `design-review` / `devex-review` / `land-and-deploy` / `office-hours` / `plan-ceo-review` / `plan-devex-review` / `plan-eng-review` / `review` / `ship` に composition / confidence / dx / gbrain / make-pdf / browse 系 placeholder が wire-in 経由で展開。 合計 51,661 行 → 52,099 行 (+438 行 / ~+4K tokens)
- `GBRAIN_CONTEXT_LOAD` / `GBRAIN_SAVE_RESULTS` は claude host の `suppressedResolvers` で抑制されるため Claude host では空展開、 Phase 4+ で他 host を有効化した際に activate される (= 資産先行配置)

---

## [0.3.6.2] — 2026-05-21

### Added

- **utility resolver を実装** — upstream gstack の `scripts/resolvers/utility.ts` から 6 関数を port (PR-D2)：`generateSlugEval` / `generateBaseBranchDetect` / `generateDeployBootstrap` / `generateQAMethodology` (280 行 / 単一最大) / `generateCoAuthorTrailer` / `generateChangelogWorkflow`。 既存 `generateSlugSetup` と合わせ utility.ts は 7 関数に拡張 (Refs #176)
- `scripts/resolvers/index.ts` で 6 placeholder を stub から wired に切替: `SLUG_EVAL` / `BASE_BRANCH_DETECT` / `DEPLOY_BOOTSTRAP` / `QA_METHODOLOGY` / `CO_AUTHOR_TRAILER` / `CHANGELOG_WORKFLOW`

### Changed

- **14 SKILL.md に utility 系 placeholder が展開** — `ship` (+82 行 / CHANGELOG_WORKFLOW + CO_AUTHOR_TRAILER + BASE_BRANCH_DETECT) / `land-and-deploy` (+107 行 / BASE_BRANCH_DETECT + DEPLOY_BOOTSTRAP) / `autoplan` / `codex` / `claude` / `devex-review` / `document-release` / `plan-ceo-review` / `plan-design-review` / `plan-devex-review` / `retro` / `review` / `office-hours` / `design-consultation` に展開。 合計 51,108 行 → 51,661 行 (+553 行 / ~+5K tokens)
- `QA_METHODOLOGY` (280 行 / qa skill methodology doc) は uzustack 側 callsite なしの状態で port — 後続で qa/qa-only skill body を upstream port する時に 0 コストで activate される設計 (= 資産先行配置)

---

## [0.3.6.1] — 2026-05-21

### Added

- **preamble core resolver を実装** — upstream gstack の `scripts/resolvers/` 配下から preamble 関連 25 generator + 支援 file 3 個 (`models.ts` / `jargon-list.json` / `model-overlay.ts` / `preamble.ts` / `question-tuning.ts`) を port (PR-D1)。`{{PREAMBLE}}` placeholder が空展開から実体（~ 4 万行）に変わり、全 41 skill の SKILL.md にお帰りメッセージ・voice 指令・lake-intro・confusion protocol・continuous checkpoint・writing style 等の preamble が展開されるようになった (Refs #176)
- `scripts/resolvers/types.ts` に `model?` field + `HostPaths` の 3 新規 path field (`browseDir` / `designDir` / `makePdfDir`) を追加、env var は `$UZUSTACK_BROWSE` / `$UZUSTACK_DESIGN` / `$UZUSTACK_MAKE_PDF`
- `scripts/resolvers/index.ts` に全 52 placeholder を予約（PR-D1 で 9 wired + 43 stub、後続 PR-D2/D3/D4a/D4b で順次 wire 予定）

### Changed

- **生成 SKILL.md の preamble injection 実体化** — 全 41 skill の SKILL.md が再生成され、合計 51,108 行 / 約 505K tokens の preamble 拡張を含むようになった（preamble が空 → 実体化した structural change）

---

## [0.3.6.0] — 2026-05-18

### Added

- **Voice 規約 CI gating** — `bun run skill:validate` を PR-trigger で自動実行する独立 workflow (`.github/workflows/skill-validate.yml`) を新規追加 (#171)。skill-docs.yml (freshness check) と並列実行で merge 前に gstack 識別子 leak を catch、contributor 受け入れ準備の足腰
- **voice-rules.json v2 拡張** — URL pattern (`github.com/garrytan/gstack`) + 固有名詞軸 pattern (`Garry Tan`) を追加 (#164)、translated skill の機械チェック対象を 4 → 6 pattern に拡張
- **freeze + unfreeze + guard skill 翻訳化** (#153 / #154) — Phase 4「絆を結ぶ」 cluster の並走発火源 3 skill、careful + freeze combo の発火経路を整備
- **skill:validate を 30 翻訳済 skill に横展開** (#160) — CONTRIBUTING.md の skill 数 doc 同期 lag 解消

### Changed

- **`docs/uzustack/translation-voice-guide.md` 構造再編** (#169) — 読者目的別 3 章構成 (translator / メンテナー / validator) + Appendix A audit trail 化、voice 規約 v2 訳語 microtuning 1 件
- **`scripts/skill-validate.ts` 改善 6 項目** (#162) — frontmatter 共通 utility 抽出 (`scripts/frontmatter.ts`) + voice-rules.json への config 化 + Promise.all 並列化 + regex merge + diff-based fast mode (`--diff` flag) + error handling 強化
- **CI workflow 役割分離** (#171 副次) — skill-docs.yml = freshness check / skill-validate.yml = voice validation の責務分離を確立、`ARCHITECTURE.md` / `CONTRIBUTING.md` も整合 update + 副次的に `actionlint.yml` doc drift 削除

### Fixed

- **bun test が `_upstream/gstack/setup` を spawn して symlink 上書きする経路を block** (#156) — `bunfig.toml` に `pathIgnorePatterns = ["**/_upstream/**"]` を追加、禁止規律を effect 軸に書き換え
- **gstack 専用 dir 削除規律を「翻訳済のため不要」 と明確化** (#158) — CONTRIBUTING.md を rule expression から effect expression に転換

---

## [0.3.5.2] — 2026-05-15

### Added

- **learnings resolver を実装** — `scripts/resolvers/learnings.ts` を upstream gstack から port（voice 翻案 + uzustack 機械置換）。`{{LEARNINGS_SEARCH}}` / `{{LEARNINGS_LOG}}` placeholder が空展開から実体に変わり、retro 等 13 skill で過去の学習検索と学習記録の指示文が展開されるようになった
- cross-project 学習の初回確認（AskUserQuestion）、学習ログの型・信頼度・ソース指定をサポート

### Fixed

- retro skill の learnings 連携が「placeholder 空展開」で機能不全だった問題を解消

---

## [0.3.5.1] — 2026-05-08

### Changed — user-facing

- **守完走判定を再定義** — 旧「Phase 6 予約スタブ 10 件の Type 1/3 判定」 から「browse 機構必須 14 skill の動作実装」 に明文化を統一。 (1) browser 機構 と (2) ワークフロー skill の依存関係を ARCHITECTURE.md / README.md / CONTRIBUTING.md / docs/uzustack/ で正式に明文化
- **browse 機構必須 14 skill** (browse / qa / qa-only / canary / benchmark / make-pdf / design-review / design-consultation / devex-review / land-and-deploy / open-uzustack-browser / pair-agent / connect-chrome / setup-browser-cookies) の SKILL.md.tmpl 先頭に Phase 6 待ち warning block を統一配置 — frontmatter `status: phase6-reserved` も全 14 skill で統一
- **README.md の skill 一覧** — 旧「翻訳済 30 件 + 予約スタブ 10 件」 から「動作する 26 件 + browse 機構必須 14 件」 に分類変更。 design-review / design-consultation / devex-review / land-and-deploy が browse 機構必須（= 現状動作しない）と判明したため再分類

### Fixed — fact-check 後の reclassify

- **devex-review を browse 機構必須側に reclassify** — fact-check で description + 本文 line 50 + line 83「browse tool で docs を navigate / screenshot」 等の literal instruction が確認された。 旧「非依存 28 件」 → 新「必須依存 14 件」 へ移動 + SKILL.md.tmpl に warning block 配置
- **autoplan を optional → 非依存 に reclassify** — uzustack 翻訳済 (repo top) では browse literal が翻訳時に削除済 (gstack 上流 line 322「Launch real browser for QA → invoke /open-gstack-browser」 が uzustack 側に存在しない)。 旧「optional 依存 3 件」 → 新「optional 依存 2 件」、 非依存 28 件は維持 (devex-review 抜き + autoplan 追加で同数)
- **守完走 base 31 → 30 skill に修正** — 非依存 28 + optional 2 = 30
- **判定基準の明文化を強化** — 「`{{BROWSE_SETUP}}` placeholder の存在 = browse 必須」 ではないことを明示 (placeholder engine の resolver は空文字列を返し SKILL.md 生成時に削除される)。 ARCHITECTURE.md「(1) browser 機構 と (2) ワークフロー skill の依存関係」 section に判定基準を追記

### Added — for contributors

- **docs/uzustack/phase6-pending-skills.md** — Phase 6 待ち 14 entry list + grep evidence + fact-check 履歴
- **docs/uzustack/phase6-warning-block.md** — 共通 warning block の source of truth + 配置規律
- **docs/uzustack/translation-voice-guide.md** — 「Phase 6 待ち skill の voice 翻案射程」 section 追加（射程内 / 射程外 / 判断基準）
- **CONTRIBUTING.md** — 「Phase 6 待ち skill 翻訳時の warning 配置必須」 規律追加
- **ARCHITECTURE.md** — 「(1) browser 機構 と (2) ワークフロー skill の依存関係」 section 新設、 「守破離における Phase 6 の位置付け」 section（TODO(human) 待ち）追加

### Known limitations（継続）

- placeholder engine (`scripts/gen-skill-docs.ts` の resolvers/) は依然空 stub — Phase 4+ で本体実装予定。 共通 warning block を自動注入できないため各 SKILL.md.tmpl に直書き
- plan-ceo-review / plan-devex-review / plan-eng-review が `~/.claude/skills/uzustack/browse/bin/remote-slug` を参照（browse skill 未実装のため fallback `git rev-parse` で動作）

---

## [0.3.5.0] — 2026-05-03

uzustack の **初回公開 release**。「型の取り込み」 完遂時点（Phase 0c〜3.5）+ 公開の足回り（Phase 3.6 root file 4 件）をまとめて公開する。Type 1 翻訳 30 件 + Phase 6 予約スタブ 10 件、計 40 skill が利用可能な状態。

「型の取り込み」 = runtime + 翻訳パイプラインが揃ったこと。守破離の **守の完成** は Phase 6（予約スタブ 10 件の Type 1/3 判定）で達成予定。

### Added — user-facing

- **40 skill が利用可能** — 翻訳 skill 30 件（CEO / engineering / design / DX レビュー、ship / land-and-deploy / document-release の出荷 workflow、investigate / retro / careful 等のデバッグ系）+ Phase 6 予約スタブ 10 件（`browse` / `qa` / `canary` / `make-pdf` / `pair-agent` 等）。一覧は [README.md](README.md#available-skills) 参照
- **end user セットアップ `./setup`** — 任意のプロジェクトに `.claude/skills/<skill>/` を symlink でフラット展開
- **gstack 月次自動取込み** — 毎月 1 日に gstack 上流変更が PR として届く

### Added — for contributors

- **runtime layer** — bin 約 50 個 + テンプレート機構（5 host 展開：claude / codex / kiro / factory / opencode）+ voice 翻案ガイドライン（v1 / v2 拡張）
- **メンテナーセットアップ** — `bin/dev-setup` / `bin/dev-teardown`（モード A: セルフ symlink / モード B: 外部プロジェクト）
- **freshness CI** — `.github/workflows/skill-docs.yml` が PR ごとに `gen:skill-docs` 整合性を検証
- **VERSION / CHANGELOG / CLAUDE / ARCHITECTURE** — root file 4 件を repo top に翻訳配置（step-80 / Issue #123）
- 各 Phase の主要 PR # 内訳と完遂事項：[docs/uzustack/phase-history.md](docs/uzustack/phase-history.md) 参照
- 翻訳 voice 規約 + 訳語表：[docs/uzustack/translation-voice-guide.md](docs/uzustack/translation-voice-guide.md) 参照
- rebase 時の uzustack 独自 fix：[docs/uzustack/translation-rebase-fixes.md](docs/uzustack/translation-rebase-fixes.md) 参照
- 構築哲学・原則：[ETHOS.md](ETHOS.md)（Boil the Lake / Search Before Building / User Sovereignty / Build for Yourself）

### 既知の制約

- **Supabase 連携の検証未実施** — gbrain（クロスマシン記憶同期機構）の Supabase 連携 binary は配置済（`bin/uzustack-gbrain-supabase-provision` / `bin/uzustack-gbrain-supabase-verify`）だが、実機 Supabase 接続による検証は未完了。`bash -n` syntax check と `--help` 出力の確認のみ完了。Supabase アカウントを持つ user は gstack 側の動作確認 evidence を参照しながら使用すること
- **Phase 6 予約スタブ 10 件は未検証** — subtree pull で取り込めるかの実機検証が Phase 6 で実施予定

[0.3.6.0]: https://github.com/uzumaki-inc/uzustack/releases/tag/v0.3.6.0
[0.3.5.2]: https://github.com/uzumaki-inc/uzustack/releases/tag/v0.3.5.2
[0.3.5.1]: https://github.com/uzumaki-inc/uzustack/releases/tag/v0.3.5.1
[0.3.5.0]: https://github.com/uzumaki-inc/uzustack/releases/tag/v0.3.5.0
