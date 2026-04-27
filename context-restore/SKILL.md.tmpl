---
name: context-restore
type: translated
version: 1.0.0
description: |
  `/context-save` で保存した作業 context を復元する skill。デフォルトで（全ブランチを跨いで）
  最新の保存 state をロードし、別ブランチ・別 worktree・別マシンへの持ち越しでも作業を再開できるようにする。
  「再開」「前回の続き」「どこまでやってた」「context restore」「context-restore」
  と要求されたときに使用する。pair で `/context-save` を使う。
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - 再開
  - 前回の続き
  - どこまでやってた
  - context restore
  - context-restore
---

# /context-restore — 保存済み context を復元

あなたは **同僚の丁寧なセッションノートを読んで、その人がやめたところから完全に再開する Staff Engineer** である。最新の保存 context をロードし、ユーザーが途切れなく作業を再開できるよう、明瞭に提示する。

**HARD GATE：コードを書き換えてはならない。** 本 skill は保存 context ファイルを読んで要約を提示するだけ。

**デフォルト：全ブランチを跨いで最新の保存 context をロードする。** これは `/context-save list` のデフォルト挙動（現ブランチのみ）と意図的に異なる。`/context-restore` は別ブランチ・別 worktree・別マシンへの持ち越し用 — あるブランチで保存した context を別ブランチから復元できる。

**候補集合をブランチでフィルタしない。** それは `list` フローの仕事。`/context-restore` はやらない。

---

## コマンド判定

ユーザーの入力を解析する：

- `/context-restore` → 最新の保存 context をロード（全ブランチから）
- `/context-restore <タイトル断片または番号>` → 特定の保存 context をロード
- `/context-restore list` → ユーザーに「`/context-save list` を使ってください — 一覧は保存側にあります」と伝えて exit。本 skill ではモード判定しない。

---

## 復元フロー

### Step 1：保存済み context を探す

```bash
SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || basename "$(pwd)")
CHECKPOINT_DIR="$HOME/.uzustack/projects/$SLUG/checkpoints"
if [ ! -d "$CHECKPOINT_DIR" ]; then
  echo "NO_CHECKPOINTS"
else
  # ls -1t ではなく find + sort を使う。理由は 2 つ：
  # 1. 正規順序はファイル名 YYYYMMDD-HHMMSS prefix（コピー / rsync 後も安定）。
  #    ファイルシステムの mtime はドリフトするので authoritative ではない。
  # 2. macOS で `find ... | xargs ls -1t` が空結果になると cwd を ls する fallback が走る。
  #    `sort -r` は空入力でクリーンに何も返さない。
  # 直近 20 件に cap：1 万個保存しているユーザーが context window を吹き飛ばさないように。
  # /context-save list がページネーションを処理する。
  FILES=$(find "$CHECKPOINT_DIR" -maxdepth 1 -name "*.md" -type f 2>/dev/null | sort -r | head -20)
  if [ -z "$FILES" ]; then
    echo "NO_CHECKPOINTS"
  else
    echo "$FILES"
  fi
fi
```

**候補は dir 内の全 `.md` ファイルを含む（ブランチに関係なく）** — ブランチは frontmatter に記録されていて、ここではフィルタには使わない。これが別ブランチ・別 worktree・別マシンへの持ち越しを可能にする。

### Step 2：正しいファイルをロードする

- ユーザーがタイトル断片または番号を指定した場合：候補の中からマッチするファイルを見つける。
- そうでなければ：**上の `sort -r` が返した最初のファイル** をロードする — 最新の `YYYYMMDD-HHMMSS` prefix、つまり正規の「最新」。

選んだファイルを読んで要約を提示する。タイトル表示は frontmatter の `title_raw` を優先し、無ければファイル名から取る（タイムスタンプ以降の部分、後方互換）。日本語タイトルは file 名で `untitled` に潰れているケースが多いので、`title_raw` がある場合は必ずそちらを使う：

```
CONTEXT 復元中
════════════════════════════════════════
タイトル：　 {title_raw 優先、なければ filename 由来}
ブランチ：　 {frontmatter のブランチ}
保存日時：　 {timestamp、人間可読}
所要時間：　 前回セッションは {formatted duration}（取得できた場合）
状態：　　　 {status}
════════════════════════════════════════

### Summary
{保存ファイルの summary}

### Remaining Work
{残作業項目}

### Notes
{メモ}
```

現ブランチが保存 context のブランチと違う場合は、そのことを伝える：「この context はブランチ `{branch}` で保存されました。あなたは現在 `{現ブランチ}` にいます。続行する前にブランチを切り替えたい場合があります。」

### Step 3：次の手順を提示する

提示後、AskUserQuestion で訊く：

- A）残作業項目を続ける
- B）保存ファイル全体を表示する
- C）context が知りたかっただけ、ありがとう

A の場合、最初の残作業項目を要約してそこから始めることを提案する。

---

## 保存済み context が存在しない場合

Step 1 で `NO_CHECKPOINTS` が出力された場合、ユーザーに次のように伝える：

「保存済み context がありません。まず `/context-save` で現在の作業 state を保存してください。その後 `/context-restore` で見つかります。」

---

## 重要なルール

- **コードを書き換えない。** 本 skill は保存ファイルを読んで提示するだけ。
- **デフォルトで全ブランチを横断して検索する。** ブランチを跨いだ復元が本 skill の本質。タイトル断片マッチがたまたまブランチ固有になる場合のみ、結果としてブランチでフィルタされる。
- **「最新」とはファイル名 `YYYYMMDD-HHMMSS` prefix のこと**、`ls -1t`（ファイルシステム mtime）ではない。ファイル名はファイルシステム操作後も安定、mtime はそうではない。
