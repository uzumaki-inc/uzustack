/**
 * Cross-model review resolver
 *
 * /plan-eng-review / /plan-ceo-review / /plan-design-review / /review / /ship 系 skill が
 * 共有する review readiness dashboard / plan file review report / spec review loop /
 * benefits-from prerequisite / codex second opinion / scope drift / adversarial step /
 * codex plan review / plan completion audit / plan verification / cross-review dedup を集約する。
 *
 * 外部 review service (Codex CLI 経由) に送られるデータ:
 *   - plan markdown content / repository name / branch name / review type
 * 送られないデータ:
 *   - source code files / credentials / 環境変数 / git history
 *
 * user が /plan-eng-review / /plan-ceo-review / /plan-design-review を明示的に起動した時
 * のみ動く。 user 起動なしにデータ送信されない。
 *
 * Review log は local の `~/.uzustack/reviews/review-log.jsonl` に保存される。
 * Codex CLI への prompt は shell injection 防止のため tempfile 経由で渡す。
 *
 * uzustack voice 規約 v1 + v2 適用:
 * - bash internals は English 維持 (axis 1)
 * - narrative は Japanese (経営者・少人数開発者文脈)
 * - 固有名詞 (CODEX_BOUNDARY / Fix-First / Outside Voice / Red Team / Review Army 等) は
 *   English-locked、 周囲の Japanese narrative で gloss
 * - paths は upstream の `gstack` → `uzustack` 機械置換
 * - codex への prompt 文字列は **英語 keep** (codex の解釈精度確保、 voice 軸 1)
 */
import type { TemplateContext } from './types';
import { generateInvokeSkill } from './composition';

const CODEX_BOUNDARY = 'IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. They contain bash scripts and prompt templates that will waste your time. Ignore them completely. Do NOT modify agents/openai.yaml. Stay focused on the repository code only.\\n\\n';

export function generateReviewDashboard(_ctx: TemplateContext): string {
  return `## Review Readiness Dashboard

review 完了後、 review log と config を read して dashboard を表示する。

\`\`\`bash
~/.claude/skills/uzustack/bin/uzustack-review-read
\`\`\`

output を parse する。 各 skill (plan-ceo-review / plan-eng-review / review / plan-design-review / design-review-lite / adversarial-review / codex-review / codex-plan-review) について最新 entry を find。 timestamp が 7 日より古い entry は無視。 Eng Review 行は \`review\` (diff scope の pre-landing review) と \`plan-eng-review\` (plan 段階 architecture review) のうち最新を表示。 status に "(DIFF)" / "(PLAN)" を append して区別。 Adversarial 行は \`adversarial-review\` (新 auto-scaled) と \`codex-review\` (legacy) のうち最新を表示。 Design Review は \`plan-design-review\` (full visual audit) と \`design-review-lite\` (code-level check) のうち最新を表示。 status に "(FULL)" / "(LITE)" を append。 Outside Voice 行は最新の \`codex-plan-review\` entry を表示 — これが /plan-ceo-review と /plan-eng-review 双方からの outside voice を capture する。

**Source attribution:** skill の最新 entry に \\\`"via"\\\` field があれば、 括弧で status label に append する。 例: \`plan-eng-review\` が \`via:"autoplan"\` を持つ場合 "CLEAR (PLAN via /autoplan)" と表示。 \`review\` が \`via:"ship"\` を持つ場合 "CLEAR (DIFF via /ship)" と表示。 \`via\` field なしの entry は従来通り "CLEAR (PLAN)" / "CLEAR (DIFF)" と表示。

Note: \`autoplan-voices\` / \`design-outside-voices\` entry は audit-trail only (cross-model consensus analysis 用の forensic data)。 dashboard に表示されず、 どの consumer も check しない。

表示:

\`\`\`
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Last Run            | Status    | Required |
|-----------------|------|---------------------|-----------|----------|
| Eng Review      |  1   | 2026-03-16 15:00    | CLEAR     | YES      |
| CEO Review      |  0   | —                   | —         | no       |
| Design Review   |  0   | —                   | —         | no       |
| Adversarial     |  0   | —                   | —         | no       |
| Outside Voice   |  0   | —                   | —         | no       |
+--------------------------------------------------------------------+
| VERDICT: CLEARED — Eng Review passed                                |
+====================================================================+
\`\`\`

**Review tier:**
- **Eng Review (default で required):** ship を gate する唯一の review。 architecture / code 品質 / test / performance を cover。 \\\`uzustack-config set skip_eng_review true\\\` で global に無効化可能 ("don't bother me" setting)。
- **CEO Review (optional):** judgment で判断。 大きな product / business 変更、 新規 user-facing 機能、 scope 判断には推奨。 bug fix / refactor / infra / cleanup は skip。
- **Design Review (optional):** judgment で判断。 UI / UX 変更には推奨。 backend only / infra / prompt only 変更は skip。
- **Adversarial Review (automatic):** 全 review で常時 on。 全 diff に対して Claude adversarial subagent + Codex adversarial challenge の両方を実行。 大型 diff (200+ lines) は追加で Codex structured review + P1 gate も実行。 設定不要。
- **Outside Voice (optional):** 別 AI model からの independent plan review。 /plan-ceo-review / /plan-eng-review で全 review section 完了後に offer。 Codex 不在時は Claude subagent に fall back。 ship を gate しない。

**Verdict logic:**
- **CLEARED**: Eng Review が \`review\` か \`plan-eng-review\` から 7 日以内に >= 1 entry、 status "clean" (または \\\`skip_eng_review\\\` が \`true\`)
- **NOT CLEARED**: Eng Review が missing / stale (>7 日) / open issues あり
- CEO / Design / Codex review は context として表示するが、 ship を block しない
- \\\`skip_eng_review\\\` config が \`true\` の場合、 Eng Review は "SKIPPED (global)" 表示、 verdict は CLEARED

**Staleness detection:** dashboard 表示後、 既存 review が stale な可能性を check:
- bash output の \\\`---HEAD---\\\` section を parse して current HEAD commit hash を取得
- \\\`commit\\\` field を持つ各 review entry: current HEAD と比較。 異なる場合、 経過 commit 数を count: \\\`git rev-list --count STORED_COMMIT..HEAD\\\`。 表示: "Note: {skill} review from {date} may be stale — {N} commits since review"
- \\\`commit\\\` field なし entry (legacy entry): "Note: {skill} review from {date} has no commit tracking — consider re-running for accurate staleness detection"
- 全 review が current HEAD と一致なら staleness note 表示なし`;
}

export function generatePlanFileReviewReport(_ctx: TemplateContext): string {
  return `## Plan File Review Report

conversation output に Review Readiness Dashboard を表示した後、 **plan file 自体** にも update する。
plan を読む者全員に review status を見せるため。

### plan file を detect

1. 本 conversation に active な plan file があるかを check (host が plan file path を system message で提供 — conversation context の plan file 参照を look up)。
2. なければ silent skip — plan mode でない review 実行もある。

### report を生成

上 step で取得済の Review Readiness Dashboard 出力を read。 各 JSONL entry を parse。 skill ごとに log する field が違う:

- **plan-ceo-review**: \\\`status\\\`, \\\`unresolved\\\`, \\\`critical_gaps\\\`, \\\`mode\\\`, \\\`scope_proposed\\\`, \\\`scope_accepted\\\`, \\\`scope_deferred\\\`, \\\`commit\\\`
  → Findings: "{scope_proposed} proposals, {scope_accepted} accepted, {scope_deferred} deferred"
  → scope field が 0 or missing (HOLD/REDUCTION mode): "mode: {mode}, {critical_gaps} critical gaps"
- **plan-eng-review**: \\\`status\\\`, \\\`unresolved\\\`, \\\`critical_gaps\\\`, \\\`issues_found\\\`, \\\`mode\\\`, \\\`commit\\\`
  → Findings: "{issues_found} issues, {critical_gaps} critical gaps"
- **plan-design-review**: \\\`status\\\`, \\\`initial_score\\\`, \\\`overall_score\\\`, \\\`unresolved\\\`, \\\`decisions_made\\\`, \\\`commit\\\`
  → Findings: "score: {initial_score}/10 → {overall_score}/10, {decisions_made} decisions"
- **plan-devex-review**: \\\`status\\\`, \\\`initial_score\\\`, \\\`overall_score\\\`, \\\`product_type\\\`, \\\`tthw_current\\\`, \\\`tthw_target\\\`, \\\`mode\\\`, \\\`persona\\\`, \\\`competitive_tier\\\`, \\\`unresolved\\\`, \\\`commit\\\`
  → Findings: "score: {initial_score}/10 → {overall_score}/10, TTHW: {tthw_current} → {tthw_target}"
- **devex-review**: \\\`status\\\`, \\\`overall_score\\\`, \\\`product_type\\\`, \\\`tthw_measured\\\`, \\\`dimensions_tested\\\`, \\\`dimensions_inferred\\\`, \\\`boomerang\\\`, \\\`commit\\\`
  → Findings: "score: {overall_score}/10, TTHW: {tthw_measured}, {dimensions_tested} tested/{dimensions_inferred} inferred"
- **codex-review**: \\\`status\\\`, \\\`gate\\\`, \\\`findings\\\`, \\\`findings_fixed\\\`
  → Findings: "{findings} findings, {findings_fixed}/{findings} fixed"

Findings column に必要な全 field は JSONL entry に存在する。
今 review の場合は Completion Summary から richer な詳細を使ってよい。 過去 review の場合は JSONL field を直接使う — 必要な data はすべて揃っている。

以下 markdown table を生成:

\\\`\\\`\\\`markdown
## UZUSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \\\`/plan-ceo-review\\\` | Scope & strategy | {runs} | {status} | {findings} |
| Codex Review | \\\`/codex review\\\` | Independent 2nd opinion | {runs} | {status} | {findings} |
| Eng Review | \\\`/plan-eng-review\\\` | Architecture & tests (required) | {runs} | {status} | {findings} |
| Design Review | \\\`/plan-design-review\\\` | UI/UX gaps | {runs} | {status} | {findings} |
| DX Review | \\\`/plan-devex-review\\\` | Developer experience gaps | {runs} | {status} | {findings} |
\\\`\\\`\\\`

table の下、 以下 line を追加 (該当なし行は省略):

- **CODEX:** (codex-review が ran 時のみ) — codex fix の 1 行 summary
- **CROSS-MODEL:** (Claude + Codex 両 review がある時のみ) — overlap 分析
- **UNRESOLVED:** 全 review 横断の unresolved 判断件数
- **VERDICT:** CLEAR な review を list (例: "CEO + ENG CLEARED — ready to implement")。
  Eng Review が CLEAR でない and not skipped globally なら "eng review required" を append。

### plan file に write

**PLAN MODE EXCEPTION — ALWAYS RUN:** これは plan file への write、 plan mode で edit 許可されている唯一の file。 plan file review report は plan の living status の一部。

- plan file 内を \\\`## UZUSTACK REVIEW REPORT\\\` section で **anywhere** 検索 (end とは限らない — 後で content が追加されている可能性)。
- 見つかったら、 Edit tool で **置換** する。 \\\`## UZUSTACK REVIEW REPORT\\\` から次の \\\`## \\\` heading まで、 or end of file までを match。 report section の後ろに追加された content を preserve するため (= eat しない)。 Edit が fail した場合 (e.g., concurrent edit が content を変えた)、 plan file を re-read して 1 回 retry。
- section が存在しない場合、 plan file の end に **append**。
- 必ず plan file の最後の section に置く。 mid-file で見つかったら move する: 旧位置を削除して end に append。`;
}

export function generateSpecReviewLoop(_ctx: TemplateContext): string {
  return `## Spec Review Loop

user に approval 用の document を提示する前に、 adversarial review を回す。

**Step 1: Reviewer subagent を dispatch**

Agent tool で independent reviewer を dispatch。 reviewer は fresh context を持ち、 brainstorming conversation を見ない — document のみ見る。 これで genuine adversarial independence が確保される。

subagent への prompt:
- 直前に書いた document の file path
- "Read this document and review it on 5 dimensions. For each dimension, note PASS or
  list specific issues with suggested fixes. At the end, output a quality score (1-10)
  across all dimensions."

**Dimensions:**
1. **Completeness** — 全要件が addressed か？ 漏れている edge case は？
2. **Consistency** — document の各部分が互いに整合するか？ 矛盾は？
3. **Clarity** — engineer がこれを実装する時に質問なしで進められるか？ 曖昧な言い回しは？
4. **Scope** — document が元問題を超えて creep していないか？ YAGNI 違反は？
5. **Feasibility** — 記載のアプローチで実際 build できるか？ 隠れた複雑性は？

subagent は以下を return:
- quality score (1-10)
- 問題なければ PASS、 ある場合は dimension / description / fix の numbered list

**Step 2: Fix + re-dispatch**

reviewer が issue を返した場合:
1. document on disk で各 issue を fix (Edit tool)
2. updated document で reviewer subagent を re-dispatch
3. 最大 3 iteration

**Convergence guard:** reviewer が連続 iteration で同じ issue を返す (fix が解消していない or reviewer が fix に同意しない) 場合、 loop を止めて当該 issue を document の "Reviewer Concerns" として persist。 これ以上 loop しない。

subagent が fail / timeout / unavailable の場合 — review loop を完全に skip。 user に告げる: "Spec review unavailable — presenting unreviewed doc." document は既に disk に書いた、 review は quality bonus であって gate ではない。

**Step 3: Report + metrics persist**

loop 完了 (PASS / max iteration / convergence guard) 後:

1. user に結果を伝える — default は summary:
   "Your doc survived N rounds of adversarial review. M issues caught and fixed.
   Quality score: X/10."
   user が "what did the reviewer find?" と訊いたら full reviewer output を見せる。

2. max iteration / convergence の後に issue が残っていれば、 document に "## Reviewer Concerns" section を追加して unresolved issue を list。 下流 skill がこれを見る。

3. metrics を append:
\`\`\`bash
mkdir -p ~/.uzustack/analytics
echo '{"skill":"${_ctx.skillName}","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","iterations":ITERATIONS,"issues_found":FOUND,"issues_fixed":FIXED,"remaining":REMAINING,"quality_score":SCORE}' >> ~/.uzustack/analytics/spec-review.jsonl 2>/dev/null || true
\`\`\`
ITERATIONS / FOUND / FIXED / REMAINING / SCORE を review の実数で置換。`;
}

export function generateBenefitsFrom(ctx: TemplateContext): string {
  if (!ctx.benefitsFrom || ctx.benefitsFrom.length === 0) return '';

  const skillList = ctx.benefitsFrom.map(s => `\`/${s}\``).join(' or ');
  const first = ctx.benefitsFrom[0];

  // INVOKE_SKILL resolver を再利用して実際の load instruction を出す
  const invokeBlock = generateInvokeSkill(ctx, [first]);

  return `## Prerequisite Skill Offer

上記 design doc check が "No design doc found" を print した場合、 続行前に prerequisite skill を offer する。

AskUserQuestion で user に告げる:

> "No design doc found for this branch. ${skillList} produces a structured problem
> statement, premise challenge, and explored alternatives — it gives this review much
> sharper input to work with. Takes about 10 minutes. The design doc is per-feature,
> not per-product — it captures the thinking behind this specific change."

Options:
- A) Run /${first} now (we'll pick up the review right after)
- B) Skip — proceed with standard review

skip 選択時: "No worries — standard review. If you ever want sharper input, try
/${first} first next time." 通常通り続行。 同 session 内で再 offer しない。

A 選択時:

告げる: "Running /${first} inline. Once the design doc is ready, I'll pick up
the review right where we left off."

${invokeBlock}

/${first} 完了後、 design doc check を再実行:
\`\`\`bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
SLUG=$(~/.claude/skills/uzustack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
DESIGN=$(ls -t ~/.uzustack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "$DESIGN" ] && DESIGN=$(ls -t ~/.uzustack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
[ -n "$DESIGN" ] && echo "Design doc found: $DESIGN" || echo "No design doc found"
\`\`\`

design doc が見つかれば read して review を続行。
無ければ (user が cancel した可能性)、 standard review で続行。`;
}

export function generateCodexSecondOpinion(ctx: TemplateContext): string {
  // Codex host: 完全 strip — Codex が自分自身を invoke すべきでない
  if (ctx.host === 'codex') return '';

  return `## Phase 3.5: Cross-Model Second Opinion (optional)

**Binary check 先行:**

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

AskUserQuestion を使う (codex availability に関わらず):

> Want a second opinion from an independent AI perspective? It will review your problem statement, key answers, premises, and any landscape findings from this session without having seen this conversation — it gets a structured summary. Usually takes 2-5 minutes.
> A) Yes, get a second opinion
> B) No, proceed to alternatives

B 選択: Phase 3.5 を完全 skip。 second opinion が run しなかったことを記憶 (= design doc / founder signal / Phase 4 に影響)。

**A 選択: Codex cold read を実行。**

1. Phase 1-3 から structured context block を組み立てる:
   - Mode (Startup or Builder)
   - Problem statement (Phase 1 から)
   - Phase 2A/2B の key answer (各 Q&A を 1-2 文に summarize、 user の verbatim quote を含む)
   - Landscape findings (Phase 2.75 から、 search が ran なら)
   - 合意済 premise (Phase 3 から)
   - Codebase context (project 名 / language / 最近の activity)

2. **組み立てた prompt を tempfile に write** (user-derived content からの shell injection 防止):

\`\`\`bash
CODEX_PROMPT_FILE=$(mktemp /tmp/uzustack-codex-oh-XXXXXXXX.txt)
\`\`\`

full prompt を file に書く。 **常に filesystem boundary で開始する:**
"${CODEX_BOUNDARY}"
次に context block と mode-appropriate instruction を加える:

**Startup mode instructions:** "You are an independent technical advisor reading a transcript of a startup brainstorming session. [CONTEXT BLOCK HERE]. Your job: 1) What is the STRONGEST version of what this person is trying to build? Steelman it in 2-3 sentences. 2) What is the ONE thing from their answers that reveals the most about what they should actually build? Quote it and explain why. 3) Name ONE agreed premise you think is wrong, and what evidence would prove you right. 4) If you had 48 hours and one engineer to build a prototype, what would you build? Be specific — tech stack, features, what you'd skip. Be direct. Be terse. No preamble."

**Builder mode instructions:** "You are an independent technical advisor reading a transcript of a builder brainstorming session. [CONTEXT BLOCK HERE]. Your job: 1) What is the COOLEST version of this they haven't considered? 2) What's the ONE thing from their answers that reveals what excites them most? Quote it. 3) What existing open source project or tool gets them 50% of the way there — and what's the 50% they'd need to build? 4) If you had a weekend to build this, what would you build first? Be specific. Be direct. No preamble."

3. Codex を実行:

\`\`\`bash
TMPERR_OH=$(mktemp /tmp/codex-oh-err-XXXXXXXX)
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
codex exec "$(cat "$CODEX_PROMPT_FILE")" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached < /dev/null 2>"$TMPERR_OH"
\`\`\`

5 分 timeout を使う (\`timeout: 300000\`)。 command 完了後、 stderr を read:
\`\`\`bash
cat "$TMPERR_OH"
rm -f "$TMPERR_OH" "$CODEX_PROMPT_FILE"
\`\`\`

**Error handling:** 全 error は non-blocking — second opinion は quality enhancement であって prerequisite ではない。
- **Auth failure:** stderr に "auth", "login", "unauthorized", "API key" を含む場合: "Codex authentication failed. Run \\\`codex login\\\` to authenticate." Claude subagent に fall back。
- **Timeout:** "Codex timed out after 5 minutes." Claude subagent に fall back。
- **Empty response:** "Codex returned no response." Claude subagent に fall back。

Codex の error は全て下記 Claude subagent に fall back。

**CODEX_NOT_AVAILABLE (or Codex がエラー) の場合:**

Agent tool で dispatch。 subagent は fresh context — genuine independence。

Subagent prompt: 上と同じ mode-appropriate prompt (Startup or Builder variant)。

\`SECOND OPINION (Claude subagent):\` header の下に findings を提示。

subagent が fail / timeout: "Second opinion unavailable. Continuing to Phase 4."

4. **Presentation:**

Codex が ran 時:
\`\`\`
SECOND OPINION (Codex):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
\`\`\`

Claude subagent が ran 時:
\`\`\`
SECOND OPINION (Claude subagent):
════════════════════════════════════════════════════════════
<full subagent output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
\`\`\`

5. **Cross-model synthesis:** second opinion output 提示後、 3-5 bullet で synthesis:
   - Claude が second opinion に同意する点
   - Claude が disagree する点 + why
   - 反論された premise が Claude の recommendation を変えるか

6. **Premise revision check:** Codex が合意済 premise に challenge した場合、 AskUserQuestion:

> Codex challenged premise #{N}: "{premise text}". Their argument: "{reasoning}".
> A) Revise this premise based on Codex's input
> B) Keep the original premise — proceed to alternatives

A 選択: premise を revise + 修正を記録。 B 選択: 続行 (user が WHY を articulate して defended した点を記録 — これは dismiss でなく reason 付きで disagree したなら founder signal)。`;
}

// ─── Scope Drift Detection (/review と /ship で共有) ────────

export function generateScopeDrift(ctx: TemplateContext): string {
  const isShip = ctx.skillName === 'ship';
  const stepNum = isShip ? '8.2' : '1.5';

  return `## Step ${stepNum}: Scope Drift Detection

code 品質 review 前に check: **要求されたものを build したか — 過不足なく？**

1. \`TODOS.md\` を read (存在すれば)。 PR description を read (\`gh pr view --json body --jq .body 2>/dev/null || true\`)。
   commit message を read (\`git log origin/<base>..HEAD --oneline\`)。
   **PR 不存在時:** stated intent は commit message + TODOS.md に依存 — /review が /ship 前に走るのが普通なので、 これが典型 case。
2. **stated intent** を identify — この branch が達成すべきだったことは何か？
3. \`git diff origin/<base>...HEAD --stat\` を実行、 changed file を stated intent と比較。

4. skepticism を持って evaluate (前 step / 隣 section から plan completion 結果があれば組み込む):

   **SCOPE CREEP 検出:**
   - stated intent と関係ない file が変わっている
   - plan に書かれていない新機能 / refactor
   - "while I was in there..." 系の blast radius 拡大変更

   **MISSING REQUIREMENTS 検出:**
   - TODOS.md / PR description の要件が diff で addressed されていない
   - stated requirement に対する test coverage gap
   - partial implementation (start したが finish していない)

5. Output (main review 開始前):
   \\\`\\\`\\\`
   Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
   Intent: <1 行 summary of what was requested>
   Delivered: <1 行 summary of what the diff actually does>
   [If drift: list each out-of-scope change]
   [If missing: list each unaddressed requirement]
   \\\`\\\`\\\`

6. これは **INFORMATIONAL** — review を block しない。 次 step へ。

---`;
}

// ─── Adversarial Review (常時 on) ────────

export function generateAdversarialStep(ctx: TemplateContext): string {
  // Codex host: 完全 strip — Codex が自分自身を invoke すべきでない
  if (ctx.host === 'codex') return '';

  const isShip = ctx.skillName === 'ship';
  const stepNum = isShip ? '11' : '5.7';

  return `## Step ${stepNum}: Adversarial review (always-on)

全 diff は Claude + Codex から adversarial review を受ける。 LOC は risk の proxy でない — 5 行の auth 変更が critical な場合もある。

**diff size + tool availability を detect:**

\`\`\`bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
# Legacy opt-out — Codex pass のみ gate、 Claude は常時動く
OLD_CFG=$(~/.claude/skills/uzustack/bin/uzustack-config get codex_reviews 2>/dev/null || true)
echo "DIFF_SIZE: $DIFF_TOTAL"
echo "OLD_CFG: \${OLD_CFG:-not_set}"
\`\`\`

\`OLD_CFG\` が \`disabled\` の場合: Codex pass のみ skip。 Claude adversarial subagent は依然動く (無料 + 速い)。 "Claude adversarial subagent" section に jump。

**User override:** user が "full review" / "structured review" / "P1 gate" を明示 request した場合、 diff size に関わらず Codex structured review も実行。

---

### Claude adversarial subagent (常時動く)

Agent tool で dispatch。 subagent は fresh context — structured review からの checklist bias なし。 この genuine independence で primary reviewer が blind な点を catch する。

subagent prompt:
"Read the diff for this branch with \`git diff origin/<base>\`. Think like an attacker and a chaos engineer. Your job is to find ways this code will fail in production. Look for: edge cases, race conditions, security holes, resource leaks, failure modes, silent data corruption, logic errors that produce wrong results silently, error handling that swallows failures, and trust boundary violations. Be adversarial. Be thorough. No compliments — just the problems. For each finding, classify as FIXABLE (you know how to fix it) or INVESTIGATE (needs human judgment)."

\`ADVERSARIAL REVIEW (Claude subagent):\` header の下に findings を提示。 **FIXABLE findings** は structured review と同じ Fix-First pipeline に流す。 **INVESTIGATE findings** は informational として提示。

subagent が fail / timeout: "Claude adversarial subagent unavailable. Continuing."

---

### Codex adversarial challenge (available なら常時動く)

Codex available AND \`OLD_CFG\` が \`disabled\` でない場合:

\`\`\`bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
codex exec "${CODEX_BOUNDARY}Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached < /dev/null 2>"$TMPERR_ADV"
\`\`\`

Bash tool の \`timeout\` parameter を \`300000\` (5 分) に set。 \`timeout\` shell command を使わない — macOS に存在しない。 command 完了後、 stderr を read:
\`\`\`bash
cat "$TMPERR_ADV"
\`\`\`

full output を verbatim 提示。 これは informational — ship を block しない。

**Error handling:** 全 error は non-blocking — adversarial review は quality enhancement であって prerequisite ではない。
- **Auth failure:** stderr に "auth", "login", "unauthorized", "API key" を含む: "Codex authentication failed. Run \\\`codex login\\\` to authenticate."
- **Timeout:** "Codex timed out after 5 minutes."
- **Empty response:** "Codex returned no response. Stderr: <paste relevant error>."

**Cleanup:** 処理後 \`rm -f "$TMPERR_ADV"\` を実行。

Codex が NOT available: "Codex CLI not found — running Claude adversarial only. Install Codex for cross-model coverage: \`npm install -g @openai/codex\`"

---

### Codex structured review (大型 diff のみ、 200+ lines)

\`DIFF_TOTAL >= 200\` AND Codex available AND \`OLD_CFG\` が \`disabled\` でない場合:

\`\`\`bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
cd "$_REPO_ROOT"
codex review "${CODEX_BOUNDARY}Review the diff against the base branch." --base <base> -c 'model_reasoning_effort="high"' --enable web_search_cached < /dev/null 2>"$TMPERR"
\`\`\`

Bash tool の \`timeout\` parameter を \`300000\` (5 分) に set。 \`timeout\` shell command を使わない — macOS に存在しない。 \`CODEX SAYS (code review):\` header の下に output を提示。
\`[P1]\` marker を check: 見つかれば \`GATE: FAIL\`、 なければ \`GATE: PASS\`。

GATE が FAIL の場合、 AskUserQuestion:
\`\`\`
Codex found N critical issues in the diff.

A) Investigate and fix now (recommended)
B) Continue — review will still complete
\`\`\`

A: findings に対応${isShip ? '。 fix 後、 code が変わったので test を再実行 (Step 5)' : ''}。 \`codex review\` を再実行して verify。

stderr を error 用に read (Codex adversarial と同じ error handling)。

stderr 後: \`rm -f "$TMPERR"\`

\`DIFF_TOTAL < 200\`: section を silent skip。 小型 diff には Claude + Codex adversarial pass で sufficient coverage。

---

### review 結果を persist

全 pass 完了後、 persist:
\`\`\`bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"always","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`
置換: STATUS = 全 pass で findings なしなら "clean"、 1 つでも findings ありなら "issues_found"。 SOURCE = Codex が ran なら "both"、 Claude subagent のみなら "claude"。 GATE = Codex structured review の gate 結果 ("pass"/"fail")、 diff < 200 なら "skipped"、 Codex 不在なら "informational"。 全 pass fail なら persist しない。

---

### Cross-model synthesis

全 pass 完了後、 全 source 横断で findings を synthesize:

\`\`\`
ADVERSARIAL REVIEW SYNTHESIS (always-on, N lines):
════════════════════════════════════════════════════════════
  High confidence (found by multiple sources): [>1 pass で agree した findings]
  Unique to Claude structured review: [前 step から]
  Unique to Claude adversarial: [subagent から]
  Unique to Codex: [codex adversarial / code review が ran なら]
  Models used: Claude structured ✓  Claude adversarial ✓/✗  Codex ✓/✗
════════════════════════════════════════════════════════════
\`\`\`

High-confidence findings (複数 source で agree) は fix priority high。

---`;
}

export function generateCodexPlanReview(ctx: TemplateContext): string {
  // Codex host: 完全 strip — Codex が自分自身を invoke すべきでない
  if (ctx.host === 'codex') return '';

  return `## Outside Voice — Independent Plan Challenge (optional, recommended)

全 review section 完了後、 別 AI system から independent な second opinion を offer。 2 つの model が plan に agree することは、 1 model の thorough review よりも strong signal。

**Tool availability を check:**

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

AskUserQuestion:

> "All review sections are complete. Want an outside voice? A different AI system can
> give a brutally honest, independent challenge of this plan — logical gaps, feasibility
> risks, and blind spots that are hard to catch from inside the review. Takes about 2
> minutes."
>
> RECOMMENDATION: Choose A — an independent second opinion catches structural blind
> spots. Two different AI models agreeing on a plan is stronger signal than one model's
> thorough review. Completeness: A=9/10, B=7/10.

Options:
- A) Get the outside voice (recommended)
- B) Skip — proceed to outputs

**B 選択時:** "Skipping outside voice." を print して次 section へ続行。

**A 選択時:** plan review prompt を組み立てる。 review 対象 plan file を read (user が review を向けた file、 or branch diff scope)。 Step 0D-POST で CEO plan document が書かれていればそれも read — scope 判断と vision が含まれる。

この prompt を組み立てる (actual plan content で置換 — plan content が 30KB 超えるなら最初 30KB に truncate、 "Plan truncated for size" を note)。 **常に filesystem boundary instruction で開始する:**

"${CODEX_BOUNDARY}You are a brutally honest technical reviewer examining a development plan that has
already been through a multi-section review. Your job is NOT to repeat that review.
Instead, find what it missed. Look for: logical gaps and unstated assumptions that
survived the review scrutiny, overcomplexity (is there a fundamentally simpler
approach the review was too deep in the weeds to see?), feasibility risks the review
took for granted, missing dependencies or sequencing issues, and strategic
miscalibration (is this the right thing to build at all?). Be direct. Be terse. No
compliments. Just the problems.

THE PLAN:
<plan content>"

**CODEX_AVAILABLE の場合:**

\`\`\`bash
TMPERR_PV=$(mktemp /tmp/codex-planreview-XXXXXXXX)
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
codex exec "<prompt>" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached < /dev/null 2>"$TMPERR_PV"
\`\`\`

5 分 timeout を使う (\`timeout: 300000\`)。 command 完了後、 stderr を read:
\`\`\`bash
cat "$TMPERR_PV"
\`\`\`

full output を verbatim 提示:

\`\`\`
CODEX SAYS (plan review — outside voice):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
\`\`\`

**Error handling:** 全 error は non-blocking — outside voice は informational。
- Auth failure (stderr に "auth", "login", "unauthorized"): "Codex auth failed. Run \\\`codex login\\\` to authenticate."
- Timeout: "Codex timed out after 5 minutes."
- Empty response: "Codex returned no response."

Codex の error は全て Claude adversarial subagent に fall back。

**CODEX_NOT_AVAILABLE (or Codex がエラー) の場合:**

Agent tool で dispatch。 subagent は fresh context — genuine independence。

Subagent prompt: 上と同じ plan review prompt。

\`OUTSIDE VOICE (Claude subagent):\` header の下に findings を提示。

subagent が fail / timeout: "Outside voice unavailable. Continuing to outputs."

**Cross-model tension:**

outside voice findings 提示後、 前 section の review findings と disagree する点を note。 以下のように flag:

\`\`\`
CROSS-MODEL TENSION:
  [Topic]: Review said X. Outside voice says Y. [両 perspective を neutral に提示。
  答えを変えうる missing context を述べる。]
\`\`\`

**User Sovereignty:** outside voice の recommendation を auto 取り込みしてはならない。 各 tension point を user に提示。 user が決める。 cross-model agreement は strong signal だが、 行動する許可ではない。 どちらの argument が compelling か述べてよいが、 user の明示的 approval なしに change を apply してはならない。

substantive な tension point について、 AskUserQuestion:

> "Cross-model disagreement on [topic]. The review found [X] but the outside voice
> argues [Y]. [One sentence on what context you might be missing.]"
>
> RECOMMENDATION: Choose [A or B] because [one-line reason explaining which argument
> is more compelling and why]. Completeness: A=X/10, B=Y/10.

Options:
- A) Accept the outside voice's recommendation (I'll apply this change)
- B) Keep the current approach (reject the outside voice)
- C) Investigate further before deciding
- D) Add to TODOS.md for later

user の return を待つ。 自分が outside voice に agree するから accept する、 と default にしない。 user が B を選んだら current approach を維持 — 再 argue しない。

tension point がなければ note: "No cross-model tension — both reviewers agree."

**結果を persist:**
\`\`\`bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"codex-plan-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`

置換: STATUS = findings なしなら "clean"、 findings ありなら "issues_found"。
SOURCE = Codex が ran なら "codex"、 subagent が ran なら "claude"。

**Cleanup:** 処理後 \`rm -f "$TMPERR_PV"\` を実行 (Codex を使った場合)。

---`;
}

// ─── Plan File Discovery (shared helper) ────────

function generatePlanFileDiscovery(): string {
  return `### Plan File Discovery

1. **Conversation context (primary):** 本 conversation に active な plan file があるかを check。 host agent の system message が plan mode 中の plan file path を含む。 見つかれば直接使う — 最も reliable signal。

2. **Content-based search (fallback):** conversation context に plan file 参照がない場合、 content で search:

\`\`\`bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-')
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)")
# ~/.uzustack/projects/ lookup 用の project slug を計算
_PLAN_SLUG=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\\([^/]*/[^/]*\\)\\.git$|\\1|;s|.*[:/]\\([^/]*/[^/]*\\)$|\\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-') || true
_PLAN_SLUG="\${_PLAN_SLUG:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
# 一般的な plan file location を search (project design 優先、 次に personal/local)
for PLAN_DIR in "$HOME/.uzustack/projects/$_PLAN_SLUG" "$HOME/.claude/plans" "$HOME/.codex/plans" ".uzustack/plans"; do
  [ -d "$PLAN_DIR" ] || continue
  PLAN=$(ls -t "$PLAN_DIR"/*.md 2>/dev/null | xargs grep -l "$BRANCH" 2>/dev/null | head -1)
  [ -z "$PLAN" ] && PLAN=$(ls -t "$PLAN_DIR"/*.md 2>/dev/null | xargs grep -l "$REPO" 2>/dev/null | head -1)
  [ -z "$PLAN" ] && PLAN=$(find "$PLAN_DIR" -name '*.md' -mmin -1440 -maxdepth 1 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
  [ -n "$PLAN" ] && break
done
[ -n "$PLAN" ] && echo "PLAN_FILE: $PLAN" || echo "NO_PLAN_FILE"
\`\`\`

3. **Validation:** content-based search で plan file が見つかった (conversation context でない) 場合、 最初 20 行を read して current branch の作業と関係するかを verify。 別 project / feature の file に見えるなら "no plan file found" 扱い。

**Error handling:**
- plan file 不在 → "No plan file detected — skipping." で skip。
- plan file 見つかったが unreadable (permission / encoding) → "Plan file found but unreadable — skipping." で skip。`;
}

// ─── Plan Completion Audit ────────

type PlanCompletionMode = 'ship' | 'review';

function generatePlanCompletionAuditInner(mode: PlanCompletionMode): string {
  const sections: string[] = [];

  // ── Plan file discovery (shared) ──
  sections.push(generatePlanFileDiscovery());

  // ── Item extraction ──
  sections.push(`
### Actionable Item Extraction

plan file を read。 全 actionable item を extract — 作業として記述されている全てのもの。 look for:

- **Checkbox item:** \`- [ ] ...\` or \`- [x] ...\`
- 実装 heading 下の **numbered step**: "1. Create ...", "2. Add ...", "3. Modify ..."
- **Imperative statement:** "Add X to Y", "Create a Z service", "Modify the W controller"
- **File-level specification:** "New file: path/to/file.ts", "Modify path/to/existing.rb"
- **Test requirement:** "Test that X", "Add test for Y", "Verify Z"
- **Data model 変更:** "Add column X to table Y", "Create migration for Z"

**Ignore:**
- Context / Background section (\`## Context\`, \`## Background\`, \`## Problem\`)
- Question / open item (?, "TBD", "TODO: decide" mark)
- Review report section (\`## UZUSTACK REVIEW REPORT\`)
- 明示的 defer item ("Future:", "Out of scope:", "NOT in scope:", "P2:", "P3:", "P4:")
- CEO Review Decision section (これは choice の記録、 work item でない)

**Cap:** 最大 50 item を extract。 plan に more あれば note: "Showing top 50 of N plan items — full list in plan file."

**No items found:** plan に extractable な actionable item がなければ skip: "Plan file contains no actionable items — skipping completion audit."

各 item について note:
- item の text (verbatim or 簡潔 summary)
- category: CODE | TEST | MIGRATION | CONFIG | DOCS`);

  // ── Cross-reference against diff ──
  sections.push(`
### Cross-Reference Against Diff

\`git diff origin/<base>...HEAD\` + \`git log origin/<base>..HEAD --oneline\` を実行して何が実装されたか把握。

extract 済の各 plan item について diff を check して classify:

- **DONE** — diff にこの item が実装された明確な evidence。 changed file を cite。
- **PARTIAL** — diff に向けて work が一部あるが incomplete (e.g., model はあるが controller missing、 function はあるが edge case 未対応)。
- **NOT DONE** — diff に evidence なし。
- **CHANGED** — plan と違う方法で実装、 同じ goal は達成。 差分を note。

**DONE は保守的に** — diff に明確な evidence を要求。 file が touch されただけでは insufficient、 記述された functionality が present であること。
**CHANGED は寛容に** — goal が違う手段で達成されているならそれは addressed。`);

  // ── Output format ──
  sections.push(`
### Output Format

\`\`\`
PLAN COMPLETION AUDIT
═══════════════════════════════
Plan: {plan file path}

## Implementation Items
  [DONE]      Create UserService — src/services/user_service.rb (+142 lines)
  [PARTIAL]   Add validation — model validates but missing controller checks
  [NOT DONE]  Add caching layer — no cache-related changes in diff
  [CHANGED]   "Redis queue" → implemented with Sidekiq instead

## Test Items
  [DONE]      Unit tests for UserService — test/services/user_service_test.rb
  [NOT DONE]  E2E test for signup flow

## Migration Items
  [DONE]      Create users table — db/migrate/20240315_create_users.rb

─────────────────────────────────
COMPLETION: 4/7 DONE, 1 PARTIAL, 1 NOT DONE, 1 CHANGED
─────────────────────────────────
\`\`\``);

  // ── Gate logic (mode-specific) ──
  if (mode === 'ship') {
    sections.push(`
### Gate Logic

completion checklist 生成後:

- **全 DONE or CHANGED:** Pass。 "Plan completion: PASS — all items addressed." 続行。
- **PARTIAL のみ (NOT DONE なし):** PR body に note して続行。 block しない。
- **NOT DONE item あり:** AskUserQuestion:
  - 上の completion checklist を表示
  - "{N} items from the plan are NOT DONE. These were part of the original plan but are missing from the implementation."
  - RECOMMENDATION: item 数と severity に依存。 1-2 minor item (docs / config) なら B 推奨。 core functionality が missing なら A 推奨。
  - Options:
    A) Stop — implement the missing items before shipping
    B) Ship anyway — defer these to a follow-up (will create P1 TODOs in Step 5.5)
    C) These items were intentionally dropped — remove from scope
  - A: STOP。 user に missing item を list。
  - B: 続行。 NOT DONE 各 item について Step 5.5 で "Deferred from plan: {plan file path}" の P1 TODO を作成。
  - C: 続行。 PR body に note: "Plan items intentionally dropped: {list}."

**plan file 不在:** 完全 skip。 "No plan file detected — skipping plan completion audit."

**PR body に含める (Step 8):** \`## Plan Completion\` section に checklist summary を追加。`);
  } else {
    // review mode — enhanced Delivery Integrity (Release 2: Review Army)
    sections.push(`
### Fallback Intent Sources (plan file 不在時)

plan file が detect できない場合、 以下の secondary intent source を使う:

1. **Commit message:** \`git log origin/<base>..HEAD --oneline\` を実行。 judgment で real intent を extract:
   - actionable verb ("add", "implement", "fix", "create", "remove", "update") を含む commit は intent signal
   - noise を skip: "WIP", "tmp", "squash", "merge", "chore", "typo", "fixup"
   - literal message でなく、 commit の背後 intent を extract
2. **TODOS.md:** 存在すれば、 この branch / 最近の date 関連の item を check
3. **PR description:** \`gh pr view --json body -q .body 2>/dev/null\` で intent context

**Fallback source 使用時:** 同じ Cross-Reference classification (DONE/PARTIAL/NOT DONE/CHANGED) を best-effort matching で適用。 fallback-source の item は plan-file item より confidence 低い旨を note。

### Investigation Depth

PARTIAL / NOT DONE 各 item について WHY を調査:

1. \`git log origin/<base>..HEAD --oneline\` で work が start / attempt / revert された commit を check
2. 代わりに何が build されたかを understand するために code を read
3. 以下の likely reason から決定:
   - **Scope cut** — intentional removal の evidence (revert commit / removed TODO)
   - **Context exhaustion** — work が start したが midway で止まった (partial implementation / follow-up commit なし)
   - **Misunderstood requirement** — 何か build されたが plan の記述と match しない
   - **Blocked by dependency** — plan item が unavailable な何かに依存
   - **Genuinely forgotten** — 何の attempt も evidence なし

各 discrepancy への output:
\`\`\`
DISCREPANCY: {PARTIAL|NOT_DONE} | {plan item} | {what was actually delivered}
INVESTIGATION: {likely reason with evidence from git log / code}
IMPACT: {HIGH|MEDIUM|LOW} — {what breaks or degrades if this stays undelivered}
\`\`\`

### Learnings Logging (plan-file discrepancy のみ)

**plan file から sourced された discrepancy に限り** (commit message / TODOS.md でなく)、 future session が同 pattern を知るために learning を log:

\`\`\`bash
~/.claude/skills/uzustack/bin/uzustack-learnings-log '{
  "type": "pitfall",
  "key": "plan-delivery-gap-KEBAB_SUMMARY",
  "insight": "Planned X but delivered Y because Z",
  "confidence": 8,
  "source": "observed",
  "files": ["PLAN_FILE_PATH"]
}'
\`\`\`

KEBAB_SUMMARY を gap の kebab-case summary に置換、 actual value を fill。

**commit-message derived / TODOS.md derived な discrepancy は learning に log しない。** review output 上は informational だが durable memory には noisy すぎる。

### Integration with Scope Drift Detection

plan completion 結果は既存 Scope Drift Detection を augment。 plan file が見つかった場合:

- **NOT DONE item** は scope drift report の **MISSING REQUIREMENTS** の追加 evidence になる。
- **plan item に match しない diff の item** は **SCOPE CREEP** detection の evidence になる。
- **HIGH-impact discrepancy** は AskUserQuestion を trigger:
  - investigation findings を表示
  - Options: A) Stop and implement missing items, B) Ship anyway + create P1 TODOs, C) Intentionally dropped

これは **INFORMATIONAL**、 ただし HIGH-impact discrepancy が見つかれば AskUserQuestion 経由で gate する。

scope drift output に plan file context を追加:

\`\`\`
Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
Intent: <from plan file — 1 行 summary>
Plan: <plan file path>
Delivered: <1 行 summary of what the diff actually does>
Plan items: N DONE, M PARTIAL, K NOT DONE
[If NOT DONE: list each missing item with investigation]
[If scope creep: list each out-of-scope change not in the plan]
\`\`\`

**plan file 不在:** commit message + TODOS.md を fallback source として使う (上記参照)。 intent source 一切なしの場合、 skip: "No intent sources detected — skipping completion audit."`);
  }

  return sections.join('\n');
}

export function generatePlanCompletionAuditShip(_ctx: TemplateContext): string {
  return generatePlanCompletionAuditInner('ship');
}

export function generatePlanCompletionAuditReview(_ctx: TemplateContext): string {
  return generatePlanCompletionAuditInner('review');
}

// ─── Plan Verification Execution ────────

export function generatePlanVerificationExec(_ctx: TemplateContext): string {
  return `## Step 8.1: Plan Verification

plan の testing / verification step を \`/qa-only\` skill で自動 verify する。

### 1. Verification section の有無を check

Step 8 で discovery 済の plan file から verification section を look for。 以下の heading を match: \`## Verification\`, \`## Test plan\`, \`## Testing\`, \`## How to test\`, \`## Manual testing\`、 or verification 風 item (URL / 視覚 check / interaction test) を含む section。

**verification section 不在時:** "No verification steps found in plan — skipping auto-verification." で skip。
**Step 8 で plan file が見つからなかった場合:** skip (既に handled)。

### 2. Running dev server を check

browse-based verification を invoke 前に、 dev server が reachable かを check:

\`\`\`bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:8080 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:4000 2>/dev/null || echo "NO_SERVER"
\`\`\`

**NO_SERVER:** "No dev server detected — skipping plan verification. Run /qa separately after deploying." で skip。

### 3. /qa-only を inline invoke

\`/qa-only\` skill を disk から read:

\`\`\`bash
cat \${CLAUDE_SKILL_DIR}/../qa-only/SKILL.md
\`\`\`

**unreadable:** "Could not load /qa-only — skipping plan verification." で skip。

以下 modification を加えて /qa-only workflow に従う:
- **preamble は skip** (/ship で既に handled)
- **plan の verification section を primary test input として使う** — 各 verification item を test case として扱う
- **detected dev server URL** を base URL として使う
- **Fix loop は skip** — これは /ship 中の report-only verification
- **plan の verification item で cap** — general site QA に拡大しない

### 4. Gate logic

- **全 verification item PASS:** silent 続行。 "Plan verification: PASS."
- **どれか FAIL:** AskUserQuestion:
  - screenshot evidence 付きで failure を表示
  - RECOMMENDATION: failure が broken functionality を示すなら A。 cosmetic のみなら B。
  - Options:
    A) Fix the failures before shipping (recommended for functional issues)
    B) Ship anyway — known issues (acceptable for cosmetic issues)
- **verification section なし / server なし / unreadable skill:** skip (non-blocking)。

### 5. PR body に含める

PR body (Step 19) に \`## Verification Results\` section を追加:
- verification が ran: 結果 summary (N PASS, M FAIL, K SKIPPED)
- skip 時: skip 理由 (no plan / no server / no verification section)`;
}

// ─── Cross-Review Finding Dedup ────────

export function generateCrossReviewDedup(ctx: TemplateContext): string {
  const isShip = ctx.skillName === 'ship';
  const stepNum = isShip ? '9.3' : '5.0';
  const findingsRef = isShip
    ? 'checklist pass (Step 9) + specialist review (Step 9.1-9.2)'
    : 'Step 4 critical pass + Step 4.5-4.6 specialist'
  ;

  return `### Step ${stepNum}: Cross-review finding dedup

findings を classify 前に、 同 branch の prior review で user が skip した findings がないかを check。

\`\`\`bash
~/.claude/skills/uzustack/bin/uzustack-review-read
\`\`\`

output を parse: \`---CONFIG---\` 前の line のみが JSONL entry (output には \`---CONFIG---\` と \`---HEAD---\` footer section も含まれるが JSONL でない — ignore)。

\`findings\` array を持つ各 JSONL entry について:
1. \`action: "skipped"\` の全 fingerprint を collect
2. その entry の \`commit\` field を note

skipped fingerprint が存在する場合、 当該 review 以降の changed file list を取得:

\`\`\`bash
git diff --name-only <prior-review-commit> HEAD
\`\`\`

現在の各 finding (${findingsRef} 両方から) について check:
- fingerprint が以前 skipped finding と match するか？
- finding の file path が changed-files set に NOT in か？

両方 true なら finding を suppress。 intentionally skipped で、 該当 code が変わっていない。

Print: "Suppressed N findings from prior reviews (previously skipped by user)"

**\`skipped\` finding のみ suppress — \`fixed\` / \`auto-fixed\` は決して suppress しない** (regression する可能性、 再 check すべき)。

prior review 不在 / \`findings\` array を持つ entry なしの場合、 silent skip。

summary header を出力: \`Pre-Landing Review: N issues (X critical, Y informational)\``;
}
