/**
 * Design resolvers
 *
 * /plan-design-review / /design-review / /design-consultation / /design-shotgun /
 * /design-sketch 系 skill が共有する design methodology / hard rules / outside voices /
 * sketch / mockup / shotgun loop / taste profile / UX principles を集約する。
 *
 * uzustack voice 規約 v1 + v2 適用:
 * - bash internals は English 維持 (axis 1)
 * - narrative は Japanese (経営者・少人数開発者文脈)
 * - 固有名詞 (Krug / AI Slop / First Impression / Trunk Test / Pit of Success 等) は
 *   English-locked、 周囲の Japanese narrative で gloss
 * - paths は upstream の `gstack` → `uzustack` 機械置換
 *
 * AI_SLOP_BLACKLIST / OPENAI_HARD_REJECTIONS / OPENAI_LITMUS_CHECKS は
 * PR-D3 で配置済の `./constants` から consume。
 */
import type { TemplateContext } from './types';
import { AI_SLOP_BLACKLIST, OPENAI_HARD_REJECTIONS, OPENAI_LITMUS_CHECKS } from './constants';

export function generateDesignReviewLite(ctx: TemplateContext): string {
  const litmusList = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join(' ');
  const rejectionList = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join(' ');
  // Codex block は Claude host 限定
  const codexBlock = ctx.host === 'codex' ? '' : `

7. **Codex design voice** (optional, automatic if available):

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

Codex が available なら、 diff に対して lightweight な design check を走らせる:

\`\`\`bash
TMPERR_DRL=$(mktemp /tmp/codex-drl-XXXXXXXX)
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
codex exec "Review the git diff on this branch. Run 7 litmus checks (YES/NO each): ${litmusList} Flag any hard rejections: ${rejectionList} 5 most important design findings only. Reference file:line." -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached < /dev/null 2>"$TMPERR_DRL"
\`\`\`

timeout は 5 分 (\`timeout: 300000\`)。 command 完了後、 stderr を読む:
\`\`\`bash
cat "$TMPERR_DRL" && rm -f "$TMPERR_DRL"
\`\`\`

**Error handling:** 全 error は non-blocking。 auth failure / timeout / empty response の場合は brief note を残して skip して継続する。

Codex output は \`CODEX (design):\` header の下に提示、 上の checklist findings と merge する。`;

  return `## Design Review（条件付き、 diff scope）

\`uzustack-diff-scope\` で diff が frontend ファイルに触れているかを check する:

\`\`\`bash
source <(${ctx.paths.binDir}/uzustack-diff-scope <base> 2>/dev/null)
\`\`\`

**もし \`SCOPE_FRONTEND=false\`:** design review を silent に skip。 output なし。

**もし \`SCOPE_FRONTEND=true\`:**

1. **DESIGN.md を check。** repo root に \`DESIGN.md\` または \`design-system.md\` があれば読み込む。 全 design findings は DESIGN.md に対して calibration される、 DESIGN.md で bless されている pattern は flag しない。 見つからなければ universal な design principles を使う。

2. **\`.claude/skills/review/design-checklist.md\` を読む。** 読めない場合は design review を skip して note を残す: 「Design checklist が見つかりません — design review を skip」。

3. **変更された frontend file をそれぞれ読む** (file 全体、 diff hunks だけではない)。 frontend file は checklist にある pattern で identify。

4. **design checklist を変更 file に適用。** 各項目について:
   - **[HIGH] mechanical CSS fix** (\`outline: none\`、 \`!important\`、 \`font-size < 16px\`): AUTO-FIX に classify
   - **[HIGH/MEDIUM] design judgment が必要**: ASK に classify
   - **[LOW] intent-based detection**: 「Possible — visual に verify するか /design-review を実行」 として提示

5. **findings を review output に含める** — 「Design Review」 header の下に、 checklist の output 形式に従って。 design findings は code review findings と同じ Fix-First flow に merge される。

6. **結果を log する** — Review Readiness Dashboard 用に:

\`\`\`bash
${ctx.paths.binDir}/uzustack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
\`\`\`

置換: TIMESTAMP = ISO 8601 datetime、 STATUS = 「clean」 (0 findings の場合) または 「issues_found」、 N = 総 findings 数、 M = auto-fixed 数、 COMMIT = \`git rev-parse --short HEAD\` の output。${codexBlock}`;
}

// NOTE: design-checklist.md はこの methodology の code-level 検出サブセット。
// ここに項目を追加するときは review/design-checklist.md も更新、 逆も同様。
export function generateDesignMethodology(_ctx: TemplateContext): string {
  return `## Modes

### Full (default)
homepage から到達可能な全 page を体系的に review。 5-8 page を訪問。 checklist 全評価、 responsive screenshots、 interaction flow テスト。 letter grades 付きの完全 design audit report を生成。

### Quick (\`--quick\`)
homepage + 主要 2 page のみ。 First Impression + Design System Extraction + 短縮 checklist。 design score までの最速 path。

### Deep (\`--deep\`)
網羅 review: 10-15 page、 全 interaction flow、 徹底 checklist。 pre-launch audit や major redesign 向け。

### Diff-aware (feature branch + URL なしの場合に automatic)
feature branch にいるとき、 branch 変更が影響する page に scope する:
1. branch diff を解析: \`git diff main...HEAD --name-only\`
2. 変更 file を該当 page / route に map
3. 一般的な local port (3000、 4000、 8080) で running app を検出
4. 影響受ける page のみ audit、 before/after の design quality を比較

### Regression (\`--regression\` または既存 \`design-baseline.json\` 発見時)
full audit を実行、 その後前回の \`design-baseline.json\` を load。 category 別 grade delta、 新 findings、 解消済 findings を比較。 regression table を report に出力。

---

## Phase 1: First Impression

designer の output として最もユニークな部分。 何かを analyze する前に gut reaction (直感的反応) を形にする。

1. target URL に navigate
2. full-page desktop screenshot を撮る: \`$B screenshot "$REPORT_DIR/screenshots/first-impression.png"\`
3. **First Impression** を以下の structured critique format で書く:
   - 「The site communicates **[what]**.」 (一目で何を語るか — competence (能力)、 playfulness (遊び心)、 confusion (混乱)、 のどれか？)
   - 「I notice **[observation]**.」 (positive / negative 何でも目立つもの — be specific)
   - 「The first 3 things my eye goes to are: **[1]**, **[2]**, **[3]**.」 (hierarchy check — designer が意図した 3 つか？ 違うなら visual hierarchy が嘘をついている)
   - 「If I had to describe this in one word: **[word]**.」 (gut verdict)

**Narration mode:** この section は一人称で書く、 page を初めて scan する user のように。 「I'm looking at this page... my eye goes to the logo, then a wall of text I skip entirely, then... wait, is that a button?」 具体的な element、 その position、 visual weight を名指す。 名指せないなら、 scan していない、 platitudes (空疎な常套句) を生成しているだけ。

**Page Area Test:** page の明確に定義された各 area を point する。 即座にその purpose を name できるか？ (「Things I can buy」「Today's deals」「How to search」) 2 秒で name できない area は poorly defined。 list する。

これは user が最初に読む section。 opinionated に。 designer は hedge (曖昧化) しない、 reactする。

---

## Phase 2: Design System Extraction

site が実際に使う design system を抽出する (DESIGN.md が言うことではなく、 rendered (実描画) されているもの):

\`\`\`bash
# 使用中の Fonts (timeout 回避のため 500 elements に cap)
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).map(e => getComputedStyle(e).fontFamily))])"

# 使用中の Color palette
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).flatMap(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]).filter(c => c !== 'rgba(0, 0, 0, 0)'))])"

# Heading hierarchy
$B js "JSON.stringify([...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({tag:h.tagName, text:h.textContent.trim().slice(0,50), size:getComputedStyle(h).fontSize, weight:getComputedStyle(h).fontWeight})))"

# Touch target audit (undersized interactive elements を見つける)
$B js "JSON.stringify([...document.querySelectorAll('a,button,input,[role=button]')].filter(e => {const r=e.getBoundingClientRect(); return r.width>0 && (r.width<44||r.height<44)}).map(e => ({tag:e.tagName, text:(e.textContent||'').trim().slice(0,30), w:Math.round(e.getBoundingClientRect().width), h:Math.round(e.getBoundingClientRect().height)})).slice(0,20))"

# Performance baseline
$B perf
\`\`\`

findings を **Inferred Design System** として構造化する:
- **Fonts:** 使用 count 付き list。 distinct font family が 3 つ超なら flag。
- **Colors:** 抽出した palette。 unique non-gray colors が 12 超なら flag。 warm / cool / mixed を note。
- **Heading Scale:** h1-h6 サイズ。 skip された level、 systematic でない size jump を flag。
- **Spacing Patterns:** padding / margin の sample value。 scale から外れた値を flag。

extraction 後、 提案する: *「これを DESIGN.md として保存しますか？ この observation を project の design system baseline として lock-in できます」*

---

## Phase 3: Page-by-Page Visual Audit

scope 内の各 page に対して:

\`\`\`bash
$B goto <url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/{page}-annotated.png"
$B responsive "$REPORT_DIR/screenshots/{page}"
$B console --errors
$B perf
\`\`\`

### Auth Detection

最初の navigation 後、 URL が login 系 path に変わったか check する:
\`\`\`bash
$B url
\`\`\`
URL が \`/login\`、 \`/signin\`、 \`/auth\`、 \`/sso\` を含む場合: site は authentication が必要。 AskUserQuestion: 「This site requires authentication. Want to import cookies from your browser? 必要なら \`/setup-browser-cookies\` を先に実行してください」。

### Trunk Test (全 page で実行)

context なしでこの page に dropped されたと想像する。 以下に即答できるか:
1. これは何の site？ (Site ID が visible で identifiable)
2. どの page にいる？ (Page name prominent、 click した内容と一致)
3. major section は？ (Primary nav が visible で clear)
4. この level での option は？ (Local nav か content choice が obvious)
5. 全体の中での現在位置は？ (「You are here」 indicator、 breadcrumbs)
6. どう search する？ (Search box を探さずに findable)

Score: PASS (6 つ全て clear) / PARTIAL (4-5 clear) / FAIL (3 つ以下)。
trunk test の FAIL は visual design がどれだけ polish されていても HIGH-impact finding。

### Design Audit Checklist (10 category、 ~80 項目)

各 page でこれを適用。 各 finding に impact rating (high / medium / polish) と category を付ける。

**1. Visual Hierarchy & Composition** (8 items)
- Clear focal point？ view あたり primary CTA 1 つ？
- 視線が top-left から bottom-right に naturally flow するか？
- Visual noise — 注意を奪い合う element？
- Information density が content type に対して適切？
- Z-index clarity — 意図せず重なっていないか？
- Above-the-fold の content が 3 秒で purpose を communicate するか？
- Squint test: blur しても hierarchy が見えるか？
- White space が intentional か、 leftover (余り) か？

**2. Typography** (15 items)
- Font count <=3 (それ以上は flag)
- Scale が ratio (1.25 major third / 1.333 perfect fourth) に従う
- Line-height: body 1.5x、 heading 1.15-1.25x
- Measure: 1 行 45-75 文字 (66 ideal)
- Heading hierarchy: skip された level なし (h1→h3 で h2 抜けはダメ)
- Weight contrast: hierarchy 用に 2 種以上の weight
- Blacklisted fonts なし (Papyrus、 Comic Sans、 Lobster、 Impact、 Jokerman)
- Primary font が Inter / Roboto / Open Sans / Poppins なら potentially generic として flag
- heading に \`text-wrap: balance\` / \`text-pretty\` (\`$B css <heading> text-wrap\` で check)
- Curly quotes を使う、 straight quotes ではない
- Ellipsis character (\`…\`) を使う、 dots 3 つ (\`...\`) ではない
- 数字 column に \`font-variant-numeric: tabular-nums\`
- Body text >= 16px
- Caption / label >= 12px
- lowercase text に letterspacing なし

**3. Color & Contrast** (10 items)
- Palette coherent (unique non-gray colors <=12)
- WCAG AA: body text 4.5:1、 large text (18px+) 3:1、 UI components 3:1
- Semantic colors 一貫 (success=green、 error=red、 warning=yellow/amber)
- Color-only encoding なし (label / icon / pattern を併用)
- Dark mode: surface は elevation (浮上感) を使う、 lightness inversion (明度反転) のみではない
- Dark mode: text は off-white (~#E0E0E0)、 pure white ではない
- Primary accent は dark mode で 10-20% desaturate
- \`color-scheme: dark\` を html element に (dark mode あるなら)
- red / green のみの組合せなし (男性の 8% が red-green deficiency)
- Neutral palette が warm か cool 一貫 — mixed ではない

**4. Spacing & Layout** (12 items)
- Grid が全 breakpoint で consistent
- Spacing が scale (4px or 8px base) を使う、 任意の値ではない
- Alignment が consistent — grid 外に float するものなし
- Rhythm: 関連する item は近く、 区別される section は遠く
- Border-radius hierarchy (全てに同じ bubbly radius ではない)
- Inner radius = outer radius - gap (nested element)
- mobile で horizontal scroll なし
- Max content width 設定 (full-bleed の body text なし)
- notch device 用に \`env(safe-area-inset-*)\`
- URL に state 反映 (filter / tab / pagination が query param)
- Layout に Flex / grid (JS measurement ではない)
- Breakpoints: mobile (375)、 tablet (768)、 desktop (1024)、 wide (1440)

**5. Interaction States** (10 items)
- 全 interactive element に hover state
- \`focus-visible\` ring (replacement なしの \`outline: none\` はダメ)
- Active / pressed state で depth effect か color shift
- Disabled state: opacity 下げ + \`cursor: not-allowed\`
- Loading: skeleton shape が real content layout に match
- Empty states: 温かい message + primary action + visual (「No items.」 だけはダメ)
- Error messages: specific + fix / next step を含む
- Success: confirmation animation か color、 auto-dismiss
- Touch target >= 44px、 全 interactive element
- 全 clickable element に \`cursor: pointer\`
- Mindless choice audit: 全 decision point (button / link / dropdown / modal choice) が mindless click (何が起きるか obvious)。 click に「これが正しい choice か？」 の思考が必要なら HIGH として flag。

**6. Responsive Design** (8 items)
- Mobile layout が *design* として意味を成す (desktop column を stack しただけではない)
- Mobile で touch target 十分 (>= 44px)
- 全 viewport で horizontal scroll なし
- Image が responsive (srcset / sizes / CSS containment)
- Mobile で zoom なしで読める text (body >= 16px)
- Navigation が appropriate に collapse (hamburger / bottom nav 等)
- Mobile で form が usable (input type 正しい、 mobile で autoFocus なし)
- viewport meta に \`user-scalable=no\` / \`maximum-scale=1\` なし

**7. Motion & Animation** (6 items)
- Easing: 入る時 ease-out、 出る時 ease-in、 動く時 ease-in-out
- Duration: 50-700ms 範囲 (page transition 以外これより遅くしない)
- Purpose: 全 animation が何かを communicate する (state change / attention / spatial relationship)
- \`prefers-reduced-motion\` を尊重 (check: \`$B js "matchMedia('(prefers-reduced-motion: reduce)').matches"\`)
- \`transition: all\` なし — property は明示 list
- \`transform\` と \`opacity\` のみ animate (width / height / top / left のような layout property ではない)

**8. Content & Microcopy** (8 items)
- Empty state が温かさで design されている (message + action + illustration / icon)
- Error message specific: 何が起きたか + なぜ + 次にすべきこと
- Button label specific (「Continue」 / 「Submit」 ではなく 「Save API Key」)
- Production で placeholder / lorem ipsum text visible なし
- Truncation handled (\`text-overflow: ellipsis\`、 \`line-clamp\`、 \`break-words\`)
- Active voice (「The CLI will be installed」 ではなく 「Install the CLI」)
- Loading state は \`…\` で終わる (「Saving...」 ではなく 「Saving…」)
- Destructive action は confirmation modal か undo window あり
- Happy talk detection: 「Welcome to...」 で始まる、 または site の素晴らしさを user に語る introductory paragraph を scan。 「blah blah blah」 と聞こえるなら happy talk。 削除候補として flag。
- Instructions detection: 1 文を超える visible instruction。 user が instruction を読む必要があれば、 design は失敗している。 instruction とそれが代替している interaction の両方を flag。
- Happy talk word count: page 上の visible word を全部 count。 各 text block を 「useful content」 vs 「happy talk」 (welcome paragraph / 自画自賛 text / 誰も読まない instruction) に classify。 報告: 「This page has X words. Y (Z%) are happy talk.」

**9. AI Slop Detection** (10 anti-patterns — blacklist)

test: respect される studio の human designer がこれを ship するか？

${AI_SLOP_BLACKLIST.map(item => `- ${item}`).join('\n')}

**10. Performance as Design** (6 items)
- LCP < 2.0s (web app)、 < 1.5s (informational site)
- CLS < 0.1 (load 中に visible layout shift なし)
- Skeleton quality: shape が real content layout に match、 shimmer animation
- Images: \`loading="lazy"\`、 width / height 設定、 WebP / AVIF format
- Fonts: \`font-display: swap\`、 CDN origin に preconnect
- Visible font swap flash (FOUT) なし — critical font は preload

---

## Phase 4: Interaction Flow Review

key user flow を 2-3 walk して *feel* (感触) を評価する、 機能だけではない:

\`\`\`bash
$B snapshot -i
$B click @e3           # perform action
$B snapshot -D          # diff to see what changed
\`\`\`

評価:
- **Response feel:** click が responsive に感じるか？ delay や missing loading state はないか？
- **Transition quality:** transition は intentional か generic / absent か？
- **Feedback clarity:** action が clearly 成功 / 失敗したか？ feedback は immediate か？
- **Form polish:** focus state は visible か？ validation timing は正しいか？ error は source 近くか？

**Narration mode:** flow を一人称で narrate する。 「I click 'Sign Up'... spinner appears... 3 seconds pass... still spinning... I'm getting nervous. Finally the dashboard loads, but where am I? The nav doesn't highlight anything.」 具体的な element、 その position、 visual weight を名指す。 名指せないなら flow を体験していない、 platitudes を生成しているだけ。

### Goodwill Reservoir (flow 全体で track)

user flow を walk しながら、 心の中の goodwill meter (70/100 から start) を maintain する。
この score は heuristic (経験則) で計測値ではない。 価値は最終 number ではなく、 具体的な drain (減点) と fill (加点) を identify することにある。

減点理由:
- user が欲しい情報 (price / contact / shipping) を hidden: subtract 15
- Format punishment (phone number の dash のような valid input を reject): subtract 10
- 不必要な情報要求: subtract 10
- task を block する interstitial / splash screen / forced tour: subtract 15
- Sloppy / unprofessional な appearance: subtract 10
- 考えさせる Ambiguous choice: subtract 5 each

加点理由:
- Top user task が obvious で prominent: add 10
- Cost / 制約に upfront: add 5
- Step を save (直 link / smart default / autofill): add 5 each
- Specific fix instruction 付きの graceful error recovery: add 10
- 何か wrong になった時に Apologize: add 5

最終 goodwill score を visual dashboard で報告:

\`\`\`
Goodwill: 70 ████████████████████░░░░░░░░░░
  Step 1: Login page        70 → 75  (+5 obvious primary action)
  Step 2: Dashboard          75 → 60  (-15 interstitial tour popup)
  Step 3: Settings           60 → 50  (-10 format punishment on phone)
  Step 4: Billing            50 → 35  (-15 hidden pricing info)
  FINAL: 35/100 ⚠️ CRITICAL UX DEBT
\`\`\`

30 未満 = critical UX debt。 30-60 = needs work。 60 超 = healthy。
最大 drain と fill を具体 finding として含める。

---

## Phase 5: Cross-Page Consistency

screenshots と observation を page 横断で比較する:
- Navigation bar が全 page で consistent？
- Footer が consistent？
- Component reuse vs one-off design (同じ button が page によって違う style？)
- Tone consistency (1 page が playful で別 page は corporate？)
- Spacing rhythm が page をまたいで継続している？

---

## Phase 6: Compile Report

### Output Locations

**Local:** \`.uzustack/design-reports/design-audit-{domain}-{YYYY-MM-DD}.md\`

**Project-scoped:**
\`\`\`bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
\`\`\`
書き込み先: \`~/.uzustack/projects/{slug}/{user}-{branch}-design-audit-{datetime}.md\`

**Baseline:** regression mode 用に \`design-baseline.json\` を書く:
\`\`\`json
{
  "date": "YYYY-MM-DD",
  "url": "<target>",
  "designScore": "B",
  "aiSlopScore": "C",
  "categoryGrades": { "hierarchy": "A", "typography": "B", ... },
  "findings": [{ "id": "FINDING-001", "title": "...", "impact": "high", "category": "typography" }]
}
\`\`\`

### Scoring System

**Dual headline scores:**
- **Design Score: {A-F}** — 全 10 category の weighted average
- **AI Slop Score: {A-F}** — pithy verdict 付き standalone grade

**Per-category grades:**
- **A:** Intentional、 polished、 delightful。 design thinking が見える。
- **B:** 基本固い、 minor inconsistency。 professional に見える。
- **C:** functional だが generic。 major problem なし、 design POV なし。
- **D:** Noticeable problem。 unfinished / careless に感じる。
- **F:** Actively user experience を傷つけている。 significant rework が必要。

**Grade computation:** 各 category は A から start。 各 High-impact finding で 1 letter drop。 各 Medium-impact finding で half letter drop。 Polish findings は note のみ、 grade に影響しない。 minimum は F。

**Design Score の category weight:**
| Category | Weight |
|----------|--------|
| Visual Hierarchy | 15% |
| Typography | 15% |
| Spacing & Layout | 15% |
| Color & Contrast | 10% |
| Interaction States | 10% |
| Responsive | 10% |
| Content Quality | 10% |
| AI Slop | 5% |
| Motion | 5% |
| Performance Feel | 5% |

AI Slop は Design Score の 5% だが headline metric として独立 grade も付ける。

### Regression Output

前回の \`design-baseline.json\` があるか \`--regression\` flag が使われた時:
- baseline grade を load
- 比較: category 別 delta、 新 finding、 解消 finding
- regression table を report に append

---

## Design Critique Format

opinion ではなく structured feedback を使う:
- 「I notice...」 — observation (例: 「I notice the primary CTA competes with the secondary action」)
- 「I wonder...」 — question (例: 「I wonder if users will understand what 'Process' means here」)
- 「What if...」 — suggestion (例: 「What if we moved search to a more prominent position?」)
- 「I think... because...」 — reasoned opinion (例: 「I think the spacing between sections is too uniform because it doesn't create hierarchy」)

全てを user goal と product objective に紐付ける。 problem と並んで specific な improvement を必ず提案する。

---

## Important Rules

1. **QA engineer ではなく designer のように考える。** 物事が right に感じるか、 intentional に見えるか、 user を respect しているかを気にする。 物事が「動く」 かどうかだけは気にしない。
2. **Screenshot は evidence。** 全 finding に screenshot 1 枚以上を付ける。 annotated screenshot (\`snapshot -a\`) で element を highlight する。
3. **Specific かつ actionable に。** 「the spacing feels off」 ではなく「Change X to Y because Z」。
4. **絶対に source code を読まない。** rendered site を評価する、 implementation ではない。 (例外: 抽出した observation から DESIGN.md を書く offer。)
5. **AI Slop detection はあなたの superpower。** ほとんどの developer は自分の site が AI-generated に見えるかを評価できない。 あなたはできる。 直接的に。
6. **Quick wins matters。** 「Quick Wins」 section を必ず含める — <30 分で済む highest-impact fix を 3-5 件。
7. **Tricky な UI には \`snapshot -C\` を使う。** accessibility tree が miss する clickable div を見つけられる。
8. **Responsive は design、 「壊れていない」 だけではない。** mobile で desktop layout を stack しただけのは responsive design ではない、 lazy。 mobile layout が *design* として意味を成すかを評価する。
9. **Incremental に document する。** 各 finding を見つけたタイミングで report に書く。 batch しない。
10. **Depth over breadth。** screenshot と specific suggestion 付きで well-documented な 5-10 finding > 20 件の vague observation。
11. **Screenshot を user に見せる。** 各 \`$B screenshot\`、 \`$B snapshot -a -o\`、 \`$B responsive\` command の後、 output file を Read tool で読む — user に inline で見せるため。 \`responsive\` (3 file) なら 3 つ全て Read。 これが critical — これなしでは screenshot は user に見えない。`;
}

export function generateDesignSketch(_ctx: TemplateContext): string {
  return `## Visual Sketch (UI ideas only)

選んだ approach が user-facing UI (screen / page / form / dashboard / interactive element) を含むなら、 rough wireframe を生成して user が visualize できるようにする。 idea が backend のみ、 infrastructure、 または UI component を持たないなら — この section を silent に skip。

**Step 1: design context を集める**

1. repo root に \`DESIGN.md\` があるか check。 あれば design system 制約 (color / typography / spacing / component pattern) を読む。 wireframe にこの制約を適用する。
2. core design principles を適用:
   - **Information hierarchy** — user は first / second / third に何を見るか？
   - **Interaction states** — loading / empty / error / success / partial
   - **Edge case paranoia** — 名前が 47 文字なら？ Zero result なら？ Network failure なら？
   - **Subtraction default** — 「as little design as possible」 (Rams)。 全 element が pixel を earn する。
   - **Design for trust** — 全 interface element が user trust を build / erode する。

**Step 2: wireframe HTML を生成**

以下の制約で single-page HTML file を生成:
- **意図的に rough な aesthetic** — system font、 thin gray border、 no color、 hand-drawn-style element。 これは sketch であって polished mockup ではない。
- Self-contained — 外部依存なし、 CDN link なし、 inline CSS のみ
- core interaction flow を見せる (最大 1-3 screen / state)
- 現実的な placeholder content (「Lorem ipsum」 ではなく、 actual use case に matches する content)
- design 判断を説明する HTML comment を追加

temp file に書く:
\`\`\`bash
SKETCH_FILE="/tmp/uzustack-sketch-$(date +%s).html"
\`\`\`

**Step 3: Render and capture**

\`\`\`bash
$B goto "file://$SKETCH_FILE"
$B screenshot /tmp/uzustack-sketch.png
\`\`\`

\`$B\` が利用不可なら (browse binary 未 setup)、 render step を skip。 user に伝える: 「Visual sketch requires the browse binary. setup script を実行して enable してください」。

**Step 4: Present and iterate**

screenshot を user に見せる。 訊く: 「Does this feel right? layout を iterate しますか？」

変更が欲しいなら、 feedback を踏まえて HTML を regenerate して re-render。
approve された / 「good enough」 と言われたら次へ。

**Step 5: design doc に含める**

design doc の 「Recommended Approach」 section で wireframe screenshot を reference。
\`/tmp/uzustack-sketch.png\` の screenshot file は downstream skill (\`/plan-design-review\`、 \`/design-review\`) から、 当初 envision していたものを見るために reference 可能。

**Step 6: Outside design voices** (optional)

wireframe approve 後、 outside design perspective を offer:

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

Codex が available なら、 AskUserQuestion を使う:
> 「選んだ approach に outside design perspective が欲しいですか？ Codex が visual thesis、 content plan、 interaction idea を提案。 Claude subagent が代替 aesthetic direction を提案します。」
>
> A) Yes — outside design voices を取得
> B) No — そのまま進める

user が A を選んだら、 両 voice を同時に launch:

1. **Codex** (Bash 経由、 \`model_reasoning_effort="medium"\`):
\`\`\`bash
TMPERR_SKETCH=$(mktemp /tmp/codex-sketch-XXXXXXXX)
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
codex exec "For this product approach, provide: a visual thesis (one sentence — mood, material, energy), a content plan (hero → support → detail → CTA), and 2 interaction ideas that change page feel. Apply beautiful defaults: composition-first, brand-first, cardless, poster not document. Be opinionated." -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="medium"' --enable web_search_cached < /dev/null 2>"$TMPERR_SKETCH"
\`\`\`
timeout は 5 分 (\`timeout: 300000\`)。 完了後: \`cat "$TMPERR_SKETCH" && rm -f "$TMPERR_SKETCH"\`

2. **Claude subagent** (Agent tool 経由):
「For this product approach, what design direction would you recommend? What aesthetic, typography, and interaction patterns fit? What would make this approach feel inevitable to the user? Be specific — font names, hex colors, spacing values.」

Codex output を \`CODEX SAYS (design sketch):\` の下、 subagent output を \`CLAUDE SUBAGENT (design direction):\` の下に提示。
Error handling: 全 non-blocking。 failure 時は skip して継続。`;
}

export function generateDesignOutsideVoices(ctx: TemplateContext): string {
  // Codex host: 完全に strip — Codex は自分自身を invoke しない
  if (ctx.host === 'codex') return '';

  const rejectionList = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const litmusList = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join('\n');

  // Skill-specific configuration
  const isPlanDesignReview = ctx.skillName === 'plan-design-review';
  const isDesignReview = ctx.skillName === 'design-review';
  const isDesignConsultation = ctx.skillName === 'design-consultation';

  // opt-in 挙動と reasoning effort を決定
  const isAutomatic = isDesignReview; // design-review は automatic
  const reasoningEffort = isDesignConsultation ? 'medium' : 'high'; // creative vs analytical

  // skill 固有 Codex prompt を組み立て
  let codexPrompt: string;
  let subagentPrompt: string;

  if (isPlanDesignReview) {
    codexPrompt = `Read the plan file at [plan-file-path]. Evaluate this plan's UI/UX design against these criteria.

HARD REJECTION — flag if ANY apply:
${rejectionList}

LITMUS CHECKS — answer YES or NO for each:
${litmusList}

HARD RULES — first classify as MARKETING/LANDING PAGE vs APP UI vs HYBRID, then flag violations of the matching rule set:
- MARKETING: First viewport as one composition, brand-first hierarchy, full-bleed hero, 2-3 intentional motions, composition-first layout
- APP UI: Calm surface hierarchy, dense but readable, utility language, minimal chrome
- UNIVERSAL: CSS variables for colors, no default font stacks, one job per section, cards earn existence

For each finding: what's wrong, what will happen if it ships unresolved, and the specific fix. Be opinionated. No hedging.`;

    subagentPrompt = `Read the plan file at [plan-file-path]. You are an independent senior product designer reviewing this plan. You have NOT seen any prior review. Evaluate:

1. Information hierarchy: what does the user see first, second, third? Is it right?
2. Missing states: loading, empty, error, success, partial — which are unspecified?
3. User journey: what's the emotional arc? Where does it break?
4. Specificity: does the plan describe SPECIFIC UI ("48px Söhne Bold header, #1a1a1a on white") or generic patterns ("clean modern card-based layout")?
5. What design decisions will haunt the implementer if left ambiguous?

For each finding: what's wrong, severity (critical/high/medium), and the fix.`;
  } else if (isDesignReview) {
    codexPrompt = `Review the frontend source code in this repo. Evaluate against these design hard rules:
- Spacing: systematic (design tokens / CSS variables) or magic numbers?
- Typography: expressive purposeful fonts or default stacks?
- Color: CSS variables with defined system, or hardcoded hex scattered?
- Responsive: breakpoints defined? calc(100svh - header) for heroes? Mobile tested?
- A11y: ARIA landmarks, alt text, contrast ratios, 44px touch targets?
- Motion: 2-3 intentional animations, or zero / ornamental only?
- Cards: used only when card IS the interaction? No decorative card grids?

First classify as MARKETING/LANDING PAGE vs APP UI vs HYBRID, then apply matching rules.

LITMUS CHECKS — answer YES/NO:
${litmusList}

HARD REJECTION — flag if ANY apply:
${rejectionList}

Be specific. Reference file:line for every finding.`;

    subagentPrompt = `Review the frontend source code in this repo. You are an independent senior product designer doing a source-code design audit. Focus on CONSISTENCY PATTERNS across files rather than individual violations:
- Are spacing values systematic across the codebase?
- Is there ONE color system or scattered approaches?
- Do responsive breakpoints follow a consistent set?
- Is the accessibility approach consistent or spotty?

For each finding: what's wrong, severity (critical/high/medium), and the file:line.`;
  } else if (isDesignConsultation) {
    codexPrompt = `Given this product context, propose a complete design direction:
- Visual thesis: one sentence describing mood, material, and energy
- Typography: specific font names (not defaults — no Inter/Roboto/Arial/system) + hex colors
- Color system: CSS variables for background, surface, primary text, muted text, accent
- Layout: composition-first, not component-first. First viewport as poster, not document
- Differentiation: 2 deliberate departures from category norms
- Anti-slop: no purple gradients, no 3-column icon grids, no centered everything, no decorative blobs

Be opinionated. Be specific. Do not hedge. This is YOUR design direction — own it.`;

    subagentPrompt = `Given this product context, propose a design direction that would SURPRISE. What would the cool indie studio do that the enterprise UI team wouldn't?
- Propose an aesthetic direction, typography stack (specific font names), color palette (hex values)
- 2 deliberate departures from category norms
- What emotional reaction should the user have in the first 3 seconds?

Be bold. Be specific. No hedging.`;
  } else {
    // Unknown skill — empty を返す
    return '';
  }

  // opt-in section を組み立て
  const optInSection = isAutomatic ? `
**Automatic:** Codex が available なら outside voice は automatic 実行。 opt-in 不要。` : `
AskUserQuestion を使う:
> 「outside design voice が欲しいですか${isPlanDesignReview ? '、 detailed review の前に' : ''}？ Codex が OpenAI の design hard rules + litmus checks に対して評価、 Claude subagent が独立した ${isDesignConsultation ? 'design direction proposal' : 'completeness review'} を行います。」
>
> A) Yes — outside design voices を実行
> B) No — そのまま進める

user が B を選んだら、 この step を skip して継続する。`;

  // synthesis section を組み立て
  const synthesisSection = isPlanDesignReview ? `
**Synthesis — Litmus scorecard:**

\`\`\`
DESIGN OUTSIDE VOICES — LITMUS SCORECARD:
═══════════════════════════════════════════════════════════════
  Check                                    Claude  Codex  Consensus
  ─────────────────────────────────────── ─────── ─────── ─────────
  1. Brand unmistakable in first screen?   —       —      —
  2. One strong visual anchor?             —       —      —
  3. Scannable by headlines only?          —       —      —
  4. Each section has one job?             —       —      —
  5. Cards actually necessary?             —       —      —
  6. Motion improves hierarchy?            —       —      —
  7. Premium without decorative shadows?   —       —      —
  ─────────────────────────────────────── ─────── ─────── ─────────
  Hard rejections triggered:               —       —      —
═══════════════════════════════════════════════════════════════
\`\`\`

各 cell を Codex / subagent の output から fill in。 CONFIRMED = 両者一致。 DISAGREE = model 間で違う。 NOT SPEC'D = 評価に十分な情報なし。

**Pass integration (既存 7-pass contract を respect):**
- Hard rejection → Pass 1 の FIRST item として、 \`[HARD REJECTION]\` tag 付きで raise
- Litmus DISAGREE 項目 → 該当 pass で両 perspective と共に raise
- Litmus CONFIRMED failure → 該当 pass で既知 issue として pre-load
- Pass は discovery を skip して、 pre-identified issue に対して即 fix に進める` :
    isDesignConsultation ? `
**Synthesis:** Claude main が Codex と subagent の両 proposal を Phase 3 proposal で reference する。 提示:
- Claude main + Codex + subagent の 3 voice の agreement area
- 真の divergence は user が選ぶ creative alternative として
- 「Codex と私は X で agree。 Codex は Y を提案したが私は Z を提案 — その理由は...」` : `
**Synthesis — Litmus scorecard:**

/plan-design-review と同じ scorecard format を使う (上記参照)。 両 output から fill in。
finding は triage に \`[codex]\` / \`[subagent]\` / \`[cross-model]\` tag 付きで merge。`;

  const escapedCodexPrompt = codexPrompt.replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `## Design Outside Voices (parallel)
${optInSection}

**Codex 利用可否を check:**
\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

**Codex が available なら**、 両 voice を同時に launch:

1. **Codex design voice** (Bash 経由):
\`\`\`bash
TMPERR_DESIGN=$(mktemp /tmp/codex-design-XXXXXXXX)
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
codex exec "${escapedCodexPrompt}" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="${reasoningEffort}"' --enable web_search_cached < /dev/null 2>"$TMPERR_DESIGN"
\`\`\`
timeout は 5 分 (\`timeout: 300000\`)。 command 完了後、 stderr を読む:
\`\`\`bash
cat "$TMPERR_DESIGN" && rm -f "$TMPERR_DESIGN"
\`\`\`

2. **Claude design subagent** (Agent tool 経由):
subagent を以下の prompt で dispatch:
「${subagentPrompt}」

**Error handling (全 non-blocking):**
- **Auth failure:** stderr が 「auth」「login」「unauthorized」「API key」 を含む場合: 「Codex authentication failed. \`codex login\` を実行して認証してください」。
- **Timeout:** 「Codex timed out after 5 minutes.」
- **Empty response:** 「Codex returned no response.」
- Codex error 時: Claude subagent output のみで継続、 \`[single-model]\` tag を付ける。
- Claude subagent も失敗時: 「Outside voices unavailable — primary review で継続」。

Codex output は \`CODEX SAYS (design ${isPlanDesignReview ? 'critique' : isDesignReview ? 'source audit' : 'direction'}):\` header の下に提示。
subagent output は \`CLAUDE SUBAGENT (design ${isPlanDesignReview ? 'completeness' : isDesignReview ? 'consistency' : 'direction'}):\` header の下に提示。
${synthesisSection}

**結果を log する:**
\`\`\`bash
${ctx.paths.binDir}/uzustack-review-log '{"skill":"design-outside-voices","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`
置換: STATUS = 「clean」 / 「issues_found」、 SOURCE = 「codex+subagent」 / 「codex-only」 / 「subagent-only」 / 「unavailable」。`;
}

// ─── Design Hard Rules (OpenAI framework + uzustack slop blacklist) ───
export function generateDesignHardRules(_ctx: TemplateContext): string {
  const slopItems = AI_SLOP_BLACKLIST.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const rejectionItems = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const litmusItems = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join('\n');

  return `### Design Hard Rules

**Classifier — 評価前に rule set を決定する:**
- **MARKETING / LANDING PAGE** (hero-driven、 brand-forward、 conversion-focused) → Landing Page Rules を適用
- **APP UI** (workspace-driven、 data-dense、 task-focused: dashboard / admin / settings) → App UI Rules を適用
- **HYBRID** (marketing shell + app-like section) → hero / marketing section に Landing Page Rules、 functional section に App UI Rules

**Hard rejection criteria** (instant-fail pattern — どれか apply するなら flag):
${rejectionItems}

**Litmus checks** (各 YES/NO で回答 — cross-model consensus scoring に使用):
${litmusItems}

**Landing page rules** (classifier = MARKETING / LANDING の時に適用):
- First viewport が dashboard ではなく 1 つの composition として読める
- Brand-first hierarchy: brand > headline > body > CTA
- Typography: expressive、 purposeful — default stack なし (Inter / Roboto / Arial / system)
- Flat single-color background なし — gradient / image / subtle pattern を使う
- Hero: full-bleed、 edge-to-edge、 inset / tiled / rounded variant なし
- Hero budget: brand、 headline 1 つ、 supporting sentence 1 つ、 CTA group 1 つ、 image 1 つ
- Hero に card なし。 card は card 自体が interaction の時のみ
- One job per section: 1 purpose、 1 headline、 1 短い supporting sentence
- Motion: intentional motion 2-3 個 最低 (entrance / scroll-linked / hover-reveal)
- Color: CSS variable を定義、 purple-on-white デフォルト回避、 accent color はデフォルト 1 つ
- Copy: design commentary ではなく product language。 「If deleting 30% improves it, keep deleting」
- Beautiful defaults: composition-first、 brand が最大 text、 typeface 2 つまで、 cardless by default、 first viewport は document ではなく poster

**App UI rules** (classifier = APP UI の時に適用):
- Calm surface hierarchy、 strong typography、 few colors
- Dense but readable、 minimal chrome
- 構成: primary workspace、 navigation、 secondary context、 accent 1 つ
- 避ける: dashboard-card mosaic、 thick border、 decorative gradient、 ornamental icon
- Copy: utility language — orientation / status / action。 mood / brand / aspiration ではない
- Card は card 自体が interaction の時のみ
- Section heading は area が何か、 user が何できるかを述べる (「Selected KPIs」「Plan status」)

**Universal rules** (全 type に適用):
- color system に CSS variable を定義
- default font stack なし (Inter / Roboto / Arial / system)
- One job per section
- 「If deleting 30% of the copy improves it, keep deleting」
- Card は存在を earn する — decorative card grid なし
- body text < 16px / contrast ratio < 4.5:1 な small low-contrast type を NEVER 使わない
- form field の中に label を only label として置かない (placeholder-as-label pattern — field に content がある時に label が visible)
- visited vs unvisited link distinction を ALWAYS 保つ (visited link は色が違う)
- 段落間に heading を NEVER float させない (heading は前の section ではなく後の section に visually 近く)

**AI Slop blacklist** (「AI-generated」 と叫ぶ 10 pattern):
${slopItems}

Source: [OpenAI "Designing Delightful Frontends with GPT-5.4"](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4) (Mar 2026) + uzustack design methodology.`;
}

export function generateDesignSetup(ctx: TemplateContext): string {
  return `## DESIGN SETUP (design mockup command の前にこの check を実行)

\`\`\`bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
D=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/${ctx.paths.localSkillRoot}/design/dist/design" ] && D="$_ROOT/${ctx.paths.localSkillRoot}/design/dist/design"
[ -z "$D" ] && D="$HOME${ctx.paths.designDir.replace(/^~/, '')}/design"
if [ -x "$D" ]; then
  echo "DESIGN_READY: $D"
else
  echo "DESIGN_NOT_AVAILABLE"
fi
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/${ctx.paths.localSkillRoot}/browse/dist/browse" ] && B="$_ROOT/${ctx.paths.localSkillRoot}/browse/dist/browse"
[ -z "$B" ] && B="$HOME${ctx.paths.browseDir.replace(/^~/, '')}/browse"
if [ -x "$B" ]; then
  echo "BROWSE_READY: $B"
else
  echo "BROWSE_NOT_AVAILABLE (will use 'open' to view comparison boards)"
fi
\`\`\`

\`DESIGN_NOT_AVAILABLE\` の場合: visual mockup 生成を skip して、 既存の HTML wireframe approach (\`DESIGN_SKETCH\`) に fall back。 design mockup は progressive enhancement、 hard requirement ではない。

\`BROWSE_NOT_AVAILABLE\` の場合: \`$B goto\` の代わりに \`open file://...\` で comparison board を開く。 user は任意の browser で HTML file を見るだけで OK。

\`DESIGN_READY\` の場合: design binary が visual mockup 生成に available。 Commands:
- \`$D generate --brief "..." --output /path.png\` — 単一 mockup 生成
- \`$D variants --brief "..." --count 3 --output-dir /path/\` — N style variant 生成
- \`$D compare --images "a.png,b.png,c.png" --output /path/board.html --serve\` — comparison board + HTTP server
- \`$D serve --html /path/board.html\` — comparison board を serve、 HTTP 経由で feedback を集める
- \`$D check --image /path.png --brief "..."\` — vision quality gate
- \`$D iterate --session /path/session.json --feedback "..." --output /path.png\` — iterate

**CRITICAL PATH RULE:** 全 design artifact (mockup / comparison board / approved.json) は \`~/.uzustack/projects/$SLUG/designs/\` に保存しなければならない、 \`.context/\` / \`docs/designs/\` / \`/tmp/\` / project-local directory には NEVER。 design artifact は USER データ、 project file ではない。 branch / conversation / workspace を横断して persist する。`;
}

export function generateDesignMockup(ctx: TemplateContext): string {
  return `## Visual Design Exploration

\`\`\`bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
D=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/${ctx.paths.localSkillRoot}/design/dist/design" ] && D="$_ROOT/${ctx.paths.localSkillRoot}/design/dist/design"
[ -z "$D" ] && D="$HOME${ctx.paths.designDir.replace(/^~/, '')}/design"
[ -x "$D" ] && echo "DESIGN_READY" || echo "DESIGN_NOT_AVAILABLE"
\`\`\`

**\`DESIGN_NOT_AVAILABLE\` の場合:** 既存の DESIGN_SKETCH section の HTML wireframe approach に fall back。 visual mockup は design binary を要求する。

**\`DESIGN_READY\` の場合:** user 向けに visual mockup exploration を生成する。

提案された design の visual mockup を生成中... (visual 不要なら「skip」 と言う)

**Step 1: design directory を setup**

\`\`\`bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)"
_DESIGN_DIR="$HOME/.uzustack/projects/$SLUG/designs/mockup-$(date +%Y%m%d)"
mkdir -p "$_DESIGN_DIR"
echo "DESIGN_DIR: $_DESIGN_DIR"
\`\`\`

**Step 2: design brief を組み立てる**

DESIGN.md があれば読む — visual style の制約に使う。 DESIGN.md がなければ、 多様な方向に wide に explore。

**Step 3: 3 variant を生成**

\`\`\`bash
$D variants --brief "<assembled brief>" --count 3 --output-dir "$_DESIGN_DIR/"
\`\`\`

同じ brief の style variation 3 つを生成 (~40 秒 total)。

**Step 4: variant を inline で見せる、 その後 comparison board を開く**

最初に各 variant を inline で user に見せる (Read tool で PNG を読む)、 その後 comparison board を作って serve:

\`\`\`bash
$D compare --images "$_DESIGN_DIR/variant-A.png,$_DESIGN_DIR/variant-B.png,$_DESIGN_DIR/variant-C.png" --output "$_DESIGN_DIR/design-board.html" --serve
\`\`\`

board が user の default browser で開く、 feedback 受信まで block する。 stdout で structured JSON result を読む。 polling 不要。

\`$D serve\` が利用不可 / 失敗した場合、 AskUserQuestion に fall back:
「design board を開きました。 どの variant が好みですか？ feedback あれば」。

**Step 5: feedback を handle**

JSON が \`"regenerated": true\` を含む場合:
1. \`regenerateAction\` を読む (remix request なら \`remixSpec\`)
2. \`$D iterate\` または \`$D variants\` で更新 brief を使って新 variant を生成
3. \`$D compare\` で新 board を作成
4. 動作中の server に新 HTML を POST: \`curl -X POST http://localhost:PORT/api/reload -H 'Content-Type: application/json' -d '{"html":"$_DESIGN_DIR/design-board.html"}'\`
   (port は stderr から parse: \`SERVE_STARTED: port=XXXXX\`)
5. board は同じ tab で auto-refresh

\`"regenerated": false\` の場合: approved variant で継続。

**Step 6: approved choice を保存**

\`\`\`bash
echo '{"approved_variant":"<VARIANT>","feedback":"<FEEDBACK>","date":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","screen":"mockup","branch":"'$(git branch --show-current 2>/dev/null)'"}' > "$_DESIGN_DIR/approved.json"
\`\`\`

保存した mockup を design doc / plan で reference。`;
}

export function generateDesignShotgunLoop(_ctx: TemplateContext): string {
  return `### Comparison Board + Feedback Loop

comparison board を作って HTTP で serve する:

\`\`\`bash
$D compare --images "$_DESIGN_DIR/variant-A.png,$_DESIGN_DIR/variant-B.png,$_DESIGN_DIR/variant-C.png" --output "$_DESIGN_DIR/design-board.html" --serve
\`\`\`

この command が board HTML を生成、 random port で HTTP server を start、 user の default browser で開く。 user が board と interact している間 server は running を維持する必要があるので、 **background で実行する** (\`&\` 付き)。

stderr output から port を parse する: \`SERVE_STARTED: port=XXXXX\`。 board URL と regeneration cycle 中の reload に必要。

**PRIMARY WAIT: AskUserQuestion with board URL**

board が serve 中になったら、 AskUserQuestion で user を待つ。 board URL を含めて、 browser tab を失っても click できるように:

「design variant の comparison board を開きました:
http://127.0.0.1:<PORT>/ — rate して、 comment を残して、 気に入った element を remix して、 Submit を click してください。 feedback を submit したら教えてください (または preference をここに paste)。 board で Regenerate / Remix を click したら教えてください、 新 variant を生成します。」

**user がどの variant が好きかを訊くのに AskUserQuestion を使わないこと。** comparison board が chooser。 AskUserQuestion は単に blocking wait の機構。

**user が AskUserQuestion に応答した後:**

board HTML の隣に feedback file があるかを check:
- \`$_DESIGN_DIR/feedback.json\` — user が Submit を click したときに書き込まれる (final choice)
- \`$_DESIGN_DIR/feedback-pending.json\` — user が Regenerate / Remix / More Like This を click したときに書き込まれる

\`\`\`bash
if [ -f "$_DESIGN_DIR/feedback.json" ]; then
  echo "SUBMIT_RECEIVED"
  cat "$_DESIGN_DIR/feedback.json"
elif [ -f "$_DESIGN_DIR/feedback-pending.json" ]; then
  echo "REGENERATE_RECEIVED"
  cat "$_DESIGN_DIR/feedback-pending.json"
  rm "$_DESIGN_DIR/feedback-pending.json"
else
  echo "NO_FEEDBACK_FILE"
fi
\`\`\`

feedback JSON の形:
\`\`\`json
{
  "preferred": "A",
  "ratings": { "A": 4, "B": 3, "C": 2 },
  "comments": { "A": "Love the spacing" },
  "overall": "Go with A, bigger CTA",
  "regenerated": false
}
\`\`\`

**\`feedback.json\` が見つかった場合:** user が board で Submit を click。
JSON から \`preferred\` / \`ratings\` / \`comments\` / \`overall\` を読む。 approved variant で継続。

**\`feedback-pending.json\` が見つかった場合:** user が board で Regenerate / Remix を click。
1. JSON から \`regenerateAction\` を読む (\`"different"\` / \`"match"\` / \`"more_like_B"\` / \`"remix"\` / custom text)
2. \`regenerateAction\` が \`"remix"\` なら \`remixSpec\` を読む (例: \`{"layout":"A","colors":"B"}\`)
3. 更新 brief で \`$D iterate\` / \`$D variants\` を使って新 variant を生成
4. 新 board を作る: \`$D compare --images "..." --output "$_DESIGN_DIR/design-board.html"\`
5. user の browser で board を reload (同じ tab):
   \`curl -s -X POST http://127.0.0.1:PORT/api/reload -H 'Content-Type: application/json' -d '{"html":"$_DESIGN_DIR/design-board.html"}'\`
6. board が auto-refresh。 **AskUserQuestion で再度** 同じ board URL を含めて待つ、 次の feedback round を。 \`feedback.json\` が現れるまで repeat。

**\`NO_FEEDBACK_FILE\` の場合:** user が board ではなく直接 AskUserQuestion response に preference を type した。 その text response を feedback として使う。

**POLLING FALLBACK:** polling は \`$D serve\` が failed した場合のみ (port 不可)。 その場合、 各 variant を Read tool で inline で見せる (user が見えるように)、 AskUserQuestion を使う:
「comparison board server の起動に失敗。 上に variant を見せました。 どれが好み？ feedback は？」。

**feedback 受信後 (どの path 経由でも):** 何を理解したか確認の summary を出力:

「あなたの feedback を以下のように理解しました:
PREFERRED: Variant [X]
RATINGS: [list]
YOUR NOTES: [comments]
DIRECTION: [overall]

これで合っていますか？」

進める前に AskUserQuestion で verify する。

**approved choice を保存:**
\`\`\`bash
echo '{"approved_variant":"<V>","feedback":"<FB>","date":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","screen":"<SCREEN>","branch":"'$(git branch --show-current 2>/dev/null)'"}' > "$_DESIGN_DIR/approved.json"
\`\`\``;
}

export function generateTasteProfile(ctx: TemplateContext): string {
  return `persistent taste profile があれば読む:

\`\`\`bash
_TASTE_PROFILE=~/.uzustack/projects/$SLUG/taste-profile.json
if [ -f "$_TASTE_PROFILE" ]; then
  # Schema v1: { dimensions: { fonts, colors, layouts, aesthetics }, sessions: [] }
  # 各 dimension に approved[] と rejected[] entry、
  # { value, confidence, approved_count, rejected_count, last_seen } を持つ
  # confidence は inactivity 1 週ごとに 5% decay — 読み取り時に計算される。
  cat "$_TASTE_PROFILE" 2>/dev/null | head -200
  echo "TASTE_PROFILE_FOUND"
else
  echo "NO_TASTE_PROFILE"
fi
\`\`\`

**TASTE_PROFILE_FOUND の場合:** 最強の signal を要約する (dimension あたり confidence * approved_count による top-3 approved entry)。 design brief に含める:

「過去 ${'\\${SESSION_COUNT}'} session の傾向から、 この user の taste は以下に傾いている:
fonts [top-3]、 colors [top-3]、 layouts [top-3]、 aesthetics [top-3]。 user が明示的に別 direction を要求しない限り、 これらに biased な生成。
強い rejection も避ける: [dimension あたり top-3 rejected]」。

**NO_TASTE_PROFILE の場合:** session 別 approved.json file (legacy) に fall through。

**Conflict handling:** 現 user request が strong persistent signal と矛盾する場合 (例: taste profile が minimal を強く好むのに 「make it playful」 と言う)、 flag する: 「Note: your taste profile strongly prefers minimal. 今回 playful を要求 — そのまま進めますが、 taste profile を update しますか、 それとも one-off として扱いますか？」。

**Decay:** confidence score は inactivity 1 週ごとに 5% decay。 6 ヶ月前に 10 approval された font は先週 approve された font より weight が少ない。 decay 計算は read 時、 write 時ではない、 ので file は変化時にのみ grow。

**Schema migration:** file に \`version\` field がない / \`version: 0\` なら、 legacy approved.json aggregate — \`${ctx.paths.binDir}/uzustack-taste-update\` が次回 write で schema v1 に migrate する。`;
}

// ─── UX Behavioral Foundations (Krug + HCI research) ───
export function generateUXPrinciples(_ctx: TemplateContext): string {
  return `## UX Principles: How Users Actually Behave

これらの principle は real human が interface とどう interact するかを支配する。 preference ではなく observed behavior。 全 design 判断の前、 最中、 後で適用する。

### The Three Laws of Usability (Krug)

1. **Don't make me think.** (ユーザーに考えさせるな) 全 page が self-evident であるべき。 user が立ち止まって 「何 click すればいい？」 「これは何を意味する？」 と思う時点で design は失敗している。 self-evident > self-explanatory > requires explanation。

2. **Clicks don't matter, thinking does.** (click 数は重要でない、 思考が重要) mindless で曖昧さのない 3 click は、 思考を要する 1 click を上回る。 各 step は obvious な choice (animal / vegetable / mineral) と感じるべきで、 puzzle ではない。

3. **Omit, then omit again.** (削れ、 また削れ) 各 page の word を半分にする、 残ったものをまた半分にする。 Happy talk (自画自賛 text) は死ね。 Instructions は死ね。 読む必要があるなら design は失敗している。

### How Users Actually Behave

- **Users scan, they don't read.** scanning 用に design: visual hierarchy (prominence = importance)、 明確に定義された area、 heading と bullet list、 key term の highlight。 我々は 60 mph で通り過ぎる billboard を design している、 人が studying する product brochure ではない。
- **Users satisfice.** (満足化する) best ではなく最初の reasonable option を pick する。 正しい choice を最も visible な choice にする。
- **Users muddle through.** (なんとなくやり過ごす) 物事の仕組みを figure out しない。 wing it (出たとこ勝負)。 偶然で goal を達成したら、 「right」 な way を探さない。 一旦動くものを見つけたら、 どんなに badly でも stick する。
- **Users don't read instructions.** dive in する。 guidance は brief / timely / unavoidable でないと見られない。

### Billboard Design for Interfaces

- **convention を使う。** Logo は top-left、 nav は top / left、 search は 虫眼鏡。 clever ぶって navigation を innovate しない。 better idea を KNOW している時のみ innovate、 それ以外は convention。 言語 / 文化を跨いでも web convention は logo / nav / search / main content を identify させる。
- **Visual hierarchy is everything.** 関連物は visually group。 nested 物は visually contain。 より重要 = より prominent。 全部 shout していれば何も聞こえない。 全ては visual noise、 innocent と証明されるまで guilty、 という assumption で start する。
- **Make clickable things obviously clickable.** discoverability を hover state に頼らない、 特に hover が存在しない mobile で。 Shape / location / formatting (color / underline) が interaction なしで clickability を signal する必要がある。
- **Eliminate noise.** noise の 3 source: 注意を奪い合う too many thing (shouting)、 logical でない organization (disorganization)、 too much stuff (clutter)。 noise は addition ではなく removal で fix する。
- **Clarity trumps consistency.** 何かを significantly clearer にするのに slightly inconsistent が必要なら、 毎回 clarity を choose。

### Navigation as Wayfinding

web 上の user は scale / direction / location の sense を持たない。 navigation は常に答える必要: これは何の site？ どの page？ major section は？ この level での option は？ 現在位置は？ どう search する？

全 page で persistent navigation。 deep hierarchy には breadcrumbs。 現 section を visually 示す。 「trunk test」: navigation 以外を全部覆う。 まだ site が何か、 どの page か、 major section が何かが分かるべき。 分からないなら navigation が失敗している。

### The Goodwill Reservoir

user は goodwill の reservoir (蓄え) を持って start する。 friction point ごとに減る。

**Deplete faster (速く減る):** user が欲しい情報 (price / contact / shipping) を Hide。 自分の way 通りでないと user を punish (phone number の format 要求)。 不要な情報を要求。 sizzle を path に置く (splash screen / forced tour / interstitial)。 Unprofessional / sloppy appearance。

**Replenish (補充):** user が何したいか知って obvious にする。 知りたいことを upfront で告げる。 可能な限り step を save。 error から recover しやすく。 迷ったら apologize。

### Mobile: Same Rules, Higher Stakes

全 rule は mobile でも適用、 ただし stake が higher。 real estate が scarce、 ただし space savings のために usability を sacrifice しない。 Affordance は VISIBLE であるべき: cursor がない = hover-to-discover ができない。 Touch target は big enough (44px minimum)。 Flat design は interactivity を signal する useful な visual information を strip する可能性。 ruthlessly に prioritize する: 急ぎで必要なものは close at hand、 それ以外は数 tap 先で obvious path 付きに。`;
}
