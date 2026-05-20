/**
 * gbrain-sync preamble block.
 *
 * Emits bash that runs at every skill invocation:
 *   1. If ~/.uzustack-brain-remote.txt exists AND ~/.uzustack/.git is missing,
 *      surface a restore-available hint (does NOT auto-run restore).
 *   2. If sync is on, run `uzustack-brain-sync --once` (drain + push).
 *   3. On first skill of the day (24h cache via .brain-last-pull):
 *      `git fetch` + ff-only merge (JSONL merge driver handles conflicts).
 *   4. Emit a `BRAIN_SYNC:` status line so every skill surfaces health.
 *
 * Also emits prose instructions for the host LLM to fire a one-time privacy
 * stop-gate via AskUserQuestion when gbrain_sync_mode is unset and gbrain
 * is available on the host.
 *
 * Block emitted across all tiers. Internal bash short-circuits when feature
 * is disabled; cost is <5ms.
 *
 * Skill-end sync is handled by the completion-status generator via a call
 * to `uzustack-brain-sync --discover-new` + `--once`.
 */
import type { TemplateContext } from '../types';

export function generateBrainSyncBlock(ctx: TemplateContext): string {
  const isBrainHost = ctx.host === 'gbrain' || ctx.host === 'hermes';
  return `## GBrain Sync（スキル開始時）

\`\`\`bash
# gbrain-sync: drain pending writes, pull once per day. Silent no-op when
# the feature isn't initialized or gbrain_sync_mode is "off". See
# docs/gbrain-sync.md.

_UZUSTACK_HOME="\${UZUSTACK_HOME:-$HOME/.uzustack}"
_BRAIN_REMOTE_FILE="$HOME/.uzustack-brain-remote.txt"
_BRAIN_SYNC_BIN="${ctx.paths.binDir}/uzustack-brain-sync"
_BRAIN_CONFIG_BIN="${ctx.paths.binDir}/uzustack-config"

_BRAIN_SYNC_MODE=$("$_BRAIN_CONFIG_BIN" get gbrain_sync_mode 2>/dev/null || echo off)

# New-machine hint: URL file present, local .git missing, sync not yet enabled.
if [ -f "$_BRAIN_REMOTE_FILE" ] && [ ! -d "$_UZUSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" = "off" ]; then
  _BRAIN_NEW_URL=$(head -1 "$_BRAIN_REMOTE_FILE" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$_BRAIN_NEW_URL" ]; then
    echo "BRAIN_SYNC: brain repo detected: $_BRAIN_NEW_URL"
    echo "BRAIN_SYNC: run 'uzustack-brain-restore' to pull your cross-machine memory (or 'uzustack-config set gbrain_sync_mode off' to dismiss forever)"
  fi
fi

# Active-sync path.
if [ -d "$_UZUSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" != "off" ]; then
  # Once-per-day pull.
  _BRAIN_LAST_PULL_FILE="$_UZUSTACK_HOME/.brain-last-pull"
  _BRAIN_NOW=$(date +%s)
  _BRAIN_DO_PULL=1
  if [ -f "$_BRAIN_LAST_PULL_FILE" ]; then
    _BRAIN_LAST=$(cat "$_BRAIN_LAST_PULL_FILE" 2>/dev/null || echo 0)
    _BRAIN_AGE=$(( _BRAIN_NOW - _BRAIN_LAST ))
    [ "$_BRAIN_AGE" -lt 86400 ] && _BRAIN_DO_PULL=0
  fi
  if [ "$_BRAIN_DO_PULL" = "1" ]; then
    ( cd "$_UZUSTACK_HOME" && git fetch origin >/dev/null 2>&1 && git merge --ff-only "origin/$(git rev-parse --abbrev-ref HEAD)" >/dev/null 2>&1 ) || true
    echo "$_BRAIN_NOW" > "$_BRAIN_LAST_PULL_FILE"
  fi
  # Drain pending queue, push.
  "$_BRAIN_SYNC_BIN" --once 2>/dev/null || true
fi

# Status line — always emitted, easy to grep.
if [ -d "$_UZUSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" != "off" ]; then
  _BRAIN_QUEUE_DEPTH=0
  [ -f "$_UZUSTACK_HOME/.brain-queue.jsonl" ] && _BRAIN_QUEUE_DEPTH=$(wc -l < "$_UZUSTACK_HOME/.brain-queue.jsonl" | tr -d ' ')
  _BRAIN_LAST_PUSH="never"
  [ -f "$_UZUSTACK_HOME/.brain-last-push" ] && _BRAIN_LAST_PUSH=$(cat "$_UZUSTACK_HOME/.brain-last-push" 2>/dev/null || echo never)
  echo "BRAIN_SYNC: mode=$_BRAIN_SYNC_MODE | last_push=$_BRAIN_LAST_PUSH | queue=$_BRAIN_QUEUE_DEPTH"
else
  echo "BRAIN_SYNC: off"
fi
\`\`\`

${isBrainHost ? `bash 出力に \`BRAIN_SYNC: brain repo detected\` が表示された場合、ユーザーは remote URL ファイルをこのマシンにコピーしたが、まだ復元していない。AskUserQuestion で \`uzustack-brain-restore\` の実行を提案する。ユーザーが同意すればコマンドを実行し、そうでなければ sync なしで続行する。` : ''}

**プライバシー stop-gate（マシンごとに一度だけ起動）。**

bash 出力に \`BRAIN_SYNC: off\` が表示され、かつ config 値
\`gbrain_sync_mode_prompted\` が \`false\` で、かつこのホストで gbrain が検出された場合
（\`gbrain doctor --fast --json\` が成功するか \`gbrain\` binary が PATH にある）、
AskUserQuestion で一回限りのプライバシーゲートを起動する：

> uzustack はセッションメモリ（learnings、plans、designs、retros）を GBrain が
> マシン間でインデックスする private GitHub リポジトリに公開できます。上位 tier では
> 行動データ（セッションタイムライン、開発者プロファイル）も含まれます。どの程度
> 同期しますか？

Options:
- A) allowlist 全体（推奨 — 最大限のクロスマシンメモリ）
- B) 成果物のみ（plans、designs、retros、learnings）— タイムラインとプロファイルをスキップ
- C) 辞退 — すべてローカルに保持

ユーザーの回答後、実行する（選択した値で置換）：

\`\`\`bash
# Chosen mode: full | artifacts-only | off
"$_BRAIN_CONFIG_BIN" set gbrain_sync_mode <choice>
"$_BRAIN_CONFIG_BIN" set gbrain_sync_mode_prompted true
\`\`\`

A または B が選択され、かつ \`~/.uzustack/.git\` が存在しない場合、follow-up を聞く：
「GBrain sync リポジトリを今セットアップしますか？（\`uzustack-brain-init\` を実行）」
- A) はい、今実行
- B) コマンドを見せてください、自分で実行します

スキルをブロックしない。質問を出し、スキルワークフローを続行する。次のスキル実行が
ここから続きを拾う。

**スキル終了時（telemetry ブロックの前）に**、以下の bash コマンドを実行して
writer shim をスキップした成果物の書き込み（design docs、plans、retros）をキャッチし、
まだ保留中のキューエントリをドレインする：

\`\`\`bash
"${ctx.paths.binDir}/uzustack-brain-sync" --discover-new 2>/dev/null || true
"${ctx.paths.binDir}/uzustack-brain-sync" --once 2>/dev/null || true
\`\`\`
`;
}
