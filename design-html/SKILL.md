---
name: design-html
type: translated
preamble-tier: 2
version: 1.0.0
description: |
  Design 仕上げ skill：production 品質の Pretext-native HTML/CSS を生成する。
  /design-shotgun の承認 mockup、/plan-ceo-review の CEO plan、/plan-design-review の
  design review context、またはユーザー記述の 0 から作る。text が実際に reflow し、
  height は計算され、layout は dynamic に動く。30KB overhead、zero deps。
  Smart API routing：design type ごとに最適な Pretext pattern を選ぶ。
  「design を finalize」「これを HTML にする」「page を作って」「この design を実装」、
  または planning skill の後に使用する。
  ユーザーが design を承認した、または plan が ready なときに積極的に提案する。(uzustack)
  Voice triggers (speech-to-text aliases): "build the design", "code the mockup", "make it real", "design を実装", "HTML にする".
triggers:
  - build the design
  - code the mockup
  - make design real
  - design を実装する
  - HTML 化する
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->



# /design-html: Pretext-Native HTML Engine

text が正しく動く production 品質の HTML を生成する。CSS の近似ではない。Pretext による
computed layout。text は resize で reflow し、height は content に合わせて adjust し、card は
self-size し、chat bubble は shrinkwrap し、editorial spread は obstacle 周りを flow する。







---

## Step 0: Input Detection

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)"
```

このプロジェクトに存在する design context を検出する。下の 4 check を全部走らせる：

```bash
setopt +o nomatch 2>/dev/null || true
_CEO=$(ls -t ~/.uzustack/projects/$SLUG/ceo-plans/*.md 2>/dev/null | head -1)
[ -n "$_CEO" ] && echo "CEO_PLAN: $_CEO" || echo "NO_CEO_PLAN"
```

```bash
setopt +o nomatch 2>/dev/null || true
_APPROVED=$(ls -t ~/.uzustack/projects/$SLUG/designs/*/approved.json 2>/dev/null | head -1)
[ -n "$_APPROVED" ] && echo "APPROVED: $_APPROVED" || echo "NO_APPROVED"
```

```bash
setopt +o nomatch 2>/dev/null || true
_VARIANTS=$(ls -t ~/.uzustack/projects/$SLUG/designs/*/variant-*.png 2>/dev/null | head -1)
[ -n "$_VARIANTS" ] && echo "VARIANTS: $_VARIANTS" || echo "NO_VARIANTS"
```

```bash
setopt +o nomatch 2>/dev/null || true
_FINALIZED=$(ls -t ~/.uzustack/projects/$SLUG/designs/*/finalized.html 2>/dev/null | head -1)
[ -n "$_FINALIZED" ] && echo "FINALIZED: $_FINALIZED" || echo "NO_FINALIZED"
[ -f DESIGN.md ] && echo "DESIGN_MD: exists" || echo "NO_DESIGN_MD"
```

検出に基づいて route する。次の case を順に check：

### Case A: approved.json が存在する（design-shotgun 実行済）

`APPROVED` が見つかったら読む。抽出：approved variant PNG path、user feedback、screen 名。
CEO plan が存在すれば併せて読む（strategic context が増える）。

repo root に `DESIGN.md` があれば読む。これらの token は system 単位の値（font、brand color、spacing scale）について priority を持つ。

prior な finalized.html の存在を確認。`FINALIZED` も見つかった場合 AskUserQuestion：
> 過去 session の finalized HTML が見つかった。**evolve**（既存の上に変更を適用、custom edit 保持）するか、**start fresh** するか？
> A) Evolve — iterate on the existing HTML
> B) Start fresh — regenerate from the approved mockup

evolve なら：既存 HTML を読む。Step 3 で変更を上に適用。
fresh または finalized.html 無しなら：approved PNG を visual reference として Step 1 へ進む。

### Case B: CEO plan / design variant あり、approved.json なし

`CEO_PLAN` または `VARIANTS` が見つかり `APPROVED` がない場合：

存在する context を読む：
- CEO plan あり：読んで product vision と design 要件を要約
- variant PNG あり：Read tool で inline 表示
- DESIGN.md あり：design token と制約を取得

AskUserQuestion：
> [/plan-ceo-review からの CEO plan / /plan-design-review からの design review variants / その両方] が見つかったが承認 design mockup はない。
> A) Run /design-shotgun — 既存 plan context を元に design variant を探索
> B) Skip mockups — plan context から直接 HTML を design
> C) I have a PNG — let me provide the path

A：ユーザーに `/design-shotgun` を実行してから `/design-html` に戻るよう伝える。
B：「plan-driven mode」で Step 1 へ進む。承認 PNG はなく plan が source of truth。出力 directory に使う screen 名（例：`landing-page`、`dashboard`、`pricing`）をユーザーに尋ねる。
C：ユーザーから PNG file path を受け取り reference として進める。

### Case C: 何も見つからない（clean slate）

上記いずれも context を生まない場合：

AskUserQuestion：
> このプロジェクト用の design context が見つからない。どう開始する？
> A) Run /plan-ceo-review first — design 前に product strategy を考え抜く
> B) Run /plan-design-review first — visual mockup 付きの design review
> C) Run /design-shotgun — visual design 探索に直行
> D) Just describe it — 欲しいものを伝えて、HTML を live で design

A / B / C：その skill を実行してから `/design-html` に戻るよう伝える。
D：「freeform mode」で Step 1 へ進む。screen 名をユーザーに尋ねる。

### Context summary

routing 後、簡潔な context summary を出力：
- **Mode:** approved-mockup | plan-driven | freeform | evolve
- **Visual reference:** 承認 PNG への path、または "none (plan-driven)" / "none (freeform)"
- **CEO plan:** path または "none"
- **Design tokens:** "DESIGN.md" または "none"
- **Screen name:** approved.json から / user 提供 / CEO plan から推論

---

## Step 1: Design 分析

1. `$D` 利用可能（`DESIGN_READY`）なら、構造化された implementation spec を抽出：
```bash
$D prompt --image <approved-variant.png> --output json
```
GPT-4o vision で color、typography、layout 構造、component inventory を返す。

2. `$D` 利用不可なら、Read tool で承認 PNG を inline で読む。visual layout / color / typography / component 構造を自分で記述する。

3. plan-driven または freeform mode（承認 PNG なし）の場合、context から design：
   - **Plan-driven:** CEO plan / design review note を読む。記述された UI 要件、user flow、target audience、visual feel（dark / light、dense / spacious）、content 構造（hero、feature、pricing 等）、design 制約を抽出する。visual reference ではなく plan の prose から implementation spec を組む。
   - **Freeform:** AskUserQuestion で何を build したいかを集める：purpose / audience、visual feel（dark / light、playful / serious、dense / spacious）、content 構造（hero、feature、pricing 等）、好きな reference site。
   どちらの場合も意図する visual layout / color / typography / component 構造を implementation spec として記述する。plan / user description に基づき realistic な content を生成する（lorem ipsum 禁止）。

4. `DESIGN.md` token を読む。これは extracted 値より system 単位 property（brand color、font family、spacing scale）について priority を持つ。

5. 「Implementation spec」summary を出力：color（hex）、font（family + weight）、spacing scale、component list、layout type。

---

## Step 2: Smart Pretext API Routing

承認 design を analyze し Pretext tier に分類する。各 tier は最適結果のため異なる Pretext API を使う：

| Design type | Pretext APIs | Use case |
|-------------|-------------|----------|
| Simple layout (landing, marketing) | `prepare()` + `layout()` | Resize-aware heights |
| Card/grid (dashboard, listing) | `prepare()` + `layout()` | Self-sizing cards |
| Chat/messaging UI | `prepareWithSegments()` + `walkLineRanges()` | Tight-fit bubbles, min-width |
| Content-heavy (editorial, blog) | `prepareWithSegments()` + `layoutNextLine()` | Text around obstacles |
| Complex editorial | Full engine + `layoutWithLines()` | Manual line rendering |

選んだ tier と理由を述べる。使う具体的な Pretext API を参照する。

---

## Step 2.5: Framework 検出

ユーザーの project が frontend framework を使っているか確認：

```bash
[ -f package.json ] && cat package.json | grep -o '"react"\|"svelte"\|"vue"\|"@angular/core"\|"solid-js"\|"preact"' | head -1 || echo "NONE"
```

framework 検出時、AskUserQuestion：
> [React/Svelte/Vue] が project で検出された。output format は？
> A) Vanilla HTML — self-contained preview file (recommended for first pass)
> B) [React/Svelte/Vue] component — framework-native with Pretext hooks

ユーザーが framework output を選んだら follow-up を 1 つ：
> A) TypeScript
> B) JavaScript

vanilla HTML：vanilla output で Step 3 へ進む。
framework output：framework 固有 pattern で Step 3 へ進む。
framework 未検出：vanilla HTML が default、質問不要。

---

## Step 3: Pretext-Native HTML を生成

### Pretext Source Embedding

**vanilla HTML output** の場合、vendored Pretext bundle を確認：
```bash
_PRETEXT_VENDOR=""
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -n "$_ROOT" ] && [ -f "$_ROOT/.claude/skills/uzustack/design-html/vendor/pretext.js" ] && _PRETEXT_VENDOR="$_ROOT/.claude/skills/uzustack/design-html/vendor/pretext.js"
[ -z "$_PRETEXT_VENDOR" ] && [ -f ~/.claude/skills/uzustack/design-html/vendor/pretext.js ] && _PRETEXT_VENDOR=~/.claude/skills/uzustack/design-html/vendor/pretext.js
[ -n "$_PRETEXT_VENDOR" ] && echo "VENDOR: $_PRETEXT_VENDOR" || echo "VENDOR_MISSING"
```

- `VENDOR` 発見：file を読み `<script>` tag に inline する。HTML file は zero network dependency で fully self-contained。
- `VENDOR_MISSING`：fallback として CDN import：
  `<script type="module">import { prepare, layout, prepareWithSegments, walkLineRanges, layoutNextLine, layoutWithLines } from 'https://esm.sh/@chenglou/pretext'</script>`
  comment を付ける：`<!-- FALLBACK: vendor/pretext.js missing, using CDN -->`

**framework output** の場合、project の dependency に追加：
```bash
# package manager 検出
[ -f bun.lockb ] && echo "bun add @chenglou/pretext" || \
[ -f pnpm-lock.yaml ] && echo "pnpm add @chenglou/pretext" || \
[ -f yarn.lock ] && echo "yarn add @chenglou/pretext" || \
echo "npm install @chenglou/pretext"
```
検出した install command を実行。component で標準 import を使う。

### HTML 生成

Write tool で single file を書く。保存先：
`~/.uzustack/projects/$SLUG/designs/<screen-name>-YYYYMMDD/finalized.html`

framework output の場合：
`~/.uzustack/projects/$SLUG/designs/<screen-name>-YYYYMMDD/finalized.[tsx|svelte|vue]`

**vanilla HTML には常に含める：**
- Pretext source（inline または CDN、上記参照）
- DESIGN.md / Step 1 抽出由来の design token を CSS custom property で
- Google Fonts を `<link>` tag + 最初の `prepare()` 前の `document.fonts.ready` gate で
- semantic HTML5（`<header>`、`<nav>`、`<main>`、`<section>`、`<footer>`）
- Pretext relayout による responsive 挙動（media query だけではない）
- 375px / 768px / 1024px / 1440px の breakpoint 別調整
- ARIA attribute、heading hierarchy、focus-visible state
- text element に `contenteditable` + edit 時に re-prepare + re-layout する MutationObserver
- container に ResizeObserver で resize 時に re-layout
- dark mode のための `prefers-color-scheme` media query
- animation respect のための `prefers-reduced-motion`
- mockup から抽出した real content（lorem ipsum 禁止）

**絶対含めない（AI slop blacklist）：**
- Purple/blue gradient を default に
- 一般的な 3-column feature grid
- visual hierarchy のない center-everything layout
- mockup にない decorative blob、wave、geometric pattern
- stock photo placeholder div
- mockup にない "Get Started" / "Learn More" 一般 CTA
- default component としての rounded-corner card + drop shadow
- visual element としての emoji
- 一般的な testimonial section
- 左 text 右 image の cookie-cutter hero section

### Pretext Wiring Patterns

Step 2 で選んだ tier に基づきこの pattern を使う。これらは正しい Pretext API 使用法。厳密に従うこと。

**Pattern 1: Basic height computation (Simple layout, Card/grid)**
```js
import { prepare, layout } from './pretext-inline.js'
// Or if inlined: const { prepare, layout } = window.Pretext

// 1. PREPARE — one-time, after fonts load
await document.fonts.ready
const elements = document.querySelectorAll('[data-pretext]')
const prepared = new Map()

for (const el of elements) {
  const text = el.textContent
  const font = getComputedStyle(el).font
  prepared.set(el, prepare(text, font))
}

// 2. LAYOUT — cheap, call on every resize
function relayout() {
  for (const [el, handle] of prepared) {
    const { height } = layout(handle, el.clientWidth, parseFloat(getComputedStyle(el).lineHeight))
    el.style.height = `${height}px`
  }
}

// 3. RESIZE-AWARE
new ResizeObserver(() => relayout()).observe(document.body)
relayout()

// 4. CONTENT-EDITABLE — re-prepare when text changes
for (const el of elements) {
  if (el.contentEditable === 'true') {
    new MutationObserver(() => {
      const font = getComputedStyle(el).font
      prepared.set(el, prepare(el.textContent, font))
      relayout()
    }).observe(el, { characterData: true, subtree: true, childList: true })
  }
}
```

**Pattern 2: Shrinkwrap / tight-fit containers (Chat bubbles)**
```js
import { prepareWithSegments, walkLineRanges } from './pretext-inline.js'

// Find the tightest width that produces the same line count
function shrinkwrap(text, font, maxWidth, lineHeight) {
  const segs = prepareWithSegments(text, font)
  let bestWidth = maxWidth
  walkLineRanges(segs, maxWidth, (lineCount, startIdx, endIdx) => {
    // walkLineRanges calls back with progressively narrower widths
    // The first call gives us the line count at maxWidth
    // We want the narrowest width that still produces this line count
  })
  // Binary search for tightest width with same line count
  const { lineCount: targetLines } = layout(prepare(text, font), maxWidth, lineHeight)
  let lo = 0, hi = maxWidth
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2
    const { lineCount } = layout(prepare(text, font), mid, lineHeight)
    if (lineCount === targetLines) hi = mid
    else lo = mid
  }
  return hi
}
```

**Pattern 3: Text around obstacles (Editorial layout)**
```js
import { prepareWithSegments, layoutNextLine } from './pretext-inline.js'

function layoutAroundObstacles(text, font, containerWidth, lineHeight, obstacles) {
  const segs = prepareWithSegments(text, font)
  let state = null
  let y = 0
  const lines = []

  while (true) {
    // Calculate available width at current y position, accounting for obstacles
    let availWidth = containerWidth
    for (const obs of obstacles) {
      if (y >= obs.top && y < obs.top + obs.height) {
        availWidth -= obs.width
      }
    }

    const result = layoutNextLine(segs, state, availWidth, lineHeight)
    if (!result) break

    lines.push({ text: result.text, width: result.width, x: 0, y })
    state = result.state
    y += lineHeight
  }

  return { lines, totalHeight: y }
}
```

**Pattern 4: Full line-by-line rendering (Complex editorial)**
```js
import { prepareWithSegments, layoutWithLines } from './pretext-inline.js'

const segs = prepareWithSegments(text, font)
const { lines, height } = layoutWithLines(segs, containerWidth, lineHeight)

// lines = [{ text, width, x, y }, ...]
// Use for Canvas/SVG rendering or custom DOM positioning
for (const line of lines) {
  const span = document.createElement('span')
  span.textContent = line.text
  span.style.position = 'absolute'
  span.style.left = `${line.x}px`
  span.style.top = `${line.y}px`
  container.appendChild(span)
}
```

### Pretext API Reference

```
PRETEXT API CHEATSHEET:

prepare(text, font) → handle
  One-time text measurement. Call after document.fonts.ready.
  Font: CSS shorthand like '16px Inter' or 'bold 24px Georgia'.

layout(prepared, maxWidth, lineHeight) → { height, lineCount }
  Fast layout computation. Call on every resize. Sub-millisecond.

prepareWithSegments(text, font) → handle
  Like prepare() but enables line-level APIs below.

layoutWithLines(segs, maxWidth, lineHeight) → { lines: [{text, width, x, y}...], height }
  Full line-by-line breakdown. For Canvas/SVG rendering.

walkLineRanges(segs, maxWidth, onLine) → void
  Calls onLine(lineCount, startIdx, endIdx) for each possible layout.
  Find minimum width for N lines. For tight-fit containers.

layoutNextLine(segs, state, maxWidth, lineHeight) → { text, width, state } | null
  Iterator. Different maxWidth per line = text around obstacles.
  Pass null as initial state. Returns null when text is exhausted.

clearCache() → void
  Clears internal measurement caches. Use when cycling many fonts.

setLocale(locale?) → void
  Retargets word segmenter for future prepare() calls.
```

---

## Step 3.5: Live Reload Server

HTML file 書き出し後、live preview 用に simple HTTP server を起動：

```bash
# 出力 directory で simple HTTP server 起動
_OUTPUT_DIR=$(dirname <path-to-finalized.html>)
cd "$_OUTPUT_DIR"
python3 -m http.server 0 --bind 127.0.0.1 &
_SERVER_PID=$!
_PORT=$(lsof -i -P -n | grep "$_SERVER_PID" | grep LISTEN | awk '{print $9}' | cut -d: -f2 | head -1)
echo "SERVER: http://localhost:$_PORT/finalized.html"
echo "PID: $_SERVER_PID"
```

python3 がない場合、fallback：
```bash
open <path-to-finalized.html>
```

ユーザーに伝える：「Live preview running at http://localhost:$_PORT/finalized.html. After each edit, just refresh the browser (Cmd+R) to see changes.」

refinement loop が exit する（Step 4 終了時）と server を kill：
```bash
kill $_SERVER_PID 2>/dev/null || true
```

---

## Step 4: Preview + Refinement Loop

### Verification Screenshots

`$B` 利用可能（browse バイナリ）なら 3 viewport で verification screenshot：

```bash
$B goto "file://<path-to-finalized.html>"
$B screenshot /tmp/uzustack-verify-mobile.png --width 375
$B screenshot /tmp/uzustack-verify-tablet.png --width 768
$B screenshot /tmp/uzustack-verify-desktop.png --width 1440
```

3 つの screenshot を Read tool で inline 表示。確認すべきもの：
- text overflow（text が cut off / container を越えている）
- layout collapse（element が overlap / 不在）
- responsive breakage（content が viewport に adapt していない）

問題があれば note し、ユーザーに見せる前に直す。

`$B` 利用不可なら verification を skip し、note：
「Browse binary not available. Skipping automated viewport verification.」

### Refinement Loop

```
LOOP:
  1. server が起動中ならユーザーに http://localhost:PORT/finalized.html を開くよう伝える
     そうでなければ：open <path>/finalized.html

  2. 承認 mockup PNG が存在するなら inline 表示（Read tool）で visual 比較
     plan-driven / freeform mode ならこの step を skip

  3. AskUserQuestion（mode に応じて wording 調整）：
     mockup 付き：「The HTML is live in your browser. Here's the approved mockup for comparison.
      Try: resize the window (text should reflow dynamically),
      click any text (it's editable, layout recomputes instantly).
      What needs to change? Say 'done' when satisfied.」
     mockup なし：「The HTML is live in your browser. Try: resize the window
      (text should reflow dynamically), click any text (it's editable, layout
      recomputes instantly). What needs to change? Say 'done' when satisfied.」

  4. "done" / "ship it" / "looks good" / "perfect" → exit loop、Step 5 へ

  5. HTML file に対して targeted Edit tool で feedback を適用する
     （file 全体を regenerate しない — surgical edit のみ）

  6. 何が変わったかの brief summary（最大 2-3 行）

  7. verification screenshot 利用可能なら fix を確認するため re-take

  8. LOOP へ
```

最大 10 iteration。10 後もユーザーが "done" と言わない場合 AskUserQuestion：
「We've done 10 rounds of refinement. Want to continue iterating or call it done?」

---

## Step 5: Save & Next Steps

### Design Token 抽出

repo root に `DESIGN.md` がない場合、生成 HTML から作成を提案：

HTML から抽出：
- CSS custom property（color、spacing、font size）
- 使用 font family と weight
- color palette（primary、secondary、accent、neutral）
- spacing scale
- border radius value
- shadow value

AskUserQuestion：
> DESIGN.md が見つからない。今 build した HTML から design token を抽出して project 用の DESIGN.md を作れる。
> これにより以降の /design-shotgun や /design-html 実行が automatic に style-consistent になる。
> A) Create DESIGN.md from these tokens
> B) Skip — I'll handle the design system later

A：抽出 token で `DESIGN.md` を repo root に書く。

### Metadata 保存

HTML 横に `finalized.json` を書く：
```json
{
  "source_mockup": "<approved variant PNG path or null>",
  "source_plan": "<CEO plan path or null>",
  "mode": "<approved-mockup|plan-driven|freeform|evolve>",
  "html_file": "<path to finalized.html or component file>",
  "pretext_tier": "<selected tier>",
  "framework": "<vanilla|react|svelte|vue>",
  "iterations": <number of refinement iterations>,
  "date": "<ISO 8601>",
  "screen": "<screen name>",
  "branch": "<current branch>"
}
```

### 次のアクション

AskUserQuestion：
> Pretext-native layout で design 完了。次は？
> A) Copy to project — codebase に HTML/component を copy
> B) Iterate more — refinement を続ける
> C) Done — reference として使う

---

## Important Rules

- **code の優雅さより source of truth の忠実さ。** 承認 mockup がある場合 pixel-match。CSS grid class ではなく `width: 312px` が必要なら、それが正解。plan-driven / freeform mode の場合、refinement loop でのユーザーの feedback が source of truth。code cleanup は後の component 抽出時に行う。

- **常に Pretext を text layout に使う。** design が simple に見えても、Pretext は resize 時の正しい height computation を保証する。overhead は 30KB。すべての page で benefit がある。

- **refinement loop では surgical edit。** Edit tool で targeted な変更、Write tool で file 全体 regenerate しない。ユーザーが contenteditable 経由で manual edit している可能性があり、それを保持すべき。

- **real content のみ。** mockup がある時は text を抽出。plan-driven mode では plan の content。freeform mode ではユーザー記述に基づき realistic な content を生成。「Lorem ipsum」「Your text here」「placeholder content」を絶対使わない。

- **1 invocation で 1 page。** multi-page design では `/design-html` を page ごとに 1 回ずつ実行。各実行で 1 つの HTML file を作る。
