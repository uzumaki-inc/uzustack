#!/usr/bin/env bash
# Migration: v1.0.0.0 — V1 writing style prompt
#
# 注：本 migration は upstream gstack の v1.0.0.0 path 由来。uzustack では
# 該当機構（writing-style prompt / explain_level config）が未実装 = 実 trigger
# なし。Phase 6+ で uzustack 独自の writing style 機構と同時設計するまで
# 型として在庫。
#
# 何が変わったか：tier-≥2 skill が ELI10 writing style をデフォルトに採用
# （初出 jargon を解説、outcome 軸の質問、短文）。旧 V0 prose を好む power user は
# `uzustack-config set explain_level terse` で opt-in できる。
#
# 何をするか：「pending prompt」flag ファイルを書く。upgrade 後の最初の
# tier-≥2 skill 起動時、preamble が flag を読んで「新デフォルトを残すか
# terse mode に切り替えるか」を一度だけ尋ねる。ユーザー回答後に flag は削除。
# 冪等 — 何度実行しても安全。
#
# 影響範囲：v0.19.x 以下から v1.x に upgrade する全ユーザー
set -euo pipefail

UZUSTACK_HOME="${UZUSTACK_HOME:-$HOME/.uzustack}"
PROMPTED_FLAG="$UZUSTACK_HOME/.writing-style-prompted"
PENDING_FLAG="$UZUSTACK_HOME/.writing-style-prompt-pending"

mkdir -p "$UZUSTACK_HOME"

# ユーザーが既に prompt に答えていたら skip
if [ -f "$PROMPTED_FLAG" ]; then
  exit 0
fi

# ユーザーが既に explain_level を明示設定済みなら、それを「回答」とみなして skip
EXPLAIN_LEVEL_SET="$("${HOME}/.claude/skills/uzustack/bin/uzustack-config" get explain_level 2>/dev/null || true)"
if [ -n "$EXPLAIN_LEVEL_SET" ]; then
  touch "$PROMPTED_FLAG"
  exit 0
fi

# pending flag を書く — preamble が次の tier-≥2 skill 起動時に検知する
touch "$PENDING_FLAG"

echo "  [v1.0.0.0] V1 writing style: 次回 skill 起動時に「新デフォルト（jargon 解説、outcome 軸）」と「旧 terse prose」のいずれを使うかを一度だけ尋ねる。"
