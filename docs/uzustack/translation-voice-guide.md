# 翻訳 voice ガイド（uzustack）

このドキュメントは uzustack の翻訳作業（gstack の英語スキルを日本語化する）で使う **voice 規約と訳語表** を集約したものです。`CONTRIBUTING.md` の翻訳ガイド section から詳細部分を切り出して、メンテナーが手元で参照しやすい単一文書にまとめています。

翻訳の入り口（配置とメタデータ・翻訳の粒度・新規翻訳の手順・small batch アプローチ・rebase 手順）は `CONTRIBUTING.md` を参照してください。

---

## 置換ルール表 v1

bin 機械翻訳と既存 skill の .tmpl 化が「**置換ルール表を見るだけ**」で進むよう、`gstack` → `uzustack` の機械置換ルールを明文化しています。3 軸構成。

### 文字列軸（パス・bin 名・URL 等）

| gstack | uzustack |
|---|---|
| `~/.gstack/` | `~/.uzustack/` |
| `$GSTACK_HOME` | `$UZUSTACK_HOME` |
| `gstack-*` | `uzustack-*` |
| https://github.com/garrytan/gstack | https://github.com/uzumaki-inc/uzustack |
| `~/.claude/skills/gstack/` | `~/.claude/skills/uzustack/` |

**注意**：長いパターンから先に置換すること。`gstack-config` → `uzustack-config` を先、`gstack` → `uzustack` を後。逆順だと `uzustackconfig` のような壊れ方をする。

### 固有名詞軸

| gstack | uzustack |
|---|---|
| Garry Tan | uzustack 開発者 |
| Y Combinator / YC | スタートアップ |
| Garry Tan 個人を指す箇所 | OSS メンテナー |
| Bezos / Munger / Jobs / Hastings / Horowitz / Altman / Rams / Graham / Chesky / Grove | 個人名維持（思考特性の attribution、business persona quote の出典として保持） |

### voice 軸（思想・規律の翻案）

原文を尊重する目的で、訳語と併記する形で残す。

| gstack | uzustack |
|---|---|
| Boil the Lake | 一晩でやり切る（Boil the Lake） |
| Search Before Building | 作る前に探す（Search Before Building） |
| "the gstack way" | "uzustack の流儀"（"the gstack way"） |

---

## voice 規約 v2 拡張（plan / strategy review 系で確立、PR #66）

`plan-ceo-review` 翻訳（PR #66）で plan / strategy review 系 skill が共有する persona 表現の訳語を確立。後続の plan 系 skill 翻訳（PR #110〜#118）で踏襲。

### Mode / 状態名（plan-ceo-review の 4 mode 等）

訳語と原文の併記形式で、初出時に `日本語（English）` で提示、以降は短縮日本語のみで参照可能。

| gstack | uzustack |
|---|---|
| SCOPE EXPANSION | スコープ拡張モード（SCOPE EXPANSION）→ 短縮：拡張モード |
| SELECTIVE EXPANSION | 選択的拡張モード（SELECTIVE EXPANSION）→ 短縮：選択的拡張モード |
| HOLD SCOPE | スコープ維持モード（HOLD SCOPE）→ 短縮：維持モード |
| SCOPE REDUCTION | スコープ縮減モード（SCOPE REDUCTION）→ 短縮：縮減モード |

### 経営者思考特性（cognitive patterns、industry leader 由来）

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

### 経営者・builder persona 表現（metaphor / vision 系）

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
| wartime / peacetime | 戦時 / 平時 |

### Data flow / review 用語

データフロー review の path 名は意味重視で訳す。`shadow paths` など voice 概念は原文併記。

| gstack | uzustack |
|---|---|
| happy path | 正常路（happy path） |
| nil path | nil 路 |
| empty path | 空路 |
| error path | エラー路（error path） |
| shadow paths | 影路（shadow paths） |

### 翻訳指針

- **persona 表現は意味で訳す**：直訳より「日本語で持つべき重み」を優先。例：`Boil the Lake` の「徹底的にやり切る」感を「一晩でやり切る」で表現
- **Mode 名は初出併記、以降短縮**：`スコープ拡張モード（SCOPE EXPANSION）` 初出 → 「拡張モード」短縮
- **思考特性は意味訳 + 出典維持**：個人名（Bezos / Munger 等）は attribution として保持、訳語は意味重視
- **STOP / OK / CRITICAL GAP 等の inline marker**：英語維持（CLI 慣習との整合、voice 規約 v1 項目 1 と同型）
- **AskUserQuestion / RECOMMENDATION 等の tool / framework 名**：英語維持（fixed identifier）

---

## voice 規約 v2 拡張 — Phase 3.5 蓄積（PR #68〜#118 で確立、PR #120 で集約）

Phase 3.5 進行（plan / strategy / cli tuning / design / orchestration 系 skill 翻訳）を通じて確立した英語維持規律。voice 規約 v1 項目 4「fixed identifier 英語維持」を拡張する形で文書化。

### 外部 LLM 向け prompt 全体の英語維持（autoplan 翻訳時に確立、PR #118）

外部 LLM（codex / openai / gemini 等）に投入する prompt 本体は **英語維持**。LLM 訓練語の効果を保つ。voice 規約 v1 項目 4 を「外部 SaaS / 別プロジェクト identifier 維持」から「外部 LLM への prompt 全体」に拡張した解釈。

- **英語維持対象**：codex / openai-cli / gemini-cli 等への prompt 本体、system prompt、user prompt
- **uzustack 化対象**：boundary path（`paths containing skills/uzustack`）等の path 識別子のみ
- **判断軸**：外部 product への入力は外部 product の言語 contract に従う

### JSON field / enum / inline marker / dimension 名 / machine-readable marker の英語維持（PR #112 / #116 / #118 で蓄積）

LLM 出力 / tool call / shell parser の機械処理対象は **英語維持**。reader 想定の言語と機械処理 contract を分離する。

- **machine-readable marker**：`CONFIRMED` / `DISAGREE` / `TASTE DECISION` / `PHASE [N] COMPLETE` / `STATUS` / `SOURCE` / `TIMESTAMP` / `COMMIT` / `RESTORE_PATH` 等
- **JSON field**：`scope_appetite` / `risk_tolerance` / `detail_preference` / `autonomy` / `architecture_care` 等
- **enum value**：`never-ask` / `always-ask` / `ask-only-for-one-way` / `SELECTIVE_EXPANSION` / `FULL_REVIEW` / `DX POLISH` 等
- **dimension 名**：calibration gate threshold（`sample_size` / `skills_covered` / `question_ids_covered` / `days_span`）等

### 数値 specificity / embedded code structural integrity の完全保持（plan-tune 翻訳時に確立、PR #116）

訳出時に数値・構造を動かさない。upstream の判断材料を保持する。

- **数値 specificity**：calibration gate threshold（`sample_size >= 20` / `skills_covered >= 3` / `question_ids_covered >= 8` / `days_span >= 7`）、band threshold（0.25 / 0.85 等）の数値はすべて完全保持
- **embedded code structural integrity**：`fs.writeFileSync` / `fs.renameSync` / `JSON.parse` 等の出現回数も訳出後で同数を保つ。atomic write pattern 等の構造を維持

### subtree path (`_upstream/gstack/`) の外部 identifier 維持（PR #116 で確認）

uzustack repo 内の `_upstream/gstack/` は subtree directory 名 = 物理 path。voice 規約 v1 項目 4「外部 identifier 維持」の特殊例として、文字列内に `gstack` が出ても置換しない。

- **対象**：`_upstream/gstack/<dir>/...` 形式の path 引用、ドキュメント / コメント内の subtree path
- **理由**：物理 directory 名としての identifier、置換すると broken reference

### design 文脈の英語維持（plan-design-review 翻訳時に確立、PR #112）

design / UI / UX 領域の固有用語と persona attribution は **英語維持**。design 業界の慣用語と attribution を保持する。

- **design 固有用語**：`Designer's eye` / `AI slop` / `design score` 等
- **machine-readable marker**：`DESIGN_READY` / `DESIGN_NOT_AVAILABLE` 等の `DESIGN_*` シリーズ
- **CLI shorthand**：`$D`（design CLI）/ `$B`（browse CLI）等
- **design 概念名**：`Approved Mockups` 等
- **persona 出典群**：Rams / Norman / Krug / Gebbia / Ive / Glass / Maeda / Zhuo / Nielsen / Redish / Jarrett 等の attribution（cognitive pattern table の出典列とは別の文脈で出る attribution として）

### 周辺ルール

- **CONFIG_HEADER の日本語化方針**：`gstack-config` の英語コメント約 70 行は、bin 配置初期段階で英語のままコピーで保留。本ルール表整備後、brain 系翻訳（PR #44）と整合させて日本語化済
- **DEFAULTS の意味論判断は brain 系翻訳に集中**：gstack 文字を含まない key（例：`gbrain_sync_mode`）は機械置換せず、brain 系翻訳時（PR #44）に集中判断
- **v1 で完璧を目指さない**：翻訳作業中に増えるケースは追記して育てる方針。迷ったら `v2 で見直し` フラグ付きで暫定採用し、翻訳作業を止めない

---

## voice 規約 v1（bin 翻訳時に確立）

Phase 3 の bin 翻訳バッチ（PR #40 / #42 / #44 / #46 / #48）で確立した voice 翻案規律。bash + 副言語 embedded スクリプトの翻訳に適用する。本節は bin 翻訳バッチ完了時に PR description に分散していた規範を集約したもの。

### 7 項目（bin 翻訳着手時に確立、PR #40 commit `d1b2c0f`）

1. **Section 見出し**（`Usage:` / `Behavior:` / `Exit codes:`）は **英語維持** — CLI 慣習に合わせる
2. **エラーメッセージは客観形（日本語）**：「〜が必要、実際は N 個」のような客観事実、責難形（「〜してください」）は避ける
3. **インラインコメントは簡潔な日本語**、技術用語は backtick で英語維持
4. **fixed identifier**（`base` / `ours` / `theirs`、API 名）は **英語維持**
5. **bin 名**は backtick 囲み（例：`uzustack-config`）
6. **embedded code** 内コメント（Python heredoc / bun -e の JS 等）も日本語化、技術用語は英語維持
7. **括弧**は半角 `(...)` を維持

### 運用方針 v1

- **bash + 副言語 embedded** は副言語コメントも日本語化（PR #42 で確立、Python heredoc / bun -e の JS で適用）
- **TypeScript / 主言語そのもの**は英語維持（reader 想定の言語と一致させる、PR #40 `uzustack-next-version` 477 行 TS で確立）
- **embedded Python heredoc 内の error 文字列** も日本語化対象（PR #44 `uzustack-brain-init` / `uzustack-brain-restore` で確認、voice 規約 v1 項目 2 が境界を貫通する）

### 外部 SaaS / 別プロジェクト identifier 維持（PR #44 拡張）

voice 規約 v1 項目 4「fixed identifier 英語維持」を、外部 SaaS や別プロジェクトの identifier にも拡張する。`gstack` 由来は `uzustack` に置換するが、以下は **維持**：

- **外部 CLI 名**：`gbrain`（別プロジェクト）、`Codex CLI` / `Gemini CLI`（外部 product）
- **外部 path / config**：`~/.gbrain/config.json` / `~/.codex/sessions` / `~/.gemini/projects.json` / `~/.claude/projects`
- **外部 env**：`GBRAIN_URL` / `GBRAIN_TOKEN` / `CODEX_HOME` / `CODEX_API_KEY` / `OPENAI_API_KEY`
- **外部プロジェクト共有 config key**：`gbrain_sync_mode` 等（`uzustack-config` に外部プロジェクトと共有する key）
- **外部 SaaS リソース慣習名**：例 Supabase project name prefix `gbrain`（gbrain CLI で作る project の慣習）
- **OS / Tool UI 引用**：Chrome の `'Developer mode'` / `'Load unpacked'`（Chrome 自身の英語 UI 引用）

### bin 翻訳バッチ完了時の追加観測 3 点（PR #46）

- **機械置換は dangling reference まで忠実に伝播する**：comment 内の他 binary 参照も置換対象。`uzustack-question-log:27` の `uzustack-question-sensitivity`（実体未持ち込み）参照を削除した事例。`/simplify` の quality + reuse agent が独立に同じ findings を発見、cross-validation で confidence 高い
- **output 表示英語維持の境界線**：sentinel token + 周辺 context は parser 互換重視で **英語維持**。`uzustack-specialist-stats` output / dashboard 系で適用。コメント / status メッセージは日本語化、機械処理される token は英語維持
- **judgment 軸数の動的性**：外部 CLI 連携の有無で軸数が変動する。PR #44（`gbrain` あり）→ 3 軸 / PR #46（なし）→ 2 軸 / PR #48（なし、CONTRIBUTING 統合あり）→ 2 軸 + 統合タスク。事前合意で軸数を確定すれば翻訳バッチ進行が機械化される

### 規約射程の拡張（PR #48 で確立）— ファイル名も射程に含める

voice 規約 v1（7 項目）+ 外部 identifier 拡張は **ファイル名そのもの** も射程に含める。`bin/<name>` の `<name>` も「ファイル内 identifier」と同じ規律で扱う。bin 翻訳バッチ完了直前に「規約はファイル内 identifier しか射程に入れていなかった」穴が発覚し、バッチ完了タイミングで穴埋めとして確立。

**運用ルール**：外部 product / protocol / tool 名で構成された binary は **`uzustack-` prefix なしで維持** する。

**判断基準**：

- upstream で `gstack-` prefix が付いていない binary は、upstream 側でも「外部 identifier 命名」と判断した signal として読む
- これに従い uzustack 側でも prefix なし維持する（機械化を優先する規律と整合）
- 「内容は外部 identifier 維持、ファイル名だけ `uzustack-` prefix」という分裂状態を生まない

**具体例**：

- `bin/chrome-cdp`（Chrome [外部 product 名] + CDP [外部 protocol 名] の合成）— `uzustack-chrome-cdp` ではなく `chrome-cdp` のまま維持
- 確認 signal：`_upstream/gstack/test/audit-compliance.test.ts` の `bin/chrome-cdp` hardcode（upstream test が path を直接参照、upstream 設計判断の最も強い signal）

### 集約タイミング規律

翻訳バッチ進行中は規範が PR description / commit message に分散して動いている。**バッチ完了で規範が固まった直後（次バッチ着手前）に本ガイドへ集約**する。Phase 完了判定まで待つとバッチ内参照性が上がらず、PR description を漁る運用になる。本節は bin 翻訳バッチ完了時（PR #48）で集約した。
