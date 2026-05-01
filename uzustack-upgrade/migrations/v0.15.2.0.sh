#!/usr/bin/env bash
# Migration: v0.15.2.0 — unprefixed discovery 用に skill ディレクトリ構造を修復
#
# 注：本 migration は upstream gstack の v0.15.2.0 path 由来。uzustack では
# 該当する binary（bin/uzustack-relink）が未実装 = 実 trigger なし。Phase 6+
# で uzustack 独自の release 機構と同時設計するまで型として在庫。
#
# 何が変わったか：setup が directory symlink ではなく実 directory + SKILL.md
# symlink を内側に作るようになった。旧 pattern（qa -> uzustack/qa）は --no-prefix
# でも Claude Code が skill を "uzustack-qa" と auto-prefix する原因だった
# （Claude が symlink target の親 dir 名を見るため）。
#
# 何をするか：uzustack-relink を実行して全 skill entry を新しい実 directory
# pattern で再作成する。冪等 — 何度実行しても安全。
#
# 影響範囲：v0.15.2.0 より前に --no-prefix で uzustack を install したユーザー
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

if [ -x "$SCRIPT_DIR/bin/uzustack-relink" ]; then
  echo "  [v0.15.2.0] skill directory 構造を修復中..."
  "$SCRIPT_DIR/bin/uzustack-relink" 2>/dev/null || true
fi
