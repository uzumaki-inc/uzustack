# Phase 進捗履歴（uzustack）

このドキュメントは uzustack の Phase 1〜3.5 までの進捗を追跡できる **単一の参照点** です。Contributor が過去の意思決定・主要 PR を辿れるよう、各 Phase の意図と完遂事項、主要 PR # を時系列で記録します。

進行中・今後の Phase（4 / 5 / 6）は `CONTRIBUTING.md` の「Phase 進捗」 section を参照してください。

---

## Phase 0c — Scaffold（PR #1 / #2 / #3）

uzustack の repo 構造を確立する初期段階。

- **PR #1**：README / CONTRIBUTING を最新仕様に揃える
- **PR #2**：skill-docs build 環境（`bun run gen:skill-docs`）の scaffold
- **PR #3**：skill レイアウトを repo top 直接配置 + frontmatter `type:` フィールドに変更（旧 `skills/native/<skill>/` 階層は廃止）

このフェーズで「skill 1 個 = repo top 直 1 ディレクトリ」「Type 1/3 区別は frontmatter で表現」 という構造が固まり、以降のすべての翻訳 skill / 独自 skill がこのレイアウトで配置される。

---

## Phase 1 — 最初の Type 1 翻訳（PR #4〜#6）

gstack の最初の skill を翻訳して uzustack の型を確認する段階。

- **PR #4**：`bin/dev-setup` + `bin/dev-teardown` を実装（メンテナー向け 1 clone 開発フロー）
- **PR #5**：`investigate` skill を翻訳（**最初の Type 1 skill**）
- **PR #6**：`bin/dev-setup` の冪等性違反を修正

このフェーズで「翻訳着手 → `bin/dev-setup` で symlink → Claude Code で動作確認」 のフルサイクルが回り、以降の翻訳作業の型が確立した。

---

## Phase 2 — フロー整備と investigation 系翻訳（PR #8〜#28）

end user 向けセットアップと gstack 取込みフローを自動化し、最初の skill cluster を翻訳する段階。

- **end user setup / dev-setup 拡張**：PR #8（`./setup` 実装）/ PR #10（`bin/dev-setup` 引数あり版）/ PR #20（`bin/dev-teardown` 引数あり版）
- **gstack 取込み自動化**：PR #12（subtree pull 動作確認）/ PR #14（GitHub Actions 月次自動 PR）
- **翻訳手順確立**：PR #16（rebase 手順）/ PR #18（small batch 戦略）/ PR #26（rebase 時 preserve list）
- **investigation 系 skill 翻訳**：PR #22（`retro`）/ PR #24（`careful`、最小 hook 取り込みパイロット）/ PR #28（`context-save` + `context-restore`）

このフェーズで `careful` skill の hook 翻訳パターン（`${CLAUDE_SKILL_DIR}` → `$CLAUDE_PROJECT_DIR/...` 等の 4 種類 fix）が確立し、`docs/uzustack/translation-rebase-fixes.md` として文書化された。

---

## Phase 3 — runtime 完璧実装（PR #30〜#63）

gstack の runtime 機構（bin scripts、テンプレート展開、host 切替）を **完璧複製** で取り込み、voice 翻案ガイドラインを確立する段階。

- **bin 配置 + setup 完璧複製**：PR #30（最小 prototype）/ PR #34（gstack 構造完璧複製）/ PR #35（`uzustack-slug` 統一）/ PR #37（`gen-skill-docs.ts` placeholder engine + host 機構）
- **置換ルール表 v1 + voice 翻案ガイドライン**：PR #32（現在は `docs/uzustack/translation-voice-guide.md` に切り出し）
- **bin 翻訳バッチ**：PR #40（runtime コア群 7 個 + voice 規約 v1 確立）/ PR #42（学習機構群）/ PR #44（brain / gbrain 系 13 binary）/ PR #46（その他補助 binary 21 個）/ PR #48（連携系 7 binary + CONTRIBUTING.md 統合）
- **既存 5 skill の .tmpl 化 + preamble 取り付け**：PR #50（`careful` / `investigate` / `retro`）/ PR #52（`context-save` / `context-restore` の `SLUG_SETUP` / `PREAMBLE` 取り付け）
- **design 翻訳**：PR #57（design 翻訳配置）/ PR #59（design voice 翻案 retry）
- **Phase 6 予約スタブ + 周辺**：PR #61（Phase 6 予約スタブ 8 件配置）/ PR #63（gen-skill-docs all-host + build script + ETHOS.md 翻訳）

このフェーズで bin 翻訳バッチの judgment 軸が固まり、以降の Phase 3.5 翻訳が機械化可能になった。

---

## Phase 3.5 — Type 1 機械翻訳完遂（PR #66〜#120）

Phase 3 で確立した翻訳機構を使って、残り 27 skill を一気に翻訳する段階。

- **バッチ 1**（`plan-ceo-review` = voice 規約 v2 確立）：PR #66
- **バッチ 2**（`claude` / `pair-agent` stub / `uzustack-upgrade` / `setup-gbrain`）：PR #68 / #70 / #72 / #74
- **バッチ 3**（`benchmark` stub / `benchmark-models` / `health` / `cso`）：PR #76 / #78 / #80 / #82
- **バッチ 4**（`codex` / `review` / `office-hours` / `devex-review`）：PR #84 / #86 / #88 / #90
- **バッチ 5**（`ship` / `land-and-deploy` / `setup-deploy` / `landing-report` / `document-release`）：PR #92 / #94 / #96 / #98 / #100
- **バッチ 6**（`design-consultation` / `design-html` / `design-review` / `design-shotgun`）：PR #102 / #104 / #106 / #108
- **バッチ 7**（`plan-eng-review` / `plan-design-review` / `plan-devex-review` / `plan-tune` / `autoplan`）：PR #110 / #112 / #114 / #116 / #118
- **完遂判定 + setup guard 整理**：PR #120（Phase 3 + Phase 3.5 の型取り込み完了判定、守の完成は Phase 6 へ移管）

このフェーズで Type 1 実翻訳 25 件 + Phase 6 予約スタブ 2 件（`pair-agent` / `benchmark`）が完遂し、voice 規約 v2 拡張（plan / strategy / design / orchestration 系の persona / Mode / Data flow 訳語）が確立した。

---

## 用語

- **Phase 6 予約スタブ**：subtree pull で取り込めるか実機検証が必要な skill（`browse` / `qa` / `qa-only` / `canary` / `setup-browser-cookies` / `open-uzustack-browser` / `connect-chrome` / `make-pdf` / `pair-agent` / `benchmark` の 10 件）。Phase 6 で Type 1 / Type 3 を判定する
- **Type 1**：gstack を翻訳・検証したスキル（`type: translated`）
- **Type 3**：Type 2（個人運用）から属人性を抜いた汎用版（`type: native`）
- **守の完成**：Phase 6 で予約スタブ 10 件の Type 1/3 判定が完了した時点で達成
