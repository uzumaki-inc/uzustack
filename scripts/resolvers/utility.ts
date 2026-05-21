/**
 * Utility resolvers — single-line bash helpers + 中規模 markdown narrative。
 *
 * PR-D2 で upstream gstack の utility.ts 全体を port (8 placeholder)。
 * - generateSlugEval / generateSlugSetup: bin path 機械置換のみ
 * - generateBaseBranchDetect / generateDeployBootstrap / generateChangelogWorkflow: bash + 日本語 narrative
 * - generateQAMethodology: 280 行クラスの methodology doc を全体日本語化
 * - generateCoAuthorTrailer: host config から取得 (機械置換)
 *
 * voice 方針 (PR-D1 で確立): bash code 内 comment は英語維持、
 * 関数返り値の Claude 向け narrative (markdown) は日本語化。
 */

import type { TemplateContext } from './types';

/**
 * `eval "$(uzustack-slug)"` で SLUG / BRANCH を export する single-line bash を返す。
 * mkdir はしない (mkdir も含む版は generateSlugSetup を使う)。
 */
export function generateSlugEval(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/uzustack-slug 2>/dev/null)"`;
}

/**
 * `eval "$(uzustack-slug)"` で SLUG / BRANCH を export し、
 * `~/.uzustack/projects/$SLUG/` を mkdir する single-line bash を返す。
 *
 * checkpoint 系 skill (context-save / context-restore) や
 * Phase 4+ で導入される learnings / gbrain 系 skill が共通で使う。
 */
export function generateSlugSetup(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG`;
}

/**
 * Step 0: platform + base branch 検出の bash + 説明 narrative。
 *
 * GitHub / GitLab / git-native の 3 段 fallback で
 * 当該 PR/MR の base branch、 または default branch を検出する。
 * ship / land-and-deploy / review 系 skill が共通の Step 0 として使う。
 */
export function generateBaseBranchDetect(_ctx: TemplateContext): string {
  return `## Step 0: platform と base branch を検出

まず git remote URL から git hosting platform を判別する：

\`\`\`bash
git remote get-url origin 2>/dev/null
\`\`\`

- URL に "github.com" が含まれる → platform は **GitHub**
- URL に "gitlab" が含まれる → platform は **GitLab**
- それ以外: CLI 利用可否を確認：
  - \`gh auth status 2>/dev/null\` 成功 → platform は **GitHub** (GitHub Enterprise も含む)
  - \`glab auth status 2>/dev/null\` 成功 → platform は **GitLab** (self-hosted も含む)
  - どちらも不可 → **unknown** (git ネイティブコマンドのみ使用)

この PR/MR が target する branch、または PR/MR が無ければ repo の default branch を判定する。
結果を以降の全 step で "the base branch" として使う。

**GitHub の場合:**
1. \`gh pr view --json baseRefName -q .baseRefName\` — 成功すればそれを使う
2. \`gh repo view --json defaultBranchRef -q .defaultBranchRef.name\` — 成功すればそれを使う

**GitLab の場合:**
1. \`glab mr view -F json 2>/dev/null\` を実行して \`target_branch\` field を抽出 — 成功すればそれを使う
2. \`glab repo view -F json 2>/dev/null\` を実行して \`default_branch\` field を抽出 — 成功すればそれを使う

**Git ネイティブ fallback (platform が unknown、または CLI が失敗した場合):**
1. \`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'\`
2. それが失敗: \`git rev-parse --verify origin/main 2>/dev/null\` → \`main\` を使う
3. それが失敗: \`git rev-parse --verify origin/master 2>/dev/null\` → \`master\` を使う

全て失敗したら \`main\` に fallback する。

検出された base branch 名を print する。 以降の \`git diff\` / \`git log\` /
\`git fetch\` / \`git merge\` および PR/MR 作成コマンドでは、 指示文中の
"the base branch" や \`<default>\` を検出した branch 名に置換して使う。

---`;
}

/**
 * Deploy platform + production URL の bootstrap 検出 bash + 説明。
 *
 * CLAUDE.md の "## Deploy Configuration" section を先に読み、 無ければ
 * fly.toml / render.yaml / vercel.json 等の config file から auto-detect。
 * land-and-deploy / canary 系 skill が共通で使う。
 */
export function generateDeployBootstrap(_ctx: TemplateContext): string {
  return `\`\`\`bash
# Check for persisted deploy config in CLAUDE.md
DEPLOY_CONFIG=$(grep -A 20 "## Deploy Configuration" CLAUDE.md 2>/dev/null || echo "NO_CONFIG")
echo "$DEPLOY_CONFIG"

# If config exists, parse it
if [ "$DEPLOY_CONFIG" != "NO_CONFIG" ]; then
  PROD_URL=$(echo "$DEPLOY_CONFIG" | grep -i "production.*url" | head -1 | sed 's/.*: *//')
  PLATFORM=$(echo "$DEPLOY_CONFIG" | grep -i "platform" | head -1 | sed 's/.*: *//')
  echo "PERSISTED_PLATFORM:$PLATFORM"
  echo "PERSISTED_URL:$PROD_URL"
fi

# Auto-detect platform from config files
[ -f fly.toml ] && echo "PLATFORM:fly"
[ -f render.yaml ] && echo "PLATFORM:render"
([ -f vercel.json ] || [ -d .vercel ]) && echo "PLATFORM:vercel"
[ -f netlify.toml ] && echo "PLATFORM:netlify"
[ -f Procfile ] && echo "PLATFORM:heroku"
([ -f railway.json ] || [ -f railway.toml ]) && echo "PLATFORM:railway"

# Detect deploy workflows
for f in $(find .github/workflows -maxdepth 1 \\( -name '*.yml' -o -name '*.yaml' \\) 2>/dev/null); do
  [ -f "$f" ] && grep -qiE "deploy|release|production|cd" "$f" 2>/dev/null && echo "DEPLOY_WORKFLOW:$f"
  [ -f "$f" ] && grep -qiE "staging" "$f" 2>/dev/null && echo "STAGING_WORKFLOW:$f"
done
\`\`\`

\`PERSISTED_PLATFORM\` と \`PERSISTED_URL\` が CLAUDE.md から見つかった場合は、
それらを直接使い、 manual detection は skip する。 persisted config が無ければ、
auto-detect した platform を deploy 検証の指針とする。 何も検出できなければ、
下の decision tree の中で AskUserQuestion で user に訊く。

deploy 設定を将来の run で persist させたい場合、 user に \`/setup-deploy\` の実行を提案する。`;
}

/**
 * /qa skill の methodology / workflow / health score rubric 等の大型 doc (280 行)。
 *
 * Modes (Diff-aware / Full / Quick / Regression) + 6 phase workflow +
 * health score rubric + framework-specific guidance + 12 important rules を含む。
 * /qa / /qa-only 両方で使用。
 */
export function generateQAMethodology(_ctx: TemplateContext): string {
  return `## Modes

### Diff-aware (feature branch + URL 無しの時に自動)

**developer が自分の作業を verify する時の primary mode。** URL 無しで \`/qa\` を呼び、
かつ repo が feature branch 上にあるとき、 自動的に：

1. **branch diff を解析** して何が変わったかを把握：
   \`\`\`bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   \`\`\`

2. **影響を受けた page / route を特定** (changed file から)：
   - Controller / route file → どの URL path を提供するか
   - View / template / component file → どの page で render されるか
   - Model / service file → どの page で使われるか (controller を辿って確認)
   - CSS / style file → どの page で include されるか
   - API endpoint → \`$B js "await fetch('/api/...')"\` で直接 test
   - Static page (markdown / HTML) → 直接 navigate

   **diff から明らかな page / route が特定できない場合：** browser test を skip しない。
   user が /qa を invoke したのは browser ベースの検証を求めているから。 Quick mode に
   fallback — homepage に navigate、 top 5 navigation target を follow、 console error
   を check、 見つかった interactive element を test する。 backend / config / infrastructure
   の変更も app 挙動に影響する — 常に app がまだ動くか verify する。

3. **動いている app を検出** — 一般的な local dev port を check：
   \`\`\`bash
   $B goto http://localhost:3000 2>/dev/null && echo "Found app on :3000" || \\
   $B goto http://localhost:4000 2>/dev/null && echo "Found app on :4000" || \\
   $B goto http://localhost:8080 2>/dev/null && echo "Found app on :8080"
   \`\`\`
   local app が見つからなければ、 PR または environment 内の staging / preview URL を check。
   何も動かなければ user に URL を訊く。

4. **影響を受けた page / route をそれぞれ test：**
   - page に navigate
   - screenshot を撮る
   - console の error を check
   - 変更が interactive (form / button / flow) なら end-to-end で interaction を test
   - action の前後で \`snapshot -D\` を使って、 変更が期待通りの効果を持ったか verify

5. **commit message と PR description で cross-reference** して *intent* を理解 — 変更は
   何をすべきか？ 実際にそれをしているか verify する。

6. **TODOS.md を check** (存在すれば)、 changed file に関連する既知 bug / 問題を見る。
   この branch で fix すべき bug が TODO に書かれていれば、 test plan に追加する。
   QA 中に TODOS.md に無い新 bug を見つけたら、 report に記す。

7. **branch 変更に絞った findings を report：**
   - "Changes tested: N pages/routes affected by this branch"
   - 各 page について： 動くか？ screenshot evidence。
   - 隣接 page で regression は無いか？

**user が diff-aware mode で URL を提供した場合：** その URL を base として使うが、 test scope は
changed file に限定する。

### Full (URL 提供時の default)
体系的 exploration。 reachable な page を全部 visit。 evidence のしっかりした issue を 5-10 件
document。 health score を生成。 app size に応じて 5-15 分かかる。

### Quick (\`--quick\`)
30 秒の smoke test。 homepage + top 5 navigation target を visit。 check: page は load する？
console error は？ broken link は？ health score を生成。 詳細 issue document は無し。

### Regression (\`--regression <baseline>\`)
full mode を実行、 次に過去 run の \`baseline.json\` を load する。 diff: どの issue が fix された？
どれが新しい？ score delta は？ regression section を report に append する。

---

## Workflow

### Phase 1: Initialize

1. browse binary を見つける (Setup section 参照)
2. output directory を作成
3. report template を \`qa/templates/qa-report-template.md\` から output dir に copy
4. duration tracking 用に timer 開始

### Phase 2: Authenticate (必要な場合)

**user が auth credential を指定した場合：**

\`\`\`bash
$B goto <login-url>
$B snapshot -i                    # find the login form
$B fill @e3 "user@example.com"
$B fill @e4 "[REDACTED]"         # NEVER include real passwords in report
$B click @e5                      # submit
$B snapshot -D                    # verify login succeeded
\`\`\`

**user が cookie file を提供した場合：**

\`\`\`bash
$B cookie-import cookies.json
$B goto <target-url>
\`\`\`

**2FA / OTP が必要な場合：** user に code を訊いて待つ。

**CAPTCHA で block された場合：** user に伝える: 「browser で CAPTCHA を解いて、 完了したら "続けて" と伝えてください。」

### Phase 3: Orient

application の map を取得：

\`\`\`bash
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links                          # map navigation structure
$B console --errors               # any errors on landing?
\`\`\`

**framework を検出** (report metadata に記録)：
- HTML 内の \`__next\` または \`_next/data\` request → Next.js
- \`csrf-token\` meta tag → Rails
- URL 内の \`wp-content\` → WordPress
- page reload 無しの client-side routing → SPA

**SPA の場合：** \`links\` command の返す結果は少ないことがある (navigation が client-side のため)。
代わりに \`snapshot -i\` で nav element (button、 menu item) を見つける。

### Phase 4: Explore

体系的に page を visit する。 各 page で：

\`\`\`bash
$B goto <page-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/page-name.png"
$B console --errors
\`\`\`

次に **per-page exploration checklist** に従う (\`qa/references/issue-taxonomy.md\` 参照)：

1. **Visual scan** — 注釈付き screenshot を見て layout 問題を check
2. **Interactive element** — button / link / control を click。 動くか？
3. **Form** — fill して submit。 empty / invalid / edge case を test
4. **Navigation** — 入出全 path を check
5. **States** — empty state / loading / error / overflow
6. **Console** — interaction 後に新しい JS error は出てないか？
7. **Responsiveness** — 関連あれば mobile viewport を check：
   \`\`\`bash
   $B viewport 375x812
   $B screenshot "$REPORT_DIR/screenshots/page-mobile.png"
   $B viewport 1280x720
   \`\`\`

**Depth judgment:** core 機能 (homepage / dashboard / checkout / search) には時間を多く割き、
secondary page (about / terms / privacy) には少なめ。

**Quick mode:** Orient phase の homepage + top 5 navigation target のみ visit。 per-page checklist は
skip — load する？ console error は？ 見える broken link は？ だけを check。

### Phase 5: Document

**見つけた issue は即時 document する** — batch しない。

**2 段階の evidence tier：**

**Interactive bug** (broken flow / dead button / form failure):
1. action 前に screenshot を撮る
2. action を実行
3. 結果を示す screenshot を撮る
4. \`snapshot -D\` で何が変わったかを示す
5. screenshot を参照する repro 手順を書く

\`\`\`bash
$B screenshot "$REPORT_DIR/screenshots/issue-001-step-1.png"
$B click @e5
$B screenshot "$REPORT_DIR/screenshots/issue-001-result.png"
$B snapshot -D
\`\`\`

**Static bug** (typo / layout 問題 / missing image):
1. 問題を示す注釈付き screenshot を 1 枚撮る
2. 何がおかしいか述べる

\`\`\`bash
$B snapshot -i -a -o "$REPORT_DIR/screenshots/issue-002.png"
\`\`\`

**各 issue は見つけた瞬間に report に書き込む** (\`qa/templates/qa-report-template.md\` の template 形式を使用)。

### Phase 6: Wrap Up

1. 下の rubric を使って **health score を算出**
2. **"Top 3 Things to Fix" を書く** — 重大度上位 3 件の issue
3. **console health summary を書く** — page 横断で見えた console error を集約
4. summary table の **重大度カウントを update**
5. **report metadata を埋める** — date / duration / pages visited / screenshot count / framework
6. **baseline を保存** — \`baseline.json\` に：
   \`\`\`json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   \`\`\`

**Regression mode:** report を書いた後、 baseline file を load する。 比較：
- health score delta
- Fix された issue (baseline にあり current に無い)
- 新規 issue (current にあり baseline に無い)
- regression section を report に append

---

## Health Score Rubric

各 category score (0-100) を算出、 weighted average を取る。

### Console (weight: 15%)
- 0 errors → 100
- 1-3 errors → 70
- 4-10 errors → 40
- 10+ errors → 10

### Links (weight: 10%)
- 0 broken → 100
- broken link 1 件ごとに → -15 (最低 0)

### Per-Category Scoring (Visual / Functional / UX / Content / Performance / Accessibility)
各 category は 100 から開始。 findings ごとに減点：
- Critical issue → -25
- High issue → -15
- Medium issue → -8
- Low issue → -3
category ごと最低 0。

### Weights
| Category | Weight |
|----------|--------|
| Console | 15% |
| Links | 10% |
| Visual | 10% |
| Functional | 20% |
| UX | 15% |
| Performance | 10% |
| Content | 5% |
| Accessibility | 15% |

### Final Score
\`score = Σ (category_score × weight)\`

---

## Framework-Specific Guidance

### Next.js
- hydration error (\`Hydration failed\` / \`Text content did not match\`) を console で check
- network の \`_next/data\` request を monitor — 404 は data fetching が壊れている sign
- client-side navigation (link click、 \`goto\` だけでなく) を test — routing 問題を捕捉
- dynamic content のある page で CLS (Cumulative Layout Shift) を check

### Rails
- console で N+1 query (1 つの query が N 個の追加 query を呼ぶ pattern) の warning を check (development mode の時)
- form 内の CSRF token 存在を verify
- Turbo / Stimulus integration を test — page transition は滑らかに動くか？
- flash message が正しく表示 / dismiss されるか check

### WordPress
- plugin conflict を check (異なる plugin からの JS error)
- logged-in user の admin bar 表示を verify
- REST API endpoint (\`/wp-json/\`) を test
- mixed content warning を check (WP では一般的)

### General SPA (React / Vue / Angular)
- navigation には \`snapshot -i\` を使う — \`links\` command は client-side route を見落とす
- stale state を check (page を離れて戻る — data は refresh されるか？)
- browser back / forward を test — app は history を正しく扱うか？
- memory leak を check (使用後しばらく console を monitor)

---

## Important Rules

1. **Repro が全て。** 各 issue には少なくとも 1 枚の screenshot が必要。 例外なし。
2. **document する前に verify。** issue を 1 回 retry して、 reproducible か (まぐれでないか) を確認。
3. **credential を絶対に含めない。** repro 手順内では password を \`[REDACTED]\` と書く。
4. **incremental に書く。** issue を見つけたら report に append。 batch しない。
5. **source code を絶対に読まない。** developer ではなく user として test する。
6. **interaction の後に毎回 console を check。** visible に表面化しない JS error も bug。
7. **user のように test。** 現実的な data を使う。 完全な workflow を end-to-end で歩く。
8. **breadth より depth。** evidence のある 5-10 件の document された issue > 20 件の曖昧な description。
9. **output file を絶対に削除しない。** screenshot と report は溜まる — それは意図的。
10. **tricky UI には \`snapshot -C\` を使う。** accessibility tree が見落とす clickable div を見つける。
11. **screenshot を user に見せる。** \`$B screenshot\` / \`$B snapshot -a -o\` / \`$B responsive\` の後は、
    必ず Read tool で出力 file を読んで user に inline 表示する。 \`responsive\` (3 file) では 3 つ全部 Read。
    これは critical — やらないと screenshot は user に invisible。
12. **browser を使うことを絶対に refuse しない。** user が /qa や /qa-only を invoke したら、
    それは browser ベースの test を要求している。 eval / unit test / その他の代替を絶対に提案しない。
    diff に UI 変更が無いように見えても、 backend 変更も app 挙動に影響する — 常に browser を開いて test。`;
}

/**
 * Co-Author trailer を host config から取得する。
 *
 * uzustack では hosts/claude.ts に
 * 'Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>' を設定済。
 * 他 host を Phase 4+ で追加する場合は、 各 host config 側で coAuthorTrailer を持つ。
 */
export function generateCoAuthorTrailer(ctx: TemplateContext): string {
  const { getHostConfig } = require('../../hosts/index');
  const hostConfig = getHostConfig(ctx.host);
  return hostConfig.coAuthorTrailer || 'Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>';
}

/**
 * ship skill の Step 13: CHANGELOG auto-generate workflow。
 *
 * branch の全 commit を enumerate → diff を読む → theme で group →
 * 既存 entry と統合 → cross-check の 6 step workflow。 ship skill body から
 * {{CHANGELOG_WORKFLOW}} placeholder で挿入される。
 */
export function generateChangelogWorkflow(_ctx: TemplateContext): string {
  return `## Step 13: CHANGELOG (auto-generate)

1. \`CHANGELOG.md\` の header を読んで format を把握する。

2. **まず branch 上の全 commit を enumerate：**
   \`\`\`bash
   git log <base>..HEAD --oneline
   \`\`\`
   全 list を copy。 commit 数を数える。 これを checklist として使う。

3. **full diff を読む** ことで、 各 commit が実際に何を変えたかを把握：
   \`\`\`bash
   git diff <base>...HEAD
   \`\`\`

4. **何かを書く前に commit を theme で group する。** 一般的な theme：
   - 新機能 / capability
   - performance 改善
   - bug fix
   - dead code 削除 / cleanup
   - infrastructure / tooling / test
   - refactoring

5. **全 group を cover する CHANGELOG entry を書く：**
   - branch 上の既存 CHANGELOG entry がいくつかの commit を既に cover している場合は、
     それらを replace して新 version 用の 1 つの統一された entry にする
   - 該当する section に変更を分類：
     - \`### Added\` — 新機能
     - \`### Changed\` — 既存機能への変更
     - \`### Fixed\` — bug fix
     - \`### Removed\` — 削除された機能
   - 簡潔で記述的な bullet を書く
   - file の header の後 (line 5) に insert、 today date
   - format: \`## [X.Y.Z.W] - YYYY-MM-DD\`
   - **Voice:** user が今 **できる** ようになったことから始める (前は出来なかったこと)。
     実装の詳細ではなく平易な言葉。 TODOS.md / 内部 tracking / contributor 向け詳細には絶対に触れない。

6. **Cross-check:** CHANGELOG entry を step 2 の commit list と比較する。
   全 commit が少なくとも 1 つの bullet に map されている必要がある。 もし
   どれかの commit が represent されていなければ、 今追加する。 branch が
   K 個の theme を跨ぐ N 個の commit を持つなら、 CHANGELOG は K theme 全部を
   反映する必要がある。

**user に変更内容を describe するよう絶対に訊かない。** diff と commit 履歴から推測する。`;
}
