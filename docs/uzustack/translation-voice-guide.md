# 翻訳 voice ガイド（uzustack）

このドキュメントは uzustack の翻訳作業（gstack の英語スキルを日本語化する）で使う **voice 規約と訳語表** を集約したものです。`CONTRIBUTING.md` の翻訳ガイド section から詳細部分を切り出して、メンテナーが手元で参照しやすい単一文書にまとめています。

翻訳の入り口（配置とメタデータ・翻訳の粒度・新規翻訳の手順・small batch アプローチ・rebase 手順）は `CONTRIBUTING.md` を参照してください。

**読者目的別の 3 章構成**：

- **第 1 章**：翻訳作業中に参照する（contributor 向け、ルール本体）
- **第 2 章**：規約を育てる時に参照する（メンテナー向け、meta-rule）
- **第 3 章**：validator (機械化) で参照する（validator 開発者向け、索引）
- **Appendix A**：voice 規約の成立履歴（時軸 audit trail）

---

## 1. 翻訳作業中に参照する

### 1.1 機械置換（gstack → uzustack）

bin 機械翻訳と既存 skill の .tmpl 化が「**置換ルール表を見るだけ**」で進むよう、`gstack` → `uzustack` の機械置換ルールを明文化しています。3 軸構成。

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
| Bezos / Munger / Jobs / Hastings / Horowitz / Altman / Rams / Graham / Chesky / Grove | 個人名維持（思考特性の attribution、business persona quote の出典として保持） |

#### voice 軸（思想・規律の翻案）

原文を尊重する目的で、訳語と併記する形で残す。

| gstack | uzustack |
|---|---|
| Boil the Lake | 一晩でやり切る（Boil the Lake） |
| Search Before Building | 作る前に探す（Search Before Building） |
| "the gstack way" | "uzustack の流儀"（"the gstack way"） |

---

### 1.2 英語維持

翻訳しない対象。頻度順 × coverage scope で、訳者がよく出会う順に並ぶ。

#### CLI 名 / env / path 識別子

`base` / `ours` / `theirs`、API 名、bin 名（backtick 囲み、例：`uzustack-config`）等の fixed identifier は英語維持。

#### bash section 見出し

`Usage:` / `Behavior:` / `Exit codes:` 等の section 見出しは英語維持（CLI 慣習に合わせる）。

#### JSON field / enum / inline marker / machine-readable marker

LLM 出力 / tool call / shell parser の機械処理対象は英語維持。reader 想定の言語と機械処理 contract を分離する。

- **machine-readable marker**：`CONFIRMED` / `DISAGREE` / `TASTE DECISION` / `PHASE [N] COMPLETE` / `STATUS` / `SOURCE` / `TIMESTAMP` / `COMMIT` / `RESTORE_PATH` 等
- **JSON field**：`scope_appetite` / `risk_tolerance` / `detail_preference` / `autonomy` / `architecture_care` 等
- **enum value**：`never-ask` / `always-ask` / `ask-only-for-one-way` / `SELECTIVE_EXPANSION` / `FULL_REVIEW` / `DX POLISH` 等
- **dimension 名**：calibration gate threshold（`sample_size` / `skills_covered` / `question_ids_covered` / `days_span`）等
- **inline marker**：`STOP` / `OK` / `CRITICAL GAP` 等
- **tool / framework 名**：`AskUserQuestion` / `RECOMMENDATION` 等の fixed identifier

#### 数値 specificity / embedded code structural integrity

訳出時に数値・構造を動かさない。upstream の判断材料を保持する。

- **数値 specificity**：calibration gate threshold（`sample_size >= 20` / `skills_covered >= 3` / `question_ids_covered >= 8` / `days_span >= 7`）、band threshold（0.25 / 0.85 等）の数値はすべて完全保持
- **embedded code structural integrity**：`fs.writeFileSync` / `fs.renameSync` / `JSON.parse` 等の出現回数も訳出後で同数を保つ。atomic write pattern 等の構造を維持

#### design 固有用語 / persona attribution

design / UI / UX 領域の固有用語と persona attribution は英語維持。design 業界の慣用語と attribution を保持する。

- **design 固有用語**：`Designer's eye` / `AI slop` / `design score` 等
- **machine-readable marker**：`DESIGN_READY` / `DESIGN_NOT_AVAILABLE` 等の `DESIGN_*` シリーズ
- **CLI shorthand**：`$D`（design CLI）/ `$B`（browse CLI）等
- **design 概念名**：`Approved Mockups` 等
- **persona 出典群**：Rams / Norman / Krug / Gebbia / Ive / Glass / Maeda / Zhuo / Nielsen / Redish / Jarrett 等の attribution

#### 外部 SaaS / 別プロジェクト identifier

`gstack` 由来は `uzustack` に置換するが、以下は維持：

- **外部 CLI 名**：`gbrain`（別プロジェクト）、`Codex CLI` / `Gemini CLI`（外部 product）
- **外部 path / config**：`~/.gbrain/config.json` / `~/.codex/sessions` / `~/.gemini/projects.json` / `~/.claude/projects`
- **外部 env**：`GBRAIN_URL` / `GBRAIN_TOKEN` / `CODEX_HOME` / `CODEX_API_KEY` / `OPENAI_API_KEY`
- **外部プロジェクト共有 config key**：`gbrain_sync_mode` 等（`uzustack-config` に外部プロジェクトと共有する key）
- **外部 SaaS リソース慣習名**：例 Supabase project name prefix `gbrain`（gbrain CLI で作る project の慣習）
- **OS / Tool UI 引用**：Chrome の `'Developer mode'` / `'Load unpacked'`（Chrome 自身の英語 UI 引用）

#### 外部 LLM 向け prompt 本体

外部 LLM（codex / openai / gemini 等）に投入する prompt 本体は英語維持。判断軸：外部 product への入力は外部 product の言語 contract に従う。Claude Code は uzustack の言語方針（日本語化）を適用するため対象外。

- **英語維持対象**：codex / openai-cli / gemini-cli 等への prompt 本体、system prompt、user prompt
- **uzustack 化対象**：boundary path（`paths containing skills/uzustack`）等の path 識別子のみ

#### subtree path（`_upstream/gstack/`）

uzustack repo 内の `_upstream/gstack/` は subtree directory 名 = 物理 path。文字列内に `gstack` が出ても置換しない。

- **対象**：`_upstream/gstack/<dir>/...` 形式の path 引用、ドキュメント / コメント内の subtree path
- **理由**：物理 directory 名としての identifier、置換すると broken reference

---

### 1.3 翻案

日本語に翻案する voice 規約。翻案規模順（small → large）で、bash 内 inline から経営者思考特性の table まで並ぶ。

#### bash + 副言語 embedded layer

bash + 副言語 embedded（Python heredoc / bun -e の JS 等）の翻訳に適用する規律。

- **エラーメッセージは客観形（日本語）**：「〜が必要、実際は N 個」のような客観事実、責難形（「〜してください」）は避ける
- **インラインコメントは簡潔な日本語**、技術用語は backtick で英語維持
- **括弧**：半角 `(...)` を維持
- **embedded code 内コメント**（Python heredoc / bun -e の JS 等）も日本語化、技術用語は英語維持
- **embedded Python heredoc 内の error 文字列** も日本語化対象（`uzustack-brain-init` / `uzustack-brain-restore` で確認、voice 規約 v1 #2 の客観形ルールが境界を貫通する）
- **TypeScript / 主言語そのもの** は英語維持（reader 想定の言語と一致させる、`uzustack-next-version` 477 行 TS で確立）

#### 単語・短語 layer（Data flow 用語）

データフロー review の path 名は意味重視で訳す。`shadow paths` など voice 概念は原文併記。

| gstack | uzustack |
|---|---|
| happy path | 正常路（happy path） |
| nil path | nil 路 |
| empty path | 空路 |
| error path | エラー路（error path） |
| shadow paths | 影路（shadow paths） |

#### persona / metaphor layer

訳語と併記、初出時に `日本語（English）` で提示。

| gstack | uzustack |
|---|---|
| 10x check | 10 倍 check |
| 10-star product | 10 段階満点の製品 |
| cathedral | カテドラル |
| platonic ideal | プラトン的理想形 |
| dream big | 大きく夢見る |
| premise | 前提（premise） |
| Outside Voice | 外部視点（Outside Voice） |
| founder mode | 創業者モード（founder-mode） |
| wartime / peacetime | 火消し対応 / 平常運転（wartime / peacetime） |

#### Mode / 状態名 layer

訳語と原文の併記形式で、初出時に `日本語（English）` で提示、以降は短縮日本語のみで参照可能。

| gstack | uzustack |
|---|---|
| SCOPE EXPANSION | スコープ拡張モード（SCOPE EXPANSION）→ 短縮：拡張モード |
| SELECTIVE EXPANSION | 選択的拡張モード（SELECTIVE EXPANSION）→ 短縮：選択的拡張モード |
| HOLD SCOPE | スコープ維持モード（HOLD SCOPE）→ 短縮：維持モード |
| SCOPE REDUCTION | スコープ縮減モード（SCOPE REDUCTION）→ 短縮：縮減モード |

#### 経営者思考特性（cognitive patterns）

各思考特性は具体的経営者・投資家の発言に紐づく persona 概念。訳語は意味重視、原文を併記して identity を保持する。

| gstack | uzustack | 出典 |
|---|---|---|
| Classification instinct | 分類本能 | Bezos（一方通行 / 双方向ドア） |
| Paranoid scanning | 強迫的スキャン | Grove |
| Inversion reflex | 反転反射 | Munger |
| Focus as subtraction | 引き算による集中 | Jobs |
| People-first sequencing | 人材優先の順序付け | Horowitz / Hastings |
| Speed calibration | 速度キャリブレーション | Bezos |
| Proxy skepticism | プロキシ懐疑 | Bezos Day 1 |
| Narrative coherence | ナラティブの一貫性 | — |
| Temporal depth | 時間軸の深さ | Bezos at age 80 |
| Founder-mode bias | 創業者モード偏向 | Chesky / Graham |
| Wartime awareness | 戦時意識 | Horowitz |
| Courage accumulation | 勇気の蓄積 | — |
| Willfulness as strategy | 意志の強さは戦略 | Altman |
| Leverage obsession | レバレッジ偏執 | Altman |
| Hierarchy as service | 奉仕としての序列 | UI 系 |
| Edge case paranoia | エッジケース偏執 | UI 系 |
| Subtraction default | 引き算的標準 | Rams |
| Design for trust | 信頼のデザイン | UI 系 |

---

### 1.4 射程外（Phase 6 まで保留）

uzustack の **browse 機構必須 14 skill**（browse / qa / qa-only / canary / benchmark / make-pdf / design-review / design-consultation / devex-review / land-and-deploy / open-uzustack-browser / pair-agent / connect-chrome / setup-browser-cookies）は Phase 6 で実装検討の対象。翻訳作業時の voice 翻案射程を明示する：

#### 射程内（uzustack voice で翻訳）

- SKILL.md.tmpl 本文（method 説明 / phase 構造 / important rules / report 形式）
- frontmatter description / triggers / voice-triggers
- 共通 warning block（詳細：[phase6-warning-block.md](phase6-warning-block.md)）— uzustack voice で記述

#### 射程外（英語のまま動作させる）

- browse 機構の英語 error / output メッセージ — Playwright / Chromium binary が出力する文字列、翻案するとデバッグ困難になる
- Chrome extension の sidebar UI 文字列 — Phase 6 実装時に翻案するか別 issue として判断
- browser-manager 内部の log / debug 出力 — runtime 層に属するため voice 翻案外
- Playwright の locator API / selector 名 — 外部 protocol identifier として維持

#### 判断基準

「文字列が end user の**目に入る**か」で判定する。SKILL.md instruction や warning block は end user が読む = 翻案射程内。内部 binary の error 出力 / log は debug 用 = 翻案射程外。

**事例**：design-review / design-consultation / land-and-deploy は SKILL.md 本文を翻訳完了したが、内部で呼ぶ browse 機構の error / output は Phase 6 まで英語維持 — これを意図的な「partial 翻案」として明文化する。

---

## 2. 規約を育てる時に参照する

### 2.1 集約タイミング規律

翻訳バッチ進行中は規範が PR description / commit message に分散して動いている。**バッチ完了で規範が固まった直後（次バッチ着手前）に本ガイドへ集約**する。Phase 完了判定まで待つとバッチ内参照性が上がらず、PR description を漁る運用になる。

### 2.2 規約射程の拡張ルール（ファイル名も射程）

voice 規約は **ファイル名そのもの** も射程に含める。`bin/<name>` の `<name>` も「ファイル内 identifier」と同じ規律で扱う。

**運用ルール**：外部 product / protocol / tool 名で構成された binary は **`uzustack-` prefix なしで維持** する。

**判断基準**：

- upstream で `gstack-` prefix が付いていない binary は、upstream 側でも「外部 identifier 命名」と判断した signal として読む
- これに従い uzustack 側でも prefix なし維持する（機械化を優先する規律と整合）
- 「内容は外部 identifier 維持、ファイル名だけ `uzustack-` prefix」という分裂状態を生まない

**具体例**：

- `bin/chrome-cdp`（Chrome [外部 product 名] + CDP [外部 protocol 名] の合成）— `uzustack-chrome-cdp` ではなく `chrome-cdp` のまま維持
- 確認 signal：`_upstream/gstack/test/audit-compliance.test.ts` の `bin/chrome-cdp` hardcode（upstream test が path を直接参照、upstream 設計判断の最も強い signal）

### 2.3 v1 で完璧を目指さない方針

翻訳作業中に増えるケースは追記して育てる方針。迷ったら `v2 で見直し` フラグ付きで暫定採用し、翻訳作業を止めない。

**運用方針の補足**：

- **CONFIG_HEADER の日本語化方針**：`gstack-config` の英語コメント約 70 行は、bin 配置初期段階で英語のままコピーで保留 → 本ルール表整備後、brain 系翻訳と整合させて日本語化済
- **DEFAULTS の意味論判断は brain 系翻訳に集中**：gstack 文字を含まない key（例：`gbrain_sync_mode`）は機械置換せず、brain 系翻訳時に集中判断

### 2.4 翻案の指針（meta-rule）

具体ルールは 1.2 / 1.3 に列挙、本 section は判断の meta-rule のみ。

- **persona 表現は意味で訳す**：直訳より「日本語で持つべき重み」を優先。例：`Boil the Lake` の「徹底的にやり切る」感を「一晩でやり切る」で表現
- **Mode 名は初出併記、以降短縮**：`スコープ拡張モード（SCOPE EXPANSION）` 初出 → 「拡張モード」短縮
- **思考特性は意味訳 + 出典維持**：個人名（Bezos / Munger 等）は attribution として保持、訳語は意味重視

### 2.5 蓄積観測

bin 翻訳バッチ完了時の追加観測 3 点：

- **機械置換は dangling reference まで忠実に伝播する**：comment 内の他 binary 参照も置換対象。具体例：`uzustack-question-log:27` の `uzustack-question-sensitivity`（実体未持ち込み）参照を削除した事例。`/simplify` の quality + reuse agent が独立に同じ findings を発見、cross-validation で confidence 高い
- **output 表示英語維持の境界線**：sentinel token + 周辺 context は parser 互換重視で英語維持。`uzustack-specialist-stats` output / dashboard 系で適用。コメント / status メッセージは日本語化、機械処理される token は英語維持
- **judgment 軸数の動的性**：外部 CLI 連携の有無で軸数が変動する。例：`gbrain` 連携あり → 3 軸 / なし → 2 軸 / なし + CONTRIBUTING 統合あり → 2 軸 + 統合タスク。事前合意で軸数を確定すれば翻訳バッチ進行が機械化される

### 2.6 CONTRIBUTING.md との関係

CONTRIBUTING.md「Phase 6 待ち skill 翻訳時の warning 配置必須」 section で「frontmatter status + warning block 配置」 規律を明文化。本節は voice 翻案の **射程** を明文化する補完。配置規律（どこに）↔ 翻案射程規律（何を）の 2 軸で運用する。

---

## 3. validator（機械化）で参照する

### 3.1 機械化対象索引

`scripts/voice-rules.json` で機械化される pattern と、本ガイドの section との対応表。axis 1/2/3 は #165 plan-eng-review で機械化対象外と判定された負の規約軸（rationale は各 row 併記、詳細は [§A.3](#a3-v2-拡張phase-4-機械化)）。

| axis | 内容 | 本ガイド section | 機械化状態 |
|---|---|---|---|
| 文字列軸 | path / env / bin 名 / URL 等 | [1.1 機械置換 / 文字列軸](#文字列軸パスbin-名url-等) | 機械化済（positive rules、5 patterns） |
| 固有名詞軸 | Garry Tan 等 | [1.1 機械置換 / 固有名詞軸](#固有名詞軸) | 機械化済（positive rules、1 pattern） |
| axis 1（負） | 全角括弧 `（` `）` の voice 規約違反検出 | [1.3 翻案 / bash + 副言語 embedded layer](#bash--副言語-embedded-layer) | 機械化対象外（bash code block + string literal 検出に state machine 必須、実装コスト不釣り合い、#165） |
| axis 2（負） | persona attribution / Mode 名表記の維持 | [1.3 翻案](#13-翻案) + [1.2 英語維持](#12-英語維持)（Mode 名 / 経営者思考特性 / persona attribution） | 機械化対象外（30+ identifier の near-miss 検出に file-level state + table drift 管理が必要、line-based validator 設計と質的乖離、#165） |
| axis 3（負） | 外部 LLM prompt 英語維持 | [1.2 英語維持 / 外部 LLM 向け prompt 本体](#外部-llm-向け-prompt-本体) | 機械化対象外（bash 内 codex exec の入れ子 string literal 構造、codex 将来日本語対応で規律 re-evaluation 可能性、#165） |

### 3.2 voice-rules.json schema との cross-ref

`scripts/voice-rules.json` の `patterns` array が validator 側の source of truth。`scripts/skill-validate.ts` が読み込み、`type: translated` な skill file 内の gstack 由来の生 string を検出する。全 pattern は [1.1 機械置換](#11-機械置換gstack--uzustack) の各軸に対応する（negative rules = axis 1/2/3 は #165 で計画中、3.1 参照）：

| voice-rules.json pattern id | 検出対象 | 1.1 内軸 |
|---|---|---|
| `gstack_home_path` | `~/.gstack/` (path) | 文字列軸 |
| `gstack_home_env` | `$GSTACK_HOME` (env var) | 文字列軸 |
| `gstack_bin_prefix` | `gstack-XXX` (bin 名) | 文字列軸 |
| `gstack_skill_path` | `~/.claude/skills/gstack/` | 文字列軸 |
| `gstack_repo_url` | `github.com/garrytan/gstack` | 文字列軸 |
| `garry_tan_name` | `Garry Tan` (人名) | 固有名詞軸 |

新 pattern を追加する時は `scripts/voice-rules.json` の `patterns` array に entry を追記する（schema は `version` + `description` + `patterns[]` で forward compatible）。axis 1/2/3 は #165 で機械化対象外確定（理由は §3.1 各 row 併記 + §A.3 末尾の audit trail）、将来 Phase 5 #166 hook 機構と一体で再 design 候補。

---

## Appendix A：voice 規約の成立履歴

### A.1 v1（Phase 3 bin 翻訳バッチ）

Phase 3 の bin 翻訳バッチ（PR #40 / #42 / #44 / #46 / #48）で voice 規約 v1 を確立。bash + 副言語 embedded スクリプトの翻訳に適用する 7 項目（section 見出し英語維持 / error msg 客観形 / inline comment 日本語 / fixed identifier 英語維持 / bin 名 backtick / embedded code 日本語化 / 半角括弧）に加え、外部 SaaS / 別プロジェクト identifier 維持規律、bin 翻訳バッチ完了時の追加観測 3 点、ファイル名も射程に含める拡張、集約タイミング規律を establish。PR #40 commit `d1b2c0f` で 7 項目、PR #44 で外部 identifier 拡張、PR #46 で観測 3 点、PR #48 でファイル名射程拡張を確立。

### A.2 v2（Phase 3.5 plan / strategy / design 系）

Phase 3.5 進行（plan / strategy / cli tuning / design / orchestration 系 skill 翻訳）で voice 規約 v2 を確立。PR #66 で `plan-ceo-review` 翻訳時に persona 表現の訳語、PR #68〜#118 で Mode 名 / 経営者思考特性 / persona 表現 / Data flow 用語 / 外部 LLM prompt 英語維持 / JSON field / enum / inline marker / 数値 specificity / embedded code structural / subtree path 維持 / design 文脈の英語維持 / 翻訳指針を蓄積。PR #120 で本ガイドへ集約。

### A.3 v2 拡張（Phase 4 機械化）

Phase 4 で voice-rules.json による機械化を開始。PR #164（commit `8d09561`）で `scripts/voice-rules.json` v2 を導入、positive rules 6 patterns（URL + 固有名詞軸を含む）を機械化。`scripts/skill-validate.ts` が読み込み、translated skill での gstack 識別子 leak を CI で検出。#165 で negative rules（axis 1/2/3 = 全角括弧 / persona attribution / external LLM prompt 英語維持）の機械化を検討、plan-eng-review session（本 PR）で 3 軸全て機械化対象外と判定。

判定の根拠（軸別）：

- **axis 1（全角括弧）**：machine 化対象を正確に区別するには bash code block の境界検出に加え bash 内 string literal（subagent prompt / heredoc 等の multi-line 引数）検出が必要、state machine 実装が axis 3 と同コスト。fact check で translated skill の bash code block 内に全角括弧 34 instances / 10 files が既存、すべて bash comment 行（`# ...（注記）`）で日本語 punctuation として運用、voice 規約 v1 #7（bash 括弧は半角維持）と実態 drift。machine 化 attempt は voice 規約 v1 #7 改定（Phase 3 確立済規律の re-evaluation）か state machine 実装の二択になり、現時点で機械化対象外。
- **axis 2（persona attribution / Mode 名）**：Mode 名 4 + 経営者思考特性 18 + persona attribution 10+ の 30+ identifier の near-miss 検出に file-level state（同 file 内で初出併記済か）+ identifier table drift 管理が必要、line-based 1-pass scan の validator 責務と質的乖離。docs §1.3 が source of truth として運用、翻訳作業時の reviewer 軸で覆う。
- **axis 3（外部 LLM prompt 英語維持）**：bash 内 `codex exec "..."` の複数行引数として書かれた入れ子 string literal 構造（autoplan/SKILL.md.tmpl L253-261 / L359-373 / L437-446 / L552-566 等）で、region 検出に bash + string literal の二段 state machine が必須。codex / openai-cli / gemini-cli が将来日本語対応した場合に規律ごと見直しになる可能性があり、現時点で機械化必要性が低い。

Phase 5 #166 hook 機構の発動経路検証と一体で 3 軸の機械化を再 design する候補（PR merge 経路で hook が enforce する path を整備する文脈で、region 検出機構と統合）。

---

## Related docs

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — 翻訳作業の入り口（配置 / 粒度 / 手順 / rebase）
- [translation-rebase-fixes.md](translation-rebase-fixes.md) — rebase 時に保持すべき uzustack 独自 fix
- [phase6-warning-block.md](phase6-warning-block.md) — Phase 6 待ち skill の warning block template
- [phase-history.md](phase-history.md) — Phase 進捗と主要 PR # 内訳
