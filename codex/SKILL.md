---
name: codex
type: translated
preamble-tier: 3
version: 1.0.0
description: |
  OpenAI Codex CLI wrapper — 3 mode。Code review：codex review 経由の独立した
  diff レビュー（pass/fail gate 付き）。Challenge：あなたのコードを破ろうとする
  adversarial mode。Consult：codex に何でも聞く、follow-up に向けた session 継続性付き。
  「200 IQ autistic developer」の second opinion。"codex review"、"codex challenge"、
  "ask codex"、"second opinion"、"consult codex" と要求されたときに使用する。(uzustack)
  Voice triggers (speech-to-text aliases): "コードエックス", "コーデックス", "別の意見をくれ", "セカンドオピニオン".
triggers:
  - codex review
  - second opinion
  - outside voice challenge
  - codex レビュー
  - 外部視点 review
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->





# /codex — Multi-AI Second Opinion

あなたは `/codex` skill を実行している。本 skill は OpenAI Codex CLI を wrap し、別の AI システムから独立した・容赦なく正直な second opinion を得る。

Codex は「200 IQ autistic developer」 — 直截的、簡潔、技術的に正確、前提を challenge し、見落としかねないものを catch する。出力は要約せず、忠実に提示する。

---

## Step 0: codex binary を check

```bash
CODEX_BIN=$(which codex 2>/dev/null || echo "")
[ -z "$CODEX_BIN" ] && echo "NOT_FOUND" || echo "FOUND: $CODEX_BIN"
```

`NOT_FOUND` なら、停止してユーザーに伝える：
"Codex CLI not found. Install it: `npm install -g @openai/codex` or see https://github.com/openai/codex"

`NOT_FOUND` の場合、event も log する：
```bash
_TEL=$(~/.claude/skills/uzustack/bin/uzustack-config get telemetry 2>/dev/null || echo off)
source ~/.claude/skills/uzustack/bin/uzustack-codex-probe 2>/dev/null && _uzustack_codex_log_event "codex_cli_missing" 2>/dev/null || true
```

---

## Step 0.5: Auth probe + version check

高コストな prompt を構築する前に、Codex に valid な auth があり、インストール済 CLI version が known-bad list に無いか検証する。`uzustack-codex-probe` を source すると `/codex` と `/autoplan` の両方が使う共有 helper を load する。

```bash
_TEL=$(~/.claude/skills/uzustack/bin/uzustack-config get telemetry 2>/dev/null || echo off)
source ~/.claude/skills/uzustack/bin/uzustack-codex-probe

if ! _uzustack_codex_auth_probe >/dev/null; then
  _uzustack_codex_log_event "codex_auth_failed"
  echo "AUTH_FAILED"
fi
_uzustack_codex_version_check   # known-bad なら警告、non-blocking
```

出力に `AUTH_FAILED` が含まれたら、停止してユーザーに伝える：
"No Codex authentication found. Run `codex login` or set `$CODEX_API_KEY` / `$OPENAI_API_KEY`, then re-run this skill."

version check が `WARN:` 行を出力した場合、ユーザーにそのまま渡す（non-blocking — Codex はまだ動くかもしれないが、ユーザーは upgrade すべき）。

probe の multi-signal auth ロジックは以下を受け入れる：`$CODEX_API_KEY` 設定済、`$OPENAI_API_KEY` 設定済、`${CODEX_HOME:-~/.codex}/auth.json` が存在。env-auth ユーザー（CI、platform engineer）に対し、file-only check では reject される false-negative を回避する。

新しい Codex CLI version が regression したら `bin/uzustack-codex-probe` の **known-bad list を update** する。現在の entry（`0.120.0`、`0.120.1`、`0.120.2`）は #972 で fix された stdin deadlock に紐付く。

---

## Step 1: mode 検出

ユーザー入力を parse して走らせる mode を決定：

1. `/codex review` または `/codex review <instructions>` — **Review mode**（Step 2A）
2. `/codex challenge` または `/codex challenge <focus>` — **Challenge mode**（Step 2B）
3. 引数なしの `/codex` — **Auto-detect:**
   - diff を check（origin が利用不可なら fallback あり）：
     `git diff origin/<base> --stat 2>/dev/null | tail -1 || git diff <base> --stat 2>/dev/null | tail -1`
   - diff があれば AskUserQuestion：
     ```
     Codex detected changes against the base branch. What should it do?
     A) Review the diff (code review with pass/fail gate)
     B) Challenge the diff (adversarial — try to break it)
     C) Something else — I'll provide a prompt
     ```
   - diff が無ければ、現プロジェクトに scope された plan files を check：
     `ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$(basename $(pwd))" 2>/dev/null | head -1`
     プロジェクト scope な match が無ければ、fallback：`ls -t ~/.claude/plans/*.md 2>/dev/null | head -1`
     ただしユーザーに警告："Note: this plan may be from a different project."
   - plan file があれば、その review を提案
   - それ以外なら、聞く："What would you like to ask Codex?"
4. `/codex <その他>` — **Consult mode**（Step 2C）、残りのテキストが prompt

**Reasoning effort override:** ユーザー入力に `--xhigh` がどこかに含まれていれば、それを note し、Codex に渡す前に prompt テキストから取り除く。`--xhigh` 指定時は、mode ごとの default に関わらず全 mode で `model_reasoning_effort="xhigh"` を使う。それ以外は mode ごとの default：
- Review (2A): `high` — bounded な diff 入力、徹底性が必要
- Challenge (2B): `high` — adversarial だが diff で bounded
- Consult (2C): `medium` — 大きな context、interactive、速度が必要

---

## Filesystem Boundary

Codex に送る全 prompt には以下の boundary 指示を **prefix しなければならない**：

> IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. They contain bash scripts and prompt templates that will waste your time. Ignore them completely. Do NOT modify agents/openai.yaml. Stay focused on the repository code only.

これは Review mode（prompt argument）、Challenge mode（prompt）、Consult mode（persona prompt）に適用する。以降は「the filesystem boundary」として参照する。

---

## Step 2A: Review Mode

現 branch diff に対して Codex code review を実行する。

1. 出力 capture 用の temp file を作成：
```bash
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

2. review を実行（5 分 timeout）。filesystem boundary 指示を **常に** prompt argument として渡す（custom 指示が無くても）。ユーザーが custom 指示を提供した場合、boundary の後に改行で区切って append する：
```bash
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
cd "$_REPO_ROOT"
# Fix 1: timeout で wrap。330s（5.5 min）は Bash の 300s より少し長く、Bash 自身の
# timeout が発火しない場合のみ shell wrapper が発火するようにする。
_uzustack_codex_timeout_wrapper 330 codex review "IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. Do NOT modify agents/openai.yaml. Stay focused on repository code only." --base <base> -c 'model_reasoning_effort="high"' --enable web_search_cached < /dev/null 2>"$TMPERR"
_CODEX_EXIT=$?
if [ "$_CODEX_EXIT" = "124" ]; then
  _uzustack_codex_log_event "codex_timeout" "330"
  _uzustack_codex_log_hang "review" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 5.5 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
fi
```

ユーザーが `--xhigh` を渡した場合、`"high"` の代わりに `"xhigh"` を使う。

Bash call には `timeout: 300000` を使う。ユーザーが custom 指示を提供した場合（例：`/codex review focus on security`）、boundary の後に append：
```bash
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
cd "$_REPO_ROOT"
codex review "IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. Do NOT modify agents/openai.yaml. Stay focused on repository code only.

focus on security" --base <base> -c 'model_reasoning_effort="high"' --enable web_search_cached < /dev/null 2>"$TMPERR"
```

3. 出力を capture。stderr から cost を parse：
```bash
grep "tokens used" "$TMPERR" 2>/dev/null || echo "tokens: unknown"
```

4. review 出力を check して gate 判定を決定する。
   出力に `[P1]` が含まれたら gate は **FAIL**。
   `[P1]` marker が無ければ（`[P2]` のみ、または findings 無し） gate は **PASS**。

5. 出力を提示：

```
CODEX SAYS (code review):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
GATE: PASS                    Tokens: 14,331 | Est. cost: ~$0.12
```

または

```
GATE: FAIL (N critical findings)
```

6. **Cross-model comparison:** `/review`（Claude 自身の review）が本会話内で先に実行されていた場合、2 set の findings を比較：

```
CROSS-MODEL ANALYSIS:
  Both found: [findings that overlap between Claude and Codex]
  Only Codex found: [findings unique to Codex]
  Only Claude found: [findings unique to Claude's /review]
  Agreement rate: X% (N/M total unique findings overlap)
```

7. review 結果を永続化：
```bash
~/.claude/skills/uzustack/bin/uzustack-review-log '{"skill":"codex-review","timestamp":"TIMESTAMP","status":"STATUS","gate":"GATE","findings":N,"findings_fixed":N,"commit":"'"$(git rev-parse --short HEAD)"'"}'
```

置換：TIMESTAMP（ISO 8601）、STATUS（PASS なら "clean"、FAIL なら "issues_found"）、
GATE（"pass" または "fail"）、findings（[P1] + [P2] marker の数）、
findings_fixed（ship 前に対処/修正された findings 数）。

8. temp file を片付け：
```bash
rm -f "$TMPERR"
```



---

## Step 2B: Challenge (Adversarial) Mode

Codex があなたのコードを破ろうとする — 通常 review では見落とす edge case、race condition、security hole、failure mode を発見する。

1. adversarial prompt を構築する。**常に Filesystem Boundary section の filesystem boundary 指示を prepend する**。ユーザーが focus area を提供（例：`/codex challenge security`）した場合、boundary の後に含める：

Default prompt（focus 無し）：
"IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. Do NOT modify agents/openai.yaml. Stay focused on repository code only.

Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems."

focus 付き（例："security"）：
"IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. Do NOT modify agents/openai.yaml. Stay focused on repository code only.

Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Focus specifically on SECURITY. Your job is to find every way an attacker could exploit this code. Think about injection vectors, auth bypasses, privilege escalation, data exposure, and timing attacks. Be adversarial."

2. **JSONL 出力** で codex exec を走らせ、推論 trace と tool call を capture（5 分 timeout）：

ユーザーが `--xhigh` を渡した場合、`"high"` の代わりに `"xhigh"` を使う。

```bash
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
# Fix 1+2: timeout で wrap（probe helper 経由で gtimeout/timeout fallback chain）、
# auth error 検出のため stderr を $TMPERR に capture（旧：2>/dev/null）。
TMPERR=${TMPERR:-$(mktemp /tmp/codex-err-XXXXXX.txt)}
_uzustack_codex_timeout_wrapper 600 codex exec "<prompt>" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached --json < /dev/null 2>"$TMPERR" | PYTHONUNBUFFERED=1 python3 -u -c "
import sys, json
turn_completed_count = 0
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex thinking] {text}', flush=True)
                print(flush=True)
            elif itype == 'agent_message' and text:
                print(text, flush=True)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}', flush=True)
        elif t == 'turn.completed':
            turn_completed_count += 1
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}', flush=True)
    except: pass
# Fix 2: completeness check — turn.completed が来なければ警告
if turn_completed_count == 0:
    print('[codex warning] No turn.completed event received — possible mid-stream disconnect.', flush=True, file=sys.stderr)
"
_CODEX_EXIT=${PIPESTATUS[0]}
# Fix 1: hang detection — log + actionable message を surface
if [ "$_CODEX_EXIT" = "124" ]; then
  _uzustack_codex_log_event "codex_timeout" "600"
  _uzustack_codex_log_hang "challenge" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 10 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
fi
# Fix 2: stderr に capture した auth error を surface（drop しない）
if grep -qiE "auth|login|unauthorized" "$TMPERR" 2>/dev/null; then
  echo "[codex auth error] $(head -1 "$TMPERR")"
  _uzustack_codex_log_event "codex_auth_failed"
fi
```

これは codex の JSONL event を parse し、推論 trace、tool call、最終 response を抽出する。`[codex thinking]` 行は codex が回答する前に推論した内容を示す。

3. stream された出力を full に提示：

```
CODEX SAYS (adversarial challenge):
════════════════════════════════════════════════════════════
<full output from above, verbatim>
════════════════════════════════════════════════════════════
Tokens: N | Est. cost: ~$X.XX
```

---

## Step 2C: Consult Mode

Codex に codebase について何でも聞く。follow-up 用の session 継続性 support。

1. **既存 session を check：**
```bash
cat .context/codex-session-id 2>/dev/null || echo "NO_SESSION"
```

session file が存在（`NO_SESSION` ではない）すれば、AskUserQuestion：
```
You have an active Codex conversation from earlier. Continue it or start fresh?
A) Continue the conversation (Codex remembers the prior context)
B) Start a new conversation
```

2. temp file を作成：
```bash
TMPRESP=$(mktemp /tmp/codex-resp-XXXXXX.txt)
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

3. **Plan review auto-detection:** ユーザー prompt が plan の review について、または plan files が存在しユーザーが引数なしの `/codex` と入力した場合：
```bash
setopt +o nomatch 2>/dev/null || true  # zsh 互換
ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$(basename $(pwd))" 2>/dev/null | head -1
```
プロジェクト scope な match が無ければ、fallback：`ls -t ~/.claude/plans/*.md 2>/dev/null | head -1`、
ただし警告："Note: this plan may be from a different project — verify before sending to Codex."

**重要 — path 参照ではなく content を embed する:** Codex は repo root に sandbox（`-C`）して動くため、`~/.claude/plans/` や repo 外の file に access **できない**。plan file を **自分で読み**、その **完全な content を** 下記 prompt に embed しなければならない。Codex に file path を伝えたり plan file を読ませたりしては **いけない** — Codex は 10+ tool call を search に浪費して fail する。

加えて：plan content から参照されている source file path（`src/foo.ts`、`lib/bar.py` のような pattern、repo に存在する `/` を含む path）を scan する。見つかったら、Codex が rg/find 経由で発見する代わりに直接読めるよう prompt に list する。

**filesystem boundary 指示を Codex に送る全 prompt に常に prepend する** — plan review でも free-form consult でも同様。

ユーザーの prompt の先頭に boundary と persona を prepend：
"IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. Do NOT modify agents/openai.yaml. Stay focused on repository code only.

You are a brutally honest technical reviewer. Review this plan for: logical gaps and
unstated assumptions, missing error handling or edge cases, overcomplexity (is there a
simpler approach?), feasibility risks (what could go wrong?), and missing dependencies
or sequencing issues. Be direct. Be terse. No compliments. Just the problems.
Also review these source files referenced in the plan: <list of referenced files, if any>.

THE PLAN:
<full plan content, embedded verbatim>"

非 plan な consult prompt（ユーザーが `/codex <question>` と入力）でも、boundary を prepend：
"IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. Do NOT modify agents/openai.yaml. Stay focused on repository code only.

<user's question>"

4. **JSONL 出力** で codex exec を走らせ、推論 trace を capture（5 分 timeout）：

ユーザーが `--xhigh` を渡した場合、`"medium"` の代わりに `"xhigh"` を使う。

**新規 session：**
```bash
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
# Fix 1: timeout で wrap（probe helper 経由で gtimeout/timeout fallback chain）
_uzustack_codex_timeout_wrapper 600 codex exec "<prompt>" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="medium"' --enable web_search_cached --json < /dev/null 2>"$TMPERR" | PYTHONUNBUFFERED=1 python3 -u -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'thread.started':
            tid = obj.get('thread_id','')
            if tid: print(f'SESSION_ID:{tid}', flush=True)
        elif t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex thinking] {text}', flush=True)
                print(flush=True)
            elif itype == 'agent_message' and text:
                print(text, flush=True)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex ran] {cmd}', flush=True)
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\ntokens used: {tokens}', flush=True)
    except: pass
"
# Fix 1: Consult new-session の hang detection（Challenge + resume と同じ pattern）
_CODEX_EXIT=${PIPESTATUS[0]}
if [ "$_CODEX_EXIT" = "124" ]; then
  _uzustack_codex_log_event "codex_timeout" "600"
  _uzustack_codex_log_hang "consult" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 10 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
fi
```

**resume された session**（ユーザーが「Continue」を選択）：
```bash
_REPO_ROOT=$(git rev-parse --show-toplevel) || { echo "ERROR: not in a git repo" >&2; exit 1; }
# Fix 1: timeout で wrap（probe helper 経由で gtimeout/timeout fallback chain）
_uzustack_codex_timeout_wrapper 600 codex exec resume <session-id> "<prompt>" -C "$_REPO_ROOT" -s read-only -c 'model_reasoning_effort="medium"' --enable web_search_cached --json < /dev/null 2>"$TMPERR" | PYTHONUNBUFFERED=1 python3 -u -c "
<上記と同じ python streaming parser、全 print() に flush=True 付き>
"
# Fix 1: 新規 session block と同じ hang detection pattern
_CODEX_EXIT=${PIPESTATUS[0]}
if [ "$_CODEX_EXIT" = "124" ]; then
  _uzustack_codex_log_event "codex_timeout" "600"
  _uzustack_codex_log_hang "consult-resume" "$(wc -c < "$TMPERR" 2>/dev/null || echo 0)"
  echo "Codex stalled past 10 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check ~/.codex/logs/."
fi

5. stream された出力から session ID を capture する。parser は `thread.started` event から `SESSION_ID:<id>` を出力する。follow-up 用に保存：
```bash
mkdir -p .context
```
parser が出力した session ID（`SESSION_ID:` で始まる行）を `.context/codex-session-id` に保存。

6. stream された出力を full に提示：

```
CODEX SAYS (consult):
════════════════════════════════════════════════════════════
<full output, verbatim — includes [codex thinking] traces>
════════════════════════════════════════════════════════════
Tokens: N | Est. cost: ~$X.XX
Session saved — run /codex again to continue this conversation.
```

7. 提示後、Codex の analysis があなたの理解と異なる箇所があれば note する。disagreement があれば flag：
   "Note: Claude Code disagrees on X because Y."

---

## Model & Reasoning

**Model:** model はハードコードしない — codex は現在の default（frontier の agentic coding model）を使う。OpenAI が新 model を出すと `/codex` は自動的にそれを使う。ユーザーが特定 model を望むなら、`-m` を codex に pass-through する。

**Reasoning effort（mode ごと default）:**
- **Review (2A):** `high` — bounded な diff 入力、徹底性が必要だが max token は不要
- **Challenge (2B):** `high` — adversarial だが diff size で bounded
- **Consult (2C):** `medium` — 大きな context（plan、codebase）、interactive、速度が必要

`xhigh` は `high` の ~23 倍の token を使い、大 context タスクで 50 分超の hang を起こす（OpenAI issues #8545、#8402、#6931）。ユーザーは `--xhigh` flag で override 可能（例：`/codex review --xhigh`）、最大の reasoning を望み、待つ意思があるとき。

**Web search:** 全 codex command は `--enable web_search_cached` を使い、Codex が review 中に doc / API を検索できる。これは OpenAI の cached index — 高速、追加コストなし。

ユーザーが model を指定（例：`/codex review -m gpt-5.1-codex-max` または `/codex challenge -m gpt-5.2`）した場合、`-m` flag を codex に pass-through する。

---

## Cost Estimation

stderr から token 数を parse する。Codex は `tokens used\nN` を stderr に print する。

表示形式：`Tokens: N`

token 数が利用不可なら、表示：`Tokens: unknown`

---

## Error Handling

- **Binary not found:** Step 0 で検出。install 手順と共に停止。
- **Auth error:** Codex が auth error を stderr に print。error を surface：
  "Codex authentication failed. Run `codex login` in your terminal to authenticate via ChatGPT."
- **Timeout（Bash outer gate）:** Bash call が timeout（Review/Challenge は 5 min、Consult は 10 min）した場合、ユーザーに伝える：
  "Codex timed out. The prompt may be too large or the API may be slow. Try again or use a smaller scope."
- **Timeout（inner `timeout` wrapper、exit 124）:** shell の `timeout 600` wrapper が先に発火した場合、skill の hang-detection block が telemetry event + operational learning を auto-log し、出力する："Codex stalled past 10 minutes. Common causes: model API stall, long prompt, network issue. Try re-running. If persistent, split the prompt or check `~/.codex/logs/`." 追加 action 不要。
- **Empty response:** `$TMPRESP` が空または存在しないなら、ユーザーに伝える：
  "Codex returned no response. Check stderr for errors."
- **Session resume failure:** resume が失敗したら、session file を削除して新規 start する。

---

## Important Rules

- **ファイルを変更しない。** 本 skill は read-only。Codex は read-only sandbox mode で動く。
- **出力をそのまま提示する。** 表示前に Codex の出力を切り詰めたり要約したり editorialize したりしない。CODEX SAYS block 内に full に表示する。
- **synthesis は output の後に追加、代わりではない。** Claude の commentary は full output の後に。
- **5 分 timeout** を全 Bash call に対して codex に適用（`timeout: 300000`）。
- **二重 review はしない。** ユーザーが既に `/review` を実行していたら、Codex は独立した second opinion を提供。Claude Code 自身の review を再実行しない。
- **skill-file の rabbit hole を検出する。** Codex 出力を受け取った後、Codex が skill files に気を取られた sign を scan する：`uzustack-config`、`uzustack-update-check`、`SKILL.md`、`skills/uzustack`。これらが出力に現れたら、警告を append する："Codex appears to have read uzustack skill files instead of reviewing your code. Consider retrying."
