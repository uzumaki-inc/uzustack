# Phase 進捗履歴（uzustack）

このドキュメントは uzustack の Phase 0c〜現在（Phase 4 完遂、 Phase 5 着手準備）までの進捗を追跡できる **単一の参照点** です。Contributor が過去の意思決定・主要 PR を辿れるよう、各 Phase の意図と完遂事項、主要 PR # を時系列で記録します。

今後の Phase（5 / 6）は `CONTRIBUTING.md` の「Phase 進捗」 section を参照してください。

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

## Phase 3.6 — OSS 公開準備 + 守完走判定 reframe（PR #122〜#151）

uzustack の **初回 OSS 公開** と、それに伴う **守完走判定の再定義** + **Phase 3 で空 stub のまま残っていた resolver の実装** を行う段階。

- **Root file 4 件 配置（公開の足回り）**：PR #122（README + CONTRIBUTING + docs/uzustack 整理、Phase 4 着手準備）/ PR #124（VERSION + CHANGELOG + CLAUDE + ARCHITECTURE 配置、step-80 / issue #123）/ PR #126（`docs/ja` を `docs/upstream/gstack/ja` にリネーム、複数 upstream 対応への命名整理）
- **/learn skill 翻訳化**：PR #127（step-82、Approach A 実装、Type 1 翻訳 26 件目）
- **守完走判定 reframe**：PR #140（browse 機構必須 14 skill を Phase 6 で実装検討 stub として正式に明文化、守完走 base を「Phase 6 予約スタブ 10 件 → 30 skill」 に再定義）
- **broken bin reference fix**：PR #147（`plan-*` skill、issue #137 / step-97）/ PR #149（`greptile-triage`、issue #148 / step-98）の broken bin 参照を `uzustack-slug` 直呼びに切替
- **learnings resolver port**：PR #151（Phase 3 で空 stub だった `scripts/resolvers/learnings.ts` を upstream gstack から port、`{{LEARNINGS_SEARCH}}` / `{{LEARNINGS_LOG}}` placeholder が空展開から実体に変わり 13 skill で過去学習検索・記録の指示文が展開、Closes #150）
- **周辺整備 + sanitize 規律**：PR #129（`bin/dev-setup` に slug-cache redirect 追加、step-84 サブタスク 8 = 4 GAP bin pilot）/ PR #131（`~/.gstack` pollution fix、`_upstream` symlink 経路 + hardcode bin redirect 拡張）/ PR #133（`_upstream/gstack/` 内 setup 実行禁止規律を 3 docs に明記）/ PR #142（`.claude/rules/` への規律 segregate + `.gitignore` + `docs/uzustack/placeholder-convention.md` 追加 + `translation-rebase-fixes.md` 拡張）/ PR #146（OSS 公開時 sanitize 規律を `CLAUDE.md` に追加）

このフェーズで **初回 OSS 公開（v0.3.5.0）** + **守完走判定の対象を browse 機構必須 14 skill / 動作する 30 skill base に reframe（v0.3.5.1）** + **learnings resolver の空 stub 解消（v0.3.5.2）** が完成し、Phase 4 cluster（contributor 受け入れ準備）の着手条件が揃った。

---

## Phase 4 cluster — 絆を結ぶ（PR #128〜PR #192、 完遂）

**contributor 受け入れ準備の足腰** を固める段階。voice 規約の機械チェック基盤 + 並走発火源 skill の翻訳化 + CI gating の役割分離 + preamble core resolver port + hook 機構の発動経路検証 + skill 連鎖検証 + close path 規律補強を経て、 **4 軸完備** で **v0.4.0.0（2026-05-24、 PR #192 / Closes #183）** にて完遂宣言。 ここで 4 軸とは: (1) preamble core resolver port + (2) hook 機構の発動経路検証 + (3) skill 連鎖検証 + (4) close path 規律補強。

### Phase 4 着手期 (PR #128〜PR #173、 v0.3.6.0 milestone まで)

- **voice 規約 機械チェック基盤**：PR #128（skill voice 規約 v1 機械チェック、Tier 1+2 達成、step-83 = `skill:validate` コマンドの起点）
- **freeze + unfreeze + guard 翻訳化**（cluster の並走発火源 3 skill）：PR #153（`freeze` + `unfreeze` pair）/ PR #154（`guard` = `careful` + `freeze` combo）
- **Voice 規約 CI gating 確立**：PR #160（`skill:validate` を 30 翻訳済 skill に横展開 + `CONTRIBUTING.md` skill 数 doc 同期、Closes #159）/ PR #162（`scripts/skill-validate.ts` 改善 6 項目：frontmatter 共通 utility 抽出 / voice-rules.json への config 化 / Promise.all 並列化 / regex merge / diff-based fast mode（`--diff` flag）/ error handling 強化、Closes #161）/ PR #164（`voice-rules.json` v2 拡張：URL pattern + 固有名詞軸 pattern を追加）/ PR #171（`.github/workflows/skill-validate.yml` 新規追加 + `skill-docs.yml` から voice validation step 剥がし、freshness check と voice validation の役割分離、Closes #170）
- **translation-voice-guide.md 構造再編**：PR #169（読者目的別 3 章構成 = translator / メンテナー / validator + Appendix A audit trail 化）
- **周辺修正**：PR #156（`bunfig.toml` に `pathIgnorePatterns = ["**/_upstream/**"]` を追加、`bun test` が `_upstream/gstack/setup` を spawn して symlink を上書きする経路を block、Closes #155）/ PR #158（gstack 専用 dir 削除規律を「翻訳済のため不要」 と明確化、step-84-1 PR-C）
- **release v0.3.6.0 bundle**：PR #173（9 PR を Phase 4 cluster 進行中の milestone として minor bump で bundle、VERSION + CHANGELOG drift 解消）

### Phase 4 軸 1: preamble core resolver port (PR #177-#181、 v0.3.6.1〜v0.3.6.5)

- **PR-D1** (v0.3.6.1、 PR #177): upstream gstack の `scripts/resolvers/preamble/` から 25 generator + 支援 file 3 個 = 計 28 file を port、 `models.ts` / `jargon-list.json` / `model-overlay.ts` / `preamble.ts` / `question-tuning.ts` を含む。 `scripts/resolvers/index.ts` に全 52 placeholder を wire/予約 = 9 wired + 43 stub。 `{{PREAMBLE}}` placeholder が空展開から実体へ移行し全 41 skill の SKILL.md にお帰りメッセージ・voice 指令・lake-intro・confusion protocol・continuous checkpoint・writing style 等が展開。 Refs #176
- **PR-D2** (v0.3.6.2、 PR #178、 Refs #176): utility resolvers port、 `utility.ts` に 6 関数追加、 6 placeholder を stub から wired に切替
- **PR-D3** (v0.3.6.3、 PR #179、 Refs #176): medium resolvers port、 `composition.ts` / `constants.ts` 他 8 file (~620 行)、 9 placeholder を stub から wired に切替
- **PR-D4a** (v0.3.6.4、 PR #180、 Refs #176): design resolver port、 10 placeholder を stub から wired に切替
- **PR-D4b** (v0.3.6.5、 PR #181、 **Closes #176**): review + testing + review-army resolvers port、 17 placeholder を stub から wired に切替、 issue #176「preamble + resolvers 翻訳完遂」 を完遂

PR-D1〜PR-D4b の累積で stub 43 placeholder を全て実体に wire (= 残 stub 0)。 PR-D4b の Closes #176 = 「preamble + resolvers 翻訳完遂」 を意味する。 一部 placeholder (例: `REVIEW_ARMY` / `CODEX_SECOND_OPINION` / `ADVERSARIAL_STEP` / `CODEX_PLAN_REVIEW`) は host=codex 時に runtime 内部で空文字列を返す挙動 (= wire はされているが output が空)、 これは「placeholder が stub のまま」 とは別概念。

### Phase 4 軸 2: hook 機構の発動経路検証 (PR #182、 v0.3.6.6、 Closes #166)

- `investigate` skill の hooks block 翻訳漏れ復活 (upstream `_upstream/gstack/investigate/SKILL.md.tmpl` の `hooks: PreToolUse (Edit + Write → freeze/bin/check-freeze.sh)` が uzustack 翻訳版で完全消失していたのを復活)
- `freeze/bin/check-freeze.sh` の hook output 新 format migration (旧 `{"permissionDecision":"deny","message":"..."}` → `hookSpecificOutput.hookEventName: "PreToolUse"` で wrap + `permissionDecisionReason` field 置換)
- skill 連鎖 chain pair 3 件 verdict (Layer 1 / Layer 2 / Layer 3 batched verify 全完備)

### Phase 4 軸 3: skill 連鎖検証 (PR #182 内、 chain pair 3 件)

PR #182 内で実施。 Phase 4 多 skill 連鎖の発動経路を 3 chain pair で verify、 Layer 1/2/3 の batched verify を完備。

### Phase 4 軸 4: close path 規律補強 (PR #187 + PR #191、 Closes #186 + Closes #188)

- **PR #187 (Closes #186)**: `.github/workflows/bin-smoke-test.yml` 新規 (44 binary を `--help` で smoke-run、 import 解決 / 構造的破綻 / dev-mode skip 整合性を PR ごとに verify) + `bin/uzustack-model-benchmark` L2-19 import fix + `uzustack-upgrade` dev-mode skip 案内追加
- **PR #191 (Closes #188、 元 PR #189 resurrection)**: `_upstream/gstack/` 直接 import 全廃 (browse.ts inline + test/helpers/ mirror 7 file) + mirror drift detection CI 化 + CONTRIBUTING mirror sync 規律明文化 + bash snippet `$(head)` trailing newline strip bug fix

### Phase 4 完遂宣言 (PR #192、 v0.4.0.0、 Closes #183、 2026-05-24)

MINOR bump release bundle で Phase 4 cluster epic #152/#183 を 完遂。 `package.json` long-standing drift (0.3.6.1 → 0.4.0.0) も同時 sync 解消。

このフェーズで **Phase 4 cluster 4 軸完備** し、 守破離の守期間における「絆を結ぶ」 段階を完遂。 次は Phase 5「橋を架ける」 (= `_upstream-sync/` 骨格 + browse 実機検証準備 + 依存グラフ可視化、 Phase 6 の 14 skill 3 選択肢判定の素材集め) へ。 learnings 機構実装は Phase 5 とは別の epic として Phase 5+ で並走または Phase 5 後に実施。

**Phase 4 cluster で確立した learning** (= 後続 Phase に carry):

- **stacked PR pattern + `--delete-branch` 事故**：PR #187 を `--delete-branch` で merge した結果、 stacked PR #189 の base branch が削除されて auto-close + reopen 不可になった。 PR #191 として same head branch を main rebase 後 resurrection。 学習：stacked PR の base merge では `--delete-branch` を flag せず、 stacked head land 後に base 手動 cleanup
- **issue 化判断軸の機械適用違反**：PR #189/#191 起票時に follow-up として #190 (browse.ts inline drift detection CI 化) を起票したが、 workflow.md 規律「step 着手 = issue 起票を機械適用しない」 違反として user 指摘で close。 browse skill 実装方針未決定段階の先走起票
- **VERSION ↔ package.json drift の自動検知**：`/ship` Step 12 idempotency check (DRIFT_STALE_PKG state) で package.json の version skew を auto 検知する仕組みが PR-D4b 以降で稼働。 v0.4.0.0 release で long-standing 0.3.6.1 → 0.4.0.0 sync

---

## 用語

- **Phase 6 予約スタブ**：当初は subtree pull で取り込めるか実機検証が必要な skill 10 件（`browse` / `qa` / `qa-only` / `canary` / `setup-browser-cookies` / `open-uzustack-browser` / `connect-chrome` / `make-pdf` / `pair-agent` / `benchmark`）として定義。Phase 3.6（PR #140）で **browse 機構必須 14 skill** に reframe（上記 10 件 + `design-review` / `design-consultation` / `devex-review` / `land-and-deploy`）
- **Type 1**：gstack を翻訳・検証したスキル（`type: translated`）
- **Type 3**：Type 2（個人運用）から属人性を抜いた汎用版（`type: native`）
- **守の完成**：当初は「Phase 6 予約スタブ 10 件の Type 1/3 判定完了」 と定義。Phase 3.6（PR #140）で **browse 機構必須 14 skill の動作実装完了** に reframe、Phase 6 で達成予定
