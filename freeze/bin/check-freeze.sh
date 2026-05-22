#!/usr/bin/env bash
# check-freeze.sh — /freeze skill の PreToolUse hook
# stdin から JSON を読み、file_path が freeze 境界内かを check する。
# block するなら hookSpecificOutput permissionDecision: "deny" を、許可なら {} を返す。
set -euo pipefail

# stdin を読む
INPUT=$(cat)

# freeze directory の state file 位置を解決
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.uzustack}"
FREEZE_FILE="$STATE_DIR/freeze-dir.txt"

# freeze file がない場合は全許可（未設定状態）
if [ ! -f "$FREEZE_FILE" ]; then
  echo '{}'
  exit 0
fi

FREEZE_DIR=$(tr -d '[:space:]' < "$FREEZE_FILE")

# freeze dir が空なら許可
if [ -z "$FREEZE_DIR" ]; then
  echo '{}'
  exit 0
fi

# tool_input JSON から file_path を抽出
# まず grep/sed、 escape された quote 用に Python に fallback
FILE_PATH=$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' || true)

# grep が空を返したら Python fallback
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read()).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)
fi

# file path が取れなければ許可（parse 失敗で block しない）
if [ -z "$FILE_PATH" ]; then
  echo '{}'
  exit 0
fi

# file_path が絶対 path でなければ絶対化
case "$FILE_PATH" in
  /*) ;; # already absolute
  *)
    FILE_PATH="$(pwd)/$FILE_PATH"
    ;;
esac

# 正規化: double slash 削除 + trailing slash 削除
FILE_PATH=$(printf '%s' "$FILE_PATH" | sed 's|/\+|/|g;s|/$||')

# symlink と .. 連鎖を resolve（POSIX portable、 macOS 動作）
_resolve_path() {
  local _dir _base
  _dir="$(dirname "$1")"
  _base="$(basename "$1")"
  _dir="$(cd "$_dir" 2>/dev/null && pwd -P || printf '%s' "$_dir")"
  printf '%s/%s' "$_dir" "$_base"
}
FILE_PATH=$(_resolve_path "$FILE_PATH")
FREEZE_DIR=$(_resolve_path "$FREEZE_DIR")

# check: file path が freeze directory で始まるか？
case "$FILE_PATH" in
  "${FREEZE_DIR}/"*|"${FREEZE_DIR}")
    # freeze 境界内 — 許可
    echo '{}'
    ;;
  *)
    # freeze 境界外 — block
    # hook 発火 event を log
    mkdir -p ~/.uzustack/analytics 2>/dev/null || true
    echo '{"event":"hook_fire","skill":"freeze","pattern":"boundary_deny","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}' >> ~/.uzustack/analytics/skill-usage.jsonl 2>/dev/null || true

    FILE_PATH_ESC=$(printf '%s' "$FILE_PATH" | sed 's/"/\\"/g')
    FREEZE_DIR_ESC=$(printf '%s' "$FREEZE_DIR" | sed 's/"/\\"/g')
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"[freeze] Blocked: %s は freeze 境界 (%s) の外です。freeze された directory 内の編集のみ許可されます。"}}\n' "$FILE_PATH_ESC" "$FREEZE_DIR_ESC"
    ;;
esac
