/**
 * Review Army resolver — /review 用の並列 specialist reviewer
 *
 * Claude に以下を指示する template prose を生成する:
 * 1. uzustack-diff-scope で stack + scope を detect
 * 2. specialist subagent を選択して並列 dispatch
 * 3. JSON findings を collect / parse / merge / dedup
 * 4. merge 済 findings を既存 Fix-First pipeline に feed
 *
 * gstack の self-learning roadmap (SELF_LEARNING_V0.md) Release 2 として出荷。
 *
 * uzustack voice 規約 v1 + v2 適用:
 * - bash internals は English 維持 (axis 1)
 * - narrative は Japanese (経営者・少人数開発者文脈)
 * - 固有名詞 (Review Army / Red Team / Fix-First / specialist 名 / NEVER_GATE 等) は
 *   English-locked、 周囲の Japanese narrative で gloss
 * - paths は upstream の `gstack` → `uzustack` 機械置換
 * - subagent への prompt 文字列は **英語 keep** (general-purpose agent の解釈精度確保)
 */
import type { TemplateContext } from './types';

function generateSpecialistSelection(ctx: TemplateContext): string {
  const isShip = ctx.skillName === 'ship';
  const stepSel = isShip ? '9.1' : '4.5';
  const stepMerge = isShip ? '9.2' : '4.6';
  const nextStep = isShip ? 'the Fix-First flow (item 4)' : 'Step 5';
  return `## Step ${stepSel}: Review Army — Specialist Dispatch

### Stack + scope を detect

\`\`\`bash
source <(${ctx.paths.binDir}/uzustack-diff-scope <base> 2>/dev/null) || true
# specialist context のために stack を detect
STACK=""
[ -f Gemfile ] && STACK="\${STACK}ruby "
[ -f package.json ] && STACK="\${STACK}node "
[ -f requirements.txt ] || [ -f pyproject.toml ] && STACK="\${STACK}python "
[ -f go.mod ] && STACK="\${STACK}go "
[ -f Cargo.toml ] && STACK="\${STACK}rust "
echo "STACK: \${STACK:-unknown}"
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_LINES=$((DIFF_INS + DIFF_DEL))
echo "DIFF_LINES: $DIFF_LINES"
# specialist test stub 生成のために test framework を detect
TEST_FW=""
{ [ -f jest.config.ts ] || [ -f jest.config.js ]; } && TEST_FW="jest"
[ -f vitest.config.ts ] && TEST_FW="vitest"
{ [ -f spec/spec_helper.rb ] || [ -f .rspec ]; } && TEST_FW="rspec"
{ [ -f pytest.ini ] || [ -f conftest.py ]; } && TEST_FW="pytest"
[ -f go.mod ] && TEST_FW="go-test"
echo "TEST_FW: \${TEST_FW:-unknown}"
\`\`\`

### specialist hit rate を read (adaptive gating)

\`\`\`bash
${ctx.paths.binDir}/uzustack-specialist-stats 2>/dev/null || true
\`\`\`

### specialist を select

上記 scope signal に基づいて、 dispatch する specialist を select。

**Always-on (50+ changed line の全 review で dispatch):**
1. **Testing** — \`${ctx.paths.skillRoot}/review/specialists/testing.md\` を read
2. **Maintainability** — \`${ctx.paths.skillRoot}/review/specialists/maintainability.md\` を read

**DIFF_LINES < 50 の場合:** specialist を全 skip。 Print: "Small diff ($DIFF_LINES lines) — specialists skipped." ${nextStep} に続行。

**Conditional (matching scope signal が true なら dispatch):**
3. **Security** — SCOPE_AUTH=true、 OR SCOPE_BACKEND=true AND DIFF_LINES > 100。 \`${ctx.paths.skillRoot}/review/specialists/security.md\` を read
4. **Performance** — SCOPE_BACKEND=true OR SCOPE_FRONTEND=true。 \`${ctx.paths.skillRoot}/review/specialists/performance.md\` を read
5. **Data Migration** — SCOPE_MIGRATIONS=true。 \`${ctx.paths.skillRoot}/review/specialists/data-migration.md\` を read
6. **API Contract** — SCOPE_API=true。 \`${ctx.paths.skillRoot}/review/specialists/api-contract.md\` を read
7. **Design** — SCOPE_FRONTEND=true。 既存 design review checklist \`${ctx.paths.skillRoot}/review/design-checklist.md\` を使う

### Adaptive gating

scope-based selection の後、 specialist hit rate に基づいて adaptive gating を apply:

scope gating を通過した各 conditional specialist について、 上の \`uzustack-specialist-stats\` output を check:
- \`[GATE_CANDIDATE]\` tag (10+ dispatch で 0 findings): skip。 Print: "[specialist] auto-gated (0 findings in N reviews)."
- \`[NEVER_GATE]\` tag: hit rate に関わらず常に dispatch。 Security + data-migration は insurance policy specialist — silent でも run すべき。

**Force flag:** user の prompt に \`--security\`, \`--performance\`, \`--testing\`, \`--maintainability\`, \`--data-migration\`, \`--api-contract\`, \`--design\`, or \`--all-specialists\` が含まれる場合、 gating に関わらず該当 specialist を force-include。

どの specialist が selected / gated / skipped されたか note。 selection を print:
"Dispatching N specialists: [names]. Skipped: [names] (scope not detected). Gated: [names] (0 findings in N+ reviews)."`;
}

function generateSpecialistDispatch(ctx: TemplateContext): string {
  return `### specialist を並列 dispatch

各 selected specialist について、 Agent tool で independent subagent を起動。
**選択した全 specialist を 1 message で起動** (複数 Agent tool call) して並列 run。
各 subagent は fresh context — prior review bias なし。

**各 specialist subagent prompt:**

各 specialist の prompt を組み立てる。 prompt は以下を含む:

1. specialist の checklist content (上の step で file を既に read 済)
2. Stack context: "This is a {STACK} project."
3. この domain の past learnings (あれば):

\`\`\`bash
${ctx.paths.binDir}/uzustack-learnings-search --type pitfall --query "{specialist domain}" --limit 5 2>/dev/null || true
\`\`\`

learnings が見つかれば含める: "Past learnings for this domain: {learnings}"

4. Instructions:

"You are a specialist code reviewer. Read the checklist below, then run
\`git diff origin/<base>\` to get the full diff. Apply the checklist against the diff.

For each finding, output a JSON object on its own line:
{\\"severity\\":\\"CRITICAL|INFORMATIONAL\\",\\"confidence\\":N,\\"path\\":\\"file\\",\\"line\\":N,\\"category\\":\\"category\\",\\"summary\\":\\"description\\",\\"fix\\":\\"recommended fix\\",\\"fingerprint\\":\\"path:line:category\\",\\"specialist\\":\\"name\\"}

Required fields: severity, confidence, path, category, summary, specialist.
Optional: line, fix, fingerprint, evidence, test_stub.

If you can write a test that would catch this issue, include it in the \`test_stub\` field.
Use the detected test framework ({TEST_FW}). Write a minimal skeleton — describe/it/test
blocks with clear intent. Skip test_stub for architectural or design-only findings.

If no findings: output \`NO FINDINGS\` and nothing else.
Do not output anything else — no preamble, no summary, no commentary.

Stack context: {STACK}
Past learnings: {learnings or 'none'}

CHECKLIST:
{checklist content}"

**Subagent configuration:**
- \`subagent_type: "general-purpose"\` を使う
- \`run_in_background\` を使わない — 全 specialist が merge 前に complete する必要
- specialist subagent が fail / timeout した場合、 failure を log して successful specialist の結果で続行。 specialist は additive — partial result でも no result より良い。`;
}

function generateFindingsMerge(ctx: TemplateContext): string {
  const isShip = ctx.skillName === 'ship';
  const stepMerge = isShip ? '9.2' : '4.6';
  const stepSel = isShip ? '9.1' : '4.5';
  const fixFirstRef = isShip ? 'the Fix-First flow (item 4)' : 'Step 5 Fix-First';
  const critPassRef = isShip ? 'the checklist pass (Step 9)' : 'the CRITICAL pass findings from Step 4';
  const persistRef = isShip ? 'the review-log persist' : 'the review-log entry in Step 5.8';
  return `### Step ${stepMerge}: Findings を collect + merge

全 specialist subagent 完了後、 各 output を collect。

**Findings を parse:**
各 specialist の output について:
1. output が "NO FINDINGS" — skip、 この specialist は何も見つけなかった
2. それ以外、 各 line を JSON object として parse。 valid JSON でない line を skip。
3. 全 parsed findings を 1 list に collect、 specialist 名 で tag。

**Fingerprint + dedup:**
各 finding について fingerprint を compute:
- \`fingerprint\` field 存在: それを使う
- なければ: \`{path}:{line}:{category}\` (line あり) or \`{path}:{category}\`

fingerprint で findings を group。 同 fingerprint を share する findings について:
- 最高 confidence score の finding を keep
- tag する: "MULTI-SPECIALIST CONFIRMED ({specialist1} + {specialist2})"
- confidence を +1 boost (cap 10)
- 確認した specialist を output で note

**Confidence gate を apply:**
- Confidence 7+: findings output に normally 表示
- Confidence 5-6: caveat 付きで表示 "Medium confidence — verify this is actually an issue"
- Confidence 3-4: appendix に移動 (main findings から suppress)
- Confidence 1-2: 完全 suppress

**PR Quality Score を compute:**
merge 後、 quality score を compute:
\`quality_score = max(0, 10 - (critical_count * 2 + informational_count * 0.5))\`
Cap 10。 最後の review result に log。

**Merged findings を output:**
merged findings を current review と同 format で提示:

\`\`\`
SPECIALIST REVIEW: N findings (X critical, Y informational) from Z specialists

[各 finding を order で: CRITICAL 先、 次 INFORMATIONAL、 confidence 降順]
[SEVERITY] (confidence: N/10, specialist: name) path:line — summary
  Fix: recommended fix
  [MULTI-SPECIALIST CONFIRMED の場合: confirmation note 表示]

PR Quality Score: X/10
\`\`\`

これらの findings は ${critPassRef} と並んで ${fixFirstRef} に流れる。
Fix-First heuristic は identically 適用 — specialist findings は同じ AUTO-FIX vs ASK classification に従う。

**Per-specialist stats を compile:**
findings merge 後、 ${persistRef} 用に \`specialists\` object を compile。
各 specialist (testing / maintainability / security / performance / data-migration / api-contract / design / red-team) について:
- dispatched: \`{"dispatched": true, "findings": N, "critical": N, "informational": N}\`
- scope で skipped: \`{"dispatched": false, "reason": "scope"}\`
- gating で skipped: \`{"dispatched": false, "reason": "gated"}\`
- not applicable (e.g., red-team 未起動): object から omit

Design specialist も含める、 specialist schema file でなく \`design-checklist.md\` を使う場合も。
これらの stats を覚えておく — Step 5.8 の review-log entry で必要。`;
}

function generateRedTeam(ctx: TemplateContext): string {
  const isShip = ctx.skillName === 'ship';
  const stepMerge = isShip ? '9.2' : '4.6';
  const fixFirstRef = isShip ? 'the Fix-First flow (item 4)' : 'Step 5 Fix-First';
  return `### Red Team dispatch (conditional)

**Activation:** DIFF_LINES > 200 OR 任意の specialist が CRITICAL finding を produce した場合のみ。

activated なら、 Agent tool で 1 つ追加 subagent を dispatch (foreground、 background でない)。

Red Team subagent は以下を receive:
1. \`${ctx.paths.skillRoot}/review/specialists/red-team.md\` から red-team checklist
2. Step ${stepMerge} で merge 済の specialist findings (既に catch されたものを知らせる)
3. git diff command

Prompt: "You are a red team reviewer. The code has already been reviewed by N specialists
who found the following issues: {merged findings summary}. Your job is to find what they
MISSED. Read the checklist, run \`git diff origin/<base>\`, and look for gaps.
Output findings as JSON objects (same schema as the specialists). Focus on cross-cutting
concerns, integration boundary issues, and failure modes that specialist checklists
don't cover."

Red Team が追加 issue を見つけたら、 ${fixFirstRef} 前に findings list に merge。 Red Team findings は \`"specialist":"red-team"\` で tag。

Red Team が NO FINDINGS を return: note "Red Team review: no additional issues found."
Red Team subagent が fail / timeout: silent skip して続行。`;
}

export function generateReviewArmy(ctx: TemplateContext): string {
  // Codex host: 完全 strip — Codex は Review Army を run しない
  if (ctx.host === 'codex') return '';

  const sections = [
    generateSpecialistSelection(ctx),
    generateSpecialistDispatch(ctx),
    generateFindingsMerge(ctx),
    generateRedTeam(ctx),
  ];

  return sections.join('\n\n---\n\n');
}
