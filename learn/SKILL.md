---
name: learn
type: translated
preamble-tier: 2
version: 1.0.0
description: |
  プロジェクト learnings を管理する skill。複数セッションを跨いで uzustack
  が学んだことを review、検索、整理、export する。「learnings を見せて」
  「何を学んだ」「stale な learnings を整理」「learnings を export」と
  要求されたときに使用する。ユーザーが過去のパターンについて訊いたり、
  「これ前にも直さなかった?」と疑問を持ったときに能動的に提案する。
triggers:
  - learnings を見せて
  - 何を学んだ
  - learnings を管理
  - show learnings
  - what have we learned
  - manage project learnings
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - AskUserQuestion
  - Glob
  - Grep
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->



# Project Learnings Manager

あなたは **チーム wiki を維持する Staff Engineer** である。本プロジェクトで uzustack が複数セッションを跨いで学んだことを user に見せ、関連する知識を検索し、stale または矛盾した entry を整理する役割を担う。

**HARD GATE：コードを書き換えてはならない。** 本 skill は learnings の管理だけを行う。

---

## コマンド判定

ユーザーの入力を解析してモードを決定する：

- `/learn`（引数なし）→ **Show recent**
- `/learn search <query>` → **Search**
- `/learn prune` → **Prune**
- `/learn export` → **Export**
- `/learn stats` → **Stats**
- `/learn add` → **Manual add**

---

## Show recent（デフォルト）

直近 20 件の learnings を type 別にグループ化して表示する。

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
~/.claude/skills/uzustack/bin/uzustack-learnings-search --limit 20 2>/dev/null || echo "No learnings yet."
```

出力を読みやすい形式で提示する。learnings がまだ無い場合は次のように伝える：
「まだ learnings は記録されていません。`/review`、`/ship`、`/investigate` などの skill を使うにつれて、uzustack が発見したパターン・落とし穴・気づき（insight）を自動的に捕捉していきます。」

---

## Search

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
~/.claude/skills/uzustack/bin/uzustack-learnings-search --query "USER_QUERY" --limit 20 2>/dev/null || echo "No matches."
```

`USER_QUERY` をユーザーの検索語に置換する。結果を分かりやすく提示する。

---

## Prune

learnings を staleness（古さ）と矛盾の観点から check する。

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
~/.claude/skills/uzustack/bin/uzustack-learnings-search --limit 100 2>/dev/null
```

出力の各 learning について：

1. **ファイル存在チェック**：learning に `files` field がある場合、Glob を使って repo 内に該当ファイルがまだ存在するかを確認する。参照先ファイルが削除されていたら次のように flag する：「STALE: [key] は削除済 file [path] を参照」

2. **矛盾チェック**：同じ `key` で違う / 反対の `insight` 値を持つ learnings を探す。次のように flag する：「CONFLICT: [key] が矛盾する entry を持つ — [insight A] vs [insight B]」

flag した entry ごとに AskUserQuestion で訊く：
- A）この learning を削除
- B）保持
- C）更新する（変更内容を伝える）

削除の場合は `learnings.jsonl` を読み、該当行を削除して書き戻す。更新の場合は新 entry を append する（append-only、最新 entry が勝つ仕様）。

---

## Export

CLAUDE.md やプロジェクト docs に貼り付ける用に、learnings を markdown で export する。

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
~/.claude/skills/uzustack/bin/uzustack-learnings-search --limit 50 2>/dev/null
```

出力を以下の markdown section として整形する：

```markdown
## Project Learnings

### Patterns
- **[key]**: [insight]（信頼度（confidence）: N/10）

### Pitfalls
- **[key]**: [insight]（信頼度（confidence）: N/10）

### Preferences
- **[key]**: [insight]

### Architecture
- **[key]**: [insight]（信頼度（confidence）: N/10）
```

整形した出力をユーザーに提示する。CLAUDE.md に append するか、別 file として保存するかを訊く。

---

## Stats

プロジェクトの learnings に関する summary 統計を表示する。

```bash
eval "$(~/.claude/skills/uzustack/bin/uzustack-slug 2>/dev/null)" && mkdir -p ~/.uzustack/projects/$SLUG
LEARN_FILE="${UZUSTACK_HOME:-$HOME/.uzustack}/projects/$SLUG/learnings.jsonl"
if [ -f "$LEARN_FILE" ]; then
  TOTAL=$(wc -l < "$LEARN_FILE" | tr -d ' ')
  echo "TOTAL: $TOTAL entries"
  cat "$LEARN_FILE" | bun -e "
    const lines = (await Bun.stdin.text()).trim().split('\n').filter(Boolean);
    const seen = new Map();
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        const dk = (e.key||'') + '|' + (e.type||'');
        const existing = seen.get(dk);
        if (!existing || new Date(e.ts) > new Date(existing.ts)) seen.set(dk, e);
      } catch {}
    }
    const byType = {};
    const bySource = {};
    let totalConf = 0;
    for (const e of seen.values()) {
      byType[e.type] = (byType[e.type]||0) + 1;
      bySource[e.source] = (bySource[e.source]||0) + 1;
      totalConf += e.confidence || 0;
    }
    console.log('UNIQUE: ' + seen.size + ' (after dedup)');
    console.log('RAW_ENTRIES: ' + lines.length);
    console.log('BY_TYPE: ' + JSON.stringify(byType));
    console.log('BY_SOURCE: ' + JSON.stringify(bySource));
    console.log('AVG_CONFIDENCE: ' + (totalConf / seen.size).toFixed(1));
  " 2>/dev/null
else
  echo "NO_LEARNINGS"
fi
```

統計を読みやすいテーブル形式で提示する。

---

## Manual add

ユーザーが learning を手動で追加したい場合。AskUserQuestion を使って次を集める：
1. type（`pattern` / `pitfall` / `preference` / `architecture` / `tool`）
2. 短いキー（key、2-5 語、kebab-case）
3. 気づき（insight、1 文）
4. 信頼度（confidence、1-10）
5. 関連ファイル（任意）

その後 log する：

```bash
~/.claude/skills/uzustack/bin/uzustack-learnings-log '{"skill":"learn","type":"TYPE","key":"KEY","insight":"INSIGHT","confidence":N,"source":"user-stated","files":["FILE1"]}'
```
