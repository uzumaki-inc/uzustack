---
name: claude
type: translated
preamble-tier: 3
version: 1.0.0
description: |
  Claude 以外のホストから Claude Code CLI を呼ぶ wrapper（3 mode）。
  レビューモード（Review mode）：`claude -p` で branch diff を独立に review。
  敵対モード（Challenge mode）：失敗モード重視の敵対的 review。
  相談モード（Consult mode）：read-only file tools で repo について Claude に相談。
  「claude review」「claude challenge」「claude に聞く」「Claude のセカンドオピニオン」
  「外部視点（Outside Voice）」と要求されたときに使用する。
triggers:
  - claude review
  - claude レビュー
  - claude challenge
  - claude 敵対モード
  - ask claude
  - claude に聞く
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->





# /claude — Claude による外部視点（Outside Voice）

あなたは Claude 以外のホストから `/claude` skill を実行している。これは `claude -p`
を wrap して、独立した Claude Code のセカンドオピニオンを得るためのものであり、
nested Claude にファイル変更を許可しない設計になっている。

生成される外部呼び出し名は `uzustack-claude` である。

---

## Step 0: Claude CLI の確認

```bash
CLAUDE_BIN=$(command -v claude 2>/dev/null || echo "")
[ -z "$CLAUDE_BIN" ] && echo "NOT_FOUND" || echo "FOUND: $CLAUDE_BIN"
```

`NOT_FOUND` の場合は停止し、ユーザーに伝える：
「Claude CLI が見つかりません。Claude Code をインストールしてから skill を再実行してください。」

認証確認：

```bash
if [ -f "$HOME/.claude/.credentials.json" ] || [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "AUTH_FOUND"
else
  echo "AUTH_MISSING"
fi
```

`AUTH_MISSING` の場合は停止し、ユーザーに伝える：
「Claude 認証が見つかりません。`claude` を対話的に実行してログインするか、`ANTHROPIC_API_KEY` を export してから skill を再実行してください。」

---

## 安全境界（Safety Boundary）

Nested Claude はユーザーの repository に focus を保ち、本 skill 内部から uzustack
の skill を呼び出してはならない。

すべての `claude -p` 呼び出しに以下を必ず付与する：

- `--disable-slash-commands`
- レビュー / 敵対モード：`--tools ""`
- 相談モード：`--allowedTools Read,Grep,Glob --disallowedTools Bash,Edit,Write`

本 skill では nested Claude に `Bash`、`Edit`、`Write` を渡してはならない。

すべての prompt は temp file に書き出し、stdin 経由で渡すこと。ユーザーのテキストを
シェルコマンドに直接 interpolate してはならない。

---

## Step 1: モード判定

ユーザー入力を解析する：

1. `/claude review` または `/claude review <instructions>` — **レビューモード**（Step 2A）
2. `/claude challenge` または `/claude challenge <focus>` — **敵対モード**（Step 2B）
3. `/claude` 引数なし、または `/claude <それ以外>` — **相談モード**（Step 2C）

モードが明確でなく、かつ diff が存在する場合は、レビュー / 敵対 / 相談のいずれかをユーザーに尋ねる。

---

## 共通ヘルパー

各モードで以下のシェルスニペットを使う。

Temp file の作成：

```bash
PROMPT_FILE=$(mktemp /tmp/uzustack-claude-prompt-XXXXXX)
RESP_FILE=$(mktemp /tmp/uzustack-claude-response-XXXXXX.json)
ERR_FILE=$(mktemp /tmp/uzustack-claude-error-XXXXXX.txt)
```

各モードの末尾でクリーンアップ：

```bash
rm -f "$PROMPT_FILE" "$RESP_FILE" "$ERR_FILE"
```

JSON 出力の parse：

```bash
python3 - "$RESP_FILE" <<'PY'
import json, sys
path = sys.argv[1]
try:
    obj = json.load(open(path))
except Exception as exc:
    print(f"CLAUDE_JSON_PARSE_ERROR: {exc}")
    sys.exit(0)

if obj.get("is_error"):
    print("CLAUDE_ERROR: true")

result = obj.get("result") or obj.get("response") or ""
if result:
    print(result)

usage = obj.get("usage") or {}
input_tokens = usage.get("input_tokens", 0) or 0
output_tokens = usage.get("output_tokens", 0) or 0
cache_read = usage.get("cache_read_input_tokens", 0) or 0
model = obj.get("model") or "unknown"
session_id = obj.get("session_id") or ""

print(f"\nTokens: input={input_tokens} output={output_tokens} cache_read={cache_read} | Model: {model}")
if session_id:
    print(f"SESSION_ID:{session_id}")
PY
```

stderr に `auth`、`login`、`unauthorized` が含まれる場合、ユーザーに伝える：
「Claude の認証に失敗しました。`claude` を対話的に実行して認証するか、`ANTHROPIC_API_KEY` を export してください。」

---

## Step 2A: レビューモード（Review mode）

現在の branch の diff を、tool-less モードの nested Claude に review させる。

1. base を fetch して diff を取得：

```bash
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
cd "$_REPO_ROOT"
DIFF_FILE=$(mktemp /tmp/uzustack-claude-diff-XXXXXX.patch)
git fetch origin <base> --quiet 2>/dev/null || true
git diff "origin/<base>" > "$DIFF_FILE" 2>/dev/null || git diff "<base>" > "$DIFF_FILE"
```

diff file が空の場合は停止して伝える：
「review 対象なし — base branch との差分がありません。」

2. prompt file を書く：

```bash
cat > "$PROMPT_FILE" <<'EOF'
あなたは brutally honest な Claude Code reviewer である。この git diff を、
バグ、本番障害モード、セキュリティ問題、テスト不足、保守性の問題の観点で review せよ。
直接的に。お世辞は不要。可能な限りファイル名と変更コードを参照すること。

ユーザーからの追加指示（あれば）：
<custom review instructions>

DIFF:
EOF
cat "$DIFF_FILE" >> "$PROMPT_FILE"
```

3. Claude を実行：

```bash
cat "$PROMPT_FILE" | claude -p --output-format json --disable-slash-commands --tools "" > "$RESP_FILE" 2>"$ERR_FILE"
```

4. parse 済み出力を提示：

```
CLAUDE SAYS (code review):
============================================================
<RESP_FILE から parse した結果>
============================================================
```

5. クリーンアップ：

```bash
rm -f "$DIFF_FILE" "$PROMPT_FILE" "$RESP_FILE" "$ERR_FILE"
```

---

## Step 2B: 敵対モード（Challenge mode）

tool-less モードの nested Claude に、敵対的な失敗モード review を実施させる。

1. レビューモードと同じ diff コマンドで diff を取得する。

2. prompt を書く：

```bash
cat > "$PROMPT_FILE" <<'EOF'
あなたは敵対的な Claude Code reviewer である。ユーザーが踏む前にこの変更を壊そうとせよ。
エッジケース、レースコンディション（race condition）、
セキュリティの穴、リソースリーク、サイレントなデータ破損、
不適切な error handling、運用上の失敗モードを見つけよ。
徹底的に。お世辞は不要。ユーザーが focus area を指定していれば、それを優先する。

Focus area（あれば）：
<focus>

DIFF:
EOF
cat "$DIFF_FILE" >> "$PROMPT_FILE"
```

3. Claude を実行：

```bash
cat "$PROMPT_FILE" | claude -p --output-format json --disable-slash-commands --tools "" > "$RESP_FILE" 2>"$ERR_FILE"
```

4. parse 済み出力を提示：

```
CLAUDE SAYS (adversarial challenge):
============================================================
<RESP_FILE から parse した結果>
============================================================
```

5. クリーンアップ：

```bash
rm -f "$DIFF_FILE" "$PROMPT_FILE" "$RESP_FILE" "$ERR_FILE"
```

---

## Step 2C: 相談モード（Consult mode）

repository について Claude に相談する。相談モードは file inspection が可能だが、
read-only tool に限定する。

1. 既存の Claude session を確認：

```bash
cat .context/claude-session-id 2>/dev/null || echo "NO_SESSION"
```

session が存在する場合、継続するか新規開始するかをユーザーに尋ねる。

2. prompt を書く：

```bash
cat > "$PROMPT_FILE" <<'EOF'
あなたは Claude Code として、この repository に対する独立した外部視点（Outside Voice）として振る舞う。
ユーザーの質問に直接答えよ。Read、Grep、Glob のみで repository ファイルを inspect してよい。
Bash は使うな。ファイルの edit / write はするな。slash command や uzustack の skill を呼ぶな。

USER QUESTION:
<user prompt>
EOF
```

3. Claude を実行する。

新規 session の場合：

```bash
cat "$PROMPT_FILE" | claude -p --output-format json --disable-slash-commands --allowedTools Read,Grep,Glob --disallowedTools Bash,Edit,Write > "$RESP_FILE" 2>"$ERR_FILE"
```

session を継続する場合：

```bash
cat "$PROMPT_FILE" | claude -p --resume "<session-id>" --output-format json --disable-slash-commands --allowedTools Read,Grep,Glob --disallowedTools Bash,Edit,Write > "$RESP_FILE" 2>"$ERR_FILE"
```

4. parse して session id を保存：

```bash
SESSION_ID=$(python3 - "$RESP_FILE" <<'PY'
import json, sys
try:
    obj = json.load(open(sys.argv[1]))
    print(obj.get("session_id") or "")
except Exception:
    print("")
PY
)
if [ -n "$SESSION_ID" ]; then
  mkdir -p .context
  printf "%s\n" "$SESSION_ID" > .context/claude-session-id
fi
```

5. parse 済み出力を提示：

```
CLAUDE SAYS (consult):
============================================================
<RESP_FILE から parse した結果>
============================================================
Session を保存しました — `/claude` を再実行すれば、この会話を継続できます。
```

6. クリーンアップ：

```bash
rm -f "$PROMPT_FILE" "$RESP_FILE" "$ERR_FILE"
```

---

## Error handling

- **Binary not found:** インストール手順を提示して停止。
- **認証なし:** ログイン / API key の手順を提示して停止。
- **stderr 由来の認証失敗:** stderr の該当行を表示し、ユーザーに再認証を依頼。
- **JSON parse 失敗:** `$RESP_FILE` の生 stdout と `$ERR_FILE` の stderr を表示。
- **空応答:** 「Claude が応答を返しませんでした。stderr でエラーを確認してください。」と伝える。
- **Resume 失敗:** `.context/claude-session-id` を削除し、新規 session で再試行。

---

## Important Rules

- nested Claude は相談モードでは read-only、レビュー / 敵対モードでは tool-less に保つこと。
- `--disable-slash-commands` を必ず付与すること。
- nested Claude に `Bash`、`Edit`、`Write` を渡してはならない。
- ユーザーのテキストをシェルコマンドに interpolate してはならない。
- Claude の応答を忠実に提示し、その後にホスト agent としての synthesis を続けること。
