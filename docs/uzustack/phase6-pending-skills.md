# Phase 6 で実装検討の skill 一覧

uzustack は Phase 3.5 までに gstack の workflow skill を Markdown / docs 層で翻訳完了したが、 **browse 機構 (永続的 browser daemon)** を必要とする 14 skill (13 機能 + connect-chrome alias) は Phase 6 で実装検討の状態にある。 本 doc はその 14 entry を**正典 list** として明文化する。

## 背景

`_upstream/gstack/ARCHITECTURE.md:5-7`:

> "gstack gives Claude Code a persistent browser and a set of opinionated workflow skills. **The browser is the hard part — everything else is Markdown.**"

gstack は (1) 永続的 browser 機構 と (2) ワークフロー skill の 2 構成要素を持つ。 (1) と (2) は logically separate だが、 全 43 skill のうち 14 entry (13 機能、 32%) が (1) を必須前提としている = **部分的依存**。

uzustack の守期間の前半 (Phase 0c〜3.5 = 型の取り込み完了) では (2) の Markdown / docs 層を翻訳することに集中し、 (1) の Playwright + Chromium + Chrome extension 等の hard part は Phase 6 (= 守の完成 + 破への前段) で着手検討する。 守期間全体は Phase 0c〜Phase 6 (Phase 6 完了で守完走) と位置付ける。

## 守完走判定の再定義

- **動作する skill**: 30 skill (browser 非依存 28 + optional 依存 2)
- **Phase 6 で実装検討 skill**: 14 entry / 13 機能 (本 doc 対象)
- **守完走 base = 30 skill** (gstack 全 43 skill ではない)

## 判定基準

「**`{{BROWSE_SETUP}}` placeholder の存在 = browse 必須」 ではない**。 placeholder engine (`scripts/gen-skill-docs.ts`) の resolver `BROWSE_SETUP: (_ctx, _args) => ''` は **空文字列を返す**ため、 SKILL.md 生成時に literal が完全削除される。

実際の browse 必須判定は次の 2 条件:

1. **(a) SKILL.md 本文に browse 機構を呼ぶ literal instruction がある** (例: 「browse tool で docs を navigate」「screenshot を撮る」 等)
2. **(b) bin / shell command で browse 機構を呼ぶ** (例: `~/.claude/skills/uzustack/browse/bin/browse` の literal call)

本 doc の 14 entry は上記 (a) または (b) を満たす skill。

## Phase 6 待ち 14 entry list

| # | skill | gstack 側 evidence (path:line) | uzustack 現状 frontmatter `status` |
|---|---|---|---|
| 1 | browse | `_upstream/gstack/browse/SKILL.md.tmpl:27` | `phase6-reserved` |
| 2 | open-uzustack-browser | `_upstream/gstack/open-gstack-browser/SKILL.md.tmpl:5` | `phase6-reserved` |
| 3 | pair-agent | `_upstream/gstack/pair-agent/SKILL.md.tmpl:29` | `phase6-reserved` |
| 4 | connect-chrome (alias) | `_upstream/gstack/open-gstack-browser` の alias | `phase6-reserved` |
| 5 | qa | `_upstream/gstack/qa/SKILL.md.tmpl:87` ("Find the browse binary") | `phase6-reserved` |
| 6 | qa-only | qa の report-only variant | `phase6-reserved` |
| 7 | canary | `_upstream/gstack/canary/SKILL.md.tmpl:33` (browse daemon 監視) | `phase6-reserved` |
| 8 | benchmark | `_upstream/gstack/benchmark/SKILL.md.tmpl:34` (perf command + JS eval) | `phase6-reserved` |
| 9 | make-pdf | `_upstream/gstack/make-pdf/src/browseClient.ts:1-15` (HTML→PDF rendering) | `phase6-reserved` |
| 10 | design-review | `_upstream/gstack/design-review/SKILL.md.tmpl:79` (visual QA + screenshot) | `phase6-reserved` |
| 11 | design-consultation | `_upstream/gstack/design-consultation/SKILL.md.tmpl:70` (visual research) | `phase6-reserved` |
| 12 | devex-review | uzustack `devex-review/SKILL.md.tmpl:7,50,83` ("browse tool で navigate / screenshot") | `phase6-reserved` |
| 13 | setup-browser-cookies | `_upstream/gstack/setup-browser-cookies/SKILL.md.tmpl:6` (cookie import to headless) | `phase6-reserved` |
| 14 | land-and-deploy | `_upstream/gstack/land-and-deploy/SKILL.md.tmpl:1040` ("SETUP (run this check BEFORE any browse command)") | `phase6-reserved` |

## fact-check 履歴

本 list は次の 3 段階の fact-check で確定:

1. **Agent 2 grep (12 pattern)**: `browse/bin/`, `browser-manager`, `chrome-cdp`, `playwright`, `chromium`, `extension`, `screenshot` 等で全 43 skill を grep。 結果: 必須 12 / optional 3 / 非依存 28
2. **本文 broad grep**: 「browse tool」「browse 経由」「screenshot を撮る」 等の自然言語 pattern で再 check。 devex-review が「browse tool で docs を navigate / screenshot」 と明示しており、 旧「非依存」 から「必須依存」 へ reclassify
3. **autoplan 削除確認**: gstack 上流 (`_upstream/gstack/autoplan/SKILL.md` line 322) には browse literal あるが、 uzustack 翻訳済 (repo top) では削除済。 旧「optional」 から「非依存」 へ reclassify
4. **office-hours 確認**: `{{BROWSE_SETUP}}` placeholder のみで本文 instruction なし → 「非依存」 維持 (placeholder は resolver で空文字列に削除される)

## 各 skill の現状 stub 状態

- 全 14 entry が repo top に SKILL.md.tmpl 存在 (= 翻訳作業は完了)
- bin / lib は未実装 (空 directory または不存在)
- `{{PREAMBLE}}` placeholder は `scripts/gen-skill-docs.ts` で空文字列 resolver により削除される (issue #134 で深掘り対象)
- 全 14 entry の SKILL.md.tmpl 先頭 (frontmatter 直後) に共通 warning block を統一配置 (詳細: [phase6-warning-block.md](phase6-warning-block.md))

## 関連 doc

- [phase6-warning-block.md](phase6-warning-block.md) — 共通 warning block の source of truth + 配置規律
- [translation-voice-guide.md](translation-voice-guide.md) — voice 翻案の射程 (browse 機構関連用語の取扱)
- [phase-history.md](phase-history.md) — Phase 0c〜3.5 進捗 + 主要 PR # 内訳
- 上位 doc: `ARCHITECTURE.md` の「(1) browser 機構 と (2) ワークフロー skill の依存関係」 + 「守破離における Phase 6 の位置付け」 section
- 関連 issue: #134 (placeholder engine 空 stub 解決) / #135 (learn skill 機能性検証) / #138 (本作業のメイン issue)
