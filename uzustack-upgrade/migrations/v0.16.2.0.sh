#!/usr/bin/env bash
# Migration: v0.16.2.0 — per-project resource log を builder profile に統合
#
# 注：本 migration は upstream gstack の v0.16.2.0 path 由来。uzustack では
# 該当機構（per-project resources-shown.jsonl / builder-profile.jsonl）が
# 未実装 = 実 trigger なし。Phase 6+ で uzustack 独自 builder profile 機構と
# 同時設計するまで型として在庫。
#
# 何が変わったか：resource dedup が per-project resources-shown.jsonl から
# global builder-profile.jsonl に移った（全 closing state の single source of truth）。
#
# 何をするか：すべての per-project resources-shown.jsonl を見つけ、URL を
# builder profile の stub entry にマージして既存ユーザーが dedup history を
# 失わないようにする。冪等 — 何度実行しても安全。
#
# 影響範囲：本 version より前に /office-hours を実行したユーザー
set -euo pipefail

UZUSTACK_HOME="${UZUSTACK_HOME:-$HOME/.uzustack}"
PROFILE_FILE="$UZUSTACK_HOME/builder-profile.jsonl"

# すべての per-project resource log を見つける
RESOURCE_FILES=$(find "$UZUSTACK_HOME/projects" -name "resources-shown.jsonl" 2>/dev/null || true)

if [ -z "$RESOURCE_FILES" ]; then
  # per-project resource ファイルが存在しない — clean install、移行不要
  exit 0
fi

echo "  [v0.16.2.0] per-project resource log を builder profile に移行中..."

# すべての per-project ファイルから unique URL を集める
ALL_URLS=$(echo "$RESOURCE_FILES" | while read -r f; do
  [ -f "$f" ] && cat "$f" 2>/dev/null || true
done | grep -o '"url":"[^"]*"' | sed 's/"url":"//;s/"//' | sort -u)

if [ -z "$ALL_URLS" ]; then
  exit 0
fi

# builder-profile が既に resource data を持っているか確認（冪等性）
if [ -f "$PROFILE_FILE" ] && grep -q "resources_shown" "$PROFILE_FILE" 2>/dev/null; then
  # 既に resource data あり、移行対象 URL が含まれているか確認
  EXISTING_URLS=$(grep -o '"resources_shown":\[[^]]*\]' "$PROFILE_FILE" 2>/dev/null | grep -o 'https://[^"]*' | sort -u)
  NEW_URLS=$(comm -23 <(echo "$ALL_URLS") <(echo "$EXISTING_URLS") 2>/dev/null || echo "$ALL_URLS")
  if [ -z "$NEW_URLS" ]; then
    # すべての URL が既に存在 — 何もしない
    exit 0
  fi
fi

# URL の JSON array を build
URL_ARRAY=$(echo "$ALL_URLS" | awk 'BEGIN{printf "["} NR>1{printf ","} {printf "\"%s\"", $0} END{printf "]"}')

# builder profile に migration stub entry を append
mkdir -p "$UZUSTACK_HOME"
echo "{\"date\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"mode\":\"migration\",\"project_slug\":\"_migrated\",\"signal_count\":0,\"signals\":[],\"design_doc\":\"\",\"assignment\":\"\",\"resources_shown\":$URL_ARRAY,\"topics\":[]}" >> "$PROFILE_FILE"

echo "  [v0.16.2.0] $(echo "$ALL_URLS" | wc -l | tr -d ' ') 個の resource URL を builder profile に移行した。"
