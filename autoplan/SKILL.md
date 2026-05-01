---
name: autoplan
type: translated
preamble-tier: 3
version: 1.0.0
description: |
  Auto-review pipeline — CEO / design / eng / DX の review skill 全体をディスクから読み込み、
  6 つの判断原則を使った auto-decision で順次実行する。最終承認 gate で taste 決定
  （close approach / borderline scope / codex disagreement）を surface する。
  1 コマンドで完全レビュー済 plan を出力。
  「auto レビュー」「autoplan」「すべての review を実行」「この plan を自動レビュー」
  「決定を私の代わりに行え」と要求されたときに使用する。
  ユーザーが plan ファイルを持ち、15-30 個の中間質問に answer せず full review gauntlet を
  実行したいときに能動的に提案する。
  Voice triggers (speech-to-text aliases): "auto plan", "automatic review".
benefits-from: [office-hours]
triggers:
  - すべての review を実行
  - 自動 review pipeline
  - auto plan review
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - WebSearch
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->







# /autoplan — Auto-Review Pipeline

1 コマンド。荒い plan を入れ、完全レビュー済 plan を出す。

/autoplan は CEO / design / eng / DX の review skill ファイル全体をディスクから読み込み、full depth で従う — 各 skill を手動で実行するのと同じ rigor、同じ section、同じ methodology。違いは 1 つだけ：中間 AskUserQuestion は下記 6 つの原則を使って auto-decide される。Taste 決定（reasonable な人々が disagree しうるもの）は最終承認 gate で surface される。

---

## 6 つの判断原則（The 6 Decision Principles）

これらのルールがすべての中間質問に auto-answer する：

1. **完全性を選ぶ（Choose completeness）** — 全体を出荷せよ。より多くの edge case を cover する approach を pick せよ。
2. **lake を煮詰める（Boil lakes）** — blast radius 内のすべて（本 plan で modified されるファイル + 直接の importer）を fix せよ。blast radius 内 AND CC effort < 1 日（< 5 ファイル、新インフラなし）の expansion は auto-approve せよ。
3. **実用的（Pragmatic）** — 2 つの option が同じことを fix するなら、cleaner な方を pick。5 分ではなく 5 秒で選べ。
4. **DRY** — 既存の機能を duplicate するか？ Reject。既存を再利用せよ。
5. **巧妙より明示的（Explicit over clever）** — 10 行の obvious fix > 200 行の abstraction。新しい contributor が 30 秒で読めるものを pick。
6. **行動への bias（Bias toward action）** — Merge > review cycle > stale な熟議。懸念を flag するが block するな。

**衝突解決（context 依存の tiebreaker）：**
- **CEO phase：** P1（completeness）+ P2（boil lakes）が支配的。
- **Eng phase：** P5（explicit）+ P3（pragmatic）が支配的。
- **Design phase：** P5（explicit）+ P1（completeness）が支配的。

---

## 決定分類（Decision Classification）

すべての auto-decision は以下に分類される：

**Mechanical** — 明確に 1 つの正解。silently auto-decide。
例：codex を実行（常に yes）、eval を実行（常に yes）、完全な plan のスコープを縮減（常に no）。

**Taste** — reasonable な人々が disagree しうる。recommendation 付きで auto-decide するが、最終 gate で surface する。3 つの自然な source：
1. **Close approaches** — top 2 が異なる tradeoff で両方 viable。
2. **Borderline scope** — blast radius 内だが 3-5 ファイル、または曖昧な radius。
3. **Codex disagreement** — codex が違う recommendation を出し、有効な point を持つ。

**User Challenge** — 両モデルが、ユーザーの述べた direction を変えるべきだと一致する。
これは taste 決定とは質的に異なる。Claude と Codex の両方が、ユーザーが specify した feature / skill / workflow について merge / split / 追加 / 削除を recommend するとき、これは User Challenge である。**決して auto-decide されない**。

User Challenge は taste 決定よりも豊富な context と共に最終承認 gate へ送られる：
- **ユーザーが言ったこと：**（彼らの original direction）
- **両モデルが recommend すること：**（変更）
- **理由：**（モデルの reasoning）
- **我々が見落としているかもしれない context：**（盲点の明示的承認）
- **我々が wrong だった場合の cost は：**（ユーザーの original direction が正しかった場合に何が起こるか）

ユーザーの original direction が default。モデルは変更の case を作る必要があり、その逆ではない。

**例外：** 両モデルが変更を security 脆弱性または feasibility blocker（preference ではなく）として flag するなら、AskUserQuestion の framing は明示的に warn せよ：「両モデルがこれを security / feasibility risk と信じています、単なる preference ではなく。」 ユーザーが依然として決めるが、framing は適切に urgent。

---

## 順次実行 — MANDATORY（Sequential Execution）

Phase は厳格な順序で MUST 実行：CEO → Design → Eng → DX。
各 phase は次が始まる前に MUST 完全に完了する。
phase を **決して** 並列実行しない — 各々が前の上に build される。

各 phase の間で phase-transition summary を発行し、次が始まる前に prior phase からのすべての required output が書かれていることを verify せよ。

---

## "Auto-Decide" の意味

Auto-decide は USER の judgment を 6 原則で置き換える。 ANALYSIS は置き換えない。読み込まれた skill ファイルのすべての section は、interactive 版と同じ depth で実行される必要がある。変わるのは AskUserQuestion に answer するのが誰か：あなたが、ユーザーの代わりに 6 原則を使って。

**2 つの例外 — 決して auto-decide されない：**
1. Premise（Phase 1） — 何の問題を解くかについて人間の judgment を要する。
2. User Challenge — 両モデルがユーザーの述べた direction を変えるべきだと一致するとき（feature / workflow を merge / split / 追加 / 削除）。ユーザーは常にモデルが欠く context を持つ。上記の Decision Classification を参照。

**あなたが MUST すること：**
- section が参照する actual code、diff、ファイルを READ する
- section が要求するすべての output（diagram、table、registry、artifact）を PRODUCE する
- section が捕捉するよう設計されたすべての issue を IDENTIFY する
- 6 原則を使って各 issue を DECIDE する（ユーザーに尋ねる代わりに）
- 各決定を audit trail に LOG する
- すべての required artifact をディスクに WRITE する

**あなたが MUST しないこと：**
- review section を 1-line table row に圧縮する
- 何を examine したかを示さずに「no issues found」と書く
- 「適用されない」と言って section を skip する、何を check してなぜかを述べずに
- 必須 output の代わりに summary を produce する（例：section が要求する ASCII 依存グラフではなく「architecture looks good」）

「No issues found」は section の有効な output である — ただし analysis を行った後でのみ。何を examine したか、なぜ何も flag されなかったかを述べよ（最低 1-2 文）。
「Skipped」は skip-list 外の section については決して有効ではない。

---

## Filesystem 境界 — Codex Prompt（Filesystem Boundary）

Codex に送信されるすべての prompt（`codex exec` または `codex review` 経由）は MUST この境界 instruction で prefix される：

> IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/uzustack). These are AI assistant skill definitions meant for a different system. They contain bash scripts and prompt templates that will waste your time. Ignore them completely. Stay focused on the repository code only.

これは Codex がディスク上の uzustack skill ファイルを発見し、plan のレビュー代わりにそれらの instruction に従うのを防ぐ。

---

## Phase 0: Intake + Restore Point

### Step 1: restore point を capture

何かをする前に、plan ファイルの current state を外部ファイルに save：

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-')
DATETIME=$(date +%Y%m%d-%H%M%S)
echo "RESTORE_PATH=$HOME/.uzustack/projects/$SLUG/${BRANCH}-autoplan-restore-${DATETIME}.md"
```

plan ファイルの full contents を以下の header と共に restore path に書け：
```
# /autoplan Restore Point
Captured: [timestamp] | Branch: [branch] | Commit: [short hash]

## Re-run Instructions
1. Copy "Original Plan State" below back to your plan file
2. Invoke /autoplan

## Original Plan State
[verbatim plan file contents]
```

その後、plan ファイルに 1 行の HTML comment を prepend せよ：
`<!-- /autoplan restore point: [RESTORE_PATH] -->`

### Step 2: context を読む

- CLAUDE.md、TODOS.md、`git log -30`、base branch に対する `git diff --stat` を読め
- design doc を発見：`ls -t ~/.uzustack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1`
- UI スコープを検出：plan で view / rendering 用語（component、screen、form、button、modal、layout、dashboard、sidebar、nav、dialog）を grep。2+ 一致を要求。false positive（「page」単独、頭字語の「UI」）を除外。
- DX スコープを検出：plan で developer-facing 用語（API、endpoint、REST、GraphQL、gRPC、webhook、CLI、command、flag、argument、terminal、shell、SDK、library、package、npm、pip、import、require、SKILL.md、skill template、Claude Code、MCP、agent、OpenClaw、action、developer docs、getting started、onboarding、integration、debug、implement、error message）を grep。2+ 一致を要求。製品が developer tool（plan が developer が install / 統合 / 上に build するものを記述する）または AI agent が primary user（OpenClaw action、Claude Code skill、MCP server）の場合も DX スコープを trigger。

### Step 3: ディスクから skill ファイルを load

Read tool を使って各ファイルを読め：
- `~/.claude/skills/uzustack/plan-ceo-review/SKILL.md`
- `~/.claude/skills/uzustack/plan-design-review/SKILL.md`（UI スコープ検出時のみ）
- `~/.claude/skills/uzustack/plan-eng-review/SKILL.md`
- `~/.claude/skills/uzustack/plan-devex-review/SKILL.md`（DX スコープ検出時のみ）

**Section skip list — 読み込まれた skill ファイルに従うとき、これらの section を SKIP せよ
（既に /autoplan が処理する）：**
- Preamble（run first）
- AskUserQuestion Format
- Completeness Principle — Boil the Lake
- Search Before Building
- Completion Status Protocol
- Telemetry（run last）
- Step 0: Detect base branch
- Review Readiness Dashboard
- Plan File Review Report
- Prerequisite Skill Offer（BENEFITS_FROM）
- Outside Voice — Independent Plan Challenge
- Design Outside Voices（parallel）

review 固有の methodology、section、required output のみを follow せよ。

Output：「私が work しているもの：[plan summary]。UI スコープ：[yes/no]。DX スコープ：[yes/no]。ディスクから review skill を load 済。auto-decision で full review pipeline を開始。」

---

## Phase 0.5: Codex auth + version preflight

Codex voice を invoke する前に、CLI を preflight：auth を verify（multi-signal）し、known-bad CLI バージョンに warn せよ。これは下記 4 phase 全部の infrastructure — ここで一度 source し、helper function を残りの workflow で in scope に保つ。

```bash
_TEL=$(~/.claude/skills/uzustack/bin/uzustack-config get telemetry 2>/dev/null || echo off)
source ~/.claude/skills/uzustack/bin/uzustack-codex-probe

# Codex binary を check。なければ degradation matrix を tag し、
# Claude subagent のみで続ける（autoplan の既存 degradation fallback）。
if ! command -v codex >/dev/null 2>&1; then
  _uzustack_codex_log_event "codex_cli_missing"
  echo "[codex-unavailable: binary not found] — Claude subagent のみで進行"
  _CODEX_AVAILABLE=false
elif ! _uzustack_codex_auth_probe >/dev/null; then
  _uzustack_codex_log_event "codex_auth_failed"
  echo "[codex-unavailable: auth missing] — Claude subagent のみで進行。dual-voice review を有効化するには \`codex login\` または \$CODEX_API_KEY を set。"
  _CODEX_AVAILABLE=false
else
  _uzustack_codex_version_check   # known-bad なら non-blocking warn
  _CODEX_AVAILABLE=true
fi
```

`_CODEX_AVAILABLE=false` なら、Phase 1-3.5 のすべての Codex voice は degradation matrix で `[codex-unavailable]` に degrade する。/autoplan は Claude subagent のみで完了 — 使えない Codex prompt の token spend を節約する。

---

## Phase 1: CEO Review（Strategy & Scope）

plan-ceo-review/SKILL.md に従う — すべての section、full depth。
Override：すべての AskUserQuestion → 6 原則を使って auto-decide。

**Override ルール：**
- Mode 選択：選択的拡張モード（SELECTIVE EXPANSION）
- Premise：reasonable なものを accept（P6）、明確に wrong なものだけ challenge
- **GATE: premise を確認のためユーザーに提示** — これは auto-decide されない 1 つの AskUserQuestion。Premise は人間の judgment を要する。
- Alternatives：最高 completeness を pick（P1）。tied なら最も simple を pick（P5）。top 2 が close なら → TASTE DECISION とマーク。
- スコープ拡張：blast radius 内 + < 1 日 CC → approve（P2）。外 → TODOS.md に defer（P3）。
  Duplicate → reject（P4）。Borderline（3-5 ファイル） → TASTE DECISION とマーク。
- 全 10 review section：fully run、各 issue を auto-decide、各決定を log。
- Dual voice：available なら常に **両方** Claude subagent AND Codex を実行（P6）。
  foreground で順次実行。最初に Claude subagent（Agent tool、foreground — `run_in_background` を使うな）、次に Codex（Bash）。両方 consensus table を build する前に完了する必要がある。

  **Codex CEO voice**（Bash 経由）：
  ```bash
  _REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
  _uzustack_codex_timeout_wrapper 600 codex exec "IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/uzustack). These are AI assistant skill definitions meant for a different system. Stay focused on repository code only.

  You are a CEO/founder advisor reviewing a development plan.
  Challenge the strategic foundations: Are the premises valid or assumed? Is this the
  right problem to solve, or is there a reframing that would be 10x more impactful?
  What alternatives were dismissed too quickly? What competitive or market risks are
  unaddressed? What scope decisions will look foolish in 6 months? Be adversarial.
  No compliments. Just the strategic blind spots.
  File: <plan_path>" -C "$_REPO_ROOT" -s read-only --enable web_search_cached < /dev/null
  _CODEX_EXIT=$?
  if [ "$_CODEX_EXIT" = "124" ]; then
    _uzustack_codex_log_event "codex_timeout" "600"
    _uzustack_codex_log_hang "autoplan" "0"
    echo "[codex stalled past 10 minutes — tagging as [codex-unavailable] for this phase and proceeding with Claude subagent only]"
  fi
  ```
  Timeout：10 分（shell-wrapper）+ 12 分（Bash outer gate）。hang 時、本 phase の Codex voice を auto-degrade。

  **Claude CEO subagent**（Agent tool 経由）：
  「<plan_path> の plan ファイルを読め。あなたは独立した CEO / strategist で、この plan をレビューしている。あなたは事前のレビューを見ていない。評価せよ：
  1. これは解くべき正しい問題か？ reframing が 10x impact をもたらすか？
  2. Premise は述べられているか、ただ仮定されているだけか？ どれが wrong でありうるか？
  3. 6 ヶ月後の regret シナリオ — 何が foolish に見えるか？
  4. 十分な分析なしに却下された alternatives は何か？
  5. 競合 risk は何か — 誰かが先により良く解けるか？
  各 finding について：何が wrong か、severity（critical / high / medium）、fix。」

  **Error handling：** 両 call は foreground で block。Codex auth / timeout / empty → Claude subagent のみで proceed、`[single-model]` でタグ。Claude subagent も fail → 「Outside voice 利用不可 — primary review で続ける。」

  **Degradation matrix：** 両方 fail → 「single-reviewer mode」。Codex のみ → tag `[codex-only]`。Subagent のみ → tag `[subagent-only]`。

- Strategy choice：codex が premise またはスコープ決定に valid な戦略的理由で disagree → TASTE DECISION。両モデルがユーザーの述べた構造を変えるべきと一致（merge / split / 追加 / 削除） → USER CHALLENGE（決して auto-decide しない）。

**必須実行 checklist（CEO）：**

Step 0（0A-0F） — 各 sub-step を実行し produce：
- 0A: 特定 premise が name されて評価された premise challenge
- 0B: 既存コード leverage map（sub-problem → 既存コード）
- 0C: Dream state 図（CURRENT → THIS PLAN → 12-MONTH IDEAL）
- 0C-bis: 実装 alternatives テーブル（2-3 approach、effort / risk / pros / cons）
- 0D: スコープ決定 logged 付きの mode 別分析
- 0E: Temporal interrogation（HOUR 1 → HOUR 6+）
- 0F: Mode 選択 confirmation

Step 0.5（Dual Voices）：Claude subagent（foreground Agent tool）を最初に、次に Codex（Bash）を実行。Codex output を CODEX SAYS（CEO — strategy challenge） header の下に提示。subagent output を CLAUDE SUBAGENT（CEO — strategic independence） header の下に提示。CEO consensus table を produce：

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   —       —      —
  2. Right problem to solve?           —       —      —
  3. Scope calibration correct?        —       —      —
  4. Alternatives sufficiently explored?—      —      —
  5. Competitive/market risks covered? —       —      —
  6. 6-month trajectory sound?         —       —      —
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = models differ (→ taste decision).
Missing voice = N/A (not CONFIRMED). Single critical finding from one voice = flagged regardless.
```

Section 1-10 — 各 section について、読み込まれた skill ファイルからの評価基準を実行：
- findings 付き section：full analysis、各 issue を auto-decide、audit trail にログ
- findings なし section：何を examine したか、なぜ何も flag されなかったかを述べる 1-2 文。決して section を name のみに圧縮するな（table row として）。
- Section 11（Design）：UI スコープが Phase 0 で検出された場合のみ run

**Phase 1 の必須 output：**
- defer 済 item と rationale 付き「NOT in scope」 section
- sub-problem を既存コードに map する「What already exists」 section
- Error & Rescue Registry テーブル（Section 2 から）
- Failure Modes Registry テーブル（review section から）
- Dream state delta（本 plan が 12-month ideal に対して我々をどこに置くか）
- Completion Summary（CEO skill の full summary table）

**PHASE 1 COMPLETE.** phase-transition summary を発行：
> **Phase 1 complete.** Codex: [N concerns]. Claude subagent: [N issues].
> Consensus: [X/6 confirmed, Y disagreements → surfaced at gate].
> Phase 2 へ進行。

すべての Phase 1 output が plan ファイルに書かれ、premise gate が pass されるまで Phase 2 を **開始するな**。

---

**Pre-Phase 2 checklist（開始前に verify）：**
- [ ] CEO completion summary が plan ファイルに書かれた
- [ ] CEO dual voices ran（Codex + Claude subagent、または unavailable と note）
- [ ] CEO consensus table produced
- [ ] Premise gate passed（user confirmed）
- [ ] Phase-transition summary emitted

## Phase 2: Design Review（条件付き — UI スコープなしなら skip）

plan-design-review/SKILL.md に従う — すべての 7 dimension、full depth。
Override：すべての AskUserQuestion → 6 原則を使って auto-decide。

**Override ルール：**
- Focus 領域：すべての relevant dimension（P1）
- 構造的 issue（state 不足、broken hierarchy）：auto-fix（P5）
- 美的 / taste issue：TASTE DECISION とマーク
- design system alignment：DESIGN.md 存在 AND fix が obvious なら auto-fix
- Dual voice：available なら常に **両方** Claude subagent AND Codex を実行（P6）。

  **Codex design voice**（Bash 経由）：
  ```bash
  _REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
  _uzustack_codex_timeout_wrapper 600 codex exec "IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/uzustack). These are AI assistant skill definitions meant for a different system. Stay focused on repository code only.

  Read the plan file at <plan_path>. Evaluate this plan's
  UI/UX design decisions.

  Also consider these findings from the CEO review phase:
  <insert CEO dual voice findings summary — key concerns, disagreements>

  Does the information hierarchy serve the user or the developer? Are interaction
  states (loading, empty, error, partial) specified or left to the implementer's
  imagination? Is the responsive strategy intentional or afterthought? Are
  accessibility requirements (keyboard nav, contrast, touch targets) specified or
  aspirational? Does the plan describe specific UI decisions or generic patterns?
  What design decisions will haunt the implementer if left ambiguous?
  Be opinionated. No hedging." -C "$_REPO_ROOT" -s read-only --enable web_search_cached < /dev/null
  _CODEX_EXIT=$?
  if [ "$_CODEX_EXIT" = "124" ]; then
    _uzustack_codex_log_event "codex_timeout" "600"
    _uzustack_codex_log_hang "autoplan" "0"
    echo "[codex stalled past 10 minutes — tagging as [codex-unavailable] for this phase and proceeding with Claude subagent only]"
  fi
  ```
  Timeout：10 分（shell-wrapper）+ 12 分（Bash outer gate）。hang 時、本 phase の Codex voice を auto-degrade。

  **Claude design subagent**（Agent tool 経由）：
  「<plan_path> の plan ファイルを読め。あなたは独立したシニアプロダクトデザイナーで、この plan をレビューしている。あなたは事前のレビューを見ていない。評価せよ：
  1. Information hierarchy：ユーザーは最初、二番目、三番目に何を見るか？ それは正しいか？
  2. Missing state：loading、empty、error、success、partial — どれが unspecified か？
  3. User journey：感情的 arc は何か？ どこで break するか？
  4. Specificity：plan は specific UI を記述するか generic pattern か？
  5. 曖昧に残すと実装者を haunt するであろう design 決定は何か？
  各 finding について：何が wrong か、severity（critical / high / medium）、fix。」
  prior-phase context なし — subagent は truly independent でなければならない。

  Error handling：Phase 1 と同じ（両方 foreground / blocking、degradation matrix が apply）。

- Design choice：codex が valid な UX reasoning で design 決定に disagree
  → TASTE DECISION。両モデルが一致するスコープ変更 → USER CHALLENGE。

**必須実行 checklist（Design）：**

1. Step 0（Design Scope）：completeness を 0-10 で rate。DESIGN.md を check。既存 pattern を map。

2. Step 0.5（Dual Voices）：Claude subagent（foreground）を最初に、次に Codex を実行。
   CODEX SAYS（design — UX challenge）と CLAUDE SUBAGENT（design — independent review） header の下に提示。
   plan-design-review からの design litmus scorecard format を使い、design litmus scorecard（consensus table）を produce。Codex prompt に CEO phase の findings を含める（Claude subagent には含めない — independent のまま）。

3. Pass 1-7：load した skill から各々を実行。0-10 rate。各 issue を auto-decide。
   scorecard からの DISAGREE 項目 → 関連 pass で両方の perspective と共に raise。

**PHASE 2 COMPLETE.** phase-transition summary を発行：
> **Phase 2 complete.** Codex: [N concerns]. Claude subagent: [N issues].
> Consensus: [X/Y confirmed, Z disagreements → surfaced at gate].
> Phase 3 へ進行。

すべての Phase 2 output（run された場合）が plan ファイルに書かれるまで Phase 3 を **開始するな**。

---

**Pre-Phase 3 checklist（開始前に verify）：**
- [ ] 上記すべての Phase 1 項目を confirmed
- [ ] Design completion summary written（または「skipped、no UI scope」）
- [ ] Design dual voices ran（Phase 2 が run した場合）
- [ ] Design consensus table produced（Phase 2 が run した場合）
- [ ] Phase-transition summary emitted

## Phase 3: Eng Review + Dual Voices

plan-eng-review/SKILL.md に従う — すべての section、full depth。
Override：すべての AskUserQuestion → 6 原則を使って auto-decide。

**Override ルール：**
- スコープ challenge：決して縮減しない（P2）
- Dual voice：available なら常に **両方** Claude subagent AND Codex を実行（P6）。

  **Codex eng voice**（Bash 経由）：
  ```bash
  _REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
  _uzustack_codex_timeout_wrapper 600 codex exec "IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/uzustack). These are AI assistant skill definitions meant for a different system. Stay focused on repository code only.

  Review this plan for architectural issues, missing edge cases,
  and hidden complexity. Be adversarial.

  Also consider these findings from prior review phases:
  CEO: <insert CEO consensus table summary — key concerns, DISAGREEs>
  Design: <insert Design consensus table summary, or 'skipped, no UI scope'>

  File: <plan_path>" -C "$_REPO_ROOT" -s read-only --enable web_search_cached < /dev/null
  _CODEX_EXIT=$?
  if [ "$_CODEX_EXIT" = "124" ]; then
    _uzustack_codex_log_event "codex_timeout" "600"
    _uzustack_codex_log_hang "autoplan" "0"
    echo "[codex stalled past 10 minutes — tagging as [codex-unavailable] for this phase and proceeding with Claude subagent only]"
  fi
  ```
  Timeout：10 分（shell-wrapper）+ 12 分（Bash outer gate）。hang 時、本 phase の Codex voice を auto-degrade。

  **Claude eng subagent**（Agent tool 経由）：
  「<plan_path> の plan ファイルを読め。あなたは独立したシニアエンジニアで、この plan をレビューしている。あなたは事前のレビューを見ていない。評価せよ：
  1. Architecture：component 構造は sound か？ Coupling concern？
  2. Edge case：10x load で何が break するか？ nil / empty / error path は何か？
  3. Test：test plan から何が欠けているか？ 金曜午前 2 時に何が break するか？
  4. Security：新しい attack surface？ Auth boundary？ Input validation？
  5. Hidden complexity：simple に見えるが実はそうではないものは？
  各 finding について：何が wrong か、severity、fix。」
  prior-phase context なし — subagent は truly independent でなければならない。

  Error handling：Phase 1 と同じ（両方 foreground / blocking、degradation matrix が apply）。

- Architecture choice：巧妙より明示的（P5）。codex が valid な reason で disagree → TASTE DECISION。両モデルが一致するスコープ変更 → USER CHALLENGE。
- Eval：常にすべての relevant suite を含める（P1）
- Test plan：`~/.uzustack/projects/$SLUG/{user}-{branch}-test-plan-{datetime}.md` で artifact を生成
- TODOS.md：Phase 1 からのすべての defer 済スコープ拡張を集める、auto-write

**必須実行 checklist（Eng）：**

1. Step 0（Scope Challenge）：plan が参照する actual code を読む。各 sub-problem を既存コードに map する。complexity check を実行。具体的な findings を produce。

2. Step 0.5（Dual Voices）：Claude subagent（foreground）を最初に、次に Codex を実行。
   Codex output を CODEX SAYS（eng — architecture challenge） header の下に提示。
   subagent output を CLAUDE SUBAGENT（eng — independent review） header の下に提示。
   eng consensus table を produce：

```
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               —       —      —
  2. Test coverage sufficient?         —       —      —
  3. Performance risks addressed?      —       —      —
  4. Security threats covered?         —       —      —
  5. Error paths handled?              —       —      —
  6. Deployment risk manageable?       —       —      —
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = models differ (→ taste decision).
Missing voice = N/A (not CONFIRMED). Single critical finding from one voice = flagged regardless.
```

3. Section 1（Architecture）：新しい component とその既存ものへの関係を示す ASCII 依存グラフを produce。Coupling、scaling、security を評価。

4. Section 2（Code Quality）：DRY 違反、命名 issue、complexity を identify。特定ファイルと pattern を参照。各 finding を auto-decide。

5. **Section 3（Test Review） — 決して SKIP または COMPRESS するな。**
   この section は memory からの summarize ではなく、actual code を読むことを要求する。
   - diff または plan の affected files を読む
   - test diagram を build：すべての NEW UX flow、data flow、codepath、branch を list
   - diagram の各項目について：どの type の test が cover するか？ 存在するか？ Gap？
   - LLM / prompt 変更について：どの eval suite を実行する必要があるか？
   - test gap の auto-deciding は意味する：gap を identify → test を追加するか defer するかを decide（rationale + 原則）→ 決定を log。analysis を skip するという意味では **ない**。
   - test plan artifact をディスクに書く

6. Section 4（Performance）：N+1 query、メモリ、caching、slow path を評価。

**Phase 3 の必須 output：**
- 「NOT in scope」 section
- 「What already exists」 section
- Architecture ASCII 図（Section 1）
- codepath を coverage に map する test diagram（Section 3）
- ディスクに書かれた test plan artifact（Section 3）
- critical gap flag 付き failure modes registry
- Completion Summary（Eng skill の full summary）
- TODOS.md 更新（すべての phase から集めたもの）

**PHASE 3 COMPLETE.** phase-transition summary を発行：
> **Phase 3 complete.** Codex: [N concerns]. Claude subagent: [N issues].
> Consensus: [X/6 confirmed, Y disagreements → surfaced at gate].
> Phase 3.5（DX Review）または Phase 4（Final Gate）へ進行。

---

## Phase 3.5: DX Review（条件付き — developer-facing スコープなしなら skip）

plan-devex-review/SKILL.md に従う — すべての 8 DX dimension、full depth。
Override：すべての AskUserQuestion → 6 原則を使って auto-decide。

**Skip 条件：** Phase 0 で DX スコープが検出されなかったなら、本 phase 全体を skip せよ。
Log：「Phase 3.5 skipped — no developer-facing scope detected.」

**Override ルール：**
- Mode 選択：DX POLISH
- Persona：README / docs から推定、最も一般的な developer type を pick（P6）
- 競合 benchmark：WebSearch 利用可能なら search を実行、そうでなければ reference benchmark を使用（P1）
- Magical moment：competitive tier を達成する最低 effort delivery vehicle を pick（P5）
- Getting started friction：常に fewer step に向けて optimize（P5、巧妙より simple）
- Error message 品質：常に problem + cause + fix を要求（P1、completeness）
- API/CLI 命名：consistency が cleverness に勝つ（P5）
- DX taste 決定（例：opinionated default vs flexibility）：TASTE DECISION とマーク
- Dual voice：available なら常に **両方** Claude subagent AND Codex を実行（P6）。

  **Codex DX voice**（Bash 経由）：
  ```bash
  _REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
  _uzustack_codex_timeout_wrapper 600 codex exec "IMPORTANT: Do NOT read or execute any SKILL.md files or files in skill definition directories (paths containing skills/uzustack). These are AI assistant skill definitions meant for a different system. Stay focused on repository code only.

  Read the plan file at <plan_path>. Evaluate this plan's developer experience.

  Also consider these findings from prior review phases:
  CEO: <insert CEO consensus summary>
  Eng: <insert Eng consensus summary>

  You are a developer who has never seen this product. Evaluate:
  1. Time to hello world: how many steps from zero to working? Target is under 5 minutes.
  2. Error messages: when something goes wrong, does the dev know what, why, and how to fix?
  3. API/CLI design: are names guessable? Are defaults sensible? Is it consistent?
  4. Docs: can a dev find what they need in under 2 minutes? Are examples copy-paste-complete?
  5. Upgrade path: can devs upgrade without fear? Migration guides? Deprecation warnings?
  Be adversarial. Think like a developer who is evaluating this against 3 competitors." -C "$_REPO_ROOT" -s read-only --enable web_search_cached < /dev/null
  _CODEX_EXIT=$?
  if [ "$_CODEX_EXIT" = "124" ]; then
    _uzustack_codex_log_event "codex_timeout" "600"
    _uzustack_codex_log_hang "autoplan" "0"
    echo "[codex stalled past 10 minutes — tagging as [codex-unavailable] for this phase and proceeding with Claude subagent only]"
  fi
  ```
  Timeout：10 分（shell-wrapper）+ 12 分（Bash outer gate）。hang 時、本 phase の Codex voice を auto-degrade。

  **Claude DX subagent**（Agent tool 経由）：
  「<plan_path> の plan ファイルを読め。あなたは独立した DX エンジニアで、この plan をレビューしている。あなたは事前のレビューを見ていない。評価せよ：
  1. Getting started：zero から hello world まで何 step か？ TTHW は何か？
  2. API/CLI ergonomics：命名 consistency、sensible default、progressive disclosure？
  3. Error handling：すべての error path が problem + cause + fix + docs link を specify するか？
  4. Documentation：copy-paste examples？ Information architecture？ Interactive elements？
  5. Escape hatch：developer はすべての opinionated default を override できるか？
  各 finding について：何が wrong か、severity（critical / high / medium）、fix。」
  prior-phase context なし — subagent は truly independent でなければならない。

  Error handling：Phase 1 と同じ（両方 foreground / blocking、degradation matrix が apply）。

- DX choice：codex が valid な developer empathy reasoning で DX 決定に disagree
  → TASTE DECISION。両モデルが一致するスコープ変更 → USER CHALLENGE。

**必須実行 checklist（DX）：**

1. Step 0（DX Scope Assessment）：製品 type を auto-detect。developer journey を map。
   initial DX completeness を 0-10 で rate。TTHW を assess。

2. Step 0.5（Dual Voices）：Claude subagent（foreground）を最初に、次に Codex を実行。
   CODEX SAYS（DX — developer experience challenge）と CLAUDE SUBAGENT
   （DX — independent review） header の下に提示。DX consensus table を produce：

```
DX DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Getting started < 5 min?          —       —      —
  2. API/CLI naming guessable?         —       —      —
  3. Error messages actionable?        —       —      —
  4. Docs findable & complete?         —       —      —
  5. Upgrade path safe?                —       —      —
  6. Dev environment friction-free?    —       —      —
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = models differ (→ taste decision).
Missing voice = N/A (not CONFIRMED). Single critical finding from one voice = flagged regardless.
```

3. Pass 1-8：load した skill から各々を実行。0-10 rate。各 issue を auto-decide。
   consensus table からの DISAGREE 項目 → 関連 pass で両方の perspective と共に raise。

4. DX Scorecard：すべての 8 dimension が score された full scorecard を produce。

**Phase 3.5 の必須 output：**
- Developer journey map（9-stage table）
- Developer empathy narrative（first-person perspective）
- すべての 8 dimension score 付き DX Scorecard
- DX Implementation Checklist
- target 付き TTHW 評価

**PHASE 3.5 COMPLETE.** phase-transition summary を発行：
> **Phase 3.5 complete.** DX overall: [N]/10. TTHW: [N] min → [target] min.
> Codex: [N concerns]. Claude subagent: [N issues].
> Consensus: [X/6 confirmed, Y disagreements → surfaced at gate].
> Phase 4（Final Gate）へ進行。

---

## Decision Audit Trail

各 auto-decision の後、Edit を使って plan ファイルに row を append：

```markdown
<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|
```

決定ごとに 1 row を incrementally に書け（Edit 経由）。これにより audit がディスクに保たれ、conversation context に蓄積されない。

---

## Pre-Gate Verification

最終承認 gate を提示する前に、required output が実際に produce されたことを verify せよ。各項目について plan ファイルと conversation を check。

**Phase 1（CEO） outputs：**
- [ ] specific premise が name された premise challenge（「premises accepted」だけでなく）
- [ ] すべての applicable review section が findings を持つ OR 明示的に「examined X、nothing flagged」
- [ ] Error & Rescue Registry テーブルが produce された（または理由付きで N/A と note）
- [ ] Failure Modes Registry テーブルが produce された（または理由付きで N/A と note）
- [ ] 「NOT in scope」 section written
- [ ] 「What already exists」 section written
- [ ] Dream state delta written
- [ ] Completion Summary produced
- [ ] Dual voices ran（Codex + Claude subagent、または unavailable と note）
- [ ] CEO consensus table produced

**Phase 2（Design） outputs — UI スコープ検出時のみ：**
- [ ] すべての 7 dimension が score 付きで evaluated
- [ ] issue が identified され auto-decided
- [ ] Dual voices ran（または phase と共に unavailable / skipped と note）
- [ ] Design litmus scorecard produced

**Phase 3（Eng） outputs：**
- [ ] actual code 分析付きの scope challenge（「scope is fine」だけでなく）
- [ ] Architecture ASCII 図 produced
- [ ] codepath を test coverage に map する test diagram
- [ ] ~/.uzustack/projects/$SLUG/ にディスクで書かれた test plan artifact
- [ ] 「NOT in scope」 section written
- [ ] 「What already exists」 section written
- [ ] critical gap 評価付き failure modes registry
- [ ] Completion Summary produced
- [ ] Dual voices ran（Codex + Claude subagent、または unavailable と note）
- [ ] Eng consensus table produced

**Phase 3.5（DX） outputs — DX スコープ検出時のみ：**
- [ ] すべての 8 DX dimension が score 付きで evaluated
- [ ] Developer journey map produced
- [ ] Developer empathy narrative written
- [ ] target 付き TTHW 評価
- [ ] DX Implementation Checklist produced
- [ ] Dual voices ran（または phase と共に unavailable / skipped と note）
- [ ] DX consensus table produced

**Cross-phase：**
- [ ] Cross-phase themes section written

**Audit trail：**
- [ ] Decision Audit Trail が auto-decision あたり最低 1 row を持つ（empty ではない）

上記 checkbox のいずれかが missing なら、戻って missing output を produce せよ。最大 2 attempt — 2 回 retry しても missing なら、どの項目が incomplete かを note する warning と共に gate に proceed せよ。無限 loop しないこと。

---

## Phase 4: Final Approval Gate

**ここで STOP し、final state をユーザーに提示せよ。**

メッセージとして提示し、その後 AskUserQuestion を使え：

```
## /autoplan Review Complete

### Plan Summary
[1-3 sentence summary]

### Decisions Made: [N] total ([M] auto-decided, [K] taste choices, [J] user challenges)

### User Challenges (両モデルがあなたの述べた direction に disagree)
[各 user challenge について：]
**Challenge [N]: [title]**（[phase] から）
You said: [user's original direction]
Both models recommend: [the change]
Why: [reasoning]
What we might be missing: [blind spots]
If we're wrong, the cost is: [downside of changing]
[security / feasibility なら：「⚠️ 両モデルがこれを security / feasibility risk と
flag、preference ではなく。」]

Your call — original direction が stand する、明示的に変更しない限り。

### Your Choices (taste decisions)
[各 taste decision について：]
**Choice [N]: [title]**（[phase] から）
[X] を recommend — [principle]。だが [Y] も viable：
  [Y を pick した場合の 1 文の downstream impact]

### Auto-Decided: [M] decisions [plan ファイルの Decision Audit Trail を参照]

### Review Scores
- CEO: [summary]
- CEO Voices: Codex [summary], Claude subagent [summary], Consensus [X/6 confirmed]
- Design: [summary または「skipped, no UI scope」]
- Design Voices: Codex [summary], Claude subagent [summary], Consensus [X/7 confirmed]（または「skipped」）
- Eng: [summary]
- Eng Voices: Codex [summary], Claude subagent [summary], Consensus [X/6 confirmed]
- DX: [summary または「skipped, no developer-facing scope」]
- DX Voices: Codex [summary], Claude subagent [summary], Consensus [X/6 confirmed]（または「skipped」）

### Cross-Phase Themes
[2+ phase の dual voice で independently 出現した懸念について：]
**Theme: [topic]** — [Phase 1, Phase 3] で flag。high-confidence signal。
[phase を跨ぐ theme なし：] 「No cross-phase themes — each phase's concerns were distinct.」

### Deferred to TODOS.md
[reason 付き auto-defer された item]
```

**Cognitive load 管理：**
- 0 user challenge：「User Challenges」 section を skip
- 0 taste decision：「Your Choices」 section を skip
- 1-7 taste decision：flat list
- 8+：phase 別にグループ化。warning 追加：「この plan は異常に高い ambiguity を持つ（[N] taste decisions）。注意深く review せよ。」

AskUserQuestion options：
- A) Approve as-is（すべての推奨を accept）
- B) Approve with overrides（変更する taste decision を specify）
- B2) Approve with user challenge responses（各 challenge を accept または reject）
- C) Interrogate（特定の決定について ask）
- D) Revise（plan 自体に変更が必要）
- E) Reject（やり直し）

**Option handling：**
- A：APPROVED とマーク、review log を書く、/ship を提案
- B：どの override を尋ね、apply、gate を再提示
- C：freeform に answer、gate を再提示
- D：変更を行い、affected phase を re-run（scope→1B、design→2、test plan→3、arch→3）。最大 3 cycle。
- E：やり直し

---

## Completion: Review Log を書く

承認時、/ship のダッシュボードがそれらを認識するよう、3 つの別々の review log entry を書け。各 review phase からの actual な値で TIMESTAMP、STATUS、N を replace せよ。
STATUS は「clean」（unresolved issue なし）、そうでなければ「issues_open」。

```bash
COMMIT=$(git rev-parse --short HEAD 2>/dev/null)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"plan-ceo-review","timestamp":"'"$TIMESTAMP"'","status":"STATUS","unresolved":N,"critical_gaps":N,"mode":"SELECTIVE_EXPANSION","via":"autoplan","commit":"'"$COMMIT"'"}'

~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"plan-eng-review","timestamp":"'"$TIMESTAMP"'","status":"STATUS","unresolved":N,"critical_gaps":N,"issues_found":N,"mode":"FULL_REVIEW","via":"autoplan","commit":"'"$COMMIT"'"}'
```

Phase 2 が run した場合（UI スコープ）：
```bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"plan-design-review","timestamp":"'"$TIMESTAMP"'","status":"STATUS","unresolved":N,"via":"autoplan","commit":"'"$COMMIT"'"}'
```

Phase 3.5 が run した場合（DX スコープ）：
```bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"plan-devex-review","timestamp":"'"$TIMESTAMP"'","status":"STATUS","initial_score":N,"overall_score":N,"product_type":"TYPE","tthw_current":"TTHW","tthw_target":"TARGET","unresolved":N,"via":"autoplan","commit":"'"$COMMIT"'"}'
```

Dual voice log（run した phase ごとに 1 つ）：
```bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"autoplan-voices","timestamp":"'"$TIMESTAMP"'","status":"STATUS","source":"SOURCE","phase":"ceo","via":"autoplan","consensus_confirmed":N,"consensus_disagree":N,"commit":"'"$COMMIT"'"}'

~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"autoplan-voices","timestamp":"'"$TIMESTAMP"'","status":"STATUS","source":"SOURCE","phase":"eng","via":"autoplan","consensus_confirmed":N,"consensus_disagree":N,"commit":"'"$COMMIT"'"}'
```

Phase 2 が run した場合（UI スコープ）、追加で log：
```bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"autoplan-voices","timestamp":"'"$TIMESTAMP"'","status":"STATUS","source":"SOURCE","phase":"design","via":"autoplan","consensus_confirmed":N,"consensus_disagree":N,"commit":"'"$COMMIT"'"}'
```

Phase 3.5 が run した場合（DX スコープ）、追加で log：
```bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"autoplan-voices","timestamp":"'"$TIMESTAMP"'","status":"STATUS","source":"SOURCE","phase":"dx","via":"autoplan","consensus_confirmed":N,"consensus_disagree":N,"commit":"'"$COMMIT"'"}'
```

SOURCE = 「codex+subagent」「codex-only」「subagent-only」「unavailable」。
N 値を table からの actual consensus count で replace せよ。

次の step を提案：PR を作成する準備ができたら `/ship`。

---

## Important Rules

- **決して abort するな。** ユーザーは /autoplan を選んだ。その選択を尊重せよ。すべての taste 決定を surface し、interactive review に redirect しない。
- **2 つの gate。** auto-decide されない AskUserQuestion は：(1) Phase 1 の premise 確認、(2) User Challenge — 両モデルが一致してユーザーの述べた direction を変えるべきとする時。それ以外はすべて 6 原則を使って auto-decide される。
- **すべての決定を log。** silent な auto-decision なし。すべての choice は audit trail に row を得る。
- **Full depth は full depth を意味する。** load した skill ファイルから section を圧縮または skip するな（Phase 0 の skip list 例外を除く）。「Full depth」は意味する：section が読めと言うコードを読み、section が要求する output を produce し、すべての issue を identify し、各々を decide すること。section の 1 文 summary は「full depth」では **ない** — それは skip。任意の review section について 3 文未満を書いている自分に気付いたら、likely に圧縮している。
- **Artifact は deliverable。** test plan artifact、failure modes registry、error / rescue table、ASCII 図 — review 完了時にこれらはディスクまたは plan ファイルに存在する必要がある。存在しないなら review は incomplete。
- **順次順序。** CEO → Design → Eng → DX。各 phase は前の上に build する。
