---
name: setup-deploy
type: translated
preamble-tier: 2
version: 1.0.0
description: |
  /land-and-deploy 用の deploy 設定を構成する skill。deploy platform
  （Fly.io / Render / Vercel / Netlify / Heroku / GitHub Actions / custom）を
  検出し、production URL / health check endpoint / deploy status command を
  CLAUDE.md に書き込む。以降の deploy が automatic に動作する。
  「setup deploy」「deploy 設定」「set up land-and-deploy」「uzustack で deploy する方法」
  「deploy 設定を追加」と要求されたときに使用する。(uzustack)
triggers:
  - configure deploy
  - setup deployment
  - set deploy platform
  - deploy 設定する
  - deploy 構成する
  - setup deploy する
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



# /setup-deploy — uzustack の deploy 設定を構成する

`/land-and-deploy` が automatic に動作するよう、deploy 設定を構成する skill。
deploy platform / production URL / health check / deploy status command を検出し、
すべて CLAUDE.md に永続化する。

一度この skill を実行すれば、以降の `/land-and-deploy` は CLAUDE.md を読むだけで platform 検出を skip する。

## User-invocable
ユーザーが `/setup-deploy` と入力したとき、本 skill を起動する。

## Instructions

### Step 1: 既存設定の確認

```bash
grep -A 20 "## Deploy Configuration" CLAUDE.md 2>/dev/null || echo "NO_CONFIG"
```

既存設定があれば表示し、ユーザーに確認する：

- **Context:** Deploy 設定は既に CLAUDE.md に存在する。
- **RECOMMENDATION:** setup が変わっているなら A を選ぶ。
- A) Reconfigure from scratch (overwrite existing)
- B) Edit specific fields (show current config, let me change one thing)
- C) Done — configuration looks correct

ユーザーが C を選んだら停止する。

### Step 2: Platform 検出

deploy bootstrap の platform 検出を実行：

```bash
# Platform 設定ファイル
[ -f fly.toml ] && echo "PLATFORM:fly" && cat fly.toml
[ -f render.yaml ] && echo "PLATFORM:render" && cat render.yaml
[ -f vercel.json ] || [ -d .vercel ] && echo "PLATFORM:vercel"
[ -f netlify.toml ] && echo "PLATFORM:netlify" && cat netlify.toml
[ -f Procfile ] && echo "PLATFORM:heroku"
[ -f railway.json ] || [ -f railway.toml ] && echo "PLATFORM:railway"

# GitHub Actions の deploy workflow
for f in $(find .github/workflows -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null); do
  [ -f "$f" ] && grep -qiE "deploy|release|production|staging|cd" "$f" 2>/dev/null && echo "DEPLOY_WORKFLOW:$f"
done

# プロジェクト種別
[ -f package.json ] && grep -q '"bin"' package.json 2>/dev/null && echo "PROJECT_TYPE:cli"
find . -maxdepth 1 -name '*.gemspec' 2>/dev/null | grep -q . && echo "PROJECT_TYPE:library"
```

### Step 3: Platform 別の構成

検出結果に基づき、platform 別の構成手順をユーザーに案内する。

#### Fly.io

`fly.toml` を検出した場合：

1. アプリ名抽出：`grep -m1 "^app" fly.toml | sed 's/app = "\(.*\)"/\1/'`
2. `fly` CLI が install されているか確認：`which fly 2>/dev/null`
3. install 済なら検証：`fly status --app {app} 2>/dev/null`
4. URL 推論：`https://{app}.fly.dev`
5. deploy status コマンド：`fly status --app {app}`
6. health check：`https://{app}.fly.dev`（アプリが `/health` を持つならそれを使う）

production URL の確認をユーザーに依頼する。Fly のアプリは custom domain を使う場合がある。

#### Render

`render.yaml` を検出した場合：

1. service 名と type を render.yaml から抽出
2. Render API key の確認：`echo $RENDER_API_KEY | head -c 4`（full key を露出させない）
3. URL 推論：`https://{service-name}.onrender.com`
4. Render は接続済 branch への push で auto-deploy するため、deploy workflow は不要
5. health check：推論した URL

ユーザーに確認を依頼する。Render は接続済 git branch から auto-deploy する — main へ merge すると Render が自動で取り込む。`/land-and-deploy` の「deploy 待機」は新版が応答するまで Render URL を poll する設計。

#### Vercel

vercel.json または .vercel を検出した場合：

1. `vercel` CLI 確認：`which vercel 2>/dev/null`
2. install 済なら：`vercel ls --prod 2>/dev/null | head -3`
3. Vercel は push で auto-deploy する（PR で preview、main merge で production）
4. health check：vercel project 設定の production URL

#### Netlify

netlify.toml を検出した場合：

1. site 情報を netlify.toml から抽出
2. Netlify は push で auto-deploy する
3. health check：production URL

#### GitHub Actions のみ

deploy workflow は検出したが platform 設定がない場合：

1. workflow ファイルを読み挙動を理解する
2. deploy 先を抽出（記載があれば）
3. production URL をユーザーに確認

#### Custom / 手動

何も検出できない場合：

AskUserQuestion で情報を集める：

1. **deploy はどう trigger するか？**
   - A) Automatically on push to main (Fly, Render, Vercel, Netlify, etc.)
   - B) Via GitHub Actions workflow
   - C) Via a deploy script or CLI command (describe it)
   - D) Manually (SSH, dashboard, etc.)
   - E) This project doesn't deploy (library, CLI, tool)

2. **production URL は何か？**（自由記述 — アプリが動いている URL）

3. **uzustack はどうやって deploy 成否を確認できるか？**
   - A) HTTP health check at a specific URL (e.g., /health, /api/status)
   - B) CLI command (e.g., `fly status`, `kubectl rollout status`)
   - C) Check the GitHub Actions workflow status
   - D) No automated way — just check the URL loads

4. **Pre-merge / post-merge hook はあるか？**
   - merge 前に実行するコマンド（例：`bun run build`）
   - merge 後 deploy 検証前に実行するコマンド

### Step 4: 設定の書き込み

CLAUDE.md を読む（無ければ作成）。`## Deploy Configuration` section があれば置換、なければ末尾に追加する。

```markdown
## Deploy Configuration (configured by /setup-deploy)
- Platform: {platform}
- Production URL: {url}
- Deploy workflow: {workflow file or "auto-deploy on push"}
- Deploy status command: {command or "HTTP health check"}
- Merge method: {squash/merge/rebase}
- Project type: {web app / API / CLI / library}
- Post-deploy health check: {health check URL or command}

### Custom deploy hooks
- Pre-merge: {command or "none"}
- Deploy trigger: {command or "automatic on push to main"}
- Deploy status: {command or "poll production URL"}
- Health check: {URL or command}
```

### Step 5: 検証

書き込み後、設定が動くか検証する：

1. health check URL を構成したら試す：
```bash
curl -sf "{health-check-url}" -o /dev/null -w "%{http_code}" 2>/dev/null || echo "UNREACHABLE"
```

2. deploy status コマンドを構成したら試す：
```bash
{deploy-status-command} 2>/dev/null | head -5 || echo "COMMAND_FAILED"
```

結果を報告する。失敗してもブロックしない — health check が一時的に不通でも設定そのものは有用。

### Step 6: Summary

```
DEPLOY CONFIGURATION — COMPLETE
════════════════════════════════
Platform:      {platform}
URL:           {url}
Health check:  {health check}
Status cmd:    {status command}
Merge method:  {merge method}

CLAUDE.md に保存。/land-and-deploy は以降この設定を automatic に使う。

次のアクション：
- /land-and-deploy で現在の PR を merge + deploy する
- CLAUDE.md の "## Deploy Configuration" section を編集して設定を変更する
- /setup-deploy を再実行して再構成する
```

## Important Rules

- **secret を露出させない。** API key / token / password の full string を print しない。
- **ユーザー確認を取る。** 検出した設定を表示し、書き込み前に必ず確認を取る。
- **CLAUDE.md が source of truth。** 設定はすべて CLAUDE.md に置く — 別の config ファイルを作らない。
- **Idempotent。** `/setup-deploy` を複数回実行しても、直前の設定をきれいに上書きする。
- **Platform CLI は optional。** `fly` や `vercel` CLI が install されていなければ URL ベースの health check に fallback する。
