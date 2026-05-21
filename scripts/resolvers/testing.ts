/**
 * Testing resolvers
 *
 * /ship / /review / /plan-eng-review が共有する test framework bootstrap +
 * test coverage audit (3 mode: plan / ship / review) を集約する。
 *
 * test coverage audit は inner helper 1 つから 3 mode で分岐する設計:
 *   {{TEST_COVERAGE_AUDIT_PLAN}}   → plan-eng-review: 計画に missing test を追加
 *   {{TEST_COVERAGE_AUDIT_SHIP}}   → ship: test を auto 生成、 coverage summary
 *   {{TEST_COVERAGE_AUDIT_REVIEW}} → review: Fix-First (ASK) 経由で test 生成
 *
 *   ┌────────────────────────────────────────────────┐
 *   │  generateTestCoverageAuditInner(mode)          │
 *   │                                                │
 *   │  SHARED: framework detect / codepath trace /   │
 *   │    ASCII diagram / quality rubric / E2E matrix │
 *   │    / regression rule                           │
 *   │                                                │
 *   │  plan:   plan file edit、 artifact write       │
 *   │  ship:   test auto 生成、 artifact write       │
 *   │  review: Fix-First ASK、 INFORMATIONAL gap     │
 *   └────────────────────────────────────────────────┘
 *
 * uzustack voice 規約 v1 + v2 適用:
 * - bash internals は English 維持 (axis 1)
 * - narrative は Japanese (経営者・少人数開発者文脈)
 * - 固有名詞 (vibe coding / yolo coding / superpower / Fix-First) は
 *   English-locked、 周囲の Japanese narrative で gloss
 * - paths は upstream の `gstack` → `uzustack` 機械置換
 */
import type { TemplateContext } from './types';

export function generateTestBootstrap(_ctx: TemplateContext): string {
  return `## Test Framework Bootstrap

**既存 test framework + project runtime を detect:**

\`\`\`bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
# Project runtime を detect
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Sub-framework を detect
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# 既存 test infrastructure を check
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Opt-out marker を check
[ -f .uzustack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
\`\`\`

**Test framework が detect された場合** (config file or test directory あり):
Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap."
既存 test file を 2-3 個 read して convention を learn (naming / import / assertion style / setup pattern)。
Phase 8e.5 or Step 7 で使うため convention を prose context として保持。 **bootstrap の残 step を skip。**

**BOOTSTRAP_DECLINED が出た場合:** Print "Test bootstrap previously declined — skipping." **bootstrap の残 step を skip。**

**Runtime が detect できない場合** (config file 不在): AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
H 選択 → \`.uzustack/no-test-bootstrap\` を write、 test なしで続行。

**Runtime detect 済 + test framework なしの場合 — bootstrap:**

### B2. Best practice を research

WebSearch で detect 済 runtime の current best practice を find:
- \`"[runtime] best test framework 2025 2026"\`
- \`"[framework A] vs [framework B] comparison"\`

WebSearch が unavailable なら、 以下の built-in knowledge table を使う:

| Runtime | Primary recommendation | Alternative |
|---------|----------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot + shoulda-matchers |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |
| Rust | cargo test (built-in) + mockall | — |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (built-in) + ex_machina | — |

### B3. Framework selection

AskUserQuestion:
"I detected this is a [Runtime/Framework] project with no test framework. I researched current best practices. Here are the options:
A) [Primary] — [rationale]. Includes: [packages]. Supports: unit, integration, smoke, e2e
B) [Alternative] — [rationale]. Includes: [packages]
C) Skip — don't set up testing right now
RECOMMENDATION: Choose A because [reason based on project context]"

C 選択 → \`.uzustack/no-test-bootstrap\` を write。 user に告げる: "If you change your mind later, delete \`.uzustack/no-test-bootstrap\` and re-run." test なしで続行。

複数 runtime が detect された場合 (monorepo) → どの runtime を最初に setup するか ask、 両方を sequential に setup する option も提示。

### B4. Install + configure

1. 選んだ package を install (npm/bun/gem/pip/etc.)
2. minimal config file を作成
3. directory 構造を作成 (test/ / spec/ / etc.)
4. setup が動くことを verify するため project code に match する example test を 1 つ作成

package install が fail → 1 回 debug。 依然 fail → \`git checkout -- package.json package-lock.json\` で revert (runtime 相当の cmd)。 user に warn して test なしで続行。

### B4.5. 最初の real test

既存 code に対する real test を 3-5 個 generate:

1. **最近 changed file を find:** \`git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10\`
2. **risk で prioritize:** Error handler > 条件分岐ありの business logic > API endpoint > pure function
3. **各 file:** meaningful assertion で real behavior を test。 \`expect(x).toBeDefined()\` は禁止 — code が DOES 何をするかを test。
4. 各 test を run。 pass → keep。 fail → 1 回 fix。 依然 fail → silent delete。
5. 最低 1 test、 上限 5。

test file で secret / API key / credential を import しない。 環境変数 or test fixture を使う。

### B5. Verify

\`\`\`bash
# full test suite を run して全 動作 を確認
{detected test command}
\`\`\`

test が fail → 1 回 debug。 依然 fail → 全 bootstrap 変更を revert して user に warn。

### B5.5. CI/CD pipeline

\`\`\`bash
# CI provider を check
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
\`\`\`

\`.github/\` 存在 (or CI 未検出 — default で GitHub Actions):
\`.github/workflows/test.yml\` を作成、 以下を含める:
- \`runs-on: ubuntu-latest\`
- runtime 用の適切な setup action (setup-node / setup-ruby / setup-python 等)
- B5 で verify 済の test command
- Trigger: push + pull_request

GitHub 以外の CI を detect → CI 生成を skip、 note: "Detected {provider} — CI pipeline generation supports GitHub Actions only. Add test step to your existing pipeline manually."

### B6. TESTING.md を作成

最初 check: TESTING.md 既存 → read して update / append、 上書きしない。 既存 content を destroy しない。

TESTING.md に以下を write:
- Philosophy: "100% test coverage は great vibe coding (= AI と勘で書く実装スタイル) の key — テストがあれば速く動き、 勘を信じ、 自信を持って ship できる。 テストなしの vibe coding は yolo coding に過ぎない。 テストがあれば、 それは superpower。"
- framework 名 + version
- test の動かし方 (B5 で verify 済の command)
- Test layer: Unit test (what / where / when), Integration test, Smoke test, E2E test
- Convention: file naming / assertion style / setup-teardown pattern

### B7. CLAUDE.md を update

最初 check: CLAUDE.md に既に \`## Testing\` section → skip。 重複させない。

\`## Testing\` section を append:
- Run command + test directory
- TESTING.md への reference
- Test expectation:
  - 100% test coverage が goal — test は vibe coding を safe にする
  - 新 function を書く時、 対応する test を書く
  - bug を直す時、 regression test を書く
  - error handling を追加する時、 その error を trigger する test を書く
  - conditional (if/else / switch) を追加する時、 両 path の test を書く
  - 既存 test を fail させる code を絶対 commit しない

### B8. Commit

\`\`\`bash
git status --porcelain
\`\`\`

変更ありの場合のみ commit。 全 bootstrap file を stage (config / test directory / TESTING.md / CLAUDE.md / 作成済なら .github/workflows/test.yml):
\`git commit -m "chore: bootstrap test framework ({framework name})"\`

---`;
}

// ─── Test Coverage Audit ────────
//
// codepath trace / ASCII diagram / test gap 分析の共有 methodology。
// 3 mode / 3 placeholder / 1 inner function:
//
//   {{TEST_COVERAGE_AUDIT_PLAN}}   → plan-eng-review: 計画に missing test を追加
//   {{TEST_COVERAGE_AUDIT_SHIP}}   → ship: test を auto 生成、 coverage summary
//   {{TEST_COVERAGE_AUDIT_REVIEW}} → review: Fix-First (ASK) 経由で test 生成

type CoverageAuditMode = 'plan' | 'ship' | 'review';

function generateTestCoverageAuditInner(mode: CoverageAuditMode): string {
  const sections: string[] = [];

  // ── Intro (mode-specific) ──
  if (mode === 'ship') {
    sections.push(`100% coverage が goal — untested path は bug が隠れる場所、 vibe coding が yolo coding に変わる場所。 plan されたものでなく、 diff から ACTUALLY coded されたものを evaluate する。`);
  } else if (mode === 'plan') {
    sections.push(`100% coverage が goal。 plan 内の全 codepath を evaluate、 plan が各 path に test を含むことを ensure。 plan に test 漏れがあれば追加 — 実装開始時に full test coverage が組み込まれる程度に plan が complete であるべき。`);
  } else {
    sections.push(`100% coverage が goal。 diff で変わった全 codepath を evaluate、 test gap を identify。 gap は INFORMATIONAL findings になり Fix-First flow に従う。`);
  }

  // ── Test framework detection (shared) ──
  sections.push(`
### Test Framework Detection

coverage 分析前に、 project の test framework を detect:

1. **CLAUDE.md を read** — test command + framework 名を含む \`## Testing\` section を look for。 見つかれば authoritative source として使う。
2. **CLAUDE.md に testing section なしなら auto-detect:**

\`\`\`bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
# Project runtime を detect
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
# 既存 test infrastructure を check
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
\`\`\`

3. **framework が detect できない場合:**${mode === 'ship' ? ' Test Framework Bootstrap step (Step 4) に fall through、 full setup が handled される。' : ' coverage diagram は produce する、 test 生成は skip。'}`);

  // ── Before/after count (ship only) ──
  if (mode === 'ship') {
    sections.push(`
**0. Before/after test count:**

\`\`\`bash
# 生成前の test file 数を count
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

PR body 用にこの数を store。`);
  }

  // ── Codepath tracing methodology (shared, with mode-specific source) ──
  const traceSource = mode === 'plan'
    ? `**Step 1. plan 内の全 codepath を trace:**

plan document を read。 記述された各 新機能 / service / endpoint / component について、 計画された code を data flow で trace — 計画された function を list するだけでなく、 計画された execution を実際 follow:`
    : `**${mode === 'ship' ? '1' : 'Step 1'}. 変わった全 codepath を trace** \`git diff origin/<base>...HEAD\` で:

各 changed file を read。 file ごとに data flow で trace — function を list するだけでなく、 execution を実際 follow:`;

  const traceStep1 = mode === 'plan'
    ? `1. **plan を read。** 計画された各 component が何をするか、 既存 code とどう繋がるかを理解。`
    : `1. **diff を read。** 各 changed file について full file を read (diff hunk だけでなく) して context を理解。`;

  sections.push(`
${traceSource}

${traceStep1}
2. **Data flow を trace。** 各 entry point (route handler / exported function / event listener / component render) から始めて、 全 branch を data で follow:
   - input はどこから来る？ (request params / props / database / API call)
   - 何が transform する？ (validation / mapping / computation)
   - どこへ行く？ (database write / API response / rendered output / side effect)
   - 各 step で何が起きうる？ (null/undefined / invalid input / network failure / empty collection)
3. **Execution を diagram 化。** 各 changed file について以下を示す ASCII diagram を draw:
   - 追加 or 変更された全 function / method
   - 全 conditional branch (if/else / switch / ternary / guard clause / early return)
   - 全 error path (try/catch / rescue / error boundary / fallback)
   - 他 function への全 call (trace 入る — それも untested branch を持つか？)
   - 全 edge: null input なら？ empty array なら？ invalid type なら？

これが critical step — input によって異なる実行をする全 line の map を build している。 この diagram の全 branch に test が要る。`);

  // ── User flow coverage (shared) ──
  sections.push(`
**${mode === 'ship' ? '2' : 'Step 2'}. user flow / interaction / error state を map:**

code coverage だけでは不十分 — real user が changed code とどう interact するかを cover する必要。 各 changed feature について以下を思考:

- **User flow:** どの sequence of action が user にこの code を触らせる？ full journey を map (e.g., "user clicks 'Pay' → form validates → API call → success/failure screen")。 journey の各 step に test が要る。
- **Interaction edge case:** user が予想外の動作をしたら何が起きる？
  - Double-click / rapid resubmit
  - mid-operation で navigate away (back button / close tab / 他 link click)
  - stale data で submit (page を 30 分開きっぱなし / session expired)
  - Slow connection (API takes 10 秒 — user に何が見える？)
  - Concurrent action (2 tab / 同じ form)
- **User が見える error state:** code が handle する各 error について、 user は実際に何を experience する？
  - clear な error message があるか silent failure か？
  - user が recover できる (retry / 戻る / input fix) か stuck か？
  - network なしなら？ API から 500 なら？ server から invalid data なら？
- **Empty/zero/boundary state:** UI は zero result で何を見せる？ 10,000 result で？ 1 文字 input で？ max-length input で？

これらを code branch と並べて diagram に追加。 test なしの user flow は test なしの if/else と同じ gap。`);

  // ── Check branches against tests + quality rubric (shared) ──
  sections.push(`
**${mode === 'ship' ? '3' : 'Step 3'}. 各 branch を既存 test と照合:**

diagram を branch 単位で go through — code path AND user flow 両方。 各 branch について exercise する test を search:
- function \`processPayment()\` → \`billing.test.ts\`, \`billing.spec.ts\`, \`test/billing_test.rb\` を look for
- if/else → true AND false 両 path を cover する test を look for
- error handler → その specific error condition を trigger する test を look for
- 自身に branch を持つ \`helperFn()\` への call → その branch にも test が要る
- user flow → journey を walk through する integration / E2E test を look for
- interaction edge case → 予想外 action を simulate する test を look for

Quality scoring rubric:
- ★★★  behavior + edge case + error path を test
- ★★   correct behavior、 happy path のみ test
- ★    smoke test / existence check / trivial assertion (e.g., "it renders", "it doesn't throw")`);

  // ── E2E test decision matrix (shared) ──
  sections.push(`
### E2E Test Decision Matrix

各 branch を check 時、 unit test と E2E / integration test のどちらが適切かも判定:

**E2E を RECOMMEND (diagram で [→E2E] mark):**
- 3+ component/service にまたがる common user flow (e.g., signup → verify email → first login)
- mock が real failure を隠す integration point (e.g., API → queue → worker → DB)
- Auth / payment / data destruction flow — unit test だけに信を置くには too important

**EVAL を RECOMMEND (diagram で [→EVAL] mark):**
- quality eval が要る critical LLM call (e.g., prompt 変更 → output が quality bar を満たすか test)
- prompt template / system instruction / tool definition の変更

**UNIT TEST で STICK:**
- input/output が明確な pure function
- side effect なしの internal helper
- 単一 function の edge case (null input / empty array)
- customer-facing でない obscure / rare flow`);

  // ── Regression rule (shared) ──
  sections.push(`
### REGRESSION RULE (mandatory)

**IRON RULE:** coverage audit が REGRESSION を identify (= 以前動いていた code が diff で broken) した場合、 regression test を ${mode === 'plan' ? 'plan に critical requirement として追加' : '即座に書く'}。 AskUserQuestion なし。 skip なし。 regression は何かが壊れた証拠なので highest-priority test。

regression は以下のとき:
- diff が既存 behavior を modify (新 code でない)
- 既存 test suite (あれば) が changed path を cover していない
- 変更が既存 caller に新 failure mode を introduce

ある変更が regression かどうか uncertain なら、 test を書く側に err on the side of。${mode !== 'plan' ? '\n\nFormat: \`test: regression test for {what broke}\` で commit' : ''}`);

  // ── ASCII coverage diagram (shared) ──
  sections.push(`
**${mode === 'ship' ? '4' : 'Step 4'}. ASCII coverage diagram を output:**

code path + user flow 両方を同 diagram に。 E2E worthy + eval worthy path を mark:

\`\`\`
CODE PATHS                                            USER FLOWS
[+] src/services/billing.ts                           [+] Payment checkout
  ├── processPayment()                                  ├── [★★★ TESTED] Complete purchase — checkout.e2e.ts:15
  │   ├── [★★★ TESTED] happy + declined + timeout      ├── [GAP] [→E2E] Double-click submit
  │   ├── [GAP]         Network timeout                 └── [GAP]        Navigate away mid-payment
  │   └── [GAP]         Invalid currency
  └── refundPayment()                                 [+] Error states
      ├── [★★  TESTED] Full refund — :89                ├── [★★  TESTED] Card declined message
      └── [★   TESTED] Partial (non-throw only) — :101  └── [GAP]        Network timeout UX

LLM integration: [GAP] [→EVAL] Prompt template change — needs eval test

COVERAGE: 5/13 paths tested (38%)  |  Code paths: 3/5 (60%)  |  User flows: 2/8 (25%)
QUALITY: ★★★:2 ★★:2 ★:1  |  GAPS: 8 (2 E2E, 1 eval)
\`\`\`

Legend: ★★★ behavior + edge + error  |  ★★ happy path  |  ★ smoke check
[→E2E] = needs integration test  |  [→EVAL] = needs LLM eval

**Fast path:** 全 path covered → "${mode === 'ship' ? 'Step 7' : mode === 'review' ? 'Step 4.75' : 'Test review'}: All new code paths have test coverage ✓" 続行。`);

  // ── Mode-specific action section ──
  if (mode === 'plan') {
    sections.push(`
**Step 5. Missing test を plan に追加:**

diagram で identify された各 GAP について、 plan に test requirement を追加。 specific に:
- どの test file を作るか (既存 naming convention に match)
- test が何を assert するか (specific input → expected output/behavior)
- unit test / E2E test / eval どれか (decision matrix を使う)
- regression の場合: **CRITICAL** として flag、 何が broken したか説明

plan は実装開始時に各 test が feature code と並んで書かれる程度 complete にする — follow-up に defer しない。`);

    // ── Test plan artifact (plan + ship) ──
    sections.push(`
### Test Plan Artifact

coverage diagram 生成後、 \`/qa\` / \`/qa-only\` が primary test input として consume できるよう、 project directory に test plan artifact を write:

\`\`\`bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
\`\`\`

\`~/.uzustack/projects/{slug}/{user}-{branch}-eng-review-test-plan-{datetime}.md\` に write:

\`\`\`markdown
# Test Plan
Generated by /plan-eng-review on {date}
Branch: {branch}
Repo: {owner/repo}

## Affected Pages/Routes
- {URL path} — {what to test and why}

## Key Interactions to Verify
- {interaction description} on {page}

## Edge Cases
- {edge case} on {page}

## Critical Paths
- {end-to-end flow that must work}
\`\`\`

この file は \`/qa\` / \`/qa-only\` が primary test input として consume。 QA tester が **何を / どこで test するか** を知るのに役立つ情報のみ含める — 実装詳細を入れない。`);
  } else if (mode === 'ship') {
    sections.push(`
**5. Uncovered path に test を generate:**

test framework が detect 済 (or Step 4 で bootstrap 済) なら:
- error handler + edge case を priority 先 (happy path は既存 test されている可能性 high)
- 既存 test file を 2-3 個 read して convention を exact に match
- unit test を generate。 external dependency (DB / API / Redis) を全 mock。
- [→E2E] mark path: project の E2E framework (Playwright / Cypress / Capybara 等) で integration/E2E test を generate
- [→EVAL] mark path: project の eval framework で eval test を generate、 なければ manual eval として flag
- specific uncovered path を real assertion で exercise する test を write
- 各 test を run。 pass → \`test: coverage for {feature}\` で commit
- fail → 1 回 fix。 依然 fail → revert、 diagram に gap として note。

Caps: 30 code path max / 20 test generated max (code + user flow 合計) / 2 分 per-test exploration cap。

test framework なし AND user が bootstrap declined → diagram only、 generation なし。 Note: "Test generation skipped — no test framework configured."

**Diff が test-only changes:** Step 7 完全 skip: "No new application code paths to audit."

**6. After-count + coverage summary:**

\`\`\`bash
# 生成後の test file 数を count
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

PR body: \`Tests: {before} → {after} (+{delta} new)\`
Coverage line: \`Test Coverage Audit: N new code paths. M covered (X%). K tests generated, J committed.\`

**7. Coverage gate:**

続行前に CLAUDE.md で \`## Test Coverage\` section の \`Minimum:\` + \`Target:\` field を check。 見つかればその % を使う。 なければ default: Minimum = 60%, Target = 80%。

substep 4 diagram の coverage % (\`COVERAGE: X/Y (Z%)\` line) を使う:

- **>= target:** Pass。 "Coverage gate: PASS ({X}%)." 続行。
- **>= minimum, < target:** AskUserQuestion:
  - "AI-assessed coverage is {X}%. {N} code paths are untested. Target is {target}%."
  - RECOMMENDATION: untested code path は production bug が隠れる場所だから A を選ぶ。
  - Options:
    A) Generate more tests for remaining gaps (recommended)
    B) Ship anyway — I accept the coverage risk
    C) These paths don't need tests — mark as intentionally uncovered
  - A: substep 5 (test 生成) に loop back、 remaining gap を target。 2 pass 後依然 target 未満なら updated 数字で AskUserQuestion を再提示。 最大 2 生成 pass。
  - B: 続行。 PR body に含める: "Coverage gate: {X}% — user accepted risk."
  - C: 続行。 PR body に含める: "Coverage gate: {X}% — {N} paths intentionally uncovered."

- **< minimum:** AskUserQuestion:
  - "AI-assessed coverage is critically low ({X}%). {N} of {M} code paths have no tests. Minimum threshold is {minimum}%."
  - RECOMMENDATION: {minimum}% 未満は tested より untested code が多いから A を選ぶ。
  - Options:
    A) Generate tests for remaining gaps (recommended)
    B) Override — ship with low coverage (I understand the risk)
  - A: substep 5 に loop back。 最大 2 pass。 2 pass 後依然 minimum 未満なら override choice を再提示。
  - B: 続行。 PR body に含める: "Coverage gate: OVERRIDDEN at {X}%."

**Coverage percentage 判定不能:** coverage diagram が明確な numeric % を produce しない (ambiguous output / parse error) 場合、 **gate を skip**: "Coverage gate: could not determine percentage — skipping." 0% に default にせず、 block しない。

**Test-only diff:** gate を skip (既存 fast-path と同じ)。

**100% coverage:** "Coverage gate: PASS (100%)." 続行。`);

    // ── Test plan artifact (ship mode) ──
    sections.push(`
### Test Plan Artifact

coverage diagram 生成後、 \`/qa\` / \`/qa-only\` が consume できるよう test plan artifact を write:

\`\`\`bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
\`\`\`

\`~/.uzustack/projects/{slug}/{user}-{branch}-ship-test-plan-{datetime}.md\` に write:

\`\`\`markdown
# Test Plan
Generated by /ship on {date}
Branch: {branch}
Repo: {owner/repo}

## Affected Pages/Routes
- {URL path} — {what to test and why}

## Key Interactions to Verify
- {interaction description} on {page}

## Edge Cases
- {edge case} on {page}

## Critical Paths
- {end-to-end flow that must work}
\`\`\``);
  } else {
    // review mode
    sections.push(`
**Step 5. Gap に test を generate (Fix-First):**

test framework が detect 済 + gap identify 済なら:
- 各 gap を Fix-First Heuristic で AUTO-FIX or ASK に classify:
  - **AUTO-FIX:** pure function の simple unit test、 既存 tested function の edge case
  - **ASK:** E2E test、 新 test infrastructure 必要 test、 ambiguous behavior の test
- AUTO-FIX gap: test を generate、 run、 \`test: coverage for {feature}\` で commit
- ASK gap: 他 review findings と一緒に Fix-First batch question に含める
- [→E2E] mark path: 常に ASK (E2E test は higher-effort、 user 確認が要る)
- [→EVAL] mark path: 常に ASK (eval test は quality criteria に user 確認が要る)

test framework が detect されない場合 → gap を INFORMATIONAL findings として含めるのみ、 生成なし。

**Diff が test-only changes:** Step 4.75 を完全 skip: "No new application code paths to audit."

### Coverage Warning

coverage diagram 生成後、 coverage % を check。 CLAUDE.md で \`## Test Coverage\` section の \`Minimum:\` field を read。 なければ default: 60%。

coverage が minimum threshold 未満なら、 通常 review findings の **前** に prominent warning を output:

\`\`\`
⚠️ COVERAGE WARNING: AI-assessed coverage is {X}%. {N} code paths untested.
Consider writing tests before running /ship.
\`\`\`

これは INFORMATIONAL — /review を block しない。 ただし low coverage が早期 visible になり、 /ship coverage gate に到達する前に developer が address できる。

coverage % が判定不能なら、 warning を silent skip。`);
  }

  return sections.join('\n');
}

export function generateTestCoverageAuditPlan(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('plan');
}

export function generateTestCoverageAuditShip(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('ship');
}

export function generateTestCoverageAuditReview(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('review');
}
