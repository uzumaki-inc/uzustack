---
name: ship
type: translated
preamble-tier: 4
version: 1.0.0
description: |
  Ship workflow：base branch detect + merge、test 実行、diff review、
  VERSION bump、CHANGELOG 更新、commit、push、PR 作成。"ship"、"deploy"、
  "push to main"、"create a PR"、"merge and push"、"get it deployed"
  と要求されたときに使用する。ユーザーがコードが ready と言う、deploy について
  ask する、コードを push したい、PR を作成したいときは、（直接 push/PR
  せず）能動的に invoke する。(uzustack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
  - WebSearch
triggers:
  - ship it
  - create a pr
  - push to main
  - deploy this
  - ship する
  - PR 作成
  - main に push
  - deploy する
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->







# Ship: Fully Automated Ship Workflow

あなたは `/ship` workflow を実行している。これは **non-interactive、fully automated** な workflow。各 step での確認は **求めない**。ユーザーが `/ship` と言った = DO IT。最後まで真っ直ぐ走り、最後に PR URL を出力する。

**stop するのは以下の場合のみ:**
- base branch にいる（abort）
- auto-resolve できない merge conflict（停止、conflict を表示）
- in-branch test failure（pre-existing failure は triage、auto-block しない）
- Pre-landing review が user judgment 必要な ASK item を発見
- MINOR / MAJOR version bump 必要（ask — Step 12 参照）
- user 決定が必要な Greptile review コメント（複雑 fix、偽陽性）
- AI-assessed coverage が最低 threshold 未満（user override 付き hard gate — Step 7 参照）
- Plan items が NOT DONE で user override なし（Step 8 参照）
- Plan verification failure（Step 8.1 参照）
- TODOS.md が無く user が作成したい（ask — Step 14 参照）
- TODOS.md が disorganized で user が再 organize したい（ask — Step 14 参照）

**stop しない:**
- uncommitted changes（常に含める）
- Version bump choice（auto-pick MICRO or PATCH — Step 12 参照）
- CHANGELOG content（diff から auto-generate）
- Commit message 承認（auto-commit）
- Multi-file changeset（auto-split into bisectable commits）
- TODOS.md 完了項目検出（auto-mark）
- Auto-fixable review findings（dead code、N+1、stale comments — automatically fixed）
- target threshold 内の Test coverage gap（auto-generate and commit、または PR body で flag）

**Re-run behavior（idempotency）:**
`/ship` の re-run は「全 checklist を再実行」を意味する。全検証 step（test、coverage audit、plan completion、pre-landing review、adversarial review、VERSION/CHANGELOG check、TODOS、document-release）は invocation ごとに走る。
*action* のみ idempotent：
- Step 12: VERSION が既に bump されていれば bump を skip するが version は読む
- Step 17: 既に push 済なら push command を skip
- Step 19: PR が存在すれば、新規作成ではなく body を update する
過去の `/ship` run が実行したからといって、検証 step を skip しない。

---

## Step 1: Pre-flight

1. 現 branch を check。base branch または repo の default branch にいれば、**abort**：「You're on the base branch. Ship from a feature branch.」

2. `git status` を実行（`-uall` は決して使わない）。Uncommitted changes は常に含める — 確認不要。

3. `git diff <base>...HEAD --stat` と `git log <base>..HEAD --oneline` を実行し、ship される内容を理解。

4. review readiness を check：



Eng Review が「CLEAR」でない場合：

Print：「No prior eng review found — ship will run its own pre-landing review in Step 9.」

diff size を check：`git diff <base>...HEAD --stat | tail -1`。diff が >200 行なら追加：「Note: This is a large diff. Consider running `/plan-eng-review` or `/autoplan` for architecture-level review before shipping.」

CEO Review が欠落していれば、informational として mention（"CEO Review not run — recommended for product changes"）するが block **しない**。

Design Review について：`source <(~/.claude/skills/uzustack/bin/uzustack-diff-scope <base> 2>/dev/null)` を実行。`SCOPE_FRONTEND=true` で dashboard に design review（plan-design-review または design-review-lite）が無ければ、mention：「Design Review not run — this PR changes frontend code. The lite design check will run automatically in Step 9, but consider running /design-review for a full visual audit post-implementation.」 それでも block しない。

Step 2 に continue — block も ask もしない。Ship は Step 9 で自身の review を走らせる。

---

## Step 2: Distribution Pipeline Check

diff が新しい standalone artifact（CLI binary、library package、tool — 既存 deployment を持つ web service ではない）を導入する場合、distribution pipeline が存在することを検証。

1. diff が新しい `cmd/` ディレクトリ、`main.go`、`bin/` entry point を追加するか check：
   ```bash
   git diff origin/<base> --name-only | grep -E '(cmd/.*/main\.go|bin/|Cargo\.toml|setup\.py|package\.json)' | head -5
   ```

2. 新 artifact が検出されたら、release workflow を check：
   ```bash
   ls .github/workflows/ 2>/dev/null | grep -iE 'release|publish|dist'
   grep -qE 'release|publish|deploy' .gitlab-ci.yml 2>/dev/null && echo "GITLAB_CI_RELEASE"
   ```

3. **release pipeline が無く、新 artifact が追加された場合:** AskUserQuestion で：
   - "This PR adds a new binary/tool but there's no CI/CD pipeline to build and publish it.
     Users won't be able to download the artifact after merge."
   - A) Add a release workflow now（CI/CD release pipeline — GitHub Actions または GitLab CI）
   - B) Defer — TODOS.md に追加
   - C) Not needed — internal/web-only、既存 deployment が cover する

4. **release pipeline が存在:** silent に continue。
5. **新 artifact が検出されない:** silent に skip。

---

## Step 3: base branch を merge（test の前）

base branch を feature branch に fetch + merge し、test が merged state に対して走るようにする：

```bash
git fetch origin <base> && git merge origin/<base> --no-edit
```

**merge conflict がある場合:** simple なら（VERSION、schema.rb、CHANGELOG ordering）auto-resolve を試みる。Conflict が複雑または ambiguous なら、**STOP** して表示。

**Already up to date:** silent に continue。

---

## Step 4: Test Framework Bootstrap



---

## Step 5: test 実行（merged code に対して）

**`RAILS_ENV=test bin/rails db:migrate` を実行しない** — `bin/test-lane` が内部で
`db:test:prepare` を call し、schema を正しい lane database にロードする。
INSTANCE 無しで bare な test migration を走らせると orphan DB を hit し structure.sql を corrupt する。

両方の test suite を並列で実行：

```bash
bin/test-lane 2>&1 | tee /tmp/ship_tests.txt &
npm run test 2>&1 | tee /tmp/ship_vitest.txt &
wait
```

両方完了後、output file を読み pass/fail を check。

**任意の test が fail:** 直ちに stop しない。Test Failure Ownership Triage を適用：



**triage 後:** in-branch failure が unfixed で残っていれば、**STOP**。進まない。Pre-existing failure が全て handled（fixed、TODOed、assigned、skipped）なら、Step 6 に continue。

**全 pass:** silent に continue — count を簡潔に note。

---

## Step 6: Eval Suites（conditional）

prompt 関連 file が変わった場合 evals は必須。Diff に prompt file が無ければ本 step を完全 skip。

**1. diff が prompt 関連 file に触れているか check:**

```bash
git diff origin/<base> --name-only
```

以下の pattern と match（CLAUDE.md 由来）：
- `app/services/*_prompt_builder.rb`
- `app/services/*_generation_service.rb`、`*_writer_service.rb`、`*_designer_service.rb`
- `app/services/*_evaluator.rb`、`*_scorer.rb`、`*_classifier_service.rb`、`*_analyzer.rb`
- `app/services/concerns/*voice*.rb`、`*writing*.rb`、`*prompt*.rb`、`*token*.rb`
- `app/services/chat_tools/*.rb`、`app/services/x_thread_tools/*.rb`
- `config/system_prompts/*.txt`
- `test/evals/**/*`（eval infrastructure 変更は全 suite に影響）

**match 無し:** Print「No prompt-related files changed — skipping evals.」 で Step 9 に continue。

**2. 影響を受ける eval suite を特定:**

各 eval runner（`test/evals/*_eval_runner.rb`）は `PROMPT_SOURCE_FILES` を declare し、影響する source file を list する。Grep でどの suite が変更 file に match するか見つける：

```bash
grep -l "changed_file_basename" test/evals/*_eval_runner.rb
```

Runner → test file をマップ：`post_generation_eval_runner.rb` → `post_generation_eval_test.rb`。

**特殊 case:**
- `test/evals/judges/*.rb`、`test/evals/support/*.rb`、`test/evals/fixtures/` への変更は、それらの judge/support file を使う **全 suite** に影響。Eval test file の import を check し、どれか決定。
- `config/system_prompts/*.txt` への変更 — eval runner で prompt filename を grep し影響 suite を見つける。
- どの suite が影響を受けるか不明なら、影響しうる **全 suite** を実行。Over-testing は regression を見逃すより良い。

**3. `EVAL_JUDGE_TIER=full` で影響 suite を実行:**

`/ship` は pre-merge gate なので、常に full tier（Sonnet structural + Opus persona judges）を使用。

```bash
EVAL_JUDGE_TIER=full EVAL_VERBOSE=1 bin/test-lane --eval test/evals/<suite>_eval_test.rb 2>&1 | tee /tmp/ship_evals.txt
```

複数 suite を実行する必要があれば sequential に（各 suite は test lane が必要）。最初の suite が fail したら直ちに stop — 残り suite に API cost を burn しない。

**4. 結果を check:**

- **任意の eval が fail:** failure、cost dashboard を表示し **STOP**。進まない。
- **全 pass:** Pass count と cost を note。Step 9 に continue。

**5. eval 出力を保存** — eval 結果と cost dashboard を PR body に含める（Step 19）。

**Tier reference（context 用 — /ship は常に `full` を使用）:**
| Tier | When | Speed (cached) | Cost |
|------|------|----------------|------|
| `fast` (Haiku) | Dev iteration、smoke tests | ~5s (14x faster) | ~$0.07/run |
| `standard` (Sonnet) | Default dev、`bin/test-lane --eval` | ~17s (4x faster) | ~$0.37/run |
| `full` (Opus persona) | **`/ship` and pre-merge** | ~72s (baseline) | ~$1.27/run |

---

## Step 7: Test Coverage Audit

**本 step を subagent として dispatch** — Agent tool で `subagent_type: "general-purpose"`。Subagent は fresh context window で coverage audit を実行 — 親は intermediate file read を見ず、結論のみ受け取る。これが context-rot defense。

**Subagent prompt:** 以下の指示を subagent に渡す（`<base>` は base branch に置換）：

> You are running a ship-workflow test coverage audit. `git diff <base>...HEAD` を必要に応じて実行。Commit や push はしない — report のみ。
>
> 
>
> 分析後、response の **最終行** に単一 JSON object を出力（その後にテキストなし）：
> `{"coverage_pct":N,"gaps":N,"diagram":"<full markdown coverage diagram for PR body>","tests_added":["path",...]}`

**Parent processing:**

1. Subagent の最終 output を読む。最終行を JSON として parse。
2. `coverage_pct`（Step 20 metric 用）、`gaps`（user summary）、`tests_added`（commit 用）を保存。
3. `diagram` を PR body の `## Test Coverage` section に verbatim で embed（Step 19）。
4. 1 行 summary を print：`Coverage: {coverage_pct}%, {gaps} gaps. {tests_added.length} tests added.`

**Subagent が fail / timeout / 不正 JSON を返す:** 親で audit を inline 実行に fall back。Subagent failure で /ship を block しない — partial result の方が無いより良い。

---

## Step 8: Plan Completion Audit

**本 step を subagent として dispatch** — Agent tool で `subagent_type: "general-purpose"`。Subagent は plan file と参照される全コード file を fresh context で読む。親は結論のみ受け取る。

**Subagent prompt:** 以下を subagent に渡す：

> You are running a ship-workflow plan completion audit. The base branch is `<base>`. `git diff <base>...HEAD` で何が ship されたか確認。Commit や push はしない — report のみ。
>
> 
>
> 分析後、response の **最終行** に単一 JSON object を出力：
> `{"total_items":N,"done":N,"changed":N,"deferred":N,"summary":"<markdown checklist for PR body>"}`

**Parent processing:**

1. Subagent output の最終行を JSON として parse。
2. `done`、`deferred` を Step 20 metric 用に保存；`summary` を PR body で使用。
3. `deferred > 0` で user override が無ければ、AskUserQuestion で deferred items を提示してから continue。
4. `summary` を PR body の `## Plan Completion` section に embed（Step 19）。

**Subagent が fail / 不正 JSON 返す:** 親で audit を inline 実行に fall back。Subagent failure で /ship を block しない。

---







---

## Step 9: Pre-Landing Review

test では catch されない構造的 issue について diff を review。

1. `.claude/skills/review/checklist.md` を読む。File が読めなければ **STOP** して error 報告。

2. `git diff origin/<base>` を実行し full diff（freshly-fetched base branch に対する feature 変更）を取得。

3. checklist を 2 pass で適用：
   - **Pass 1（CRITICAL）:** SQL & Data Safety、LLM Output Trust Boundary
   - **Pass 2（INFORMATIONAL）:** 残り全カテゴリ





   Design findings は code review findings と並んで含める。下記の Fix-First flow に従う。





4. **checklist pass と specialist review（Step 9.1-9.2）の各 finding を AUTO-FIX または ASK に分類** — checklist.md の Fix-First Heuristic に従う。Critical は ASK 寄り、informational は AUTO-FIX 寄り。

5. **全 AUTO-FIX item を auto-fix。** 各 fix を適用。各 fix に 1 行出力：
   `[AUTO-FIXED] [file:line] Problem → 何をしたか`

6. **ASK item が残っていれば、** 1 つの AskUserQuestion で提示：
   - 各々を番号、severity、問題、推奨 fix と共に list
   - 各項目の選択肢：A) Fix、B) Skip
   - 全体の RECOMMENDATION
   - ASK item が 3 件以下なら、batch ではなく個別 AskUserQuestion call も可

7. **全 fix（auto + user-approved）後:**
   - **任意の fix が適用された場合:** fixed file を name で commit（`git add <fixed-files> && git commit -m "fix: pre-landing review fixes"`）し、**STOP** して user に `/ship` を再実行するよう伝える（re-test 用）。
   - **fix 無し（全 ASK item skip、または issue 無し）:** Step 12 に continue。

8. summary を出力：`Pre-Landing Review: N issues — M auto-fixed, K asked (J fixed, L skipped)`

   issue 無しなら：`Pre-Landing Review: No issues found.`

9. Review 結果を review log に永続化：
```bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"review","timestamp":"TIMESTAMP","status":"STATUS","issues_found":N,"critical":N,"informational":N,"quality_score":SCORE,"specialists":SPECIALISTS_JSON,"findings":FINDINGS_JSON,"commit":"'"$(git rev-parse --short HEAD)"'","via":"ship"}'
```
置換：TIMESTAMP（ISO 8601）、STATUS（issue 無しなら "clean"、それ以外は "issues_found"）、上の summary の N 値。`via:"ship"` は standalone `/review` と区別。
- `quality_score` = Step 9.2 で計算した PR Quality Score（例：7.5）。Specialists が skip された場合（小 diff）は `10.0`
- `specialists` = Step 9.2 で compile した per-specialist stats object。考慮された各 specialist は entry を得る：dispatched なら `{"dispatched":true/false,"findings":N,"critical":N,"informational":N}`、skip された場合は `{"dispatched":false,"reason":"scope|gated"}`。例：`{"testing":{"dispatched":true,"findings":2,"critical":0,"informational":2},"security":{"dispatched":false,"reason":"scope"}}`
- `findings` = per-finding records 配列。各 finding（checklist pass + specialists から）：`{"fingerprint":"path:line:category","severity":"CRITICAL|INFORMATIONAL","action":"ACTION"}`。ACTION は `"auto-fixed"`、`"fixed"`（user 承認）、`"skipped"`（user が Skip 選択）。

review output を保存 — Step 19 で PR body に入る。

---

## Step 10: Greptile review コメント対応（PR 存在時）

**fetch + classification を subagent として dispatch** — Agent tool で `subagent_type: "general-purpose"`。Subagent は全 Greptile コメントを pull、escalation detection algorithm を実行、各コメントを classify。親は structured list を受け取り user interaction + file edit を handle。

**Subagent prompt:**

> You are classifying Greptile review comments for a /ship workflow. `.claude/skills/review/greptile-triage.md` を読み、fetch / filter / classify / **escalation detection** step に従う。コードを fix しない、コメントに reply しない、commit しない — report のみ。
>
> 各コメントに割り当てる：`classification`（`valid_actionable`、`already_fixed`、`false_positive`、`suppressed`）、`escalation_tier`（1 または 2）、file:line または [top-level] tag、body summary、permalink URL。
>
> PR が無い、`gh` 失敗、API error、コメントゼロなら、`{"total":0,"comments":[]}` を出力して停止。
>
> それ以外、response の最終行に単一 JSON object：
> `{"total":N,"comments":[{"classification":"...","escalation_tier":N,"ref":"file:line","summary":"...","permalink":"url"},...]}`

**Parent processing:**

最終行を JSON として parse。

`total` が 0 なら、本 step を silent skip。Step 12 に continue。

それ以外、print：`+ {total} Greptile comments ({valid_actionable} valid, {already_fixed} already fixed, {false_positive} FP)`。

`comments` の各コメントについて：

**VALID & ACTIONABLE:** AskUserQuestion で：
- コメント（file:line または [top-level] + body summary + permalink URL）
- `RECOMMENDATION: Choose A because [one-line reason]`
- 選択肢：A) Fix now、B) Acknowledge and ship anyway、C) It's a false positive
- A 選択：fix を適用、fixed file を commit（`git add <fixed-files> && git commit -m "fix: address Greptile review — <brief description>"`）、greptile-triage.md の **Fix reply template** で reply（inline diff + 説明）、per-project と global greptile-history（type: fix）に保存。
- C 選択：greptile-triage.md の **False Positive reply template** で reply（証拠 + 推奨 re-rank）、per-project と global greptile-history（type: fp）に保存。

**VALID BUT ALREADY FIXED:** greptile-triage.md の **Already Fixed reply template** で reply — AskUserQuestion 不要：
- 何をしたか + fixing commit SHA を含める
- per-project と global greptile-history（type: already-fixed）に保存

**FALSE POSITIVE:** AskUserQuestion で：
- コメントとなぜ間違いと思うかを表示（file:line または [top-level] + body summary + permalink URL）
- 選択肢：
  - A) Reply to Greptile explaining the false positive（明らかに間違いなら推奨）
  - B) Fix it anyway（trivial なら）
  - C) Ignore silently
- A 選択：greptile-triage.md の **False Positive reply template** で reply（証拠 + 推奨 re-rank）、per-project と global greptile-history（type: fp）に保存

**SUPPRESSED:** silent skip — 過去 triage 由来の既知偽陽性。

**全コメント解決後:** 任意の fix を適用したら、Step 5 の test は stale。Step 12 に continue する前に **test を re-run**（Step 5）。Fix 無しなら Step 12 に continue。

---







## Step 12: Version bump（auto-decide）

**Idempotency check:** Bump 前に、`VERSION` を base branch および `package.json` の `version` field と比較して state を分類。4 状態：FRESH（do bump）、ALREADY_BUMPED（skip bump）、DRIFT_STALE_PKG（pkg sync のみ、re-bump なし）、DRIFT_UNEXPECTED（停止して ask）。

```bash
BASE_VERSION=$(git show origin/<base>:VERSION 2>/dev/null | tr -d '\r\n[:space:]' || echo "0.0.0.0")
CURRENT_VERSION=$(cat VERSION 2>/dev/null | tr -d '\r\n[:space:]' || echo "0.0.0.0")
[ -z "$BASE_VERSION" ] && BASE_VERSION="0.0.0.0"
[ -z "$CURRENT_VERSION" ] && CURRENT_VERSION="0.0.0.0"
PKG_VERSION=""
PKG_EXISTS=0
if [ -f package.json ]; then
  PKG_EXISTS=1
  if command -v node >/dev/null 2>&1; then
    PKG_VERSION=$(node -e 'const p=require("./package.json");process.stdout.write(p.version||"")' 2>/dev/null)
    PARSE_EXIT=$?
  elif command -v bun >/dev/null 2>&1; then
    PKG_VERSION=$(bun -e 'const p=require("./package.json");process.stdout.write(p.version||"")' 2>/dev/null)
    PARSE_EXIT=$?
  else
    echo "ERROR: package.json exists but neither node nor bun is available. Install one and re-run."
    exit 1
  fi
  if [ "$PARSE_EXIT" != "0" ]; then
    echo "ERROR: package.json is not valid JSON. Fix the file before re-running /ship."
    exit 1
  fi
fi
echo "BASE: $BASE_VERSION  VERSION: $CURRENT_VERSION  package.json: ${PKG_VERSION:-<none>}"

if [ "$CURRENT_VERSION" = "$BASE_VERSION" ]; then
  if [ "$PKG_EXISTS" = "1" ] && [ -n "$PKG_VERSION" ] && [ "$PKG_VERSION" != "$CURRENT_VERSION" ]; then
    echo "STATE: DRIFT_UNEXPECTED"
    echo "package.json version ($PKG_VERSION) disagrees with VERSION ($CURRENT_VERSION) while VERSION matches base."
    echo "This looks like a manual edit to package.json bypassing /ship. Reconcile manually, then re-run."
    exit 1
  fi
  echo "STATE: FRESH"
else
  if [ "$PKG_EXISTS" = "1" ] && [ -n "$PKG_VERSION" ] && [ "$PKG_VERSION" != "$CURRENT_VERSION" ]; then
    echo "STATE: DRIFT_STALE_PKG"
  else
    echo "STATE: ALREADY_BUMPED"
  fi
fi
```

`STATE:` 行を読み dispatch：

- **FRESH** → 下記 bump action（step 1-4）に進む。
- **ALREADY_BUMPED** → default で bump を skip、ただし queue drift を先に check：`bin/uzustack-next-version` を implied bump level（`CURRENT_VERSION` vs `BASE_VERSION` から derive）で call、`.version` を `CURRENT_VERSION` と比較。異なれば（前回 ship 以降に queue が動いた）、**AskUserQuestion**：「VERSION drift detected: you claim v<CURRENT> but next available is v<NEW> (queue moved). A) Rebump to v<NEW> and rewrite CHANGELOG header + PR title (recommended), B) Keep v<CURRENT> — will be rejected by CI version-gate until resolved.」 A なら FRESH として `NEW_VERSION=<new>` で step 1-4 を実行（Step 13 CHANGELOG header rewrite + Step 19 PR title rewrite も trigger）。B なら `CURRENT_VERSION` を再利用、CI が reject する可能性を warn。Util が offline なら warn して `CURRENT_VERSION` を再利用。
- **DRIFT_STALE_PKG** → 過去の `/ship` が `VERSION` を bump したが `package.json` を update しなかった。下記 sync-only repair block を実行（step 4 後）。Re-bump しない。CHANGELOG と PR body は `CURRENT_VERSION` を再利用。（Repair 後 Queue check は ALREADY_BUMPED 用語で実行。）
- **DRIFT_UNEXPECTED** → `/ship` 停止（exit 1）。Manual で解決；どの file が authoritative か /ship は判定できない。

1. 現 `VERSION` file を読む（4-digit format：`MAJOR.MINOR.PATCH.MICRO`）

2. **Bump level を diff から auto-decide:**
   - 変更行数を数える（`git diff origin/<base>...HEAD --stat | tail -1`）
   - feature signal を check：新 route/page file（例：`app/*/page.tsx`、`pages/*.ts`）、新 DB migration/schema file、新 source file 隣の新 test file、または `feat/` で始まる branch 名
   - **MICRO**（4 桁目）: < 50 行変更、些細な調整、typo、config
   - **PATCH**（3 桁目）: 50+ 行変更、feature signal 検出無し
   - **MINOR**（2 桁目）: feature signal が **任意** 検出された、または 500+ 行変更、または 新 module/package 追加 — **user に ASK**
   - **MAJOR**（1 桁目）: **user に ASK** — milestone または破壊的変更のみ

   選択した level を `BUMP_LEVEL`（`major`、`minor`、`patch`、`micro` のいずれか）として保存。これは user 意図 level。次 step は *placement* を決定 — queue-aware allocation が claimed slot を pass する場合も level は変わらない。

3. **Queue-aware version pick（workspace-aware ship、v1.6.4.0+）:** `bin/uzustack-next-version` を call し、open PR + active sibling Conductor worktree が claim 済のものを見て、queue state を user に render：

   ```bash
   QUEUE_JSON=$(bun run bin/uzustack-next-version \
     --base <base> \
     --bump "$BUMP_LEVEL" \
     --current-version "$BASE_VERSION" 2>/dev/null || echo '{"offline":true}')
   NEW_VERSION=$(echo "$QUEUE_JSON" | jq -r '.version // empty')
   CLAIMED_COUNT=$(echo "$QUEUE_JSON" | jq -r '.claimed | length')
   ACTIVE_SIBLING_COUNT=$(echo "$QUEUE_JSON" | jq -r '.active_siblings | length')
   OFFLINE=$(echo "$QUEUE_JSON" | jq -r '.offline // false')
   REASON=$(echo "$QUEUE_JSON" | jq -r '.reason // ""')
   ```

   - `OFFLINE=true` または util fail（auth 切れ、`gh`/`glab` 無し、network）：local の `BUMP_LEVEL` 算術に fallback（選択 level で `BASE_VERSION` を bump）。`⚠ workspace-aware ship offline — using local bump only` を print。Continue。
   - `CLAIMED_COUNT > 0` の場合：queue table を user に render し landing order を一目で見せる：
     ```
     Queue on <base> (vBASE_VERSION):
       #<pr> <branch> → v<version>   [⚠ collision with #<other>]
     Active sibling workspaces (WIP, not yet PR'd):
       <path> → v<version> (committed Nh ago)
     Your branch will claim: vNEW_VERSION  (<reason>)
     ```
   - `ACTIVE_SIBLING_COUNT > 0` で任意の active sibling の VERSION が `>= NEW_VERSION` なら、**AskUserQuestion**：「Sibling workspace <path> has v<X> committed <N>h ago but hasn't PR'd yet. Wait for them to ship first, or advance past? A) Advance past (recommended for unrelated work), B) Abort /ship and sync up with sibling first.」
   - `NEW_VERSION` が `MAJOR.MINOR.PATCH.MICRO` に match するか validate。Util が空または malformed version を返したら、local bump に fallback。

4. `NEW_VERSION` を **validate** し、**両方** の `VERSION` と `package.json` に書く。本 block は `STATE: FRESH` のときのみ実行。

```bash
if ! printf '%s' "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "ERROR: NEW_VERSION ($NEW_VERSION) does not match MAJOR.MINOR.PATCH.MICRO pattern. Aborting."
  exit 1
fi
echo "$NEW_VERSION" > VERSION
if [ -f package.json ]; then
  if command -v node >/dev/null 2>&1; then
    node -e 'const fs=require("fs"),p=require("./package.json");p.version=process.argv[1];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")' "$NEW_VERSION" || {
      echo "ERROR: failed to update package.json. VERSION was written but package.json is now stale. Fix and re-run — the new idempotency check will detect the drift."
      exit 1
    }
  elif command -v bun >/dev/null 2>&1; then
    bun -e 'const fs=require("fs"),p=require("./package.json");p.version=process.argv[1];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")' "$NEW_VERSION" || {
      echo "ERROR: failed to update package.json. VERSION was written but package.json is now stale."
      exit 1
    }
  else
    echo "ERROR: package.json exists but neither node nor bun is available."
    exit 1
  fi
fi
```

**DRIFT_STALE_PKG repair path** — idempotency が `STATE: DRIFT_STALE_PKG` を report した場合に走る。Re-bump しない；`package.json.version` を現 `VERSION` に sync して continue。CHANGELOG と PR body は `CURRENT_VERSION` を再利用。

```bash
REPAIR_VERSION=$(cat VERSION | tr -d '\r\n[:space:]')
if ! printf '%s' "$REPAIR_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "ERROR: VERSION file contents ($REPAIR_VERSION) do not match MAJOR.MINOR.PATCH.MICRO pattern. Refusing to propagate invalid semver into package.json. Fix VERSION manually, then re-run /ship."
  exit 1
fi
if command -v node >/dev/null 2>&1; then
  node -e 'const fs=require("fs"),p=require("./package.json");p.version=process.argv[1];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")' "$REPAIR_VERSION" || {
    echo "ERROR: drift repair failed — could not update package.json."
    exit 1
  }
else
  bun -e 'const fs=require("fs"),p=require("./package.json");p.version=process.argv[1];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")' "$REPAIR_VERSION" || {
    echo "ERROR: drift repair failed."
    exit 1
  }
fi
echo "Drift repaired: package.json synced to $REPAIR_VERSION. No version bump performed."
```

---



---

## Step 14: TODOS.md（auto-update）

ship される変更に対して project の TODOS.md を cross-reference。完了 item を自動 mark；file が無い、または disorganized な場合のみ prompt。

canonical な format reference は `.claude/skills/review/TODOS-format.md` を読む。

**1. TODOS.md がリポジトリ root に存在するか check。**

**TODOS.md が無い場合:** AskUserQuestion で：
- Message：「uzustack recommends maintaining a TODOS.md organized by skill/component, then priority (P0 at top through P4, then Completed at bottom). See TODOS-format.md for the full format. Would you like to create one?」
- 選択肢：A) 今作成、B) Skip
- A 選択：`TODOS.md` を skeleton で作成（# TODOS heading + ## Completed section）。Step 3 へ continue。
- B 選択：Step 14 残りを skip。Step 15 へ continue。

**2. structure と organization を check:**

TODOS.md を読み推奨構造に従っているか確認：
- Items が `## <Skill/Component>` heading 配下に grouped
- 各 item が `**Priority:**` field（P0-P4 値）を持つ
- 底に `## Completed` section

**Disorganized な場合**（priority field 欠落、component grouping 無し、Completed section 無し）: AskUserQuestion で：
- Message：「TODOS.md doesn't follow the recommended structure (skill/component groupings, P0-P4 priority, Completed section). Would you like to reorganize it?」
- 選択肢：A) 今 reorganize（推奨）、B) leave as-is
- A 選択：TODOS-format.md に従って in-place で reorganize。全 content を保持 — restructure のみ、決して delete しない。
- B 選択：Restructure せず Step 3 へ continue。

**3. 完了 TODO を検出:**

本 step は完全自動 — user interaction 無し。

earlier step で gather 済の diff と commit 履歴を使う：
- `git diff <base>...HEAD`（base branch に対する full diff）
- `git log <base>..HEAD --oneline`（ship される全 commit）

各 TODO item について、本 PR の変更がそれを完了するか check：
- Commit message を TODO title / description と match
- TODO で参照される file が diff に現れるか check
- TODO の記述された作業が機能変更と match するか check

**Conservative に:** Diff に明確な証拠がある場合のみ完了と mark。不明確なら触らない。

**4. 完了 item を底の `## Completed` section に move。** Append：`**Completed:** vX.Y.Z (YYYY-MM-DD)`

**5. summary 出力:**
- `TODOS.md: N items marked complete (item1, item2, ...). M items remaining.`
- または：`TODOS.md: No completed items detected. M items remaining.`
- または：`TODOS.md: Created.` / `TODOS.md: Reorganized.`

**6. Defensive:** TODOS.md が書けない（permission error、disk full）なら、user に warn して continue。TODOS failure で ship workflow を決して停止しない。

本 summary を保存 — Step 19 で PR body に入る。

---

## Step 15: Commit（bisectable chunks）

### Step 15.0: WIP Commit Squash（continuous checkpoint mode のみ）

`CHECKPOINT_MODE` が `"continuous"` なら、branch には auto-checkpoint からの `WIP:` commit が含まれる。これらは Step 15.1 の bisectable-grouping logic が走る前に対応する logical commit に squash しなければならない。Branch 上の non-WIP commit（earlier landed work）は preserve。

**Detection:**
```bash
WIP_COUNT=$(git log <base>..HEAD --oneline --grep="^WIP:" 2>/dev/null | wc -l | tr -d ' ')
echo "WIP_COMMITS: $WIP_COUNT"
```

`WIP_COUNT` が 0 なら：本 sub-step を完全 skip。

`WIP_COUNT` > 0 なら、squash で生き残るよう WIP context を先に collect：

```bash
# 本 branch の全 WIP commit から [uzustack-context] block を export。
# 本 file は CHANGELOG entry の入力となり、PR body context にも inform 可能。
mkdir -p "$(git rev-parse --show-toplevel)/.uzustack"
git log <base>..HEAD --grep="^WIP:" --format="%H%n%B%n---END---" > \
  "$(git rev-parse --show-toplevel)/.uzustack/wip-context-before-squash.md" 2>/dev/null || true
```

**Non-destructive squash strategy:**

`git reset --soft <merge-base>` は non-WIP commit も含めて全て uncommit してしまう。
これをしない。代わりに WIP commit のみ filter する `git rebase` scope を使う。

Option 1（preferred、non-WIP commit が混在する場合）:
```bash
# Automated WIP squashing 付き Interactive rebase。
# 各 WIP commit を 'fixup' と mark（message を drop、変更を prior commit に fold）。
git rebase -i $(git merge-base HEAD origin/<base>) \
  --exec 'true' \
  -X ours 2>/dev/null || {
    echo "Rebase conflict. Aborting: git rebase --abort"
    git rebase --abort
    echo "STATUS: BLOCKED — manual WIP squash required"
    exit 1
  }
```

Option 2（simpler、branch が今のところ ALL WIP commit — landed work 無し）:
```bash
# Branch が WIP commit のみ。non-WIP の preserve 不要なので reset-soft が安全。
# 先に verify。
NON_WIP=$(git log <base>..HEAD --oneline --invert-grep --grep="^WIP:" 2>/dev/null | wc -l | tr -d ' ')
if [ "$NON_WIP" -eq 0 ]; then
  git reset --soft $(git merge-base HEAD origin/<base>)
  echo "WIP-only branch, reset-soft to merge base. Step 15.1 will create clean commits."
fi
```

Runtime にどちらの option が適用されるか決定。不明なら、non-WIP commit を破壊するより AskUserQuestion で停止して ask する方を prefer。

**Anti-footgun rules:**
- Non-WIP commit がある状態での盲目的な `git reset --soft` は **絶対しない**。Codex は
  これを destructive と flag — real な landed work を uncommit し、push step を
  既に push 済の人に対する non-fast-forward push に変える。
- Step 15.1 へ進むのは WIP commit が成功裏に squash/absorb された後、
  または branch が WIP work のみと verify された後のみ。

### Step 15.1: Bisectable Commits

**Goal:** `git bisect` でうまく動き、LLM が変更内容を理解できる小さく logical な commit を作る。

1. Diff を分析し、変更を logical commit に group。各 commit は **1 つの coherent な変更** を表す — 1 file ではなく、1 logical unit。

2. **Commit ordering**（earlier 先）:
   - **Infrastructure:** migration、config 変更、route 追加
   - **Models & services:** 新 model、service、concern（test と一緒）
   - **Controllers & views:** controller、view、JS/React component（test と一緒）
   - **VERSION + CHANGELOG + TODOS.md:** 常に最終 commit

3. **Splitting rules:**
   - Model と test file は同 commit
   - Service と test file は同 commit
   - Controller、view、test は同 commit
   - Migration はそれ自身の commit（または support する model と group）
   - Config/route 変更はそれが enable する feature と group 可
   - Total diff が小さい（< 4 file 跨ぎ < 50 行）なら、単一 commit で OK

4. **各 commit は独立して valid** でなければならない — broken import 無し、まだ存在しないコードへの参照無し。Dependency が先に来るよう順序付ける。

5. 各 commit message を compose：
   - 1 行目：`<type>: <summary>`（type = feat/fix/chore/refactor/docs）
   - Body：本 commit の内容を短く description
   - **最終 commit のみ**（VERSION + CHANGELOG）が version tag と co-author trailer を得る：

```bash
git commit -m "$(cat <<'EOF'
chore: bump version and changelog (vX.Y.Z.W)


EOF
)"
```

---

## Step 16: Verification Gate

**IRON LAW: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

Push 前、Step 4-6 中にコードが変わっていれば re-verify：

1. **Test verification:** Step 5 の test 実行後にコードが変わったら（review findings の fix、CHANGELOG edit は count しない）、test suite を re-run。Fresh output を paste。Step 5 からの stale output は **不可**。

2. **Build verification:** Project に build step があれば実行。Output を paste。

3. **Rationalization prevention:**
   - 「Should work now」 → RUN IT。
   - 「I'm confident」 → Confidence は evidence ではない。
   - 「I already tested earlier」 → それ以降コードが変わった。再 test。
   - 「It's a trivial change」 → Trivial な変更が production を壊す。

**ここで test fail:** STOP。Push しない。Issue を fix し Step 5 へ戻る。

検証無しで作業完了を claim するのは効率ではなく不誠実。

---

## Step 17: Push

**Idempotency check:** Branch が push 済で up to date か check。

```bash
git fetch origin <branch-name> 2>/dev/null
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/<branch-name> 2>/dev/null || echo "none")
echo "LOCAL: $LOCAL  REMOTE: $REMOTE"
[ "$LOCAL" = "$REMOTE" ] && echo "ALREADY_PUSHED" || echo "PUSH_NEEDED"
```

`ALREADY_PUSHED` なら、push を skip して Step 18 へ continue。それ以外は upstream tracking 付きで push：

```bash
git push -u origin <branch-name>
```

**まだ完了していない。** コードは push されたが documentation sync と PR 作成が必須最終 step。Step 18 へ continue。

---

## Step 18: Documentation sync（subagent 経由、PR 作成前）

**/document-release を subagent として dispatch** — Agent tool で `subagent_type: "general-purpose"`。Subagent は fresh context window を得る — 先行 17 step からの rot ゼロ。**完全な** `/document-release` workflow（CHANGELOG clobber 保護、doc 除外、risky-change gate、named staging、race-safe PR body editing 付き）を、weaker reimplementation ではなく走らせる。

**Sequencing:** 本 step は Step 17（Push）の **AFTER**、Step 19（Create PR）の **BEFORE** に走る。PR は最終 HEAD から 1 度のみ作成、`## Documentation` section が initial body に既に baked。Create-then-re-edit dance 無し。

**Subagent prompt:**

> You are executing the /document-release workflow after a code push. Skill file `${HOME}/.claude/skills/uzustack/document-release/SKILL.md` を読み、その完全な workflow を end-to-end で実行（CHANGELOG clobber 保護、doc 除外、risky-change gate、named staging を含む）。PR body の edit を試みない — まだ PR 無し。Branch: `<branch>`、base: `<base>`。
>
> Workflow 完了後、response の **最終行** に単一 JSON object を出力（その後にテキスト無し）：
> `{"files_updated":["README.md","CLAUDE.md",...],"commit_sha":"abc1234","pushed":true,"documentation_section":"<markdown block for PR body's ## Documentation section>"}`
>
> Documentation file が update 不要なら、出力：
> `{"files_updated":[],"commit_sha":null,"pushed":false,"documentation_section":null}`

**Parent processing:**

1. Subagent output の最終行を JSON として parse。
2. `documentation_section` を保存 — Step 19 で PR body に embed（または null なら section を omit）。
3. `files_updated` が空でなければ、print：`Documentation synced: {files_updated.length} files updated, committed as {commit_sha}`。
4. `files_updated` が空なら、print：`Documentation is current — no updates needed.`

**Subagent が fail / 不正 JSON 返す:** 警告を print して `## Documentation` section 無しで Step 19 へ進む。Subagent failure で /ship を block しない。User は PR landing 後に `/document-release` を manual 実行可能。

---

## Step 19: PR/MR 作成

**Idempotency check:** 本 branch に PR/MR が既に存在するか check。

**GitHub の場合:**
```bash
gh pr view --json url,number,state -q 'if .state == "OPEN" then "PR #\(.number): \(.url)" else "NO_PR" end' 2>/dev/null || echo "NO_PR"
```

**GitLab の場合:**
```bash
glab mr view -F json 2>/dev/null | jq -r 'if .state == "opened" then "MR_EXISTS" else "NO_MR" end' 2>/dev/null || echo "NO_MR"
```

**open** PR/MR が既に存在：`gh pr edit --body "..."`（GitHub）または `glab mr update -d "..."`（GitLab）で PR body を **update**。本 run の fresh result（test output、coverage audit、review findings、adversarial review、TODOS summary、Step 18 からの documentation_section）から PR body を常に regenerate。過去 run からの stale PR body content を再利用しない。

**PR title も update** — version が rerun で変わった場合。PR title は workspace-aware format `v<NEW_VERSION> <type>: <summary>` を使う — version は **常に** 先頭。現 title の version prefix が `NEW_VERSION` と match しなければ、`gh pr edit --title "v$NEW_VERSION <type>: <summary>"` を実行（または `glab mr update -t ...` 等価）。これは Step 12 の queue-drift detection が stale version を rebump したときに title を truthful に保つ。Title に `v<X.Y.Z.W>` prefix 無し（custom title が意図的に保持された）なら、title はそのまま — format に既に従う title のみ書き換える。

既存 URL を print して Step 20 へ continue。

PR/MR が無ければ：Step 0 で検出した platform を使い pull request（GitHub）または merge request（GitLab）を作成。

PR/MR body は以下の section を含むべき：

```
## Summary
<ship される全変更を summarize。`git log <base>..HEAD --oneline` で全 commit を列挙。
VERSION/CHANGELOG metadata commit は除外（本 PR の bookkeeping、substantive 変更ではない）。
残り commit を logical section（例：「**Performance**」、「**Dead Code Removal**」、「**Infrastructure**」）に group。
全 substantive commit は最低 1 section に現れる必要がある。Commit の作業が summary に反映されない =
見落としている。>

## Test Coverage
<Step 7 の coverage diagram、または「All new code paths have test coverage.」>
<Step 7 が走った場合：「Tests: {before} → {after} (+{delta} new)」>

## Pre-Landing Review
<Step 9 の code review findings、または「No issues found.」>

## Design Review
<Design review が走った場合：「Design Review (lite): N findings — M auto-fixed, K skipped. AI Slop: clean/N issues.」>
<Frontend file 変更無し：「No frontend files changed — design review skipped.」>

## Eval Results
<Eval が走った場合：suite 名、pass/fail count、cost dashboard summary。Skip なら：「No prompt-related files changed — evals skipped.」>

## Greptile Review
<Greptile コメントが見つかった：bullet list、コメントごとに [FIXED] / [FALSE POSITIVE] / [ALREADY FIXED] tag + 1 行 summary>
<Greptile コメント無し：「No Greptile comments.」>
<Step 10 中 PR が無かった：本 section を完全 omit>

## Scope Drift
<Scope drift が走った：「Scope Check: CLEAN」または drift/creep findings list>
<Scope drift 無し：本 section を omit>

## Plan Completion
<Plan file 発見：Step 8 の completion checklist summary>
<Plan file 無し：「No plan file detected.」>
<Plan item deferred：deferred item を list>

## Verification Results
<Verification 実行：Step 8.1 の summary（N PASS, M FAIL, K SKIPPED）>
<Skip：理由（plan 無し、server 無し、verification section 無し）>
<Not applicable：本 section を omit>

## TODOS
<完了 mark された item：完了 item の bullet list（version 付き）>
<完了 item 無し：「No TODO items completed in this PR.」>
<TODOS.md 作成 / reorganize：それを note>
<TODOS.md 不在で user が skip：本 section を omit>

## Documentation
<Step 18 の subagent が返した `documentation_section` 文字列を verbatim に embed。>
<Step 18 が `documentation_section: null`（doc update 無し）を返した：本 section を完全 omit。>

## Test plan
- [x] All Rails tests pass (N runs, 0 failures)
- [x] All Vitest tests pass (N tests)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**GitHub の場合:**

```bash
gh pr create --base <base> --title "v$NEW_VERSION <type>: <summary>" --body "$(cat <<'EOF'
<上の PR body>
EOF
)"
```

**GitLab の場合:**

```bash
glab mr create -b <base> -t "v$NEW_VERSION <type>: <summary>" -d "$(cat <<'EOF'
<上の MR body>
EOF
)"
```

**いずれの CLI も利用不可:**
Branch 名、remote URL を print して、user に web UI で PR/MR を manual 作成するよう指示。停止しない — コードは push 済で ready。

**PR/MR URL を出力** — Step 20 へ進む。

---

## Step 20: Ship metric を永続化

`/retro` が trend を track できるよう、coverage と plan completion data を log：

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
```

`~/.uzustack/projects/$SLUG/$BRANCH-reviews.jsonl` に append：

```bash
echo '{"skill":"ship","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","coverage_pct":COVERAGE_PCT,"plan_items_total":PLAN_TOTAL,"plan_items_done":PLAN_DONE,"verification_result":"VERIFY_RESULT","version":"VERSION","branch":"BRANCH"}' >> ~/.uzustack/projects/$SLUG/$BRANCH-reviews.jsonl
```

earlier step から置換：
- **COVERAGE_PCT**: Step 7 diagram の coverage percentage（integer、または undetermined なら -1）
- **PLAN_TOTAL**: Step 8 で抽出した total plan item（plan file 無しなら 0）
- **PLAN_DONE**: Step 8 の DONE + CHANGED 件数（plan file 無しなら 0）
- **VERIFY_RESULT**: Step 8.1 の "pass"、"fail"、"skipped"
- **VERSION**: VERSION file から
- **BRANCH**: 現 branch 名

本 step は automatic — 決して skip しない、確認も求めない。

---

## Important Rules

- **Test を決して skip しない。** Test が fail したら停止。
- **Pre-landing review を決して skip しない。** checklist.md が読めなければ停止。
- **Force push しない。** 通常の `git push` のみ使用。
- **Trivial な確認を求めない**（例：「ready to push?」、「create PR?」）。停止する場面：version bump（MINOR/MAJOR）、pre-landing review findings（ASK item）、Codex structured review [P1] findings（large diff のみ）。
- **VERSION file の 4-digit version format を常に使用。**
- **CHANGELOG の date 形式:** `YYYY-MM-DD`
- **Bisectability のため commit を split** — 各 commit = 1 logical change。
- **TODOS.md 完了検出は conservative に。** Diff が明確に作業完了を示す場合のみ完了 mark。
- **Greptile reply template を greptile-triage.md から使う。** 全 reply は証拠（inline diff、code references、re-rank suggestion）を含む。曖昧な reply は決して post しない。
- **Fresh verification evidence 無しに push しない。** Step 5 test 後にコードが変わったら、push 前に re-run。
- **Step 7 が coverage test を生成する。** Commit 前に pass しなければならない。Failing test を決して commit しない。
- **目標は：user が `/ship` と言ったら、次に見るのは review + PR URL + auto-synced docs。**
