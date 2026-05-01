---
name: setup-gbrain
type: translated
preamble-tier: 2
version: 1.0.0
description: |
  この coding agent 用に gbrain をセットアップする：CLI を install、local PGLite または
  Supabase brain を初期化、MCP に登録、remote ごとの trust policy を取得。
  ゼロから「gbrain が動いていて、本 agent が呼べる」状態まで 1 コマンドで到達する。
  「setup gbrain」「connect gbrain」「start gbrain」「install gbrain」
  「configure gbrain for this machine」と要求されたときに使用する。
triggers:
  - setup gbrain
  - install gbrain
  - connect gbrain
  - start gbrain
  - configure gbrain
  - gbrain をセットアップ
  - gbrain を初期化
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->



# /setup-gbrain — coding agent 向け gbrain オンボーディング

ユーザーの local Mac 上に gbrain（https://github.com/garrytan/gbrain、永続的な knowledge base）を
セットアップし、本 coding agent（典型的には Claude Code）が CLI と MCP tool の両方として
gbrain を呼べる状態にする。

**スコープの正直な明示:** 本 skill の MCP 登録 step（5a）は `claude mcp add` を使い、
**Claude Code 専用** に登録する。他の local host（Cursor / Codex CLI 等）は gbrain CLI が
PATH に通った状態までは取得できる。それらの host は setup 後に各 host 自身の MCP config
で `gbrain serve` を手動登録する。

**想定 audience:** local Mac ユーザー。openclaw / hermes 系 agent は通常、cloud docker
container 上で独自の gbrain を持つ。それらと local Claude Code 間で brain を「共有」できるのは
共有 Postgres（Supabase）経由のみ。

## ユーザー起動

ユーザーが `/setup-gbrain` と入力したら、本 skill を実行する。3 つの shortcut mode：

- `/setup-gbrain` — full flow（default）
- `/setup-gbrain --repo` — 現在の repo の remote-policy のみ反転
- `/setup-gbrain --switch` — engine（PGLite ↔ Supabase）の migration のみ
- `/setup-gbrain --resume-provision <ref>` — 中断した Supabase auto-provision の polling step に再入
- `/setup-gbrain --cleanup-orphans` — 中途半端な Supabase project を一覧 + 削除

引数の parse は本 skill 自身が行う。これらは skill への prose hint であり、dispatcher binary として
実装されているわけではない。

---

## Step 1: 現在の状態を検出

```bash
~/.claude/skills/uzustack/bin/uzustack-gbrain-detect
```

JSON output を取得する。次の field を含む：`gbrain_on_path`、`gbrain_version`、
`gbrain_config_exists`、`gbrain_engine`、`gbrain_doctor_ok`、`uzustack_brain_sync_mode`、
`uzustack_brain_git`。

すでに完了済みの downstream step は skip する。検出した state を 1 行で報告し、ユーザーに
状況を伝える：

> 「Detected: gbrain v0.18.2 on PATH、engine=postgres、doctor=ok、sync=artifacts-only。
>  install 不要、policy check に jump。」

`--repo` / `--switch` / `--resume-provision` / `--cleanup-orphans` の起動 flag をここで
分岐し、対応する step に skip する。

---

## Step 2: path を選ぶ（AskUserQuestion）

Step 1 で動作中の config が **無く**、かつ shortcut flag も渡されていない場合のみ
発火させる。質問タイトル：「brain をどこに置くか？」

選択肢（検出した state に応じて提示）：

- **1 — Supabase、すでに connection string がある**：openclaw / hermes 等の cloud agent が
  すでに provision 済みのユーザー向け。Supabase dashboard（Settings → Database → Connection
  Pooler → Session）から Session Pooler URL を paste する。*プロンプトに含める trust-surface
  注意書き：* 「この URL を paste すると、cloud agent が見える全 page に対して local Claude Code
  が full read/write 権限を持つことになる。その trust level が望むものでなければ、PGLite local
  を選んで、別個の brain として扱うことを受け入れること。」
- **2a — Supabase、新 project を auto-provision**：Supabase Personal Access Token（PAT）が
  必要（~90 秒）。team で brain を共有する場合の最良選択。
- **2b — Supabase、手動で作成**：supabase.com の signup 手順を自分で進める。準備できたら
  URL を paste する。
- **3 — PGLite local**：account 不要、~30 秒。本 Mac 上に閉じた孤立 brain。お試し用に最良。
- **Switch**（Step 1 で既存 engine を検出した場合のみ）：「すでに `<engine>` brain がある。
  もう片方の engine に migration するか？」 → `gbrain migrate --to <other>` を `timeout 180s`
  で wrap して実行（D9）。

silent に決め打ちしないこと。必ず AskUserQuestion を発火させる。

---

## Step 3: gbrain CLI の install（不在時）

`gbrain_on_path=false` の場合のみ：

```bash
~/.claude/skills/uzustack/bin/uzustack-gbrain-install
```

installer は D5 detect-first（`~/git/gbrain` / `~/gbrain` を先に probe）と D19 PATH-shadow
validation（link 後の `gbrain --version` が install-dir の `package.json` と一致する必要が
ある）を実行する。D19 失敗時、installer は exit 3 と明確な remediation menu で終了する。
全 output をユーザーに surface して STOP すること。skill 続行は不可。ユーザーが PATH を
修正するまで環境は壊れた状態にある。

---

## Step 4: brain の初期化

path 別に分岐。

### Path 1（Supabase、既存 URL）

secret 読み込み helper を source して、`read -s` + redacted preview で URL を収集：

```bash
. ~/.claude/skills/uzustack/bin/uzustack-gbrain-lib.sh
read_secret_to_env GBRAIN_POOLER_URL "Paste Session Pooler URL: " \
  --echo-redacted 's#://[^@]*@#://***@#'
```

次に構造的に validate：

```bash
printf '%s' "$GBRAIN_POOLER_URL" | ~/.claude/skills/uzustack/bin/uzustack-gbrain-supabase-verify -
```

verify の exit code が 3（direct-connection URL）の場合、verifier 自身の message が修正方法を
説明する。それを surface して Session Pooler URL を再 prompt する。

成功したら、env var 経由で gbrain に hand off（D10、argv は決して使わない）：

```bash
GBRAIN_DATABASE_URL="$GBRAIN_POOLER_URL" gbrain init --non-interactive --json
```

直後に `unset GBRAIN_POOLER_URL GBRAIN_DATABASE_URL`。URL は gbrain 自身によって
mode 0600 で `~/.gbrain/config.json` に永続化される。

### Path 2a（Supabase、auto-provision — D7）

token を収集する **前に** D11 PAT scope disclosure を逐語提示：

> *この Supabase Personal Access Token は、これから作る `gbrain` project だけでなく、
> あなたの Supabase account の全 project に対して full read/write/delete 権限を付与する。
> Supabase は現状 scoped token を support していない。本 PAT は次の用途のみ：1 個の
> project を作成、healthy になるまで poll、Session Pooler URL を読む。終わり次第、
> process memory から discard する。token 自体は https://supabase.com/dashboard/account/tokens
> で手動 revoke するまで Supabase 側で有効。setup 完了直後の revoke を強く推奨する。*

次に：

```bash
. ~/.claude/skills/uzustack/bin/uzustack-gbrain-lib.sh
read_secret_to_env SUPABASE_ACCESS_TOKEN "Paste PAT: "
```

D17 tier prompt を AskUserQuestion で発火：「Supabase の tier は？」 Free（project 数 2 上限、
7 日 inactive で pause）vs Pro（$25/mo、pause なし、実利用には推奨）を提示。tier は **org 単位**
である（Management API contract に従う）ことを説明する。ユーザーは現在の tier に応じて org を選ぶ。
Pro 必要なら、ユーザーは事前に supabase.com で org を upgrade する必要がある。

org 一覧、選択（複数あれば AskUserQuestion）：

```bash
orgs=$(~/.claude/skills/uzustack/bin/uzustack-gbrain-supabase-provision list-orgs --json)
```

`.orgs` 配列が空なら surface：「Supabase account に organization が無い。
https://supabase.com/dashboard で作成してから `/setup-gbrain` を再実行すること。」 STOP。

region をユーザーに尋ねる（default `us-east-1`、有効値は Supabase Management API の 18 個の
enum 値。よく使われるものを数個提示し、「Other」で full list を出せるようにする）。

DB password を生成（ユーザーには絶対に見せない）：

```bash
export DB_PASS=$(openssl rand -base64 24)
```

SIGINT trap を仕込む（D12 basic recovery）：

```bash
trap 'echo ""; echo "uzustack-gbrain: interrupted. In-flight ref: $INFLIGHT_REF"; \
      echo "Resume: /setup-gbrain --resume-provision $INFLIGHT_REF"; \
      echo "Delete: https://supabase.com/dashboard/project/$INFLIGHT_REF"; \
      unset SUPABASE_ACCESS_TOKEN DB_PASS; exit 130' INT TERM
```

create + wait + fetch：

```bash
result=$(~/.claude/skills/uzustack/bin/uzustack-gbrain-supabase-provision \
  create gbrain "$REGION" "$ORG_SLUG" --json)
INFLIGHT_REF=$(echo "$result" | jq -r .ref)
~/.claude/skills/uzustack/bin/uzustack-gbrain-supabase-provision wait "$INFLIGHT_REF" --json
pooler=$(~/.claude/skills/uzustack/bin/uzustack-gbrain-supabase-provision \
  pooler-url "$INFLIGHT_REF" --json)
GBRAIN_DATABASE_URL=$(echo "$pooler" | jq -r .pooler_url)
export GBRAIN_DATABASE_URL
gbrain init --non-interactive --json
unset SUPABASE_ACCESS_TOKEN DB_PASS GBRAIN_DATABASE_URL INFLIGHT_REF
trap - INT TERM
```

成功後、PAT revoke リマインダを出力：

> 「Setup 完了。paste した PAT は https://supabase.com/dashboard/account/tokens で revoke すること。
> こちら側ではすでに memory から discard 済みで、再度必要になることはない。gbrain project 自体は
> 内蔵 database password を持つので、PAT revoke 後も動作し続ける。」

### Path 2b（Supabase、手動）

ユーザーを supabase.com の手順に沿って案内：
1. https://supabase.com/dashboard で login
2. 「New Project」をクリック、名前を `gbrain` に、region を選び、生成された database password を
   copy（paste-back に必要か？ いいえ — 次に collect する pooler URL に embed されている）
3. project 初期化を ~2 分待つ
4. Settings → Database → Connection Pooler → Session → URL（port 6543）を copy

その後は Path 1 と同じ secret-read + verify + init flow を実行する。

### Path 3（PGLite local）

```bash
gbrain init --pglite --json
```

完了。network 不要、secret 不要。

### Switch（detect の existing-engine state から）

```bash
# PGLite → Supabase の場合は、まず URL を収集（Path 1 flow）し、続いて：
timeout 180s gbrain migrate --to supabase --url "$URL" --json
# Supabase → PGLite の場合：
timeout 180s gbrain migrate --to pglite --json
```

`timeout` が 124（timeout の exit code）を返した場合、D9 message を surface：
「Migration が 3 分以内に完了しなかった。別の uzustack session が source brain の lock を
保持している可能性がある。他の workspace を閉じて `/setup-gbrain --switch` を再実行すること。
元の brain は無傷。」 STOP。

---

## Step 5: gbrain doctor で verify

```bash
doctor=$(gbrain doctor --json)
status=$(echo "$doctor" | jq -r .status)
```

status が `ok` または `warnings` なら続行。それ以外は doctor の full output を surface して
STOP。

---

## Step 5a: gbrain を Claude Code MCP として登録（D18）

`which claude` が解決できる場合のみ。「Claude Code に gbrain の typed tool surface を提供するか？
（推奨は yes）」を尋ねる。

yes なら、**user scope** で **gbrain binary の絶対 path** を使って登録する。user scope によって
本 Mac 上の全 Claude Code session で MCP が利用可能になる（current workspace に限らない）。
絶対 path によって、Claude Code が `gbrain serve` を subprocess として spawn するときの
PATH resolution 問題を回避する。

```bash
GBRAIN_BIN=$(command -v gbrain)
[ -z "$GBRAIN_BIN" ] && GBRAIN_BIN="$HOME/.bun/bin/gbrain"
claude mcp add --scope user gbrain -- "$GBRAIN_BIN" serve
claude mcp list | grep gbrain  # verify: should show "✓ Connected"
```

ユーザーが過去の実行で local-scope 登録を残している場合、両 scope が conflict しないよう
先に削除する：
```bash
claude mcp remove gbrain 2>/dev/null || true
```

`claude` が PATH に無い場合は emit：「MCP 登録は skip — 本 skill は Claude Code を target としており、
他 agent では各自の MCP config に `gbrain serve` を手動登録すること。」 step 6 に進む。

**ユーザー向け heads-up:** すでに開いている Claude Code session は、restart するまで新しい
MCP tool を pick up しない。次の旨を伝える：「`mcp__gbrain__*` tool を見るには、開いている
Claude Code session を restart すること。MCP tool は session start 時に load され、
mid-session には load されない。」

---

## Step 6: remote 単位の policy（D3 triad、gated repo-import）

`origin` remote を持つ git repo の中にいる場合、policy を check：

```bash
current_tier=$(~/.claude/skills/uzustack/bin/uzustack-gbrain-repo-policy get)
```

分岐：
- `read-write` → 本 repo を import：`gbrain import "$(pwd)" --no-embed` を実行し、
  続いて `gbrain embed --stale &` を background で。
- `read-only` → import を完全に skip（この tier は今後の auto-import hook + gbrain resolver
  injection で enforce される、ここでは行わない）。
- `deny` → 何もしない。
- `unset` → AskUserQuestion：「`<normalized-remote>` は gbrain とどう interact すべきか？」
  - `read-write` — agent は本 repo から検索 AND 新 page の書き込みが可能
  - `read-only` — agent は検索可能、書き込みは決して不可
  - `deny` — 何も interact しない
  - `skip-for-now` — 永続化せず、次回再度尋ねる

  回答時（skip-for-now 以外）：
  ```bash
  ~/.claude/skills/uzustack/bin/uzustack-gbrain-repo-policy set "$REMOTE" "$TIER"
  ```
  `read-write` の場合のみ import を実行。

git repo の外、または origin remote 無しの場合：注記付きで本 step を skip。

`/setup-gbrain --repo` 起動の場合、Step 6 のみを実行して終了する。

---

## Step 7: uzustack-brain-sync を offer

別の AskUserQuestion：「uzustack の session memory（learnings、plans、retros 等）を
machine 横断で gbrain が index できる private git repo にも sync するか？」

選択肢：
- Yes、full sync（全 allowlisted）
- Yes、artifacts-only（plans / designs / retros、behavioral data は除外）
- No thanks

yes なら：

```bash
~/.claude/skills/uzustack/bin/uzustack-brain-init
~/.claude/skills/uzustack/bin/uzustack-config set gbrain_sync_mode artifacts-only
# yes-full を選んだなら "full"
```

---

## Step 8: CLAUDE.md に `## GBrain Configuration` を永続化

CLAUDE.md にこの section を find-and-replace（無ければ append）：

```markdown
## GBrain Configuration (configured by /setup-gbrain)
- Engine: {pglite|postgres}
- Config file: ~/.gbrain/config.json (mode 0600)
- Setup date: {today}
- MCP registered: {yes/no}
- Memory sync: {off|artifacts-only|full}
- Current repo policy: {read-write|read-only|deny|unset}
```

---

## Step 9: smoke test

```bash
SLUG="setup-gbrain-smoke-test-$(date +%s)"
echo "Set up on $(date). Smoke test for /setup-gbrain." | gbrain put "$SLUG"
gbrain search "smoke test" | grep -i "$SLUG"
```

round trip を確認する。失敗時は `gbrain doctor --json` の output を surface し、
NEEDS_CONTEXT escalation で STOP。

---

## `/setup-gbrain --cleanup-orphans`（D20）

PAT を再収集（Step 4 path-2a の scope disclosure を再提示）してから：

```bash
# ユーザーの Supabase project を一覧（ユーザー自身が shell に pipe して review する想定。
# こちら側で PAT を保存するわけではない）。
export SUPABASE_ACCESS_TOKEN="<read_secret_to_env で収集>"
projects=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.supabase.com/v1/projects)
```

response を parse、name が `gbrain` で始まり、かつ `ref` が現在の `~/.gbrain/config.json` の
pooler URL と一致しない project を orphan と判定する。各 orphan に対して project 単位で
AskUserQuestion：「orphan project `<ref>`（`<name>`、created `<created_at>`）を削除するか？」 —
**決して batch しない**。project 単位の確認は one-way door。

確認済み削除時：
```bash
curl -s -X DELETE -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.supabase.com/v1/projects/$REF
```

active brain を 2 度目の明示的確認なしに削除しないこと。

最後に `unset SUPABASE_ACCESS_TOKEN`、revoke リマインダ。

---

## Telemetry（D4）

preamble の Telemetry block が skill 終了時の success / failure event を log する。event を
emit する際、次の enumerated categorical 値を telemetry payload に追加する（SAFE — 自由形式 secret
無し、URL や PAT は決して含めない）：

- `scenario`: `supabase-existing` | `supabase-auto-provision` |
  `supabase-manual` | `pglite-local` | `switch-to-supabase` |
  `switch-to-pglite` | `repo-flip-only` | `cleanup-orphans` |
  `resume-provision`
- `install_performed`: `yes` | `no` (D5 reuse) | `skipped` (pre-existing)
- `mcp_registered`: `yes` | `no` | `claude-missing`
- `trust_tier_set`: `read-write` | `read-only` | `deny` |
  `skip-for-now` | `n/a`（git repo 外）

`SUPABASE_ACCESS_TOKEN` / `DB_PASS` / `GBRAIN_POOLER_URL` / `GBRAIN_DATABASE_URL` /
`postgresql://` を含む文字列は telemetry 呼び出しに決して渡さない。`test/skill-validation.test.ts`
の CI grep test が build 時にこれを enforce する。

---

## Important Rules

- **secret には 1 つの規則を貫く。** PAT、DB_PASS、pooler URL：env-var only、決して argv に
  載せず、log を取らず、こちら側で disk に永続化しない。pooler URL を long-term に持つのは
  `~/.gbrain/config.json` のみで、それは gbrain 自身の `init` が mode 0600 で書き込むもの。
  これは gbrain 側の規律であって、本 skill の責務ではない。
- **STOP point は hard。** gbrain doctor not healthy / D19 PATH shadow / D9 migrate timeout /
  smoke test failure — それぞれ STOP。誤魔化さない。
- **同時実行 lock。** skill 開始時に `mkdir ~/.uzustack/.setup-gbrain.lock.d`（atomic）を実行。
  mkdir が失敗したら abort：「別の `/setup-gbrain` instance が動作中。完了を待つか、
  stale だと確信できるなら `rm -rf ~/.uzustack/.setup-gbrain.lock.d` で除去すること。」
  正常終了時 AND SIGINT trap 内の両方で release する。
- **CLAUDE.md は audit trail。** setup 成功後、Step 8 で必ず更新する。
