---
name: devex-review
type: translated
preamble-tier: 3
version: 1.0.0
description: |
  ライブ developer experience 監査。browse tool を使って実際に developer
  experience を TEST する：docs を navigate、getting started flow を試す、
  TTHW を計測、error message を screenshot、CLI help text を評価。
  証拠付き DX scorecard を生成。/plan-devex-review の score が存在すれば
  比較する（boomerang：plan は 3 分、現実は 8 分）。"test the DX"、
  "DX audit"、"developer experience test"、"try the onboarding" と
  要求されたときに使用する。Developer 向け feature を ship した後に
  能動的に提案する。(uzustack)
  Voice triggers (speech-to-text aliases): "dx audit", "test the developer experience", "try the onboarding", "developer experience test", "DX 監査", "開発者体験を試す", "オンボーディングを試す".
triggers:
  - live dx audit
  - test developer experience
  - measure onboarding time
  - DX 監査
  - 開発者体験 test
  - オンボーディング時間計測
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - WebSearch
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->







# /devex-review: Live Developer Experience 監査

あなたは live な developer product を dogfood する DX engineer。Plan を review しているのではない。Experience について読んでいるのではない。**TEST している**。

browse tool で docs を navigate、getting started flow を試し、developer が実際に見るものを screenshot する。Bash で CLI command を試す。Measure する、guess しない。



## Scope Declaration

Browse は web-accessible な surface を test できる：docs page、API playground、web dashboard、signup flow、interactive tutorial、error page。

Browse は test **できない**：CLI install friction、terminal 出力 quality、ローカル環境 setup、email 認証 flow、real credential が必要な auth、offline 挙動、build 時間、IDE integration。

test 不能な dimension では bash を使う（CLI --help、README、CHANGELOG 用）か artifact からの INFERRED と mark。Guess しない。各 score の evidence source を述べる。

## Step 0: Target Discovery

1. CLAUDE.md を読み、project URL、docs URL、CLI install command を取得
2. README.md を読み、getting started 指示を取得
3. package.json または equivalent を読み、install command を取得

URL が欠落していれば、AskUserQuestion で：「test すべき docs/product の URL は何か？」

### Boomerang Baseline

過去の /plan-devex-review score を check：

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)"
~/.claude/skills/uzustack/bin/uzustack-review-read 2>/dev/null | grep plan-devex-review || echo "NO_PRIOR_PLAN_REVIEW"
```

過去 score が存在すれば、表示する。これらが boomerang 比較の baseline。

## Step 1: Getting Started 監査

browse 経由で docs/landing page に navigate。Screenshot する。

```
GETTING STARTED AUDIT
=====================
Step 1: [what dev does]          Time: [est]  Friction: [low/med/high]  Evidence: [screenshot/bash output]
Step 2: [what dev does]          Time: [est]  Friction: [low/med/high]  Evidence: [screenshot/bash output]
...
TOTAL: [N steps, M minutes]
```

0-10 で score。Calibration には dx-hall-of-fame.md の「## Pass 1」を load する。

## Step 2: API/CLI/SDK Ergonomics 監査

test 可能なものを test：
- CLI: `--help` を bash で実行。出力 quality、flag design、discoverability を評価。
- API playground: 存在すれば browse で navigate。Screenshot。
- Naming: API surface 全体での consistency を check。

0-10 で score。Calibration には dx-hall-of-fame.md の「## Pass 2」を load する。

## Step 3: Error Message 監査

一般的 error scenario を trigger：
- Browse: 404 page に navigate、不正 form を submit、未認証 access を試す
- CLI: 引数欠落、不正 flag、bad input で実行

各 error を screenshot。Elm/Rust/Stripe の three-tier model に対して score。

0-10 で score。Calibration には dx-hall-of-fame.md の「## Pass 3」を load する。

## Step 4: Documentation 監査

browse で docs structure を navigate：
- search 機能を check（一般的な query 3 つを試す）
- code 例が copy-paste-complete か検証
- 言語 switcher の挙動を check
- 情報 architecture を check（必要なものを 2 分以内に見つけられるか？）

主要 findings を screenshot。0-10 で score。dx-hall-of-fame.md の「## Pass 4」を load。

## Step 5: Upgrade Path 監査

bash で読む：
- CHANGELOG quality（明確？user-facing？migration note ？）
- Migration guides（存在？step-by-step ？）
- コード中の Deprecation 警告（deprecated/obsolete を grep）

0-10 で score。Evidence: file から INFERRED。dx-hall-of-fame.md の「## Pass 5」を load。

## Step 6: Developer Environment 監査

bash で読む：
- README setup 指示（step ？prerequisite ？platform カバレッジ？）
- CI/CD 設定（存在？文書化？）
- TypeScript 型（該当する場合）
- Test utility / fixture

0-10 で score。Evidence: file から INFERRED。dx-hall-of-fame.md の「## Pass 6」を load。

## Step 7: Community & Ecosystem 監査

Browse:
- Community link（GitHub Discussions、Discord、Stack Overflow）
- GitHub issues（応答時間、template、label）
- Contributing guide

0-10 で score。Evidence: web-accessible なものは TESTED、それ以外は INFERRED。

## Step 8: DX Measurement 監査

feedback 機構を check：
- Bug report template
- NPS / feedback widget
- Docs に対する analytics

0-10 で score。Evidence: file/page から INFERRED。

## DX Scorecard（証拠付き）

```
+====================================================================+
|              DX LIVE AUDIT — SCORECARD                              |
+====================================================================+
| Dimension            | Score  | Evidence | Method   |
|----------------------|--------|----------|----------|
| Getting Started      | __/10  | [screenshots] | TESTED   |
| API/CLI/SDK          | __/10  | [screenshots] | PARTIAL  |
| Error Messages       | __/10  | [screenshots] | PARTIAL  |
| Documentation        | __/10  | [screenshots] | TESTED   |
| Upgrade Path         | __/10  | [file refs]   | INFERRED |
| Dev Environment      | __/10  | [file refs]   | INFERRED |
| Community            | __/10  | [screenshots] | TESTED   |
| DX Measurement       | __/10  | [file refs]   | INFERRED |
+--------------------------------------------------------------------+
| TTHW (measured)      | __ min | [step count]  | TESTED   |
| Overall DX           | __/10  |               |          |
+====================================================================+
```

## Boomerang 比較

baseline check で /plan-devex-review score が存在すれば：

```
PLAN vs REALITY
================
| Dimension        | Plan Score | Live Score | Delta | Alert |
|------------------|-----------|-----------|-------|-------|
| Getting Started  | __/10     | __/10     | __    | ⚠/✓   |
| API/CLI/SDK      | __/10     | __/10     | __    | ⚠/✓   |
| Error Messages   | __/10     | __/10     | __    | ⚠/✓   |
| Documentation    | __/10     | __/10     | __    | ⚠/✓   |
| Upgrade Path     | __/10     | __/10     | __    | ⚠/✓   |
| Dev Environment  | __/10     | __/10     | __    | ⚠/✓   |
| Community        | __/10     | __/10     | __    | ⚠/✓   |
| DX Measurement   | __/10     | __/10     | __    | ⚠/✓   |
| TTHW             | __ min    | __ min    | __ min| ⚠/✓   |
```

live score < plan score - 2 となる dimension を flag（現実が plan に届かない）。

## Review Log

**PLAN MODE EXCEPTION — ALWAYS RUN:**

```bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"devex-review","timestamp":"TIMESTAMP","status":"STATUS","overall_score":N,"product_type":"TYPE","tthw_measured":"TTHW","dimensions_tested":N,"dimensions_inferred":N,"boomerang":"YES_OR_NO","commit":"COMMIT"}'
```







## Next Steps

監査後、推奨：
- 見つかった gap を fix（specific、actionable な fix）
- fix 後に /devex-review を再実行し改善を検証
- boomerang で significant な gap が出たら、次の feature plan で /plan-devex-review を再実行

## Formatting Rules

* issue は番号（1、2、3...）、option は文字（A、B、C...）。
* 全 dimension に evidence source 付きで rate する。
* Screenshot が gold standard。File 参照は許容。Guess は不可。
