# Greptile Comment Triage

GitHub PR 上の Greptile review コメントを fetch / filter / classify する共有 reference。`/review`（Step 2.5）と `/ship`（Step 3.75）の両方が本 doc を参照する。

---

## Fetch

PR を検出してコメントを fetch する以下のコマンドを実行する。両 API call は並列に走る。

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null)
PR_NUMBER=$(gh pr view --json number --jq '.number' 2>/dev/null)
```

**いずれかが失敗または空：** Greptile triage を silent に skip。本 integration は additive — 無くても workflow は動く。

```bash
# 行レベルの review コメントと top-level PR コメントを並列 fetch
gh api repos/$REPO/pulls/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "greptile-apps[bot]") | select(.position != null) | {id: .id, path: .path, line: .line, body: .body, html_url: .html_url, source: "line-level"}' > /tmp/greptile_line.json &
gh api repos/$REPO/issues/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "greptile-apps[bot]") | {id: .id, body: .body, html_url: .html_url, source: "top-level"}' > /tmp/greptile_top.json &
wait
```

**API error または両 endpoint で Greptile コメントゼロ：** silent に skip。

行レベルコメントの `position != null` filter は、force-push されたコードからの outdated コメントを自動的に skip する。

---

## Suppressions Check

project 固有の history path を derive：
```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.claude/skills/uzustack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
PROJECT_HISTORY="$HOME/.uzustack/projects/$REMOTE_SLUG/greptile-history.md"
```

`$PROJECT_HISTORY` が存在すれば読む（per-project な suppressions）。各行は過去の triage 結果を記録：

```
<date> | <repo> | <type:fp|fix|already-fixed> | <file-pattern> | <category>
```

**カテゴリ**（固定 set）：`race-condition`、`null-check`、`error-handling`、`style`、`type-safety`、`security`、`performance`、`correctness`、`other`

各 fetched コメントを以下を満たす entry に対して match：
- `type == fp`（既知の偽陽性のみ suppress、過去に fix された real な issue は対象外）
- `repo` が現 repo に match
- `file-pattern` がコメントの file path に match
- `category` がコメントの issue type に match

match した comment は **SUPPRESSED** として skip。

history file が存在しない、または parse 不可な行があれば、その行を skip して continue — 不正な history file で決して fail しない。

---

## Classify

非 suppressed な各コメントについて：

1. **行レベルコメント:** 指定された `path:line` の file と周辺 context（±10 行）を読む
2. **Top-level コメント:** コメント body 全文を読む
3. コメントを full diff（`git diff origin/main`）と review checklist に対して cross-reference
4. 分類：
   - **VALID & ACTIONABLE** — 現コードに存在する real bug、race condition、security issue、correctness problem
   - **VALID BUT ALREADY FIXED** — branch 上の subsequent commit で対処済の real issue。fixing commit SHA を特定。
   - **FALSE POSITIVE** — コメントがコードを誤解、他で処理されているものを flag、または stylistic noise
   - **SUPPRESSED** — 上の suppressions check で既に filter

---

## Reply API

Greptile コメントに reply する際、コメント source に応じた endpoint を使う：

**行レベルコメント**（`pulls/$PR/comments` 由来）：
```bash
gh api repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies \
  -f body="<reply text>"
```

**Top-level コメント**（`issues/$PR/comments` 由来）：
```bash
gh api repos/$REPO/issues/$PR_NUMBER/comments \
  -f body="<reply text>"
```

**reply POST が fail した場合**（例：PR が close 済、write permission なし）：警告して continue。fail した reply で workflow を停止しない。

---

## Reply Template

全 Greptile reply にこれらの template を使う。常に具体的な evidence を含む — 曖昧な reply は決して post しない。

### Tier 1（First response） — friendly、evidence 込み

**FIXES（ユーザーが issue を fix することを選択）:**

```
**Fixed** in `<commit-sha>`.

\`\`\`diff
- <old problematic line(s)>
+ <new fixed line(s)>
\`\`\`

**Why:** <何が wrong だったか、fix がどう対処するかの 1 文説明>
```

**ALREADY FIXED（branch の prior commit で対処済）:**

```
**Already fixed** in `<commit-sha>`.

**What was done:** <既存 commit がこの issue にどう対処するかの 1-2 文>
```

**FALSE POSITIVE（コメントが間違っている）:**

```
**Not a bug.** <なぜ間違っているかを直接述べる 1 文>

**Evidence:**
- <pattern が安全/正しいことを示す具体的コード参照>
- <例：「nil check は `ActiveRecord::FinderMethods#find` が処理する、これは nil ではなく RecordNotFound を raise する」>

**Suggested re-rank:** これは `<style|noise|misread>` issue であり、`<Greptile が呼んだもの>` ではないと思われる。severity を下げることを検討してほしい。
```

### Tier 2（Greptile が prior reply 後に re-flag） — firm、overwhelming evidence

下記の escalation detection が同じ thread での先の uzustack reply を識別したときに Tier 2 を使う。議論を closing するため最大 evidence を含める。

```
**This has been reviewed and confirmed as [intentional/already-fixed/not-a-bug].**

\`\`\`diff
<変更または safe pattern を示す full diff>
\`\`\`

**Evidence chain:**
1. <safe pattern または fix を示す file:line permalink>
2. <該当する場合、対処された commit SHA>
3. <該当する場合、architecture rationale または design 決定>

**Suggested re-rank:** Please recalibrate — これは `<actual category>` issue であり `<claimed category>` ではない。[該当する file 変更 permalink へのリンク]
```

---

## Escalation Detection

reply を作成する前に、本コメント thread に prior uzustack reply が存在するか check：

1. **行レベルコメント:** `gh api repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies` で reply を fetch。任意の reply body に uzustack marker が含まれるか check：`**Fixed**`、`**Not a bug.**`、`**Already fixed**`。

2. **Top-level コメント:** Greptile コメント後に post された reply を fetched issue comments から scan、uzustack marker を含むかチェック。

3. **prior uzustack reply が存在し AND Greptile が同じ file+category に再度 post：** Tier 2（firm）template を使う。

4. **prior uzustack reply が存在しない:** Tier 1（friendly）template を使う。

escalation detection が fail（API error、曖昧 thread）した場合、Tier 1 に fallback。曖昧さで escalation しない。

---

## Severity Assessment & Re-ranking

コメント分類時に、Greptile の暗黙 severity が現実と合致しているかも assess する：

- Greptile が **security/correctness/race-condition** issue として flag したが、実際には **style/performance** nit な場合：reply に `**Suggested re-rank:**` を含め、category 訂正を求める。
- Greptile が低 severity の style issue を critical のように flag したら：reply で push back する。
- re-ranking が warranted な理由を常に具体的に — 意見ではなくコードと行番号を引用。

---

## History File 書き込み

書き込み前に両 directory が存在することを確保：
```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.claude/skills/uzustack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
mkdir -p "$HOME/.uzustack/projects/$REMOTE_SLUG"
mkdir -p ~/.uzustack
```

各 triage 結果につき **両** file（per-project は suppressions 用、global は retro 用）に 1 行 append：
- `~/.uzustack/projects/$REMOTE_SLUG/greptile-history.md`（per-project）
- `~/.uzustack/greptile-history.md`（global aggregate）

形式：
```
<YYYY-MM-DD> | <owner/repo> | <type> | <file-pattern> | <category>
```

例：
```
2026-03-13 | uzumaki-inc/myapp | fp | app/services/auth_service.rb | race-condition
2026-03-13 | uzumaki-inc/myapp | fix | app/models/user.rb | null-check
2026-03-13 | uzumaki-inc/myapp | already-fixed | lib/payments.rb | error-handling
```

---

## 出力形式

出力 header に Greptile summary を含める：
```
+ N Greptile comments (X valid, Y fixed, Z FP)
```

各分類済コメントについて、表示：
- 分類 tag：`[VALID]`、`[FIXED]`、`[FALSE POSITIVE]`、`[SUPPRESSED]`
- file:line 参照（行レベル）または `[top-level]`（top-level）
- 1 行 body summary
- Permalink URL（`html_url` field）
