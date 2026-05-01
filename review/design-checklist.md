# Design Review Checklist (Lite)

> **DESIGN_METHODOLOGY のサブセット** — 本ファイルに項目を追加する際、`scripts/gen-skill-docs.ts` の `generateDesignMethodology()` も update する（逆も同様）。

## Instructions

本 checklist は **diff 内のソースコード** に適用する — render された出力ではない。変更された frontend file（diff hunk だけでなく full file）を読み、anti-pattern を flag する。

**Trigger:** diff が frontend file に触れている場合のみ本 checklist を走らせる。`uzustack-diff-scope` で検出：

```bash
source <(~/.claude/skills/uzustack/bin/uzustack-diff-scope <base> 2>/dev/null)
```

`SCOPE_FRONTEND=false` なら、design review 全体を silent に skip。

**DESIGN.md calibration:** repo root に `DESIGN.md` または `design-system.md` が存在すれば、最初に読む。全 findings は project の宣言された design system に対して calibrate される。DESIGN.md で明示的に bless された pattern は flag **しない**。DESIGN.md が無ければ universal な design 原則を使う。

---

## Confidence Tier

各項目は検出 confidence level で tag される：

- **[HIGH]** — grep / pattern match で確実に検出可能。確定的 findings。
- **[MEDIUM]** — pattern aggregation や heuristic で検出可能。findings として flag するが、ノイズあり想定。
- **[LOW]** — visual intent の理解が必要。提示形式："Possible issue — visually に検証するか /design-review を走らせる。"

---

## 分類

**AUTO-FIX**（mechanical な CSS fix のみ — HIGH confidence、design judgment 不要）:
- replacement なしの `outline: none` → `outline: revert` または `&:focus-visible { outline: 2px solid currentColor; }` を追加
- 新 CSS の `!important` → 削除して specificity を fix
- body text の `font-size` < 16px → 16px に bump

**ASK**（それ以外全て — design judgment が必要）:
- AI slop findings 全て、typography 構造、spacing 選択、interaction state gap、DESIGN.md 違反

**LOW confidence 項目** → "Possible: [description]. Visually に検証するか /design-review を走らせる。" で提示。AUTO-FIX しない。

---

## 出力形式

```
Design Review: N issues (X auto-fixable, Y need input, Z possible)

**AUTO-FIXED:**
- [file:line] Problem → fix applied

**NEEDS INPUT:**
- [file:line] Problem description
  Recommended fix: suggested fix

**POSSIBLE (verify visually):**
- [file:line] Possible issue — verify with /design-review
```

任意：`test_stub` — 本 finding に対する project の test framework を使った skeleton test code。

issue が無ければ：`Design Review: No issues found.`

frontend file が変更されていなければ：silent に skip、出力なし。

---

## カテゴリ

### 1. AI Slop 検出（6 項目） — 最優先

これらは respected studio の designer が ship しない、AI 生成 UI の telltale sign である。

- **[MEDIUM]** Purple/violet/indigo の gradient background、または blue-to-purple の color scheme。`#6366f1`–`#8b5cf6` 範囲の値を持つ `linear-gradient`、または purple/violet に解決される CSS custom property を探す。

- **[LOW]** 3-column feature grid：colored circle 内の icon + 太字 title + 2 行 description が対称に 3x 繰り返される pattern。grid/flex container でちょうど 3 children を持ち、各 child が circular element + heading + paragraph を含むものを探す。

- **[HIGH]** section 装飾として colored circle 内の icon。`border-radius: 50%` + 装飾 container として使われる icon 用 background color を持つ要素を探す。

- **[HIGH]** 全て中央寄せ：全 heading、description、card に `text-align: center`。`text-align: center` の密度を grep — text container の >60% が center alignment を使っていれば flag。

- **[MEDIUM]** 全要素に uniform に bubbly な border-radius：card、button、input、container 全てに同じ大きい radius（16px+）が一律適用。`border-radius` 値を aggregate — >80% が同値 ≥16px を使っていれば flag。

- **[MEDIUM]** Generic な hero copy："Welcome to [X]"、"Unlock the power of..."、"Your all-in-one solution for..."、"Revolutionize your..."、"Streamline your workflow"。HTML/JSX content をこれらの pattern で grep。

### 2. Typography（4 項目）

- **[HIGH]** Body text の `font-size` < 16px。`body`、`p`、`.text`、または base style の `font-size` 宣言を grep。16px 未満（base が 16px なら 1rem 未満）の値は flag。

- **[HIGH]** diff で 3 を超える font family 導入。distinct な `font-family` 宣言を数える。変更された file 全体で 3 を超える unique family が現れたら flag。

- **[HIGH]** Heading hierarchy の level skip：同じ file/component 内で `h1` の後に `h2` 無く `h3`。HTML/JSX で heading tag を check。

- **[HIGH]** Blacklist された font：Papyrus、Comic Sans、Lobster、Impact、Jokerman。`font-family` をこれらの名前で grep。

### 3. Spacing & Layout（4 項目）

- **[MEDIUM]** DESIGN.md が spacing scale を指定する場合、4px / 8px scale でない arbitrary spacing 値。`margin`、`padding`、`gap` 値を宣言された scale に対して check。DESIGN.md が scale を define している場合のみ flag。

- **[MEDIUM]** responsive 処理なしの fixed width：container に `width: NNNpx`、`max-width` も `@media` breakpoint も無い。mobile で水平 scroll の risk。

- **[MEDIUM]** text container に `max-width` 欠落：body text や paragraph container に `max-width` が設定されておらず、行が >75 文字になる。text wrapper の `max-width` を check。

- **[HIGH]** 新 CSS rule の `!important`。追加行で `!important` を grep。ほぼ常に specificity の escape hatch であり、適切に fix されるべき。

### 4. Interaction State（3 項目）

- **[MEDIUM]** Interactive element（button、link、input）に hover/focus state 欠落。新 interactive element style に `:hover` と `:focus` または `:focus-visible` の pseudo-class が存在するか check。

- **[HIGH]** `outline: none` または `outline: 0` で replacement focus indicator なし。`outline:\s*none` または `outline:\s*0` を grep。これは keyboard accessibility を奪う。

- **[LOW]** Interactive element の touch target < 44px。button と link の `min-height`/`min-width`/`padding` を check。複数 property から effective size を計算する必要があり — コードのみでは low confidence。

### 5. DESIGN.md 違反（3 項目、conditional）

`DESIGN.md` または `design-system.md` が存在する場合のみ適用：

- **[MEDIUM]** 宣言された palette に無い color。変更 CSS の color 値を DESIGN.md で define された palette と比較。

- **[MEDIUM]** 宣言された typography section に無い font。`font-family` 値を DESIGN.md の font list と比較。

- **[MEDIUM]** 宣言された scale 外の spacing 値。`margin`/`padding`/`gap` 値を DESIGN.md の spacing scale と比較。

---

## Suppressions

flag しない：
- DESIGN.md で意図的選択として明示的に documented された pattern
- Third-party / vendor CSS file（node_modules、vendor directory）
- CSS reset や normalize stylesheet
- Test fixture file
- Generated / minified CSS
