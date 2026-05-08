# Phase 6 で実装予定の skill 一覧

uzustack は Phase 3.5 までに gstack の workflow skill を Markdown / docs 層で翻訳完了したが、 **browse 機構 (永続的 browser daemon)** を必要とする 12 skill は Phase 6 で実装予定の状態にある。 本 doc はその 12 skill を**正典 list** として articulate する。

## 背景

`_upstream/gstack/ARCHITECTURE.md:5-7`:

> "gstack gives Claude Code a persistent browser and a set of opinionated workflow skills. **The browser is the hard part — everything else is Markdown.**"

gstack は (1) 永続的 browser 機構 と (2) ワークフロー skill の 2 構成要素を持つ。 (1) と (2) は logically separate だが、 全 43 skill のうち 12 skill (28%) が (1) を必須前提としている = **部分的依存**。

uzustack の守期間 (Phase 0c〜3.5) では (2) の Markdown / docs 層を翻訳することに集中し、 (1) の Playwright + Chromium + Chrome extension 等の hard part は Phase 6 (= 守の完成 + 破への前段) で着手する。

## 守完走判定の再定義

- **動作する skill**: 31 skill (browser 非依存 28 + optional 依存 3)
- **Phase 6 で実装予定 skill**: 12 skill (本 doc 対象)
- **守完走 base = 31 skill** (gstack 全 43 skill ではない)

## Phase 6 待ち 12 skill list

| # | skill | gstack 側 evidence (path:line) | uzustack 現状 frontmatter `status` |
|---|---|---|---|
| 1 | browse | `_upstream/gstack/browse/SKILL.md.tmpl:27` | `phase6-reserved` |
| 2 | open-uzustack-browser | `_upstream/gstack/open-gstack-browser/SKILL.md.tmpl:5` | `phase6-reserved` |
| 3 | pair-agent | `_upstream/gstack/pair-agent/SKILL.md.tmpl:29` | `phase6-reserved` |
| 4 | connect-chrome | `_upstream/gstack/open-gstack-browser` の alias | `phase6-reserved` |
| 5 | qa | `_upstream/gstack/qa/SKILL.md.tmpl:87` ("Find the browse binary") | (未設定 → 追加必須) |
| 6 | qa-only | qa の report-only variant | `phase6-reserved` |
| 7 | canary | `_upstream/gstack/canary/SKILL.md.tmpl:33` (browse daemon 監視) | `phase6-reserved` |
| 8 | benchmark | `_upstream/gstack/benchmark/SKILL.md.tmpl:34` (perf command + JS eval) | (未設定 → 追加必須) |
| 9 | make-pdf | `_upstream/gstack/make-pdf/src/browseClient.ts:1-15` (HTML→PDF rendering) | (未設定 → 追加必須) |
| 10 | design-review | `_upstream/gstack/design-review/SKILL.md.tmpl:79` (visual QA + screenshot) | (未設定 → 追加必須) |
| 11 | design-consultation | `_upstream/gstack/design-consultation/SKILL.md.tmpl:70` (visual research) | (未設定 → 追加必須) |
| 12 | setup-browser-cookies | `_upstream/gstack/setup-browser-cookies/SKILL.md.tmpl:6` (cookie import to headless) | `phase6-reserved` |
| 13 | land-and-deploy | `_upstream/gstack/land-and-deploy/SKILL.md.tmpl:1040` ("SETUP (run this check BEFORE any browse command)") | (未設定 → 追加必須) |

> 注: 12 skill と articulate していたが、 land-and-deploy 再 grep で必須依存が確認されたので **正確には 13 skill**。 ただし connect-chrome は open-uzustack-browser の alias であり実体重複なので「機能数としては 12 (実 entry 13)」 と扱う。 守完走 base 31 skill は (43 - 12) で計算 (alias を除く論理 skill 数) — alias 1 件を引いた formula を Phase 6 着手時に再確認する。

(※ 上記 「31 skill base」 は alias 取扱の精査が完了するまで暫定値。 doc 反映時は ARCHITECTURE / README で「31〜32 skill」 範囲で articulate し、 Phase 6 着手前に確定する。)

## 各 skill の現状 stub 状態

- 全 12 skill が repo top に SKILL.md.tmpl 存在 (= 翻訳作業は完了)
- bin / lib は未実装 (空 directory または不存在)
- `{{PREAMBLE}}` placeholder 直書きで、 placeholder engine (`scripts/gen-skill-docs.ts` line 25 のコメント「resolver は空 stub」 = Phase 4+ で本体実装) がまだ resolve していない状態
- 既存の H1 注記 `# <skill> — Phase 6 で対応予定` が connect-chrome / canary / setup-browser-cookies の 3 skill に存在 (他 9 skill は無し) — 不揃い

## 統一方針 (本 PR で適用)

### frontmatter に `status: phase6-reserved` を全 13 entry に統一配置

未設定の 6 skill (qa / benchmark / make-pdf / design-review / design-consultation / land-and-deploy) に `status: phase6-reserved` を追加。 design-review / design-consultation / land-and-deploy は `type: translated` を維持しつつ status 併記 (= 翻訳完了 + Phase 6 待ち) と articulate。

### warning block を `{{PREAMBLE}}` 直後に統一配置

`docs/uzustack/phase6-warning-block.md` に source of truth を置き、 各 SKILL.md.tmpl に直書き (placeholder engine が空 stub のため自動注入不可)。

### 既存 H1 注記は warning block に統合

connect-chrome / canary / setup-browser-cookies の H1 注記は warning block に統合して削除し、 表記を統一する。

## 関連 doc

- [phase6-warning-block.md](phase6-warning-block.md) — 共通 warning block の source of truth + 配置規律
- [translation-voice-guide.md](translation-voice-guide.md) — voice 翻案の射程 (browse 機構関連用語の取扱)
- [phase-history.md](phase-history.md) — Phase 0c〜3.5 進捗 + 主要 PR # 内訳
- 上位 doc: `ARCHITECTURE.md` の Phase progression / 守破離 section
